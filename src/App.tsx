import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Header,
  ChatPanel,
  FilePanel,
  TabBar,
  NotConnected
} from './components';
import type { Message } from './types';
import { useWebRTC } from './hooks/useWebRTC';
import { RoomPanel } from './components/RoomPanel';


export default function App() {
  const [activeTab, setActiveTab] = useState<'room' | 'chat' | 'files'>('room');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');

  // WebRTC hook
  const { 
    peerId, 
    isConnected, 
    connect, 
    disconnect, 
    sendMessage, 
    setOnMessage,
    sendFile, 
    connections,
    connectionsCount,
    currentRoom,
    createRoom,
    joinRoomByCode,
    leaveRoom
  } = useWebRTC();

  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
    const { roomCode } = useParams<{ roomCode: string }>();

    // auto-connect + auto-join QR room
    const hasJoinedRoom = useRef(false);
    const prevConnectionsCount = useRef(0);

  // Auto-switch to chat when a peer joins
  useEffect(() => {
    if (connectionsCount > prevConnectionsCount.current && connectionsCount > 0) {
      // A new peer connected
      setActiveTab('chat');
    }
    prevConnectionsCount.current = connectionsCount;
  }, [connectionsCount]);

  // Monitor room disconnection
  const prevRoomRef = useRef(currentRoom);
  useEffect(() => {
    // If we had a room and now we don't, show disconnection message
    if (prevRoomRef.current && !currentRoom) {
      setConnectionStatus('🔌 Disconnected from room');
      setTimeout(() => setConnectionStatus(null), 3000);
    }
    prevRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    if (!roomCode || hasJoinedRoom.current) return;

    // Only proceed if we have a peerId (meaning connection is fully established)
    if (!peerId) {
      // If not connected yet, trigger connection
      if (!isConnected) {
        connect();
      }
      return; // Exit and wait for peerId
    }

    hasJoinedRoom.current = true;

    const joinRoom = async () => {
      try {
        await joinRoomByCode(roomCode);
        setConnectionStatus(`✅ Joined room: ${roomCode}`);
        setActiveTab('chat'); // Switch to chat after joining
      } catch (err) {
        console.error('Failed to auto-join room:', err);
        setConnectionStatus('❌ Failed to join room');
      }

      setTimeout(() => setConnectionStatus(null), 3000);
    };

    joinRoom();
  }, [roomCode, peerId, isConnected, connect, joinRoomByCode]); // Add peerId to dependencies

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

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
      setConnectionStatus('✅ Left room');
      setActiveTab('room');
      setMessages([]);
    } catch (err) {
      console.error('Failed to leave room:', err);
      setConnectionStatus('❌ Failed to leave room');
    }
    
    setTimeout(() => setConnectionStatus(null), 3000);
  };

  const handleCreateRoom = async () => {
    try {
      const code = await createRoom();
      setConnectionStatus(`✅ Room created: ${code}`);
    } catch (err) {
      console.error('Failed to create room:', err);
      setConnectionStatus('❌ Failed to create room');
    }
    
    setTimeout(() => setConnectionStatus(null), 3000);
  };

  const handleJoinRoom = async (code: string) => {
    try {
      await joinRoomByCode(code);
      setConnectionStatus(`✅ Joined room: ${code}`);
    } catch (err) {
      console.error('Failed to join room:', err);
      setConnectionStatus('❌ Room not found');
    }
    
    setTimeout(() => setConnectionStatus(null), 3000);
  };

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
        url: tempUrl,
        sender: 'You',
        timestamp: new Date().toLocaleTimeString()
      }]);

      try {
        await sendFile(file);
        setConnectionStatus(`✅ File "${file.name}" sent successfully`);
      } catch (err) {
        console.error('Failed to send file:', err);
        setConnectionStatus(`❌ Failed to send file "${file.name}"`);
      }

      setTimeout(() => setConnectionStatus(null), 3000);
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
            <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-400">Your ID:</span>
                <code className="bg-slate-900/50 px-3 py-1 rounded-lg text-purple-300 font-mono">
                  {peerId}
                </code>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-slate-300">{connectionsCount} peers connected</span>
                </div>
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
            ) : activeTab === 'files' ? (
              <FilePanel onFileSelect={handleFileSelect} />
            ) : activeTab === 'room' ? (
              <RoomPanel
                currentRoom={currentRoom}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                onLeaveRoom={handleLeaveRoom}
              />
            ) : null}
          </div>
        </div>

        <div className="mt-6 text-center text-slate-400 text-sm">
          <p>Built by Martin Wong</p>
        </div>
      </div>
    </div>
  );
}
