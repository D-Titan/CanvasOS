window.CanvasApps['Browser'] = `

// --- Inline SVG Icons ---
const IconHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconExternal = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const IconSearch = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
);

const BrowserApp = ({ data, onUpdate, instanceId }) => {
  // CRITICAL: Extract hooks from the global React object
  const { useState } = React; 

  const [currentUrl, setCurrentUrl] = useState((data && data.url) ? data.url : '');
  const [inputValue, setInputValue] = useState('');

  // --- Core URL Processor ---
  const processQuery = (query) => {
    let q = query.trim();
    if (!q) return '';

    // Double escaped regexes!
    const ytVideoRegex = /(?:youtube\\.com\\/(?:[^\\/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^"&?\\/\\s]{11})/i;
    const ytPlaylistRegex = /[?&]list=([a-zA-Z0-9_-]+)/i;
    
    const videoMatch = q.match(ytVideoRegex);
    const playlistMatch = q.match(ytPlaylistRegex);

    if (videoMatch && videoMatch[1]) {
      // Using standard string concatenation (+) instead of backticks to avoid escaping bugs!
      let embedUrl = 'https://www.youtube.com/embed/' + videoMatch[1];
      console.log("URL: "+ embedUrl);
      if (playlistMatch && playlistMatch[1]) {
        embedUrl += '&list=' + playlistMatch[1];
      }
      return embedUrl;
    } else if (playlistMatch && playlistMatch[1]) {
      return 'https://www.youtube.com/embed/videoseries?list=' + playlistMatch[1];
    }

    const urlRegex = /^(https?:\\/\\/)?([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([\\/\\w \\.-]*)*\\/?(\\?.*)?(#.*)?$/i;
    if (urlRegex.test(q)) {
      return q.startsWith('http') ? q : 'https://' + q;
    }

    return 'https://www.google.com/search?igu=1&q=' + encodeURIComponent(q);
  };

  const handleNavigate = (url) => {
    const processedUrl = processQuery(url);
    if (!processedUrl) return;

    setCurrentUrl(processedUrl);
    setInputValue('');
    
    if (onUpdate) onUpdate({ url: processedUrl }); 
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNavigate(inputValue);
      e.target.blur(); 
    }
  };

  const goHome = () => {
    setCurrentUrl('');
    setInputValue('');
    if (onUpdate) onUpdate({ url: '' });
  };
  
  const openExternal = () => {
    if (currentUrl) window.open(currentUrl, '_blank');
  };

  const shortcuts = [
    { name: 'Google', url: 'https://www.google.com/search?igu=1&sourceid=chrome&udm=50&aep=42&source=chrome.crn.rb' },
    { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' },
    { name: 'CoPilot', url: 'https://www.bing.com/copilotsearch?&FORM=CSSCOP' },
    { name: 'Music Editor', url: 'https://signalmidi.app/edit' },
    { name: 'Tools', url: 'https://onecompiler.com/tools' }
  ];

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 shadow-sm z-10 w-full shrink-0">
        <div className="flex items-center shrink-0">
          <button onClick={goHome} disabled={!currentUrl} className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Go to Home">
            <IconHome />
          </button>
        </div>
        <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-700 rounded-full px-3 py-2 min-w-0 shadow-inner">
          <IconSearch className="text-slate-400 w-4 h-4 mr-2 shrink-0" />
          <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="Search Google or enter web address" className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 truncate" autoComplete="off" spellCheck="false" />
        </div>
        <button onClick={openExternal} disabled={!currentUrl} className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors shrink-0" title="Open in actual browser tab">
          <IconExternal />
        </button>
      </header>

      <main className="flex-1 relative bg-white dark:bg-slate-950 w-full overflow-hidden">
        {!currentUrl ? (
          <div className="absolute inset-0 overflow-y-auto p-4 flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold mb-2 text-slate-800 dark:text-slate-100 tracking-tight">Mini Web</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm text-center max-w-sm">Enter a search term or a URL. YouTube links embed automatically.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 w-full max-w-4xl px-2">
              {shortcuts.map(s => (
                <button key={s.name} onClick={() => handleNavigate(s.url)} className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full bg-white dark:bg-white">
             {currentUrl && (
              <iframe key={currentUrl} src={currentUrl} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-downloads" title="Browser View" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// CRITICAL: Return the component at the very end
return BrowserApp;
`;