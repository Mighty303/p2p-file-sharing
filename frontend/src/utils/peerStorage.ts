import type { Peer } from '../types';

const PEERS_STORAGE_KEY = 'p2p_peers';

export function savePeers(peers: Peer[]): void {
  localStorage.setItem(PEERS_STORAGE_KEY, JSON.stringify(peers));
}

export function loadPeers(): Peer[] {
  const storedPeers = localStorage.getItem(PEERS_STORAGE_KEY);
  if (!storedPeers) return [];
  
  try {
    return JSON.parse(storedPeers);
  } catch {
    return [];
  }
}

export function addPeer(peers: Peer[], newPeer: Peer): Peer[] {
  const existingPeer = peers.find(p => p.id === newPeer.id);
  if (existingPeer) {
    // Update existing peer
    const updatedPeers = peers.map(p => 
      p.id === newPeer.id ? { ...p, ...newPeer } : p
    );
    savePeers(updatedPeers);
    return updatedPeers;
  }

  // Add new peer
  const updatedPeers = [...peers, newPeer];
  savePeers(updatedPeers);
  return updatedPeers;
}

export function removePeer(peers: Peer[], peerId: string): Peer[] {
  const updatedPeers = peers.filter(p => p.id !== peerId);
  savePeers(updatedPeers);
  return updatedPeers;
}

export function updatePeerConnection(peers: Peer[], peerId: string, connected: boolean): Peer[] {
  const updatedPeers = peers.map(p =>
    p.id === peerId ? { ...p, connected, timestamp: Date.now() } : p
  );
  savePeers(updatedPeers);
  return updatedPeers;
}
