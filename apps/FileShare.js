window.CanvasApps['FileShare'] = `
const { useState, useEffect, useRef } = React;

// --- Utilities ---
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileShareApp = ({ data, onUpdate, instanceId, title }) => {
    const [role, setRole] = useState(null); // 'sender' | 'receiver'
    const [status, setStatus] = useState('idle'); // idle, gathering, waiting, connected
    
    // Connection Strings
    const [offerString, setOfferString] = useState('');
    const [answerString, setAnswerString] = useState('');
    const [inputCode, setInputCode] = useState('');
    
    // File Management
    const [files, setFiles] = useState([]); 
    const [viewingFile, setViewingFile] = useState(null);

    const pc = useRef(null);
    const dc = useRef(null);
    const bc = useRef(null); // BroadcastChannel for auto-local connect
    
    // Transfer Engine State
    const transferQueue = useRef([]);
    const isTransferring = useRef(false);
    const receiveBuffer = useRef([]);
    const activeMeta = useRef(null);
    const receivedSize = useRef(0);
    const CHUNK_SIZE = 65536;

    // --- Local Tab-to-Tab Auto Discovery ---
    useEffect(() => {
        bc.current = new BroadcastChannel('canvas_airshare_discovery');
        bc.current.onmessage = (e) => {
            if (e.data.type === 'OFFER' && role === 'receiver' && status === 'waiting' && !pc.current) {
                processOffer(e.data.payload);
            }
            if (e.data.type === 'ANSWER' && role === 'sender' && status === 'waiting' && pc.current) {
                finalizeConnection(e.data.payload);
            }
        };
        return () => bc.current.close();
    }, [role, status]);

    // Cleanup object URLs on unmount to save RAM
    useEffect(() => {
        return () => {
            if (pc.current) pc.current.close();
            files.forEach(f => { if (f.blobUrl) URL.revokeObjectURL(f.blobUrl); });
        };
    }, [files]);

    // --- WEBRTC CORE ---
    const initPeer = () => {
        const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peer.onconnectionstatechange = () => {
            if (peer.connectionState === 'connected') setStatus('connected');
            if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
                alert("Connection lost!");
                setStatus('idle');
                setRole(null);
            }
        };
        return peer;
    };

    // SENDER: Step 1 - Create Offer
    const handleHost = async () => {
        setRole('sender');
        setStatus('gathering');
        pc.current = initPeer();
        
        const channel = pc.current.createDataChannel('airshare');
        channel.binaryType = 'arraybuffer';
        setupDataChannel(channel, 'sender');
        dc.current = channel;

        // Wait for all ICE candidates to finish gathering before creating the copy-paste string
        pc.current.onicecandidate = (e) => {
            if (e.candidate === null) {
                const code = btoa(JSON.stringify(pc.current.localDescription));
                setOfferString(code);
                setStatus('waiting');
                bc.current.postMessage({ type: 'OFFER', payload: code }); // Broadcast for local tabs
            }
        };

        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
    };

    // RECEIVER: Step 2 - Process Offer & Create Answer
    const processOffer = async (offerCode) => {
        if (!offerCode) return;
        setStatus('gathering');
        
        pc.current = initPeer();
        pc.current.ondatachannel = (e) => {
            setupDataChannel(e.channel, 'receiver');
            dc.current = e.channel;
        };

        pc.current.onicecandidate = (e) => {
            if (e.candidate === null) {
                const code = btoa(JSON.stringify(pc.current.localDescription));
                setAnswerString(code);
                setStatus('waiting');
                bc.current.postMessage({ type: 'ANSWER', payload: code });
            }
        };

        try {
            await pc.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(offerCode))));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
        } catch (err) {
            alert("Invalid Sender Code!");
            setStatus('idle');
        }
    };

    // SENDER: Step 3 - Finalize
    const finalizeConnection = async (answerCode) => {
        try {
            await pc.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(answerCode))));
        } catch (err) {
            alert("Invalid Receiver Code!");
        }
    };

    // --- DATA CHANNEL ENGINE ---
    const setupDataChannel = (channel, roleType) => {
        channel.onopen = () => {
            setStatus('connected');
            if (roleType === 'sender') processQueue();
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

    // --- UI RENDERERS ---
    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 relative" onPointerDown={e => e.stopPropagation()}>
            
            {/* IN-APP VIEWER MODAL */}
            {viewingFile && (
                <div className="absolute inset-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm flex flex-col animate-slide-up">
                    <div className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-white/10 shrink-0">
                        <h3 className="font-bold text-sm truncate pr-2">{viewingFile.name}</h3>
                        <div className="flex gap-2">
                            <button onClick={() => downloadFile(viewingFile)} className="px-3 py-1 bg-blue-500 text-white rounded text-xs font-bold hover:bg-blue-600">Save</button>
                            <button onClick={() => setViewingFile(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded">✕</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                        {viewingFile.type.startsWith('image/') ? (
                            <img src={viewingFile.blobUrl} className="max-w-full max-h-full object-contain shadow-lg rounded" alt="preview" />
                        ) : viewingFile.type.startsWith('video/') ? (
                            <video src={viewingFile.blobUrl} controls className="max-w-full max-h-full rounded" />
                        ) : (
                            <iframe src={viewingFile.blobUrl} className="w-full h-full bg-white rounded border border-slate-200" title="preview" />
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 flex flex-col custom-scrollbar">
                
                {/* 1. IDLE STATE */}
                {status === 'idle' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-slide-up">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        </div>
                        <h2 className="text-xl font-black mb-1">AirShare Direct</h2>
                        <p className="text-xs text-slate-500 text-center mb-6 max-w-[200px]">100% serverless P2P transfer. No data leaves your network.</p>
                        
                        <div className="w-full max-w-[240px] flex flex-col gap-3">
                            <button onClick={handleHost} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg> Send Files
                            </button>
                            <button onClick={() => { setRole('receiver'); setStatus('waiting'); }} className="w-full py-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95 flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> Receive
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. GATHERING STATE */}
                {status === 'gathering' && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <svg className="w-8 h-8 animate-spin text-blue-500 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p className="font-bold text-sm">Generating Secure Path...</p>
                        <p className="text-xs text-slate-500 mt-1">Bypassing servers entirely.</p>
                    </div>
                )}

                {/* 3. WAITING / MANUAL SYNC STATE */}
                {status === 'waiting' && (
                    <div className="flex flex-col animate-slide-up h-full">
                        <button onClick={() => setStatus('idle')} className="self-start text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white mb-2">← Cancel</button>
                        
                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 p-3 rounded-xl mb-4">
                            <h4 className="font-bold text-sm text-blue-800 dark:text-blue-300 mb-1">{role === 'sender' ? '1. Share Connection Code' : '2. Share Answer Code'}</h4>
                            <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mb-2 leading-tight">Because this app uses zero external servers, you must manually share this secure configuration string.</p>
                            <div className="flex gap-2">
                                <input type="text" readOnly value={role === 'sender' ? offerString : answerString} className="flex-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded px-2 py-1.5 text-[10px] font-mono truncate text-slate-500" />
                                <button onClick={() => { navigator.clipboard.writeText(role === 'sender' ? offerString : answerString); alert('Copied to clipboard!'); }} className="px-3 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 shadow-sm shrink-0">Copy</button>
                            </div>
                        </div>

                        <div className="flex-1 border-t border-slate-200 dark:border-white/10 pt-4 flex flex-col">
                            <h4 className="font-bold text-sm mb-2">{role === 'sender' ? '2. Paste Receiver Answer' : '1. Paste Sender Code'}</h4>
                            <textarea 
                                value={inputCode} 
                                onChange={e => setInputCode(e.target.value.trim())}
                                placeholder="Paste the long text string here..." 
                                className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 ring-blue-500/50 mb-3"
                            />
                            <button 
                                onClick={() => role === 'sender' ? finalizeConnection(inputCode) : processOffer(inputCode)}
                                disabled={!inputCode}
                                className="w-full py-2.5 bg-green-500 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl font-bold shadow-sm transition-all"
                            >
                                Connect Now
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. CONNECTED & TRANSFERRING */}
                {status === 'connected' && (
                    <div className="h-full flex flex-col animate-slide-up">
                        <div className="flex justify-between items-center bg-white dark:bg-zinc-800 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm shrink-0 mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                <span className="font-bold text-sm">Secure Tunnel Active</span>
                            </div>
                            <div className="relative group">
                                <input type="file" multiple onChange={handleAddFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <div className="px-3 py-1.5 bg-blue-600 group-hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg> Send
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pb-2">
                            {files.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-50">
                                    <svg className="w-12 h-12 mb-2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                    <span className="text-xs font-semibold">Drop files or click Send.</span>
                                </div>
                            ) : (
                                files.map(f => (
                                    <div key={f.id} className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden">
                                        {f.status === 'transferring' && <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 origin-left transition-all duration-300 pointer-events-none" style={{ transform: \`scaleX(\${f.progress / 100})\` }} />}
                                        
                                        <div className="flex items-center justify-between z-10 relative mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {f.direction === 'sent' ? <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> : <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                                                <span className="font-semibold text-xs truncate" title={f.name}>{f.name}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500 shrink-0">{formatBytes(f.size)}</span>
                                        </div>

                                        {f.status !== 'done' ? (
                                            <div className="flex items-center gap-2 z-10 mt-2">
                                                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                                                    <div className={\`h-full rounded-full transition-all duration-300 \${f.direction === 'sent' ? 'bg-blue-500' : 'bg-green-500'}\`} style={{ width: \`\${f.progress}%\` }} />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-500 w-6 text-right">{f.progress}%</span>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                                {f.direction === 'received' && (
                                                    <>
                                                        <button onClick={() => setViewingFile(f)} className="flex-1 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold hover:bg-blue-100 transition-colors">View File</button>
                                                        <button onClick={() => downloadFile(f)} className="flex-1 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-[10px] font-bold shadow-sm transition-colors">Save to Disk</button>
                                                    </>
                                                )}
                                                {f.direction === 'sent' && <div className="text-[10px] text-green-600 dark:text-green-400 font-bold w-full text-center">✓ Sent successfully</div>}
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
