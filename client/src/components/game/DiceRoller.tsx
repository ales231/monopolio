import { useState, useEffect } from 'react';

const DICE_DOTS: Record<number, string> = {
  1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅',
};

interface Props {
  dice: number[];
  rolling?: boolean;
}

export default function DiceRoller({ dice, rolling }: Props) {
  const [display, setDisplay] = useState(dice);

  useEffect(() => {
    if (rolling) {
      const interval = setInterval(() => {
        setDisplay([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]);
      }, 100);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setDisplay(dice);
      }, 800);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    } else {
      setDisplay(dice);
    }
  }, [dice, rolling]);

  if (!display.length) return null;

  return (
    <div className="flex gap-3 items-center justify-center">
      {display.map((d, i) => (
        <div
          key={i}
          className="dice-face animate-bounce-once"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {DICE_DOTS[d] ?? d}
        </div>
      ))}
      <div className="text-center">
        <div className="text-game-gold font-bold text-lg">{display.reduce((a, b) => a + b, 0)}</div>
        <div className="text-white/40 text-xs">total</div>
      </div>
    </div>
  );
}
