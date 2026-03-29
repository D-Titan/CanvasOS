window.CanvasApps['OneCompiler'] = `
const { useEffect, useState } = React;

const OneCompilerApp = ({ instanceId, title }) => {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="w-full h-full flex flex-col bg-[#0f172a] relative">
            {/* Simple Loading State */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a] text-slate-400 z-10 gap-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-semibold tracking-wide">Connecting to OneCompiler...</span>
                </div>
            )}
            
            <iframe 
                src="https://onecompiler.com/" 
                className="w-full h-full border-0 flex-1 z-20"
                title="OneCompiler IDE"
                onLoad={() => setIsLoading(false)}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            />
        </div>
    );
};

return OneCompilerApp;
`;
