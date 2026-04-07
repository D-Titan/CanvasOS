window.CanvasApps = {}; // This will hold the giant strings of code

window.AppRegistry = [
    {
        id: 'OneCompiler',
        name: 'Compiler',
        iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><polyline points="8 10 12 14 8 18"></polyline><line x1="13" y1="18" x2="17" y2="18"></line></svg>',
        scriptPath: 'apps/OneCompiler.js'
    },
    {
        id: 'Browser', // A unique ID for the system
        name: 'Browser', // The label on the Dock
        hidden: false,
        // A simple globe SVG icon for the dock
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
        scriptPath: 'apps/Browser.js' // Where CanvasOS will look for the file
    },
        {
        id: 'Note',
        name: 'Notes',
        hidden: false,
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#fef3c7" stroke="#fb923c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6" fill="#fed7aa"/></svg>`,
        scriptPath: 'apps/Note.js'
    },

    {
        id: 'DrawIt',
        name: 'Draw',
        hidden: false,
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/></svg>`,
        scriptPath: 'apps/Drawit.js'
    },
        {
        id: 'WordEditor',
        name: 'Word Editor',
        hidden: false,
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2b579a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="10" y2="9"/></svg>`,
        scriptPath: 'apps/WordEditor.js'
    },
        {
        id: 'MdEditor',
        name: 'MD Editor',
        hidden: false,
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><path d="M7 15V9l2.5 2.5L12 9v6"/><path d="M15 12v3l2.5-2.5L20 15v-6h-5z"/></svg>`,
        scriptPath: 'apps/MdEditor.js'
    },
        {
        id: 'Boards',
        name: 'Board',
        hidden: false,
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/></svg>`,
        scriptPath: 'apps/Boards.js'
    },
        {
        id: 'MediaEditor',
        name: 'Media Editor',
        hidden: true, // Prevents this from showing up on the dock!
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
        scriptPath: 'apps/MediaEditor.js'
    }

];
