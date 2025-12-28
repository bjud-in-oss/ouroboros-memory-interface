import React from 'react';
import { FocusLog } from '../types';
import { Activity, ListTodo, GitCommit } from 'lucide-react';

interface Props {
  focus: FocusLog;
}

const FocusPanel: React.FC<Props> = ({ focus }) => {
  return (
    <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-2 custom-scrollbar">
      
      {/* Header Info */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
        <h3 className="text-zinc-500 text-xs uppercase font-bold mb-1">Current Objective</h3>
        <p className="text-zinc-100 font-medium text-lg">{focus.current_objective}</p>
        <div className="mt-2 text-xs text-zinc-600 font-mono">
            Last Updated: {new Date(focus.last_updated).toLocaleString()}
        </div>
      </div>

      {/* Chain of Thought */}
      <div className="flex-1 min-h-0 flex flex-col">
        <h3 className="text-zinc-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
            <Activity size={14} /> Chain of Thought Log
        </h3>
        <div className="flex-1 bg-black/40 border border-zinc-800 rounded-lg p-4 font-mono text-sm overflow-y-auto custom-scrollbar">
            {focus.chain_of_thought.map((step, idx) => (
                <div key={idx} className="mb-3 flex gap-3 opacity-90 hover:opacity-100 transition-opacity">
                    <span className="text-zinc-600 shrink-0 select-none">
                        {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <p className="text-emerald-500/90 leading-relaxed">
                        {step}
                    </p>
                </div>
            ))}
            {focus.chain_of_thought.length === 0 && (
                <span className="text-zinc-700 italic">Thinking process initialized...</span>
            )}
        </div>
      </div>

      {/* Pending Tasks */}
      <div>
        <h3 className="text-zinc-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
            <ListTodo size={14} /> Pending Tasks
        </h3>
        <ul className="space-y-2">
            {focus.pending_tasks.map((task, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-zinc-300 bg-zinc-900/30 p-2 rounded border border-zinc-800/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    {task}
                </li>
            ))}
            {focus.pending_tasks.length === 0 && (
                <li className="text-zinc-600 text-sm italic">No pending tasks queue.</li>
            )}
        </ul>
      </div>

    </div>
  );
};

export default FocusPanel;
