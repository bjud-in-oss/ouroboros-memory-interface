import { useState } from 'react';
import * as driveService from '../services/driveService';
import { AppData, LongTermMemory, FocusLog } from '../types';

interface UseDriveOperationsProps {
  setMemory: (mem: LongTermMemory) => void;
  setFocus: (focus: FocusLog) => void;
  addSystemMessage: (msg: string) => void;
  onSleep: () => void;
}

export const useDriveOperations = ({ setMemory, setFocus, addSystemMessage, onSleep }: UseDriveOperationsProps) => {
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [backups, setBackups] = useState<{id: string, name: string}[]>([]);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const handleConnectDrive = async () => {
    try {
      driveService.checkConfig(); 
      await driveService.authenticate();
      setIsDriveConnected(true);
      addSystemMessage('Authentication Successful. Neural link established.');
      await handleSyncDown();
    } catch (err: any) {
      addSystemMessage(`Drive Integration Failed: ${err.message || 'Unknown'}`);
    }
  };

  const handleSyncDown = async (fileId?: string) => {
    setIsSyncing(true);
    try {
      const data = await driveService.loadState(fileId);
      if (data) {
        setMemory(data.memory);
        setFocus(data.focus);
        addSystemMessage(`Memory loaded from ${fileId ? 'Backup Fragment' : 'Primary Drive State'}.`);
      } else {
        addSystemMessage('No existing state found on Drive. Initializing default Ouroboros matrix.');
      }
    } catch (err: any) {
      if (err instanceof driveService.SessionExpiredError) {
        onSleep();
      } else {
        addSystemMessage('Failed to load state from Drive. Check connection.');
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
      const payload: AppData = { app_version: "1.3.1", last_sync_timestamp: Date.now(), memory: newMemory, focus: newFocus };
      await driveService.saveState(payload, isManualBackup);
      
      if (isManualBackup) {
          addSystemMessage('Snapshot Protocol: Manual backup successfully stored in Drive.');
      }
    } catch (err: any) {
      if (err instanceof driveService.SessionExpiredError) {
        onSleep();
      } else {
        addSystemMessage(`Sync Failure: ${err.message}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchBackups = async () => {
      try {
        const files = await driveService.listJSONFiles();
        setBackups(files);
        setShowRestoreModal(true);
      } catch (err: any) {
          addSystemMessage(`Failed to list backups: ${err.message}`);
      }
  };

  return {
    isDriveConnected,
    isSyncing,
    setIsSyncing, // Exported if other hooks need to toggle sync state
    setIsDriveConnected,
    handleConnectDrive,
    handleSyncDown,
    handleSyncUp,
    backups,
    fetchBackups,
    showRestoreModal,
    setShowRestoreModal
  };
};