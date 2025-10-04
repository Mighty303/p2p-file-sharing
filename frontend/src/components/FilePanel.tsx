import { FolderOpen } from 'lucide-react';

export function FilePanel() {
  return (
    <div className="py-12">
      <div className="text-center">
        <FolderOpen size={48} className="mx-auto text-slate-600 mb-3" />
        <p className="text-slate-400 mb-6">No files shared yet</p>
        <button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-purple-500/50">
          Share File
        </button>
      </div>
    </div>
  );
}
