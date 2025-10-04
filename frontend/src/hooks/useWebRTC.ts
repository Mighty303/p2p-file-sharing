import { useState, useRef } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export function useWebRTC() {
  const [peerId, setPeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const peerInstance = useRef<Peer | null>(null);
  const connections = useRef<Map<string, DataConnection>>(new Map());
  const onMessageRef = useRef<((msg: any) => void) | null>(null);

  const setOnMessage = (callback: (msg: any) => void) => {
    onMessageRef.current = callback;
  };

  const connect = () => {
    if (peerInstance.current) return;

    const peer = new Peer();

    peer.on('open', (id) => {
      setPeerId(id);
      setIsConnected(true);
      console.log('My peer ID is:', id);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
    });

    peer.on('connection', (conn) => {
      console.log('Incoming connection from:', conn.peer);

      conn.on('open', () => {
        console.log('Connection opened with:', conn.peer);
        connections.current.set(conn.peer, conn);
      });

      conn.on('data', (data) => {
        if (onMessageRef.current) onMessageRef.current(data);
      });

      conn.on('error', (err) => {
        console.error('Connection error:', err);
      });
    });

    peerInstance.current = peer;
  };

  const disconnect = () => {
    if (!peerInstance.current) return;
    peerInstance.current.destroy();
    peerInstance.current = null;
    setIsConnected(false);
    setPeerId('');
    connections.current.clear();
  };

  const connectToPeer = (remotePeerId: string) => {
    if (!peerInstance.current) return;

    const conn = peerInstance.current.connect(remotePeerId);

    conn.on('open', () => {
      console.log('Connected to peer:', remotePeerId);
      connections.current.set(remotePeerId, conn);
    });

    conn.on('data', (data) => {
      if (onMessageRef.current) onMessageRef.current(data);
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  };

  const sendMessage = (message: any) => {
    connections.current.forEach((conn) => {
      if (conn.open) conn.send(message);
    });
  };

  return { peerId, isConnected, connect, disconnect, connectToPeer, sendMessage, setOnMessage, connections: connections.current};
}
