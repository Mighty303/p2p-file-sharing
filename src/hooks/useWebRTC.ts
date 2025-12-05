import { useState, useRef } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { generateKeyPair, encryptMessage, decryptMessage, encryptFile } from '../utils/crypto';

type QueuedMessage = {
  peerId: string;
  message: any;
};

type QueuedFile = {
    peerId: string;
    file: File;
    id: string;
}

const ROOM_SERVER_URL = import.meta.env.VITE_ROOM_SERVER_URL || 'http://localhost:3001';

export function useWebRTC() {
    const [peerId, setPeerId] = useState('');
    const [connectionsCount, setConnectionsCount] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const peerInstance = useRef<Peer | null>(null);
    const connections = useRef<Map<string, DataConnection>>(new Map());
    const onMessageRef = useRef<((msg: any) => void) | null>(null);
    const incomingFiles = useRef<Map<string, { chunks: Uint8Array[]; fileName: string; totalChunks: number }>>(new Map());
    const [currentRoom, setCurrentRoom] = useState<string | null>(null);
    const pollInterval = useRef<number | null>(null);

    // Store AES keys per peer
    const AESKeys = useRef<Map<string, CryptoKey>>(new Map());

    // Queue messages until keys are ready
    const messageQueue = useRef<QueuedMessage[]>([]);
    const fileQueue = useRef<QueuedFile[]>([]);

    const setOnMessage = (callback: (msg: any) => void) => {
        onMessageRef.current = callback;
    };

    const isPolling = useRef(false);

    // Poll for new room members
    const pollRoomMembers = async () => {
        if (!currentRoom || !peerId || isPolling.current) return;
        
        isPolling.current = true;
        
        try {
            const response = await fetch(`${ROOM_SERVER_URL}/room/${currentRoom}/peers`, {
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            if (!response.ok) return;
            
            const data = await response.json();
            
            // Connect to any peers we're not already connected to
            for (const peer of data.peers) {
                if (peer !== peerId && !connections.current.has(peer)) {
                    console.log('Discovered new peer in room:', peer);
                    connectToPeer(peer);
                }
            }
        } catch (err) {
            // Silently ignore timeout errors to avoid console spam
            if (err instanceof Error && err.name !== 'TimeoutError') {
                console.error('Failed to poll room members:', err);
            }
        } finally {
            isPolling.current = false;
        }
    };

    const createRoom = async (): Promise<string> => {
        const roomCode = generateRoomCode();
        
        try {
            const response = await fetch(`${ROOM_SERVER_URL}/room/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode, peerId })
            });
            
            const data = await response.json();
            setCurrentRoom(roomCode);
            
            // Connect to any existing peers in the room
            const otherPeers = data.peers.filter((p: string) => p !== peerId);
            for (const peer of otherPeers) {
                connectToPeer(peer);
            }
            
            // Start polling for new members every 3 seconds
            pollInterval.current = window.setInterval(pollRoomMembers, 3000);
            
            return roomCode;
        } catch (err) {
            console.error('Failed to create room:', err);
            throw err;
        }
    };

    const joinRoomByCode = async (roomCode: string): Promise<void> => {
        try {
            const response = await fetch(`${ROOM_SERVER_URL}/room/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode, peerId })
            });
            
            if (!response.ok) {
                throw new Error('Room not found');
            }
            
            const data = await response.json();
            setCurrentRoom(roomCode);
            
            // Connect to all peers in the room
            for (const peer of data.peers) {
                if (peer !== peerId) {
                    connectToPeer(peer);
                }
            }
            
            // Start polling for new members every 3 seconds
            pollInterval.current = window.setInterval(pollRoomMembers, 3000);
        } catch (err) {
            console.error('Failed to join room:', err);
            throw err;
        }
    };

    const leaveRoom = async (): Promise<void> => {
        if (!currentRoom) return;
        
        // Stop polling
        if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
        }
        
        try {
            await fetch(`${ROOM_SERVER_URL}/room/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode: currentRoom, peerId })
            });
            
            setCurrentRoom(null);
            
            // Disconnect from all peers
            connections.current.forEach(conn => conn.close());
            connections.current.clear();
            AESKeys.current.clear();
            setConnectionsCount(0);
        } catch (err) {
            console.error('Failed to leave room:', err);
        }
    };

    // Add room code generator
    function generateRoomCode(): string {
        const adjectives = ['swift', 'bright', 'bold', 'calm', 'cool', 'dark', 'epic', 'fair', 'fast', 'glad'];
        const nouns = ['eagle', 'tiger', 'river', 'storm', 'cloud', 'flame', 'moon', 'star', 'wave', 'wind'];
        
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 100);
        
        return `${adj}-${noun}-${num}`;
    }

    const flushMessageQueue = async (peerId: string) => {
        const key = AESKeys.current.get(peerId);
        if (!key) return;

        const queue = messageQueue.current.filter(q => q.peerId === peerId);
        for (const item of queue) {
            await sendMessageToPeer(item.peerId, item.message);
        }
        messageQueue.current = messageQueue.current.filter(q => q.peerId !== peerId);
    };

    const flushFileQueue = async (peerId: string) => {
        const key = AESKeys.current.get(peerId);
        if (!key) return;

        const queue = fileQueue.current.filter(q => q.peerId === peerId);
        for (const item of queue) {
            await sendFile(item.file, item.peerId);
        }
        fileQueue.current = fileQueue.current.filter(q => q.peerId !== peerId);
    }

    const connect = async () => {
        if (peerInstance.current) return;

        // Fetch TURN credentials from backend
        let iceServers = [
            // Default STUN servers
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ];

        try {
            console.log('🔄 Fetching TURN credentials from backend...');
            const response = await fetch(`${ROOM_SERVER_URL}/turn-credentials`);
            
            if (response.ok) {
                const data = await response.json();
                iceServers = data.iceServers;
                console.log('✅ TURN credentials fetched successfully');
                console.log('🔧 ICE Servers:', iceServers.map((s: any) => ({
                    urls: s.urls,
                    hasUsername: !!s.username,
                    hasCredential: !!s.credential
                })));
            } else {
                console.warn('⚠️  Failed to fetch TURN credentials, using STUN only');
            }
        } catch (error) {
            console.warn('⚠️  Error fetching TURN credentials:', error);
            console.log('📡 Falling back to STUN-only mode');
        }

        // Use dedicated PeerJS signaling server
        console.log('🔧 Connecting to PeerJS signaling server...');
        const SIGNALING_SERVER = 'p2p-signaling-server-i99a.onrender.com';
        const peer = new Peer({
            host: SIGNALING_SERVER,
            port: 443,
            path: '/',
            secure: true,
            config: {
                iceServers,
                // Optimize for maximum connection success
                iceCandidatePoolSize: 10,
                iceTransportPolicy: 'all',  // Use all connection types (host, srflx, relay)
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require',
            },
            // Debug logging
            debug: 2
        });

        peer.on('open', (id) => {
            setPeerId(id);
            setIsConnected(true);
            console.log('My peer ID is:', id);
            
            // Log ICE gathering info for debugging
            console.log('🌐 WebRTC initialized with IPv6-first support');
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            // Handle specific error types
            if (err.type === 'network') {
                console.error('Network error - check your internet connection');
            } else if (err.type === 'peer-unavailable') {
                console.error('Remote peer unavailable');
            } else if (err.type === 'server-error') {
                console.error('Signaling server error');
            }
        });

        peer.on('connection', (conn) => {
            // Log connection details
            const metadata = conn.metadata as { preferIPv6?: boolean } | undefined;
            if (metadata?.preferIPv6) {
                console.log('📡 Incoming connection prefers IPv6');
            }
            handleIncomingConnection(conn);
        });

        peerInstance.current = peer;
    };

    const disconnect = () => {
        if (!peerInstance.current) return;
        
        // Stop polling if active
        if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
        }
        
        peerInstance.current.destroy();
        peerInstance.current = null;
        setIsConnected(false);
        setPeerId('');
        connections.current.clear();
        AESKeys.current.clear();
        messageQueue.current = [];
        fileQueue.current = [];
    };

    const handleIncomingConnection = (conn: DataConnection) => {
        console.log('Incoming connection from:', conn.peer);

        // Monitor ICE candidates for IPv6
        const peerConnection = (conn as any).peerConnection as RTCPeerConnection | undefined;
        if (peerConnection) {
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    const candidate = event.candidate.candidate;
                    const type = event.candidate.type; // host, srflx, relay
                    const isIPv6 = candidate.includes(':') && !candidate.includes('.');
                    
                    // Highlight relay (TURN) candidates
                    if (type === 'relay') {
                        console.log(`🎯 ICE Candidate (RELAY/TURN):`, candidate.substring(0, 80));
                    } else {
                        console.log(`🧊 ICE Candidate (${type || (isIPv6 ? 'IPv6' : 'IPv4')}):`, candidate.substring(0, 50));
                    }
                }
            };

            // Monitor ICE connection state changes
            peerConnection.oniceconnectionstatechange = () => {
                const state = peerConnection.iceConnectionState;
                console.log(`🔌 ICE Connection State (${conn.peer}):`, state);
                
                // Detailed state logging
                if (state === 'checking') {
                    console.log('🔍 Checking ICE candidates...');
                } else if (state === 'connected') {
                    console.log('✅ ICE Connected!');
                } else if (state === 'completed') {
                    console.log('✅ ICE Completed!');
                } else if (state === 'failed') {
                    console.error(`❌ ICE Connection FAILED for ${conn.peer}`);
                    console.error('Possible reasons: Firewall blocking, NAT traversal failed, invalid TURN credentials');
                } else if (state === 'disconnected') {
                    console.warn(`⚠️  ICE Disconnected from ${conn.peer}`);
                } else if (state === 'closed') {
                    console.log(`🚪 ICE Connection closed for ${conn.peer}`);
                }
            };

            // Monitor ICE gathering state
            peerConnection.onicegatheringstatechange = () => {
                console.log(`📊 ICE Gathering State (${conn.peer}):`, peerConnection.iceGatheringState);
                
                // Log when gathering completes
                if (peerConnection.iceGatheringState === 'complete') {
                    console.log('✅ ICE gathering completed for:', conn.peer);
                    console.log('📋 Signaling State:', peerConnection.signalingState);
                    console.log('🔌 ICE Connection State:', peerConnection.iceConnectionState);
                }
            };

            // Monitor connection state
            peerConnection.onconnectionstatechange = () => {
                console.log(`🔗 Connection State (${conn.peer}):`, peerConnection.connectionState);
                
                // Handle failed connections
                if (peerConnection.connectionState === 'failed') {
                    console.error('❌ Connection failed for:', conn.peer);
                    conn.close();
                }
            };

            // Add timeout detection for stuck connections with ICE restart
            setTimeout(() => {
                if (peerConnection.iceConnectionState !== 'connected' && 
                    peerConnection.iceConnectionState !== 'completed') {
                    console.warn(`⏰ Connection timeout for ${conn.peer} - ICE state: ${peerConnection.iceConnectionState}`);
                    
                    // Try ICE restart if stuck at "new"
                    if (peerConnection.iceConnectionState === 'new') {
                        console.log('🔄 Attempting ICE restart...');
                        peerConnection.restartIce();
                    }
                }
            }, 15000); // 15 second timeout
        }

        conn.on('open', async () => {
            console.log('✅ Connection opened with:', conn.peer);
            connections.current.set(conn.peer, conn);
            setConnectionsCount(connections.current.size);
            
            // Log the selected candidate pair
            if (peerConnection) {
                const stats = await peerConnection.getStats();
                stats.forEach((stat) => {
                    if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                        console.log('✅ Active connection using:', stat);
                    }
                });
            }
        });

        conn.on('data', async (data: any) => {
            await handleData(conn.peer, data);
        });

        conn.on('close', () => {
            console.log('Connection closed with:', conn.peer);
            connections.current.delete(conn.peer);
            AESKeys.current.delete(conn.peer);
            setConnectionsCount(connections.current.size);
        });

        conn.on('error', (err) => {
            console.error('Connection error with', conn.peer, ':', err);
            connections.current.delete(conn.peer);
            setConnectionsCount(connections.current.size);
        });
    };

    const connectToPeer = (remotePeerId: string) => {
        if (!peerInstance.current) return;
        if (connections.current.has(remotePeerId)) {
            console.log('Already connected to', remotePeerId);
            return;
        }

        // Prevent simultaneous connection attempts: only initiate if our ID is "greater"
        // The other peer will initiate the connection instead
        if (peerId > remotePeerId) {
            console.log(`⏭️  Skipping connection to ${remotePeerId} (they will connect to us)`);
            return;
        }

        console.log('Connecting to peer:', remotePeerId);
        const conn = peerInstance.current.connect(remotePeerId, {
            reliable: true, // Use reliable data channels
            serialization: 'json', // Explicit serialization
            metadata: { 
                preferIPv6: true // Signal IPv6 preference to remote peer
            }
        });

        // Monitor ICE candidates for IPv6
        const peerConnection = (conn as any).peerConnection as RTCPeerConnection | undefined;
        if (peerConnection) {
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    const candidate = event.candidate.candidate;
                    const type = event.candidate.type; // host, srflx, relay
                    const isIPv6 = candidate.includes(':') && !candidate.includes('.');
                    
                    // Highlight relay (TURN) candidates
                    if (type === 'relay') {
                        console.log(`🎯 ICE Candidate (RELAY/TURN):`, candidate.substring(0, 80));
                    } else {
                        console.log(`🧊 ICE Candidate (${type || (isIPv6 ? 'IPv6' : 'IPv4')}):`, candidate.substring(0, 50));
                    }
                }
            };

            // Monitor ICE connection state changes
            peerConnection.oniceconnectionstatechange = () => {
                const state = peerConnection.iceConnectionState;
                console.log(`🔌 ICE Connection State (${remotePeerId}):`, state);
                
                // Detailed state logging
                if (state === 'checking') {
                    console.log('🔍 Checking ICE candidates...');
                } else if (state === 'connected') {
                    console.log('✅ ICE Connected!');
                } else if (state === 'completed') {
                    console.log('✅ ICE Completed!');
                } else if (state === 'failed') {
                    console.error(`❌ ICE Connection FAILED for ${remotePeerId}`);
                    console.error('Possible reasons: Firewall blocking, NAT traversal failed, invalid TURN credentials');
                } else if (state === 'disconnected') {
                    console.warn(`⚠️  ICE Disconnected from ${remotePeerId}`);
                } else if (state === 'closed') {
                    console.log(`🚪 ICE Connection closed for ${remotePeerId}`);
                }
            };

            // Monitor ICE gathering state
            peerConnection.onicegatheringstatechange = () => {
                console.log(`📊 ICE Gathering State (${remotePeerId}):`, peerConnection.iceGatheringState);
                
                // Log when gathering completes
                if (peerConnection.iceGatheringState === 'complete') {
                    console.log('✅ ICE gathering completed for:', remotePeerId);
                    console.log('📋 Signaling State:', peerConnection.signalingState);
                    console.log('🔌 ICE Connection State:', peerConnection.iceConnectionState);
                }
            };

            // Monitor connection state
            peerConnection.onconnectionstatechange = () => {
                console.log(`🔗 Connection State (${remotePeerId}):`, peerConnection.connectionState);
                
                // Handle failed connections
                if (peerConnection.connectionState === 'failed') {
                    console.error('❌ Connection failed for:', remotePeerId);
                    conn.close();
                }
            };

            // Add timeout detection for stuck connections
            setTimeout(() => {
                if (peerConnection.iceConnectionState !== 'connected' && 
                    peerConnection.iceConnectionState !== 'completed') {
                    console.warn(`⏰ Connection timeout for ${remotePeerId} - ICE state: ${peerConnection.iceConnectionState}`);
                    // Don't close automatically, let user see what's happening
                }
            }, 15000); // 15 second timeout
        }

        conn.on('open', async () => {
            console.log('✅ Connected to peer:', remotePeerId);
            connections.current.set(remotePeerId, conn);
            setConnectionsCount(connections.current.size);

            // Log the selected candidate pair
            if (peerConnection) {
                const stats = await peerConnection.getStats();
                stats.forEach((stat) => {
                    if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                        console.log('✅ Active connection using:', stat);
                    }
                });
            }

            // Generate AES key for this peer if not exists
            if (!AESKeys.current.has(remotePeerId)) {
                const key = await generateKeyPair();
                AESKeys.current.set(remotePeerId, key);

                // Send key to remote peer
                const rawKey = await crypto.subtle.exportKey('raw', key);
                conn.send({ type: 'key_exchange', key: Array.from(new Uint8Array(rawKey)) });
            }

            await flushMessageQueue(remotePeerId);
            await flushFileQueue(remotePeerId);
        });

        conn.on('data', async (data: any) => {
            await handleData(remotePeerId, data);
        });

        conn.on('close', () => {
            console.log('Connection closed with:', remotePeerId);
            connections.current.delete(remotePeerId);
            AESKeys.current.delete(remotePeerId);
            setConnectionsCount(connections.current.size);
        });

        conn.on('error', (err) => {
            console.error('Connection error with', remotePeerId, ':', err);
            connections.current.delete(remotePeerId);
            setConnectionsCount(connections.current.size);
        });
    };

    const handleData = async (peerId: string, data: any) => {
        if (data.type === 'key_exchange') {
            const importedKey = await crypto.subtle.importKey(
                'raw',
                new Uint8Array(data.key),
                { name: 'AES-GCM' },
                true,
                ['encrypt', 'decrypt']
            );
            AESKeys.current.set(peerId, importedKey);
            console.log(`AES key established for peer ${peerId}`);

            await flushMessageQueue(peerId);
            await flushFileQueue(peerId);
            return;
        }

        if (data.type === 'encrypted_message') {
            const key = AESKeys.current.get(peerId);
            if (!key) {
                console.warn('Received encrypted message but AES key not ready. Ignored.');
                return;
            }

            const iv = new Uint8Array(data.payload.iv);
            const ciphertext = new Uint8Array(data.payload.ciphertext);
            const decryptedText = await decryptMessage(key, iv, ciphertext);

            if (onMessageRef.current) onMessageRef.current(JSON.parse(decryptedText));
        }

        if (data.type === 'file_chunk' && AESKeys.current.has(peerId)) {
            const key = AESKeys.current.get(peerId)!;
            
            // Decode from base64
            const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
            const ciphertext = Uint8Array.from(atob(data.ciphertext), c => c.charCodeAt(0));

            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                ciphertext
            );

            let fileEntry = incomingFiles.current.get(data.fileId);
            if (!fileEntry) {
                fileEntry = { chunks: [], fileName: data.fileName, totalChunks: data.totalChunks };
                incomingFiles.current.set(data.fileId, fileEntry);
            }

            fileEntry.chunks[data.index] = new Uint8Array(decryptedBuffer);

            if (fileEntry.chunks.filter(Boolean).length === fileEntry.totalChunks) {
                const blob = new Blob(fileEntry.chunks as Uint8Array<ArrayBuffer>[], { type: data.fileType });
                const url = URL.createObjectURL(blob);
                console.log('File received:', fileEntry.fileName, url);
                incomingFiles.current.delete(data.fileId);

                if (onMessageRef.current) {
                    onMessageRef.current({ 
                        type: 'file',
                        fileName: fileEntry.fileName, 
                        url,
                        fileType: data.fileType
                    });
                }
            }
        }
    };

    const sendMessageToPeer = async (peerId: string, message: any) => {
        const key = AESKeys.current.get(peerId);
        const conn = connections.current.get(peerId);
        if (!key || !conn || !conn.open) {
            messageQueue.current.push({ peerId, message });
            return;
        }

        const encrypted = await encryptMessage(key, JSON.stringify(message));
        conn.send({ type: 'encrypted_message', payload: encrypted });
    };

    const sendMessage = async (message: any) => {
        if (connections.current.size === 0) return;
        for (const peerId of connections.current.keys()) {
            await sendMessageToPeer(peerId, message);
        }
    };

    const CHUNK_SIZE = 16 * 1024; // 16KB chunks

    const sendFile = async (file: File, peerId?: string) => {
        const peers = peerId ? [peerId] : Array.from(connections.current.keys());

        for (const pid of peers) {
            const key = AESKeys.current.get(pid);
            const conn = connections.current.get(pid);
            if (!key || !conn || !conn.open) {
                const fileId = crypto.randomUUID();
                fileQueue.current.push({ peerId: pid, file, id: fileId });
                continue;
            }

            const fileId = crypto.randomUUID();
            const arrayBuffer = await file.arrayBuffer();
            const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE);

            console.log(`Sending ${totalChunks} chunks for file ${file.name}`);

            for (let i = 0; i < totalChunks; i++) {
                const chunkBuffer = arrayBuffer.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                const chunkFile = new File([chunkBuffer], file.name, { type: file.type });

                // Encrypt chunk
                const encryptedChunk = await encryptFile(key, chunkFile);

                const fileChunkMessage = {
                    type: 'file_chunk' as const,
                    fileId: fileId,
                    index: i,
                    totalChunks: totalChunks,
                    fileName: file.name,
                    fileType: file.type,
                    ciphertext: encryptedChunk.ciphertext,
                    iv: encryptedChunk.iv
                };

                try {
                    conn.send(fileChunkMessage);
                } catch (err) {
                    console.error('Failed to send chunk:', err);
                    return;
                }
            }
            console.log(`File "${file.name}" sent successfully`);
        }
    };

    return { 
        peerId, 
        isConnected, 
        connect, 
        disconnect, 
        connectToPeer, 
        sendMessage, 
        setOnMessage,
        sendFile, 
        connections: connections.current,
        connectionsCount,
        connectedPeers: Array.from(connections.current.keys()),
        currentRoom,
        createRoom,
        joinRoomByCode,
        leaveRoom
    };
}