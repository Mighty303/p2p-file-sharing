// Generate a short, memorable room code
export function generateRoomCode(): string {
  const adjectives = ['swift', 'bright', 'bold', 'calm', 'cool', 'dark', 'epic', 'fair', 'fast', 'glad'];
  const nouns = ['eagle', 'tiger', 'river', 'storm', 'cloud', 'flame', 'moon', 'star', 'wave', 'wind'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  
  return `${adj}-${noun}-${num}`;
}

// Store room -> peer mapping
const roomStore = new Map<string, string[]>();

export function joinRoom(roomCode: string, peerId: string): string[] {
  if (!roomStore.has(roomCode)) {
    roomStore.set(roomCode, []);
  }
  const peers = roomStore.get(roomCode)!;
  if (!peers.includes(peerId)) {
    peers.push(peerId);
  }
  return peers.filter(p => p !== peerId); // Return other peers
}

export function leaveRoom(roomCode: string, peerId: string): void {
  const peers = roomStore.get(roomCode);
  if (peers) {
    const index = peers.indexOf(peerId);
    if (index > -1) peers.splice(index, 1);
    if (peers.length === 0) roomStore.delete(roomCode);
  }
}