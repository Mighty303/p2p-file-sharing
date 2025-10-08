# 🚀 P2P Chat & File Transfer

A secure, peer-to-peer chat and file sharing application built with WebRTC, React, and end-to-end encryption. No servers store your messages or files - everything is transmitted directly between peers.

## ✨ Features

- **🔐 End-to-End Encryption**: All messages and files are encrypted using AES-GCM before transmission
- **💬 Real-time Chat**: Instant messaging with multiple peers simultaneously
- **📁 File Sharing**: Send files of any size with automatic chunking and progress
- **🏠 Room System**: Create or join rooms with memorable codes (e.g., `swift-eagle-42`)
- **🔗 QR Code Sharing**: Share room links via QR codes for easy mobile access
- **🌐 NAT Traversal**: Works across different networks using STUN/TURN servers
- **📱 Responsive Design**: Beautiful UI that works on desktop and mobile

## 🛠️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **WebRTC**: PeerJS for peer-to-peer connections
- **Encryption**: Web Crypto API (AES-GCM 256-bit)
- **Routing**: React Router
- **Build Tool**: Vite

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- A room signaling server (see Server Setup below)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd p2p-chat
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```env
VITE_ROOM_SERVER_URL=http://localhost:3001
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5173`

## 🖥️ Backend Server

The application requires a signaling server for room management. The backend is maintained in a separate repository:

**Backend Repository**: [p2p-file-sharing-backend](https://github.com/Mighty303/p2p-file-sharing-backend)

The server handles room creation, peer discovery, and coordination. Set the backend URL in your `.env` file to connect to your deployed instance.

## 📖 Usage

### Creating a Room

1. Click "Connect" to initialize your peer connection
2. Navigate to the "Room" tab
3. Click "Create New Room"
4. Share the generated room code or QR code with others

### Joining a Room

1. Click "Connect" to initialize your peer connection
2. Navigate to the "Room" tab
3. Enter a room code and click "Join Room"
4. Or scan a QR code and open the link

### Sending Messages

1. Join a room with at least one other peer
2. Navigate to the "Chat" tab
3. Type your message and press Enter or click Send
4. Messages are automatically encrypted before sending

### Sharing Files

1. Join a room with at least one other peer
2. Navigate to the "Files" tab
3. Click "Choose File" or drag and drop files
4. Files are encrypted and sent in chunks to all connected peers

## 🔒 Security

- **AES-GCM 256-bit encryption**: All data is encrypted before transmission
- **Unique keys per peer**: Each peer connection has its own encryption key
- **No server storage**: Messages and files are never stored on any server
- **Perfect forward secrecy**: Keys are generated per session and never reused

## 🌐 Network Compatibility

The app uses multiple STUN/TURN servers to ensure connectivity:

- **STUN Servers**: Google's public STUN servers for NAT discovery
- **TURN Servers**: Open Relay Project for firewall traversal

This ensures connections work across:
- Different networks and ISPs
- Corporate firewalls
- Symmetric NATs
- Mobile networks

## 🏗️ Project Structure

```
src/
├── components/        # React components
│   ├── Header.tsx
│   ├── ChatPanel.tsx
│   ├── FilePanel.tsx
│   ├── RoomPanel.tsx
│   └── TabBar.tsx
├── hooks/
│   └── useWebRTC.ts  # WebRTC connection logic
├── utils/
│   └── crypto.ts     # Encryption utilities
├── types/
│   └── index.ts      # TypeScript types
└── App.tsx           # Main app component
```

## 🐛 Known Limitations

- **Browser Support**: Requires modern browsers with WebRTC and Web Crypto API support
- **File Size**: Very large files (>100MB) may cause performance issues
- **Connection Limits**: Optimal performance with 2-10 peers per room
- **Mobile Safari**: May have limitations with background tab connections

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 👨‍💻 Author

Built by Martin Wong

## 🙏 Acknowledgments

- PeerJS for simplifying WebRTC
- Open Relay Project for free TURN servers
- The WebRTC community for documentation and examples
