import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { connectSocket, socketEmit } from '../sockets/socketClient';
import { useEffect, useRef } from 'react';

export default function JoinRoomPage() {
  const navigate = useNavigate();
  const room = useGameStore((s) => s.room);
  const error = useGameStore((s) => s.error);
  const joined = useRef(false);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ code: string }>();

  useEffect(() => { connectSocket(); }, []);

  useEffect(() => {
    if (room && !joined.current) {
      joined.current = true;
      navigate(`/room/${room.code}`);
    }
  }, [room, navigate]);

  const onSubmit = ({ code }: { code: string }) => {
    socketEmit.joinRoom(code.toUpperCase().trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate('/dashboard')} className="text-white/50 mb-6 flex items-center gap-2">
          ← Volver
        </button>
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Unirse a Sala 🔗</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input
              {...register('code', { required: true })}
              placeholder="Código de sala (ej: AB12CD)"
              className="input text-center text-xl tracking-widest uppercase"
              maxLength={6}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
              Unirse 🎮
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
