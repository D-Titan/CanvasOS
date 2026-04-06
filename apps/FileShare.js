window.CanvasApps['FileShare'] = `
const { useState, useEffect, useRef } = React;

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileShareApp = ({ data, onUpdate, instanceId, title }) => {
    const [mode, setMode] = useState('local'); 
    const [role, setRole] = useState(null); 
    const [status, setStatus] = useState('idle'); // idle, waiting, connected, error
    
    // File Management State
    const [files, setFiles] = useState([]); // { id, name, size, type, status, progress, direction, fileObj, blobUrl }
    
    // Signaling
    const [offerString, setOfferString] = useState('');
    const [answerString, setAnswerString] = useState('');
    const [discoveredPeers, setDiscoveredPeers] = useState(false);
    
    const pc = useRef(null);
    const dc = useRef(null);
    const channelBroadcast = useRef(null);
    
    // Transfer Engine Refs
    const transferQueue = useRef([]);
    const isTransferring = useRef(false);
    const receiveBuffer = useRef([]);
    const activeMeta = useRef(null);
    const receivedSize = useRef(0);

    const CHUNK_SIZE = 65536; // 64KB

    // Prevent Browser Tab Close if files are active
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (files.length > 0) {
                e.preventDefault();
                e.returnValue = "You have files in AirShare. Are you sure you want to leave?";
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [files]);

    // Local Auto-Discovery (Tab to Tab)
    useEffect(() => {
        const bc = new BroadcastChannel('airshare_local_discovery');
        channelBroadcast.current = bc;

        bc.onmessage = (e) => {
            if (e.data.type === 'OFFER' && role === 'receiver' && status === 'waiting') {
                setOfferString(e.data.payload);
                setDiscoveredPeers(true);
            }
            if (e.data.type === 'ANSWER' && role === 'sender' && status === 'waiting') {
                setAnswerString(e.data.payload);
                setDiscoveredPeers(true);
            }
        };
        return () => bc.close();
    }, [role, status]);

    useEffect(() => {
        if (role === 'receiver' && offerString && discoveredPeers && status === 'waiting' && !pc.current) handleReceiverProcessOffer(offerString);
        if (role === 'sender' && answerString && discoveredPeers && status === 'waiting' && pc.current) handleSenderAcceptAnswer(answerString);
    }, [offerString, answerString, discoveredPeers, role, status]);

    // --- WEBRTC SETUP ---
    const initPeerConnection = () => {
        const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peer.onconnectionstatechange = () => {
            if (peer.connectionState === 'connected') setStatus('connected');
            if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') setStatus('error');
        };
        return peer;
    };

    const handleGenerateOffer = async () => {
        setStatus('waiting');
        pc.current = initPeerConnection();
        const channel = pc.current.createDataChannel('fileTransfer');
        channel.binaryType = 'arraybuffer';
        setupDataChannel(channel, 'sender');
        dc.current = channel;

        pc.current.onicecandidate = (e) => {
            if (e.candidate === null) {
                const offerB64 = btoa(JSON.stringify(pc.current.localDescription));
                setOfferString(offerB64);
                channelBroadcast.current.postMessage({ type: 'OFFER', payload: offerB64 });
            }
        };
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
    };

    const handleSenderAcceptAnswer = async (ansStr = answerString) => {
        try { await pc.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(ansStr)))); } 
        catch (err) { alert("Invalid connection code!"); }
    };

    const handleReceiverProcessOffer = async (offStr = offerString) => {
        if (!offStr) return;
        pc.current = initPeerConnection();
        pc.current.ondatachannel = (e) => {
            setupDataChannel(e.channel, 'receiver');
            dc.current = e.channel;
        };
        pc.current.onicecandidate = (e) => {
            if (e.candidate === null) {
                const answerB64 = btoa(JSON.stringify(pc.current.localDescription));
                setAnswerString(answerB64);
                channelBroadcast.current.postMessage({ type: 'ANSWER', payload: answerB64 });
            }
        };
        try {
            await pc.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(offStr))));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
        } catch (err) { alert("Invalid sender code!"); }
    };

    // --- DATA CHANNEL & TRANSFER ENGINE ---
    const setupDataChannel = (channel, roleType) => {
        channel.onopen = () => {
            setStatus('connected');
            if (roleType === 'sender') processQueue(); // Start if things are queued
        };

        channel.onmessage = (e) => {
            if (typeof e.data === 'string') {
                // Incoming File Metadata
                const meta = JSON.parse(e.data);
                activeMeta.current = meta;
                receivedSize.current = 0;
                receiveBuffer.current = [];
                
                setFiles(prev => [...prev, { id: meta.id, name: meta.name, size: meta.size, type: meta.type, status: 'transferring', progress: 0, direction: 'received' }]);
            } else {
                // Incoming Binary Chunk
                receiveBuffer.current.push(e.data);
                receivedSize.current += e.data.byteLength;
                
                const currentPercent = Math.round((receivedSize.current / activeMeta.current.size) * 100);
                
                // Throttle UI updates to prevent React lag
                if (currentPercent % 5 === 0 || receivedSize.current === activeMeta.current.size) {
                    setFiles(prev => prev.map(f => f.id === activeMeta.current.id ? { ...f, progress: currentPercent } : f));
                }

                if (receivedSize.current === activeMeta.current.size) {
                    // File complete! Convert to Blob
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

    // SENDER: Add file to queue
    const handleAddFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const id = Math.random().toString(36).substr(2, 9);
        const newFile = { id, name: file.name, size: file.size, type: file.type, status: 'queued', progress: 0, direction: 'sent', fileObj: file };
        
        setFiles(prev => [...prev, newFile]);
        transferQueue.current.push(newFile);
        e.target.value = ''; // reset input
        
        if (status === 'connected') processQueue();
    };

    // Queue Processor (Backpressure handled)
    const processQueue = async () => {
        if (isTransferring.current || transferQueue.current.length === 0 || !dc.current || dc.current.readyState !== 'open') return;
        
        isTransferring.current = true;
        const fileData = transferQueue.current.shift();
        
        setFiles(prev => prev.map(f => f.id === fileData.id ? { ...f, status: 'transferring' } : f));

        // 1. Send Meta
        dc.current.send(JSON.stringify({ id: fileData.id, name: fileData.name, size: fileData.size, type: fileData.type }));

        // 2. Send Binary Chunks
        let offset = 0;
        let lastPercent = 0;

        while (offset < fileData.size) {
            if (dc.current.readyState !== 'open') break;

            if (dc.current.bufferedAmount > dc.current.bufferedAmountLowThreshold) {
                await new Promise(resolve => {
                    dc.current.onbufferedamountlow = () => { dc.current.onbufferedamountlow = null; resolve(); };
                });
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

        // 3. Mark Done and Process Next
        setFiles(prev => prev.map(f => f.id === fileData.id ? { ...f, status: 'done', progress: 100 } : f));
        isTransferring.current = false;
        processQueue(); 
    };

    // --- CANVAS OS INTEGRATION HACK ---
    const openInCanvasOS = (fileData) => {
        const input = document.querySelector('input[type="file"].hidden');
        if (input && fileData.fileObj) {
            const dt = new DataTransfer();
            dt.items.add(fileData.fileObj);
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            alert("Unable to open in CanvasOS. Please use Download.");
        }
    };

    const downloadFile = (fileData) => {
        const a = document.createElement('a');
        a.href = fileData.blobUrl;
        a.download = fileData.name;
        a.click();
    };

    // Cleanup object URLs on Unmount
    useEffect(() => {
        return () => {
            files.forEach(f => { if (f.blobUrl) URL.revokeObjectURL(f.blobUrl); });
        };
    }, [files]);


    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200" onPointerDown={e => e.stopPropagation()}>
            {/* Header Tabs */}
            <div className="flex border-b border-slate-200 dark:border-white/10 shrink-0">
                <button onClick={() => setMode('local')} className={\`flex-1 py-2 text-xs sm:text-sm font-semibold transition-colors \${mode === 'local' ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-500'}\`}>Local (Direct)</button>
                <button onClick={() => alert('Internet mode requires a deployed WebSocket signaling server.')} className="flex-1 py-2 text-xs sm:text-sm font-semibold text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Internet (WAN)</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col relative min-h-0 custom-scrollbar">
                
                {/* 1. IDLE SELECTION */}
                {status === 'idle' && (
                    <div className="w-full flex flex-col gap-4 animate-slide-up h-full items-center justify-center">
                        <div className="text-center mb-2">
                            <h2 className="text-xl font-bold">AirShare</h2>
                            <p className="text-xs text-slate-500">Fast, direct P2P transfer with queue support.</p>
                        </div>
                        <div className="flex gap-3 w-full max-w-sm">
                            <button onClick={() => { setRole('sender'); setStatus('waiting'); }} className="flex-1 p-4 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-sm hover:border-blue-400 active:scale-95 transition-all group flex flex-col items-center">
                                <svg className="w-8 h-8 mb-2 text-blue-500 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                <span className="font-bold text-sm">Send Files</span>
                            </button>
                            <button onClick={() => { setRole('receiver'); setStatus('waiting'); }} className="flex-1 p-4 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-sm hover:border-green-400 active:scale-95 transition-all group flex flex-col items-center">
                                <svg className="w-8 h-8 mb-2 text-green-500 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                <span className="font-bold text-sm">Receive</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. WAITING FOR CONNECTION */}
                {status === 'waiting' && (
                    <div className="w-full max-w-sm mx-auto bg-white dark:bg-zinc-800 p-4 rounded-xl shadow border border-slate-200 dark:border-zinc-700 animate-slide-up text-center mb-4 shrink-0">
                        {role === 'sender' ? (
                            !offerString ? (
                                <button onClick={handleGenerateOffer} className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">Generate Session Code</button>
                            ) : (
                                <>
                                    <h3 className="font-bold text-sm mb-1 text-blue-500">Waiting for Receiver...</h3>
                                    <p className="text-[10px] text-slate-500 mb-3">Share this code with the receiver.</p>
                                    <input type="text" readOnly value={offerString} className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded p-2 text-xs mb-2 truncate" />
                                    <div className="border-t border-slate-100 dark:border-zinc-700 pt-3 mt-2">
                                        <input type="text" placeholder="Paste Receiver Answer here..." value={answerString} onChange={(e) => setAnswerString(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded p-2 text-xs mb-2" />
                                        <button onClick={() => handleSenderAcceptAnswer()} className="w-full py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700">Connect</button>
                                    </div>
                                </>
                            )
                        ) : (
                            !answerString ? (
                                <>
                                    <h3 className="font-bold text-sm mb-2">Waiting for Sender</h3>
                                    <input type="text" placeholder="Paste Sender Code here..." value={offerString} onChange={(e) => setOfferString(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded p-2 text-xs mb-3" />
                                    <button onClick={() => handleReceiverProcessOffer()} className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">Process Code</button>
                                </>
                            ) : (
                                <>
                                    <h3 className="font-bold text-sm mb-2 text-green-500">Ready!</h3>
                                    <p className="text-[10px] text-slate-500 mb-2">Copy this back to the sender.</p>
                                    <input type="text" readOnly value={answerString} className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded p-2 text-xs mb-2 truncate" />
                                    <p className="text-[10px] font-semibold animate-pulse text-blue-500 mt-2">Waiting for sender to connect...</p>
                                </>
                            )
                        )}
                    </div>
                )}

                {/* 3. ACTIVE CONNECTION & FILE LIST */}
                {status === 'connected' && (
                    <div className="w-full h-full flex flex-col animate-slide-up">
                        <div className="flex justify-between items-center mb-4 shrink-0 bg-white dark:bg-zinc-800 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                <span className="font-bold text-sm text-green-600 dark:text-green-400">Connected</span>
                            </div>
                            {role === 'sender' && (
                                <div className="relative">
                                    <input type="file" onChange={handleAddFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <button className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors pointer-events-none">
                                        + Send File
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* File List */}
                        <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 pb-4">
                            {files.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                                    <svg className="w-10 h-10 mb-2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                    <span className="text-sm font-semibold">{role === 'sender' ? 'Add files to send.' : 'Waiting for files...'}</span>
                                </div>
                            ) : (
                                files.map(f => (
                                    <div key={f.id} className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                                        {/* Background Progress */}
                                        {f.status === 'transferring' && (
                                            <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 origin-left transition-all duration-300 pointer-events-none" style={{ transform: \`scaleX(\${f.progress / 100})\` }} />
                                        )}
                                        
                                        <div className="flex justify-between items-start z-10">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {f.direction === 'sent' ? (
                                                    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                )}
                                                <span className="font-semibold text-xs sm:text-sm truncate" title={f.name}>{f.name}</span>
                                            </div>
                                            <div className="text-[10px] sm:text-xs font-mono text-slate-500 shrink-0 whitespace-nowrap pl-2">
                                                {formatBytes(f.size)}
                                            </div>
                                        </div>

                                        {f.status !== 'done' && (
                                            <div className="flex items-center gap-2 z-10 mt-1">
                                                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                                                    <div className={\`h-full rounded-full transition-all duration-300 \${f.direction === 'sent' ? 'bg-blue-500' : 'bg-green-500'}\`} style={{ width: \`\${f.progress}%\` }} />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-500 w-6 text-right">{f.progress}%</span>
                                            </div>
                                        )}

                                        {/* Actions for Receiver when done */}
                                        {f.status === 'done' && f.direction === 'received' && (
                                            <div className="flex gap-2 mt-2 z-10">
                                                <button onClick={() => openInCanvasOS(f)} className="flex-1 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-1">
                                                    Open in CanvasOS
                                                </button>
                                                <button onClick={() => downloadFile(f)} className="flex-1 py-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-zinc-600 transition-colors flex items-center justify-center gap-1">
                                                    Download
                                                </button>
                                            </div>
                                        )}
                                        
                                        {f.status === 'done' && f.direction === 'sent' && (
                                            <div className="text-[10px] text-green-600 dark:text-green-400 font-bold mt-1 z-10">✓ Sent successfully</div>
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
