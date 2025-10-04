import { Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  onConnect: () => void;
}

export function Header({ isConnected, onConnect }: HeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Wifi className="text-purple-400" size={32} />
          P2P Hackathon
        </h1>
        <p className="text-slate-300">Decentralized Chat & File Sharing</p>
      </div>
      <button
        onClick={onConnect}
        className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
          isConnected
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/50'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/50'
        }`}
      >
        {isConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
        {isConnected ? 'Connected' : 'Connect'}
      </button>
    </div>
  );
}
