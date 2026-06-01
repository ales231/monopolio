import { useRef, useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { socketEmit } from '../../sockets/socketClient';

export default function ChatBox() {
  const chat = useGameStore((s) => s.chat);
  const [msg, setMsg] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    socketEmit.sendChat(msg);
    setMsg('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-1 mb-2 min-h-0">
        {chat.map((m, i) => (
          <div key={i} className="text-xs">
            <span className="text-primary-400 font-semibold">{m.username}: </span>
            <span className="text-white/70">{m.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-1">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Mensaje..."
          className="input py-1.5 text-xs flex-1"
          maxLength={200}
        />
        <button type="submit" className="btn-primary px-2 text-xs">→</button>
      </form>
    </div>
  );
}
