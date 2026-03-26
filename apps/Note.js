window.CanvasApps['Note'] = `
const { useState, useEffect } = React;

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const NoteApp = ({ data, onUpdate, instanceId, title }) => {
    const colors = ['bg-amber-100', 'bg-blue-100', 'bg-green-100', 'bg-pink-100', 'bg-purple-100', 'bg-white'];
    const [localContent, setLocalContent] = useState(data?.content || '');
    const debouncedContent = useDebounce(localContent, 500);
    
    // Sync with external data updates (like when a local file is opened)
    useEffect(() => { 
        if (data?.content !== undefined) {
            setLocalContent(data.content); 
        }
    }, [data?.content]);

    // Send data back up to OS state
    useEffect(() => { 
        if (debouncedContent !== data?.content) {
            onUpdate({ content: debouncedContent }); 
        }
    }, [debouncedContent]);
    
    // The App autonomously handles its own file downloading
    const handleDownload = (e) => {
        e.stopPropagation();
        const fileName = title || \`note-\${Date.now()}\`;
        const blob = new Blob([localContent], { type: 'text/plain' }); 
        const url = URL.createObjectURL(blob); 
        const a = document.createElement('a'); 
        a.href = url; 
        const finalName = fileName.toLowerCase().endsWith('.txt') ? fileName : fileName + '.txt';
        a.download = finalName; 
        a.click(); 
        URL.revokeObjectURL(url);
    };

    return (
        <div className={\`flex flex-col h-full min-h-0 min-w-0 \${data?.color || 'bg-amber-100'} dark:text-slate-800 transition-colors duration-300\`}>
            <div className="flex justify-between items-center p-1 sm:p-2 opacity-100 shrink-0">
                <button onClick={handleDownload} className="p-1 sm:p-1.5 hover:bg-black/10 rounded-md text-slate-700 transition-colors flex items-center justify-center" title="Save Note">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                </button>
                <div className="flex gap-1.5 items-center">
                    {colors.map(c => ( 
                        <button key={c} onClick={() => onUpdate({ color: c })} className={\`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-black/10 shadow-sm \${c}\`} /> 
                    ))}
                </div>
            </div>
            <textarea 
                className="flex-1 min-h-0 w-full p-2.5 sm:p-4 pt-0 bg-transparent resize-none focus:outline-none font-medium text-slate-800 text-sm sm:text-base leading-relaxed placeholder-black/20" 
                placeholder="Jot down something quick..." 
                value={localContent} 
                onChange={e => setLocalContent(e.target.value)} 
                onMouseDown={e => e.stopPropagation()} 
            />
        </div>
    );
};

return NoteApp;
`;