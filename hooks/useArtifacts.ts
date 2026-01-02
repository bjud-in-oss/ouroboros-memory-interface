import { useState } from 'react';
import * as driveService from '../services/driveService';
import { LongTermMemory, RelinkCandidate, UnlinkedFileCandidate } from '../types';

interface UseArtifactsProps {
  memory: LongTermMemory;
  isDriveConnected: boolean;
  setIsSyncing: (val: boolean) => void;
  addSystemMessage: (msg: string) => void;
}

export const useArtifacts = ({ memory, isDriveConnected, setIsSyncing, addSystemMessage }: UseArtifactsProps) => {
  const [showRelinkModal, setShowRelinkModal] = useState(false);
  const [relinkCandidates, setRelinkCandidates] = useState<RelinkCandidate[]>([]);
  const [unlinkedFiles, setUnlinkedFiles] = useState<UnlinkedFileCandidate[]>([]);
  const [allDriveFiles, setAllDriveFiles] = useState<{id: string, name: string, mimeType: string}[]>([]);

  const handleSmartRelink = async (currentMem: LongTermMemory = memory) => {
      if (!isDriveConnected) return;
      setIsSyncing(true);
      addSystemMessage("Initiating Smart Relink Protocol (Fetching File Manifest)...");
      
      try {
          const allFiles = await driveService.listAllFiles();
          setAllDriveFiles(allFiles);

          const candidates: RelinkCandidate[] = [];
          const usedFileIds = new Set<string>();

          for (const project of currentMem.active_projects) {
              if (project.detailed_spec_file_id) usedFileIds.add(project.detailed_spec_file_id);

              let matchId = null;
              let matchName = undefined;

              // Auto-Match Heuristics
              const exactIdMatch = allFiles.find(f => f.name.includes(project.id));
              if (exactIdMatch) { matchId = exactIdMatch.id; matchName = exactIdMatch.name; }

              if (!matchId) {
                  const nameMatch = allFiles.find(f => f.name.includes(project.name));
                  if (nameMatch) { matchId = nameMatch.id; matchName = nameMatch.name; }
              }

              if (!matchId) {
                   const words = project.name.split(' ');
                   if (words.length > 1) {
                       const shortName = words.slice(0, Math.min(3, words.length)).join(' ');
                       const fuzzyMatch = allFiles.find(f => f.name.includes(shortName));
                       if (fuzzyMatch) { matchId = fuzzyMatch.id; matchName = fuzzyMatch.name; }
                   }
              }

              candidates.push({
                  projectName: project.name,
                  projectId: project.id,
                  currentId: project.detailed_spec_file_id,
                  proposedId: matchId, 
                  proposedName: matchName,
                  status: matchId ? 'match_found' : 'no_match'
              });
          }
          setRelinkCandidates(candidates);

          const unlinked = allFiles
            .filter(f => !usedFileIds.has(f.id) && f.name !== 'app-data.json' && !f.name.includes('app-data.backup'))
            .map(f => ({
              fileId: f.id,
              fileName: f.name,
              mimeType: f.mimeType,
              assignedProjectId: null
            }));
          setUnlinkedFiles(unlinked);

          setIsSyncing(false);
          setShowRelinkModal(true);

      } catch (e: any) {
          setIsSyncing(false);
          addSystemMessage(`Scan Failed: ${e.message}`);
      }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;
    
    for (let i = 0; i < files.length; i++) {
        try {
            await driveService.uploadArtifact(files[i]);
            successCount++;
        } catch (e: any) {
            addSystemMessage(`Failed to upload ${files[i].name}: ${e.message}`);
        }
    }
    
    addSystemMessage(`Artifact Injection: ${successCount} files uploaded successfully.`);
    setIsSyncing(false);

    if (successCount > 0) {
        setTimeout(() => {
            if (window.confirm("Artifacts uploaded. Do you want to open the Smart Relink Interface to map these files?")) {
                handleSmartRelink();
            }
        }, 500);
    }
  };

  return {
    showRelinkModal,
    setShowRelinkModal,
    relinkCandidates,
    unlinkedFiles,
    allDriveFiles,
    handleSmartRelink,
    handleFileUpload
  };
};