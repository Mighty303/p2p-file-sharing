import { Wifi, WifiOff, Users, Loader2 } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  connectedPeers: string[];
}

export function Header({ isConnected, isConnecting, onConnect, connectedPeers }: HeaderProps) {
  const handleConnect = () => {
    onConnect();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Wifi className="text-purple-400" size={32} />
          P2P Hackathon
        </h1>
        <p className="text-slate-300">Decentralized Chat & File Sharing</p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            isConnected
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/50'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/50'
          }`}
        >
          {isConnecting ? (
            <Loader2 size={20} className="animate-spin" />
          ) : isConnected ? (
            <Wifi size={20} />
          ) : (
            <WifiOff size={20} />
          )}
          {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect'}
        </button>

        {/* Connected Peers Display */}
        {isConnected && connectedPeers.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2 mt-2">
            <Users className="text-purple-300" size={18} />
            {connectedPeers.map((peer) => (
              <span
                key={peer}
                className="bg-slate-800/70 border border-slate-700 px-3 py-1 rounded-lg text-purple-300 text-sm font-mono"
              >
                {peer}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}