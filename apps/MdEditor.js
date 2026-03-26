window.CanvasApps['MdEditor'] = `
const { useState, useEffect, useRef } = React;

const defaultMarkdown = "";

const MDEditorApp = ({ data, onUpdate, instanceId }) => {
    const [markdown, setMarkdown] = useState(data?.content || defaultMarkdown);
    const [htmlContent, setHtmlContent] = useState('');
    const [viewMode, setViewMode] = useState('split');
    const [notification, setNotification] = useState(null);
    const [splitRatio, setSplitRatio] = useState(50);
    const [isReady, setIsReady] = useState(false);
    
    const fileInputRef = useRef(null);
    const containerRef = useRef(null);
    // NEW: We need a reference to the live preview to capture colors and headers for printing
    const previewRef = useRef(null); 
    const isDragging = useRef(false);

    // Save state on change
    useEffect(() => {
        if (onUpdate && markdown !== defaultMarkdown) {
            onUpdate({ content: markdown });
        }
    }, [markdown, onUpdate]);

    useEffect(() => {
        // If the OS passes raw text file data, inject it into the editor
        if (data?.fileData) {
            setMarkdown(data.fileData);
        } else if (data?.content) {
            setMarkdown(data.content);
        }
    }, [data?.fileData, data?.content]);

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
                script.onerror = reject;
                document.head.appendChild(script);
            });

            addCss('https://fonts.googleapis.com/css2?family=Google+Sans+Code:wght@400;500;700&display=swap');
            addCss('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
            addCss('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css');

            try {
                await Promise.all([
                    addScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js'),
                    addScript('https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.9/purify.min.js'),
                    addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js'),
                    addScript('https://cdn.jsdelivr.net/npm/docx@7.8.2/build/index.js')
                ]);

                await Promise.all([
                    addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js'),
                    addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js'),
                    addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js'),
                    addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js')
                ]);

                if (window.Prism && window.Prism.plugins && window.Prism.plugins.autoloader) {
                    window.Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';
                }
                
                setIsReady(true);
            } catch (err) {
                console.error("Failed to load core scripts:", err);
                showNotification("Failed to load editor components.", "error");
            }
        };

        loadDependencies();
    }, []);

    // --- Markdown Parsing & Injecting Sticky Code Headers ---
    useEffect(() => {
        if (!isReady || !window.marked || !window.DOMPurify) return;
        try {
            const rawHtml = window.marked.parse(markdown);
            const cleanHtml = window.DOMPurify.sanitize(rawHtml);
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
                    wrapper.className = 'code-block-wrapper relative my-6';
                    pre.parentNode.insertBefore(wrapper, pre);

                    const stickyMask = document.createElement('div');
                    stickyMask.className = 'code-header-sticky sticky top-[0px] z-30 w-full bg-white pt-1';
                    
                    const header = document.createElement('div');
                    header.className = 'flex items-center justify-between px-4 py-1.5 bg-[#1e293b] text-slate-200 rounded-t-xl rounded-b-none shadow-sm';
                    
                    const langLabel = document.createElement('span');
                    langLabel.className = 'text-xs font-semibold tracking-wide text-slate-200 font-sans';
                    langLabel.innerText = lang;

                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'code-copy-btn flex items-center gap-1.5 text-[10px] font-semibold text-slate-200 hover:text-white transition-colors bg-white/10 hover:bg-white/25 px-2 py-1 rounded-lg active:scale-95';
                    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>Copy</span>';
                    
                    copyBtn.onclick = () => {
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

                    header.appendChild(langLabel);
                    header.appendChild(copyBtn);
                    stickyMask.appendChild(header);
                    
                    pre.classList.add('!mt-0', 'shadow-sm', '!rounded-b-xl', '!rounded-t-none', '!border-t-0');
                    
                    wrapper.appendChild(stickyMask);
                    wrapper.appendChild(pre);
                });
            }, 10);
        } catch (err) {
            console.error("Parsing error:", err);
        }
    }, [markdown, isReady]);

    // --- INTELLIGENT TEXT EDITING (Scroll Position Locked) ---
    const handleKeyDown = (e) => {
        const textarea = e.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const scrollTop = textarea.scrollTop;
        const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '*': '*', '_': '_', '~': '~' };

        if (e.key === 'Backspace' && start === end && start > 0) {
            const prevChar = markdown[start - 1];
            const nextChar = markdown[start];
            if (pairs[prevChar] && pairs[prevChar] === nextChar) {
                e.preventDefault();
                setMarkdown(markdown.substring(0, start - 1) + markdown.substring(end + 1));
                setTimeout(() => { 
                    textarea.selectionStart = textarea.selectionEnd = start - 1; 
                    textarea.scrollTop = scrollTop;
                }, 0);
            }
        }

        if (pairs[e.key] && start !== end) {
            e.preventDefault();
            const selectedText = markdown.substring(start, end);
            setMarkdown(markdown.substring(0, start) + e.key + selectedText + pairs[e.key] + markdown.substring(end));
            setTimeout(() => {
                textarea.selectionStart = start + 1;
                textarea.selectionEnd = start + 1 + selectedText.length;
                textarea.scrollTop = scrollTop;
            }, 0);
        }
    };

    const handleChange = (e) => {
        const textarea = e.target;
        const val = textarea.value;
        const start = textarea.selectionStart;
        const scrollTop = textarea.scrollTop;
        const inputType = e.nativeEvent.inputType;
        const data = e.nativeEvent.data;

        const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '*': '*', '_': '_', '~': '~' };
        const stepOverChars = [')', ']', '}']; 

        if (inputType === 'insertText' && data !== null && data.length === 1) {
            if (data === '>') {
                const textBeforeCursor = val.substring(0, start);
                const tagMatch = textBeforeCursor.match(/<([a-zA-Z][a-zA-Z0-9]*)>$/);
                
                if (tagMatch) {
                    const tagName = tagMatch[1].toLowerCase();
                    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
                    
                    if (!voidElements.includes(tagName)) {
                        const closingTag = '</' + tagMatch[1] + '>';
                        const newMarkdown = val.substring(0, start) + closingTag + val.substring(start);
                        setMarkdown(newMarkdown);
                        setTimeout(() => {
                            textarea.selectionStart = textarea.selectionEnd = start;
                            textarea.scrollTop = scrollTop;
                        }, 0);
                        return;
                    }
                }
            }

            if (stepOverChars.includes(data) && val[start] === data) {
                const newMarkdown = val.substring(0, start - 1) + val.substring(start);
                setMarkdown(newMarkdown);
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start;
                    textarea.scrollTop = scrollTop;
                }, 0);
                return;
            }

            if (pairs[data]) {
                const closingChar = pairs[data];
                const newMarkdown = val.substring(0, start) + closingChar + val.substring(start);
                setMarkdown(newMarkdown);
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start;
                    textarea.scrollTop = scrollTop;
                }, 0);
                return;
            }
        }
        setMarkdown(val);
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
    }, []);

    // --- Helpers & Exporters ---
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
        triggerDownload(blob, 'document.md');
        showNotification("Exported as .md successfully!");
    };

    // FIX: Print the exact DOM elements to preserve syntax colors and language headers
    const exportPDF = () => {
        if (!previewRef.current) return;
        
        const printContainer = document.createElement('div');
        printContainer.id = 'temp-print-container';
        
        // Grab the *live* HTML that already contains Prism classes and headers
        printContainer.innerHTML = '<div class="markdown-body">' + previewRef.current.innerHTML + '</div>';
        document.body.appendChild(printContainer);

        const printStyle = document.createElement('style');
        printStyle.id = 'temp-print-style';
        
        // Force the browser to print colors (-webkit-print-color-adjust)
        // Hide the copy button, but keep the header
        printStyle.innerHTML = 
            '@media screen { ' +
            '  #temp-print-container { display: none !important; } ' +
            '} ' +
            '@media print { ' +
            '  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; } ' +
            '  body > *:not(#temp-print-container) { display: none !important; } ' +
            '  #temp-print-container { display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white !important; color: black !important; padding: 15mm !important; box-sizing: border-box !important; } ' +
            '  .code-copy-btn { display: none !important; } ' +
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
                if (!inlineTokens) return [];
                let runs = [];
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
                let blocks = [];
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
                                let nestedBlocks = [];
                                item.tokens.forEach(itemToken => {
                                    if (itemToken.type === 'text') itemRuns.push(...buildTextRuns(itemToken.tokens || [{type: 'text', raw: itemToken.text}]));
                                    else nestedBlocks.push(...processBlockTokens([itemToken], listLevel + 1));
                                });
                                blocks.push(new Paragraph({ children: itemRuns, numbering: { reference: token.ordered ? "ordered-list" : "unordered-list", level: listLevel }, spacing: { after: 100 } }));
                                blocks.push(...nestedBlocks);
                            });
                            break;
                        case 'table':
                            const tableRows = [];
                            tableRows.push(new TableRow({ children: token.header.map(cell => new TableCell({ children: [new Paragraph({ children: buildTextRuns(cell.tokens), bold: true })], shading: { fill: "F3F4F6" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } })) }));
                            token.rows.forEach(row => {
                                tableRows.push(new TableRow({ children: row.map(cell => new TableCell({ children: [new Paragraph({ children: buildTextRuns(cell.tokens) })], margins: { top: 100, bottom: 100, left: 100, right: 100 } })) }));
                            });
                            blocks.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
                            blocks.push(new Paragraph({ text: "" }));
                            break;
                        case 'hr':
                            blocks.push(new Paragraph({ thematicBreak: true, spacing: { before: 200, after: 200 } }));
                            break;
                        case 'code':
                            token.text.split('\\n').forEach(line => blocks.push(new Paragraph({ children: [new TextRun({ text: line, font: "Courier New", size: 20 })], spacing: { after: 0, before: 0 }, shading: { type: "clear", color: "auto", fill: "EFEFEF" } })));
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
                    config: [
                        { reference: "unordered-list", levels: Array.from({ length: 6 }).map((_, i) => ({ level: i, format: "bullet", text: i % 2 === 0 ? "•" : "◦", alignment: "start", style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } } })) },
                        { reference: "ordered-list", levels: Array.from({ length: 6 }).map((_, i) => ({ level: i, format: i % 2 === 0 ? "decimal" : "lowerLetter", text: '%' + (i + 1) + '.', alignment: "start", style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } } })) }
                    ]
                },
                sections: [{ properties: {}, children: docChildren.length > 0 ? docChildren : [new Paragraph("Empty Document")] }]
            });

            const blob = await Packer.toBlob(doc);
            triggerDownload(blob, 'document.docx');
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
                <p className="text-slate-600 font-medium">Booting Editor Engines...</p>
            </div>
        );
    }

    return (
        <div id="app-container" className="flex flex-col h-full w-full bg-slate-50 overflow-hidden font-sans">
            
            <style dangerouslySetInnerHTML={{__html: 
                '.markdown-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; } ' +
                '.markdown-body h1, .markdown-body h2, .markdown-body h3 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; margin-top: 24px; margin-bottom: 16px; font-weight: 600; } ' +
                '.markdown-body h1 { font-size: 2em; } ' +
                '.markdown-body h2 { font-size: 1.5em; } ' +
                '.markdown-body p { margin-top: 0; margin-bottom: 16px; } ' +
                '.markdown-body a { color: #0366d6; text-decoration: none; } ' +
                '.markdown-body a:hover { text-decoration: underline; } ' +
                '.markdown-body ul, .markdown-body ol { padding-left: 2em; margin-bottom: 16px; list-style-type: disc; } ' +
                '.markdown-body ol { list-style-type: decimal; } ' +
                '.markdown-body li { margin-bottom: 0.25em; } ' +
                '.markdown-body blockquote { margin: 0 0 16px; padding: 0 1em; color: #6a737d; border-left: 0.25em solid #dfe2e5; background: #f9fafb; padding-block: 8px;} ' +
                '.markdown-body code { font-family: "Google Sans Code", ui-monospace, Consolas, monospace; font-size: 85%; background-color: rgba(27,31,35,0.05); padding: 0.2em 0.4em; border-radius: 3px; } ' +
                '.markdown-body pre { background-color: #f1f5f9; color: #334155; border-radius: 8px; padding: 16px; overflow: auto; border: 1px solid #e2e8f0; position: relative; z-index: 0; } ' +
                '.markdown-body pre code { background-color: transparent; padding: 0; display: block; overflow-x: auto; color: inherit; font-size: 14px;} ' +
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
                    <input type="file" accept=".md" ref={fileInputRef} onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => { setMarkdown(ev.target.result); showNotification("Imported!"); };
                        reader.readAsText(file); e.target.value = '';
                    }} className="hidden" />
                    
                    <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50">
                        <i className="fa-solid fa-upload"></i> <span>Import</span>
                    </button>
                    <div className="h-4 w-px bg-slate-300 mx-0.5"></div>
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

            <main ref={containerRef} className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 min-w-0">
                
                <div 
                    id="editor-pane" 
                    style={{ flexBasis: viewMode === 'split' ? (splitRatio + '%') : '100%', display: viewMode === 'preview' ? 'none' : 'flex' }} 
                    className="flex-shrink-0 flex flex-col bg-[#1e1e1e] border-r border-[#333] min-h-0 min-w-0"
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
                    <textarea
                        className="flex-1 w-full p-3 bg-[#1e1e1e] text-gray-200 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-y-auto min-h-0 editor-textarea"
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
                            {/* FIX: Attached previewRef to capture live DOM elements for printing */}
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