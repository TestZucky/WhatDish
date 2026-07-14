import { motion } from 'motion/react';
import { WAVEFORM_HEIGHTS } from '../lib/constants';

export function WaveformBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[2.5px]" style={{ height: 40 }}>
      {WAVEFORM_HEIGHTS.map((maxH, i) => (
        <motion.div
          key={i}
          className="rounded-full bg-[#F75A2C]"
          style={{ width: 3 }}
          animate={{ height: playing ? [maxH * 0.15, maxH] : 3 }}
          transition={
            playing
              ? {
                  duration: 0.35 + (i % 6) * 0.06,
                  delay: i * 0.032,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }
              : { duration: 0.28, ease: 'easeOut' }
          }
        />
      ))}
    </div>
  );
}
