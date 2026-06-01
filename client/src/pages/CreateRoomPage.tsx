import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { connectSocket, socketEmit } from '../sockets/socketClient';

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const room = useGameStore((s) => s.room);

  useEffect(() => {
    connectSocket();
    socketEmit.createRoom();
  }, []);

  useEffect(() => {
    if (room) navigate(`/room/${room.code}`);
  }, [room, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-spin">🎲</div>
        <p className="text-white/70">Creando sala...</p>
      </div>
    </div>
  );
}
