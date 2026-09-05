window.CanvasApps['DocExporter'] = `
const { useState, useEffect, useRef } = React;

const NL = String.fromCharCode(10);

const THEMES = {
  clean:    { name: 'Clean',         bodyFont: '"Inter", sans-serif',                        headingColor: '#0f172a', accent: '#2563eb', docxFont: 'Calibri' },
  elegant:  { name: 'Elegant Serif', bodyFont: '"Merriweather", Georgia, serif',              headingColor: '#1c1917', accent: '#b45309', docxFont: 'Georgia' },
  modern:   { name: 'Modern',        bodyFont: '"Inter", sans-serif',                         headingColor: '#4338ca', accent: '#4f46e5', docxFont: 'Calibri' },
  academic: { name: 'Academic',      bodyFont: '"Merriweather", "Times New Roman", serif',    headingColor: '#111827', accent: '#7f1d1d', docxFont: 'Times New Roman' }
};

const escapeHtml = (str) => str.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');

const txtToHtml = (text) => {
  const escaped = escapeHtml(text || '');
  const lines = escaped.split(NL);
  const paragraphs = [];
  let current = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      if (current.length) { paragraphs.push(current.join('<br/>')); current = []; }
    } else {
      current.push(line);
    }
  }
  if (current.length) paragraphs.push(current.join('<br/>'));
  return paragraphs.length ? paragraphs.map(p => '<p>' + p + '</p>').join('') : '';
};

const countWords = (str) => {
  if (!str) return 0;
  let count = 0; let inWord = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charAt(i);
    const isSpace = (ch === ' ' || ch === NL || ch === String.fromCharCode(9) || ch === String.fromCharCode(13));
    if (isSpace) { inWord = false; } else { if (!inWord) count++; inWord = true; }
  }
  return count;
};

const cleanBaseName = (title) => {
  let base = (title || 'Document').trim();
  const exts = ['.markdown', '.md', '.txt', '.docx', '.pdf', '.html'];
  for (let i = 0; i < exts.length; i++) {
    const ext = exts[i];
    if (base.toLowerCase().endsWith(ext)) { base = base.slice(0, base.length - ext.length); break; }
  }
  return base || 'Document';
};

const DocExporterApp = ({ data, onUpdate, instanceId, title }) => {
  const [content, setContent] = useState(data && data.fileData ? data.fileData : (data && data.content ? data.content : ''));
  const [fileType, setFileType] = useState((data && data.fileType) || 'md');
  const [html, setHtml] = useState('');
  const [themeKey, setThemeKey] = useState('clean');
  const [viewMode, setViewMode] = useState('split');
  const [splitRatio, setSplitRatio] = useState(50);
  const [isReady, setIsReady] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [notification, setNotification] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  const fileInputRef = useRef(null);
  const previewRef = useRef(null);
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const lastLoaded = useRef(null);

  const theme = THEMES[themeKey];

  useEffect(() => {
    if (onUpdate) onUpdate({ content: content, fileType: fileType, themeKey: themeKey });
  }, [content, fileType, themeKey]);

  useEffect(() => {
    if (data && data.fileData && data.fileData !== lastLoaded.current) {
      setContent(data.fileData);
      lastLoaded.current = data.fileData;
      const nm = ((data.title || title || '') + '').toLowerCase();
      setFileType(nm.endsWith('.txt') ? 'txt' : 'md');
    }
  }, [data && data.fileData]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let i = 0; i < entries.length; i++) {
        setIsCompact(entries[i].contentRect.width < 680);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const load = async () => {
      const addCss = (href) => {
        if (document.querySelector('link[href="' + href + '"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      };
      const addScript = (src) => new Promise((resolve) => {
        if (document.querySelector('script[src="' + src + '"]')) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      });
      addCss('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Merriweather:wght@400;700;900&display=swap');
      addCss('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
      try {
        await Promise.all([
          addScript('https://cdn.jsdelivr.net/npm/marked@12.0.1/lib/marked.umd.js'),
          addScript('https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.9/purify.min.js'),
          addScript('https://cdn.jsdelivr.net/npm/docx@7.8.2/build/index.js')
        ]);
      } catch (e) { console.error(e); }
      setIsReady(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!isReady || !window.marked || !window.DOMPurify) return;
    let raw;
    if (!content || !content.trim()) {
      raw = '<p style="opacity:0.5;font-style:italic;">Nothing to preview yet. Start typing, paste, or drop a .md / .txt file.</p>';
    } else if (fileType === 'txt') {
      raw = txtToHtml(content);
    } else {
      try { raw = window.marked.parse(content); } catch (e) { raw = '<p>Error parsing markdown.</p>'; }
    }
    setHtml(window.DOMPurify.sanitize(raw, { ADD_ATTR: ['style', 'class', 'target'] }));
  }, [content, fileType, isReady]);

  const showNotification = (msg, type) => {
    setNotification({ msg: msg, type: type || 'success' });
    setTimeout(() => setNotification(null), 2800);
  };

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.export-menu-wrapper')) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadFile = (file) => {
    if (!file) return;
    const parts = file.name.split('.');
    const ext = parts[parts.length - 1].toLowerCase();
    if (ext !== 'md' && ext !== 'markdown' && ext !== 'txt') {
      showNotification('Only .md and .txt files are supported.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setContent(e.target.result);
      setFileType(ext === 'txt' ? 'txt' : 'md');
      showNotification('Loaded ' + file.name);
    };
    reader.readAsText(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportRaw = () => {
    if (!content || !content.trim()) { showNotification('Nothing to export yet.', 'error'); return; }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, cleanBaseName(title) + '.' + (fileType === 'txt' ? 'txt' : 'md'));
    showNotification('Exported source file!');
  };

  const buildStyleBlock = () => (
    '<style>' +
    '@page { margin: 20mm; }' +
    'body { background:#fff; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }' +
    '.doc-body { font-family: ' + theme.bodyFont + '; color:#1e293b; line-height:1.7; max-width:800px; margin:0 auto; }' +
    '.doc-body h1,.doc-body h2,.doc-body h3,.doc-body h4 { color: ' + theme.headingColor + '; font-weight:800; margin-top:1.4em; margin-bottom:0.5em; line-height:1.25; }' +
    '.doc-body h1 { font-size:2.1em; border-bottom: 3px solid ' + theme.accent + '; padding-bottom:0.2em; }' +
    '.doc-body h2 { font-size:1.6em; }' +
    '.doc-body h3 { font-size:1.3em; }' +
    '.doc-body a { color: ' + theme.accent + '; text-decoration:none; }' +
    '.doc-body blockquote { border-left:4px solid ' + theme.accent + '; margin:0 0 16px; padding:6px 18px; background:#f8fafc; color:#475569; }' +
    '.doc-body code { font-family:"JetBrains Mono", monospace; background:rgba(0,0,0,0.06); padding:0.15em 0.4em; border-radius:4px; font-size:0.88em; }' +
    '.doc-body pre { background:#0f172a; color:#e2e8f0; padding:16px; border-radius:10px; overflow-x:auto; margin-bottom:1.2em; }' +
    '.doc-body pre code { background:transparent; color:inherit; padding:0; }' +
    '.doc-body table { border-collapse:collapse; width:100%; margin-bottom:1.4em; }' +
    '.doc-body th,.doc-body td { border:1px solid #cbd5e1; padding:10px 14px; }' +
    '.doc-body th { background: ' + theme.headingColor + '; color:#fff; }' +
    '.doc-body tr:nth-child(even) td { background:#f8fafc; }' +
    '.doc-body img { max-width:100%; border-radius:8px; }' +
    '.doc-body hr { border:none; border-top:2px solid #e2e8f0; margin:2em 0; }' +
    '.doc-body ul,.doc-body ol { padding-left:1.6em; margin-bottom:1em; }' +
    '</style>'
  );

  const exportPDF = () => {
    if (!content || !content.trim() || !previewRef.current) { showNotification('Nothing to export yet.', 'error'); return; }
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><title>' + cleanBaseName(title) + '</title>');
    doc.write('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Merriweather:wght@400;700;900&display=swap">');
    doc.write(buildStyleBlock());
    doc.write('</head><body><div class="doc-body">');
    doc.write(previewRef.current.innerHTML);
    doc.write('</div></body></html>');
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        showNotification('Print failed.', 'error');
      } finally {
        setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
      }
    }, 400);
  };

  const exportHTML = () => {
    if (!content || !content.trim()) { showNotification('Nothing to export yet.', 'error'); return; }
    const inner = previewRef.current ? previewRef.current.innerHTML : html;
    const full = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + cleanBaseName(title) + '</title>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Merriweather:wght@400;700;900&display=swap">' +
      buildStyleBlock() + '</head><body><div class="doc-body">' + inner + '</div></body></html>';
    const blob = new Blob([full], { type: 'text/html;charset=utf-8' });
    triggerDownload(blob, cleanBaseName(title) + '.html');
    showNotification('Exported styled .html file!');
  };

  const exportDOCX = async () => {
    if (!content || !content.trim()) { showNotification('Nothing to export yet.', 'error'); return; }
    if (!window.docx) { showNotification('DOCX engine still loading...', 'error'); return; }
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = window.docx;
      const headingHex = theme.headingColor.replace('#', '');
      const accentHex = theme.accent.replace('#', '');

      const buildRuns = (inline, opts) => {
        opts = opts || {};
        if (!inline) return [];
        let runs = [];
        inline.forEach((t) => {
          const o = Object.assign({ font: theme.docxFont }, opts);
          if (t.type === 'strong') o.bold = true;
          if (t.type === 'em') o.italics = true;
          if (t.type === 'del') o.strike = true;
          if (t.type === 'codespan') { o.font = 'Courier New'; o.shading = { type: 'clear', color: 'auto', fill: 'EFEFEF' }; }
          if (t.type === 'link') { o.color = accentHex; o.underline = { type: 'single' }; }
          if (t.tokens && t.tokens.length) {
            runs = runs.concat(buildRuns(t.tokens, o));
          } else {
            runs.push(new TextRun(Object.assign({ text: t.text || t.raw || '' }, o)));
          }
        });
        return runs;
      };

      const buildBlocks = (arr, level) => {
        level = level || 0;
        let out = [];
        arr.forEach((tok) => {
          if (tok.type === 'heading') {
            out.push(new Paragraph({ children: buildRuns(tok.tokens, { bold: true, color: headingHex }), heading: HeadingLevel['HEADING_' + tok.depth], spacing: { before: 240, after: 120 } }));
          } else if (tok.type === 'paragraph') {
            out.push(new Paragraph({ children: buildRuns(tok.tokens), spacing: { after: 200 } }));
          } else if (tok.type === 'blockquote') {
            out.push(new Paragraph({ children: buildRuns(tok.tokens, { italics: true, color: '555555' }), indent: { left: 720 }, spacing: { after: 200 } }));
          } else if (tok.type === 'list') {
            tok.items.forEach((item) => {
              let runs = [];
              let nested = [];
              item.tokens.forEach((it) => {
                if (it.type === 'text') runs = runs.concat(buildRuns(it.tokens || [{ type: 'text', raw: it.text }]));
                else nested = nested.concat(buildBlocks([it], level + 1));
              });
              out.push(new Paragraph({ children: runs, numbering: { reference: tok.ordered ? 'ord' : 'unord', level: level }, spacing: { after: 100 } }));
              out = out.concat(nested);
            });
          } else if (tok.type === 'table') {
            const rows = [];
            rows.push(new TableRow({ children: tok.header.map((c) => new TableCell({ children: [new Paragraph({ children: buildRuns(c.tokens, { bold: true, color: 'FFFFFF' }) })], shading: { fill: headingHex } })) }));
            tok.rows.forEach((r) => {
              rows.push(new TableRow({ children: r.map((c) => new TableCell({ children: [new Paragraph({ children: buildRuns(c.tokens) })] })) }));
            });
            out.push(new Table({ rows: rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
            out.push(new Paragraph({ text: '' }));
          } else if (tok.type === 'code') {
            const codeLines = tok.text.split(NL);
            codeLines.forEach((line) => {
              out.push(new Paragraph({ children: [new TextRun({ text: line, font: 'Courier New', size: 20 })], shading: { type: 'clear', color: 'auto', fill: 'EFEFEF' } }));
            });
            out.push(new Paragraph({ text: '' }));
          } else if (tok.type === 'hr') {
            out.push(new Paragraph({ thematicBreak: true, spacing: { before: 200, after: 200 } }));
          } else if (tok.type === 'space') {
            out.push(new Paragraph({ text: '' }));
          } else if (tok.raw && tok.type !== 'html' && tok.type !== 'text') {
            out.push(new Paragraph({ text: tok.raw }));
          }
        });
        return out;
      };

      let children;
      if (fileType === 'txt') {
        const lines = content.split(NL);
        children = lines.filter((l) => l.trim() !== '').map((l) => new Paragraph({ children: [new TextRun({ text: l, font: theme.docxFont })], spacing: { after: 200 } }));
      } else {
        const tokens = window.marked.lexer(content);
        children = buildBlocks(tokens);
      }

      const doc = new Document({
        numbering: {
          config: [
            { reference: 'unord', levels: Array.from({ length: 4 }).map((_, i) => ({ level: i, format: 'bullet', text: '\u2022', alignment: 'start', style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } } })) },
            { reference: 'ord', levels: Array.from({ length: 4 }).map((_, i) => ({ level: i, format: 'decimal', text: '%' + (i + 1) + '.', alignment: 'start', style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } } })) }
          ]
        },
        sections: [{ properties: {}, children: children.length ? children : [new Paragraph('Empty Document')] }]
      });

      const blob = await Packer.toBlob(doc);
      triggerDownload(blob, cleanBaseName(title) + '.docx');
      showNotification('Exported formatted .docx!');
    } catch (err) {
      console.error(err);
      showNotification('DOCX export failed.', 'error');
    }
  };

  const startDrag = (e) => { isDragging.current = true; e.preventDefault(); };
  const stopDrag = () => { isDragging.current = false; };
  const onDrag = (e) => {
    if (!isDragging.current || !containerRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = containerRef.current.getBoundingClientRect();
    let ratio;
    if (isCompact) ratio = ((clientY - rect.top) / rect.height) * 100;
    else ratio = ((clientX - rect.left) / rect.width) * 100;
    if (ratio < 12) { stopDrag(); setViewMode('preview'); setSplitRatio(50); return; }
    if (ratio > 88) { stopDrag(); setViewMode('edit'); setSplitRatio(50); return; }
    setSplitRatio(ratio);
  };
  useEffect(() => {
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', onDrag, { passive: false });
    window.addEventListener('touchend', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', onDrag);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [isCompact]);

  if (!isReady) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 dark:bg-zinc-950 flex-col gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 dark:text-zinc-400 font-medium">Loading Doc Exporter...</p>
      </div>
    );
  }

  const wordCount = countWords(content);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-zinc-950 overflow-hidden font-sans relative">
      <style dangerouslySetInnerHTML={{ __html:
        '.doc-preview { line-height:1.7; color:#1e293b; }' +
        '.dark .doc-preview { color:#e4e4e7; }' +
        '.doc-preview h1,.doc-preview h2,.doc-preview h3,.doc-preview h4 { font-weight:800; margin-top:1.3em; margin-bottom:0.5em; color: var(--heading-color); }' +
        '.doc-preview h1 { font-size:2em; border-bottom:3px solid var(--accent-color); padding-bottom:0.2em; }' +
        '.doc-preview h2 { font-size:1.55em; }' +
        '.doc-preview h3 { font-size:1.25em; }' +
        '.doc-preview p { margin-bottom:1em; }' +
        '.doc-preview a { color: var(--accent-color); }' +
        '.doc-preview blockquote { border-left:4px solid var(--accent-color); background:#f8fafc; padding:6px 16px; color:#475569; margin:0 0 1em; }' +
        '.dark .doc-preview blockquote { background:#18181b; color:#a1a1aa; }' +
        '.doc-preview code { font-family:"JetBrains Mono", monospace; background:rgba(0,0,0,0.06); padding:0.15em 0.4em; border-radius:4px; font-size:0.85em; }' +
        '.dark .doc-preview code { background:rgba(255,255,255,0.1); }' +
        '.doc-preview pre { background:#0f172a; color:#e2e8f0; padding:16px; border-radius:10px; overflow-x:auto; margin-bottom:1.2em; }' +
        '.doc-preview pre code { background:transparent; color:inherit; }' +
        '.doc-preview table { border-collapse:collapse; width:100%; margin-bottom:1.3em; }' +
        '.doc-preview th,.doc-preview td { border:1px solid #cbd5e1; padding:8px 12px; }' +
        '.dark .doc-preview th,.dark .doc-preview td { border-color:#3f3f46; }' +
        '.doc-preview th { background: var(--heading-color); color:#fff; }' +
        '.doc-preview tr:nth-child(even) td { background:#f8fafc; }' +
        '.dark .doc-preview tr:nth-child(even) td { background:#18181b; }' +
        '.doc-preview img { max-width:100%; border-radius:8px; }' +
        '.doc-preview ul,.doc-preview ol { padding-left:1.5em; margin-bottom:1em; }'
      }} />

      <header className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-3 py-2 flex items-center gap-2 flex-wrap flex-shrink-0 shadow-sm z-20">
        <div className="flex bg-slate-100 dark:bg-zinc-950 p-0.5 rounded-md border border-slate-200 dark:border-zinc-800">
          <button onClick={() => setViewMode('edit')} className={'px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 ' + (viewMode === 'edit' ? 'bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-zinc-400')}>
            <i className="fa-solid fa-pen"></i>{!isCompact && <span>Edit</span>}
          </button>
          <button onClick={() => setViewMode('split')} className={'px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 ' + (viewMode === 'split' ? 'bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-zinc-400')}>
            <i className="fa-solid fa-columns"></i>{!isCompact && <span>Split</span>}
          </button>
          <button onClick={() => setViewMode('preview')} className={'px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 ' + (viewMode === 'preview' ? 'bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-zinc-400')}>
            <i className="fa-solid fa-eye"></i>{!isCompact && <span>Preview</span>}
          </button>
        </div>

        <div className="flex items-center bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded overflow-hidden">
          <div className="px-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border-r border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 text-xs">
            <i className="fa-solid fa-palette"></i>
          </div>
          <select value={themeKey} onChange={(e) => setThemeKey(e.target.value)} className="bg-transparent text-xs font-semibold text-slate-700 dark:text-zinc-300 pl-2 pr-6 py-1.5 outline-none cursor-pointer">
            {Object.keys(THEMES).map((k) => <option key={k} value={k}>{THEMES[k].name}</option>)}
          </select>
        </div>

        <input type="file" accept=".md,.markdown,.txt" ref={fileInputRef} className="hidden" onChange={(e) => { loadFile(e.target.files[0]); e.target.value = ''; }} />
        <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded hover:bg-slate-50 dark:hover:bg-zinc-800">
          <i className="fa-solid fa-folder-open"></i>{!isCompact && <span>Open</span>}
        </button>

        <button onClick={() => { setContent(''); showNotification('Cleared.'); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded hover:bg-slate-50 dark:hover:bg-zinc-800">
          <i className="fa-solid fa-eraser"></i>{!isCompact && <span>Clear</span>}
        </button>

        <div className="flex-1"></div>

        <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 hidden sm:block">{wordCount} words</span>

        <div className="relative export-menu-wrapper">
          <button onClick={() => setExportOpen(!exportOpen)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm">
            <i className="fa-solid fa-file-export"></i><span>Export</span><i className="fa-solid fa-chevron-down text-[9px]"></i>
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-2xl overflow-hidden z-30 animate-slide-up">
              <button onClick={() => { exportPDF(); setExportOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-left">
                <i className="fa-solid fa-file-pdf text-red-500"></i> Export as PDF
              </button>
              <button onClick={() => { exportDOCX(); setExportOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-left border-t border-slate-100 dark:border-zinc-800">
                <i className="fa-solid fa-file-word text-blue-500"></i> Export as Word (.docx)
              </button>
              <button onClick={() => { exportHTML(); setExportOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-left border-t border-slate-100 dark:border-zinc-800">
                <i className="fa-solid fa-code text-amber-500"></i> Export as HTML
              </button>
              <button onClick={() => { exportRaw(); setExportOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-left border-t border-slate-100 dark:border-zinc-800">
                <i className="fa-solid fa-download text-slate-400"></i> Export Source ({fileType})
              </button>
            </div>
          )}
        </div>
      </header>

      {notification && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 animate-pop">
          <div className={'flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg text-xs font-semibold text-white ' + (notification.type === 'error' ? 'bg-red-500' : 'bg-green-500')}>
            <i className={'fa-solid ' + (notification.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check')}></i>
            {notification.msg}
          </div>
        </div>
      )}

      <main ref={containerRef} className={'flex-1 flex overflow-hidden min-h-0 min-w-0 relative ' + (isCompact ? 'flex-col' : 'flex-row')}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-40 bg-blue-600/10 border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
            <div className="bg-white dark:bg-zinc-900 px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2">
              <i className="fa-solid fa-cloud-arrow-up text-3xl text-blue-500"></i>
              <span className="font-bold text-slate-700 dark:text-zinc-200">Drop .md or .txt file</span>
            </div>
          </div>
        )}

        <div style={{ flexBasis: viewMode === 'split' ? (splitRatio + '%') : '100%', display: viewMode === 'preview' ? 'none' : 'flex' }} className="flex-shrink-0 flex flex-col bg-[#1e1e1e] min-h-0 min-w-0">
          <div className="flex items-center px-3 py-1.5 bg-[#252526] border-b border-[#333] text-gray-300 text-xs font-semibold flex-shrink-0">
            <i className="fa-solid fa-code mr-1.5"></i> Editor
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing markdown here, or drag and drop a .md / .txt file..."
            spellCheck="false"
            className="flex-1 w-full p-4 bg-[#1e1e1e] text-gray-200 font-mono text-sm resize-none outline-none min-h-0"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          />
        </div>

        {viewMode === 'split' && (
          <div
            className={'flex-none bg-slate-200 dark:bg-zinc-800 hover:bg-blue-400 dark:hover:bg-blue-600 flex items-center justify-center z-20 ' + (isCompact ? 'w-full h-3 cursor-row-resize' : 'w-2 h-full cursor-col-resize')}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
          >
            <div className={'bg-slate-400 dark:bg-zinc-600 rounded-full pointer-events-none ' + (isCompact ? 'w-8 h-1' : 'w-1 h-8')}></div>
          </div>
        )}

        <div style={{ flexBasis: viewMode === 'split' ? ((100 - splitRatio) + '%') : '100%', display: viewMode === 'edit' ? 'none' : 'flex' }} className="flex-shrink-0 flex flex-col bg-white dark:bg-zinc-950 min-h-0 min-w-0">
          <div className="flex items-center px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-semibold flex-shrink-0">
            <i className="fa-solid fa-eye mr-1.5"></i> Preview - {theme.name}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-6 md:p-10">
              <div
                ref={previewRef}
                className="doc-preview max-w-3xl mx-auto"
                style={{ fontFamily: theme.bodyFont, '--heading-color': theme.headingColor, '--accent-color': theme.accent }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

return DocExporterApp;
`;
