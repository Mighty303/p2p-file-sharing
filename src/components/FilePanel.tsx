// Update FilePanel.tsx:
import { FolderOpen, Upload } from 'lucide-react';
import { useRef } from 'react';

interface FilePanelProps {
  onFileSelect: (file: File) => void;
}


export function FilePanel({ onFileSelect }: FilePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="py-12">
      <div className="text-center">
        <FolderOpen size={48} className="mx-auto text-slate-600 mb-3" />
        <p className="text-slate-400 mb-6">Share files with connected peers</p>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-purple-500/50 flex items-center gap-2 mx-auto"
        >
          <Upload size={20} />
          Share File
        </button>
      </div>
    </div>
  );
}