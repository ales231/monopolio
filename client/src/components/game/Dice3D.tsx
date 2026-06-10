import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Dados 3D reales con CSS transforms.
 * Cada dado es un cubo de 6 caras; al recibir un valor nuevo,
 * gira varias vueltas completas y aterriza mostrando la cara correcta.
 */

// Caras del cubo: frente=1, atrás=6, derecha=2, izquierda=5, arriba=3, abajo=4 (opuestos suman 7)
// Rotación del cubo necesaria para mostrar cada valor de frente:
const SHOW_FACE: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

// Posiciones de los puntos en una cuadrícula 3x3 (índices 0-8)
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Face({ value, transform, size }: { value: number; transform: string; size: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        transform,
        background: 'linear-gradient(135deg, #ffffff 0%, #e8e8e8 100%)',
        border: '1px solid #bbb',
        borderRadius: size * 0.16,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        padding: size * 0.14,
        backfaceVisibility: 'hidden',
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {PIPS[value]?.includes(i) && (
            <div
              style={{
                width: size * 0.16,
                height: size * 0.16,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #444, #000)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Die({ value, rollId, size = 52, delay = 0 }: { value: number; rollId: number; size?: number; delay?: number }) {
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const half = size / 2;

  useEffect(() => {
    setRot((prev) => {
      // Normaliza al múltiplo de 360 más cercano hacia abajo y agrega 2-3 vueltas + cara final
      const baseX = Math.ceil(prev.x / 360) * 360;
      const baseY = Math.ceil(prev.y / 360) * 360;
      const turnsX = 360 * (2 + Math.floor(Math.random() * 2));
      const turnsY = 360 * (2 + Math.floor(Math.random() * 2));
      return {
        x: baseX + turnsX + SHOW_FACE[value].x,
        y: baseY + turnsY + SHOW_FACE[value].y,
      };
    });
  }, [value, rollId]);

  return (
    <div style={{ perspective: 600, width: size, height: size }}>
      <motion.div
        animate={{ rotateX: rot.x, rotateY: rot.y }}
        transition={{ duration: 1.1, ease: [0.25, 0.9, 0.3, 1], delay }}
        style={{
          width: size,
          height: size,
          position: 'relative',
          transformStyle: 'preserve-3d',
        }}
      >
        <Face value={1} size={size} transform={`rotateY(0deg) translateZ(${half}px)`} />
        <Face value={6} size={size} transform={`rotateY(180deg) translateZ(${half}px)`} />
        <Face value={2} size={size} transform={`rotateY(90deg) translateZ(${half}px)`} />
        <Face value={5} size={size} transform={`rotateY(-90deg) translateZ(${half}px)`} />
        <Face value={3} size={size} transform={`rotateX(90deg) translateZ(${half}px)`} />
        <Face value={4} size={size} transform={`rotateX(-90deg) translateZ(${half}px)`} />
      </motion.div>
    </div>
  );
}

export default function DiceRoller3D({ dice }: { dice: number[] }) {
  const [rollId, setRollId] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setRollId((i) => i + 1);
    setSettled(false);
    const t = setTimeout(() => setSettled(true), 1300);
    return () => clearTimeout(t);
  }, [dice]);

  if (!dice.length) return null;
  const total = dice.reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center justify-center gap-5 py-1" style={{ minHeight: 64 }}>
      {dice.map((d, i) => (
        <motion.div
          key={i}
          animate={settled ? { y: 0 } : { y: [0, -14, 0, -7, 0] }}
          transition={{ duration: 1.1, delay: i * 0.12 }}
        >
          <Die value={d} rollId={rollId} delay={i * 0.12} />
        </motion.div>
      ))}
      <AnimatePresence>
        {settled && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="text-center"
          >
            <div className="text-yellow-400 font-bold text-2xl leading-none">{total}</div>
            <div className="text-white/30 text-[10px] uppercase tracking-wider">total</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
