// apps/DrawIt.js
window.CanvasApps['DrawIt'] = `
const { useState, useEffect, useRef, useCallback } = React;

const injectGlobalStyles = () => {
    if (document.getElementById('drawit-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'drawit-global-styles';
    style.innerHTML = '.hide-scrollbar::-webkit-scrollbar { display: none; } ' +
        '.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } ' +
        'body { margin: 0; overflow: hidden; touch-action: none; overscroll-behavior: none; background-color: #f8fafc; }';
    document.head.appendChild(style);
};

const useFabric = () => {
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        const initFabricExtensions = () => {
            if (!window.fabric.Pill) {
                window.fabric.Pill = window.fabric.util.createClass(window.fabric.Rect, {
                    type: 'pill',
                    initialize: function (options) { this.callSuper('initialize', options); },
                    _render: function (ctx) {
                        const effWidth = this.width * Math.abs(this.scaleX);
                        const effHeight = this.height * Math.abs(this.scaleY);
                        const effRadius = Math.min(effWidth, effHeight) / 2;
                        this.rx = effRadius / Math.abs(this.scaleX);
                        this.ry = effRadius / Math.abs(this.scaleY);
                        this.callSuper('_render', ctx);
                    }
                });
                window.fabric.Pill.fromObject = function (object, callback) {
                    return window.fabric.Object._fromObject('Pill', object, callback);
                };
            }

            window.fabric.Object.prototype.snapAngle = 45;
            window.fabric.Object.prototype.snapThreshold = 5;

            setLoaded(true);
        };

        if (window.fabric) { initFabricExtensions(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js';
        script.async = true;
        script.onload = initFabricExtensions;
        document.body.appendChild(script);
    }, []);
    return loaded;
};

const Icon = ({ name, size = 18, className = "" }) => {
    const paths = {
        select: <><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" /></>,
        pen: <><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></>,
        line: <path d="M5 12h14" />,
        highlight: <><path d="m9 11-6 6v3h9l3-3" /><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" /></>,
        eraser: <><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" /></>,
        undo: <><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></>,
        redo: <><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></>,
        square: <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />,
        circle: <circle cx="12" cy="12" r="10" />,
        type: <><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" x2="15" y1="20" y2="20" /><line x1="12" x2="12" y1="4" y2="20" /></>,
        image: <><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></>,
        grid: <><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" /></>,
        download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></>,
        trash: <><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></>,
        palette: <><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></>,
        panelBottom: <><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M3 15h18" /><path d="m9 9 3 3 3-3" /></>,
        panelTop: <><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M3 9h18" /><path d="m9 14 3-3 3 3" /></>,
        eyeOff: <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></>,
        eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>
    };
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
};

const Divider = () => <div className="flex-shrink-0 w-px h-6 bg-slate-300 self-center mx-1" />;

const DrawItApp = ({ data, onUpdate, instanceId }) => {
    const fabricLoaded = useFabric();
    const canvasContainerRef = useRef(null);
    const fileInputRef = useRef(null);

    const topScrollRef = useRef(null);
    const bottomScrollRef = useRef(null);

    const [canvas, setCanvas] = useState(null);
    const [tool, setTool] = useState('pen');
    const [color, setColor] = useState('#2563eb');
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [fillType, setFillType] = useState('stroke');
    const [fontSize, setFontSize] = useState(24);
    const [fontFamily, setFontFamily] = useState('Arial');
    const [showGrid, setShowGrid] = useState(true);
    const [hasActiveObject, setHasActiveObject] = useState(false);

    const [isMerged, setIsMerged] = useState(false);
    const [isHidden, setIsHidden] = useState(false);

    const layoutStateRef = useRef({ isMerged: false, isHidden: false });
    const [pendingImage, setPendingImage] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const isHistoryAction = useRef(false);

    const stateRef = useRef({ tool, color, strokeWidth });

    useEffect(() => {
        injectGlobalStyles();
    }, []);

    useEffect(() => { stateRef.current = { tool, color, strokeWidth }; }, [tool, color, strokeWidth]);

    // NEW: Calculate dimensions strictly based on the parent WindowFrame
    const fitToSafeZone = useCallback((fabricCanvas) => {
        if (!fabricCanvas || !canvasContainerRef.current) return;

        const newW = canvasContainerRef.current.clientWidth;
        const newH = canvasContainerRef.current.clientHeight;

        if (fabricCanvas.width !== newW || fabricCanvas.height !== newH) {
            fabricCanvas.setWidth(newW);
            fabricCanvas.setHeight(newH);
        }

        const state = layoutStateRef.current;

        let pTop = 20, pBot = 20;
        if (!state.isHidden) {
            pBot = 100;
            if (!state.isMerged) pTop = 100;
        }

        const safeW = newW - 40;
        const safeH = newH - pTop - pBot;
        const safeCenterX = newW / 2;
        const safeCenterY = pTop + safeH / 2;

        const bg = fabricCanvas.backgroundImage;
        if (bg) {
            const oldScale = bg.scaleX;
            const oldLeft = bg.left;
            const oldTop = bg.top;

            const newScale = Math.min(safeW / bg.width, safeH / bg.height);
            const scaleRatio = oldScale ? newScale / oldScale : 1;

            bg.set({ scaleX: newScale, scaleY: newScale, left: safeCenterX, top: safeCenterY });

            fabricCanvas.getObjects().forEach(obj => {
                if (obj.excludeFromExport) return; 

                const dx = obj.left - oldLeft;
                const dy = obj.top - oldTop;

                obj.set({
                    left: safeCenterX + dx * scaleRatio,
                    top: safeCenterY + dy * scaleRatio,
                    scaleX: obj.scaleX * scaleRatio,
                    scaleY: obj.scaleY * scaleRatio
                });
                obj.setCoords();
            });
        }

        if (fabricCanvas.guides) {
            fabricCanvas.guides.vLine.set({ x1: safeCenterX, x2: safeCenterX, y1: 0, y2: newH });
            fabricCanvas.guides.hLine.set({ x1: 0, x2: newW, y1: safeCenterY, y2: safeCenterY });
        }

        fabricCanvas.renderAll();
    }, []);

    useEffect(() => {
        layoutStateRef.current = { isMerged, isHidden };
        if (canvas) fitToSafeZone(canvas);
    }, [isMerged, isHidden, canvas, fitToSafeZone]);

    // NEW: ResizeObserver replacing standard window event listener
    useEffect(() => {
        if (!canvasContainerRef.current) return;
        
        const observer = new ResizeObserver((entries) => {
            if (!entries || !entries.length) return;
            const width = entries[0].contentRect.width;
            
            // Auto-collapse UI panels if the window gets too small
            if (width < 640 && !layoutStateRef.current.isMerged) {
                setIsMerged(true); 
            } else if (width >= 640 && layoutStateRef.current.isMerged) {
                setIsMerged(false);
            }
            
            // Fluidly scale the canvas to match the new window dimensions
            if (canvas) fitToSafeZone(canvas);
        });
        
        observer.observe(canvasContainerRef.current);
        return () => observer.disconnect();
    }, [canvas, fitToSafeZone]);

    useEffect(() => {
        const onWheel = e => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                e.currentTarget.scrollLeft += e.deltaY;
            }
        };
        const t = topScrollRef.current;
        const b = bottomScrollRef.current;

        if (t) t.addEventListener('wheel', onWheel, { passive: false });
        if (b) b.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            if (t) t.removeEventListener('wheel', onWheel);
            if (b) b.removeEventListener('wheel', onWheel);
        };
    });

    useEffect(() => {
        if (!fabricLoaded || canvas || !canvasContainerRef.current) return;

        const initCanvas = new window.fabric.Canvas('draw-canvas', {
            // NEW: Initialize with container dimensions, not full browser screen
            width: canvasContainerRef.current.clientWidth,
            height: canvasContainerRef.current.clientHeight,
            isDrawingMode: true,
            selection: false,
            backgroundColor: null,
            preserveObjectStacking: true,
            targetFindTolerance: 10
        });

        const vLine = new window.fabric.Line([initCanvas.width / 2, 0, initCanvas.width / 2, initCanvas.height], { stroke: '#ec4899', strokeWidth: 1.5, selectable: false, evented: false, excludeFromExport: true, opacity: 0, strokeDashArray: [5, 5] });
        const hLine = new window.fabric.Line([0, initCanvas.height / 2, initCanvas.width, initCanvas.height / 2], { stroke: '#ec4899', strokeWidth: 1.5, selectable: false, evented: false, excludeFromExport: true, opacity: 0, strokeDashArray: [5, 5] });

        const rotVLine = new window.fabric.Line([0, 0, 0, 0], { stroke: '#ec4899', strokeWidth: 1.5, selectable: false, evented: false, excludeFromExport: true, opacity: 0, strokeDashArray: [5, 5] });
        const rotHLine = new window.fabric.Line([0, 0, 0, 0], { stroke: '#ec4899', strokeWidth: 1.5, selectable: false, evented: false, excludeFromExport: true, opacity: 0, strokeDashArray: [5, 5] });

        initCanvas.add(vLine, hLine, rotVLine, rotHLine);
        initCanvas.guides = { vLine, hLine, rotVLine, rotHLine };

        initCanvas.on('object:moving', (e) => {
            const obj = e.target;
            const state = layoutStateRef.current;
            let pTop = 20, pBot = 20;
            if (!state.isHidden) { pBot = 100; if (!state.isMerged) pTop = 100; }

            const safeH = initCanvas.height - pTop - pBot;
            const cx = initCanvas.width / 2;
            const cy = pTop + safeH / 2;

            const center = obj.getCenterPoint();
            let snappedV = false, snappedH = false;
            let newX = center.x, newY = center.y;

            if (Math.abs(center.x - cx) < 15) { newX = cx; snappedV = true; }
            if (Math.abs(center.y - cy) < 15) { newY = cy; snappedH = true; }

            if (snappedV || snappedH) obj.setPositionByOrigin(new window.fabric.Point(newX, newY), 'center', 'center');

            initCanvas.guides.vLine.set({ opacity: snappedV ? 1 : 0, x1: cx, x2: cx });
            initCanvas.guides.hLine.set({ opacity: snappedH ? 1 : 0, y1: cy, y2: cy });
            initCanvas.guides.vLine.bringToFront(); initCanvas.guides.hLine.bringToFront();
        });

        initCanvas.on('object:rotating', (e) => {
            const obj = e.target;
            let angle = Math.round(obj.angle) % 360;
            if (angle < 0) angle += 360;

            if (angle % 45 === 0) {
                const center = obj.getCenterPoint();
                const w = initCanvas.width;
                const h = initCanvas.height;
                initCanvas.guides.rotVLine.set({ x1: center.x, y1: center.y - h * 2, x2: center.x, y2: center.y + h * 2, opacity: 1 });
                initCanvas.guides.rotHLine.set({ x1: center.x - w * 2, y1: center.y, x2: center.x + w * 2, y2: center.y, opacity: 1 });
                initCanvas.guides.rotVLine.bringToFront(); initCanvas.guides.rotHLine.bringToFront();
            } else {
                initCanvas.guides.rotVLine.set({ opacity: 0 }); initCanvas.guides.rotHLine.set({ opacity: 0 });
            }
        });

        initCanvas.on('mouse:up', () => {
            initCanvas.guides.vLine.set({ opacity: 0 }); initCanvas.guides.hLine.set({ opacity: 0 });
            initCanvas.guides.rotVLine.set({ opacity: 0 }); initCanvas.guides.rotHLine.set({ opacity: 0 });
            initCanvas.renderAll();
        });

        let isErasing = false, erasedSomething = false;
        const eraseTarget = (target) => {
            if (target && !target.excludeFromExport) { initCanvas.remove(target); erasedSomething = true; }
        };
        initCanvas.on('mouse:down', (e) => { if (stateRef.current.tool === 'eraser') { isErasing = true; eraseTarget(e.target); } });
        initCanvas.on('mouse:move', (e) => { if (stateRef.current.tool === 'eraser' && isErasing) eraseTarget(e.target); });
        initCanvas.on('mouse:up', () => { if (stateRef.current.tool === 'eraser' && isErasing) { isErasing = false; if (erasedSomething) { saveHistory(); erasedSomething = false; } } });

        initCanvas.on('path:created', (e) => { e.path.set({ perPixelTargetFind: true, strokeUniform: true }); saveHistory(); });

        let isDrawingLine = false, lineObj = null;
        initCanvas.on('mouse:down', (o) => {
            if (stateRef.current.tool !== 'line') return;
            isDrawingLine = true;
            const pointer = initCanvas.getPointer(o.e);
            lineObj = new window.fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                strokeWidth: stateRef.current.strokeWidth, fill: stateRef.current.color, stroke: stateRef.current.color,
                originX: 'center', originY: 'center', selectable: false, evented: false, strokeLineCap: 'round', strokeUniform: true, perPixelTargetFind: true
            });
            initCanvas.add(lineObj);
        });
        initCanvas.on('mouse:move', (o) => {
            if (!isDrawingLine || stateRef.current.tool !== 'line') return;
            const pointer = initCanvas.getPointer(o.e);
            lineObj.set({ x2: pointer.x, y2: pointer.y });
            initCanvas.renderAll();
        });
        initCanvas.on('mouse:up', () => {
            if (stateRef.current.tool === 'line' && isDrawingLine) { isDrawingLine = false; if (lineObj) { lineObj.setCoords(); saveHistory(); } }
        });

        const saveHistory = () => {
            if (isHistoryAction.current) return;
            const json = initCanvas.toJSON(['selectable', 'evented', 'strokeUniform', 'perPixelTargetFind']);
            setHistory(prev => {
                const newHistory = prev.slice(0, historyIndex + 1);
                newHistory.push(json);
                setHistoryIndex(newHistory.length - 1);
                return newHistory;
            });
        };
        initCanvas.on('object:added', (e) => { if (!e.target.excludeFromExport && stateRef.current.tool !== 'line' && !erasedSomething && e.target.type !== 'path') saveHistory(); });
        initCanvas.on('object:modified', saveHistory);
        initCanvas.on('object:removed', saveHistory);
        setTimeout(() => saveHistory(), 100);

        setCanvas(initCanvas);
        fitToSafeZone(initCanvas); 

        return () => initCanvas.dispose();
    }, [fabricLoaded, fitToSafeZone]);

    useEffect(() => {
        if (!canvas) return;
        const isSelectTool = tool === 'select';
        const isEraser = tool === 'eraser';

        canvas.isDrawingMode = ['pen', 'highlight'].includes(tool);
        canvas.selection = isSelectTool;

        if (canvas.isDrawingMode) {
            canvas.freeDrawingBrush = new window.fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.color = tool === 'highlight' ? color + '80' : color;
            canvas.freeDrawingBrush.width = tool === 'highlight' ? strokeWidth * 4 : strokeWidth;
        }
        canvas.defaultCursor = isEraser ? 'crosshair' : 'default';

        canvas.getObjects().forEach(obj => {
            if (obj.excludeFromExport) return;
            obj.set({ selectable: isSelectTool, evented: isSelectTool || isEraser });
        });
        if (!isSelectTool) canvas.discardActiveObject();
        canvas.renderAll();
    }, [tool, canvas, color, strokeWidth]);

    useEffect(() => {
        if (!canvas) return;
        const syncUI = () => {
            const obj = canvas.getActiveObject();
            if (!obj) { setHasActiveObject(false); return; }
            setHasActiveObject(true);

            if (obj.type === 'i-text') {
                setColor(obj.fill); setFontFamily(obj.fontFamily); setFontSize(obj.fontSize);
            } else if (['rect', 'pill', 'path', 'line'].includes(obj.type)) {
                if (obj.type !== 'path' && obj.type !== 'line') {
                    const isFill = obj.fill && obj.fill !== 'transparent';
                    setFillType(isFill ? 'fill' : 'stroke');
                    setColor(isFill ? obj.fill : obj.stroke);
                } else {
                    setColor(obj.stroke); setFillType('stroke');
                }
                setStrokeWidth(Math.round(obj.strokeWidth) || 4);
            }
        };
        canvas.on('selection:created', syncUI);
        canvas.on('selection:updated', syncUI);
        canvas.on('selection:cleared', () => setHasActiveObject(false));
        return () => { canvas.off('selection:created', syncUI); canvas.off('selection:updated', syncUI); canvas.off('selection:cleared'); };
    }, [canvas]);

    useEffect(() => {
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (activeObj && !canvas.isDrawingMode && tool === 'select') {
            let changed = false;
            if (activeObj.type === 'i-text') {
                if (activeObj.fill !== color) { activeObj.set({ fill: color }); changed = true; }
                if (activeObj.fontSize !== fontSize) { activeObj.set({ fontSize }); changed = true; }
                if (activeObj.fontFamily !== fontFamily) { activeObj.set({ fontFamily }); changed = true; }
            } else if (['rect', 'pill', 'path', 'line'].includes(activeObj.type)) {
                const isPathLine = activeObj.type === 'path' || activeObj.type === 'line';
                const newFill = isPathLine ? null : (fillType === 'fill' ? color : 'transparent');

                if (activeObj.stroke !== color) { activeObj.set({ stroke: color }); changed = true; }
                if (activeObj.strokeWidth !== strokeWidth) { activeObj.set({ strokeWidth }); changed = true; }
                if (activeObj.fill !== newFill) { activeObj.set({ fill: newFill }); changed = true; }
            }
            if (changed) canvas.renderAll();
        }
    }, [color, strokeWidth, fillType, fontSize, fontFamily, canvas, tool]);

    const deleteSelectedObjects = useCallback(() => {
        if (!canvas) return;
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            const activeObj = canvas.getActiveObject();
            if (activeObj && activeObj.type === 'i-text' && activeObj.isEditing) return; 
            activeObjects.forEach(obj => canvas.remove(obj));
            canvas.discardActiveObject();
            canvas.renderAll();
        }
    }, [canvas]);

    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Delete' || e.key === 'Backspace') deleteSelectedObjects(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelectedObjects]);

    const undo = () => {
        if (!canvas || historyIndex <= 0) return;
        isHistoryAction.current = true;
        const prevIndex = historyIndex - 1;
        canvas.loadFromJSON(history[prevIndex], () => { canvas.renderAll(); setHistoryIndex(prevIndex); isHistoryAction.current = false; });
    };

    const redo = () => {
        if (!canvas || historyIndex >= history.length - 1) return;
        isHistoryAction.current = true;
        const nextIndex = historyIndex + 1;
        canvas.loadFromJSON(history[nextIndex], () => { canvas.renderAll(); setHistoryIndex(nextIndex); isHistoryAction.current = false; });
    };

    const saveHistoryManual = () => {
        if (!isHistoryAction.current) {
            const json = canvas.toJSON(['selectable', 'evented', 'strokeUniform', 'perPixelTargetFind']);
            setHistory(prev => [...prev.slice(0, historyIndex + 1), json]);
            setHistoryIndex(prev => prev + 1);
        }
    };

    const addShape = (type) => {
        if (!canvas) return;
        const center = canvas.getCenter();
        const options = { left: center.left - 50, top: center.top - 50, stroke: color, strokeWidth, fill: fillType === 'fill' ? color : 'transparent', cornerSize: 12, transparentCorners: false, strokeUniform: true, perPixelTargetFind: true };
        let shape = type === 'rect' ? new window.fabric.Rect({ ...options, width: 100, height: 100 }) : new window.fabric.Pill({ ...options, width: 100, height: 100 });
        canvas.add(shape); setTool('select'); canvas.setActiveObject(shape);
    };

    const addText = () => {
        if (!canvas) return;
        const center = canvas.getCenter();
        const text = new window.fabric.IText('Double tap to edit', { left: center.left - 100, top: center.top - 20, fontFamily, fontSize, fill: color, cornerSize: 12, transparentCorners: false, perPixelTargetFind: true });
        canvas.add(text); setTool('select'); canvas.setActiveObject(text);
    };

    const processImage = (type) => {
        if (!canvas || !pendingImage) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            window.fabric.Image.fromURL(f.target.result, (img) => {
                if (type === 'background') {
                    const state = layoutStateRef.current;
                    let pTop = 20, pBot = 20;
                    if (!state.isHidden) { pBot = 100; if (!state.isMerged) pTop = 100; }

                    const safeW = canvasContainerRef.current.clientWidth - 40;
                    const safeH = canvasContainerRef.current.clientHeight - pTop - pBot;
                    const cx = canvasContainerRef.current.clientWidth / 2;
                    const cy = pTop + safeH / 2;

                    const scale = Math.min(safeW / img.width, safeH / img.height);
                    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                        scaleX: scale, scaleY: scale,
                        originX: 'center', originY: 'center',
                        left: cx, top: cy
                    });
                    saveHistoryManual();
                } else {
                    img.scaleToWidth(Math.min(400, canvasContainerRef.current.clientWidth * 0.8));
                    img.set({ left: canvasContainerRef.current.clientWidth / 2 - img.getScaledWidth() / 2, top: canvasContainerRef.current.clientHeight / 2 - img.getScaledHeight() / 2, cornerSize: 12, transparentCorners: false, perPixelTargetFind: true });
                    canvas.add(img); setTool('select'); canvas.setActiveObject(img);
                }
            });
        };
        reader.readAsDataURL(pendingImage); setShowImageModal(false); setPendingImage(null);
    };

    useEffect(() => {
        if (!canvas) return;
        const handlePaste = (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (const item of items) if (item.type.indexOf('image') === 0) { setPendingImage(item.getAsFile()); setShowImageModal(true); }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [canvas]);

    useEffect(() => {
            if (!canvas || !data?.bgImage) return;
            
            window.fabric.Image.fromURL(data.bgImage, (img) => {
                const state = layoutStateRef.current;
                let pTop = 20, pBot = 20;
                if (!state.isHidden) { pBot = 100; if (!state.isMerged) pTop = 100; }

                const safeW = canvasContainerRef.current.clientWidth - 40;
                const safeH = canvasContainerRef.current.clientHeight - pTop - pBot;
                const cx = canvasContainerRef.current.clientWidth / 2;
                const cy = pTop + safeH / 2;

                const scale = Math.min(safeW / img.width, safeH / img.height);
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                    scaleX: scale, scaleY: scale,
                    originX: 'center', originY: 'center',
                    left: cx, top: cy
                });
                saveHistoryManual();
            });
        }, [canvas, data?.bgImage]);

    const clearCanvas = () => {
        if (!canvas) return;
        const objects = canvas.getObjects().filter(o => !o.excludeFromExport);
        objects.forEach(o => canvas.remove(o));
        canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
        saveHistoryManual();
    };

    const downloadCanvas = () => {
        if (!canvas) return;
        const bg = canvas.backgroundImage;
        const options = { format: 'png', quality: 1, multiplier: 2 };

        if (bg) {
            const bgW = bg.width * bg.scaleX;
            const bgH = bg.height * bg.scaleY;
            options.left = bg.left - bgW / 2;
            options.top = bg.top - bgH / 2;
            options.width = bgW;
            options.height = bgH;
        }

        const dataURL = canvas.toDataURL(options);
        const link = document.createElement('a');
        link.download = 'drawit-edited-' + Date.now() + '.png';
        link.href = dataURL;
        link.click();
    };

    const isTextSelected = hasActiveObject && canvas?.getActiveObject()?.type === 'i-text';

    const renderDrawingTools = () => (
        <>
            {[
                { id: 'select', icon: <Icon name="select" />, title: 'Select/Move' },
                { id: 'pen', icon: <Icon name="pen" />, title: 'Pen' },
                { id: 'line', icon: <Icon name="line" className="rotate-45" />, title: 'Straight Line' },
                { id: 'highlight', icon: <Icon name="highlight" />, title: 'Highlighter' },
                { id: 'eraser', icon: <Icon name="eraser" />, title: 'Eraser' }
            ].map((t) => (
                <button key={t.id} onClick={() => setTool(t.id)} title={t.title} className={'flex-shrink-0 p-2.5 rounded-xl transition-all ' + (tool === t.id ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-slate-100 text-slate-600')}>
                    {t.icon}
                </button>
            ))}
        </>
    );

    const renderHistoryTools = () => (
        <>
            <button onClick={undo} disabled={historyIndex <= 0} className="flex-shrink-0 p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent transition-all"><Icon name="undo" /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="flex-shrink-0 p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent transition-all"><Icon name="redo" /></button>
        </>
    );

    const renderShapes = () => (
        <>
            <button onClick={() => addShape('rect')} className="flex-shrink-0 p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-all"><Icon name="square" /></button>
            <button onClick={() => addShape('circle')} className="flex-shrink-0 p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-all"><Icon name="circle" /></button>
            <button onClick={addText} className="flex-shrink-0 p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-all"><Icon name="type" /></button>
        </>
    );

    const renderFileActions = () => (
        <>
            <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-all relative">
                <Icon name="image" />
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { setPendingImage(e.target.files[0]); setShowImageModal(true); e.target.value = ''; }} />
            </button>
            <button onClick={() => setShowGrid(!showGrid)} className={'flex-shrink-0 p-2.5 rounded-xl transition-all ' + (showGrid ? 'bg-slate-200 text-slate-800' : 'hover:bg-slate-100 text-slate-600')}><Icon name="grid" /></button>
            <Divider />
            <button onClick={downloadCanvas} className="flex-shrink-0 p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-all"><Icon name="download" /></button>
            <button onClick={clearCanvas} className="flex-shrink-0 p-2.5 rounded-xl hover:bg-red-50 text-red-500 transition-all"><Icon name="trash" /></button>
        </>
    );

    const renderProperties = () => (
        <>
            <div className="flex-shrink-0 flex items-center gap-2">
                <Icon name="palette" className="text-slate-500" size={16} />
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0" />
            </div>

            <div className="flex-shrink-0 flex items-center gap-2 min-w-[80px]">
                <span className="text-xs font-semibold text-slate-500">{isTextSelected ? 'Font Size' : 'Thickness'}</span>
                <input type="range"
                    min={isTextSelected ? "10" : "1"} max={isTextSelected ? "120" : "40"}
                    value={isTextSelected ? fontSize : strokeWidth}
                    onChange={(e) => { isTextSelected ? setFontSize(parseInt(e.target.value)) : setStrokeWidth(parseInt(e.target.value)); }}
                    className="w-24 accent-blue-600"
                />
            </div>

            <div className="flex-shrink-0 flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setFillType('stroke')} className={'px-2.5 py-1 text-xs font-semibold rounded-md transition-all ' + (fillType === 'stroke' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500')}>Stroke</button>
                <button onClick={() => setFillType('fill')} className={'px-2.5 py-1 text-xs font-semibold rounded-md transition-all ' + (fillType === 'fill' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500')}>Fill</button>
            </div>

            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="flex-shrink-0 text-xs p-1.5 border rounded-md bg-white text-slate-700 outline-none w-[100px] truncate">
                <option value="Arial">Arial</option><option value="Times New Roman">Times Roman</option><option value="Courier New">Courier</option><option value="Georgia">Georgia</option>
            </select>

            {hasActiveObject && (
                <>
                    <Divider />
                    <button onClick={deleteSelectedObjects} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold rounded-lg transition-all" title="Delete Selected">
                        <Icon name="trash" size={14} /> Delete
                    </button>
                </>
            )}
        </>
    );

    return (
        // NEW: Changed h-screen to h-full so it conforms to the CanvasOS Window Frame
        <div className="w-full h-full overflow-hidden relative bg-slate-50" ref={canvasContainerRef}>
            <div className={'absolute inset-0 pointer-events-none transition-opacity duration-300 ' + (showGrid ? 'opacity-100' : 'opacity-0')}
                style={{ backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0 }}
            />
            <div className="absolute inset-0 z-10 touch-none"><canvas id="draw-canvas" /></div>

            {isHidden && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
                    <button onClick={() => setIsHidden(false)} className="flex items-center gap-2 px-5 py-2.5 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-all">
                        <Icon name="eye" /> Show Tools
                    </button>
                </div>
            )}

            {!isHidden && !isMerged && (
                <div ref={topScrollRef} className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex flex-nowrap overflow-x-auto hide-scrollbar items-center gap-1.5 p-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 w-[95%] sm:w-auto max-w-full">
                    {renderDrawingTools()} <Divider />
                    {renderHistoryTools()} <Divider />
                    {renderShapes()} <Divider />
                    {renderFileActions()} <Divider />
                    <button onClick={() => setIsMerged(true)} className="flex-shrink-0 p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-all" title="Stick tools to bottom">
                        <Icon name="panelBottom" />
                    </button>
                </div>
            )}

            {!isHidden && (
                <div ref={bottomScrollRef} className={'absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex flex-nowrap overflow-x-auto hide-scrollbar items-center gap-3 p-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 ' + (isMerged ? 'w-[95%] max-w-full' : 'w-[95%] max-w-3xl')}>
                    {isMerged && (
                        <>
                            {renderDrawingTools()} <Divider />
                            {renderHistoryTools()} <Divider />
                            {renderShapes()} <Divider />
                            {renderFileActions()} <Divider />
                        </>
                    )}

                    {renderProperties()}

                    <Divider />

                    {isMerged && (
                        <button onClick={() => setIsMerged(false)} className="flex-shrink-0 p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-all" title="Unstick from bottom">
                            <Icon name="panelTop" />
                        </button>
                    )}

                    <button onClick={() => setIsHidden(true)} className="flex-shrink-0 p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-all" title="Hide all panels">
                        <Icon name="eyeOff" />
                    </button>
                </div>
            )}

            {showImageModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4">
                        <h3 className="text-lg font-bold text-slate-800 text-center">Import Image</h3>
                        <div className="flex flex-col gap-2 mt-2">
                            <button onClick={() => processImage('background')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                                Set as Base Layer <span className="text-blue-200 block text-xs font-normal">(Auto-fits to screen & crops on export)</span>
                            </button>
                            <button onClick={() => processImage('sticker')} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">
                                Add as Movable Sticker <span className="text-slate-500 block text-xs font-normal">(Free placement on canvas)</span>
                            </button>
                            <button onClick={() => { setShowImageModal(false); setPendingImage(null); }} className="w-full py-2 mt-2 text-slate-400 font-semibold hover:text-slate-600 transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

return DrawItApp;
`;