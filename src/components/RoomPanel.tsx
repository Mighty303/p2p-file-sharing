import { Hash, Copy, Check, LogOut } from 'lucide-react';
import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface RoomPanelProps {
  currentRoom: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void; // Add this
}

export function RoomPanel({ currentRoom, onCreateRoom, onJoinRoom, onLeaveRoom }: RoomPanelProps) {
  const [roomInput, setRoomInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(currentRoom);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {!currentRoom ? (
        <>
          <div className="text-center py-8">
            <Hash size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 mb-6">Create or join a room to start</p>
          </div>

          <button
            onClick={onCreateRoom}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg"
          >
            Create New Room
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Enter room code..."
              className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-400"
            />
            <button
              onClick={() => {
                if (roomInput.trim()) {
                  onJoinRoom(roomInput.trim());
                  setRoomInput('');
                }
              }}
              className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-semibold transition-all"
            >
              Join
            </button>
          </div>
        </>
      ) : (
        <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Room Code</p>
              <p className="text-2xl font-bold text-purple-300 font-mono">{currentRoom}</p>
            </div>
            <button
              onClick={handleCopy}
              className="p-3 bg-slate-600 hover:bg-slate-500 rounded-lg transition-all"
            >
              {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} className="text-slate-300" />}
            </button>
          </div>

          <p className="text-slate-400 text-sm mb-4">Share this code or scan the QR to join</p>

          <div className="flex justify-center md:justify-start mb-8">
            <QRCodeCanvas
              value={`http://p2p-client.martinwong.me/room/${currentRoom}`}
              size={128}
              bgColor="#1e293b"
              fgColor="#d8b4fe"
            />
          </div>

          <button
            onClick={onLeaveRoom}
            className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-300 px-4 py-3 rounded-xl font-semibold transition-all"
          >
            <LogOut size={20} />
            Leave Room
          </button>
        </div>
      )}
    </div>
  );
}