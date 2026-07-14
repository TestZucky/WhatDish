import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PROCESSING_STEPS } from '../lib/constants';
import { scanMenu, ApiError } from '../lib/api';
import type { ErrorType, RestaurantMenu } from '../types';

export function ProcessingScreen() {
  const { setScreen, setMenuView, setMenu, showError, scanImage, setScanImage } =
    useApp();
  const [processingStep, setProcessingStep] = useState(0);
  const [processingDone, setProcessingDone] = useState(false);
  const [dishCount, setDishCount] = useState(MOCK_COUNT);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let menuResult: RestaurantMenu | null = null;
    let scanFailed = false;
    let failType: ErrorType = 'nodish';
    let settled = false;

    // Scan via backend (falls back to mock when unconfigured); consume the
    // image afterwards so re-scans start clean. Dishes stream in, so update a
    // live counter as they arrive.
    scanMenu(scanImage ?? undefined, (p) => {
      if (!cancelled) setLiveCount(p.count);
    })
      .then((m) => {
        menuResult = m;
      })
      .catch((err) => {
        scanFailed = true;
        // 429 = rate limited; show a "slow down" message instead of "no dishes".
        if (err instanceof ApiError && err.status === 429) failType = 'ratelimit';
      })
      .finally(() => {
        settled = true;
        setScanImage(null);
      });

    // Pace steps by elapsed time so progress reads as steady regardless of scan
    // duration; only finish once the scan settled AND MIN_MS has elapsed.
    const total = PROCESSING_STEPS.length;
    const SLICE_MS = 900; // time each step is highlighted while waiting
    const MIN_MS = 1000; // don't finish faster than this, even on instant scans
    const start = Date.now();

    const interval = setInterval(() => {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const idx = Math.min(total - 1, Math.floor(elapsed / SLICE_MS));

      if (!settled || elapsed < MIN_MS) {
        setProcessingStep(idx);
        return;
      }

      clearInterval(interval);
      setProcessingStep(total - 1);

      if (scanFailed) {
        showError(failType);
        return;
      }
      if (menuResult) {
        setDishCount(menuResult.dishCount);
        setMenu(menuResult);
        setProcessingDone(true);
        setTimeout(() => {
          if (cancelled) return;
          setScreen('menu');
          setMenuView('image');
        }, 650);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-[#1A1614]">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=800&fit=crop&auto=format')",
          backgroundSize: 'cover',
          filter: 'blur(10px) saturate(0.8)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1A1614]/80 to-[#1A1614]/95" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="w-full max-w-[310px] rounded-3xl overflow-hidden border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
          style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}
        >
          <div className="p-6">
            <div className="flex flex-col items-center mb-6">
              <div
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F75A2C] to-[#D94010] flex items-center justify-center mb-3 shadow-[0_8px_28px_rgba(247,90,44,0.55)]"
                style={{ animation: 'floatY 2.5s ease-in-out infinite' }}
              >
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 className="text-white font-extrabold text-lg">
                Reading your menu
              </h2>
              <p className="text-white/40 text-xs mt-1">
                AI is on it — just a moment
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              {PROCESSING_STEPS.map((step, i) => {
                const done = processingStep > i;
                const active = processingStep === i;
                return (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                      {done ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                          className="w-7 h-7 rounded-full bg-[#F75A2C] flex items-center justify-center"
                        >
                          <Check size={13} className="text-white" />
                        </motion.div>
                      ) : active ? (
                        <div
                          className="w-7 h-7 rounded-full border-2 border-[#F75A2C] border-t-transparent"
                          style={{ animation: 'spinCW 0.75s linear infinite' }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full border-2 border-white/15" />
                      )}
                    </div>
                    <span
                      className={`text-sm font-semibold transition-all duration-300 ${
                        done
                          ? 'text-white/30 line-through'
                          : active
                            ? 'text-white'
                            : 'text-white/25'
                      }`}
                    >
                      {step}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {processingDone ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-[#F75A2C] text-sm font-bold mt-5"
              >
                ✨ Found {dishCount} dishes!
              </motion.p>
            ) : (
              liveCount > 0 && (
                <p className="text-center text-white/50 text-sm font-semibold mt-5">
                  Found {liveCount} dish{liveCount === 1 ? '' : 'es'}…
                </p>
              )
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const MOCK_COUNT = 7;
