import React from 'react';
import { LongTermMemory } from '../types';
import { Database, Brain, Target, ShieldCheck, Activity } from 'lucide-react';
import KnowledgeGraph from './KnowledgeGraph';

interface Props {
  memory: LongTermMemory;
}

const MemoryPanel: React.FC<Props> = ({ memory }) => {
  return (
    <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-2 custom-scrollbar">
      
      {/* Knowledge Graph Section */}
      <div className="min-h-[400px]">
        <h3 className="text-zinc-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
            <Brain size={14} /> Knowledge Graph (Visualized)
        </h3>
        <KnowledgeGraph data={memory.knowledge_graph} />
      </div>

      {/* Confidence Metrics */}
      <div>
        <h3 className="text-zinc-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
            <Activity size={14} /> Confidence Metrics
        </h3>
        <div className="grid grid-cols-2 gap-2">
            {memory.confidence_metrics && memory.confidence_metrics.length > 0 ? (
                memory.confidence_metrics.map((m, idx) => (
                    <div key={idx} className="bg-zinc-900 border border-zinc-800 p-2 rounded flex justify-between items-center">
                        <span className="text-xs text-zinc-400 font-mono truncate mr-2" title={m.label}>{m.label}</span>
                        <span className="text-xs text-emerald-400 font-bold">{(m.score * 100).toFixed(0)}%</span>
                    </div>
                ))
            ) : (
                <span className="text-zinc-600 text-xs italic">No metrics available.</span>
            )}
        </div>
      </div>

      {/* Projects */}
      <div>
        <h3 className="text-zinc-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
            <Target size={14} /> Active Projects
        </h3>
        <div className="grid grid-cols-1 gap-3">
            {memory.active_projects.length === 0 && <p className="text-zinc-600 text-sm italic">No active projects.</p>}
            {memory.active_projects.map((proj) => (
                <div key={proj.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-md">
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-zinc-200 text-sm">{proj.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            proj.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-zinc-700 text-zinc-300'
                        }`}>
                            {proj.status}
                        </span>
                    </div>
                    <p className="text-zinc-500 text-xs">{proj.description}</p>
                </div>
            ))}
        </div>
      </div>

      {/* Learned Truths */}
      <div>
        <h3 className="text-zinc-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
            <ShieldCheck size={14} /> Learned Truths
        </h3>
        <ul className="space-y-2">
            {memory.learned_truths.map((truth, idx) => (
                <li key={idx} className="text-zinc-400 text-sm flex items-start gap-2">
                    <span className="text-zinc-600 mt-1">•</span>
                    {truth}
                </li>
            ))}
        </ul>
      </div>

       {/* Raw JSON Details (Collapsed or bottom) */}
       <div>
        <h3 className="text-zinc-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
            <Database size={14} /> Core Instructions
        </h3>
        <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800 font-mono text-xs text-zinc-400">
            {memory.core_instructions.map((inst, i) => (
                <div key={i} className="mb-1 text-green-500/80">
                    &gt; {inst}
                </div>
            ))}
        </div>
      </div>
      
    </div>
  );
};

export default MemoryPanel;
