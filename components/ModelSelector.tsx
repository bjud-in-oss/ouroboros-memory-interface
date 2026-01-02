import React from 'react';
import { ChevronDown, Sparkles, Zap, Brain, Cpu } from 'lucide-react';

interface Props {
  currentModel: string;
  onSelect: (modelId: string) => void;
  disabled?: boolean;
}

export const AVAILABLE_MODELS = [
  { 
    id: 'gemini-3-pro-preview', 
    name: 'Gemini 3 Pro', 
    desc: 'Most Intelligent',
    icon: <Sparkles size={12} className="text-purple-400" />
  },
  { 
    id: 'gemini-3-flash-preview', 
    name: 'Gemini 3 Flash', 
    desc: 'Frontier Performance',
    icon: <Zap size={12} className="text-amber-400" />
  },
  { 
    id: 'gemini-2.5-pro-latest', 
    name: 'Gemini 2.5 Pro', 
    desc: 'Coding & Reasoning',
    icon: <Brain size={12} className="text-blue-400" />
  },
  { 
    id: 'gemini-2.5-flash-latest', 
    name: 'Gemini 2.5 Flash', 
    desc: 'Balanced Workhorse',
    icon: <Zap size={12} className="text-zinc-400" />
  },
  { 
    id: 'gemini-flash-lite-latest', 
    name: 'Gemini 2.5 Flash-Lite', 
    desc: 'High Frequency',
    icon: <Zap size={12} className="text-cyan-400" />
  },
  { 
    id: 'gemma-2-27b-it', 
    name: 'Gemma 2 (27B)', 
    desc: 'Open Model',
    icon: <Cpu size={12} className="text-emerald-400" />
  }
];

const ModelSelector: React.FC<Props> = ({ currentModel, onSelect, disabled }) => {
  const selected = AVAILABLE_MODELS.find(m => m.id === currentModel) || AVAILABLE_MODELS[0];

  return (
    <div className="relative group min-w-[160px]">
      <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
        {selected.icon}
      </div>
      <select 
        value={currentModel} 
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        className="appearance-none w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[10px] text-zinc-300 rounded-md py-1.5 pl-7 pr-6 focus:ring-1 focus:ring-indigo-500/50 outline-none cursor-pointer transition-all font-mono shadow-sm disabled:opacity-50"
      >
        {AVAILABLE_MODELS.map(m => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-300 transition-colors" />
      
      {/* Tooltip for description */}
      <div className="absolute bottom-full left-0 mb-2 w-max px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[9px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-20">
        {selected.desc} (ID: {selected.id})
      </div>
    </div>
  );
};

export default ModelSelector;