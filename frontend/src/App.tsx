import { useState, useCallback, useEffect } from 'react';
import { 
  Header,
  ChatPanel,
  FilePanel,
  TabBar,
  NotConnected
} from './components';
import type { Message } from './types';
import { useWebRTC } from './hooks/useWebRTC';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');

  // WebRTC hook
  const { 
    peerId, 
    isConnected, 
    connect, 
    disconnect, 
    connectToPeer, 
    sendMessage, 
    setOnMessage,
    sendFile, 
    connections,
    connectionsCount
  } = useWebRTC();

  const [remotePeerId, setRemotePeerId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);


  // Listen for incoming messages
useEffect(() => {
  setOnMessage((data: any) => {
    if (data.type === 'file') {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'file' as const,
        fileName: data.fileName,
        url: data.url,
        fileType: data.fileType,
        sender: 'Peer',
        timestamp: new Date().toLocaleTimeString()
      }]);
    } else {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'message' as const,
        text: data.text,
        sender: data.sender,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  });
}, [setOnMessage]);

  // Handle sending message
const handleSendMessage = useCallback(async (): Promise<void> => {
  if (!messageInput.trim() || !isConnected) return;

  const message = {
    type: 'message' as const,
    text: messageInput,
    sender: peerId,
    timestamp: new Date().toLocaleTimeString()
  };

  await sendMessage(message);

  setMessages(prev => [...prev, { 
    ...message, 
    id: Date.now(), 
    sender: 'You' 
  }]);
  setMessageInput('');
}, [messageInput, isConnected, peerId, sendMessage]);

  const handleFileSelect = async (file: File) => {
    // Create a temporary URL for the local file
    const tempUrl = URL.createObjectURL(file);

    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'file' as const,
      fileName: file.name,
      url: tempUrl,  // ✅ Add the URL
      sender: 'You',
      timestamp: new Date().toLocaleTimeString()
    }]);

    await sendFile(file);
  };

  const handleConnect = useCallback(() => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  }, [isConnected, connect, disconnect]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {connectionStatus && (
        <div className="fixed top-6 right-6 z-50">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-in-down
              ${connectionStatus.startsWith('✅')
                ? 'bg-green-600/20 text-green-300 border-green-600/50'
                : 'bg-red-600/20 text-red-300 border-red-600/50'
              }`}
          >
            {connectionStatus}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700/50 mb-6 p-6">
          <Header
            isConnected={isConnected}
            onConnect={handleConnect}
            connectedPeers={Array.from(connections.keys())}
          />          
          {isConnected && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-400">Your ID:</span>
                <code className="bg-slate-900/50 px-3 py-1 rounded-lg text-purple-300 font-mono">
                  {peerId}
                </code>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-slate-300">{connectionsCount} peers connected</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  value={remotePeerId}
                  onChange={(e) => setRemotePeerId(e.target.value)}
                  placeholder="Enter peer ID to connect..."
                  className="flex-1 bg-slate-900/50 px-3 py-1 rounded-lg text-slate-300"
                />
                <button
                  className="px-4 py-1 bg-purple-500 text-white rounded-lg"
                  onClick={async () => {
                    if (remotePeerId === peerId) {
                      alert("You cannot connect to yourself!");
                      return;
                    }

                    try {
                      await connectToPeer(remotePeerId);
                      setRemotePeerId('');
                      setConnectionStatus(`✅ Connected successfully to ${remotePeerId}`);
                    } catch (err) {
                      console.error('Failed to connect to peer:', err);
                      setConnectionStatus(`❌ Failed to connect to ${remotePeerId}`);
                    }

                    // Auto-hide the toast after 3 seconds
                    setTimeout(() => setConnectionStatus(null), 3000);
                  }}
                >
                  Connect
                </button>
              </div>
            </div>
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
              <FilePanel onFileSelect={handleFileSelect} />
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
