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
    Boards: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" className="currentColor"/><path d="M8 7v7" className="currentColor"/><path d="M12 7v4" className="currentColor"/><path d="M16 7v9" className="currentColor"/></svg>,
    Close: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
    Theme: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>,
    Trash: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
    Download: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
    ArrowLeft: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
    ChevronLeft: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>,
    ChevronRight: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>,
    ChevronDown: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
    Link: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    Info: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
    Plus: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    ZoomIn: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
    ZoomOut: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
    Layers: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>,
    Upload: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    Check: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
    Pen: ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
};

const BOARD_TEMPLATES = {
    kanban: { title: "Kanban Board", desc: "Manage workflow and pipelines with customizable columns and groups.", defaultData: { type: 'kanban', useGroups: false, groups: [], columns: [{title: 'To Do', items: []}, {title: 'In Progress', items: []}, {title: 'Done', items: []}] } },
    swot: { title: "SWOT Analysis", desc: "Strategic planning to identify Strengths, Weaknesses, Opportunities, and Threats.", defaultData: { type: 'grid', grid: [{title: 'Strengths', content: '1. ', color: 'bg-green-50 dark:bg-green-900/20'}, {title: 'Weaknesses', content: '1. ', color: 'bg-red-50 dark:bg-red-900/20'}, {title: 'Opportunities', content: '1. ', color: 'bg-blue-50 dark:bg-blue-900/20'}, {title: 'Threats', content: '1. ', color: 'bg-amber-50 dark:bg-amber-900/20'}] } },
    eisenhower: { title: "Eisenhower Matrix", desc: "Prioritize your tasks based on their Urgency and Importance.", defaultData: { type: 'grid', grid: [{title: 'Urgent & Important', content: '1. ', color: 'bg-red-50 dark:bg-red-900/20'}, {title: 'Not Urgent & Important', content: '1. ', color: 'bg-blue-50 dark:bg-blue-900/20'}, {title: 'Urgent & Not Important', content: '1. ', color: 'bg-amber-50 dark:bg-amber-900/20'}, {title: 'Not Urgent & Not Important', content: '1. ', color: 'bg-green-50 dark:bg-green-900/20'}] } },
    mindmap: { title: "Mind Map", desc: "A freeform visual space for structuring ideas and brainstorming connections.", defaultData: { type: 'graph', nodes: [{ id: 'root', x: 300, y: 200, text: 'Central Idea', color: 'bg-white' }], edges: [] } },
    sipoc: { title: "SIPOC Diagram", desc: "Document process mapping via Suppliers, Inputs, Process, Outputs, Customers.", defaultData: { type: 'table', columns: ['Suppliers', 'Inputs', 'Process', 'Outputs', 'Customers'], rows: [['', '', '', '', '']] } },
    rule10: { title: "10-10-10 Rule", desc: "Evaluate decisions in the timeframe of 10 minutes, 10 months, and 10 years.", defaultData: { type: 'grid', cols: 3, grid: [{title: '10 Minutes', content: '1. ', color: 'bg-slate-50 dark:bg-zinc-800'}, {title: '10 Months', content: '1. ', color: 'bg-slate-50 dark:bg-zinc-800'}, {title: '10 Years', content: '1. ', color: 'bg-slate-50 dark:bg-zinc-800'}] } },
    scrum: { title: "Scrum Board", desc: "Agile framework board supporting sprint pipelines and feature swimlanes.", defaultData: { type: 'kanban', useGroups: true, groups: [{ id: 'g1', title: 'Sprint 1 / Feature A', color: 'bg-indigo-400' }], columns: [{title: 'Backlog', items: []}, {title: 'Sprint', items: []}, {title: 'In Progress', items: []}, {title: 'Testing', items: []}, {title: 'Done', items: []}] } },
    pert: { title: "PERT Chart", desc: "Program Evaluation and Review Technique. Map logic diagrams easily.", defaultData: { type: 'graph', subType: 'pert', nodes: [{ id: 'start', x: 100, y: 200, text: 'Start', color: 'bg-green-100' }, { id: 'end', x: 500, y: 200, text: 'End', color: 'bg-red-100' }], edges: [] } },
    risk: { title: "Risk Matrix", desc: "Assess severity against probability with an automated visual impact heat map.", defaultData: { type: 'risk', cells: Array(25).fill('') } },
};

const GROUP_COLORS = ['bg-rose-400', 'bg-indigo-400', 'bg-emerald-400', 'bg-amber-400'];

const TASK_COLORS = [
    'bg-rose-50 dark:bg-zinc-700',
    'bg-blue-50 dark:bg-zinc-800',
    'bg-emerald-50 dark:bg-zinc-900',
    'bg-amber-50 dark:bg-neutral-800',
    'bg-white dark:bg-zinc-950'
];

const INSTRUCTIONS = {
    kanban: "Drag cards between columns. Edit tasks only in the first column. Click the Check/Pen icon to save. Toggle groups for swimlanes.",
    scrum: "Agile workflow. Edit text in the first column, drag cards, add columns via hover. Toggle groups to separate features.",
    swot: "Analyze Strengths, Weaknesses, Opportunities, and Threats. Auto-numbered lists.",
    eisenhower: "Prioritize based on Urgency and Importance. Auto-numbered lists.",
    mindmap: "Double click background to add nodes. Tap/Click a node to reveal connection port. Drag port to connect.",
    pert: "Network diagram. Tap/Click node to reveal connection port. Drag port to connect. Select edge to edit value.",
    sipoc: "Table for process mapping. Click 'Generate Flow' to see a visual chart of the Process column.",
    risk: "Visualise risk (Impact vs Likelihood). Click cells to add risks.",
    rule10: "Decision making framework: 10 minutes, 10 months, 10 years.",
};

