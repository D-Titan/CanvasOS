window.CanvasApps['DocForge'] = `
const { useState, useEffect, useRef, useMemo } = React;

const cx = function () {
  const args = Array.prototype.slice.call(arguments);
  return args.filter(Boolean).join(' ');
};

const SAMPLE_MD = [
  '# Project Atlas — Research Summary',
  '',
  'This document demonstrates **DocForge**, a client-side tool for turning raw',
  'notes into polished, exportable documents.',
  '',
  '## Key Findings',
  '',
  '1. Model accuracy improved by *14.2%* after fine-tuning.',
  '2. Inference latency dropped to \`42ms\` on average.',
  '3. The relationship is described by:',
  '',
  '$$ E = mc^{2} \\\\quad \\\\text{and} \\\\quad \\\\Delta G = \\\\Delta H - T\\\\Delta S $$',
  '',
  '## Sample Code',
  '',
  '\`\`\`python',
  'def softmax(x):',
  '    e_x = np.exp(x - np.max(x))',
  '    return e_x / e_x.sum(axis=0)',
  '\`\`\`',
  '',
  '## Comparison Table',
  '',
  '| Metric | Baseline | Improved |',
  '|---|---|---|',
  '| Accuracy | 81.3% | 95.5% |',
  '| Latency | 120ms | 42ms |',
  '',
  '> Note: All benchmarks were run on identical hardware for fairness.',
  '',
  'Visit [our repository](https://example.com) for full source access.'
].join('\\n');

const THEMES = [
  { id: 'classic', name: 'Classic Clean', swatch: '#2563eb', vars: {
    '--doc-font': '"Inter", sans-serif', '--doc-heading-font': '"Inter", sans-serif',
    '--doc-bg': '#ffffff', '--doc-text': '#1e293b', '--doc-heading': '#0f172a',
    '--doc-accent': '#2563eb', '--doc-quote-bg': '#f8fafc', '--doc-quote-text': '#475569',
    '--doc-border': '#e2e8f0', '--doc-table-head': '#f1f5f9'
  }},
  { id: 'academic', name: 'Academic Serif', swatch: '#7c2d12', vars: {
    '--doc-font': '"Lora", serif', '--doc-heading-font': '"Playfair Display", serif',
    '--doc-bg': '#ffffff', '--doc-text': '#292524', '--doc-heading': '#1c1917',
    '--doc-accent': '#7c2d12', '--doc-quote-bg': '#fafaf9', '--doc-quote-text': '#57534e',
    '--doc-border': '#e7e5e4', '--doc-table-head': '#f5f5f4'
  }},
  { id: 'sepia', name: 'Sepia Book', swatch: '#9a6a3a', vars: {
    '--doc-font': '"Lora", serif', '--doc-heading-font': '"Lora", serif',
    '--doc-bg': '#faf6ee', '--doc-text': '#4a3f35', '--doc-heading': '#3a2e22',
    '--doc-accent': '#9a6a3a', '--doc-quote-bg': '#f3ebd9', '--doc-quote-text': '#6b5b4b',
    '--doc-border': '#e5d9bf', '--doc-table-head': '#f0e6d0'
  }},
  { id: 'notion', name: 'Notion Minimal', swatch: '#337ea9', vars: {
    '--doc-font': '"Inter", sans-serif', '--doc-heading-font': '"Inter", sans-serif',
    '--doc-bg': '#ffffff', '--doc-text': '#37352f', '--doc-heading': '#000000',
    '--doc-accent': '#337ea9', '--doc-quote-bg': '#f7f6f3', '--doc-quote-text': '#6b6b6b',
    '--doc-border': '#eeeeec', '--doc-table-head': '#f7f6f3'
  }},
  { id: 'technical', name: 'Technical Spec', swatch: '#0891b2', vars: {
    '--doc-font': '"Open Sans", sans-serif', '--doc-heading-font': '"JetBrains Mono", monospace',
    '--doc-bg': '#ffffff', '--doc-text': '#1e293b', '--doc-heading': '#0f172a',
    '--doc-accent': '#0891b2', '--doc-quote-bg': '#ecfeff', '--doc-quote-text': '#155e63',
    '--doc-border': '#cbd5e1', '--doc-table-head': '#ecfeff'
  }},
  { id: 'slate', name: 'Slate Professional', swatch: '#475569', vars: {
    '--doc-font': '"Roboto", sans-serif', '--doc-heading-font': '"Roboto", sans-serif',
    '--doc-bg': '#ffffff', '--doc-text': '#334155', '--doc-heading': '#1e293b',
    '--doc-accent': '#475569', '--doc-quote-bg': '#f8fafc', '--doc-quote-text': '#64748b',
    '--doc-border': '#cbd5e1', '--doc-table-head': '#f1f5f9'
  }}
];

const PAGE_SIZES = {
  a4: { label: 'A4', printSize: 'A4', pxWidth: 794 },
  letter: { label: 'US Letter', printSize: 'letter', pxWidth: 816 },
  legal: { label: 'Legal', printSize: 'legal', pxWidth: 816 }
};

const MARGINS = {
  narrow: { label: 'Narrow', mm: 12, px: 45 },
  normal: { label: 'Normal', mm: 20, px: 76 },
  wide: { label: 'Wide', mm: 30, px: 113 }
};

const TOKEN_COLORS = {
  comment: '6A737D', prolog: '6A737D', doctype: '6A737D', cdata: '6A737D',
  punctuation: '24292E',
  property: '005CC5', tag: '22863A', boolean: '005CC5', number: '005CC5',
  constant: '005CC5', symbol: '005CC5', deleted: 'B31D28',
  selector: '6F42C1', 'attr-name': '6F42C1', string: '032F62', char: '032F62',
  builtin: '032F62', inserted: '22863A',
  operator: 'D73A49', entity: 'D73A49', url: 'D73A49',
  atrule: 'D73A49', 'attr-value': '032F62', keyword: 'D73A49',
  function: '6F42C1', 'class-name': '6F42C1',
  regex: 'E36209', important: 'E36209', variable: 'E36209'
};

const GREEK_MAP = {
  alpha: '\\u03b1', beta: '\\u03b2', gamma: '\\u03b3', delta: '\\u03b4', epsilon: '\\u03b5',
  varepsilon: '\\u03b5', zeta: '\\u03b6', eta: '\\u03b7', theta: '\\u03b8', vartheta: '\\u03d1',
  iota: '\\u03b9', kappa: '\\u03ba', lambda: '\\u03bb', mu: '\\u03bc', nu: '\\u03bd',
  xi: '\\u03be', pi: '\\u03c0', rho: '\\u03c1', sigma: '\\u03c3', tau: '\\u03c4',
  upsilon: '\\u03c5', phi: '\\u03c6', varphi: '\\u03c6', chi: '\\u03c7', psi: '\\u03c8', omega: '\\u03c9',
  Gamma: '\\u0393', Delta: '\\u0394', Theta: '\\u0398', Lambda: '\\u039b', Xi: '\\u039e',
  Pi: '\\u03a0', Sigma: '\\u03a3', Upsilon: '\\u03a5', Phi: '\\u03a6', Psi: '\\u03a8', Omega: '\\u03a9'
};

const SUP_MAP = { '0':'\\u2070','1':'\\u00b9','2':'\\u00b2','3':'\\u00b3','4':'\\u2074','5':'\\u2075','6':'\\u2076','7':'\\u2077','8':'\\u2078','9':'\\u2079','+':'\\u207a','-':'\\u207b','=':'\\u207c','(':'\\u207d',')':'\\u207e','n':'\\u207f','i':'\\u2071' };
const SUB_MAP = { '0':'\\u2080','1':'\\u2081','2':'\\u2082','3':'\\u2083','4':'\\u2084','5':'\\u2085','6':'\\u2086','7':'\\u2087','8':'\\u2088','9':'\\u2089','+':'\\u208a','-':'\\u208b','=':'\\u208c','(':'\\u208d',')':'\\u208e' };

const toSup = (s) => s.split('').map((c) => SUP_MAP[c] || c).join('');
const toSub = (s) => s.split('').map((c) => SUB_MAP[c] || c).join('');

const texToUnicode = (raw) => {
  let s = ' ' + (raw || '') + ' ';
  s = s.replace(/\\\\left/g, '').replace(/\\\\right/g, '');
  s = s.replace(/\\\\text\\{([^}]*)\\}/g, '$1');
  s = s.replace(/\\\\mathrm\\{([^}]*)\\}/g, '$1');
  s = s.replace(/\\\\mathbf\\{([^}]*)\\}/g, '$1');
  s = s.replace(/\\\\sqrt\\{([^}]*)\\}/g, '\\u221a($1)');
  s = s.replace(/\\\\sqrt/g, '\\u221a');
  s = s.replace(/\\\\frac\\{([^}]*)\\}\\{([^}]*)\\}/g, '($1/$2)');
  s = s.replace(/\\\\cdot/g, '\\u00b7');
  s = s.replace(/\\\\times/g, '\\u00d7');
  s = s.replace(/\\\\div/g, '\\u00f7');
  s = s.replace(/\\\\pm/g, '\\u00b1');
  s = s.replace(/\\\\mp/g, '\\u2213');
  s = s.replace(/\\\\leq/g, '\\u2264');
  s = s.replace(/\\\\geq/g, '\\u2265');
  s = s.replace(/\\\\neq/g, '\\u2260');
  s = s.replace(/\\\\approx/g, '\\u2248');
  s = s.replace(/\\\\equiv/g, '\\u2261');
  s = s.replace(/\\\\infty/g, '\\u221e');
  s = s.replace(/\\\\partial/g, '\\u2202');
  s = s.replace(/\\\\nabla/g, '\\u2207');
  s = s.replace(/\\\\sum/g, '\\u2211');
  s = s.replace(/\\\\prod/g, '\\u220f');
  s = s.replace(/\\\\int/g, '\\u222b');
  s = s.replace(/\\\\in/g, '\\u2208');
  s = s.replace(/\\\\notin/g, '\\u2209');
  s = s.replace(/\\\\subseteq/g, '\\u2286');
  s = s.replace(/\\\\subset/g, '\\u2282');
  s = s.replace(/\\\\cup/g, '\\u222a');
  s = s.replace(/\\\\cap/g, '\\u2229');
  s = s.replace(/\\\\forall/g, '\\u2200');
  s = s.replace(/\\\\exists/g, '\\u2203');
  s = s.replace(/\\\\Rightarrow/g, '\\u21d2');
  s = s.replace(/\\\\Leftrightarrow/g, '\\u21d4');
  s = s.replace(/\\\\rightarrow/g, '\\u2192');
  s = s.replace(/\\\\leftarrow/g, '\\u2190');
  s = s.replace(/\\\\to/g, '\\u2192');
  s = s.replace(/\\\\ne/g, '\\u2260');
  s = s.replace(/\\\\le/g, '\\u2264');
  s = s.replace(/\\\\ge/g, '\\u2265');
  s = s.replace(/\\\\ldots|\\\\cdots|\\\\dots/g, '\\u2026');
  s = s.replace(/\\\\quad|\\\\qquad/g, '  ');
  s = s.replace(/\\\\([a-zA-Z]+)/g, function (m, name) { return GREEK_MAP[name] || m; });
  s = s.replace(/\\^\\{([^}]*)\\}/g, function (m, g1) { return toSup(g1); });
  s = s.replace(/_\\{([^}]*)\\}/g, function (m, g1) { return toSub(g1); });
  s = s.replace(/\\^([a-zA-Z0-9])/g, function (m, g1) { return toSup(g1); });
  s = s.replace(/_([a-zA-Z0-9])/g, function (m, g1) { return toSub(g1); });
  s = s.replace(/[{}]/g, '');
  s = s.replace(/\\\\,/g, ' ');
  s = s.replace(/\\s+/g, ' ').trim();
  return s;
};

const preprocessMarkdown = (text) => {
  let out = text || '';
  out = out.replace(/\\\\\\(([\\s\\S]*?)\\\\\\)/g, function (m, g1) { return '$' + g1 + '$'; });
  out = out.replace(/\\\\\\[([\\s\\S]*?)\\\\\\]/g, function (m, g1) { return '$$' + g1 + '$$'; });
  out = out.replace(/^[ \\t]*\\\\pagebreak[ \\t]*$/gm, '<div class="pdf-pagebreak"></div>');
  return out;
};

const getStats = (text) => {
  const trimmed = (text || '').trim();
  const words = trimmed ? trimmed.split(/\\s+/).length : 0;
  const chars = (text || '').length;
  const minutes = Math.max(1, Math.round(words / 200));
  const pages = Math.max(1, Math.ceil(words / 400));
  return { words: words, chars: chars, minutes: minutes, pages: pages };
};

const DocForgeApp = ({ data, onUpdate, instanceId, title }) => {
  const [content, setContent] = useState((data && data.content) || '');
  const [htmlContent, setHtmlContent] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [viewMode, setViewMode] = useState('split');
  const [splitRatio, setSplitRatio] = useState(45);
  const [themeId, setThemeId] = useState('classic');
  const [pageSizeId, setPageSizeId] = useState('a4');
  const [marginId, setMarginId] = useState('normal');
  const [zoom, setZoom] = useState(100);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [showDesign, setShowDesign] = useState(false);
  const [notification, setNotification] = useState(null);
  const [lastLoadedFile, setLastLoadedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const containerRef = useRef(null);
  const pageRef = useRef(null);
  const fileInputRef = useRef(null);
  const designRef = useRef(null);
  const isDraggingSplit = useRef(false);

  const theme = useMemo(() => THEMES.find((t) => t.id === themeId) || THEMES[0], [themeId]);
  const pageSize = PAGE_SIZES[pageSizeId] || PAGE_SIZES.a4;
  const margin = MARGINS[marginId] || MARGINS.normal;
  const stats = useMemo(() => getStats(content), [content]);

  useEffect(() => {
    if (onUpdate) onUpdate({ content: content });
  }, [content, onUpdate]);

  useEffect(() => {
    if (data && data.fileData && data.fileData !== lastLoadedFile) {
      setContent(data.fileData);
      setLastLoadedFile(data.fileData);
    } else if (data && data.content && !data.fileData && content === '') {
      setContent(data.content);
    }
    // eslint-disable-next-line
  }, [data && data.fileData, data && data.content]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setIsCompact(entry.contentRect.width < 700);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (designRef.current && !designRef.current.contains(e.target)) setShowDesign(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        script.onerror = () => reject(new Error('Failed: ' + src));
        document.head.appendChild(script);
      });

      addCss('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lora:wght@400;500;600;700&family=Playfair+Display:wght@600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
      addCss('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
      addCss('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css');
      addCss('https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css');

      try {
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
          addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js'),
          addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js'),
          addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js'),
          addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js'),
          addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js'),
          addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-jsx.min.js'),
          addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-yaml.min.js'),
          addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-sql.min.js'),
          addScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js')
        ]);

        if (window.Prism && window.Prism.plugins && window.Prism.plugins.autoloader) {
          window.Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';
        }
        if (window.marked) {
          window.marked.setOptions({ gfm: true, breaks: false });
          if (window.markedKatex) {
            const ext = typeof window.markedKatex === 'function' ? window.markedKatex : window.markedKatex.default;
            if (ext) window.marked.use(ext({ throwOnError: false }));
          }
        }
        setIsReady(true);
      } catch (err) {
        console.error('DocForge dependency load failed:', err);
        setIsReady(true);
      }
    };
    loadDependencies();
  }, []);

  const ensureLang = (lang) => new Promise((resolve) => {
    if (!window.Prism || !lang || window.Prism.languages[lang]) return resolve();
    if (window.Prism.plugins && window.Prism.plugins.autoloader) {
      window.Prism.plugins.autoloader.loadLanguages([lang], resolve, resolve);
    } else resolve();
  });

  useEffect(() => {
    if (!isReady || !window.marked || !window.DOMPurify) return;
    try {
      const processed = preprocessMarkdown(content);
      const rawHtml = window.marked.parse(processed);
      const cleanHtml = window.DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target', 'aria-hidden', 'class', 'style'],
        USE_PROFILES: { html: true, mathMl: true }
      });
      setHtmlContent(cleanHtml);

      setTimeout(() => {
        if (window.Prism) window.Prism.highlightAll();
        const preBlocks = document.querySelectorAll('.doc-markdown pre');
        preBlocks.forEach((pre) => {
          if (pre.parentElement.classList.contains('cb-wrapper')) return;
          let lang = 'Text';
          const codeNode = pre.querySelector('code');
          if (codeNode && codeNode.className) {
            const match = codeNode.className.match(/language-(\\w+)/);
            if (match) lang = match[1].charAt(0).toUpperCase() + match[1].slice(1);
          }
          const wrapper = document.createElement('div');
          wrapper.className = 'cb-wrapper relative my-5 border border-slate-200 rounded-xl shadow-sm overflow-hidden bg-white';
          pre.parentNode.insertBefore(wrapper, pre);

          const header = document.createElement('div');
          header.className = 'cb-header flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 select-none';
          const dotsHtml = '<div class="flex items-center gap-1.5 mr-3">' +
            '<div class="w-2.5 h-2.5 rounded-full bg-red-300"></div>' +
            '<div class="w-2.5 h-2.5 rounded-full bg-yellow-300"></div>' +
            '<div class="w-2.5 h-2.5 rounded-full bg-green-300"></div></div>';
          const left = document.createElement('div');
          left.className = 'flex items-center';
          left.innerHTML = dotsHtml + '<span class="text-xs font-semibold tracking-wide text-slate-500 font-mono">' + lang + '</span>';

          const copyBtn = document.createElement('button');
          copyBtn.className = 'copy-btn flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors';
          copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i><span>Copy</span>';
          copyBtn.onclick = () => {
            const code = codeNode ? codeNode.innerText : '';
            navigator.clipboard.writeText(code).then(() => {
              copyBtn.innerHTML = '<i class="fa-solid fa-check text-green-600"></i><span class="text-green-600">Copied</span>';
              setTimeout(() => { copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i><span>Copy</span>'; }, 1800);
            }).catch(() => {});
          };

          header.appendChild(left);
          header.appendChild(copyBtn);
          const body = document.createElement('div');
          body.className = 'cb-body bg-white';
          pre.classList.add('!m-0', '!border-0', '!rounded-none', '!bg-transparent');
          body.appendChild(pre);
          wrapper.appendChild(header);
          wrapper.appendChild(body);
        });
      }, 10);
    } catch (err) {
      console.error('Parse error:', err);
    }
  }, [content, isReady]);

  const showNotification = (msg, type) => {
    setNotification({ msg: msg, type: type || 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const getCleanFilename = (ext) => {
    let base = (title || 'Document').trim().replace(/\\.(md|txt|docx|pdf)$/i, '');
    return base + '.' + ext;
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadFileObject = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'md' && ext !== 'txt' && ext !== 'markdown') {
      showNotification('Unsupported file: .' + ext, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => { setContent(ev.target.result); showNotification('Imported ' + file.name); };
    reader.readAsText(file);
  };

  const handleFileInput = (e) => { loadFileObject(e.target.files[0]); e.target.value = ''; };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) loadFileObject(e.dataTransfer.files[0]);
  };
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) { setContent(text); showNotification('Pasted from clipboard'); }
    } catch (e) { showNotification('Clipboard access denied', 'error'); }
  };

  const exportMD = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    triggerDownload(blob, getCleanFilename('md'));
    showNotification('Exported .md');
  };

  const buildPrintCss = () => {
    return [
      '@page { size: ' + pageSize.printSize + '; margin: ' + margin.mm + 'mm; }',
      'html,body{background:#fff !important;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}',
      '.doc-page{box-shadow:none !important;margin:0 !important;width:auto !important;transform:none !important;padding:0 !important;}',
      '.doc-markdown{overflow:visible !important;}',
      '.doc-markdown pre,.doc-markdown code{white-space:pre-wrap !important;word-break:break-word !important;overflow:visible !important;max-height:none !important;}',
      '.doc-markdown .cb-body{overflow:visible !important;max-height:none !important;}',
      '.doc-markdown table{overflow:visible !important;width:100% !important;}',
      '.doc-markdown img{max-width:100% !important;}',
      '.copy-btn{display:none !important;}',
      '.doc-markdown h1,.doc-markdown h2,.doc-markdown h3{page-break-after:avoid;break-after:avoid-page;}',
      '.doc-markdown .cb-wrapper,.doc-markdown table,.doc-markdown img{page-break-inside:avoid;break-inside:avoid-page;}',
      '.doc-markdown tr{page-break-inside:avoid;}',
      '.pdf-pagebreak{page-break-after:always;break-after:page;height:0;}'
    ].join('\\n');
  };

  const exportPDF = () => {
    if (!pageRef.current) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><title>' + getCleanFilename('pdf').replace('.pdf', '') + '</title>');
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((s) => doc.write(s.outerHTML));
    doc.write('<style>' + buildPrintCss() + '</style>');
    doc.write('</head><body>');
    doc.write(pageRef.current.outerHTML);
    doc.write('</body></html>');
    doc.close();
    setTimeout(() => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
      catch (e) { showNotification('Print failed', 'error'); }
      finally { setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000); }
    }, 400);
  };

  const flattenTokens = (tokens, parentType) => {
    let out = [];
    tokens.forEach((t) => {
      if (typeof t === 'string') { out.push({ text: t, type: parentType || null }); }
      else if (Array.isArray(t.content)) { out = out.concat(flattenTokens(t.content, t.type)); }
      else { out.push({ text: String(t.content), type: t.type }); }
    });
    return out;
  };

  const highlightCodeToParagraphs = (code, lang, docxLib) => {
    const { Paragraph, TextRun } = docxLib;
    let tokens;
    try {
      const grammar = window.Prism && window.Prism.languages[lang];
      tokens = grammar ? window.Prism.tokenize(code, grammar) : [code];
    } catch (e) { tokens = [code]; }
    const flat = flattenTokens(tokens);
    const lines = [[]];
    flat.forEach((tok) => {
      const parts = tok.text.split('\\n');
      parts.forEach((part, i) => {
        if (i > 0) lines.push([]);
        if (part.length > 0) lines[lines.length - 1].push({ text: part, type: tok.type });
      });
    });
    return lines.map((line) => new Paragraph({
      children: line.length ? line.map((seg) => new TextRun({ text: seg.text, font: 'JetBrains Mono', size: 19, color: TOKEN_COLORS[seg.type] || '24292E' })) : [new TextRun({ text: '', font: 'JetBrains Mono', size: 19 })],
      spacing: { after: 0, before: 0 },
      shading: { type: 'clear', color: 'auto', fill: 'F6F8FA' }
    }));
  };

  const loadImageForDocx = (src) => new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const maxW = 560;
        let w = img.naturalWidth || 300, h = img.naturalHeight || 200;
        if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        fetch(src).then((res) => res.arrayBuffer()).then((buf) => resolve({ data: buf, width: w, height: h })).catch(() => resolve(null));
      };
      img.onerror = () => resolve(null);
      img.src = src;
    } catch (e) { resolve(null); }
  });

  const exportDOCX = async () => {
    if (!window.docx || !window.marked) { showNotification('DOCX library still loading', 'error'); return; }
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ImageRun, PageBreak, AlignmentType, BorderStyle } = window.docx;
      const accentHex = theme.vars['--doc-accent'].replace('#', '').toUpperCase();
      const processed = preprocessMarkdown(content);
      const tokens = window.marked.lexer(processed);

      const buildTextRuns = (inlineTokens, formatOpts) => {
        formatOpts = formatOpts || {};
        if (!inlineTokens) return [];
        let runs = [];
        inlineTokens.forEach((t) => {
          const opts = Object.assign({}, formatOpts);
          if (t.type === 'strong') opts.bold = true;
          if (t.type === 'em') opts.italics = true;
          if (t.type === 'del') opts.strike = true;
          if (t.type === 'codespan') {
            runs.push(new TextRun({ text: t.text, font: 'JetBrains Mono', size: 19, color: 'BE185D', shading: { type: 'clear', color: 'auto', fill: 'F1F5F9' } }));
            return;
          }
          if (t.type === 'link') { opts.color = '2563EB'; opts.underline = { type: 'single' }; }
          if (t.type === 'image') { runs.push(new TextRun({ text: '[Image: ' + (t.text || t.href) + ']', italics: true, color: '94A3B8' })); return; }
          if (t.type && /katex/i.test(t.type)) { runs.push(new TextRun({ text: texToUnicode(t.text || ''), italics: true, font: 'Cambria Math', color: '6D28D9' })); return; }
          if (t.type === 'br') { runs.push(new TextRun({ text: '', break: 1 })); return; }
          if (t.tokens && t.tokens.length > 0) { runs = runs.concat(buildTextRuns(t.tokens, opts)); }
          else { runs.push(new TextRun(Object.assign({ text: t.text || t.raw || '' }, opts))); }
        });
        return runs;
      };

      const processBlockTokens = async (tokensArray, listLevel) => {
        listLevel = listLevel || 0;
        let blocks = [];
        for (const token of tokensArray) {
          if (token.type === 'heading') {
            blocks.push(new Paragraph({ children: buildTextRuns(token.tokens), heading: HeadingLevel['HEADING_' + Math.min(token.depth, 6)], spacing: { before: 260, after: 130 } }));
          } else if (token.type === 'paragraph') {
            if (token.tokens && token.tokens.length === 1 && token.tokens[0].type === 'image') {
              const imgTok = token.tokens[0];
              const imgData = await loadImageForDocx(imgTok.href);
              if (imgData) {
                blocks.push(new Paragraph({ children: [new ImageRun({ data: imgData.data, transformation: { width: imgData.width, height: imgData.height } })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
              } else {
                blocks.push(new Paragraph({ children: [new TextRun({ text: '[Image: ' + (imgTok.text || imgTok.href) + ']', italics: true, color: '94A3B8' })] }));
              }
            } else {
              blocks.push(new Paragraph({ children: buildTextRuns(token.tokens), spacing: { after: 200 } }));
            }
          } else if (token.type === 'blockquote') {
            for (const bq of token.tokens) {
              if (bq.type === 'paragraph') {
                blocks.push(new Paragraph({
                  children: buildTextRuns(bq.tokens, { italics: true, color: '475569' }),
                  indent: { left: 400 },
                  border: { left: { style: BorderStyle.SINGLE, size: 16, color: accentHex, space: 8 } },
                  spacing: { after: 160 }
                }));
              } else {
                const nested = await processBlockTokens([bq], listLevel);
                blocks = blocks.concat(nested);
              }
            }
          } else if (token.type === 'list') {
            for (const item of token.items) {
              let itemRuns = [];
              let nestedBlocks = [];
              for (const itemToken of item.tokens) {
                if (itemToken.type === 'text') {
                  itemRuns = itemRuns.concat(buildTextRuns(itemToken.tokens || [{ type: 'text', text: itemToken.text }]));
                } else {
                  const nb = await processBlockTokens([itemToken], listLevel + 1);
                  nestedBlocks = nestedBlocks.concat(nb);
                }
              }
              blocks.push(new Paragraph({ children: itemRuns, numbering: { reference: token.ordered ? 'ordered-list' : 'unordered-list', level: listLevel }, spacing: { after: 80 } }));
              blocks = blocks.concat(nestedBlocks);
            }
          } else if (token.type === 'table') {
            const rows = [];
            rows.push(new TableRow({ children: token.header.map((cell) => new TableCell({ children: [new Paragraph({ children: buildTextRuns(cell.tokens), bold: true })], shading: { fill: 'F3F4F6' }, margins: { top: 100, bottom: 100, left: 100, right: 100 } })) }));
            token.rows.forEach((row) => {
              rows.push(new TableRow({ children: row.map((cell) => new TableCell({ children: [new Paragraph({ children: buildTextRuns(cell.tokens) })], margins: { top: 100, bottom: 100, left: 100, right: 100 } })) }));
            });
            blocks.push(new Table({ rows: rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
            blocks.push(new Paragraph({ text: '' }));
          } else if (token.type === 'hr') {
            blocks.push(new Paragraph({ thematicBreak: true, spacing: { before: 200, after: 200 } }));
          } else if (token.type === 'code') {
            const lang = (token.lang || 'text').trim().split(/\\s+/)[0].toLowerCase();
            await ensureLang(lang);
            blocks = blocks.concat(highlightCodeToParagraphs(token.text, lang, window.docx));
            blocks.push(new Paragraph({ text: '' }));
          } else if (token.type && /katex/i.test(token.type)) {
            blocks.push(new Paragraph({ children: [new TextRun({ text: texToUnicode(token.text || ''), italics: true, font: 'Cambria Math', color: '6D28D9' })], alignment: AlignmentType.CENTER, spacing: { before: 120, after: 200 } }));
          } else if (token.type === 'html' && /pdf-pagebreak/.test(token.raw || '')) {
            blocks.push(new Paragraph({ children: [new PageBreak()] }));
          } else if (token.type === 'space') {
            blocks.push(new Paragraph({ text: '' }));
          } else if (token.raw && token.type !== 'text') {
            blocks.push(new Paragraph({ text: token.raw }));
          }
        }
        return blocks;
      };

      let docChildren = [];
      if (includeHeader && title) {
        docChildren.push(new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 56, color: theme.vars['--doc-heading'].replace('#', '').toUpperCase(), font: theme.vars['--doc-heading-font'].replace(/"/g, '').split(',')[0] })], spacing: { after: 60 } }));
        docChildren.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: accentHex } }, spacing: { after: 300 } }));
      }
      const bodyBlocks = await processBlockTokens(tokens);
      docChildren = docChildren.concat(bodyBlocks);

      const doc = new Document({
        numbering: {
          config: [
            { reference: 'unordered-list', levels: Array.from({ length: 6 }).map((_, i) => ({ level: i, format: 'bullet', text: i % 2 === 0 ? '\\u2022' : '\\u25e6', alignment: 'start', style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } } })) },
            { reference: 'ordered-list', levels: Array.from({ length: 6 }).map((_, i) => ({ level: i, format: i % 2 === 0 ? 'decimal' : 'lowerLetter', text: '%' + (i + 1) + '.', alignment: 'start', style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } } })) }
          ]
        },
        sections: [{ properties: {}, children: docChildren.length > 0 ? docChildren : [new Paragraph('Empty Document')] }]
      });

      const blob = await Packer.toBlob(doc);
      triggerDownload(blob, getCleanFilename('docx'));
      showNotification('Exported formatted .docx');
    } catch (err) {
      console.error(err);
      showNotification('Failed to generate DOCX', 'error');
    }
  };

  const startSplitDrag = (e) => { isDraggingSplit.current = true; e.preventDefault(); };
  useEffect(() => {
    const onMove = (e) => {
      if (!isDraggingSplit.current || !containerRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = containerRef.current.getBoundingClientRect();
      let ratio;
      if (isCompact) ratio = ((clientY - rect.top) / rect.height) * 100;
      else ratio = ((clientX - rect.left) / rect.width) * 100;
      if (ratio < 15) { isDraggingSplit.current = false; setViewMode('preview'); setSplitRatio(45); return; }
      if (ratio > 85) { isDraggingSplit.current = false; setViewMode('edit'); setSplitRatio(45); return; }
      setSplitRatio(ratio);
    };
    const onUp = () => { isDraggingSplit.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isCompact]);

  if (!isReady) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 flex-col gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">Loading DocForge...</p>
      </div>
    );
  }

  const pageWidthPx = pageSize.pxWidth;
  const scale = zoom / 100;

  return (
    <div id="docforge-root" ref={containerRef} className="flex flex-col h-full w-full bg-slate-100 overflow-hidden font-sans relative">
      <style dangerouslySetInnerHTML={{ __html: [
        '.doc-markdown{line-height:1.7;color:var(--doc-text);font-family:var(--doc-font);}',
        '.doc-markdown h1,.doc-markdown h2,.doc-markdown h3,.doc-markdown h4{font-family:var(--doc-heading-font);color:var(--doc-heading);font-weight:700;margin-top:1.4em;margin-bottom:0.5em;}',
        '.doc-markdown h1{font-size:2.1em;letter-spacing:-0.02em;}',
        '.doc-markdown h2{font-size:1.6em;}',
        '.doc-markdown h3{font-size:1.3em;}',
        '.doc-markdown p{margin:0 0 16px 0;}',
        '.doc-markdown a{color:var(--doc-accent);text-decoration:none;}',
        '.doc-markdown a:hover{text-decoration:underline;}',
        '.doc-markdown ul,.doc-markdown ol{padding-left:1.6em;margin-bottom:16px;}',
        '.doc-markdown li{margin-bottom:0.3em;}',
        '.doc-markdown blockquote{margin:0 0 16px 0;padding:8px 16px;border-left:4px solid var(--doc-accent);background:var(--doc-quote-bg);color:var(--doc-quote-text);}',
        '.doc-markdown code{font-family:"JetBrains Mono",monospace;font-size:0.85em;background:#f1f5f9;color:#be185d;padding:0.15em 0.4em;border-radius:4px;}',
        '.doc-markdown pre code{background:transparent;color:inherit;padding:0;}',
        '.doc-markdown pre{padding:14px 16px;overflow-x:auto;font-size:13px;}',
        '.doc-markdown table{border-collapse:separate;border-spacing:0;width:100%;margin-bottom:1.4em;border:1px solid var(--doc-border);border-radius:8px;overflow:hidden;}',
        '.doc-markdown th,.doc-markdown td{border-bottom:1px solid var(--doc-border);border-right:1px solid var(--doc-border);padding:10px 14px;text-align:left;}',
        '.doc-markdown th:last-child,.doc-markdown td:last-child{border-right:none;}',
        '.doc-markdown tr:last-child td{border-bottom:none;}',
        '.doc-markdown th{background:var(--doc-table-head);font-weight:600;}',
        '.doc-markdown hr{height:1px;background:var(--doc-border);border:0;margin:24px 0;}',
        '.doc-markdown img{max-width:100%;border-radius:6px;}',
        '.doc-markdown .pdf-pagebreak{display:block;border-top:1px dashed var(--doc-border);margin:32px 0;position:relative;height:0;}',
        '.pdf-pagebreak::after{content:"Page Break";position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:var(--doc-bg);padding:0 8px;font-size:10px;color:#94a3b8;font-family:sans-serif;}',
        '::-webkit-scrollbar{width:8px;height:8px;} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px;}'
      ].join('\\n') }} />

      <input type="file" ref={fileInputRef} accept=".md,.txt,.markdown" onChange={handleFileInput} className="hidden" />

      <header className="bg-white border-b border-slate-200 shadow-sm px-3 py-2 flex items-center justify-between gap-2 flex-shrink-0 overflow-x-auto no-print">
        <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 flex-shrink-0">
          <button onClick={() => setViewMode('edit')} className={cx('flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors', viewMode === 'edit' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900')}>
            <i className="fa-solid fa-pen"></i> {!isCompact && <span>Edit</span>}
          </button>
          <button onClick={() => setViewMode('split')} className={cx('flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors', viewMode === 'split' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900')}>
            <i className="fa-solid fa-columns"></i> {!isCompact && <span>Split</span>}
          </button>
          <button onClick={() => setViewMode('preview')} className={cx('flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors', viewMode === 'preview' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900')}>
            <i className="fa-solid fa-eye"></i> {!isCompact && <span>Preview</span>}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative" ref={designRef}>
            <button onClick={() => setShowDesign(!showDesign)} className={cx('flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border transition-colors', showDesign ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')}>
              <i className="fa-solid fa-palette"></i> {!isCompact && <span>Design</span>}
            </button>
            {showDesign && (
              <div className="absolute top-9 right-0 w-72 bg-white shadow-2xl rounded-xl border border-slate-200 z-40 p-3 flex flex-col gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Theme</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {THEMES.map((t) => (
                      <button key={t.id} onClick={() => setThemeId(t.id)} className={cx('flex flex-col items-center gap-1 p-1.5 rounded-lg border text-[10px] font-semibold', themeId === t.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50')}>
                        <span className="w-4 h-4 rounded-full" style={{ background: t.swatch }}></span>
                        <span className="truncate w-full text-center text-slate-600">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Page Size</p>
                    <select value={pageSizeId} onChange={(e) => setPageSizeId(e.target.value)} className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white">
                      {Object.keys(PAGE_SIZES).map((k) => <option key={k} value={k}>{PAGE_SIZES[k].label}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Margins</p>
                    <select value={marginId} onChange={(e) => setMarginId(e.target.value)} className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white">
                      {Object.keys(MARGINS).map((k) => <option key={k} value={k}>{MARGINS[k].label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Zoom: {zoom}%</p>
                  <input type="range" min="60" max="150" step="5" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={includeHeader} onChange={(e) => setIncludeHeader(e.target.checked)} />
                  Include title header block
                </label>
              </div>
            )}
          </div>

          <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
            <i className="fa-solid fa-upload"></i> {!isCompact && <span>Import</span>}
          </button>
          {!isCompact && (
            <button onClick={handlePasteClipboard} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
              <i className="fa-solid fa-paste"></i> <span>Paste</span>
            </button>
          )}
          <div className="h-4 w-px bg-slate-300 mx-0.5"></div>
          <button onClick={exportMD} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
            <i className="fa-solid fa-download"></i> <span>MD</span>
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
            <i className="fa-solid fa-file-pdf text-red-500"></i> <span>PDF</span>
          </button>
          <button onClick={exportDOCX} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shadow-sm">
            <i className="fa-solid fa-file-word"></i> <span>DOCX</span>
          </button>
        </div>
      </header>

      {notification && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 no-print">
          <div className={cx('flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg text-xs font-medium text-white', notification.type === 'error' ? 'bg-red-500' : 'bg-green-500')}>
            <i className={notification.type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check'}></i>
            {notification.msg}
          </div>
        </div>
      )}

      <main className={cx('flex-1 flex overflow-hidden min-h-0 min-w-0 relative', isCompact ? 'flex-col' : 'flex-row')}>
        <div style={{ flexBasis: viewMode === 'split' ? splitRatio + '%' : '100%', display: viewMode === 'preview' ? 'none' : 'flex' }} className="flex-shrink-0 flex flex-col bg-[#1e1e1e] border-r border-[#333] min-h-0 min-w-0">
          <div className="flex items-center px-3 py-1.5 bg-[#252526] border-b border-[#333] flex-shrink-0">
            <span className="text-gray-300 font-medium text-xs flex items-center gap-1.5"><i className="fa-solid fa-code"></i> Markdown Source</span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste or type your markdown / notes here..."
            spellCheck="false"
            className="flex-1 w-full p-4 bg-[#1e1e1e] text-gray-200 font-mono text-sm resize-none focus:outline-none overflow-y-auto min-h-0"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          />
        </div>

        {viewMode === 'split' && (
          <div className={cx('flex-none bg-slate-300 hover:bg-blue-400 transition-colors z-20 flex items-center justify-center', isCompact ? 'w-full h-2.5 cursor-row-resize' : 'w-1.5 h-full cursor-col-resize')} onMouseDown={startSplitDrag} onTouchStart={startSplitDrag}>
            <div className={cx('bg-slate-500 rounded-full pointer-events-none', isCompact ? 'w-8 h-1' : 'w-1 h-8')}></div>
          </div>
        )}

        <div style={{ flexBasis: viewMode === 'split' ? (100 - splitRatio) + '%' : '100%', display: viewMode === 'edit' ? 'none' : 'flex' }}
          className="flex-1 flex flex-col bg-slate-200 min-h-0 min-w-0 relative"
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-200 flex-shrink-0">
            <span className="text-slate-600 font-medium text-xs flex items-center gap-1.5"><i className="fa-solid fa-eye"></i> Page Preview — {theme.name} · {pageSize.label}</span>
            <span className="text-[10px] text-slate-400 font-mono">{stats.words} words · {stats.pages} page(s) · ~{stats.minutes} min read</span>
          </div>
          <div className="flex-1 overflow-auto p-6 md:p-10 flex justify-center">
            {content.trim() === '' ? (
              <div className="flex flex-col items-center justify-center text-center gap-4 text-slate-400 my-auto max-w-sm">
                <i className="fa-regular fa-file-lines text-5xl"></i>
                <p className="text-sm font-medium text-slate-500">Nothing to preview yet. Import a file, paste text, or try a sample.</p>
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current.click()} className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Import File</button>
                  <button onClick={() => setContent(SAMPLE_MD)} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">Load Sample</button>
                </div>
              </div>
            ) : (
              <div style={{ transform: 'scale(' + scale + ')', transformOrigin: 'top center', transition: 'transform 0.15s ease' }}>
                <div
                  ref={pageRef}
                  className={cx('doc-page shadow-xl', isDragOver && 'ring-4 ring-blue-400')}
                  style={Object.assign({ width: pageWidthPx + 'px', minHeight: Math.round(pageWidthPx * 1.414) + 'px', padding: margin.px + 'px', background: theme.vars['--doc-bg'] }, theme.vars)}
                >
                  {includeHeader && (
                    <div style={{ marginBottom: '28px' }}>
                      <h1 style={{ fontFamily: theme.vars['--doc-heading-font'], color: theme.vars['--doc-heading'], fontSize: '2.2em', fontWeight: 700, margin: 0 }}>{title || 'Untitled Document'}</h1>
                      <div style={{ height: '3px', width: '64px', background: theme.vars['--doc-accent'], marginTop: '10px', borderRadius: '2px' }}></div>
                    </div>
                  )}
                  <div className="doc-markdown" dangerouslySetInnerHTML={{ __html: htmlContent }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

return DocForgeApp;
`;
