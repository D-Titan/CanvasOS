window.CanvasApps['MdEditor'] = `
const { useState, useEffect, useRef } = React;

const defaultMarkdown = "";

const MDEditorApp = ({ data, onUpdate, instanceId, title }) => {
    const [markdown, setMarkdown] = useState(data?.content || defaultMarkdown);
    const [htmlContent, setHtmlContent] = useState('');
    const[viewMode, setViewMode] = useState('split');
    const [notification, setNotification] = useState(null);
    const[splitRatio, setSplitRatio] = useState(50);
    const [isReady, setIsReady] = useState(false);
    
    // Strict & Intuitive Find & Replace State
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [matchMode, setMatchMode] = useState('smart'); // exact | smart | regex
    
    const [lastLoadedFile, setLastLoadedFile] = useState(null);
    
    const fileInputRef = useRef(null);
    const containerRef = useRef(null);
    const previewRef = useRef(null); 
    const editorRef = useRef(null);
    const isDragging = useRef(false);

    // Save state on change
    useEffect(() => {
        if (onUpdate && markdown !== defaultMarkdown) {
            onUpdate({ content: markdown });
        }
    },[markdown, onUpdate]);

    // Handle Injected File Data robustly
    useEffect(() => {
        if (data?.fileData && data.fileData !== lastLoadedFile) {
            setMarkdown(data.fileData);
            setLastLoadedFile(data.fileData);
        } else if (data?.content && !data?.fileData && markdown === defaultMarkdown) {
            setMarkdown(data.content);
        }
    },[data?.fileData, data?.content]);

    // --- Robust Dependency Loader ---
    useEffect(() => {
        const loadDependencies = async () => {
            const addCss = (href) => {
                if (document.querySelector('link[href="' + href + '"]')) return;
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                document.head.appendChild(link);
            };

            const addScript = (src) => new Promise((resolve, reject) => {
                if (document.querySelector('script[src="' + src + '"]')) return resolve();
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = resolve;
                script.onerror = () => {
                    console.error('Failed to load:', src);
                    reject(new Error('Failed to load ' + src));
                };
                document.head.appendChild(script);
            });

            // Modern standard fonts including Google Sans Code
            addCss('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Google+Sans+Code:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap');
            addCss('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
            addCss('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css');
            addCss('https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css');

            try {
                // FIXED: Pinned explicit versions and absolute paths for Marked v12+ UMD modules
                await Promise.all([
                    addScript('https://cdn.jsdelivr.net/npm/marked@12.0.1/lib/marked.umd.js'),
                    addScript('https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.9/purify.min.js'),
                    addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js'),
                    addScript('https://cdn.jsdelivr.net/npm/docx@7.8.2/build/index.js'),
                    addScript('https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js')
                ]);

                await Promise.all([
                    addScript('https://cdn.jsdelivr.net/npm/marked-katex-extension@5.1.7/lib/index.umd.js'),
                    addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js'),
                    addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js'),
                    addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js'),
                    addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js')
                ]);

                if (window.Prism && window.Prism.plugins && window.Prism.plugins.autoloader) {
                    window.Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';
                }

                if (window.marked && window.markedKatex) {
                    const extension = typeof window.markedKatex === 'function' ? window.markedKatex : window.markedKatex.default;
                    if (extension) {
                        window.marked.use(extension({ throwOnError: false }));
                    }
                }
                
                setIsReady(true);
            } catch (err) {
                console.error("Failed to load core scripts:", err);
                showNotification("Failed to load some editor components.", "error");
                // Allow it to be ready anyway so user isn't stuck
                setIsReady(true); 
            }
        };

        loadDependencies();
    },[]);

    // --- Markdown Parsing & Injecting Collapsible Code Headers ---
    useEffect(() => {
        if (!isReady || !window.marked || !window.DOMPurify) return;
        try {
            // Pre-process AI-generated Math wrappers into standard $ and $$ formats
            let textToParse = markdown
                .replace(/\\\\\\(([\\s\\S]*?)\\\\\\)/g, '$$$1$$')  
                .replace(/\\\\\\[([\\s\\S]*?)\\\\\\]/g, '$$$$$1$$$$');

            const rawHtml = window.marked.parse(textToParse);
            
            // Allow DOMPurify to safely process KaTeX MathML and necessary stylistic classes
            const cleanHtml = window.DOMPurify.sanitize(rawHtml, { 
                ADD_ATTR:['target', 'aria-hidden', 'class', 'style'],
                USE_PROFILES: { html: true, mathMl: true }
            });

            setHtmlContent(cleanHtml);
            
            setTimeout(() => { 
                if (window.Prism) window.Prism.highlightAll(); 
                
                const preBlocks = document.querySelectorAll('.markdown-body pre');
                preBlocks.forEach(pre => {
                    if (pre.parentElement.classList.contains('code-block-wrapper')) return;

                    let lang = 'Text';
                    const codeNode = pre.querySelector('code');
                    if (codeNode && codeNode.className) {
                        const match = codeNode.className.match(/language-(\\w+)/);
                        if (match) {
                            const rawLang = match[1];
                            const langMap = {
                                js: 'JavaScript', javascript: 'JavaScript',
                                ts: 'TypeScript', typescript: 'TypeScript',
                                html: 'HTML', css: 'CSS', 
                                py: 'Python', python: 'Python',
                                gdscript: 'GDScript',
                                cpp: 'C++', c: 'C', csharp: 'C#', cs: 'C#',
                                java: 'Java', json: 'JSON', xml: 'XML',
                                bash: 'Bash', sh: 'Shell', sql: 'SQL',
                                md: 'Markdown', yaml: 'YAML', yml: 'YAML',
                                go: 'Go', rust: 'Rust', rb: 'Ruby',
                                jsx: 'JSX', tsx: 'TSX'
                            };
                            lang = langMap[rawLang.toLowerCase()] || rawLang.charAt(0).toUpperCase() + rawLang.slice(1).toLowerCase();
                        }
                    }

                    const wrapper = document.createElement('div');
                    wrapper.className = 'code-block-wrapper relative my-6 border border-slate-200 rounded-xl shadow-sm overflow-hidden';
                    pre.parentNode.insertBefore(wrapper, pre);
                    
                    const header = document.createElement('div');
                    header.className = 'flex items-center justify-between px-4 py-2 bg-[#1e293b] text-slate-200 cursor-pointer select-none transition-colors hover:bg-slate-800';
                    
                    header.onclick = (e) => {
                        if(e.target.closest('.code-copy-btn')) return;
                        const content = wrapper.querySelector('.code-content');
                        const icon = header.querySelector('.toggle-icon');
                        content.classList.toggle('hidden');
                        icon.classList.toggle('fa-chevron-right');
                        icon.classList.toggle('fa-chevron-down');
                    };

                    const leftGroup = document.createElement('div');
                    leftGroup.className = 'flex items-center gap-2.5';
                    leftGroup.innerHTML = \`<i class="fa-solid fa-chevron-down toggle-icon text-[10px] text-slate-400"></i> <span class="text-xs font-semibold tracking-wide text-slate-100 font-sans">\${lang}</span>\`;

                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'code-copy-btn flex items-center gap-1.5 text-[10px] font-semibold text-slate-200 hover:text-white transition-colors bg-white/10 hover:bg-white/25 px-2 py-1 rounded-lg active:scale-95';
                    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>Copy</span>';
                    
                    copyBtn.onclick = (e) => {
                        e.stopPropagation();
                        const code = codeNode?.innerText || '';
                        const textarea = document.createElement('textarea');
                        textarea.value = code;
                        document.body.appendChild(textarea);
                        textarea.select();
                        try {
                            document.execCommand('copy');
                            copyBtn.innerHTML = '<i class="fa-solid fa-check text-green-400"></i> <span class="text-green-400">Copied!</span>';
                            copyBtn.classList.replace('bg-white/10', 'bg-green-500/20');
                            setTimeout(() => { 
                                copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>Copy</span>'; 
                                copyBtn.classList.replace('bg-green-500/20', 'bg-white/10');
                            }, 2000);
                        } catch (err) {
                            console.error('Copy failed', err);
                        } finally {
                            document.body.removeChild(textarea);
                        }
                    };

                    header.appendChild(leftGroup);
                    header.appendChild(copyBtn);
                    
                    const contentWrapper = document.createElement('div');
                    contentWrapper.className = 'code-content transition-all bg-[#f8fafc]';
                    
                    pre.classList.add('!m-0', '!border-0', '!rounded-none', '!shadow-none');
                    
                    contentWrapper.appendChild(pre);
                    wrapper.appendChild(header);
                    wrapper.appendChild(contentWrapper);
                });
            }, 10);
        } catch (err) {
            console.error("Parsing error:", err);
        }
    },[markdown, isReady]);

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand("insertText", false, "    ");
        }
    };

    const handleChange = (e) => {
        setMarkdown(e.target.value);
    };

    // --- Strict & Intuitive Find & Replace Engine ---
    const executeReplaceAll = () => {
        if (!findText) return;
        try {
            let searchPattern = findText;
            let finalReplaceText = replaceText;

            if (matchMode === 'exact') {
                searchPattern = findText.replace(/[.*+?^\\$\\{}()|[\\]\\\\]/g, '\\\\$&');
            } else if (matchMode === 'smart') {
                // 1. Temporarily replace strict placeholders with unique tokens
                searchPattern = searchPattern.split('{NUMBER}').join('__NUM__');
                searchPattern = searchPattern.split('{WORD}').join('__WRD__');
                searchPattern = searchPattern.split('{ANY}').join('__ANY__');
                
                // 2. Escape all remaining regex characters
                searchPattern = searchPattern.replace(/[.*+?^\\$\\{}()|[\\]\\\\]/g, '\\\\$&');
                
                // 3. Inject actual regex capture groups back into the tokens
                searchPattern = searchPattern.split('__NUM__').join('(\\\\d+)');
                searchPattern = searchPattern.split('__WRD__').join('([A-Za-z]+)');
                searchPattern = searchPattern.split('__ANY__').join('(.*?)');
                
                // 4. Make spaces flexible so users don't have to guess spacing
                searchPattern = searchPattern.replace(/ /g, '\\\\s*');
                
                // 5. Convert user replacement {1} to actual regex replacement $1 safely
                finalReplaceText = replaceText.replace(/\\{(\\d+)\\}/g, (match, p1) => '$' + p1);
            }
            
            const regex = new RegExp(searchPattern, 'g');
            const matchCount = (markdown.match(regex) ||[]).length;
            
            if (matchCount === 0) {
                showNotification("No matches found.", "error");
                return;
            }

            const newMd = markdown.replace(regex, finalReplaceText);
            setMarkdown(newMd);
            showNotification(\`Replaced \${matchCount} occurrence(s).\`);
        } catch(e) {
            showNotification("Invalid pattern.", "error");
        }
    };


    // --- Drag & Resize Logic ---
    const startDrag = (e) => {
        isDragging.current = true;
        e.preventDefault(); 
    };

    const stopDrag = () => {
        isDragging.current = false;
    };

    const onDrag = (e) => {
        if (!isDragging.current || !containerRef.current) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = containerRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            let ratio = ((clientY - rect.top) / rect.height) * 100;
            if (ratio < 10) { stopDrag(); setViewMode('preview'); setSplitRatio(50); return; }
            if (ratio > 90) { stopDrag(); setViewMode('edit'); setSplitRatio(50); return; }
            setSplitRatio(ratio);
        } else {
            let ratio = ((clientX - rect.left) / rect.width) * 100;
            if (ratio < 10) { stopDrag(); setViewMode('preview'); setSplitRatio(50); return; }
            if (ratio > 90) { stopDrag(); setViewMode('edit'); setSplitRatio(50); return; }
            setSplitRatio(ratio);
        }
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
    },[]);

    // --- Exporters ---
    const getCleanFilename = (extension) => {
        let baseName = (title || 'Document').trim();
        baseName = baseName.replace(/\\.(md|txt|json|docx|pdf)$/i, '');
        return \`\${baseName}.\${extension}\`;
    };

    const showNotification = (msg, type = "success") => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
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

    const exportMD = () => {
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        triggerDownload(blob, getCleanFilename('md'));
        showNotification("Exported as .md successfully!");
    };

    const exportPDF = () => {
        if (!previewRef.current) return;
        
        const printContainer = document.createElement('div');
        printContainer.id = 'temp-print-container';
        printContainer.innerHTML = '<div class="markdown-body">' + previewRef.current.innerHTML + '</div>';
        document.body.appendChild(printContainer);

        const printStyle = document.createElement('style');
        printStyle.id = 'temp-print-style';
        
        printStyle.innerHTML = 
            '@media screen { ' +
            '  #temp-print-container { display: none !important; } ' +
            '} ' +
            '@media print { ' +
            '  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; } ' +
            '  body > *:not(#temp-print-container) { display: none !important; } ' +
            '  #temp-print-container { display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white !important; color: black !important; padding: 15mm !important; box-sizing: border-box !important; } ' +
            '  .code-copy-btn, .toggle-icon { display: none !important; } ' +
            '  .code-content { display: block !important; } ' + // Force expand code blocks on print
            '  .code-header-sticky { position: static !important; border-bottom: 1px solid #475569 !important; } ' +
            '  .code-block-wrapper { page-break-inside: avoid; break-inside: avoid; margin-bottom: 24px; } ' +
            '  pre { margin-top: 0 !important; page-break-inside: avoid; break-inside: avoid; } ' +
            '  @page { margin: 0mm; size: auto; } ' +
            '}';
            
        document.head.appendChild(printStyle);

        setTimeout(() => {
            window.print();
            document.body.removeChild(printContainer);
            document.head.removeChild(printStyle);
        }, 150); 
    };

    const exportDOCX = async () => {
        if (!window.docx) {
            showNotification("DOCX library is still loading.", "error");
            return;
        }

        try {
            const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = window.docx;
            const tokens = window.marked.lexer(markdown);

            const buildTextRuns = (inlineTokens, formatOpts = {}) => {
                if (!inlineTokens) return[];
                let runs =[];
                inlineTokens.forEach(t => {
                    const currentOpts = { ...formatOpts };
                    if (t.type === 'strong') currentOpts.bold = true;
                    if (t.type === 'em') currentOpts.italics = true;
                    if (t.type === 'del') currentOpts.strike = true;
                    if (t.type === 'codespan') {
                        currentOpts.font = "Courier New";
                        currentOpts.shading = { type: "clear", color: "auto", fill: "EFEFEF" };
                    }
                    if (t.type === 'link') {
                        currentOpts.color = "0563C1";
                        currentOpts.underline = { type: "single" };
                    }

                    if (t.tokens && t.tokens.length > 0) {
                        runs.push(...buildTextRuns(t.tokens, currentOpts));
                    } else {
                        const rawText = t.text || t.raw || "";
                        runs.push(new TextRun({ text: rawText, ...currentOpts }));
                    }
                });
                return runs;
            };

            const processBlockTokens = (tokensArray, listLevel = 0) => {
                let blocks =[];
                tokensArray.forEach(token => {
                    switch (token.type) {
                        case 'heading':
                            blocks.push(new Paragraph({ children: buildTextRuns(token.tokens), heading: HeadingLevel['HEADING_' + token.depth], spacing: { before: 240, after: 120 } }));
                            break;
                        case 'paragraph':
                            blocks.push(new Paragraph({ children: buildTextRuns(token.tokens), spacing: { after: 200 } }));
                            break;
                        case 'blockquote':
                            blocks.push(new Paragraph({ children: buildTextRuns(token.tokens, { italics: true, color: "555555" }), indent: { left: 720 }, spacing: { after: 200 } }));
                            break;
                        case 'list':
                            token.items.forEach(item => {
                                let itemRuns = [];
                                let nestedBlocks =[];
                                item.tokens.forEach(itemToken => {
                                    if (itemToken.type === 'text') itemRuns.push(...buildTextRuns(itemToken.tokens ||[{type: 'text', raw: itemToken.text}]));
                                    else nestedBlocks.push(...processBlockTokens([itemToken], listLevel + 1));
                                });
                                blocks.push(new Paragraph({ children: itemRuns, numbering: { reference: token.ordered ? "ordered-list" : "unordered-list", level: listLevel }, spacing: { after: 100 } }));
                                blocks.push(...nestedBlocks);
                            });
                            break;
                        case 'table':
                            const tableRows =[];
                            tableRows.push(new TableRow({ children: token.header.map(cell => new TableCell({ children:[new Paragraph({ children: buildTextRuns(cell.tokens), bold: true })], shading: { fill: "F3F4F6" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } })) }));
                            token.rows.forEach(row => {
                                tableRows.push(new TableRow({ children: row.map(cell => new TableCell({ children:[new Paragraph({ children: buildTextRuns(cell.tokens) })], margins: { top: 100, bottom: 100, left: 100, right: 100 } })) }));
                            });
                            blocks.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
                            blocks.push(new Paragraph({ text: "" }));
                            break;
                        case 'hr':
                            blocks.push(new Paragraph({ thematicBreak: true, spacing: { before: 200, after: 200 } }));
                            break;
                        case 'code':
                            token.text.split('\\n').forEach(line => blocks.push(new Paragraph({ children:[new TextRun({ text: line, font: "Courier New", size: 20 })], spacing: { after: 0, before: 0 }, shading: { type: "clear", color: "auto", fill: "EFEFEF" } })));
                            blocks.push(new Paragraph({ text: "" }));
                            break;
                        case 'space':
                            blocks.push(new Paragraph({ text: "" }));
                            break;
                        default:
                            if (token.raw && token.type !== 'html' && token.type !== 'text') blocks.push(new Paragraph({ text: token.raw }));
                    }
                });
                return blocks;
            };

            const docChildren = processBlockTokens(tokens);

            const doc = new Document({
                numbering: {
                    config:[
                        { reference: "unordered-list", levels: Array.from({ length: 6 }).map((_, i) => ({ level: i, format: "bullet", text: i % 2 === 0 ? "•" : "◦", alignment: "start", style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } } })) },
                        { reference: "ordered-list", levels: Array.from({ length: 6 }).map((_, i) => ({ level: i, format: i % 2 === 0 ? "decimal" : "lowerLetter", text: '%' + (i + 1) + '.', alignment: "start", style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } } })) }
                    ]
                },
                sections:[{ properties: {}, children: docChildren.length > 0 ? docChildren : [new Paragraph("Empty Document")] }]
            });

            const blob = await Packer.toBlob(doc);
            triggerDownload(blob, getCleanFilename('docx'));
            showNotification("Exported as formatted .docx successfully!");

        } catch (error) {
            console.error(error);
            showNotification("Failed to generate DOCX file.", "error");
        }
    };

    if (!isReady) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-50 flex-col gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-600 font-medium font-sans">Booting Editor Engines...</p>
            </div>
        );
    }

    return (
        <div id="app-container" className="flex flex-col h-full w-full bg-slate-50 overflow-hidden font-sans">
            
            <style dangerouslySetInnerHTML={{__html: 
                '.markdown-body { font-family: "Inter", -apple-system, sans-serif; line-height: 1.6; color: #333; } ' +
                '.markdown-body h1, .markdown-body h2, .markdown-body h3 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; margin-top: 24px; margin-bottom: 16px; font-weight: 600; font-family: "Inter", sans-serif; } ' +
                '.markdown-body h1 { font-size: 2em; } ' +
                '.markdown-body h2 { font-size: 1.5em; } ' +
                '.markdown-body p { margin-top: 0; margin-bottom: 16px; } ' +
                '.markdown-body a { color: #0366d6; text-decoration: none; } ' +
                '.markdown-body a:hover { text-decoration: underline; } ' +
                '.markdown-body ul, .markdown-body ol { padding-left: 2em; margin-bottom: 16px; list-style-type: disc; } ' +
                '.markdown-body ol { list-style-type: decimal; } ' +
                '.markdown-body li { margin-bottom: 0.25em; } ' +
                '.markdown-body blockquote { margin: 0 0 16px; padding: 0 1em; color: #6a737d; border-left: 0.25em solid #dfe2e5; background: #f9fafb; padding-block: 8px;} ' +
                '.markdown-body code { font-family: "Google Sans Code", ui-monospace, Consolas, monospace !important; font-size: 85%; background-color: rgba(27,31,35,0.05); padding: 0.2em 0.4em; border-radius: 3px; } ' +
                '.markdown-body pre { background-color: #f8fafc; color: #334155; border-radius: 8px; padding: 16px; overflow: auto; border: 1px solid #e2e8f0; position: relative; z-index: 0; } ' +
                '.markdown-body pre code { background-color: transparent; padding: 0; display: block; overflow-x: auto; color: inherit; font-size: 13.5px; font-family: "Google Sans Code", ui-monospace, Consolas, monospace !important;} ' +
                '.markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 16px; } ' +
                '.markdown-body table th, .markdown-body table td { border: 1px solid #dfe2e5; padding: 6px 13px; } ' +
                '.markdown-body table tr:nth-child(2n) { background-color: #f6f8fa; } ' +
                '.markdown-body hr { height: 0.25em; padding: 0; margin: 24px 0; background-color: #e1e4e8; border: 0; } ' +
                '::-webkit-scrollbar { width: 8px; height: 8px; } ' +
                '::-webkit-scrollbar-track { background: transparent; } ' +
                '::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } ' +
                '.editor-textarea::-webkit-scrollbar-thumb { background: #4b5563; }'
            }} />

            <header className="bg-white border-b border-slate-200 shadow-sm px-3 py-1 flex flex-row items-center justify-between gap-3 no-print z-10 flex-shrink-0 overflow-x-auto whitespace-nowrap">
                <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 flex-shrink-0">
                    <button onClick={() => {setViewMode('edit'); setSplitRatio(50);}} className={'flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-colors ' + (viewMode === 'edit' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900')}>
                        <i className="fa-solid fa-pen"></i> <span>Edit</span>
                    </button>
                    <button onClick={() => {setViewMode('split'); setSplitRatio(50);}} className={'flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-colors ' + (viewMode === 'split' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900')}>
                        <i className="fa-solid fa-columns"></i> <span>Split</span>
                    </button>
                    <button onClick={() => {setViewMode('preview'); setSplitRatio(50);}} className={'flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-colors ' + (viewMode === 'preview' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900')}>
                        <i className="fa-solid fa-eye"></i> <span>Preview</span>
                    </button>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => setShowFindReplace(!showFindReplace)} className={\`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors \${showFindReplace ? 'bg-blue-100 text-blue-700' : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'}\`}>
                        <i className="fa-solid fa-magnifying-glass"></i> <span className="hidden sm:inline">Find/Replace</span>
                    </button>
                    
                    <div className="h-4 w-px bg-slate-300 mx-0.5"></div>

                    <input type="file" accept=".md,.txt" ref={fileInputRef} onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => { setMarkdown(ev.target.result); showNotification("Imported!"); };
                        reader.readAsText(file); e.target.value = '';
                    }} className="hidden" />
                    
                    <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50">
                        <i className="fa-solid fa-upload"></i> <span className="hidden sm:inline">Import</span>
                    </button>

                    <button onClick={exportMD} className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50">
                        <i className="fa-solid fa-download"></i> <span>.MD</span>
                    </button>
                    <button onClick={exportPDF} className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50">
                        <i className="fa-solid fa-print"></i> <span>.PDF</span>
                    </button>
                    <button onClick={exportDOCX} className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded">
                        <i className="fa-solid fa-file-word"></i> <span>.DOCX</span>
                    </button>
                </div>
            </header>

            {notification && (
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50 animate-bounce no-print">
                    <div className={'flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg text-xs font-medium text-white ' + (notification.type === 'error' ? 'bg-red-500' : 'bg-green-500')}>
                        {notification.type === 'error' ? <i className="fa-solid fa-circle-exclamation"></i> : <i className="fa-solid fa-circle-check"></i>}
                        {notification.msg}
                    </div>
                </div>
            )}

            <main ref={containerRef} className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 min-w-0 relative">
                
                <div 
                    id="editor-pane" 
                    style={{ flexBasis: viewMode === 'split' ? (splitRatio + '%') : '100%', display: viewMode === 'preview' ? 'none' : 'flex' }} 
                    className="flex-shrink-0 flex flex-col bg-[#1e1e1e] border-r border-[#333] min-h-0 min-w-0 relative"
                >
                    <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-[#333] flex-shrink-0">
                        <span className="text-gray-300 font-medium text-xs flex items-center gap-1.5">
                            <i className="fa-solid fa-code"></i> Editor
                        </span>
                        {viewMode === 'split' && (
                            <button onClick={() => setViewMode('preview')} className="text-gray-400 hover:text-white transition-colors p-0.5" title="Close Editor">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        )}
                    </div>

                    {/* Strict & Intuitive Find & Replace Engine */}
                    {showFindReplace && (
                        <div className="absolute top-8 right-4 w-80 bg-white shadow-2xl rounded-xl border border-slate-200 z-40 p-3 animate-slide-up flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700">Find & Replace</span>
                                <button onClick={() => setShowFindReplace(false)} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>
                            </div>
                            
                            <div className="flex bg-slate-100 p-1 rounded-md text-xs">
                                <button onClick={() => setMatchMode('exact')} className={\`flex-1 py-1 rounded \${matchMode === 'exact' ? 'bg-white shadow-sm font-bold text-blue-600' : 'text-slate-600 hover:text-slate-900'}\`}>Exact</button>
                                <button onClick={() => setMatchMode('smart')} className={\`flex-1 py-1 rounded \${matchMode === 'smart' ? 'bg-white shadow-sm font-bold text-blue-600' : 'text-slate-600 hover:text-slate-900'}\`}>Smart</button>
                                <button onClick={() => setMatchMode('regex')} className={\`flex-1 py-1 rounded \${matchMode === 'regex' ? 'bg-white shadow-sm font-bold text-blue-600' : 'text-slate-600 hover:text-slate-900'}\`}>Regex</button>
                            </div>
                            
                            <input 
                                type="text" placeholder="Find..." value={findText} onChange={e => setFindText(e.target.value)} 
                                className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 font-mono"
                            />
                            
                            <input 
                                type="text" placeholder="Replace with..." value={replaceText} onChange={e => setReplaceText(e.target.value)} 
                                className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 font-mono"
                            />
                            
                            <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200 leading-relaxed">
                                {matchMode === 'exact' && "Finds the exact text you type."}
                                {matchMode === 'smart' && <><b>Smart Match:</b> Use <code>{'{NUMBER}'}</code>, <code>{'{WORD}'}</code>, or <code>{'{ANY}'}</code> as wildcards.<br/>Ex: <code>[cite: {'{NUMBER}'}]</code> finds <code>[cite: 12]</code>.<br/>Use <code>{'{1}'}</code>, <code>{'{2}'}</code> in Replace to insert matched wildcards.</>}
                                {matchMode === 'regex' && <><b>Regex:</b> <code>\\d+</code> (numbers), <code>\\w+</code> (words), <code>(.*?)</code> (capture anything). Use <code>$1</code> to replace.</>}
                            </div>
                            
                            <div className="flex items-center justify-end mt-1">
                                <button onClick={executeReplaceAll} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-sm transition-colors">
                                    Replace All
                                </button>
                            </div>
                        </div>
                    )}

                    <textarea
                        ref={editorRef}
                        className="flex-1 w-full p-3 bg-[#1e1e1e] text-gray-200 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-y-auto min-h-0 editor-textarea"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        value={markdown}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your markdown here..."
                        spellCheck="false"
                    />
                </div>

                {viewMode === 'split' && (
                    <div 
                        className="drag-handle flex-none bg-slate-200 hover:bg-blue-400 w-full h-3 md:w-2 md:h-full transition-colors z-20 flex items-center justify-center cursor-row-resize md:cursor-col-resize active:bg-blue-500"
                        onMouseDown={startDrag}
                        onTouchStart={startDrag}
                    >
                        <div className="bg-slate-400 rounded-full w-8 h-1 md:w-1 md:h-8 pointer-events-none"></div>
                    </div>
                )}

                <div 
                    id="preview-pane" 
                    style={{ flexBasis: viewMode === 'split' ? ((100 - splitRatio) + '%') : '100%', display: viewMode === 'edit' ? 'none' : 'flex' }} 
                    className="flex-shrink-0 flex flex-col bg-white min-h-0 min-w-0"
                >
                    <div className="flex items-center justify-between px-3 py-1 bg-slate-50 border-b border-slate-200 no-print flex-shrink-0">
                        <span className="text-slate-600 font-medium text-xs flex items-center gap-1.5">
                            <i className="fa-solid fa-eye"></i> Live Preview
                        </span>
                        {viewMode === 'split' && (
                            <button onClick={() => setViewMode('edit')} className="text-slate-400 hover:text-slate-800 transition-colors p-0.5" title="Close Preview">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0 min-w-0 print-scroll-fix relative bg-white">
                        <div className="p-4 md:p-6">
                            <div ref={previewRef} className="markdown-body max-w-4xl mx-auto" dangerouslySetInnerHTML={{ __html: htmlContent }} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

return MDEditorApp;
`;
