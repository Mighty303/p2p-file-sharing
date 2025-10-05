export type Message = {
  id?: number;
  text?: string; // Make this optional
  sender: string;
  timestamp: string;
  type?: 'message' | 'file';
  fileName?: string;
  url?: string;
  fileType?: string;
};

export interface Peer {
  id: string;
  connected: boolean;
  timestamp?: number;
}