const APP_STYLES = 
    ".prod-board-app { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; font-family: 'Inter', sans-serif; } " +
    ".prod-board-app .bg-grid-pattern { background-image: linear-gradient(to right, rgba(148, 163, 184, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.15) 1px, transparent 1px); background-size: 24px 24px; } " +
    "@media screen and (max-width: 767px) { .prod-board-app input, .prod-board-app select, .prod-board-app textarea, .prod-board-app .editable-div { font-size: 16px !important; } } " +
    ".prod-board-app .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } " +
    ".prod-board-app .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } " +
    ".prod-board-app .custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; } " +
    ".dark .prod-board-app .custom-scrollbar::-webkit-scrollbar-thumb { background: #52525b; } " +
    ".prod-board-app .editable-div:empty:before { content: attr(placeholder); color: rgba(156, 163, 175, 0.8); pointer-events: none; display: block; }";

const InfoButton = ({ text }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative z-50">
            <button onClick={() => setShow(!show)} className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-slate-500 hover:text-indigo-500 hover:bg-slate-50 shadow-md transition-colors border border-slate-200 dark:border-zinc-700">
                <Icons.Info className="w-5 h-5" />
            </button>
            {show && (
                <div className="absolute bottom-12 left-0 w-72 bg-zinc-800 text-white text-sm p-4 rounded-xl shadow-2xl z-50 border border-zinc-700">
                    {text}
                    <button onClick={() => setShow(false)} className="absolute top-2 right-2 text-zinc-400 hover:text-white">×</button>
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
        if (selectedEdge !== null) { setEdges(es => es.filter((_, i) => i !== selectedEdge)); setSelectedEdge(null); }
        if (selected.size > 0) { setNodes(ns => ns.filter(n => !selected.has(n.id))); setEdges(es => es.filter(e => !selected.has(e.from) && !selected.has(e.to))); setSelected(new Set()); }
    }, [selected, selectedEdge]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
            if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
        };
        window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelected]);

    const getMousePos = (e) => { 
        const rect = containerRef.current.getBoundingClientRect(); 
        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left - pan.x) / scale, y: (clientY - rect.top - pan.y) / scale }; 
    };
    
    const handleWheel = (e) => { if (e.ctrlKey || e.metaKey || !e.shiftKey) { setScale(Math.min(Math.max(0.2, scale - e.deltaY * 0.001), 3)); } };
    
    const handleMouseDown = (e, targetType, targetId) => {
        e.stopPropagation();
        if (e.code === 'Space' || (targetType === 'bg' && e.button === 1) || (e.touches && e.touches.length === 2)) { 
            const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; 
            setInteraction({ type: 'pan', startX: cx, startY: cy, initX: pan.x, initY: pan.y }); return; 
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
        const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; 
        if (interaction.type === 'pan') { setPan({ x: interaction.initX + (cx - interaction.startX), y: interaction.initY + (cy - interaction.startY) }); return; }
        const { x, y } = getMousePos(e);
        if (interaction.type === 'drag') {
            const dx = x - interaction.startX; const dy = y - interaction.startY;
            setNodes(nodes.map(n => interaction.nodeIds.includes(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n));
            setInteraction({ ...interaction, startX: x, startY: y });
        } else if (interaction.type === 'box') {
            setInteraction({ ...interaction, currX: x, currY: y });
            const x1 = Math.min(interaction.startX, x); const x2 = Math.max(interaction.startX, x); const y1 = Math.min(interaction.startY, y); const y2 = Math.max(interaction.startY, y);
            const newSelection = new Set(); nodes.forEach(n => { if (n.x + 80 > x1 && n.x < x2 && n.y + 30 > y1 && n.y < y2) newSelection.add(n.id); }); setSelected(newSelection);
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
        setNodes([...nodes, { id: Math.random().toString(36).substr(2, 9), x: x - 64, y: y - 20, text: 'New Node', color: 'bg-white' }]); 
    };

    return (
        <div className="w-full h-full relative overflow-hidden bg-slate-50 dark:bg-zinc-900 select-none bg-grid-pattern">
             <div className="absolute top-2 left-2 z-20 flex gap-2"> 
                <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur rounded px-2 py-1 text-xs font-mono border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 pointer-events-none"> Zoom: {Math.round(scale * 100)}% </div> 
                {hasSelection && <button onClick={deleteSelected} className="bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1 text-xs shadow-sm flex items-center gap-1"><Icons.Trash className="w-3.5 h-3.5" /> Delete</button>}
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
                        <div key={node.id} className={"absolute w-32 p-2 rounded-lg shadow-md border-2 cursor-move group " + node.color + " dark:bg-zinc-800 text-slate-800 " + (isSelected ? "border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900" : "border-slate-300 dark:border-zinc-700")} style={{ left: node.x, top: node.y }} onMouseDown={(e) => handleMouseDown(e, 'node', node.id)} onTouchStart={(e) => handleMouseDown(e, 'node', node.id)}>
                            <EditableDiv className="w-full text-center bg-transparent focus:outline-none text-sm font-medium text-slate-700 dark:text-zinc-200 resize-none overflow-hidden" value={node.text} onChange={e => setNodes(nodes.map(n => n.id === node.id ? { ...n, text: e.target.value } : n))} minHeight={24} />
                            <div className={"absolute top-1/2 -right-3 -translate-y-1/2 w-5 h-5 bg-slate-400 hover:bg-indigo-500 rounded-full cursor-crosshair shadow-sm border-2 border-white dark:border-zinc-800 z-20 flex items-center justify-center transition-opacity " + (isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} onMouseDown={(e) => handleMouseDown(e, 'port', node.id)} onTouchStart={(e) => handleMouseDown(e, 'port', node.id)} title="Drag to connect"> <Icons.Link className="w-3 h-3 text-white" /> </div>
                            <div className={"absolute -bottom-6 left-0 right-0 flex justify-center gap-1.5 z-10 transition-opacity " + (isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}> 
                                {['bg-rose-100', 'bg-emerald-100', 'bg-indigo-100', 'bg-white'].map(c => ( <button key={c} onClick={(e)=> {e.stopPropagation(); setNodes(nodes.map(n=>n.id===node.id?{...n, color:c}:n));}} onTouchEnd={(e)=> {e.stopPropagation(); setNodes(nodes.map(n=>n.id===node.id?{...n, color:c}:n));}} className={"w-4 h-4 rounded-full border border-black/10 shadow-sm " + c}/> ))} 
                            </div>
                        </div>
                    )})}
                    {interaction?.type === 'box' && ( <div className="absolute border border-indigo-500 bg-indigo-500/10 pointer-events-none" style={{ left: Math.min(interaction.startX, interaction.currX), top: Math.min(interaction.startY, interaction.currY), width: Math.abs(interaction.currX - interaction.startX), height: Math.abs(interaction.currY - interaction.startY) }} /> )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN BOARD APP CONTENT ---
const BoardApp = ({ data, onUpdate, isExporting }) => {
    // Ensure backwards compatibility with old kanban items missing IDs
    const [boardData, setBoardData] = useState(() => {
        let initData = { ...data.data };
        if (['kanban', 'scrum'].includes(initData.type)) {
            if (!initData.groups) initData.groups = [{ id: 'g1', title: 'Default Group', color: 'bg-indigo-400' }];
            initData.columns = initData.columns?.map(c => ({
                ...c, items: c.items.map(i => ({ ...i, id: i.id || Math.random().toString(36).substr(2,9), groupId: i.groupId || initData.groups[0]?.id || 'g1' }))
            })) || [];
        }
        return initData;
    });
    
    const [collapsedGroups, setCollapsedGroups] = useState({}); // Stores per column collapse state: { "cIdx-groupId": boolean }
    const [sipocFlow, setSipocFlow] = useState(false);
    const [dragItem, setDragItem] = useState(null); // { cIdx, itemId }
    const [zoomLevel, setZoomLevel] = useState(1);
    
    useEffect(() => { onUpdate({ data: boardData }); }, [boardData]);
    
    const handleGridChange = (idx, val) => { const lines = val.split('\\n'); if (val.endsWith('\\n') && val.length > (boardData.grid[idx].content || '').length) { const count = lines.length; val += count + '. '; } const newGrid = [...boardData.grid]; newGrid[idx].content = val; setBoardData({...boardData, grid: newGrid}); };
    
    // -- Kanban Methods --
    const toggleGroupMode = () => { 
        const nextState = !boardData.useGroups;
        let newGroups = [...(boardData.groups || [])];
        let newCols = [...boardData.columns];

        if (nextState) {
            let hasUngrouped = false;
            newCols.forEach(c => c.items.forEach(i => { if (!i.groupId) hasUngrouped = true; }));
            if (hasUngrouped || newGroups.length === 0) {
                const otherId = 'g_other';
                if (!newGroups.some(g => g.id === otherId)) {
                    newGroups.push({ id: otherId, title: 'Other', color: 'bg-zinc-400' });
                }
                newCols = newCols.map(c => ({
                    ...c, items: c.items.map(i => {
                        if (!i.groupId || !newGroups.some(g => g.id === i.groupId)) {
                            return { ...i, groupId: otherId };
                        }
                        return i;
                    })
                }));
            }
        }

        setBoardData({ ...boardData, useGroups: nextState, groups: newGroups, columns: newCols }); 
    };
    
    const toggleCollapse = (cIdx, groupId) => {
        const key = cIdx + '-' + groupId;
        setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const addGroup = () => {
        const newId = 'g' + Date.now();
        setBoardData({ ...boardData, groups: [...boardData.groups, { id: newId, title: 'New Group', color: 'bg-indigo-400' }] });
    };
    
    const updateGroup = (groupId, updates) => {
        setBoardData({ ...boardData, groups: boardData.groups.map(g => g.id === groupId ? { ...g, ...updates } : g) });
    };
    
    const deleteGroup = (groupId) => {
        const newGroups = boardData.groups.filter(g => g.id !== groupId);
        
        if (newGroups.length === 0) {
            // Turning off group mode entirely
            const newCols = boardData.columns.map(c => ({
                ...c, items: c.items.map(i => ({ ...i, groupId: null }))
            }));
            setBoardData({ ...boardData, groups: [], columns: newCols, useGroups: false });
        } else {
            // Transfer tasks to the first available remaining group
            const fallbackId = newGroups[0].id;
            const newCols = boardData.columns.map(c => ({ ...c, items: c.items.map(i => i.groupId === groupId ? { ...i, groupId: fallbackId } : i) }));
            setBoardData({ ...boardData, groups: newGroups, columns: newCols });
        }
    };

    const addColumn = (idx) => { const newCols = [...boardData.columns]; newCols.splice(idx, 0, { title: 'New Column', items: [] }); setBoardData({...boardData, columns: newCols}); };
    
    const addCard = (cIdx, groupId = null) => {
        const newCols = [...boardData.columns];
        const newCard = { 
            id: Math.random().toString(36).substr(2,9), 
            text: cIdx === 0 ? "" : "New Task", 
            color: 'bg-white dark:bg-zinc-950',
            isEditing: cIdx === 0
        };
        if (boardData.useGroups) newCard.groupId = groupId || (boardData.groups.length > 0 ? boardData.groups[0].id : null);
        newCols[cIdx].items.push(newCard);
        setBoardData({ ...boardData, columns: newCols });
    };

    const toggleEdit = (cIdx, itemId, forceState) => {
        const newCols = [...boardData.columns];
        const iIdx = newCols[cIdx].items.findIndex(i => i.id === itemId);
        if (iIdx > -1) {
            newCols[cIdx].items[iIdx].isEditing = forceState;
            setBoardData({ ...boardData, columns: newCols });
        }
    };

    const onDragStartKanban = (e, cIdx, itemId) => { setDragItem({ cIdx, itemId }); e.dataTransfer.effectAllowed = "move"; };
    const onDragOverKanban = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
    
    const onDropKanban = (e, targetCIdx, targetGroupId = null) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dragItem) return;

        const newCols = [...boardData.columns];
        const sourceCol = newCols[dragItem.cIdx];
        const itemIndex = sourceCol.items.findIndex(i => i.id === dragItem.itemId);
        if (itemIndex === -1) return;

        const itemToMove = { ...sourceCol.items[itemIndex] };
        sourceCol.items.splice(itemIndex, 1); // remove from source

        if (boardData.useGroups) {
            // Reassign group ONLY if dragging into the leftmost column
            if (targetCIdx === 0 && targetGroupId) {
                itemToMove.groupId = targetGroupId;
            }
            // Ensure fallback
            if (!itemToMove.groupId) itemToMove.groupId = boardData.groups[0]?.id;
        }

        newCols[targetCIdx].items.push(itemToMove);
        setBoardData({ ...boardData, columns: newCols });
        setDragItem(null);
    };

    const moveCardMobile = (cIdx, itemId, dir) => {
        const newCols = [...boardData.columns];
        const itemIndex = newCols[cIdx].items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;
        const item = newCols[cIdx].items.splice(itemIndex, 1)[0];
        newCols[cIdx + dir].items.push(item);
        setBoardData({ ...boardData, columns: newCols });
    };
    
    const deleteCard = (cIdx, itemId) => {
        const newCols = [...boardData.columns];
        newCols[cIdx].items = newCols[cIdx].items.filter(i => i.id !== itemId);
        setBoardData({ ...boardData, columns: newCols });
    };

    const ZoomControls = () => (
        <div className="absolute top-2 right-2 z-20 bg-white/80 dark:bg-zinc-800/80 backdrop-blur rounded-lg shadow p-1 flex items-center gap-1 border border-slate-200 dark:border-zinc-700 hidden md:flex" onPointerDown={e => e.stopPropagation()}>
             {['kanban', 'scrum'].includes(boardData.type) && (
                 <>
                    <button onClick={toggleGroupMode} className={"px-2 py-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded flex items-center gap-1.5 transition-colors " + (boardData.useGroups ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-zinc-300')} title="Toggle Swimlanes">
                        <Icons.Layers className="w-4 h-4" /> <span className="text-xs">Groups</span>
                    </button>
                    <div className="w-px h-4 bg-slate-300 dark:bg-zinc-600 mx-1"></div>
                 </>
             )}
             <button onClick={() => setZoomLevel(z => Math.max(0.2, z - 0.1))} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded"><Icons.ZoomOut className="w-4 h-4 text-slate-600 dark:text-zinc-300" /></button>
             <span className="text-xs font-mono w-8 text-center text-slate-600 dark:text-zinc-300">{Math.round(zoomLevel * 100)}%</span>
             <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.1))} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded"><Icons.ZoomIn className="w-4 h-4 text-slate-600 dark:text-zinc-300" /></button>
        </div>
    );

    const renderKanbanCard = (item, cIdx) => {
        const isFirstCol = cIdx === 0;
        const isEditing = isFirstCol && item.isEditing;
        const baseColor = item.color || 'bg-white dark:bg-zinc-950';

        return (
            <div key={item.id} draggable={!isEditing} onDragStart={!isEditing ? (e) => onDragStartKanban(e, cIdx, item.id) : undefined} className={"group " + baseColor + " p-3 rounded-xl shadow-sm text-sm border border-transparent hover:border-indigo-400 dark:hover:border-indigo-500 transition-all relative shrink-0 " + (isEditing ? "" : "cursor-grab active:cursor-grabbing")}> 
                
                <div className="flex-1">
                    {isEditing ? (
                        <EditableDiv 
                            className="w-full bg-white/50 dark:bg-black/20 focus:outline-none text-slate-900 dark:text-white cursor-text rounded px-1 -mx-1" 
                            value={item.text} 
                            placeholder="Type task..."
                            onChange={(e) => { 
                                const newCols = [...boardData.columns]; 
                                const iIdx = newCols[cIdx].items.findIndex(i => i.id === item.id); 
                                newCols[cIdx].items[iIdx].text = e.target.value; 
                                setBoardData({ ...boardData, columns: newCols }); 
                            }} 
                        /> 
                    ) : (
                        <div className="w-full text-slate-900 dark:text-white whitespace-pre-wrap">{item.text || 'New Task'}</div>
                    )}
                </div>

                <div className={"flex justify-between items-center mt-3 pt-2 border-t border-black/5 dark:border-white/5 transition-opacity " + (isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100")}> 
                    <div className="flex gap-1.5 z-10"> 
                        {TASK_COLORS.map(c => {
                            const classes = c.split(' ');
                            return (
                                <button key={c} onClick={() => { const newCols = [...boardData.columns]; const iIdx = newCols[cIdx].items.findIndex(i => i.id === item.id); newCols[cIdx].items[iIdx].color = c; setBoardData({ ...boardData, columns: newCols }); }} className={"w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10 hover:scale-110 transition-transform " + classes[0] + " " + (classes[1] || '')} /> 
                            )
                        })} 
                    </div> 
                    <div className="flex gap-1 z-10 items-center"> 
                        {isFirstCol && (
                            isEditing ? (
                                <button onClick={() => toggleEdit(cIdx, item.id, false)} className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded transition-colors"><Icons.Check className="w-4 h-4"/></button>
                            ) : (
                                <button onClick={() => toggleEdit(cIdx, item.id, true)} className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors"><Icons.Pen className="w-3.5 h-3.5"/></button>
                            )
                        )}
                        <div className="flex mr-1 gap-1">
                            <button onClick={() => moveCardMobile(cIdx, item.id, -1)} disabled={cIdx === 0} className="p-1 text-slate-500 disabled:opacity-30 hover:text-slate-800 dark:hover:text-white"><Icons.ChevronLeft className="w-3.5 h-3.5"/></button>
                            <button onClick={() => moveCardMobile(cIdx, item.id, 1)} disabled={cIdx === boardData.columns.length - 1} className="p-1 text-slate-500 disabled:opacity-30 hover:text-slate-800 dark:hover:text-white"><Icons.ChevronRight className="w-3.5 h-3.5"/></button>
                        </div>
                        <button onClick={() => deleteCard(cIdx, item.id)} className="text-slate-400 hover:text-red-500 p-1"><Icons.Trash className="w-3.5 h-3.5"/></button> 
                    </div> 
                </div> 
            </div>
        );
    };

    const renderBoard = () => {
        switch (boardData.type) {
            case 'kanban':
                return (
                    <>
                        <ZoomControls />
                        <div className="w-full h-full overflow-x-auto overflow-y-hidden bg-slate-50 dark:bg-zinc-950 p-4 relative flex items-start custom-scrollbar bg-grid-pattern">
                            <div className="flex items-start gap-4 h-full capture-target min-w-max pb-4" style={{ zoom: zoomLevel }}>
                                
                                <div className="h-full pt-2 group/gap w-6 flex justify-center shrink-0"> <button onClick={() => addColumn(0)} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-800 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/gap:opacity-100 text-slate-500 shadow-sm"> <Icons.Plus className="w-4 h-4" /> </button> </div>
                                
                                {boardData.columns.map((col, cIdx) => (
                                    <React.Fragment key={cIdx}>
                                        <div className="relative w-80 flex-shrink-0 bg-slate-100 dark:bg-zinc-900/90 rounded-2xl p-2.5 max-h-full flex flex-col shadow-sm group/col border border-slate-200 dark:border-zinc-800" onDragOver={onDragOverKanban} onDrop={(e) => onDropKanban(e, cIdx)}>
                                            <div className="font-bold text-slate-700 dark:text-zinc-200 px-2 py-2 flex justify-between items-center mb-1 shrink-0"> 
                                                <input className="bg-transparent font-bold focus:bg-white dark:focus:bg-zinc-800 focus:outline-none rounded px-1.5 py-0.5 w-full mr-2 dark:text-white text-base transition-colors" value={col.title} onChange={(e) => { const newCols = [...boardData.columns]; newCols[cIdx].title = e.target.value; setBoardData({ ...boardData, columns: newCols }); }} /> 
                                                <div className="flex items-center gap-1 z-10 shrink-0"> 
                                                    <span className="bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-full">{col.items.length}</span> 
                                                    <button onClick={() => { const newCols = [...boardData.columns]; newCols.splice(cIdx, 1); setBoardData({ ...boardData, columns: newCols }); }} className="text-slate-400 hover:text-red-500 opacity-0 group-hover/col:opacity-100 transition-opacity p-1"><Icons.Trash className="w-3.5 h-3.5"/></button> 
                                                </div> 
                                            </div>

                                            <div className="flex-1 overflow-y-auto min-h-[50px] p-1 custom-scrollbar flex flex-col gap-3">
                                                {boardData.useGroups ? (
                                                    boardData.groups.map((group, gIdx) => {
                                                        const groupItems = col.items.filter(i => i.groupId === group.id);
                                                        // Force uncollapse if exporting snapshot
                                                        const isCollapsed = !isExporting && collapsedGroups[cIdx + '-' + group.id];

                                                        return (
                                                            <div key={group.id} className={"flex flex-col rounded-xl border border-transparent transition-colors " + (cIdx === 0 ? 'bg-white/60 dark:bg-zinc-800/50 p-1.5' : '')} onDragOver={onDragOverKanban} onDrop={(e) => onDropKanban(e, cIdx, group.id)}>
                                                                
                                                                <div className="flex items-center justify-between mb-2 px-1 group/header relative">
                                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                                        <button onClick={() => toggleCollapse(cIdx, group.id)} className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded shrink-0 transition-colors">
                                                                            {isCollapsed ? <Icons.ChevronRight className="w-4 h-4"/> : <Icons.ChevronDown className="w-4 h-4"/>}
                                                                        </button>
                                                                        <div className={"w-3 h-3 rounded-full shrink-0 shadow-sm " + (group.color || 'bg-indigo-400')}></div>
                                                                        {cIdx === 0 ? (
                                                                            <input className="bg-transparent focus:bg-white dark:focus:bg-zinc-900 rounded px-1 focus:outline-none text-sm font-semibold text-slate-700 dark:text-zinc-200 w-full min-w-0 truncate" value={group.title} onChange={e => updateGroup(group.id, { title: e.target.value })} />
                                                                        ) : (
                                                                            <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200 truncate px-1">{group.title}</span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                                                        {cIdx === 0 && (
                                                                            <div className="hidden group-hover/header:flex absolute right-8 top-0 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-1.5 rounded-lg shadow-xl z-20 items-center gap-1.5 flex-wrap w-24 animate-slide-up">
                                                                                {GROUP_COLORS.map(c => (
                                                                                    <button key={c} onClick={() => updateGroup(group.id, { color: c })} className={"w-4 h-4 rounded-full hover:scale-125 transition-transform shadow-sm " + c}></button>
                                                                                ))}
                                                                                <div className="w-px h-4 bg-slate-200 dark:bg-zinc-600 mx-1"></div>
                                                                                <button onClick={() => deleteGroup(group.id)} className="text-slate-400 hover:text-red-500"><Icons.Trash className="w-4 h-4"/></button>
                                                                            </div>
                                                                        )}
                                                                        <span className="bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">{groupItems.length}</span>
                                                                    </div>
                                                                </div>

                                                                {!isCollapsed && (
                                                                    <div className="flex flex-col gap-2.5 min-h-[40px] rounded-lg p-1">
                                                                        {groupItems.map(item => renderKanbanCard(item, cIdx))}
                                                                        <button onClick={() => addCard(cIdx, group.id)} className="w-full py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors border border-dashed border-slate-300 dark:border-zinc-700">+ Add Card</button>
                                                                    </div>
                                                                )}
                                                                {isCollapsed && <div className={"h-px mx-2 mt-1 mb-2 " + (group.color || 'bg-indigo-400') + " opacity-50"}></div>}
                                                            </div>
                                                        )
                                                    })
                                                ) : (
                                                    <div className="flex flex-col gap-2.5 pb-2">
                                                        {col.items.map(item => renderKanbanCard(item, cIdx))}
                                                    </div>
                                                )}
                                                
                                                {!boardData.useGroups && (
                                                    <button onClick={() => addCard(cIdx)} className="w-full py-2.5 mt-1 text-sm font-medium text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl transition-colors border border-dashed border-slate-300 dark:border-zinc-700">+ Add Card</button>
                                                )}
                                                {boardData.useGroups && cIdx === 0 && (
                                                    <button onClick={addGroup} className="w-full py-2.5 mt-2 text-sm font-medium text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors border border-dashed border-indigo-200 dark:border-indigo-800/50">+ Add Group</button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="h-full pt-2 group/gap w-6 flex justify-center shrink-0"> <button onClick={() => addColumn(cIdx + 1)} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-800 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/gap:opacity-100 text-slate-500 shadow-sm"> <Icons.Plus className="w-4 h-4" /> </button> </div>
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
                        <div className="w-full h-full overflow-auto bg-slate-50 dark:bg-zinc-950 p-6 bg-grid-pattern">
                            <div style={{ zoom: zoomLevel }}>
                                <div className={"grid gap-5 w-full capture-target min-w-[800px] " + (boardData.cols === 3 ? 'grid-cols-3' : 'grid-cols-2')}> 
                                    {boardData.grid.map((area, idx) => ( 
                                        <div key={idx} className={(area.color || 'bg-white') + " dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-2xl p-6 flex flex-col shadow-sm transition-colors text-slate-900 dark:text-zinc-100"}> 
                                            <h3 className="font-bold text-slate-800 dark:text-zinc-200 mb-4 text-lg flex items-center gap-2"> <span className="w-2.5 h-2.5 rounded-full bg-current opacity-50"></span> {area.title} </h3> 
                                            <EditableDiv 
                                                className="w-full bg-white/50 dark:bg-zinc-900/50 border-0 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 dark:text-zinc-200 text-base leading-relaxed" 
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
                        <div className="h-full w-full bg-slate-50 dark:bg-zinc-950 p-6 flex flex-col overflow-auto bg-grid-pattern"> 
                            <div className="capture-target min-w-[900px]" style={{ zoom: zoomLevel }}>
                                <h3 className="text-2xl font-bold mb-6 text-center text-slate-800 dark:text-white">Risk Matrix</h3> 
                                <div className="grid grid-cols-[120px_repeat(5,_1fr)] gap-2 auto-rows-min">
                                    <div className="flex items-end justify-end p-2 font-bold text-slate-500 text-xs">Likelihood \\ Impact</div>
                                    {impacts.map(i => <div key={i} className="flex items-center justify-center p-2 font-bold text-slate-700 dark:text-zinc-300 rounded-lg text-center">{i}</div>)}
                                    {likelihoods.map((l, rowIdx) => (
                                        <React.Fragment key={l}>
                                            <div className="flex items-center justify-end p-2 font-bold text-slate-700 dark:text-zinc-300 rounded-lg text-right">{l}</div>
                                            {riskConfig[rowIdx].map((conf, colIdx) => {
                                                const flatIdx = rowIdx * 5 + colIdx; 
                                                const cellData = boardData.cells ? boardData.cells[flatIdx] : '';
                                                return (
                                                    <div key={flatIdx} className={conf.bg + " border-2 " + conf.bd + " dark:bg-opacity-20 rounded-lg p-2 min-h-[100px] shadow-sm flex flex-col transition-colors"}>
                                                        <EditableDiv className="w-full bg-transparent p-1 text-sm font-medium placeholder-black/30 dark:placeholder-white/30 text-slate-900 dark:text-zinc-100 focus:outline-none" placeholder="Add risk..." value={cellData} onChange={(e) => { const newCells = [...(boardData.cells || Array(25).fill(''))]; newCells[flatIdx] = e.target.value; setBoardData({...boardData, cells: newCells}); }} />
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
                    <div className="p-6 overflow-auto h-full bg-slate-50 dark:bg-zinc-950 flex flex-col bg-grid-pattern"> 
                        <div className="capture-target min-w-max" style={{ zoom: zoomLevel }}>
                            <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm bg-white dark:bg-zinc-800"> 
                                <thead> <tr> {boardData.columns.map((col, i) => <th key={i} className="border-b border-slate-200 dark:border-zinc-700 p-4 bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-200 font-semibold text-left uppercase text-sm">{col}</th>)} </tr> </thead> 
                                <tbody> {boardData.rows.map((row, rIdx) => ( <tr key={rIdx} className="group hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"> {row.map((cell, cIdx) => ( <td key={cIdx} className="border-b border-slate-100 dark:border-zinc-800 p-2 min-w-[200px] align-top"> 
                                    <EditableDiv className="w-full p-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white rounded h-full text-sm leading-relaxed" value={cell} onChange={(e) => { const newRows = [...boardData.rows]; newRows[rIdx][cIdx] = e.target.value; setBoardData({...boardData, rows: newRows}); }} /> 
                                </td> ))} </tr> ))} </tbody> 
                            </table> 
                            <div className="flex gap-3 mt-6"> <button onClick={() => setBoardData({...boardData, rows: [...boardData.rows, Array(boardData.columns.length).fill('')]})} className="px-4 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1"><Icons.Plus className="w-4 h-4"/> Add Row</button> <button onClick={() => setSipocFlow(!sipocFlow)} className="px-4 py-2 bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"> {sipocFlow ? 'Hide Flow' : 'Generate Flow'} </button> </div> {sipocFlow && ( <div className="mt-8 p-5 bg-white dark:bg-zinc-800 rounded-xl shadow-inner border border-slate-100 dark:border-zinc-700 overflow-x-auto min-w-max"> <h4 className="font-bold mb-4 text-slate-600 dark:text-zinc-300">Process Flow</h4> <div className="flex items-center gap-4"> {boardData.rows.map((row, i) => row[2] && ( <div key={i} className="flex items-center gap-4"> <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-3 rounded-lg shadow-sm text-sm w-48 text-center text-slate-700 dark:text-zinc-200 font-medium">{row[2]}</div> {i < boardData.rows.length - 1 && boardData.rows[i+1][2] && <div className="text-slate-400 font-bold">→</div>} </div> ))} </div> </div> )} 
                        </div>
                    </div> 
                </>
            );
            default: return <div>Unknown Board</div>;
        }
    };
    return ( <div className="h-full w-full bg-white dark:bg-zinc-950 overflow-hidden flex flex-col relative"> <div className="absolute bottom-6 left-6 z-10"> <InfoButton text={INSTRUCTIONS[boardData.subType] || "No instructions."} /> </div> {renderBoard()} </div> );
};

// --- WRAPPER WITH HEADER FOR EXPORT LOGIC ---
const BoardContainer = ({ board, onUpdate, onBack }) => {
    const contentRef = useRef(null);
    const downloadBtnRef = useRef(null);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

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
            if (boardData.useGroups && boardData.groups) {
                boardData.groups.forEach(g => {
                    md += '## Group: ' + g.title + '\\n';
                    boardData.columns.forEach(col => {
                        const items = col.items.filter(i => i.groupId === g.id);
                        if (items.length > 0) {
                            md += '### ' + col.title + '\\n';
                            items.forEach(item => { md += '- ' + item.text.replace(/\\n/g, ' ') + '\\n'; });
                            md += '\\n';
                        }
                    });
                    md += '\\n';
                });
            } else {
                boardData.columns.forEach(col => { md += '## ' + col.title + '\\n'; col.items.forEach(item => { md += '- ' + item.text.replace(/\\n/g, ' ') + '\\n'; }); md += '\\n'; });
            }
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
            if (!window.htmlToImage) { alert("Please wait a moment for the export library to load."); return; }
            
            // Trigger expand-all state across the app
            setIsExporting(true);

            setTimeout(async () => {
                try {
                    let source = contentRef.current.querySelector('.capture-target');
                    if (!source) source = contentRef.current; 

                    const clone = deepCloneWithValues(source);
                    const container = document.createElement('div');
                    container.style.position = 'fixed'; container.style.top = '-10000px'; container.style.left = '-10000px'; container.style.zIndex = '-1';
                    
                    const isDark = document.documentElement.classList.contains('dark');
                    container.style.background = isDark ? '#09090b' : '#f8fafc'; // Matches zinc-950 / slate-50
                    container.style.color = isDark ? '#f4f4f5' : '#09090b';
                    
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
                    
                    await new Promise(resolve => setTimeout(resolve, 200));

                    const dataUrl = await window.htmlToImage.toPng(clone, { 
                        pixelRatio: 2, backgroundColor: isDark ? '#09090b' : '#f8fafc', style: { transform: 'none' }
                    });
                    
                    document.body.removeChild(container);
                    const link = document.createElement('a'); link.download = fileName + '.png'; link.href = dataUrl; link.click();
                } catch (e) { alert("Image generation failed. " + e); }
                
                // Revert expansion correctly
                setIsExporting(false);
            }, 300);
        }
    };

    return (
        <div className="flex flex-col w-full h-full bg-slate-50 dark:bg-zinc-950 transition-colors">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur shrink-0 shadow-sm z-50">
                <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <button onClick={onBack} className="p-2 md:p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-slate-600 dark:text-zinc-300 transition-colors flex items-center gap-2 font-medium text-sm flex-shrink-0">
                        <Icons.ArrowLeft className="w-4 h-4"/><span className="hidden md:inline">Back</span>
                    </button>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Icons.Boards className="w-5 h-5 flex-shrink-0 text-indigo-500" />
                        <input className="bg-transparent focus:bg-slate-100 dark:focus:bg-zinc-800 rounded px-2 py-1 min-w-0 w-full max-w-sm focus:outline-none text-lg font-bold text-slate-800 dark:text-zinc-100 truncate transition-colors" value={board.title} onChange={(e) => onUpdate({ title: e.target.value })} />
                    </div>
                </div>

                <div className="relative flex-shrink-0 ml-2" ref={downloadBtnRef}>
                    <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                        <Icons.Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
                    </button>
                    
                    {showDownloadMenu && (
                        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xl rounded-xl p-1 w-52 flex flex-col gap-1 z-[100] animate-slide-up origin-top-right">
                            <button onClick={() => downloadFile('json')} className="text-left px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg text-sm text-slate-700 dark:text-zinc-200 font-medium transition-colors">Save Board Data (.json)</button>
                            <button onClick={() => downloadFile('image')} className="text-left px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg text-sm text-slate-700 dark:text-zinc-200 font-medium transition-colors">Export to Image (.png)</button>
                            <button onClick={() => downloadFile('markdown')} className="text-left px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg text-sm text-slate-700 dark:text-zinc-200 font-medium transition-colors">Save as Markdown (.md)</button>
                            <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1"></div>
                            <button onClick={() => downloadFile('copy')} className="text-left px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg text-sm text-slate-700 dark:text-zinc-200 font-medium transition-colors">Copy Text to Clipboard</button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden relative" ref={contentRef}>
                <BoardApp data={board.data} onUpdate={(newData) => onUpdate({ board: { ...board, data: { ...board.data, ...newData } } })} isExporting={isExporting} />
            </div>
        </div>
    );
};

// --- MAIN OS EXPORTED COMPONENT ---
const ProductivityBoards = ({ data, onUpdate, instanceId, title }) => {
    const fileInputRef = useRef(null);
    const currentBoard = data.board || null;

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
                onUpdate({ board: { id: Date.now().toString(), title: title ? title.replace('.json', '') : 'Imported Board', subType: subType, data: { subType, data: innerData } } });
            } catch (err) { console.error("Failed to parse injected Board JSON:", err); } 
        }
    }, [data?.fileData]);

    const createNewBoard = (key) => {
        const template = BOARD_TEMPLATES[key]; 
        const freshData = JSON.parse(JSON.stringify(template.defaultData)); 
        onUpdate({ board: { id: Date.now().toString(), title: template.title, subType: key, data: { subType: key, data: freshData } } });
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
                    onUpdate({ board: { id: Date.now().toString(), title: file.name.replace('.json', ''), subType: subType, data: { subType, data: innerData } } });
                } catch (err) { alert('Invalid Board Data format.'); } 
            }; 
            reader.readAsText(file); 
        } else { alert('Please upload a .json board file.'); }
        e.target.value = null; 
    };

    if (currentBoard) {
        return (
            <div className="prod-board-app">
                <style dangerouslySetInnerHTML={{ __html: APP_STYLES }} />
                <BoardContainer board={currentBoard} onUpdate={(updates) => onUpdate(updates)} onBack={() => onUpdate({ board: null })} />
            </div>
        );
    }

    return (
        <div className="prod-board-app bg-slate-50 dark:bg-zinc-950 transition-colors relative flex flex-col">
            <style dangerouslySetInnerHTML={{ __html: APP_STYLES }} />
            <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={handleImport} />
            
            <div className="absolute inset-0 bg-grid-pattern opacity-50 pointer-events-none"></div>

            <header className="relative z-10 flex flex-col sm:flex-row items-center justify-between px-6 sm:px-10 py-8 gap-6 w-full max-w-7xl mx-auto shrink-0">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800">
                        <Icons.Boards className="w-8 h-8 text-indigo-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-zinc-100 tracking-tight">Boards</h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">Select a template to begin</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button onClick={() => fileInputRef.current.click()} className="flex-1 sm:flex-none px-5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-slate-700 dark:text-zinc-300 hover:shadow-md hover:border-indigo-300 transition-all text-center">
                        Import JSON
                    </button>
                    <button onClick={() => document.documentElement.classList.toggle('dark')} className="p-2.5 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors flex-shrink-0 shadow-inner">
                        <Icons.Theme className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="relative z-10 px-6 sm:px-10 pb-12 flex-1 w-full max-w-7xl mx-auto overflow-y-auto custom-scrollbar">
                {/* Responsive container grid auto-adjusting to tab size */}
                <div className="grid gap-6 pb-20" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}> 
                    {Object.entries(BOARD_TEMPLATES).map(([key, tpl]) => ( 
                        <button key={key} onClick={() => createNewBoard(key)} className="group relative p-[1px] rounded-3xl bg-gradient-to-b from-white to-slate-100 dark:from-zinc-800 dark:to-zinc-900 shadow-sm hover:shadow-xl transition-all duration-300 text-left border border-slate-200 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 overflow-hidden outline-none focus:ring-4 focus:ring-indigo-500/20 active:scale-95">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 dark:group-hover:from-indigo-500/10 dark:group-hover:to-purple-500/10 transition-colors duration-500 pointer-events-none"></div>
                            <div className="relative p-6 bg-white/70 dark:bg-zinc-900/80 rounded-[23px] h-full flex flex-col gap-4 backdrop-blur-md">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-inner border border-indigo-100/50 dark:border-indigo-500/20"> 
                                    {key === 'kanban' || key === 'scrum' ? <Icons.Boards className="w-7 h-7"/> : key === 'mindmap' || key === 'pert' ? <div className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center"><div className="w-2.5 h-2.5 bg-current rounded-full"/></div> : <Icons.Boards className="w-7 h-7"/>} 
                                </div> 
                                <div>
                                    <h3 className="font-extrabold text-xl text-slate-800 dark:text-zinc-100 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{tpl.title}</h3> 
                                    <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">{tpl.desc}</p> 
                                </div>
                            </div>
                        </button> 
                    ))} 
                </div>
            </main>
        </div>
    );
};

return ProductivityBoards;
`;
