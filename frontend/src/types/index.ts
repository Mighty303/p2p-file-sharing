export interface Message {
  id: number;
  text: string;
  sender: string;
  timestamp: string;
}

export interface Peer {
  id: string;
  connected: boolean;
  timestamp?: number;
}


