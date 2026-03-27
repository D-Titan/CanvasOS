window.CanvasApps['Browser'] = `

// --- Inline SVG Icons ---
const IconHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconExternal = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const IconSearch = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
);

const IconChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const IconChevronUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const BrowserApp = ({ data, onUpdate, instanceId }) => {
  // CRITICAL: Extract hooks from the global React object
  const { useState } = React; 

  const [currentUrl, setCurrentUrl] = useState((data && data.url) ? data.url : '');
  const [inputValue, setInputValue] = useState('');
  const [isBarVisible, setIsBarVisible] = useState(true);

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

  const handleDrop = (e) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text');
    if (text) {
      setInputValue(text);
      // Removed the auto-navigation here so it waits for Enter
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
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
    <div className="flex flex-col h-full w-full relative bg-white dark:bg-slate-950 overflow-hidden">
      
      <main className="flex-1 relative w-full overflow-hidden">
        {!currentUrl ? (
          <div className="absolute inset-0 overflow-y-auto p-4 flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold mb-2 text-slate-800 dark:text-slate-100 tracking-tight text-center">Mini Web</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm text-center max-w-sm px-4">Enter a search term or a URL. You can also drag and drop text into the search bar below.</p>
            
            {/* Container responsive grid instead of viewport breakpoints */}
            <div className="w-full max-w-4xl px-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem' }}>
              {shortcuts.map(s => (
                <button key={s.name} onClick={() => handleNavigate(s.url)} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate w-full text-center">{s.name}</span>
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

      {/* Floating reveal button when the bar is hidden */}
      {!isBarVisible && (
        <button 
          onClick={() => setIsBarVisible(true)} 
          className="absolute bottom-3 left-1/2 transform -translate-x-1/2 p-1.5 bg-slate-800/60 hover:bg-slate-800 dark:bg-slate-200/60 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-full backdrop-blur z-30 shadow-lg transition-all hover:scale-110" 
          title="Show Navigation Bar"
        >
          <IconChevronUp />
        </button>
      )}

      {/* Sticky Bottom Navigation Bar */}
      <footer className={"w-full shrink-0 flex items-center gap-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.1)] z-20 border-t border-slate-200 dark:border-slate-700 transition-all duration-300 overflow-hidden " + (isBarVisible ? "h-auto p-1.5 opacity-100" : "h-0 p-0 opacity-0 border-0")}>
        
        <div className="flex items-center shrink-0">
          <button onClick={goHome} disabled={!currentUrl} className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Go to Home">
            <IconHome />
          </button>
        </div>
        
        <div 
          className="flex-1 flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg px-2.5 py-1.5 min-w-0 shadow-inner border border-transparent focus-within:border-blue-400 dark:focus-within:border-slate-500 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          title="Drag and drop text here"
        >
          <IconSearch className="text-slate-400 w-3.5 h-3.5 mr-2 shrink-0" />
          <input 
            type="text" 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            onKeyDown={handleKeyDown} 
            placeholder="Search, URL, or drop text..." 
            className="w-full bg-transparent outline-none text-[13px] text-slate-900 dark:text-slate-100 truncate" 
            autoComplete="off" 
            spellCheck="false" 
          />
        </div>

        <div className="flex items-center shrink-0">
          <button onClick={openExternal} disabled={!currentUrl} className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Open in external browser tab">
            <IconExternal />
          </button>
          
          <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>

          <button onClick={() => setIsBarVisible(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Hide Navigation Bar">
            <IconChevronDown />
          </button>
        </div>
      </footer>
      
    </div>
  );
};

// CRITICAL: Return the component at the very end
return BrowserApp;
`;
