import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_MEMORY, INITIAL_FOCUS } from './constants';
import { LongTermMemory, FocusLog, ChatMessage, AppData } from './types';
import { processInteraction } from './services/geminiService';
import * as driveService from './services/driveService';
import MemoryPanel from './components/MemoryPanel';
import FocusPanel from './components/FocusPanel';
import { Terminal, Trash2, Send, Cpu, HardDrive, Download, Cloud, LogIn, Bug, Wrench } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [memory, setMemory] = useState<LongTermMemory>(INITIAL_MEMORY);
  const [focus, setFocus] = useState<FocusLog>(INITIAL_FOCUS);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'Drive-Augmented Ouroboros System Online. Waiting for connection...', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'memory' | 'focus'>('memory');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  
  // Initialize Google Scripts
  useEffect(() => {
    driveService.loadGoogleScripts(() => {
      console.log("Google Scripts Loaded");
      // Optionally try silent auth here if we had persistence logic for sessions
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Handlers ---

  const handleConnectDrive = async () => {
    try {
      await driveService.authenticate();
      setIsDriveConnected(true);
      setMessages(prev => [...prev, { role: 'system', content: 'Authentication Successful. Syncing with Drive...', timestamp: Date.now() }]);
      await handleSyncDown();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || JSON.stringify(err);
      setMessages(prev => [...prev, { role: 'system', content: `Authentication Failed: ${msg}`, timestamp: Date.now() }]);
    }
  };

  const handleSyncDown = async () => {
    setIsSyncing(true);
    try {
      const data = await driveService.loadState();
      if (data) {
        setMemory(data.memory);
        setFocus(data.focus);
        setMessages(prev => [...prev, { role: 'system', content: 'Memory loaded from Drive.', timestamp: Date.now() }]);
      } else {
        setMessages(prev => [...prev, { role: 'system', content: 'No existing memory found on Drive. Using default state.', timestamp: Date.now() }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'system', content: 'Failed to load from Drive.', timestamp: Date.now() }]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncUp = async (newMemory: LongTermMemory, newFocus: FocusLog) => {
    if (!isDriveConnected) return;
    setIsSyncing(true);
    try {
      const payload: AppData = {
        app_version: "1.0.0",
        last_sync_timestamp: Date.now(),
        memory: newMemory,
        focus: newFocus
      };
      await driveService.saveState(payload);
      // Optional: Visual indicator of success?
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'system', content: 'WARNING: Drive Sync Failed.', timestamp: Date.now() }]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDiagnostics = async () => {
    if (!isDriveConnected) {
        setMessages(prev => [...prev, { role: 'system', content: 'Connect to Drive to run diagnostics.', timestamp: Date.now() }]);
        return;
    }
    setMessages(prev => [...prev, { role: 'system', content: 'Running System Diagnostics...', timestamp: Date.now() }]);
    const report = await driveService.runDiagnostics();
    setMessages(prev => [...prev, { role: 'system', content: report, timestamp: Date.now() }]);
  };

  const handleRepair = async () => {
    if (!isDriveConnected) {
        setMessages(prev => [...prev, { role: 'system', content: 'Connect to Drive to perform repairs.', timestamp: Date.now() }]);
        return;
    }
    setMessages(prev => [...prev, { role: 'system', content: 'Initiating Surgical Memory Injection...', timestamp: Date.now() }]);
    const result = await driveService.performSurgicalInjection();
    setMessages(prev => [...prev, { role: 'system', content: result, timestamp: Date.now() }]);
    
    // Auto sync down if successful
    if (result.includes("online")) {
        await handleSyncDown();
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (!isDriveConnected) {
       setMessages(prev => [...prev, { role: 'system', content: 'Please connect to Drive before interacting.', timestamp: Date.now() }]);
       return;
    }

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { response, newMemory, newFocus } = await processInteraction(input, memory, focus);
      
      setMemory(newMemory);
      setFocus(newFocus);
      setMessages(prev => [...prev, { role: 'model', content: response, timestamp: Date.now() }]);
      
      // Auto-sync after every turn (Ouroboros loop)
      await handleSyncUp(newMemory, newFocus);

    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || "Unknown error connecting to Neural Interface.";
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${errorMessage}`, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ memory, focus }, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "ouroboros_backup.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleReset = async () => {
      if(window.confirm("Are you sure you want to wipe local memory? This does not delete the file on Drive yet.")) {
        setMemory(INITIAL_MEMORY);
        setFocus(INITIAL_FOCUS);
        setMessages([{ role: 'system', content: 'Local Memory Wiped.', timestamp: Date.now() }]);
      }
      useEffect(() => {
  // DEBUG: Exponera driveService till window för manuell testning
  (window as any).driveService = driveService;
  console.log("🔧 MANUAL OVERRIDE: driveService is now accessible via window.driveService");
}, []);
  };

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-zinc-300 font-sans overflow-hidden">
      
      {/* Left Sidebar: Chat Interface */}
      <div className="w-1/3 flex flex-col border-r border-zinc-800 bg-[#0c0c0e]">
        
        {/* Header */}
        <div className="h-16 border-b border-zinc-800 flex items-center px-6 gap-3 select-none justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <Cpu size={18} />
                </div>
                <div>
                    <h1 className="font-bold text-zinc-100 tracking-tight">Ouroboros</h1>
                    <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isDriveConnected ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></span>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                            {isDriveConnected ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                {isDriveConnected && (
                    <>
                        <button 
                            onClick={handleDiagnostics}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-md transition-colors border border-zinc-700"
                            title="Run System Diagnostics"
                        >
                            <Bug size={14} />
                        </button>
                        <button 
                            onClick={handleRepair}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-500 hover:text-amber-300 rounded-md transition-colors border border-zinc-700"
                            title="Surgical Memory Injection (Repair)"
                        >
                            <Wrench size={14} />
                        </button>
                    </>
                )}
                {!isDriveConnected && (
                    <button 
                        onClick={handleConnectDrive}
                        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-xs px-3 py-1.5 rounded-md transition-colors border border-zinc-700"
                    >
                        <LogIn size={12} /> Connect
                    </button>
                )}
            </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
            {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                            ? 'bg-zinc-800 text-zinc-100 rounded-tr-none' 
                            : msg.role === 'system'
                            ? 'bg-red-900/20 text-red-400 border border-red-900/30 text-xs font-mono w-full whitespace-pre-wrap'
                            : 'bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-tl-none'
                    }`}>
                        {msg.content}
                    </div>
                    {msg.role !== 'system' && (
                         <span className="text-[10px] text-zinc-600 mt-1 px-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    )}
                </div>
            ))}
            {isLoading && (
                <div className="flex items-start">
                    <div className="bg-[#18181b] border border-zinc-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                         <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                         <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-zinc-800 bg-[#0c0c0e]">
            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={isDriveConnected ? "Interface with the neural core..." : "Connect Drive to activate..."}
                    disabled={isLoading || !isDriveConnected}
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim() || !isDriveConnected}
                    className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={16} />
                </button>
            </div>
            <div className="text-[10px] text-zinc-600 mt-2 text-center flex items-center justify-center gap-1">
                {isSyncing ? <Cloud size={10} className="animate-pulse text-indigo-400" /> : <HardDrive size={10} />}
                <span>{isSyncing ? "Syncing with Drive..." : "Drive-Augmented Memory Access"}</span>
            </div>
        </div>
      </div>

      {/* Right Content: Memory & Focus Dashboard */}
      <div className="flex-1 flex flex-col bg-[#09090b]">
        
        {/* Toolbar */}
        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#09090b]">
            {/* Tabs */}
            <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                <button
                    onClick={() => setActiveTab('memory')}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                        activeTab === 'memory' 
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <HardDrive size={14} /> Long Term Memory (JSON)
                </button>
                <button
                    onClick={() => setActiveTab('focus')}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                        activeTab === 'focus' 
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <Terminal size={14} /> Current Focus (MD)
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleDownload}
                    className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                    title="Backup to local machine"
                >
                    <Download size={18} />
                </button>
                <div className="h-4 w-px bg-zinc-800 mx-1"></div>
                <button 
                    onClick={handleReset}
                    className="p-2 text-red-900 hover:text-red-500 hover:bg-red-900/20 rounded-md transition-colors"
                    title="Wipe Local Memory"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-6 relative">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
            
            {activeTab === 'memory' ? (
                <div className="h-full animate-in fade-in duration-300">
                    <MemoryPanel memory={memory} />
                </div>
            ) : (
                <div className="h-full animate-in fade-in duration-300">
                    <FocusPanel focus={focus} />
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default App;