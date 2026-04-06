window.CanvasApps['FileShare'] = `
const { useState, useEffect, useRef, useCallback } = React;

// Utility: Convert bytes to readable sizes
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const FileShareApp = ({ data, onUpdate, instanceId, title }) => {
    const [mode, setMode] = useState('local'); // 'local' or 'internet'
    const [role, setRole] = useState(null); // 'sender' or 'receiver'
    const [status, setStatus] = useState('idle'); // idle, waiting, connected, transferring, done, error
    
    // Transfer States
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState('-');
    
    // Signaling States
    const [offerString, setOfferString] = useState('');
    const [answerString, setAnswerString] = useState('');
    const [roomId, setRoomId] = useState('');
    
    // WebRTC Refs
    const pc = useRef(null);
    const dc = useRef(null);
    const receiveBuffer = useRef([]);
    const receivedSize = useRef(0);
    const fileMeta = useRef(null);
    const statsInterval = useRef(null);
    const lastBytes = useRef(0);

    const CHUNK_SIZE = 65536; // 64KB

    // --- WebRTC Initialization ---
    const initPeerConnection = () => {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        peer.onconnectionstatechange = () => {
            if (peer.connectionState === 'connected') {
                setStatus('connected');
            } else if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
                setStatus('error');
            }
        };

        return peer;
    };

    // --- SENDER LOGIC ---
    const handleGenerateOffer = async () => {
        if (!file) return;
        setStatus('waiting');
        
        pc.current = initPeerConnection();
        
        // Create Data Channel
        const channel = pc.current.createDataChannel('fileTransfer');
        channel.binaryType = 'arraybuffer';
        channel.bufferedAmountLowThreshold = CHUNK_SIZE * 4;
        setupDataChannel(channel, 'sender');
        dc.current = channel;

        // Ice Candidate Gathering
        pc.current.onicecandidate = (e) => {
            if (e.candidate === null) {
                // Gathering complete, encode offer
                const offerData = JSON.stringify(pc.current.localDescription);
                setOfferString(btoa(offerData));
            }
        };

        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
    };

    const handleSenderAcceptAnswer = async () => {
        if (!answerString) return;
        try {
            const answer = JSON.parse(atob(answerString));
            await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
            console.error("Invalid answer string");
            setStatus('error');
        }
    };

    // --- RECEIVER LOGIC ---
    const handleReceiverProcessOffer = async () => {
        if (!offerString) return;
        setStatus('waiting');
        
        pc.current = initPeerConnection();
        
        pc.current.ondatachannel = (e) => {
            setupDataChannel(e.channel, 'receiver');
            dc.current = e.channel;
        };

        pc.current.onicecandidate = (e) => {
            if (e.candidate === null) {
                const answerData = JSON.stringify(pc.current.localDescription);
                setAnswerString(btoa(answerData));
            }
        };

        try {
            const offer = JSON.parse(atob(offerString));
            await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
        } catch (err) {
            console.error("Invalid offer string");
            setStatus('error');
        }
    };

    // --- DATA CHANNEL & TRANSFER LOGIC ---
    const setupDataChannel = (channel, roleType) => {
        channel.onopen = () => {
            setStatus('transferring');
            if (roleType === 'sender') {
                startTransfer(channel);
            }
        };

        channel.onmessage = (e) => {
            if (typeof e.data === 'string') {
                // Metadata received
                fileMeta.current = JSON.parse(e.data);
                receivedSize.current = 0;
                receiveBuffer.current = [];
                trackSpeed();
            } else {
                // Binary chunk received
                receiveBuffer.current.push(e.data);
                receivedSize.current += e.data.byteLength;
                
                const currentProgress = Math.round((receivedSize.current / fileMeta.current.size) * 100);
                setProgress(currentProgress);

                if (receivedSize.current === fileMeta.current.size) {
                    finishTransfer();
                }
            }
        };
    };

    const startTransfer = async (channel) => {
        // Send Meta
        channel.send(JSON.stringify({
            name: file.name,
            size: file.size,
            type: file.type
        }));

        trackSpeed();

        let offset = 0;
        
        // Chunking & Backpressure handling
        const sendNextChunk = async () => {
            while (offset < file.size) {
                if (channel.readyState !== 'open') break;

                // If buffer is full, wait for it to clear to prevent RAM crash
                if (channel.bufferedAmount > channel.bufferedAmountLowThreshold) {
                    await new Promise(resolve => {
                        channel.onbufferedamountlow = () => {
                            channel.onbufferedamountlow = null;
                            resolve();
                        };
                    });
                }

                const slice = file.slice(offset, offset + CHUNK_SIZE);
                const buffer = await slice.arrayBuffer();
                channel.send(buffer);
                
                offset += CHUNK_SIZE;
                lastBytes.current = offset; // For speed tracking
                setProgress(Math.round((offset / file.size) * 100));
            }
        };

        await sendNextChunk();
        setStatus('done');
        clearInterval(statsInterval.current);
    };

    const finishTransfer = () => {
        setStatus('done');
        clearInterval(statsInterval.current);
        
        const blob = new Blob(receiveBuffer.current, { type: fileMeta.current.type });
        const url = URL.createObjectURL(blob);
        
        // Auto-download
        const a = document.createElement('a');
        a.href = url;
        a.download = fileMeta.current.name;
        a.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        receiveBuffer.current = [];
    };

    const trackSpeed = () => {
        statsInterval.current = setInterval(() => {
            const currentBytes = role === 'sender' ? lastBytes.current : receivedSize.current;
            const bytesSec = currentBytes - (window.lastBytesCount || 0);
            window.lastBytesCount = currentBytes;
            
            setSpeed(bytesSec);
            
            const total = role === 'sender' ? file?.size : fileMeta.current?.size;
            if (total && bytesSec > 0) {
                const secsRemaining = Math.max(0, Math.round((total - currentBytes) / bytesSec));
                setTimeRemaining(secsRemaining + 's');
            }
        }, 1000);
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (pc.current) pc.current.close();
            if (statsInterval.current) clearInterval(statsInterval.current);
        };
    }, []);

    // --- RENDER HELPERS ---
    const copyToClipboard = (txt) => {
        navigator.clipboard.writeText(txt);
        alert("Copied to clipboard!");
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 overflow-y-auto">
            
            {/* Header Tabs */}
            <div className="flex border-b border-slate-200 dark:border-white/10 shrink-0">
                <button onClick={() => setMode('local')} className={\`flex-1 py-3 text-sm font-semibold transition-colors \${mode === 'local' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}\`}>Local (Offline)</button>
                <button onClick={() => setMode('internet')} className={\`flex-1 py-3 text-sm font-semibold transition-colors \${mode === 'internet' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}\`}>Internet (WAN)</button>
            </div>

            <div className="p-4 sm:p-6 flex-1 flex flex-col items-center">
                
                {/* ROLE SELECTION */}
                {status === 'idle' && (
                    <div className="w-full max-w-md animate-slide-up flex flex-col items-center justify-center h-full gap-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold mb-2">P2P File Transfer</h2>
                            <p className="text-sm text-slate-500 dark:text-zinc-400">Directly transfer files between devices securely.</p>
                        </div>
                        <div className="flex w-full gap-4">
                            <button onClick={() => setRole('sender')} className="flex-1 flex flex-col items-center p-6 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-400 transition-all active:scale-95 group">
                                <svg className="w-10 h-10 mb-3 text-blue-500 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                <span className="font-bold">Send File</span>
                            </button>
                            <button onClick={() => setRole('receiver')} className="flex-1 flex flex-col items-center p-6 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md hover:border-green-400 transition-all active:scale-95 group">
                                <svg className="w-10 h-10 mb-3 text-green-500 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                <span className="font-bold">Receive File</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* SENDER FLOW */}
                {role === 'sender' && status !== 'idle' && (
                    <div className="w-full max-w-md flex flex-col gap-4 animate-slide-up">
                        {status === 'waiting' && !offerString && (
                            <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm">
                                <h3 className="font-bold mb-3">1. Select a File</h3>
                                <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400" />
                                {file && (
                                    <button onClick={handleGenerateOffer} className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">
                                        Generate Transfer Link
                                    </button>
                                )}
                            </div>
                        )}

                        {status === 'waiting' && offerString && (
                            <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm flex flex-col items-center">
                                {mode === 'local' ? (
                                    <>
                                        <h3 className="font-bold mb-2">2. Scan or Copy Code</h3>
                                        <p className="text-xs text-slate-500 mb-4 text-center">Have the receiver scan this QR or paste the code below on their device.</p>
                                        <div className="bg-white p-2 rounded-lg mb-4 border shadow-inner">
                                            <img src={\`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=\${encodeURIComponent(offerString)}\`} alt="QR Code" className="w-32 h-32" />
                                        </div>
                                        <button onClick={() => copyToClipboard(offerString)} className="text-xs text-blue-500 font-bold mb-4">Copy Code Manually</button>
                                        
                                        <div className="w-full border-t border-slate-100 dark:border-zinc-700 pt-4 mt-2">
                                            <h3 className="font-bold mb-2">3. Paste Receiver Answer</h3>
                                            <input type="text" placeholder="Paste Answer Code here..." value={answerString} onChange={(e) => setAnswerString(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded p-2 text-xs mb-3" />
                                            <button onClick={handleSenderAcceptAnswer} className="w-full py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors">Start Transfer</button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-6">
                                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                                        <p className="text-sm font-semibold">Waiting for backend integration...</p>
                                        <p className="text-xs text-slate-500 mt-2">In a real production environment, this connects to a Socket.io server using Room ID: <b>782391</b>.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* RECEIVER FLOW */}
                {role === 'receiver' && status === 'waiting' && (
                     <div className="w-full max-w-md animate-slide-up bg-white dark:bg-zinc-800 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm flex flex-col items-center">
                        {mode === 'local' ? (
                            <>
                                {!answerString ? (
                                    <>
                                        <h3 className="font-bold mb-2">1. Paste Sender Code</h3>
                                        <input type="text" placeholder="Paste Offer Code here..." value={offerString} onChange={(e) => setOfferString(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded p-2 text-xs mb-3" />
                                        <button onClick={handleReceiverProcessOffer} className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">Process Code</button>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="font-bold mb-2 text-green-500">2. Code Generated!</h3>
                                        <p className="text-xs text-slate-500 mb-4 text-center">Give this QR or code back to the Sender.</p>
                                        <div className="bg-white p-2 rounded-lg mb-4 border shadow-inner">
                                            <img src={\`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=\${encodeURIComponent(answerString)}\`} alt="QR Code" className="w-32 h-32" />
                                        </div>
                                        <button onClick={() => copyToClipboard(answerString)} className="w-full py-2 bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-zinc-600 transition-colors">Copy Code</button>
                                        <p className="text-xs font-semibold mt-4 animate-pulse">Waiting for sender to start...</p>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="text-center w-full">
                                <h3 className="font-bold mb-2">Enter 6-Digit Room PIN</h3>
                                <input type="text" maxLength={6} placeholder="e.g. 782391" className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded p-4 text-center tracking-widest font-mono text-2xl font-bold mb-3" />
                                <button className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold">Connect via Server</button>
                            </div>
                        )}
                    </div>
                )}

                {/* TRANSFER PROGRESS SCREEN */}
                {(status === 'transferring' || status === 'done' || status === 'connected') && (
                    <div className="w-full max-w-md bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-lg flex flex-col items-center animate-slide-up">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-4">
                            {status === 'done' ? (
                                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg className="w-8 h-8 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            )}
                        </div>
                        
                        <h3 className="text-lg font-bold mb-1">
                            {status === 'done' ? 'Transfer Complete!' : 'Transferring File...'}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono mb-6">
                            {role === 'sender' ? file?.name : fileMeta.current?.name}
                        </p>

                        <div className="w-full bg-slate-100 dark:bg-zinc-900 rounded-full h-4 mb-3 overflow-hidden shadow-inner">
                            <div className="bg-blue-500 h-4 rounded-full transition-all duration-300 relative overflow-hidden" style={{ width: \`\${progress}%\` }}>
                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[slideRight_2s_linear_infinite]" style={{ transform: 'skewX(-20deg)', backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                            </div>
                        </div>
                        
                        <div className="flex justify-between w-full text-xs font-semibold text-slate-500 dark:text-zinc-400">
                            <span>{progress}%</span>
                            {status === 'transferring' && (
                                <div className="flex gap-4">
                                    <span>{formatBytes(speed)}/s</span>
                                    <span>{timeRemaining}</span>
                                </div>
                            )}
                        </div>

                        {status === 'done' && (
                            <button onClick={() => { setStatus('idle'); setRole(null); setOfferString(''); setAnswerString(''); }} className="mt-6 px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-lg font-bold transition-colors">
                                Send/Receive Another
                            </button>
                        )}
                    </div>
                )}
                
                {status === 'error' && (
                     <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">
                         <h3 className="font-bold mb-2">Connection Error</h3>
                         <p className="text-sm">The P2P connection dropped or the code was invalid.</p>
                         <button onClick={() => setStatus('idle')} className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/40 rounded-lg font-bold hover:opacity-80">Try Again</button>
                     </div>
                )}

            </div>
        </div>
    );
};

return FileShareApp;
`;
