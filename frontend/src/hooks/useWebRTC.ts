import { useState, useRef } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { generateKeyPair, encryptMessage, decryptMessage } from '../utils/crypto';

type QueuedMessage = {
  peerId: string;
  message: any;
};

export function useWebRTC() {
  const [peerId, setPeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const peerInstance = useRef<Peer | null>(null);
  const connections = useRef<Map<string, DataConnection>>(new Map());
  const onMessageRef = useRef<((msg: any) => void) | null>(null);

  // Store AES keys per peer
  const AESKeys = useRef<Map<string, CryptoKey>>(new Map());

  // Queue messages until keys are ready
  const messageQueue = useRef<QueuedMessage[]>([]);

  const setOnMessage = (callback: (msg: any) => void) => {
    onMessageRef.current = callback;
  };

  const flushQueue = async (peerId: string) => {
    const key = AESKeys.current.get(peerId);
    if (!key) return;

    const queue = messageQueue.current.filter(q => q.peerId === peerId);
    for (const item of queue) {
      await sendMessageToPeer(item.peerId, item.message);
    }
    messageQueue.current = messageQueue.current.filter(q => q.peerId !== peerId);
  };

  const connect = () => {
    if (peerInstance.current) return;

    const peer = new Peer();

    peer.on('open', (id) => {
      setPeerId(id);
      setIsConnected(true);
      console.log('My peer ID is:', id);
    });

    peer.on('error', (err) => console.error('Peer error:', err));

    peer.on('connection', (conn) => handleIncomingConnection(conn));

    peerInstance.current = peer;
  };

  const disconnect = () => {
    if (!peerInstance.current) return;
    peerInstance.current.destroy();
    peerInstance.current = null;
    setIsConnected(false);
    setPeerId('');
    connections.current.clear();
    AESKeys.current.clear();
    messageQueue.current = [];
  };

  const handleIncomingConnection = (conn: DataConnection) => {
    console.log('Incoming connection from:', conn.peer);

    conn.on('open', async () => {
      console.log('Connection opened with:', conn.peer);
      connections.current.set(conn.peer, conn);
    });

    conn.on('data', async (data: any) => {
      await handleData(conn.peer, data);
    });

    conn.on('error', (err) => console.error('Connection error:', err));
  };

  const connectToPeer = (remotePeerId: string) => {
    if (!peerInstance.current) return;

    const conn = peerInstance.current.connect(remotePeerId);

    conn.on('open', async () => {
      console.log('Connected to peer:', remotePeerId);
      connections.current.set(remotePeerId, conn);

      // Generate AES key for this peer if not exists
      if (!AESKeys.current.has(remotePeerId)) {
        const key = await generateKeyPair();
        AESKeys.current.set(remotePeerId, key);

        // Send key to remote peer
        const rawKey = await crypto.subtle.exportKey('raw', key);
        conn.send({ type: 'key_exchange', key: Array.from(new Uint8Array(rawKey)) });
      }

      await flushQueue(remotePeerId);
    });

    conn.on('data', async (data: any) => {
      await handleData(remotePeerId, data);
    });

    conn.on('error', (err) => console.error('Connection error:', err));
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

      await flushQueue(peerId);
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

  return { peerId, isConnected, connect, disconnect, connectToPeer, sendMessage, setOnMessage, connections: connections.current };
}
