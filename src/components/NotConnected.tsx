import { WifiOff } from 'lucide-react';


export function NotConnected() {
  return (
    <div className="text-center py-20">
      <WifiOff size={64} className="mx-auto text-slate-600 mb-4" />
      <h2 className="text-2xl font-bold text-slate-300 mb-2">
        Not Connected
      </h2>
      <p className="text-slate-400">
        Click "Connect" to start using P2P features
      </p>
    </div>
  );
}
