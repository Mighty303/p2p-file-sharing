import { MessageSquare, Send } from 'lucide-react';
import type { Message } from '../types';

interface ChatPanelProps {
  messages: Message[];
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function ChatPanel({
  messages,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  onKeyPress
}: ChatPanelProps) {
  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">No messages yet. Start chatting!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-purple-400">{msg.sender}</span>
                <span className="text-xs text-slate-400">{msg.timestamp}</span>
              </div>
              <p className="text-slate-200">{msg.text}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => onMessageInputChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="Type a message..."
          className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button
          onClick={onSendMessage}
          disabled={!messageInput.trim()}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-slate-600 disabled:to-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg disabled:shadow-none disabled:cursor-not-allowed"
        >
          <Send size={20} />
          Send
        </button>
      </div>
    </div>
  );
}
