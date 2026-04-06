window.CanvasApps['FileShare'] = `
const { useState, useEffect, useRef } = React;

// --- Utilities ---
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Compress WebRTC SDP to make copy-pasting easier
const packSDP = (desc) => {
    const minified = desc.sdp
        .replace(/a=candidate:/g, '|c|').replace(/a=extmap:/g, '|e|')
        .replace(/a=rtcp-fb:/g, '|r|').replace(/a=fmtp:/g, '|f|')
        .replace(/a=rtpmap:/g, '|m|').replace(/urn:ietf:params:rtp-hdrext:/g, '|u|');
    return btoa(JSON.stringify({ t: desc.type, s: minified }));
};

const unpackSDP = (str) => {
    const obj = JSON.parse(atob(str));
    const unminified = obj.s
        .replace(/\\|c\\|/g, 'a=candidate:').replace(/\\|e\\|/g, 'a=extmap:')
        .replace(/\\|r\\|/g, 'a=rtcp-fb:').replace(/\\|f\\|/g, 'a=fmtp:')
        .replace(/\\|m\\|/g, 'a=rtpmap:').replace(/\\|u\\|/g, 'urn:ietf:params:rtp-hdrext:');
    return { type: obj.t, sdp: unminified };
};

const FileShareApp = ({ data, onUpdate, instanceId, title }) => {
    // idle -> host-generating -> host-waiting -> connected
    // idle -> join-waiting -> join-generating -> join-waiting-ack -> connected
    const [status, setStatus] = useState('idle'); 
    
    // Connection Strings
    const [myCode, setMyCode] = useState('');
    const [peerCode, setPeerCode] = useState('');
    
    // File Management
    const [files, setFiles] = useState([]); 
    const fileInputRef = useRef(null);

    const pc = useRef(null);
    const dc = useRef(null);
    const bc = useRef(null); // Local auto-connect
    
    // Transfer Engine
    const transferQueue = useRef([]);
    const isTransferring = useRef(false);
    const receiveBuffer = useRef([]);
    const activeMeta = useRef(null);
    const receivedSize = useRef(0);
    const CHUNK_SIZE = 65536; // 64KB

    // --- Local Tab-to-Tab Auto Discovery ---
    useEffect(() => {
        bc.current = new BroadcastChannel('canvas_airshare_discovery');
        bc.current.onmessage = (e) => {
            if (e.data.type === 'OFFER' && status === 'join-waiting' && !pc.current) {
                processHostCode(e.data.payload);
            }
            if (e.data.type === 'ANSWER' && status === 'host-waiting' && pc.current) {
                finalizeConnection(e.data.payload);
            }
        };
        return () => bc.current.close();
    }, [status]);

    useEffect(() => {
        return () => {
            if (pc.current) pc.current.close();
            files.forEach(f => { if (f.blobUrl) URL.revokeObjectURL(f.blobUrl); });
        };
    }, [files]);

    // --- WEBRTC CORE ---
    const initPeer = () => {
        // Using standard STUN for WAN IP discovery. NO signaling server.
        const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peer.onconnectionstatechange = () => {
            if (peer.connectionState === 'connected') setStatus('connected');
            if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
                alert("Connection lost! Peer disconnected.");
                setStatus('idle');
            }
        };
        return peer;
    };

    // HOST FLOW
    const handleHost = async () => {
        setStatus('host-generating');
        pc.current = initPeer();
        
        const channel = pc.current.createDataChannel('airshare');
        channel.binaryType = 'arraybuffer';
        setupDataChannel(channel, 'host');
        dc.current = channel;

        pc.current.onicecandidate = (e) => {
            if (e.candidate === null) {
                const code = packSDP(pc.current.localDescription);
                setMyCode(code);
                setStatus('host-waiting');
                bc.current.postMessage({ type: 'OFFER', payload: code }); 
            }
        };

        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
    };

    // JOIN FLOW: Step 1
    const processHostCode = async (codeToProcess = peerCode) => {
        if (!codeToProcess.trim()) return alert("Please paste the host's code.");
        setStatus('join-generating');
        
        pc.current = initPeer();
        pc.current.ondatachannel = (e) => {
            setupDataChannel(e.channel, 'guest');
            dc.current = e.channel;
        };

        pc.current.onicecandidate = (e) => {
            if (e.candidate === null) {
                const code = packSDP(pc.current.localDescription);
                setMyCode(code);
                setStatus('join-waiting-ack');
                bc.current.postMessage({ type: 'ANSWER', payload: code });
            }
        };

        try {
            await pc.current.setRemoteDescription(new RTCSessionDescription(unpackSDP(codeToProcess)));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
        } catch (err) {
            console.error(err);
            alert("Invalid Host Code! Make sure you copied the whole text.");
            setStatus('join-waiting');
        }
    };

    // HOST FLOW: Step 2
    const finalizeConnection = async (codeToProcess = peerCode) => {
        if (!codeToProcess.trim()) return alert("Please paste the guest's code.");
        try {
            await pc.current.setRemoteDescription(new RTCSessionDescription(unpackSDP(codeToProcess)));
        } catch (err) {
            console.error(err);
            alert("Invalid Guest Code! Make sure you copied the whole text.");
        }
    };

    // --- DATA CHANNEL ENGINE ---
    const setupDataChannel = (channel) => {
        channel.onopen = () => {
            setStatus('connected');
            processQueue();
        };

        channel.onmessage = (e) => {
            if (typeof e.data === 'string') {
                const meta = JSON.parse(e.data);
                activeMeta.current = meta;
                receivedSize.current = 0;
                receiveBuffer.current = [];
                setFiles(prev => [{ id: meta.id, name: meta.name, size: meta.size, type: meta.type, status: 'transferring', progress: 0, direction: 'received' }, ...prev]);
            } else {
                receiveBuffer.current.push(e.data);
                receivedSize.current += e.data.byteLength;
                
                const currentPercent = Math.round((receivedSize.current / activeMeta.current.size) * 100);
                if (currentPercent % 5 === 0 || receivedSize.current === activeMeta.current.size) {
                    setFiles(prev => prev.map(f => f.id === activeMeta.current.id ? { ...f, progress: currentPercent } : f));
                }

                if (receivedSize.current === activeMeta.current.size) {
                    const blob = new Blob(receiveBuffer.current, { type: activeMeta.current.type });
                    const fileObj = new File([blob], activeMeta.current.name, { type: activeMeta.current.type });
                    const blobUrl = URL.createObjectURL(blob);
                    
                    setFiles(prev => prev.map(f => f.id === activeMeta.current.id ? { ...f, status: 'done', progress: 100, fileObj, blobUrl } : f));
                    receiveBuffer.current = [];
                    activeMeta.current = null;
                }
            }
        };
    };

    const handleAddFile = (e) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;
        
        const newFiles = Array.from(fileList).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name, size: file.size, type: file.type, status: 'queued', progress: 0, direction: 'sent', fileObj: file
        }));
        
        setFiles(prev => [...newFiles, ...prev]);
        transferQueue.current.push(...newFiles);
        e.target.value = ''; 
        if (status === 'connected') processQueue();
    };

    const processQueue = async () => {
        if (isTransferring.current || transferQueue.current.length === 0 || !dc.current || dc.current.readyState !== 'open') return;
        isTransferring.current = true;
        const fileData = transferQueue.current.shift();
        
        setFiles(prev => prev.map(f => f.id === fileData.id ? { ...f, status: 'transferring' } : f));
        dc.current.send(JSON.stringify({ id: fileData.id, name: fileData.name, size: fileData.size, type: fileData.type }));

        let offset = 0;
        let lastPercent = 0;

        while (offset < fileData.size) {
            if (dc.current.readyState !== 'open') break;
            if (dc.current.bufferedAmount > dc.current.bufferedAmountLowThreshold) {
                await new Promise(resolve => { dc.current.onbufferedamountlow = () => { dc.current.onbufferedamountlow = null; resolve(); }; });
            }
            const slice = fileData.fileObj.slice(offset, offset + CHUNK_SIZE);
            const buffer = await slice.arrayBuffer();
            dc.current.send(buffer);
            offset += CHUNK_SIZE;
            
            const currentPercent = Math.round((offset / fileData.size) * 100);
            if (currentPercent > lastPercent + 2 || offset >= fileData.size) {
                lastPercent = currentPercent;
                setFiles(prev => prev.map(f => f.id === fileData.id ? { ...f, progress: Math.min(100, currentPercent) } : f));
            }
        }
        setFiles(prev => prev.map(f => f.id === fileData.id ? { ...f, status: 'done', progress: 100 } : f));
        isTransferring.current = false;
        processQueue(); 
    };

    const downloadFile = (f) => {
        const a = document.createElement('a');
        a.href = f.blobUrl;
        a.download = f.name;
        a.click();
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(myCode);
        alert('Code copied! Send this to the other device via Chat or Email.');
    };

    // --- UI RENDERING ---
    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200" onPointerDown={e => e.stopPropagation()}>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar flex flex-col relative">
                
                {/* 1. IDLE STATE */}
                {status === 'idle' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-slide-up max-w-sm mx-auto w-full">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        </div>
                        <h2 className="text-2xl font-black mb-1">Direct Transfer</h2>
                        <p className="text-sm text-slate-500 text-center mb-8">100% Client-side. No servers. Uncapped speed.</p>
                        
                        <div className="w-full flex flex-col gap-3">
                            <button onClick={handleHost} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                                Host Connection
                            </button>
                            <button onClick={() => { setPeerCode(''); setStatus('join-waiting'); }} className="w-full py-3.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2">
                                Join Connection
                            </button>
                        </div>
                    </div>
                )}

                {/* LOADING STATES */}
                {(status === 'host-generating' || status === 'join-generating') && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <svg className="w-10 h-10 animate-spin text-blue-500 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p className="font-bold">Generating Tunnel Data...</p>
                    </div>
                )}

                {/* HOST WAITING STATE */}
                {status === 'host-waiting' && (
                    <div className="flex flex-col animate-slide-up h-full max-w-lg mx-auto w-full">
                        <button onClick={() => setStatus('idle')} className="self-start text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white mb-4 flex items-center gap-1">← Cancel Host</button>
                        
                        <div className="bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500 p-4 rounded-r-xl mb-6 shadow-sm">
                            <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Step 1: Share your code</h4>
                            <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mb-3 leading-relaxed">Send this code to the receiver via chat or email to establish a secure P2P tunnel.</p>
                            <div className="flex gap-2">
                                <input type="text" readOnly value={myCode} className="flex-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono truncate text-slate-500 shadow-inner" />
                                <button onClick={copyToClipboard} className="px-4 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm shrink-0">Copy</button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col">
                            <h4 className="font-bold mb-2">Step 2: Enter their reply code</h4>
                            <textarea 
                                value={peerCode} 
                                onChange={e => setPeerCode(e.target.value.trim())}
                                placeholder="Paste the receiver's code here..." 
                                className="flex-1 min-h-[100px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs font-mono resize-none focus:outline-none focus:border-blue-500 mb-4 shadow-inner custom-scrollbar"
                            />
                            <button onClick={() => finalizeConnection(peerCode)} disabled={!peerCode} className="w-full py-3.5 bg-green-500 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl font-bold shadow-md transition-all">
                                Connect Devices
                            </button>
                        </div>
                    </div>
                )}

                {/* JOIN WAITING STATE */}
                {status === 'join-waiting' && (
                    <div className="flex flex-col animate-slide-up h-full max-w-lg mx-auto w-full">
                        <button onClick={() => setStatus('idle')} className="self-start text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white mb-4 flex items-center gap-1">← Cancel Join</button>
                        
                        <div className="flex-1 flex flex-col">
                            <h4 className="font-bold mb-2">Step 1: Enter Host's Code</h4>
                            <p className="text-xs text-slate-500 mb-3">Paste the code the host sent you here.</p>
                            <textarea 
                                value={peerCode} 
                                onChange={e => setPeerCode(e.target.value.trim())}
                                placeholder="Paste host code here..." 
                                className="flex-1 min-h-[100px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs font-mono resize-none focus:outline-none focus:border-blue-500 mb-4 shadow-inner custom-scrollbar"
                            />
                            <button onClick={() => processHostCode(peerCode)} disabled={!peerCode} className="w-full py-3.5 bg-blue-600 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl font-bold shadow-md transition-all">
                                Generate Reply Code
                            </button>
                        </div>
                    </div>
                )}

                {/* JOIN WAITING ACKNOWLEDGEMENT */}
                {status === 'join-waiting-ack' && (
                    <div className="flex flex-col animate-slide-up h-full max-w-lg mx-auto w-full">
                        <button onClick={() => setStatus('idle')} className="self-start text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white mb-4 flex items-center gap-1">← Cancel Transfer</button>
                        
                        <div className="bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500 p-4 rounded-r-xl mb-6 shadow-sm flex-1 flex flex-col justify-center">
                            <div className="text-center mb-6">
                                <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <h4 className="font-bold text-green-800 dark:text-green-300 text-lg">Reply Generated!</h4>
                                <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">Step 2: Send this back to the host.</p>
                            </div>
                            
                            <div className="flex gap-2 mb-6">
                                <input type="text" readOnly value={myCode} className="flex-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono truncate text-slate-500 shadow-inner" />
                                <button onClick={copyToClipboard} className="px-4 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 shadow-sm shrink-0">Copy</button>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500 animate-pulse mt-auto">
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Waiting for Host to connect...
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. CONNECTED & TRANSFERRING */}
                {status === 'connected' && (
                    <div className="h-full flex flex-col animate-slide-up">
                        <div className="flex justify-between items-center bg-white dark:bg-zinc-800 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm shrink-0 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                <div>
                                    <div className="font-bold text-sm">Direct Connection</div>
                                    <div className="text-[10px] text-slate-500 font-mono">100% Local / Encrypted</div>
                                </div>
                            </div>
                            
                            {/* Explicit visible file input button */}
                            <input type="file" multiple ref={fileInputRef} onChange={handleAddFile} className="hidden" />
                            <button onClick={() => fileInputRef.current.click()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-md active:scale-95">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg> 
                                Send Files
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                            {files.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-50">
                                    <svg className="w-16 h-16 mb-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                    <span className="text-sm font-bold">Transfer is ready.</span>
                                    <span className="text-xs mt-1">Click "Send Files" above to begin.</span>
                                </div>
                            ) : (
                                files.map(f => (
                                    <div key={f.id} className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden flex flex-col gap-2">
                                        {/* Progress Bar Background */}
                                        {f.status === 'transferring' && <div className="absolute inset-0 bg-blue-50/80 dark:bg-blue-900/20 origin-left transition-all duration-300 pointer-events-none" style={{ transform: \`scaleX(\${f.progress / 100})\` }} />}
                                        
                                        <div className="flex items-center justify-between z-10 relative">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={\`p-2 rounded-lg shrink-0 \${f.direction === 'sent' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-green-100 text-green-600 dark:bg-green-900/30'}\`}>
                                                    {f.direction === 'sent' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm truncate" title={f.name}>{f.name}</div>
                                                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">{formatBytes(f.size)}</div>
                                                </div>
                                            </div>
                                            
                                            {/* Action Buttons for Completed Downloads */}
                                            {f.status === 'done' && f.direction === 'received' && (
                                                <button onClick={() => downloadFile(f)} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors z-10 shrink-0 flex items-center gap-1.5">
                                                    Save File
                                                </button>
                                            )}
                                        </div>

                                        {/* Progress Indicator */}
                                        {f.status !== 'done' && (
                                            <div className="flex items-center gap-3 z-10 mt-1">
                                                <div className="flex-1 h-2 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                                                    <div className={\`h-full rounded-full transition-all duration-300 \${f.direction === 'sent' ? 'bg-blue-500' : 'bg-green-500'}\`} style={{ width: \`\${f.progress}%\` }} />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 w-8 text-right">{f.progress}%</span>
                                            </div>
                                        )}
                                        
                                        {/* Success Indicator */}
                                        {f.status === 'done' && f.direction === 'sent' && (
                                            <div className="text-xs text-green-600 dark:text-green-400 font-bold z-10 flex items-center gap-1 mt-1">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                Delivered securely
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

return FileShareApp;
`;
