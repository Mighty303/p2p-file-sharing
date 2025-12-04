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

    // Poll for new room members
    const pollRoomMembers = async () => {
        if (!currentRoom || !peerId) return;
        
        try {
            const response = await fetch(`${ROOM_SERVER_URL}/room/${currentRoom}/peers`);
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
            console.error('Failed to poll room members:', err);
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

    const connect = () => {
        if (peerInstance.current) return;

        // Configure WebRTC with STUN and TURN servers
        const peer = new Peer({
            config: {
                iceServers: [
                    // Google's free STUN servers (IPv6 support)
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    
                    // Free TURN servers from Open Relay Project
                    // These allow connections through firewalls
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ],
                // Improve connection reliability and prioritize IPv6
                iceCandidatePoolSize: 10,
                iceTransportPolicy: 'all', // Allow both IPv4 and IPv6
                // RTCConfiguration to prefer IPv6
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            },
            // Enable debug logging (set to 0 in production)
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
                    const isIPv6 = candidate.includes(':') && !candidate.includes('.');
                    console.log(`🧊 ICE Candidate (${isIPv6 ? 'IPv6' : 'IPv4'}):`, candidate.substring(0, 50));
                }
            };
        }

        conn.on('open', async () => {
            console.log('Connection opened with:', conn.peer);
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

        console.log('Connecting to peer:', remotePeerId);
        const conn = peerInstance.current.connect(remotePeerId, {
            reliable: true, // Use reliable data channels
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
                    const isIPv6 = candidate.includes(':') && !candidate.includes('.');
                    console.log(`🧊 ICE Candidate (${isIPv6 ? 'IPv6' : 'IPv4'}):`, candidate.substring(0, 50));
                }
            };
        }

        conn.on('open', async () => {
            console.log('Connected to peer:', remotePeerId);
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