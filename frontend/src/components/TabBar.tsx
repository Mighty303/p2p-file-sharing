import { MessageSquare, FolderOpen } from 'lucide-react';

interface TabBarProps {
  activeTab: 'chat' | 'files';
  onTabChange: (tab: 'chat' | 'files') => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex border-b border-slate-700/50">
      <button
        onClick={() => onTabChange('chat')}
        className={`flex-1 px-6 py-4 font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
          activeTab === 'chat'
            ? 'bg-slate-700/50 text-purple-400 border-b-2 border-purple-400'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
        }`}
      >
        <MessageSquare size={20} />
        Chat
      </button>
      <button
        onClick={() => onTabChange('files')}
        className={`flex-1 px-6 py-4 font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
          activeTab === 'files'
            ? 'bg-slate-700/50 text-purple-400 border-b-2 border-purple-400'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
        }`}
      >
        <FolderOpen size={20} />
        Files
      </button>
    </div>
  );
}
