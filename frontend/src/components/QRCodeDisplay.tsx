import { QrCode, Users } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface QRCodeDisplayProps {
  peerId: string;
  qrData: string;
  showQR: boolean;
  onShowQRToggle: () => void;
  peersCount: number;
}

export function QRCodeDisplay({ 
  peerId, 
  qrData, 
  showQR, 
  onShowQRToggle,
  peersCount
}: QRCodeDisplayProps) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-700/50">
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <span className="text-slate-400">Your ID:</span>
        <code className="bg-slate-900/50 px-3 py-1 rounded-lg text-purple-300 font-mono">
          {peerId}
        </code>
        <button
          onClick={onShowQRToggle}
          className="bg-purple-600/50 hover:bg-purple-600/70 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"
        >
          <QrCode size={16} />
          {showQR ? 'Hide QR' : 'Show QR'}
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <Users size={16} className="text-slate-400" />
          <span className="text-slate-300">{peersCount} peers</span>
        </div>
      </div>

      {showQR && (
        <div className="mt-4 p-4 bg-slate-900/50 rounded-xl">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-shrink-0">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <QRCodeCanvas 
                  value={qrData}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-slate-400 text-center mt-2">Scan to connect</p>
            </div>
            <div className="flex-1">
              <h3 className="text-slate-200 font-semibold mb-2">Connection Info</h3>
              <div className="bg-slate-800/50 p-3 rounded-lg mb-3">
                <pre className="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
                  {qrData}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
