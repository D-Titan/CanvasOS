window.CanvasApps['Boards'] = `
const { useState, useEffect, useRef, useCallback, useMemo } = React;

// --- UTILS ---
const deepCloneWithValues = (sourceNode) => {
    const clone = sourceNode.cloneNode(true);
    const sourceInputs = sourceNode.querySelectorAll('input, textarea, select');
    const cloneInputs = clone.querySelectorAll('input, textarea, select');
    for (let i = 0; i < sourceInputs.length; i++) {
        if (sourceInputs[i].type === 'checkbox' || sourceInputs[i].type === 'radio') {
            cloneInputs[i].checked = sourceInputs[i].checked;
        } else {
            cloneInputs[i].value = sourceInputs[i].value;
        }
    }
    return clone;
};

// --- ICONS ---
const Icons = {
    Boards: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" className="text-indigo-500"/><path d="M8 7v7" className="text-indigo-500"/><path d="M12 7v4" className="text-indigo-500"/><path d="M16 7v9" className="text-indigo-500"/></svg>,
    Close: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
    Theme: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>,
    Trash: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
    Download: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
    ArrowLeft: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
    ChevronLeft: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>,
    ChevronRight: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>,
    Link: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    Info: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
    Plus: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    ZoomIn: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
    ZoomOut: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
    Upload: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
};

const BOARD_TEMPLATES = {
    kanban: { title: "Kanban Board", desc: "Manage workflow with columns.", defaultData: { type: 'kanban', columns: [{title: 'To Do', items: []}, {title: 'In Progress', items: []}, {title: 'Done', items: []}] } },
    swot: { title: "SWOT Analysis", desc: "Strengths, Weaknesses, Opportunities, Threats.", defaultData: { type: 'grid', grid: [{title: 'Strengths', content: '1. ', color: 'bg-green-50 dark:bg-green-900/20'}, {title: 'Weaknesses', content: '1. ', color: 'bg-red-50 dark:bg-red-900/20'}, {title: 'Opportunities', content: '1. ', color: 'bg-blue-50 dark:bg-blue-900/20'}, {title: 'Threats', content: '1. ', color: 'bg-amber-50 dark:bg-amber-900/20'}] } },
    eisenhower: { title: "Eisenhower Matrix", desc: "Urgent vs Important task prioritization.", defaultData: { type: 'grid', grid: [{title: 'Urgent & Important', content: '1. ', color: 'bg-red-50 dark:bg-red-900/20'}, {title: 'Not Urgent & Important', content: '1. ', color: 'bg-blue-50 dark:bg-blue-900/20'}, {title: 'Urgent & Not Important', content: '1. ', color: 'bg-amber-50 dark:bg-amber-900/20'}, {title: 'Not Urgent & Not Important', content: '1. ', color: 'bg-green-50 dark:bg-green-900/20'}] } },
    mindmap: { title: "Mind Map", desc: "Visual idea structuring.", defaultData: { type: 'graph', nodes: [{ id: 'root', x: 300, y: 200, text: 'Central Idea', color: 'bg-white' }], edges: [] } },
    sipoc: { title: "SIPOC Diagram", desc: "Suppliers, Inputs, Process, Outputs, Customers.", defaultData: { type: 'table', columns: ['Suppliers', 'Inputs', 'Process', 'Outputs', 'Customers'], rows: [['', '', '', '', '']] } },
    rule10: { title: "10-10-10 Rule", desc: "Decisions in 10 min, 10 months, 10 years.", defaultData: { type: 'grid', cols: 3, grid: [{title: '10 Minutes', content: '1. ', color: 'bg-slate-50'}, {title: '10 Months', content: '1. ', color: 'bg-slate-50'}, {title: '10 Years', content: '1. ', color: 'bg-slate-50'}] } },
    scrum: { title: "Scrum Board", desc: "Sprint backlog and tracking.", defaultData: { type: 'kanban', columns: [{title: 'Backlog', items: []}, {title: 'Sprint', items: []}, {title: 'In Progress', items: []}, {title: 'Testing', items: []}, {title: 'Done', items: []}] } },
    pert: { title: "PERT Chart", desc: "Program Evaluation and Review Technique node map.", defaultData: { type: 'graph', subType: 'pert', nodes: [{ id: 'start', x: 100, y: 200, text: 'Start', color: 'bg-green-100' }, { id: 'end', x: 500, y: 200, text: 'End', color: 'bg-red-100' }], edges: [] } },
    risk: { title: "Risk Matrix", desc: "Likelihood vs Impact Assessment.", defaultData: { type: 'risk', cells: Array(25).fill('') } },
};

const INSTRUCTIONS = {
    kanban: "Drag cards between columns. Use arrows on mobile. Click title to edit.",
    scrum: "Agile workflow. Edit titles, drag cards, add columns via hover.",
    swot: "Analyze Strengths, Weaknesses, Opportunities, and Threats. Auto-numbered lists.",
    eisenhower: "Prioritize based on Urgency and Importance. Auto-numbered lists.",
    mindmap: "Double click background to add nodes. Tap/Click a node to reveal connection port. Drag port to connect. Select edge/node and press 'Delete' or use toolbar to remove.",
    pert: "Network diagram. Tap/Click node to reveal connection port. Drag port to connect. Select edge to edit value.",
    sipoc: "Table for process mapping. Click 'Generate Flow' to see a visual chart of the Process column.",
    risk: "Visualise risk (Impact vs Likelihood). Click cells to add risks.",
    rule10: "Decision making framework: 10 minutes, 10 months, 10 years.",
};

// Converted to pure standard string concatenation
const APP_STYLES = 
    ".prod-board-app { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; } " +
    ".prod-board-app .bg-grid-pattern { background-image: linear-gradient(to right, rgba(148, 163, 184, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.15) 1px, transparent 1px); background-size: 24px 24px; } " +
    "@media screen and (max-width: 767px) { .prod-board-app input, .prod-board-app select, .prod-board-app textarea, .prod-board-app .editable-div { font-size: 16px !important; } } " +
    ".prod-board-app .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } " +
    ".prod-board-app .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } " +
    ".prod-board-app .custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; } " +
    ".dark .prod-board-app .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; } " +
    ".prod-board-app .editable-div:empty:before { content: attr(placeholder); color: rgba(156, 163, 175, 0.8); pointer-events: none; display: block; }";

const InfoButton = ({ text }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative z-50">
            <button onClick={() => setShow(!show)} className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-500 hover:bg-slate-300 shadow-md transition-colors border border-slate-300 dark:border-slate-600">
                <Icons.Info className="w-5 h-5" />
            </button>
            {show && (
                <div className="absolute bottom-12 left-0 w-72 bg-slate-800 text-white text-sm p-4 rounded-xl shadow-2xl z-50 border border-slate-700">
                    {text}
                    <button onClick={() => setShow(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white">×</button>
                </div>
            )}
        </div>
    );
};

const EditableDiv = ({ value, onChange, className, placeholder, minHeight }) => {
    const divRef = useRef(null);
    useEffect(() => {
        if (divRef.current && divRef.current.innerText !== value) {
            divRef.current.innerText = value;
        }
    }, [value]);
    const handleInput = (e) => onChange({ target: { value: e.target.innerText }});
    return (
        <div 
            ref={divRef} 
            contentEditable 
            onInput={handleInput} 
            onMouseDown={e => e.stopPropagation()} 
            className={"editable-div outline-none whitespace-pre-wrap " + className} 
            style={{ minHeight: minHeight ? (minHeight + 'px') : 'auto' }} 
            placeholder={placeholder} 
        />
    );
};

// --- GRAPH EDITOR ---
const GraphEditor = ({ data, onUpdate }) => {
    const [nodes, setNodes] = useState(data.nodes || []);
    const [edges, setEdges] = useState(data.edges || []);
    const [selected, setSelected] = useState(new Set());
    const [selectedEdge, setSelectedEdge] = useState(null);
    const [interaction, setInteraction] = useState(null); 
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);
    
    const hasSelection = selected.size > 0 || selectedEdge !== null;

    useEffect(() => { onUpdate({ nodes, edges }); }, [nodes, edges]);

    const deleteSelected = useCallback(() => {
        if (selectedEdge !== null) { 
            setEdges(es => es.filter((_, i) => i !== selectedEdge)); 
            setSelectedEdge(null); 
        }
        if (selected.size > 0) { 
            setNodes(ns => ns.filter(n => !selected.has(n.id))); 
            setEdges(es => es.filter(e => !selected.has(e.from) && !selected.has(e.to))); 
            setSelected(new Set()); 
        }
    }, [selected, selectedEdge]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                 deleteSelected();
            }
        };
        window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelected]);

    const getMousePos = (e) => { 
        const rect = containerRef.current.getBoundingClientRect(); 
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX; clientY = e.clientY;
        }
        return { x: (clientX - rect.left - pan.x) / scale, y: (clientY - rect.top - pan.y) / scale }; 
    };
    const handleWheel = (e) => { if (e.ctrlKey || e.metaKey || !e.shiftKey) { const s = Math.min(Math.max(0.2, scale - e.deltaY * 0.001), 3); setScale(s); } };
    
    const handleMouseDown = (e, targetType, targetId) => {
        e.stopPropagation();
        if (e.code === 'Space' || (targetType === 'bg' && e.button === 1) || (e.touches && e.touches.length === 2)) { 
            const clientX = e.touches ? e.touches[0].clientX : e.clientX; 
            const clientY = e.touches ? e.touches[0].clientY : e.clientY; 
            setInteraction({ type: 'pan', startX: clientX, startY: clientY, initX: pan.x, initY: pan.y }); 
            return; 
        }
        const { x, y } = getMousePos(e);
        if (targetType === 'bg') {
            if (!e.shiftKey) setSelected(new Set()); setSelectedEdge(null); setInteraction({ type: 'box', startX: x, startY: y, currX: x, currY: y });
        } else if (targetType === 'node') {
            setSelectedEdge(null); const newSelected = new Set(selected);
            if (e.shiftKey) { if (newSelected.has(targetId)) newSelected.delete(targetId); else newSelected.add(targetId); } else { if (!newSelected.has(targetId)) { newSelected.clear(); newSelected.add(targetId); } }
            setSelected(newSelected); setInteraction({ type: 'drag', startX: x, startY: y, nodeIds: Array.from(newSelected.size ? newSelected : [targetId]) });
        } else if (targetType === 'port') { setInteraction({ type: 'connect', from: targetId, startX: x, startY: y, currX: x, currY: y }); }
    };
    
    const handleMouseMove = (e) => {
        if (!interaction) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX; 
        const clientY = e.touches ? e.touches[0].clientY : e.clientY; 

        if (interaction.type === 'pan') { setPan({ x: interaction.initX + (clientX - interaction.startX), y: interaction.initY + (clientY - interaction.startY) }); return; }
        const { x, y } = getMousePos(e);
        if (interaction.type === 'drag') {
            const dx = x - interaction.startX; const dy = y - interaction.startY;
            setNodes(nodes.map(n => interaction.nodeIds.includes(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n));
            setInteraction({ ...interaction, startX: x, startY: y });
        } else if (interaction.type === 'box') {
            setInteraction({ ...interaction, currX: x, currY: y });
            const x1 = Math.min(interaction.startX, x); const x2 = Math.max(interaction.startX, x); const y1 = Math.min(interaction.startY, y); const y2 = Math.max(interaction.startY, y);
            const newSelection = new Set(); nodes.forEach(n => { if (n.x + 80 > x1 && n.x < x2 && n.y + 30 > y1 && n.y < y2) newSelection.add(n.id); });
            setSelected(newSelection);
        } else if (interaction.type === 'connect') { setInteraction({ ...interaction, currX: x, currY: y }); }
    };
    
    const handleMouseUp = (e) => {
        if (interaction?.type === 'connect') {
            const { x: ex, y: ey } = getMousePos(e);
            const target = nodes.find(n => ex >= n.x && ex <= n.x + 150 && ey >= n.y && ey <= n.y + 100);
            if (target && target.id !== interaction.from) { setEdges([...edges, { from: interaction.from, to: target.id, text: '' }]); }
        }
        setInteraction(null);
    };
    
    const addNode = (e) => { 
        const { x, y } = getMousePos(e); 
        const newNode = { id: Math.random().toString(36).substr(2, 9), x: x - 64, y: y - 20, text: 'New Node', color: 'bg-white' }; 
        setNodes([...nodes, newNode]); 
    };

    return (
        <div className="w-full h-full relative overflow-hidden bg-slate-50 dark:bg-slate-900 select-none bg-grid-pattern">
             <div className="absolute top-2 left-2 z-20 flex gap-2"> 
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded px-2 py-1 text-xs font-mono border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 pointer-events-none"> Zoom: {Math.round(scale * 100)}% </div> 
                {hasSelection && (
                    <button onClick={deleteSelected} className="bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1 text-xs shadow-sm flex items-center gap-1">
                        <Icons.Trash className="w-3.5 h-3.5" /> Delete
                    </button>
                )}
             </div>
             
            <div ref={containerRef} className="w-full h-full cursor-crosshair touch-none" onWheel={handleWheel} onMouseDown={(e) => handleMouseDown(e, 'bg')} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onDoubleClick={addNode} onTouchStart={(e) => handleMouseDown(e, 'bg')} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}>
                <div className="capture-target" style={{ transform: "translate(" + pan.x + "px, " + pan.y + "px) scale(" + scale + ")", transformOrigin: '0 0', width: '100%', height: '100%' }}>
                    <svg className="absolute inset-0 overflow-visible pointer-events-none" style={{ width: '5000px', height: '5000px' }}>
                        {edges.map((edge, i) => {
                            const from = nodes.find(n => n.id === edge.from); const to = nodes.find(n => n.id === edge.to); if (!from || !to) return null;
                            const midX = (from.x + 64 + to.x + 64) / 2; const midY = (from.y + 24 + to.y + 24) / 2;
                            return (
                                <g key={i} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedEdge(i); }} onTouchStart={(e) => { e.stopPropagation(); setSelectedEdge(i); }}>
                                    <line x1={from.x + 64} y1={from.y + 24} x2={to.x + 64} y2={to.y + 24} stroke="transparent" strokeWidth="20" />
                                    <line x1={from.x + 64} y1={from.y + 24} x2={to.x + 64} y2={to.y + 24} stroke={selectedEdge === i ? "#f97316" : "#94a3b8"} strokeWidth="2" />
                                    {(data.subType === 'pert') && ( <foreignObject x={midX - 45} y={midY - 40} width="90" height="30"> <input className="w-full h-full font-bold text-center bg-transparent border-none pointer-events-auto focus:outline-none dark:text-white drop-shadow-md text-sm" style={{ textShadow: '0px 1px 2px rgba(255,255,255,0.8)' }} placeholder="Value" value={edge.text || ''} onChange={(e) => { const newEdges = [...edges]; newEdges[i].text = e.target.value; setEdges(newEdges); }} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} /> </foreignObject> )}
                                </g>
                            );
                        })}
                        {interaction?.type === 'connect' && ( <line x1={nodes.find(n=>n.id===interaction.from).x+130} y1={nodes.find(n=>n.id===interaction.from).y+24} x2={interaction.currX} y2={interaction.currY} stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" /> )}
                    </svg>
                    {nodes.map(node => {
                        const isSelected = selected.has(node.id);
                        return (
                        <div key={node.id} className={"absolute w-32 p-2 rounded-lg shadow-md border-2 cursor-move group " + node.color + " dark:bg-slate-800 text-slate-800 " + (isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-300 dark:border-slate-600")} style={{ left: node.x, top: node.y }} onMouseDown={(e) => handleMouseDown(e, 'node', node.id)} onTouchStart={(e) => handleMouseDown(e, 'node', node.id)}>
                            <EditableDiv className="w-full text-center bg-transparent focus:outline-none text-sm font-medium text-slate-700 dark:text-slate-200 resize-none overflow-hidden" value={node.text} onChange={e => setNodes(nodes.map(n => n.id === node.id ? { ...n, text: e.target.value } : n))} minHeight={24} />
                            
                            {/* Connection Port - visible on hover OR when selected (for touch) */}
                            <div className={"absolute top-1/2 -right-3 -translate-y-1/2 w-5 h-5 bg-slate-400 hover:bg-blue-500 rounded-full cursor-crosshair shadow-sm border-2 border-white dark:border-slate-800 z-20 flex items-center justify-center transition-opacity " + (isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} onMouseDown={(e) => handleMouseDown(e, 'port', node.id)} onTouchStart={(e) => handleMouseDown(e, 'port', node.id)} title="Drag to connect"> 
                                <Icons.Link className="w-3 h-3 text-white" /> 
                            </div>
                            
                            {/* Color Pickers - visible on hover OR when selected (for touch) */}
                            <div className={"absolute -bottom-6 left-0 right-0 flex justify-center gap-1.5 z-10 transition-opacity " + (isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}> 
                                {['bg-red-100', 'bg-green-100', 'bg-blue-100', 'bg-white'].map(c => ( 
                                    <button key={c} onClick={(e)=> {e.stopPropagation(); setNodes(nodes.map(n=>n.id===node.id?{...n, color:c}:n));}} onTouchEnd={(e)=> {e.stopPropagation(); setNodes(nodes.map(n=>n.id===node.id?{...n, color:c}:n));}} className={"w-4 h-4 rounded-full border border-black/10 shadow-sm " + c}/> 
                                ))} 
                            </div>
                        </div>
                    )})}
                    {interaction?.type === 'box' && ( <div className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none" style={{ left: Math.min(interaction.startX, interaction.currX), top: Math.min(interaction.startY, interaction.currY), width: Math.abs(interaction.currX - interaction.startX), height: Math.abs(interaction.currY - interaction.startY) }} /> )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN BOARD APP CONTENT ---
const BoardApp = ({ data, onUpdate }) => {
    const [boardData, setBoardData] = useState(data.data || {});
    const [sipocFlow, setSipocFlow] = useState(false);
    const [dragItem, setDragItem] = useState(null); 
    const [zoomLevel, setZoomLevel] = useState(1);
    
    useEffect(() => { onUpdate({ data: boardData }); }, [boardData]);
    
    const handleGridChange = (idx, val) => { const lines = val.split('\\n'); if (val.endsWith('\\n') && val.length > (boardData.grid[idx].content || '').length) { const count = lines.length; val += count + '. '; } const newGrid = [...boardData.grid]; newGrid[idx].content = val; setBoardData({...boardData, grid: newGrid}); };
    
    // Native DnD for Desktop
    const onDragStart = (e, colIdx, itemIdx) => { setDragItem({ colIdx, itemIdx }); e.dataTransfer.effectAllowed = "move"; };
    const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
    const onDrop = (e, targetColIdx) => { e.preventDefault(); if (!dragItem) return; if (dragItem.colIdx === targetColIdx) return; const newCols = [...boardData.columns]; const item = newCols[dragItem.colIdx].items[dragItem.itemIdx]; newCols[dragItem.colIdx].items.splice(dragItem.itemIdx, 1); newCols[targetColIdx].items.push(item); setBoardData({...boardData, columns: newCols}); setDragItem(null); };
    
    // Touch Fallback for Kanban
    const moveCardMobile = (colIdx, itemIdx, dir) => {
        const newCols = [...boardData.columns];
        const item = newCols[colIdx].items.splice(itemIdx, 1)[0];
        newCols[colIdx + dir].items.push(item);
        setBoardData({ ...boardData, columns: newCols });
    };

    const addColumn = (idx) => { const newCols = [...boardData.columns]; newCols.splice(idx, 0, { title: 'New Column', items: [] }); setBoardData({...boardData, columns: newCols}); };
    
    const ZoomControls = () => (
        <div className="absolute top-2 right-2 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-lg shadow p-1 flex items-center gap-1 border border-slate-200 dark:border-slate-700 hidden md:flex" onPointerDown={e => e.stopPropagation()}>
             <button onClick={() => setZoomLevel(z => Math.max(0.2, z - 0.1))} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><Icons.ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
             <span className="text-xs font-mono w-8 text-center text-slate-600 dark:text-slate-300">{Math.round(zoomLevel * 100)}%</span>
             <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.1))} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><Icons.ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
        </div>
    );

    const renderBoard = () => {
        switch (boardData.type) {
            case 'kanban':
                return (
                    <>
                        <ZoomControls />
                        <div className="w-full h-full overflow-x-auto overflow-y-hidden bg-slate-100 dark:bg-slate-950 p-4 relative flex items-start custom-scrollbar bg-grid-pattern">
                            <div className="flex items-start gap-3 h-full capture-target min-w-max pb-4" style={{ zoom: zoomLevel }}>
                                <div className="h-full pt-2 group/gap w-6 flex justify-center shrink-0"> <button onClick={() => addColumn(0)} className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/gap:opacity-100 text-slate-500 shadow-sm" title="Add Column"> <Icons.Plus className="w-4 h-4" /> </button> </div>
                                {boardData.columns.map((col, cIdx) => (
                                    <React.Fragment key={cIdx}>
                                        <div className="relative w-72 flex-shrink-0 bg-slate-200 dark:bg-slate-900 rounded-2xl p-3 max-h-full flex flex-col shadow-sm group/col border border-slate-300/50 dark:border-slate-700/50" onDragOver={onDragOver} onDrop={(e) => onDrop(e, cIdx)}>
                                            <div className="font-bold text-slate-700 dark:text-slate-200 px-2 py-2 flex justify-between items-center"> <input className="bg-transparent font-bold focus:bg-white dark:focus:bg-slate-800 focus:outline-none rounded px-1 w-full mr-2 dark:text-white" value={col.title} onChange={(e) => { const newCols = [...boardData.columns]; newCols[cIdx].title = e.target.value; setBoardData({ ...boardData, columns: newCols }); }} /> <div className="flex items-center gap-1 z-10"> <span className="bg-slate-300 dark:bg-slate-800 text-xs px-2 py-0.5 rounded-full">{col.items.length}</span> <button onClick={() => { const newCols = [...boardData.columns]; newCols.splice(cIdx, 1); setBoardData({ ...boardData, columns: newCols }); }} className="text-slate-400 hover:text-red-500 md:opacity-0 group-hover/col:opacity-100 transition-opacity p-1"><Icons.Trash className="w-3.5 h-3.5"/></button> </div> </div>
                                            <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[50px] p-1 custom-scrollbar"> {col.items.map((item, iIdx) => ( 
                                                <div key={iIdx} draggable onDragStart={(e) => onDragStart(e, cIdx, iIdx)} className={"group " + (item.color || 'bg-white') + " dark:bg-slate-800 p-3 rounded-xl shadow-sm text-sm border border-transparent hover:border-blue-400 cursor-grab active:cursor-grabbing transition-all relative"}> 
                                                <EditableDiv className="w-full bg-transparent focus:outline-none text-slate-900 dark:text-white cursor-text" value={item.text} onChange={(e) => { const newCols = [...boardData.columns]; newCols[cIdx].items[iIdx].text = e.target.value; setBoardData({ ...boardData, columns: newCols }); }} /> 
                                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-black/5 dark:border-white/5 md:opacity-0 group-hover:opacity-100 transition-opacity"> 
                                                    <div className="flex gap-1 z-10"> {['bg-red-50', 'bg-blue-50', 'bg-green-50', 'bg-white'].map(c => ( <button key={c} onClick={() => { const newCols = [...boardData.columns]; newCols[cIdx].items[iIdx].color = c; setBoardData({ ...boardData, columns: newCols }); }} className={"w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10 " + c} /> ))} </div> 
                                                    <div className="flex gap-1 z-10 items-center"> 
                                                        <div className="flex md:hidden mr-1 gap-1">
                                                            <button onClick={() => moveCardMobile(cIdx, iIdx, -1)} disabled={cIdx === 0} className="p-1 text-slate-500 disabled:opacity-30"><Icons.ChevronLeft className="w-4 h-4"/></button>
                                                            <button onClick={() => moveCardMobile(cIdx, iIdx, 1)} disabled={cIdx === boardData.columns.length - 1} className="p-1 text-slate-500 disabled:opacity-30"><Icons.ChevronRight className="w-4 h-4"/></button>
                                                        </div>
                                                        <button onClick={() => { 
                                                            const newCols = boardData.columns.map((col, idx) => {
                                                                if (idx !== cIdx) return col;
                                                                return { ...col, items: col.items.filter((_, itemIndex) => itemIndex !== iIdx) };
                                                            });
                                                            setBoardData({ ...boardData, columns: newCols }); 
                                                        }} className="text-slate-400 hover:text-red-500 p-1"><Icons.Trash className="w-3.5 h-3.5"/></button> 
                                                    </div> 
                                                </div> </div> ))} </div>
                                            <button onClick={() => { const newCols = [...boardData.columns]; newCols[cIdx].items.push({ text: "New Task", color: 'bg-white' }); setBoardData({ ...boardData, columns: newCols }); }} className="w-full py-2 mt-2 text-sm font-medium text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">+ Add Card</button>
                                        </div>
                                        <div className="h-full pt-2 group/gap w-6 flex justify-center shrink-0"> <button onClick={() => addColumn(cIdx + 1)} className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/gap:opacity-100 text-slate-500 shadow-sm" title="Add Column"> <Icons.Plus className="w-4 h-4" /> </button> </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </>
                );
            case 'grid': 
                return ( 
                    <>
                        <ZoomControls />
                        <div className="w-full h-full overflow-auto bg-slate-100 dark:bg-slate-950 p-6 bg-grid-pattern">
                            <div style={{ zoom: zoomLevel }}>
                                <div className={"grid gap-4 w-full capture-target min-w-[800px] " + (boardData.cols === 3 ? 'grid-cols-3' : 'grid-cols-2')}> 
                                    {boardData.grid.map((area, idx) => ( 
                                        <div key={idx} className={(area.color || 'bg-white') + " dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col shadow-sm transition-colors text-slate-900 dark:text-slate-100"}> 
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 text-lg flex items-center gap-2"> <span className="w-2.5 h-2.5 rounded-full bg-current opacity-50"></span> {area.title} </h3> 
                                            <EditableDiv 
                                                className="w-full bg-white/50 dark:bg-slate-900/50 border-0 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 dark:text-slate-200 text-base leading-relaxed" 
                                                value={area.content} 
                                                onChange={(e) => handleGridChange(idx, e.target.value)} 
                                                placeholder="Type here..." 
                                                minHeight={200}
                                            /> 
                                        </div> 
                                    ))} 
                                </div>
                            </div>
                        </div> 
                    </>
                );
            case 'risk': 
                 const likelihoods = ['Almost Certain', 'Likely', 'Possible', 'Unlikely', 'Rare'];
                 const impacts = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
                 const riskConfig = [ 
                    [{bg:'bg-amber-100 dark:bg-amber-900/40', bd:'border-amber-300 dark:border-amber-700'}, {bg:'bg-red-100 dark:bg-red-900/40', bd:'border-red-300 dark:border-red-700'}, {bg:'bg-red-200 dark:bg-red-800/50', bd:'border-red-400 dark:border-red-600'}, {bg:'bg-red-200 dark:bg-red-800/50', bd:'border-red-400 dark:border-red-600'}, {bg:'bg-red-300 dark:bg-red-700/60', bd:'border-red-500 dark:border-red-500'}], 
                    [{bg:'bg-amber-50 dark:bg-amber-900/20', bd:'border-amber-200 dark:border-amber-800'}, {bg:'bg-amber-100 dark:bg-amber-900/40', bd:'border-amber-300 dark:border-amber-700'}, {bg:'bg-red-100 dark:bg-red-900/40', bd:'border-red-300 dark:border-red-700'}, {bg:'bg-red-200 dark:bg-red-800/50', bd:'border-red-400 dark:border-red-600'}, {bg:'bg-red-200 dark:bg-red-800/50', bd:'border-red-400 dark:border-red-600'}], 
                    [{bg:'bg-yellow-50 dark:bg-yellow-900/20', bd:'border-yellow-200 dark:border-yellow-800'}, {bg:'bg-amber-50 dark:bg-amber-900/20', bd:'border-amber-200 dark:border-amber-800'}, {bg:'bg-amber-100 dark:bg-amber-900/40', bd:'border-amber-300 dark:border-amber-700'}, {bg:'bg-red-100 dark:bg-red-900/40', bd:'border-red-300 dark:border-red-700'}, {bg:'bg-red-200 dark:bg-red-800/50', bd:'border-red-400 dark:border-red-600'}], 
                    [{bg:'bg-green-50 dark:bg-green-900/20', bd:'border-green-200 dark:border-green-800'}, {bg:'bg-yellow-50 dark:bg-yellow-900/20', bd:'border-yellow-200 dark:border-yellow-800'}, {bg:'bg-amber-50 dark:bg-amber-900/20', bd:'border-amber-200 dark:border-amber-800'}, {bg:'bg-amber-100 dark:bg-amber-900/40', bd:'border-amber-300 dark:border-amber-700'}, {bg:'bg-red-100 dark:bg-red-900/40', bd:'border-red-300 dark:border-red-700'}], 
                    [{bg:'bg-green-100 dark:bg-green-900/40', bd:'border-green-300 dark:border-green-700'}, {bg:'bg-green-50 dark:bg-green-900/20', bd:'border-green-200 dark:border-green-800'}, {bg:'bg-yellow-50 dark:bg-yellow-900/20', bd:'border-yellow-200 dark:border-yellow-800'}, {bg:'bg-amber-50 dark:bg-amber-900/20', bd:'border-amber-200 dark:border-amber-800'}, {bg:'bg-amber-100 dark:bg-amber-900/40', bd:'border-amber-300 dark:border-amber-700'}] 
                 ];
                 return ( 
                    <>
                        <ZoomControls />
                        <div className="h-full w-full bg-slate-50 dark:bg-slate-900 p-6 flex flex-col overflow-auto bg-grid-pattern"> 
                            <div className="capture-target min-w-[900px]" style={{ zoom: zoomLevel }}>
                                <h3 className="text-2xl font-bold mb-6 text-center text-slate-800 dark:text-white">Risk Matrix</h3> 
                                <div className="grid grid-cols-[120px_repeat(5,_1fr)] gap-2 auto-rows-min">
                                    <div className="flex items-end justify-end p-2 font-bold text-slate-500 text-xs">Likelihood \\ Impact</div>
                                    {impacts.map(i => <div key={i} className="flex items-center justify-center p-2 font-bold text-slate-700 dark:text-slate-300 rounded-lg text-center">{i}</div>)}
                                    {likelihoods.map((l, rowIdx) => (
                                        <React.Fragment key={l}>
                                            <div className="flex items-center justify-end p-2 font-bold text-slate-700 dark:text-slate-300 rounded-lg text-right">{l}</div>
                                            {riskConfig[rowIdx].map((conf, colIdx) => {
                                                const flatIdx = rowIdx * 5 + colIdx; 
                                                const cellData = boardData.cells ? boardData.cells[flatIdx] : '';
                                                return (
                                                    <div key={flatIdx} className={conf.bg + " border-2 " + conf.bd + " dark:bg-opacity-20 rounded-lg p-2 min-h-[100px] shadow-sm flex flex-col transition-colors"}>
                                                        <EditableDiv className="w-full bg-transparent p-1 text-sm font-medium placeholder-black/30 dark:placeholder-white/30 text-slate-900 dark:text-slate-100 focus:outline-none" placeholder="Add risk..." value={cellData} onChange={(e) => { const newCells = [...(boardData.cells || Array(25).fill(''))]; newCells[flatIdx] = e.target.value; setBoardData({...boardData, cells: newCells}); }} />
                                                    </div>
                                                )
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div> 
                    </>
                );
            case 'graph': return <GraphEditor data={boardData} onUpdate={(newData) => setBoardData({...boardData, ...newData})} />;
            case 'table': return ( 
                <>
                    <ZoomControls />
                    <div className="p-6 overflow-auto h-full bg-slate-50 dark:bg-slate-900 flex flex-col bg-grid-pattern"> 
                        <div className="capture-target min-w-max" style={{ zoom: zoomLevel }}>
                            <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm bg-white dark:bg-slate-800"> 
                                <thead> <tr> {boardData.columns.map((col, i) => <th key={i} className="border-b border-slate-200 dark:border-slate-700 p-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-semibold text-left uppercase text-sm">{col}</th>)} </tr> </thead> 
                                <tbody> {boardData.rows.map((row, rIdx) => ( <tr key={rIdx} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"> {row.map((cell, cIdx) => ( <td key={cIdx} className="border-b border-slate-100 dark:border-slate-800 p-2 min-w-[200px] align-top"> 
                                    <EditableDiv className="w-full p-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white rounded h-full text-sm leading-relaxed" value={cell} onChange={(e) => { const newRows = [...boardData.rows]; newRows[rIdx][cIdx] = e.target.value; setBoardData({...boardData, rows: newRows}); }} /> 
                                </td> ))} </tr> ))} </tbody> 
                            </table> 
                            <div className="flex gap-3 mt-6"> <button onClick={() => setBoardData({...boardData, rows: [...boardData.rows, Array(boardData.columns.length).fill('')]})} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1"><Icons.Plus className="w-4 h-4"/> Add Row</button> <button onClick={() => setSipocFlow(!sipocFlow)} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"> {sipocFlow ? 'Hide Flow' : 'Generate Flow'} </button> </div> {sipocFlow && ( <div className="mt-8 p-5 bg-white dark:bg-slate-800 rounded-xl shadow-inner border border-slate-100 dark:border-slate-700 overflow-x-auto min-w-max"> <h4 className="font-bold mb-4 text-slate-600 dark:text-slate-300">Process Flow</h4> <div className="flex items-center gap-4"> {boardData.rows.map((row, i) => row[2] && ( <div key={i} className="flex items-center gap-4"> <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-3 rounded-lg shadow-sm text-sm w-48 text-center text-slate-700 dark:text-slate-200 font-medium">{row[2]}</div> {i < boardData.rows.length - 1 && boardData.rows[i+1][2] && <div className="text-slate-400 font-bold">→</div>} </div> ))} </div> </div> )} 
                        </div>
                    </div> 
                </>
            );
            default: return <div>Unknown Board</div>;
        }
    };
    return ( <div className="h-full w-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col relative"> <div className="absolute bottom-6 left-6 z-10"> <InfoButton text={INSTRUCTIONS[boardData.subType] || "No instructions."} /> </div> {renderBoard()} </div> );
};

// --- WRAPPER WITH HEADER FOR EXPORT LOGIC ---
const BoardContainer = ({ board, onUpdate, onBack }) => {
    const contentRef = useRef(null);
    const downloadBtnRef = useRef(null);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showDownloadMenu && downloadBtnRef.current && !downloadBtnRef.current.contains(e.target)) setShowDownloadMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDownloadMenu]);

    const generateTextRepresentation = (boardData) => {
        let md = '# ' + (board.title || 'Board Export') + '\\n\\n';
        if (boardData.type === 'kanban') {
            boardData.columns.forEach(col => { md += '## ' + col.title + '\\n'; col.items.forEach(item => { md += '- ' + item.text.replace(/\\n/g, ' ') + '\\n'; }); md += '\\n'; });
        } else if (boardData.type === 'grid') {
            boardData.grid.forEach(area => { md += '## ' + area.title + '\\n' + area.content + '\\n\\n'; });
        } else if (boardData.type === 'table') {
            md += '| ' + boardData.columns.join(' | ') + ' |\\n| ' + boardData.columns.map(()=>'---').join(' | ') + ' |\\n';
            boardData.rows.forEach(row => { md += '| ' + row.map(c=>c.replace(/\\n/g,' ')).join(' | ') + ' |\\n'; });
        } else if (boardData.type === 'graph') {
            md += 'Nodes:\\n'; boardData.nodes.forEach(n => md += '- ' + n.text + '\\n');
        } else if (boardData.type === 'risk') {
             md += 'Risk Matrix Exported.\\n'; 
        }
        return md;
    };

    const downloadFile = async (format) => {
        setShowDownloadMenu(false);
        const fileName = board.title || ('board-' + Date.now());
        const innerData = board.data.data;
        
        if (format === 'copy') {
            const txt = generateTextRepresentation(innerData);
            navigator.clipboard.writeText(txt).then(()=>alert("Board copied as text!")).catch(()=>alert("Failed to copy."));
            return;
        }

        if (format === 'markdown') {
            const txt = generateTextRepresentation(innerData);
            const blob = new Blob([txt], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = fileName + '.md'; a.click(); URL.revokeObjectURL(url);
            return;
        }

        if (format === 'json') {
            const content = JSON.stringify({ type: 'board', subType: board.subType, data: innerData }, null, 2); 
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = fileName + '.json'; a.click(); URL.revokeObjectURL(url);
            return;
        }

        if (format === 'image') {
            if (!window.htmlToImage) {
                alert("Please wait a moment for the export library to load.");
                return;
            }
            try {
                let source = contentRef.current.querySelector('.capture-target');
                if (!source) source = contentRef.current; 

                const clone = deepCloneWithValues(source);
                const container = document.createElement('div');
                container.style.position = 'fixed'; container.style.top = '-10000px'; container.style.left = '-10000px'; container.style.zIndex = '-1';
                
                const isDark = document.documentElement.classList.contains('dark');
                container.style.background = isDark ? '#0f172a' : '#f8fafc';
                container.style.color = isDark ? '#f1f5f9' : '#0f172a';
                
                clone.style.transform = 'none'; clone.style.zoom = '1'; clone.style.width = 'auto'; clone.style.height = 'auto'; clone.style.overflow = 'visible';
                
                if (['kanban', 'scrum'].includes(board.subType)) { clone.style.width = 'max-content'; clone.style.padding = '30px'; } 
                else if (['grid', 'swot', 'eisenhower', 'rule10', 'risk'].includes(board.subType)) { clone.style.width = '1200px'; clone.style.padding = '40px'; } 
                else if (board.subType === 'table' || board.subType === 'sipoc') { clone.style.width = 'max-content'; clone.style.padding = '30px'; } 
                else if (['mindmap', 'pert'].includes(board.subType)) {
                    const nodes = innerData.nodes || [];
                    if (nodes.length > 0) {
                        const xs = nodes.map(n => n.x); const ys = nodes.map(n => n.y);
                        clone.style.width = (Math.max(...xs) + 300) + 'px'; clone.style.height = (Math.max(...ys) + 200) + 'px';
                    }
                }

                document.body.appendChild(container);
                container.appendChild(clone);
                
                await new Promise(resolve => setTimeout(resolve, 150));

                const dataUrl = await window.htmlToImage.toPng(clone, { 
                    pixelRatio: 2, 
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    style: { transform: 'none' }
                });
                
                document.body.removeChild(container);
                const link = document.createElement('a'); 
                link.download = fileName + '.png'; 
                link.href = dataUrl; 
                link.click();
            } catch (e) { alert("Image generation failed. " + e); }
        }
    };

    return (
        <div className="flex flex-col w-full h-full bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Header bar */}
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur shrink-0 shadow-sm z-50">
                <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <button onClick={onBack} className="p-2 md:p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-2 font-medium text-sm flex-shrink-0">
                        <Icons.ArrowLeft className="w-4 h-4"/><span className="hidden md:inline">Back</span>
                    </button>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Icons.Boards className="w-5 h-5 flex-shrink-0" />
                        <input className="bg-transparent focus:bg-slate-100 dark:focus:bg-slate-800 rounded px-2 py-1 min-w-0 w-full max-w-sm focus:outline-none text-lg font-bold text-slate-800 dark:text-slate-200 truncate transition-colors" value={board.title} onChange={(e) => onUpdate({ title: e.target.value })} />
                    </div>
                </div>

                <div className="relative flex-shrink-0 ml-2" ref={downloadBtnRef}>
                    <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                        <Icons.Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
                    </button>
                    
                    {showDownloadMenu && (
                        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-1 w-52 flex flex-col gap-1 z-[100] animate-slide-up origin-top-right">
                            <button onClick={() => downloadFile('json')} className="text-left px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 font-medium transition-colors">Save Board Data (.json)</button>
                            <button onClick={() => downloadFile('image')} className="text-left px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 font-medium transition-colors">Export to Image (.png)</button>
                            <button onClick={() => downloadFile('markdown')} className="text-left px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 font-medium transition-colors">Save as Markdown (.md)</button>
                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                            <button onClick={() => downloadFile('copy')} className="text-left px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 font-medium transition-colors">Copy Text to Clipboard</button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* App Content */}
            <div className="flex-1 overflow-hidden relative" ref={contentRef}>
                <BoardApp data={board.data} onUpdate={(newData) => onUpdate({ board: { ...board, data: { ...board.data, ...newData } } })} />
            </div>
        </div>
    );
};

// --- MAIN OS EXPORTED COMPONENT ---
const ProductivityBoards = ({ data, onUpdate, instanceId, title }) => {
    const fileInputRef = useRef(null);
    const currentBoard = data.board || null;

    // Inject html-to-image script for exports natively in the host environment
    useEffect(() => {
        if (!window.htmlToImage) {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
            document.head.appendChild(script);
        }
    }, []);

    useEffect(() => {
        if (data?.fileData && !data.board) {
            try {
                const parsed = JSON.parse(data.fileData);
                let subType = parsed.subType || 'kanban';
                let innerData = parsed.data || parsed; 
                
                // Infer subtype if missing from older JSON exports
                if (!parsed.subType) {
                    if (innerData.type === 'grid' && innerData.cols === 3) subType = 'rule10'; 
                    else if (innerData.type === 'grid' && innerData.grid && innerData.grid[0]?.title === 'Strengths') subType = 'swot'; 
                    else if (innerData.type === 'grid') subType = 'eisenhower'; 
                    else if (innerData.type === 'graph' && innerData.subType === 'pert') subType = 'pert'; 
                    else if (innerData.type === 'graph') subType = 'mindmap'; 
                    else if (innerData.type === 'table') subType = 'sipoc'; 
                    else if (innerData.type === 'kanban' && innerData.columns?.length === 5) subType = 'scrum'; 
                    else if (innerData.type === 'risk') subType = 'risk'; 
                }

                // Push the parsed file data up to the OS state immediately
                onUpdate({
                    board: {
                        id: Date.now().toString(),
                        title: title ? title.replace('.json', '') : 'Imported Board',
                        subType: subType,
                        data: { subType, data: innerData }
                    }
                });
            } catch (err) { 
                console.error("Failed to parse injected Board JSON:", err); 
            } 
        }
    }, [data?.fileData]);

    const createNewBoard = (key) => {
        const template = BOARD_TEMPLATES[key]; 
        const freshData = JSON.parse(JSON.stringify(template.defaultData)); 
        onUpdate({
            board: {
                id: Date.now().toString(),
                title: template.title,
                subType: key,
                data: { subType: key, data: freshData }
            }
        });
    };

    const handleImport = (e) => {
        const file = e.target.files[0]; 
        if (!file) return; 
        
        if (file.name.endsWith('.json')) { 
            const reader = new FileReader(); 
            reader.onload = (ev) => { 
                try { 
                    const parsed = JSON.parse(ev.target.result); 
                    let subType = parsed.subType || 'kanban';
                    let innerData = parsed.data || parsed; 
                    
                    if (!parsed.subType) {
                        if (innerData.type === 'grid' && innerData.cols === 3) subType = 'rule10'; 
                        else if (innerData.type === 'grid' && innerData.grid[0]?.title === 'Strengths') subType = 'swot'; 
                        else if (innerData.type === 'grid') subType = 'eisenhower'; 
                        else if (innerData.type === 'graph' && innerData.subType === 'pert') subType = 'pert'; 
                        else if (innerData.type === 'graph') subType = 'mindmap'; 
                        else if (innerData.type === 'table') subType = 'sipoc'; 
                        else if (innerData.type === 'kanban' && innerData.columns?.length === 5) subType = 'scrum'; 
                        else if (innerData.type === 'risk') subType = 'risk'; 
                    }

                    onUpdate({
                        board: {
                            id: Date.now().toString(),
                            title: file.name.replace('.json', ''),
                            subType: subType,
                            data: { subType, data: innerData }
                        }
                    });
                } catch (err) { alert('Invalid Board Data format.'); } 
            }; 
            reader.readAsText(file); 
        } else {
            alert('Please upload a .json board file.');
        }
        e.target.value = null; 
    };

    if (currentBoard) {
        return (
            <div className="prod-board-app">
                <style dangerouslySetInnerHTML={{ __html: APP_STYLES }} />
                <BoardContainer 
                    board={currentBoard} 
                    onUpdate={(updates) => onUpdate(updates)} 
                    onBack={() => onUpdate({ board: null })} 
                />
            </div>
        );
    }

    return (
        <div className="prod-board-app bg-slate-50 dark:bg-slate-900 transition-colors overflow-y-auto bg-grid-pattern relative">
            <style dangerouslySetInnerHTML={{ __html: APP_STYLES }} />
            <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={handleImport} />
            
            {/* Template Picker Header */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-8 max-w-6xl mx-auto gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <Icons.Boards className="w-7 h-7 text-indigo-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Productivity Boards</h1>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button onClick={() => fileInputRef.current.click()} className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:shadow-md transition-all text-center">
                        Import JSON Board
                    </button>
                    {/* OS handles Dark Mode. This provides an explicit internal toggle syncing with documentElement */}
                    <button onClick={() => document.documentElement.classList.toggle('dark')} className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
                        <Icons.Theme className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Template Grid */}
            <main className="p-6 sm:p-8 max-w-6xl mx-auto pb-20">
                <h2 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-6 uppercase tracking-wider text-sm">Create a New Board</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"> 
                    {Object.entries(BOARD_TEMPLATES).map(([key, tpl]) => ( 
                        <button key={key} onClick={() => createNewBoard(key)} className="flex flex-col gap-3 p-6 rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur shadow-sm hover:shadow-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all duration-300 text-left group hover:-translate-y-1"> 
                            <div className="flex items-center gap-4"> 
                                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-slate-900 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300 text-indigo-500 border border-indigo-100 dark:border-slate-800 group-hover:border-transparent"> 
                                    {key === 'kanban' || key === 'scrum' ? <Icons.Boards className="w-6 h-6"/> : key === 'mindmap' || key === 'pert' ? <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center"><div className="w-2.5 h-2.5 bg-current rounded-full"/></div> : <Icons.Boards className="w-6 h-6"/>} 
                                </div> 
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{tpl.title}</h3> 
                            </div> 
                            <p className="text-sm text-slate-500 dark:text-slate-400 pl-1 leading-relaxed">{tpl.desc}</p> 
                        </button> 
                    ))} 
                </div>
            </main>
        </div>
    );
};

return ProductivityBoards;
`;