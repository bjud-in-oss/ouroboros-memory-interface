
import { useState } from 'react';
import { LongTermMemory, FocusLog } from '../types';
import { INITIAL_MEMORY, INITIAL_FOCUS } from '../constants';

interface UseSystemActionsProps {
  memory: LongTermMemory;
  focus: FocusLog;
  setMemory: (mem: LongTermMemory) => void;
  setFocus: (focus: FocusLog) => void;
  setMessages: (msgs: any[]) => void;
  addSystemMessage: (msg: string) => void;
  onSyncUp: (mem: LongTermMemory, focus: FocusLog, manual: boolean) => Promise<void>;
}

export const useSystemActions = ({ 
  memory, 
  focus, 
  setMemory, 
  setFocus, 
  setMessages, 
  addSystemMessage,
  onSyncUp 
}: UseSystemActionsProps) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  const handleClearChat = (chatHistoryKey: string) => {
    if (window.confirm("Clear all chat messages? This will not affect Drive memory.")) {
        setMessages([]);
        localStorage.removeItem(chatHistoryKey);
    }
  };

  const handleNuclearReset = (volatileKey: string, chatHistoryKey: string) => {
    if(window.confirm("Nuclear reset? This wipes local volatile state and resets session.")) {
        setMemory(INITIAL_MEMORY);
        setFocus(INITIAL_FOCUS);
        localStorage.removeItem(volatileKey);
        localStorage.removeItem(chatHistoryKey);
        window.location.reload();
    }
  };

  const handleDownloadSnapshot = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ memory, focus }, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `ouroboros_backup_${new Date().toISOString().split('T')[0]}.json`);
    dl.click();
    addSystemMessage('Local storage: State exported as JSON file.');
  };

  const handleManualImport = async (onSuccess?: (importedMem: LongTermMemory) => void) => {
    try {
        const parsed = JSON.parse(importText);
        if (!parsed.memory || !parsed.focus) {
            throw new Error("Invalid format. JSON must contain 'memory' and 'focus' root keys.");
        }
        if (window.confirm("Overwrite current mental state with this import? This will be saved to Drive immediately.")) {
            setMemory(parsed.memory);
            setFocus(parsed.focus);
            setImportText('');
            setShowImportModal(false);
            addSystemMessage('Manual Import: State injected successfully. Uplinking to Drive...');
            await onSyncUp(parsed.memory, parsed.focus, false);
            
            if (onSuccess) onSuccess(parsed.memory);
        }
    } catch (e: any) {
        alert(`Import Failed: ${e.message}`);
    }
  };

  return {
    showImportModal,
    setShowImportModal,
    importText,
    setImportText,
    handleClearChat,
    handleNuclearReset,
    handleDownloadSnapshot,
    handleManualImport
  };
};
