window.CanvasApps['MediaEditor'] = `
const { useState, useEffect, useRef } = React;

function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00.00";
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(2);
    return \`\${m}:\${s.padStart(5, '0')}\`;
}

function audioBufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels =[];
    let offset = 0, pos = 0;

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157); 
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan); 
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);

    for(let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

    while(pos < length) {
        for(let i = 0; i < numOfChan; i++) {
            let sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }
    return new Blob([view], {type: "audio/wav"});
}

const Icons = {
    Play: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    Pause: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
    Scissors: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
    Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
    Export: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    ZoomIn: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
    ZoomOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
};

// Safe Downloader - Bypasses 'blob:null' block if possible
const safeDownload = (blob, fileName) => {
    try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.warn("Blob URL download blocked. Trying Data URL fallback...", e);
        const reader = new FileReader();
        reader.onloadend = () => {
            const a = document.createElement('a');
            a.href = reader.result;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        reader.readAsDataURL(blob);
    }
};

const MediaEditorApp = ({ data, title }) => {
    const isVideo = data?.isVideo === true;
    const fileData = data?.fileData;
    const rawFile = data?.rawFile;
    const ext = (title || 'media.mp4').split('.').pop().toLowerCase();

    const [isReady, setIsReady] = useState(false);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const [slicePoints, setSlicePoints] = useState([]);
    const [selectedIntervals, setSelectedIntervals] = useState([0]); 
    const [isProcessing, setIsProcessing] = useState(false);
    const [processStatus, setProcessStatus] = useState('');
    const [ffmpegInstance, setFfmpegInstance] = useState(null);
    
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isDraggingCursor, setIsDraggingCursor] = useState(false);

    const canvasRef = useRef(null);
    const mediaRef = useRef(null);
    const trackRef = useRef(null);
    const scrollContainerRef = useRef(null);

    const handleLoadedMetadata = (e) => {
        const el = e.target;
        if (el && isFinite(el.duration) && el.duration > 0) {
            setDuration(el.duration);
            setSlicePoints(prev => prev.length <= 2 ? [0, el.duration] : prev);
        }
    };

    useEffect(() => {
        if (!fileData) return;
        setIsReady(false);
        let audioCtx = null;

        if (isVideo) {
            const vid = document.createElement('video');
            vid.preload = 'metadata';
            vid.onloadedmetadata = () => {
                if (isFinite(vid.duration)) {
                    setDuration(vid.duration);
                    setSlicePoints([0, vid.duration]);
                }
                setIsReady(true);
            };
            vid.src = fileData;
        } else {
            fetch(fileData).then(res => res.arrayBuffer()).then(arrayBuffer => {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                audioCtx.decodeAudioData(arrayBuffer.slice(0), (buffer) => {
                    setAudioBuffer(buffer);
                    setDuration(buffer.duration);
                    setSlicePoints([0, buffer.duration]); 
                    setIsReady(true);
                }).catch(e => console.log("Audio decode failed.", e));
            });
        }

        return () => { if (audioCtx && audioCtx.state !== 'closed') audioCtx.close(); };
    }, [fileData, isVideo]);

    // FFMPEG v12 Boot with Blob Worker Bypass (UPDATED TO JSDELIVR)
    // FFMPEG v12 Boot with Blob Worker Bypass (THE ACTUAL FIX)
    useEffect(() => {
        if (!isVideo) return;

        const initFFmpeg = async () => {
            try {
                if (window.globalFfmpegInstance) {
                    setFfmpegInstance(window.globalFfmpegInstance);
                    return;
                }
                const { FFmpeg } = window.FFmpegWASM;
                const { toBlobURL } = window.FFmpegUtil;
                const ffmpeg = new FFmpeg();
                
                const coreBase = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
                const ffmpegBase = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd';
                
                // THE FIX: It is 'classWorkerURL', not 'workerURL'. 
                // This forces the browser to run it locally as a Blob, bypassing the CORS block.
                await ffmpeg.load({
                    coreURL: await toBlobURL(coreBase + '/ffmpeg-core.js', 'text/javascript'),
                    wasmURL: await toBlobURL( coreBase + '/ffmpeg-core.wasm', 'application/wasm'),
                    classWorkerURL: await toBlobURL(ffmpegBase+ '/814.ffmpeg.js', 'text/javascript')
                });
                
                window.globalFfmpegInstance = ffmpeg;
                setFfmpegInstance(ffmpeg);
            } catch (e) {
                console.error("FFmpeg Load Error:", e);
                setProcessStatus("Engine blocked by network.");
            }
        };

        if (!window.FFmpegWASM || !window.FFmpegUtil) {
            const s1 = document.createElement('script');
            s1.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js';
            const s2 = document.createElement('script');
            s2.src = 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js';
            
            s1.onload = () => {
                s2.onload = initFFmpeg;
                document.head.appendChild(s2);
            };
            document.head.appendChild(s1);
        } else {
            initFFmpeg();
        }
    }, [isVideo]);

    useEffect(() => {
        if (!isReady || !canvasRef.current || isVideo || !audioBuffer) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        
        const channelData = audioBuffer.getChannelData(0);
        const step = Math.ceil(channelData.length / width);
        const amp = height / 2;
        
        ctx.fillStyle = '#71717a'; 
        for (let i = 0; i < width; i++) {
            let min = 1.0, max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = channelData[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    }, [isReady, audioBuffer, isVideo]);

    const handleTimeUpdate = () => {
        if (mediaRef.current && !isDraggingCursor) {
            setCurrentTime(mediaRef.current.currentTime);
            if (isPlaying && scrollContainerRef.current && trackRef.current) {
                const scrollEl = scrollContainerRef.current;
                const trackWidth = trackRef.current.clientWidth;
                const currentPx = (mediaRef.current.currentTime / duration) * trackWidth;
                
                if (currentPx > scrollEl.scrollLeft + scrollEl.clientWidth * 0.8) {
                    scrollEl.scrollLeft = currentPx - scrollEl.clientWidth * 0.2;
                }
            }
        }
    };

    const togglePlayback = () => {
        if (mediaRef.current) {
            if (isPlaying) mediaRef.current.pause();
            else mediaRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const updateTimeFromEvent = (e) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(x / rect.width, 1));
        const newTime = percent * duration;
        
        setCurrentTime(newTime);
        if (mediaRef.current) mediaRef.current.currentTime = newTime;
    };

    const handlePointerDown = (e) => {
        if (e.button !== 0) return; 
        setIsDraggingCursor(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        if (isPlaying) { mediaRef.current?.pause(); setIsPlaying(false); }
        updateTimeFromEvent(e);
    };

    const handlePointerMove = (e) => {
        if (!isDraggingCursor) return;
        updateTimeFromEvent(e);
    };

    const handlePointerUp = (e) => {
        setIsDraggingCursor(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const updateSelectionsAfterSliceChange = (newPts) => {
        const newSelected =[];
        for (let i = 0; i < newPts.length - 1; i++) {
            const mid = (newPts[i] + newPts[i+1]) / 2;
            const oldIdx = slicePoints.findIndex((p, idx) => mid >= p && mid <= slicePoints[idx+1]);
            if (selectedIntervals.includes(oldIdx)) newSelected.push(i);
        }
        setSlicePoints(newPts);
        setSelectedIntervals(newSelected);
    };

    const handleSplitAtPlayhead = () => {
        if (currentTime <= 0.1 || currentTime >= duration - 0.1) return;
        if (slicePoints.some(p => Math.abs(p - currentTime) < 0.2)) return; 
        const newPts =[...slicePoints, currentTime].sort((a,b) => a-b);
        updateSelectionsAfterSliceChange(newPts);
    };

    const handleRemoveClosestSplit = () => {
        if (slicePoints.length <= 2) return; 
        let closestIdx = -1;
        let minDiff = Infinity;
        for (let i = 1; i < slicePoints.length - 1; i++) {
            const diff = Math.abs(slicePoints[i] - currentTime);
            if (diff < minDiff) { minDiff = diff; closestIdx = i; }
        }
        if (closestIdx !== -1 && minDiff < (duration * 0.05)) {
            const newPts = [...slicePoints];
            newPts.splice(closestIdx, 1);
            updateSelectionsAfterSliceChange(newPts);
        }
    };

    const toggleInterval = (index) => {
        if (selectedIntervals.includes(index)) setSelectedIntervals(selectedIntervals.filter(i => i !== index));
        else setSelectedIntervals([...selectedIntervals, index]);
    };

    const exportSelected = async () => {
        if (selectedIntervals.length === 0) return;
        
        setIsProcessing(true);
        const baseFileName = (title || 'Media').split('.').slice(0, -1).join('.') || 'Media';
        
        try {
            if (isVideo) {
                if (!ffmpegInstance) throw new Error("FFmpeg engine is missing. Browser may have blocked it.");
                
                let inputPath = '';
                let usingWorkerFS = false;
                const mountDir = '/mnt';

                if (rawFile) {
                    setProcessStatus('Mounting file directly from disk...');
                    try { await ffmpegInstance.createDir(mountDir); } catch(e) {}
                    await ffmpegInstance.mount('WORKERFS', { files: [rawFile] }, mountDir);
                    inputPath = \`\${mountDir}/\${rawFile.name}\`;
                    usingWorkerFS = true;
                } else {
                    setProcessStatus('Loading file to memory...');
                    const res = await fetch(fileData);
                    const buf = await res.arrayBuffer();
                    inputPath = \`input.\${ext}\`;
                    await ffmpegInstance.writeFile(inputPath, new Uint8Array(buf));
                }
                
                for (let i = 0; i < selectedIntervals.length; i++) {
                    const idx = selectedIntervals[i];
                    const startSec = slicePoints[idx];
                    const endSec = slicePoints[idx + 1];
                    const clipDuration = endSec - startSec;
                    const outName = \`output_\${idx}.\${ext}\`;
                    
                    setProcessStatus(\`Exporting Clip \${i + 1} / \${selectedIntervals.length}...\`);

                    await ffmpegInstance.exec([
                        '-ss', startSec.toString(), 
                        '-i', inputPath, 
                        '-t', clipDuration.toString(), 
                        '-c', 'copy', 
                        outName
                    ]);
                    
                    const outData = await ffmpegInstance.readFile(outName);
                    const blob = new Blob([outData.buffer], { type: 'video/mp4' });
                    
                    safeDownload(blob, \`\${baseFileName}_clip_\${i + 1}.\${ext}\`);
                    
                    await ffmpegInstance.deleteFile(outName);
                }
                
                if (usingWorkerFS) {
                    await ffmpegInstance.unmount(mountDir);
                    try { await ffmpegInstance.deleteDir(mountDir); } catch(e) {}
                } else {
                    try { await ffmpegInstance.deleteFile(inputPath); } catch(e) {}
                }

            } else {
                if (!audioBuffer) throw new Error("Audio buffer missing.");
                for (let i = 0; i < selectedIntervals.length; i++) {
                    const idx = selectedIntervals[i];
                    const startSec = slicePoints[idx];
                    const endSec = slicePoints[idx + 1];
                    
                    setProcessStatus(\`Exporting Clip \${i + 1} / \${selectedIntervals.length}...\`);

                    const startOffset = Math.floor(startSec * audioBuffer.sampleRate);
                    const endOffset = Math.floor(endSec * audioBuffer.sampleRate);
                    const frameCount = endOffset - startOffset;
                    
                    const newBuffer = new (window.AudioContext || window.webkitAudioContext)().createBuffer(
                        audioBuffer.numberOfChannels, 
                        frameCount, 
                        audioBuffer.sampleRate
                    );
                    
                    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
                        newBuffer.getChannelData(c).set(audioBuffer.getChannelData(c).subarray(startOffset, endOffset));
                    }
                    
                    const blob = audioBufferToWav(newBuffer);
                    safeDownload(blob, \`\${baseFileName}_clip_\${i + 1}.wav\`);
                }
            }
            setProcessStatus('Export Complete!');
            setTimeout(() => setProcessStatus(''), 3000);
        } catch (err) {
            console.error("Export Failed", err);
            alert(err.message || "Export failed.");
        }
        
        setIsProcessing(false);
    };

    if (!isReady) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-zinc-950 flex-col gap-4">
                <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-400 font-medium">Initializing Media...</p>
            </div>
        );
    }

    const isFFmpegReady = !isVideo || ffmpegInstance !== null;
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-200 overflow-hidden font-sans select-none">
            
            <div className="px-4 py-2.5 border-b border-zinc-800/80 flex items-center bg-zinc-950 shrink-0 shadow-sm z-10">
                <h2 className="font-semibold text-sm sm:text-base text-zinc-200 truncate">{title || 'Media Editor'}</h2>
            </div>

            <div className="flex-1 min-h-0 relative bg-[#09090b] flex items-center justify-center overflow-hidden">
                {isVideo ? (
                    <video ref={mediaRef} src={fileData} onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="w-full h-full object-contain outline-none cursor-pointer" onClick={togglePlayback} />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex flex-col items-center justify-center p-6">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-zinc-800/80 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-zinc-700/50 cursor-pointer hover:scale-105 transition-transform" onClick={togglePlayback}>
                            <svg className="w-10 h-10 sm:w-14 sm:h-14 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                        </div>
                        <audio ref={mediaRef} src={fileData} onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="hidden" />
                    </div>
                )}
            </div>

            <div className={\`border-t border-zinc-800 bg-zinc-950 flex flex-col shrink-0 relative z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.4)] \${isVideo ? 'h-40 sm:h-44' : 'h-52 sm:h-60'}\`}>
                <div className="px-3 py-2 border-b border-zinc-800/50 flex flex-wrap items-center justify-between bg-zinc-900/50 shrink-0 gap-y-2 gap-x-4">
                    <div className="flex items-center gap-2">
                        <button onClick={handleSplitAtPlayhead} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors border border-zinc-700 active:scale-95" title="Split exactly at the red cursor">
                            <Icons.Scissors /> <span className="hidden sm:inline">Split</span>
                        </button>
                        <button onClick={handleRemoveClosestSplit} disabled={slicePoints.length <= 2} className="px-3 py-1.5 bg-zinc-800 hover:bg-red-900/40 text-red-400 hover:text-red-300 rounded-md text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors border border-zinc-700 disabled:opacity-30 active:scale-95" title="Remove the split point closest to cursor">
                            <Icons.Trash /> <span className="hidden sm:inline">Remove</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                        <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800 shadow-inner">
                            <span className="text-xs font-mono text-violet-400 w-12 text-right">{formatTime(currentTime)}</span>
                            <button onClick={togglePlayback} className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center hover:bg-violet-500 hover:scale-105 active:scale-95 transition-all shadow-md">
                                {isPlaying ? <Icons.Pause /> : <Icons.Play />}
                            </button>
                            <span className="text-xs font-mono text-zinc-500 w-12">{formatTime(duration)}</span>
                        </div>

                        <div className="hidden sm:flex items-center gap-1 bg-zinc-950 px-1.5 py-1 rounded-md border border-zinc-800 shadow-inner">
                            <button onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))} className="p-1 hover:text-violet-400 transition-colors text-zinc-400"><Icons.ZoomOut /></button>
                            <span className="text-[10px] font-mono text-zinc-500 w-7 text-center">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={() => setZoomLevel(Math.min(10, zoomLevel + 0.5))} className="p-1 hover:text-violet-400 transition-colors text-zinc-400"><Icons.ZoomIn /></button>
                        </div>

                        <button onClick={exportSelected} disabled={isProcessing || selectedIntervals.length === 0 || !isFFmpegReady} className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-bold rounded-md shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 active:scale-95">
                            {!isFFmpegReady ? (
                                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Loading Engine...</>
                            ) : isProcessing ? (
                                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> {processStatus || 'Working...'}</>
                            ) : (
                                <><Icons.Export /> Export {selectedIntervals.length}</>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-zinc-950 relative" ref={scrollContainerRef}>
                    <div ref={trackRef} className="h-full relative py-3 flex flex-col gap-1 min-w-full touch-none" style={{ width: \`\${zoomLevel * 100}%\` }}>
                        <div className="h-6 w-full bg-zinc-900/80 rounded-t-md border-b border-zinc-800 relative cursor-text mx-2" style={{ width: 'calc(100% - 16px)' }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}></div>

                        {!isVideo && (
                            <div className="h-[72px] w-full bg-zinc-900 border-b border-zinc-800 relative cursor-col-resize overflow-hidden mx-2 shadow-inner" style={{ width: 'calc(100% - 16px)' }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
                                <canvas ref={canvasRef} width="2000" height="72" className="absolute inset-0 w-full h-full pointer-events-none opacity-80" />
                            </div>
                        )}

                        <div className="flex-1 w-full flex gap-[2px] mt-1 relative cursor-pointer px-2 min-h-[36px]" style={{ width: 'calc(100% - 16px)' }}>
                            {Array.from({ length: slicePoints.length - 1 }).map((_, i) => {
                                const start = slicePoints[i];
                                const end = slicePoints[i+1];
                                const wPercent = ((end - start) / duration) * 100;
                                const isSelected = selectedIntervals.includes(i);

                                return (
                                    <div key={\`block-\${i}\`} onClick={() => toggleInterval(i)} className={\`h-full rounded-md transition-colors border flex flex-col items-center justify-center overflow-hidden relative group \${isSelected ? 'bg-violet-600/90 border-violet-400 hover:bg-violet-500 shadow-md' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'}\`} style={{ width: \`\${wPercent}%\` }} title={\`Clip \${i+1} (\${formatTime(end - start)})\`}>
                                        {isSelected ? (
                                            <svg className="w-5 h-5 text-white opacity-90 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                        ) : (
                                            <svg className="w-5 h-5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                        )}
                                        {wPercent > (2.5 / zoomLevel) && (
                                            <span className={\`text-[10px] font-bold whitespace-nowrap px-1 \${isSelected ? 'text-violet-100' : 'text-zinc-400'}\`}>{formatTime(end - start)}</span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {slicePoints.slice(1, -1).map((pt, i) => (
                            <div key={\`mark-\${i}\`} className="absolute top-3 bottom-3 w-px bg-zinc-600 pointer-events-none z-10" style={{ left: \`calc(8px + \${(pt / duration) * 100}%)\` }}>
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-zinc-400" />
                            </div>
                        ))}

                        <div className="absolute top-1 bottom-3 w-[2px] bg-red-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]" style={{ left: \`calc(8px + \${progressPercent}% - 1px)\` }}>
                            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-5 h-6 bg-red-500 rounded-[4px] shadow-lg border border-red-700 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
                                <div className="flex gap-[2px]">
                                    <div className="w-[1px] h-3 bg-white/70 rounded-full" />
                                    <div className="w-[1px] h-3 bg-white/70 rounded-full" />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            
        </div>
    );
};

return MediaEditorApp;
`;