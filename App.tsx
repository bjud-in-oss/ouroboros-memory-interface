import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_MEMORY, INITIAL_FOCUS } from './constants';
import { LongTermMemory, FocusLog, ChatMessage } from './types';
import { processInteraction, checkGeminiConfig } from './services/geminiService';
import * as driveService from './services/driveService';
import MemoryPanel from './components/MemoryPanel';
import FocusPanel from './components/FocusPanel';
import RelinkModal from './components/RelinkModal';
import { Terminal, Trash2, Send, Cpu, HardDrive, Download, Cloud, LogIn, Wrench, X, History, Moon, Zap, AlertTriangle, FileJson, Upload, FileUp, Link } from 'lucide-react';

// Hooks
import { useDriveOperations } from './hooks/useDriveOperations';
import { useArtifacts } from './hooks/useArtifacts';
import { useSystemActions } from './hooks/useSystemActions';

const VOLATILE_MEMORY_KEY = 'ouroboros_volatile_memory';
const CHAT_HISTORY_KEY = 'ouroboros_chat_history';

const App: React.FC = () => {
  const [configError, setConfigError] = useState<string | null>(null);
  const [memory, setMemory] = useState<LongTermMemory>(INITIAL_MEMORY);
  const [focus, setFocus] = useState<FocusLog>(INITIAL_FOCUS);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [
      { role: 'system', content: 'Drive-Augmented Ouroboros System Online. Waiting for connection...', timestamp: Date.now() }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'memory' | 'focus'>('memory');
  const [isSleeping, setIsSleeping] = useState(false);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addSystemMessage = (content: string) => {
    setMessages(prev => [...prev, { role: 'system', content, timestamp: Date.now() }]);
  };

  // --- HOOKS INTEGRATION ---
  const { 
    isDriveConnected, 
    isSyncing, 
    setIsSyncing, 
    handleConnectDrive, 
    handleSyncDown, 
    handleSyncUp, 
    backups, 
    fetchBackups, 
    showRestoreModal, 
    setShowRestoreModal 
  } = useDriveOperations({ 
    setMemory, 
    setFocus, 
    addSystemMessage, 
    onSleep: () => setIsSleeping(true) 
  });

  const {
    showRelinkModal,
    setShowRelinkModal,
    relinkCandidates,
    unlinkedFiles,
    allDriveFiles,
    handleSmartRelink,
    handleFileUpload
  } = useArtifacts({
    memory,
    isDriveConnected,
    setIsSyncing,
    addSystemMessage
  });

  const {
    showImportModal,
    setShowImportModal,
    importText,
    setImportText,
    handleClearChat,
    handleNuclearReset,
    handleDownloadSnapshot,
    handleManualImport
  } = useSystemActions({
    memory,
    focus,
    setMemory,
    setFocus,
    setMessages,
    addSystemMessage,
    onSyncUp: handleSyncUp
  });

  // --- INITIALIZATION & EFFECTS ---

  useEffect(() => {
    try { checkGeminiConfig(); } catch (e: any) { setConfigError(e.message); }
    driveService.loadGoogleScripts(() => {
      console.log("Google Scripts Loaded");
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
    const volatile = { input, focus, timestamp: Date.now() };
    localStorage.setItem(VOLATILE_MEMORY_KEY, JSON.stringify(volatile));
  }, [input, focus]);

  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleRecovery = () => {
    const saved = localStorage.getItem(VOLATILE_MEMORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.input) setInput(parsed.input);
      if (parsed.focus) setFocus(parsed.focus);
      addSystemMessage('Volatile memory recovered from local storage.');
    }
    setRecoveryAvailable(false);
  };

  const handleSendMessage = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isLoading || !isDriveConnected) return;
    
    const userMsg: ChatMessage = { role: 'user', content: textToSend, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    
    setInput('');
    setIsLoading(true);
    
    addSystemMessage('Neural Core: Processing instruction... (Gemini 3 Pro)');

    try {
      const { response, newMemory, newFocus } = await processInteraction(textToSend, memory, focus);
      setMemory(newMemory);
      setFocus(newFocus);
      setMessages(prev => [...prev, { role: 'model', content: response, timestamp: Date.now() }]);
      await handleSyncUp(newMemory, newFocus);
    } catch (error: any) {
      addSystemMessage(`ALERT: ${error.message}`);
      if (error.message.includes("Expired")) setIsSleeping(true);
      else if (!overrideInput) setInput(textToSend);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyRelinkUpdates = (updates: string[]) => {
    setShowRelinkModal(false);
    if (updates.length > 0) {
        const prompt = `SYSTEM MAINTENANCE: User has manually verified file associations via Relink Interface. \n\nPlease update the 'active_projects' list with these VALID file IDs immediately:\n${updates.join('\n')}\n\nPreserve all other project data exactly as is.`;
        setInput(prompt);
        setTimeout(() => handleSendMessage(prompt), 100);
    } else {
        addSystemMessage("Relink cancelled or no changes required.");
    }
  };

  if (configError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <AlertTriangle size={48} className="text-red-500 mx-auto" />
          <div>
            <h1 className="text-xl font-bold text-white uppercase tracking-tighter italic">Configuration Required</h1>
            <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{configError}</p>
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all">
            RETRY INITIALIZATION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-300 font-sans overflow-hidden relative">
      <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e.target.files)} className="hidden" multiple />

      {/* Recovery Prompt */}
      {recoveryAvailable && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-indigo-900/90 backdrop-blur-md border border-indigo-500/50 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl animate-in slide-in-from-top duration-300">
           <span className="text-[10px] font-bold text-white uppercase tracking-wider">Unsaved session detected</span>
           <div className="flex gap-2">
              <button onClick={handleRecovery} className="bg-white text-indigo-900 text-[10px] font-bold px-3 py-1 rounded-full hover:bg-indigo-50 transition-colors">RECOVER</button>
              <button onClick={() => { setRecoveryAvailable(false); localStorage.removeItem(VOLATILE_MEMORY_KEY); }} className="text-white/60 hover:text-white transition-colors"><X size={14}/></button>
           </div>
        </div>
      )}

      {/* Sleep Mode Overlay */}
      {isSleeping && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl transition-all duration-500">
           <div className="text-center space-y-6 max-w-sm px-6">
              <div className="relative inline-block">
                <Moon size={64} className="text-indigo-500 animate-pulse mx-auto" />
                <Zap size={24} className="text-amber-500 absolute -top-1 -right-1" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tighter uppercase italic">Digital Sleep</h2>
              <button onClick={handleConnectDrive} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg">WAKE CORE</button>
           </div>
        </div>
      )}
      
      {/* Relink Modal */}
      <RelinkModal 
          isOpen={showRelinkModal}
          onClose={() => setShowRelinkModal(false)}
          onConfirm={handleApplyRelinkUpdates}
          initialCandidates={relinkCandidates}
          initialUnlinkedFiles={unlinkedFiles}
          allDriveFiles={allDriveFiles}
          activeProjects={memory.active_projects}
      />

      {/* Restore Modal */}
      {showRestoreModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                      <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-indigo-400">
                          <History size={14} /> Restore Point Selection
                      </h2>
                      <button onClick={() => setShowRestoreModal(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                      {backups.map(b => (
                          <button key={b.id} onClick={() => handleSyncDown(b.id)} className="w-full text-left p-3 hover:bg-zinc-800/50 rounded-lg text-zinc-200 text-sm font-medium transition-all mb-1">{b.name}</button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                      <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-emerald-400"><Upload size={14} /> Import Legacy State</h2>
                      <button onClick={() => setShowImportModal(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
                  </div>
                  <div className="p-4 flex-1 flex flex-col min-h-0">
                      <textarea 
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          placeholder='Paste app-data.json content here...'
                          className="flex-1 w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-xs font-mono text-zinc-300 outline-none resize-none custom-scrollbar"
                      />
                  </div>
                  <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-2">
                      <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white">CANCEL</button>
                      <button onClick={() => handleManualImport((mem) => setTimeout(() => { if (window.confirm("Legacy State Detected. Do you want to open the Smart Relink Interface to fix file IDs?")) handleSmartRelink(mem); }, 500))} disabled={!importText.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-6 py-2 rounded-lg transition-all">INJECT MEMORY</button>
                  </div>
              </div>
          </div>
      )}

      {/* Main Container */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar: Chat */}
        <section className="w-1/3 min-w-[320px] flex flex-col border-r border-zinc-800 bg-zinc-950">
          <header className="h-16 border-b border-zinc-800 flex items-center px-6 gap-3 shrink-0 justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                      <Cpu size={18} />
                  </div>
                  <div>
                      <h1 className="font-bold text-zinc-100 tracking-tighter text-sm uppercase italic">Ouroboros Core</h1>
                      <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${isDriveConnected ? 'bg-emerald-500' : 'bg-amber-500'} ${isSyncing ? 'animate-ping' : ''}`}></span>
                          <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest">
                              {isDriveConnected ? (isSyncing ? 'Syncing...' : 'Sync Active') : 'Offline'}
                          </span>
                      </div>
                  </div>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => handleClearChat(CHAT_HISTORY_KEY)} className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded-md border border-zinc-800 transition-colors" title="Clear Chat History"><Trash2 size={14} /></button>
                  {isDriveConnected ? (
                      <div className="flex gap-1">
                        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-blue-400 hover:text-blue-300 rounded-md border border-zinc-800 transition-colors" title="Upload Artifacts"><FileUp size={14} /></button>
                        <button onClick={() => handleSmartRelink()} className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-purple-400 hover:text-purple-300 rounded-md border border-zinc-800 transition-colors" title="Scan & Relink IDs"><Link size={14} /></button>
                        <button onClick={() => setShowImportModal(true)} className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 rounded-md border border-zinc-800 transition-colors" title="Import Legacy JSON"><FileJson size={14} /></button>
                        <button onClick={fetchBackups} className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-500 rounded-md border border-zinc-800 transition-colors" title="Restore"><Wrench size={14} /></button>
                      </div>
                  ) : (
                      <button onClick={handleConnectDrive} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-md transition-all shadow-lg shadow-indigo-500/10"><LogIn size={12} /> CONNECT DRIVE</button>
                  )}
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              {messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 ${
                          msg.role === 'user' ? 'bg-zinc-800 text-zinc-100 rounded-tr-none border border-zinc-700' : msg.role === 'system' ? 'bg-zinc-900/50 text-indigo-400 border border-indigo-900/30 text-[9px] font-mono w-full px-3 py-2 flex items-center gap-2 italic uppercase tracking-wider' : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none'
                      }`}>
                          {msg.role === 'system' && <Terminal size={10} className="shrink-0" />}
                          {msg.content}
                      </div>
                  </div>
              ))}
              <div ref={chatEndRef} />
          </div>

          <footer className="p-4 border-t border-zinc-800 bg-zinc-950">
              <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl transition-all focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20">
                  <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                              e.preventDefault();
                              handleSendMessage();
                          }
                      }}
                      rows={1}
                      placeholder={isDriveConnected ? "Execute instruction... (Ctrl+Enter to send)" : "Connect Drive to interact..."}
                      disabled={isLoading || !isDriveConnected}
                      className="w-full bg-transparent border-none text-zinc-200 text-sm pl-4 pr-12 py-3 focus:ring-0 resize-none max-h-[200px] min-h-[46px] overflow-y-auto custom-scrollbar disabled:opacity-50 font-medium"
                  />
                  <button onClick={() => handleSendMessage()} disabled={isLoading || !input.trim() || !isDriveConnected} aria-label="Send Message" className="absolute right-2 bottom-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-all disabled:opacity-50">
                      {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                  </button>
              </div>
              <div className="flex justify-between items-center mt-3 px-1">
                <div className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest flex items-center gap-1.5">
                    {isSyncing ? <Cloud size={10} className="text-indigo-500 animate-pulse" /> : <HardDrive size={10} />}
                    {isSyncing ? "Uplinking to Drive..." : "Sync stable"}
                </div>
                <div className="text-[9px] text-zinc-700 font-mono">v1.3.5-relink-modular</div>
              </div>
          </footer>
        </section>

        {/* Right Section: Intelligence Panels */}
        <section className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
          <nav className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
              <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                  <button onClick={() => setActiveTab('memory')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'memory' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      <HardDrive size={12} /> Memory
                  </button>
                  <button onClick={() => setActiveTab('focus')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'focus' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      <Terminal size={12} /> Focus
                  </button>
              </div>

              <div className="flex items-center gap-1">
                  <button onClick={() => handleSyncUp(memory, focus, true)} disabled={isSyncing || !isDriveConnected} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors disabled:opacity-30" title="Snapshot to Drive">
                      <Cloud size={18} className={isSyncing ? 'animate-bounce' : ''} />
                  </button>
                  <button onClick={handleDownloadSnapshot} className="p-2 text-zinc-500 hover:text-zinc-300 rounded-md transition-colors"><Download size={18} /></button>
                  <div className="h-4 w-px bg-zinc-800 mx-2"></div>
                  <button onClick={() => handleNuclearReset(VOLATILE_MEMORY_KEY, CHAT_HISTORY_KEY)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors" title="Nuclear Reset"><Trash2 size={18} /></button>
              </div>
          </nav>

          <div className="flex-1 overflow-hidden relative">
              <div className="absolute inset-0 p-6 overflow-y-auto custom-scrollbar">
                {activeTab === 'memory' ? <MemoryPanel memory={memory} /> : <FocusPanel focus={focus} />}
              </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;