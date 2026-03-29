// Note the ID is exactly 'WordEditor' to match your registry!
window.CanvasApps['WordEditor'] = `
const { useState, useEffect, useRef } = React;

const Icon = ({ name, size = 18, className = "" }) => {
    const paths = {
        bold: <><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></>,
        italic: <><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></>,
        alignLeft: <><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></>,
        alignCenter: <><line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="7" y1="12" y2="12"/><line x1="19" x2="5" y1="18" y2="18"/></>,
        alignRight: <><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/></>,
        alignJustify: <><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></>,
        list: <><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></>,
        listOrdered: <><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></>,
        indent: <><polyline points="3 8 7 12 3 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/></>,
        outdent: <><polyline points="7 8 3 12 7 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/></>,
        upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></>,
        highlighter: <><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></>,
        eraser: <><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" /></>,
        fileDown: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></>,
        undo: <><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></>,
        redo: <><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></>,
        chevronDown: <><polyline points="6 9 12 15 18 9"/></>
    };
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
};

const WordEditorApp = ({ data, onUpdate, instanceId }) => {
  const [isReady, setIsReady] = useState(false);
  const[wordCount, setWordCount] = useState(0);
  
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const toolbarRef = useRef(null);
  const exportMenuRef = useRef(null);
  const savedSelection = useRef(null);

  const [format, setFormat] = useState({
    bold: false, italic: false, 
    justifyLeft: true, justifyCenter: false, justifyRight: false, justifyFull: false,
    insertUnorderedList: false, insertOrderedList: false,
    formatBlock: 'p'
  });

  const [highlightColor, setHighlightColor] = useState('#fde047'); // Default yellow
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Initialize Libraries
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.process = window.process || { env: { NODE_ENV: 'production' } };
    }

    const loadScripts = async () => {
      const scripts =[
        'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/turndown/7.1.2/turndown.min.js',
        'https://unpkg.com/html-docx-js@0.3.1/dist/html-docx.js' 
      ];

      for (const src of scripts) {
        try {
          await new Promise((resolve, reject) => {
            if (document.querySelector('script[src="' + src + '"]')) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous'; 
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load ' + src));
            document.head.appendChild(script);
          });
        } catch (error) {
          console.error(error);
        }
      }
      setIsReady(true);
      
      if (editorRef.current && editorRef.current.innerHTML.trim() === '') {
        editorRef.current.innerHTML = '<p><br></p>';
        updateWordCount();
      }
    };
    loadScripts();
  },[]);

  // Handle Dynamic File Uploads from OS Dock
  useEffect(() => {
    if (!isReady || !data?.fileData || !window.mammoth) return;
    fetch(data.fileData)
      .then(res => res.arrayBuffer())
      .then(arrayBuffer => {
        window.mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
          .then((result) => {
            if (editorRef.current) {
              editorRef.current.innerHTML = result.value || '<p><br></p>';
              updateWordCount();
            }
          })
          .catch((err) => console.error('Failed to parse injected DOCX:', err));
      });
  }, [isReady, data?.fileData]);

  // Handle Horizontal Scroll for Toolbar
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        toolbarRef.current.scrollLeft += e.deltaY;
      }
    };
    const el = toolbarRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', handleWheel); };
  }, [isReady]);

  // Click outside to close export menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  },[]);

  const updateWordCount = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const count = text.trim().split(/\\s+/).filter(Boolean).length;
    setWordCount(count);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelection.current);
    } else {
      editorRef.current?.focus();
    }
  };

  const updateFormatState = () => {
    if (!editorRef.current) return;
    saveSelection();
    updateWordCount();
    
    const newFormat = { ...format };
    
    // Safely query DOM state
    const commands =['bold', 'italic', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'insertUnorderedList', 'insertOrderedList'];
    commands.forEach(cmd => {
      try { newFormat[cmd] = document.queryCommandState(cmd); } catch(e) {}
    });

    try {
      let formatBlock = document.queryCommandValue('formatBlock');
      if (formatBlock) newFormat.formatBlock = formatBlock.replace(/[<>]/g, '').toLowerCase();
      
      let backColorCmd = document.queryCommandSupported('hiliteColor') ? 'hiliteColor' : 'backColor';
      let backColor = document.queryCommandValue(backColorCmd);
      if (backColor && backColor !== 'transparent' && backColor !== 'rgba(0, 0, 0, 0)' && backColor !== 'rgb(255, 255, 255)' && backColor !== '#ffffff') {
        setIsHighlighting(true);
      } else {
        setIsHighlighting(false);
      }
    } catch (e) {}

    setFormat(newFormat);
  };

  const execCommand = (command, value = null) => {
    editorRef.current?.focus();
    if (command === 'formatBlock') {
      document.execCommand(command, false, '<' + value + '>');
    } else {
      document.execCommand(command, false, value);
    }
    updateFormatState();
  };

  // Dedicated Undo/Redo explicitly grabbing focus
  const handleUndo = (e) => {
    e.preventDefault();
    editorRef.current?.focus();
    document.execCommand('undo');
    updateFormatState();
  };

  const handleRedo = (e) => {
    e.preventDefault();
    editorRef.current?.focus();
    document.execCommand('redo');
    updateFormatState();
  };

  // Dedicated Highlighter Toggle System
  const toggleHighlight = (e) => {
    e.preventDefault();
    editorRef.current?.focus();
    restoreSelection();
    
    const newState = !isHighlighting;
    setIsHighlighting(newState);
    
    const cmd = document.queryCommandSupported('hiliteColor') ? 'hiliteColor' : 'backColor';
    if (newState) {
      document.execCommand(cmd, false, highlightColor);
    } else {
      document.execCommand(cmd, false, 'transparent');
    }
    updateFormatState();
  };

  const removeHighlight = (e) => {
    e.preventDefault();
    editorRef.current?.focus();
    restoreSelection();
    
    const cmd = document.queryCommandSupported('hiliteColor') ? 'hiliteColor' : 'backColor';
    document.execCommand(cmd, false, 'transparent');
    setIsHighlighting(false);
    updateFormatState();
  };

  const changeHighlightColor = (e) => {
    const newColor = e.target.value;
    setHighlightColor(newColor);
    
    // If highlighter is currently active, instantly apply the new color to the selection
    if (isHighlighting) {
        editorRef.current?.focus();
        restoreSelection();
        const cmd = document.queryCommandSupported('hiliteColor') ? 'hiliteColor' : 'backColor';
        document.execCommand(cmd, false, newColor);
        updateFormatState();
    }
  };

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleImportDocx = (e) => {
    const file = e.target.files[0];
    if (!file || !window.mammoth) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      window.mammoth.convertToHtml({ arrayBuffer: event.target.result })
        .then((result) => {
          editorRef.current.innerHTML = result.value || '<p><br></p>';
          updateWordCount();
        })
        .catch(() => alert('Failed to parse DOCX file.'));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  const handleExportDocx = () => {
    if (!window.htmlDocx) return alert("DOCX library is loading. Please wait.");
    
    const content = editorRef.current.innerHTML;
    const htmlString = '<!DOCTYPE html>\\n' +
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">\\n' +
    '  <head>\\n' +
    '    <meta charset="utf-8">\\n' +
    '    <title>Exported Document</title>\\n' +
    '    <style>\\n' +
    '      body { font-family: "Inter", "Arial", sans-serif; font-size: 11pt; }\\n' +
    '      p { margin-bottom: 10pt; line-height: 1.5; }\\n' +
    '      h1 { font-size: 24pt; font-weight: bold; }\\n' +
    '      h2 { font-size: 18pt; font-weight: bold; }\\n' +
    '      h3 { font-size: 14pt; font-weight: bold; }\\n' +
    '      ul, ol { margin-left: 24pt; }\\n' +
    '    </style>\\n' +
    '  </head>\\n' +
    '  <body>\\n' +
    '    ' + content + '\\n' +
    '  </body>\\n' +
    '</html>';

    try {
      const docxBlob = window.htmlDocx.asBlob(htmlString, {
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 } 
      });
      const finalBlob = new Blob([docxBlob], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      downloadFile(finalBlob, 'Document.docx');
    } catch (err) {
      console.error(err);
      alert("Failed to export DOCX. Check console.");
    }
  };

  const handleExportMd = () => {
    if (!window.TurndownService) return alert("Markdown converter is loading.");
    const turndownService = new window.TurndownService({ headingStyle: 'atx' });
    const blob = new Blob([turndownService.turndown(editorRef.current.innerHTML)], { type: 'text/markdown' });
    downloadFile(blob, 'Document.md');
  };

  const handleExportPdf = () => {
    const content = editorRef.current.innerHTML;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const pri = iframe.contentWindow;
    pri.document.open();
    pri.document.write('<html><head><title>Document</title><style>');
    
    pri.document.write('@page { size: auto; margin: 0mm; }');
    pri.document.write('body { font-family: "Inter", "Arial", sans-serif; margin: 0; box-sizing: border-box; padding: 20mm; }');
    pri.document.write('h1 { font-size: 24pt; font-weight: bold; margin-top: 12pt; margin-bottom: 3pt; }');
    pri.document.write('h2 { font-size: 18pt; font-weight: bold; margin-top: 10pt; margin-bottom: 3pt; }');
    pri.document.write('h3 { font-size: 14pt; font-weight: bold; margin-top: 8pt; margin-bottom: 3pt; }');
    pri.document.write('p { margin-bottom: 10pt; line-height: 1.5; }');
    pri.document.write('ul, ol { margin-left: 24pt; margin-bottom: 10pt; }');
    pri.document.write('li { margin-bottom: 4pt; }');
    pri.document.write('</style></head><body>');
    
    pri.document.write(content);
    
    pri.document.write('</body></html>');
    pri.document.close();

    pri.focus();
    setTimeout(() => {
      pri.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
    
    setShowExportMenu(false);
  };

  const ToolbarButton = ({ icon, command, value, isActive }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        execCommand(command, value);
      }}
      className={'p-1.5 rounded-lg transition-colors shrink-0 flex items-center justify-center ' + (isActive ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-700')}
      title={command}
    >
      <Icon name={icon} size={18} />
    </button>
  );

  return (
    <div className="flex flex-col h-full w-full bg-white font-sans overflow-hidden">
      
      {/* CRITICAL CSS OVERRIDES: Bypasses Tailwind CSS Resets specifically for this internal editor. */}
      <style dangerouslySetInnerHTML={{ __html: \`
        .editor-wrapper { container-type: inline-size; }
        .docx-editor {
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            font-size: clamp(14px, 2.5cqi, 20px) !important;
            padding: clamp(1rem, 6cqi, 4rem) !important;
            outline: none;
            min-height: 100%;
            background: white;
            color: #1e293b;
        }
        .docx-editor h1 { font-size: 2.2em !important; font-weight: 700 !important; margin-bottom: 0.5em !important; line-height: 1.2 !important; color: #0f172a !important; display: block !important; }
        .docx-editor h2 { font-size: 1.7em !important; font-weight: 700 !important; margin-bottom: 0.5em !important; line-height: 1.3 !important; color: #0f172a !important; display: block !important; }
        .docx-editor h3 { font-size: 1.3em !important; font-weight: 700 !important; margin-bottom: 0.5em !important; line-height: 1.4 !important; color: #0f172a !important; display: block !important; }
        .docx-editor p { margin-bottom: 1em !important; line-height: 1.6 !important; display: block !important; }
        
        /* Strict List Re-Enablers against Tailwind Preflight */
        .docx-editor ul { list-style-type: disc !important; list-style-position: outside !important; padding-left: 2.5em !important; margin-bottom: 1em !important; display: block !important; }
        .docx-editor ol { list-style-type: decimal !important; list-style-position: outside !important; padding-left: 2.5em !important; margin-bottom: 1em !important; display: block !important; }
        .docx-editor li { display: list-item !important; margin-bottom: 0.5em !important; }
        
        /* Indent Restorations */
        .docx-editor blockquote { margin-left: 40px !important; margin-right: 40px !important; border: none !important; color: inherit !important; font-style: normal !important; display: block !important; }
        
        /* Alignment Hard-Enforcers */
        .docx-editor[style*="text-align: center"], .docx-editor [align="center"] { text-align: center !important; }
        .docx-editor [style*="text-align: right"], .docx-editor [align="right"] { text-align: right !important; }
        .docx-editor [style*="text-align: justify"], .docx-editor [align="justify"] { text-align: justify !important; }
        .docx-editor[style*="text-align: left"], .docx-editor [align="left"] { text-align: left !important; }

        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      \`}} />

      {/* SINGLE LINE TOOLBAR */}
      <div className="bg-slate-50 border-b border-slate-200 px-2 flex items-center justify-between shrink-0 shadow-sm z-20">
        
        {/* Scrollable Tools Left Side */}
        <div ref={toolbarRef} className="flex-1 flex items-center gap-1.5 py-1.5 overflow-x-auto hide-scrollbar">
            
            {/* Custom Undo / Redo */}
            <button onMouseDown={handleUndo} className="p-1.5 rounded-lg transition-colors shrink-0 flex items-center justify-center hover:bg-slate-200 text-slate-700" title="Undo">
                <Icon name="undo" size={18} />
            </button>
            <button onMouseDown={handleRedo} className="p-1.5 rounded-lg transition-colors shrink-0 flex items-center justify-center hover:bg-slate-200 text-slate-700" title="Redo">
                <Icon name="redo" size={18} />
            </button>
            
            <div className="w-px h-5 bg-slate-300 mx-1 shrink-0"></div>

            <select 
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 cursor-pointer w-28 shrink-0 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              onChange={(e) => {
                  execCommand('formatBlock', e.target.value);
                  // Ensure focus returns correctly to the editor after dropdown selection
                  setTimeout(() => editorRef.current?.focus(), 10);
              }}
              value={format.formatBlock || 'p'}
            >
              <option value="p">Normal</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>

            <div className="w-px h-5 bg-slate-300 mx-1 shrink-0"></div>

            <ToolbarButton icon="bold" command="bold" isActive={format.bold} />
            <ToolbarButton icon="italic" command="italic" isActive={format.italic} />
            
            <div className="w-px h-5 bg-slate-300 mx-1 shrink-0"></div>
            
            {/* Highlighter Tools */}
            <button 
                onMouseDown={toggleHighlight}
                className={\`p-1.5 rounded-lg transition-colors shrink-0 flex items-center justify-center \${isHighlighting ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-700'}\`}
                title="Toggle Highlighter"
            >
                <Icon name="highlighter" size={18} />
            </button>

            <div className="relative w-7 h-7 shrink-0 rounded border border-slate-300 hover:border-slate-400 bg-white flex items-center justify-center cursor-pointer shadow-sm overflow-hidden" title="Highlight Color">
                <input 
                    type="color" 
                    value={highlightColor} 
                    onChange={changeHighlightColor} 
                    className="absolute inset-0 w-[150%] h-[150%] -top-1 -left-1 opacity-0 cursor-pointer z-10" 
                />
                <div className="w-4 h-4 rounded-sm border border-black/20 shadow-inner pointer-events-none" style={{ backgroundColor: highlightColor }}></div>
            </div>

            <button 
                onMouseDown={removeHighlight}
                className="p-1.5 rounded-lg transition-colors shrink-0 flex items-center justify-center hover:bg-slate-200 text-slate-700"
                title="Remove Highlight"
            >
                <Icon name="eraser" size={18} />
            </button>

            <div className="w-px h-5 bg-slate-300 mx-1 shrink-0"></div>

            <ToolbarButton icon="list" command="insertUnorderedList" isActive={format.insertUnorderedList} />
            <ToolbarButton icon="listOrdered" command="insertOrderedList" isActive={format.insertOrderedList} />
            <ToolbarButton icon="outdent" command="outdent" />
            <ToolbarButton icon="indent" command="indent" />

            <div className="w-px h-5 bg-slate-300 mx-1 shrink-0"></div>

            <ToolbarButton icon="alignLeft" command="justifyLeft" isActive={format.justifyLeft} />
            <ToolbarButton icon="alignCenter" command="justifyCenter" isActive={format.justifyCenter} />
            <ToolbarButton icon="alignRight" command="justifyRight" isActive={format.justifyRight} />
            <ToolbarButton icon="alignJustify" command="justifyFull" isActive={format.justifyFull} />
        </div>

        {/* Fixed File Tools Right Side (Won't get clipped by scroll) */}
        <div className="shrink-0 flex items-center gap-1.5 pl-2 ml-2 border-l border-slate-200 py-1.5" ref={exportMenuRef}>
            <input type="file" accept=".docx" ref={fileInputRef} onChange={handleImportDocx} className="hidden" />
            
            <button 
                onClick={() => fileInputRef.current?.click()} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
                title="Import DOCX"
            >
                <Icon name="upload" size={16} /> <span className="hidden sm:inline">Import</span>
            </button>
            
            <div className="relative">
                <button 
                    onClick={() => setShowExportMenu(!showExportMenu)} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
                >
                    <Icon name="fileDown" size={16} /> <span className="hidden sm:inline">Export</span> <Icon name="chevronDown" size={14} />
                </button>
                
                {showExportMenu && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl p-1.5 w-40 flex flex-col gap-1 z-[100] animate-slide-up origin-top-right">
                        <button onClick={handleExportDocx} className="text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-sm text-slate-700 font-medium transition-colors">Export .DOCX</button>
                        <button onClick={handleExportPdf} className="text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-sm text-slate-700 font-medium transition-colors">Export .PDF</button>
                        <button onClick={handleExportMd} className="text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-sm text-slate-700 font-medium transition-colors">Export .MD</button>
                    </div>
                )}
            </div>
        </div>

      </div>

      {/* FLUID EDITOR CANVAS */}
      <div 
        className="flex-1 w-full h-full editor-wrapper overflow-y-auto bg-white" 
        onClick={(e) => { if(e.target === e.currentTarget) editorRef.current?.focus(); }}
      >
        <div 
          ref={editorRef}
          contentEditable={true}
          onKeyUp={updateFormatState}
          onMouseUp={updateFormatState}
          onBlur={saveSelection}
          onInput={updateWordCount}
          className="docx-editor w-full h-full transition-all duration-300"
          suppressContentEditableWarning={true}
        ></div>
      </div>

      {/* BOTTOM STATUS BAR */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-1.5 flex justify-end items-center text-xs font-semibold text-slate-500 z-10 shrink-0 select-none tracking-wide">
        <span className="bg-slate-200/50 px-2 py-0.5 rounded-md">{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};

return WordEditorApp;
`;
