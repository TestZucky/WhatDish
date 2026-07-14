import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Play, Pause } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getPronunciationAudio } from '../lib/api';
import { CuisineBadge } from './CuisineBadge';
import { WaveformBars } from './WaveformBars';

export function DishSheet() {
  const {
    sheetOpen,
    selectedDish,
    isPlaying,
    setIsPlaying,
    closeSheet,
  } = useApp();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dishId = selectedDish?.id ?? null;
  const dishName = selectedDish?.name ?? '';

  // Prefer the backend audio URL; fall back to browser speech synthesis when
  // it's empty or fails so playback always speaks.
  useEffect(() => {
    const stop = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };

    if (!isPlaying || dishId == null) {
      stop();
      return;
    }

    let cancelled = false;

    const speak = () => {
      if (cancelled) return;
      if (!('speechSynthesis' in window)) {
        setIsPlaying(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(dishName);
      utterance.rate = 0.9;
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    };

    (async () => {
      try {
        const url = await getPronunciationAudio(dishId);
        if (cancelled) return;
        if (url) {
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => setIsPlaying(false);
          await audio.play();
        } else {
          speak();
        }
      } catch {
        speak();
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [isPlaying, dishId, dishName, setIsPlaying]);

  return (
    <AnimatePresence>
      {sheetOpen && selectedDish && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSheet}
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px] z-40"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-[32px] z-50 shadow-[0_-16px_60px_rgba(0,0,0,0.18)]"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#E8E0D8]" />
            </div>

            <div className="px-5 pb-8">
              <div className="flex items-start justify-between pt-2 mb-4">
                <div className="flex-1 min-w-0 pr-3">
                  <h2 className="text-2xl font-extrabold text-[#1A1614] leading-tight">
                    {selectedDish.name}
                  </h2>
                  <div className="mt-1.5 flex items-center gap-2">
                    <CuisineBadge cuisine={selectedDish.cuisine} />
                  </div>
                </div>
                <button
                  onClick={closeSheet}
                  className="w-8 h-8 rounded-full bg-[#F2EDE7] flex items-center justify-center flex-shrink-0 mt-0.5"
                >
                  <X size={14} className="text-[#9B8E84]" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-5">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_8px_28px_rgba(247,90,44,0.42)] flex-shrink-0 active:scale-90 transition-all ${
                    isPlaying
                      ? 'bg-[#1A1614]'
                      : 'bg-gradient-to-br from-[#F75A2C] to-[#D94010]'
                  }`}
                >
                  {isPlaying ? (
                    <Pause size={22} className="text-white" />
                  ) : (
                    <Play size={22} className="text-white ml-0.5" />
                  )}
                </button>
                <div className="flex-1 overflow-hidden">
                  <WaveformBars playing={isPlaying} />
                  {!isPlaying && (
                    <p className="text-[10px] text-[#C4B8B0] mt-1">
                      Tap play to hear pronunciation
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 mb-4">
                <div className="flex items-center gap-3 bg-[#FAF8F5] rounded-2xl px-4 py-3 border border-[#F2EDE7]">
                  <span className="text-2xl">🇬🇧</span>
                  <div className="flex-1">
                    <p className="text-[9px] text-[#9B8E84] font-bold uppercase tracking-widest mb-0.5">
                      English Pronunciation
                    </p>
                    <p className="text-base font-extrabold text-[#F75A2C]">
                      {selectedDish.english}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-[#FAF8F5] rounded-2xl px-4 py-3 border border-[#F2EDE7]">
                  <span className="text-2xl">🇮🇳</span>
                  <div className="flex-1">
                    <p className="text-[9px] text-[#9B8E84] font-bold uppercase tracking-widest mb-0.5">
                      Hindi Pronunciation
                    </p>
                    <p className="text-base font-extrabold text-[#1A1614]">
                      {selectedDish.hindi}
                    </p>
                  </div>
                </div>
              </div>

              {selectedDish.description && (
                <p className="text-sm text-[#9B8E84] leading-relaxed px-0.5">
                  {selectedDish.description}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
