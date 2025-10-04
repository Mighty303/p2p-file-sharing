import { useState, useCallback } from 'react';
import { 
  Header,
  QRCodeDisplay,
  ChatPanel,
  FilePanel,
  TabBar,
  NotConnected
} from './components';
import type { Message, Peer, ConnectionData } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [peerId, setPeerId] = useState<string>('');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [showQR, setShowQR] = useState<boolean>(false);
  const [qrData, setQrData] = useState<string>('');

  // Connect/Disconnect handler
  const handleConnect = useCallback((): void => {
    setIsConnected(!isConnected);
    if (!isConnected) {
      const newPeerId = 'peer-' + Math.random().toString(36).substr(2, 9);
      setPeerId(newPeerId);
      const connectionData: ConnectionData = {
        peerId: newPeerId,
        timestamp: Date.now(),
        type: 'p2p-connection'
      };
      const encodedData = `p2p://connect?data=${encodeURIComponent(JSON.stringify(connectionData))}`;
      setQrData(encodedData);
    } else {
      setPeerId('');
      setPeers([]);
      setQrData('');
      setShowQR(false);
    }
  }, [isConnected]);



  // Message handlers
  const handleSendMessage = useCallback((): void => {
    if (messageInput.trim() && isConnected) {
      setMessages(prevMessages => [...prevMessages, {
        id: Date.now(),
        text: messageInput,
        sender: 'You',
        timestamp: new Date().toLocaleTimeString()
      }]);
      setMessageInput('');
    }
  }, [messageInput, isConnected]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700/50 mb-6 p-6">
          <Header isConnected={isConnected} onConnect={handleConnect} />
          
          {isConnected && (
            <QRCodeDisplay
              peerId={peerId}
              qrData={qrData}
              showQR={showQR}
              onShowQRToggle={() => setShowQR(!showQR)}
              peersCount={peers.length}
            />
          )}
        </div>

        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="p-6">
            {!isConnected ? (
              <NotConnected />
            ) : activeTab === 'chat' ? (
              <ChatPanel
                messages={messages}
                messageInput={messageInput}
                onMessageInputChange={setMessageInput}
                onSendMessage={handleSendMessage}
                onKeyPress={handleKeyPress}
              />
            ) : (
              <FilePanel />
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-slate-400 text-sm">
          <p>Ready to integrate WebRTC, WebSocket, or libp2p for P2P connectivity</p>
        </div>
      </div>
    </div>
  );
}