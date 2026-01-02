import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_MEMORY, INITIAL_FOCUS } from './constants';
import { LongTermMemory, FocusLog, ChatMessage, AppData } from './types';
import { processInteraction } from './services/geminiService';
import * as driveService from './services/driveService';
import MemoryPanel from './components/MemoryPanel';
import FocusPanel from './components/FocusPanel';
import { Terminal, Trash2, Send, Cpu, HardDrive, Download, Cloud, LogIn, Bug, Wrench, X, History, Moon, Zap } from 'lucide-react';

const VOLATILE_MEMORY_KEY = 'ouroboros_volatile_memory';

const App: React.FC = () => {
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
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [backups, setBackups] = useState<{id: string, name: string}[]>([]);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persistence: Save to local storage on every state change
  useEffect(() => {
    const volatile = { input, focus, timestamp: Date.now() };
    localStorage.setItem(VOLATILE_MEMORY_KEY, JSON.stringify(volatile));
  }, [input, focus]);

  useEffect(() => {
    driveService.loadGoogleScripts(() => {
      console.log("Google Scripts Loaded");
      // Check for recovery
      const saved = localStorage.getItem(VOLATILE_MEMORY_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.input || (parsed.focus && parsed.focus.current_objective !== INITIAL_FOCUS.current_objective)) {
            setRecoveryAvailable(true);
          }
        } catch (e) {}
      }
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleRecovery = () => {
    const saved = localStorage.getItem(VOLATILE_MEMORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.input) setInput(parsed.input);
      if (parsed.focus) setFocus(parsed.focus);
      setMessages(prev => [...prev, { role: 'system', content: 'Volatile memory recovered from local storage.', timestamp: Date.now() }]);
    }
    setRecoveryAvailable(false);
  };

  const handleConnectDrive = async () => {
    try {
      await driveService.authenticate();
      setIsDriveConnected(true);
      setIsSleeping(false);
      setMessages(prev => [...prev, { role: 'system', content: 'Authentication Successful.', timestamp: Date.now() }]);
      await handleSyncDown();
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'system', content: `Auth Failed: ${err.message || 'Unknown'}`, timestamp: Date.now() }]);
    }
  };

  const handleSyncDown = async (fileId?: string) => {
    setIsSyncing(true);
    try {
      const data = await driveService.loadState(fileId);
      if (data) {
        setMemory(data.memory);
        setFocus(data.focus);
        setMessages(prev => [...prev, { role: 'system', content: `Memory loaded from ${fileId ? 'Backup' : 'Drive'}.`, timestamp: Date.now() }]);
      } else {
        setMessages(prev => [...prev, { role: 'system', content: 'No state found. Initializing defaults.', timestamp: Date.now() }]);
      }
    } catch (err: any) {
      if (err instanceof driveService.SessionExpiredError) {
        setIsSleeping(true);
      } else {
        setMessages(prev => [...prev, { role: 'system', content: 'Failed to load from Drive.', timestamp: Date.now() }]);
      }
    } finally {
      setIsSyncing(false);
      setShowRestoreModal(false);
    }
  };

  const handleSyncUp = async (newMemory: LongTermMemory, newFocus: FocusLog, isManualBackup: boolean = false) => {
    if (!isDriveConnected) return;
    setIsSyncing(true);
    try {
      const payload: AppData = { app_version: "1.3.0", last_sync_timestamp: Date.now(), memory: newMemory, focus: newFocus };
      const id = await driveService.saveState(payload, isManualBackup);
      if (isManualBackup) {
          setMessages(prev => [...prev, { role: 'system', content: `Cloud Backup Created: ${id}`, timestamp: Date.now() }]);
      }
    } catch (err: any) {
      if (err instanceof driveService.SessionExpiredError) {
        setIsSleeping(true);
      } else {
        setMessages(prev => [...prev, { role: 'system', content: 'WARNING: Drive Sync Failed.', timestamp: Date.now() }]);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenRestore = async () => {
      setIsSyncing(true);
      try {
        const files = await driveService.listJSONFiles();
        setBackups(files);
        setShowRestoreModal(true);
      } catch (err: any) {
        if (err instanceof driveService.SessionExpiredError) setIsSleeping(true);
      } finally {
        setIsSyncing(false);
      }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !isDriveConnected) return;
    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const { response, newMemory, newFocus } = await processInteraction(currentInput, memory, focus);
      setMemory(newMemory);
      setFocus(newFocus);
      setMessages(prev => [...prev, { role: 'model', content: response, timestamp: Date.now() }]);
      await handleSyncUp(newMemory, newFocus);
    } catch (error: any) {
      if (error instanceof driveService.SessionExpiredError) {
        setIsSleeping(true);
        setInput(currentInput); // Put it back so they can retry
      } else {
        setMessages(prev => [...prev, { role: 'system', content: `Neural Error: ${error.message}`, timestamp: Date.now() }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-zinc-300 font-sans overflow-hidden relative">
      
      {/* Recovery Prompt */}
      {recoveryAvailable && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-indigo-900 border border-indigo-500 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl shadow-indigo-500/50">
           <span className="text-xs font-bold text-white uppercase tracking-tighter">Unsaved session found</span>
           <div className="flex gap-2">
              <button onClick={handleRecovery} className="bg-white text-indigo-900 text-[10px] font-bold px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors">RECOVER</button>
              <button onClick={() => { setRecoveryAvailable(false); localStorage.removeItem(VOLATILE_MEMORY_KEY); }} className="text-white/60 hover:text-white transition-colors"><X size={14}/></button>
           </div>
        </div>
      )}

      {/* Sleep Mode Overlay */}
      {isSleeping && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
           <div className="text-center space-y-6 max-w-sm px-6">
              <div className="relative inline-block">
                <Moon size={64} className="text-indigo-500 animate-pulse mx-auto" />
                <Zap size={24} className="text-amber-500 absolute -top-1 -right-1" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tighter">Digital Sleep</h2>
                <p className="text-zinc-500 text-sm mt-2 leading-relaxed">Your session token has expired. All thought processes are preserved in local volatile memory. Wake the core to continue.</p>
              </div>
              <button 
                onClick={handleConnectDrive}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95"
              >
                <Zap size={18} /> WAKE SYSTEM CORE
              </button>
           </div>
        </div>
      )}
      
      {/* Restore Modal */}
      {showRestoreModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                      <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                          <History size={16} /> Restore Point Selection
                      </h2>
                      <button onClick={() => setShowRestoreModal(false)} className="text-zinc-500 hover:text-white">
                          <X size={18} />
                      </button>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                      {backups.length === 0 && <p className="text-center py-8 text-zinc-600 italic">No backups found.</p>}
                      {backups.map(b => (
                          <button 
                            key={b.id} 
                            onClick={() => handleSyncDown(b.id)}
                            className="w-full text-left p-3 hover:bg-zinc-800 rounded-lg border border-transparent hover:border-zinc-700 transition-all mb-1 group"
                          >
                              <div className="text-zinc-200 text-sm font-medium group-hover:text-indigo-400">{b.name}</div>
                              <div className="text-[10px] text-zinc-500 font-mono mt-1">{b.id}</div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Left Sidebar: Chat Interface */}
      <div className="w-1/3 flex flex-col border-r border-zinc-800 bg-[#0c0c0e]">
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
                            {isDriveConnected ? 'Stable' : 'Offline'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                {isDriveConnected && (
                    <button 
                        onClick={handleOpenRestore}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-500 hover:text-amber-300 rounded-md transition-colors border border-zinc-700"
                        title="Restore Memory from Backup"
                    >
                        <Wrench size={14} />
                    </button>
                )}
                {!isDriveConnected && (
                    <button onClick={handleConnectDrive} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-xs px-3 py-1.5 rounded-md transition-colors border border-zinc-700">
                        <LogIn size={12} /> Connect
                    </button>
                )}
            </div>
        </div>

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
                </div>
            ))}
            <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-zinc-800 bg-[#0c0c0e]">
            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={isDriveConnected ? "Interface with the neural core..." : "Connect Drive..."}
                    disabled={isLoading || !isDriveConnected}
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all disabled:opacity-50"
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim() || !isDriveConnected}
                    className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors disabled:opacity-50"
                >
                    <Send size={16} />
                </button>
            </div>
            <div className="text-[10px] text-zinc-600 mt-2 text-center flex items-center justify-center gap-1">
                {isSyncing ? <Cloud size={10} className="animate-pulse text-indigo-400" /> : <HardDrive size={10} />}
                <span>{isSyncing ? "Syncing Drive..." : "Drive-Augmented Loop"}</span>
            </div>
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 flex flex-col bg-[#09090b]">
        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#09090b]">
            <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                <button onClick={() => setActiveTab('memory')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'memory' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <HardDrive size={14} /> Long Term Memory
                </button>
                <button onClick={() => setActiveTab('focus')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'focus' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <Terminal size={14} /> Current Focus
                </button>
            </div>

            <div className="flex items-center gap-2">
                <button 
                    onClick={() => handleSyncUp(memory, focus, true)}
                    className="p-2 text-indigo-400 hover:text-indigo-200 hover:bg-indigo-900/20 rounded-md transition-colors"
                    title="Cloud Backup to Drive"
                >
                    <Cloud size={18} />
                </button>
                <button onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ memory, focus }, null, 2));
                    const dl = document.createElement('a');
                    dl.setAttribute("href", dataStr);
                    dl.setAttribute("download", "ouroboros_backup.json");
                    dl.click();
                }} className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors" title="Download Local Backup">
                    <Download size={18} />
                </button>
                <div className="h-4 w-px bg-zinc-800 mx-1"></div>
                <button onClick={() => {
                    if(window.confirm("Wipe local state?")) {
                        setMemory(INITIAL_MEMORY);
                        setFocus(INITIAL_FOCUS);
                        setMessages([{ role: 'system', content: 'State reset to version 1.3 defaults.', timestamp: Date.now() }]);
                        localStorage.removeItem(VOLATILE_MEMORY_KEY);
                    }
                }} className="p-2 text-red-900 hover:text-red-500 hover:bg-red-900/20 rounded-md transition-colors" title="Reset Local State">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-hidden p-6 relative">
            {activeTab === 'memory' ? <MemoryPanel memory={memory} /> : <FocusPanel focus={focus} />}
        </div>
      </div>
    </div>
  );
};

export default App;