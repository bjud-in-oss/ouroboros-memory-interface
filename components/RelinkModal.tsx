import React, { useState, useEffect } from 'react';
import { FileSearch, X, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { RelinkCandidate, UnlinkedFileCandidate, Project } from '../types';

interface DriveFileMinimal {
  id: string;
  name: string;
  mimeType: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updates: string[]) => void;
  initialCandidates: RelinkCandidate[];
  initialUnlinkedFiles: UnlinkedFileCandidate[];
  allDriveFiles: DriveFileMinimal[];
  activeProjects: Project[];
}

const RelinkModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  initialCandidates, 
  initialUnlinkedFiles, 
  allDriveFiles,
  activeProjects 
}) => {
  const [relinkMode, setRelinkMode] = useState<'projects' | 'files'>('projects');
  const [candidates, setCandidates] = useState<RelinkCandidate[]>([]);
  const [unlinkedFiles, setUnlinkedFiles] = useState<UnlinkedFileCandidate[]>([]);

  // Initialize local state when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setCandidates(initialCandidates);
      setUnlinkedFiles(initialUnlinkedFiles);
      setRelinkMode('projects'); // Default tab
    }
  }, [isOpen, initialCandidates, initialUnlinkedFiles]);

  const handleApply = () => {
    const updates: string[] = [];

    // 1. Process Project View Changes
    for (const c of candidates) {
        if (c.proposedId && c.proposedId !== c.currentId) {
            const fileName = allDriveFiles.find(f => f.id === c.proposedId)?.name || 'Unknown File';
            updates.push(`- Project "${c.projectName}": Change ID to "${c.proposedId}" (File: ${fileName})`);
        }
    }

    // 2. Process File View Changes
    for (const f of unlinkedFiles) {
        if (f.assignedProjectId) {
            const project = activeProjects.find(p => p.id === f.assignedProjectId);
            if (project) {
                // Check if this overlaps with an existing update from step 1 to avoid duplicates/conflicts?
                // For simplicity, we append. The agent handles the latest instruction.
                updates.push(`- Project "${project.name}": Change ID to "${f.fileId}" (File: ${f.fileName})`);
            }
        }
    }

    onConfirm(updates);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col h-[85vh]">
            <div className="p-5 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-purple-400">
                        <FileSearch size={16} /> Relink Interface
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">Map Drive files to active knowledge nodes.</p>
                </div>
                <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-zinc-800 bg-zinc-950 shrink-0">
                <button 
                    onClick={() => setRelinkMode('projects')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${relinkMode === 'projects' ? 'text-purple-400 border-b-2 border-purple-400 bg-zinc-900/50' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                    By Project
                </button>
                <button 
                    onClick={() => setRelinkMode('files')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${relinkMode === 'files' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-zinc-900/50' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                    By Unlinked File
                </button>
            </div>
            
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-zinc-950">
                {relinkMode === 'projects' ? (
                    <table className="w-full border-collapse">
                        <thead className="text-xs uppercase text-zinc-500 font-bold bg-zinc-950 sticky top-0 z-10">
                            <tr>
                                <th className="p-3 text-left bg-zinc-950">Project Name</th>
                                <th className="p-3 text-left bg-zinc-950">Current ID</th>
                                <th className="p-3 text-left bg-zinc-950">Assigned File</th>
                                <th className="p-3 text-center bg-zinc-950">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {candidates.map((candidate, idx) => (
                                <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                    <td className="p-3 text-zinc-300 font-medium">{candidate.projectName}</td>
                                    <td className="p-3">
                                        <div className="font-mono text-[10px] text-zinc-600 truncate w-24" title={candidate.currentId}>
                                            {candidate.currentId || 'NONE'}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <select 
                                            className={`w-full bg-zinc-800 border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none text-zinc-200 ${
                                                candidate.proposedId && candidate.proposedId !== candidate.currentId ? 'border-purple-500/50' : 'border-zinc-700'
                                            }`}
                                            value={candidate.proposedId || ''}
                                            onChange={(e) => {
                                                const newId = e.target.value;
                                                const fileObj = allDriveFiles.find(f => f.id === newId);
                                                const updated = [...candidates];
                                                updated[idx] = {
                                                    ...candidate,
                                                    proposedId: newId || null,
                                                    proposedName: fileObj?.name,
                                                    status: 'manual_selection'
                                                };
                                                setCandidates(updated);
                                            }}
                                        >
                                            <option value="" className="bg-zinc-800 text-zinc-400">-- No File --</option>
                                            {allDriveFiles.map(f => (
                                                <option key={f.id} value={f.id} className="bg-zinc-800 text-zinc-200">{f.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-3 text-center">
                                        {candidate.status === 'match_found' && <span className="text-green-500 text-[10px] uppercase font-bold flex justify-center items-center gap-1"><Check size={10} /> Auto</span>}
                                        {candidate.status === 'no_match' && <span className="text-zinc-600 text-[10px] uppercase font-bold flex justify-center items-center gap-1"><AlertCircle size={10} /> None</span>}
                                        {candidate.status === 'manual_selection' && <span className="text-purple-400 text-[10px] uppercase font-bold flex justify-center items-center gap-1"><Check size={10} /> Manual</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="space-y-1">
                            {unlinkedFiles.length === 0 && (
                            <div className="text-center py-10 text-zinc-500 italic">No unlinked files found in Ouroboros folder.</div>
                            )}
                            {unlinkedFiles.length > 0 && (
                                <div className="grid grid-cols-12 gap-4 px-2 py-2 text-xs uppercase text-zinc-500 font-bold sticky top-0 bg-zinc-950 z-10 border-b border-zinc-800">
                                <div className="col-span-4">Unlinked File Name</div>
                                <div className="col-span-2">Type</div>
                                <div className="col-span-6">Assign to Project</div>
                                </div>
                            )}
                            {unlinkedFiles.map((file, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-4 items-center px-2 py-3 hover:bg-zinc-800/30 border-b border-zinc-800/30">
                                <div className="col-span-4 text-sm text-emerald-100 truncate" title={file.fileName}>{file.fileName}</div>
                                <div className="col-span-2 text-[10px] text-zinc-500 truncate">{file.mimeType.replace('application/', '').replace('vnd.google-apps.', '')}</div>
                                <div className="col-span-6">
                                    <select 
                                        className={`w-full bg-zinc-800 border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-200 ${
                                            file.assignedProjectId ? 'border-emerald-500/50 text-emerald-200' : 'border-zinc-700'
                                        }`}
                                        value={file.assignedProjectId || ''}
                                        onChange={(e) => {
                                            const pid = e.target.value;
                                            const updated = [...unlinkedFiles];
                                            updated[idx] = { ...file, assignedProjectId: pid || null };
                                            setUnlinkedFiles(updated);
                                        }}
                                    >
                                        <option value="" className="bg-zinc-800 text-zinc-400">-- Unassigned --</option>
                                        {activeProjects.map(p => (
                                            <option key={p.id} value={p.id} className="bg-zinc-800 text-zinc-200">{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            ))}
                    </div>
                )}
            </div>

            <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3 shrink-0">
                <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white">CANCEL</button>
                <button 
                    onClick={handleApply}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-6 py-2 rounded-lg transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                >
                    <RefreshCw size={14} /> APPLY CHANGES
                </button>
            </div>
        </div>
    </div>
  );
};

export default RelinkModal;
