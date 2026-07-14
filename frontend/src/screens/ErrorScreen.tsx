import { motion } from 'motion/react';
import {
  ChevronLeft,
  Camera,
  ImageOff,
  AlertCircle,
  WifiOff,
  Clock,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const COPY = {
  blurry: {
    title: 'Image Too Blurry',
    body: 'The photo is too blurry to read. Please take a clearer shot with good lighting.',
  },
  nodish: {
    title: 'No Dishes Detected',
    body: "We couldn't find any dish names in this image. Try a different part of the menu.",
  },
  audio: {
    title: 'Audio Unavailable',
    body: "Pronunciation audio isn't available right now. Check your connection and try again.",
  },
  ratelimit: {
    title: 'Whoa, slow down!',
    body: "You've scanned a lot in a short time. Please wait a few minutes and try again.",
  },
} as const;

const BLUR_TIPS = [
  'Hold phone steady',
  'Ensure good lighting',
  'Keep menu flat on surface',
  'Tap screen to focus first',
];

export function ErrorScreen() {
  const { errorType, goBack, setScreen } = useApp();
  const copy = COPY[errorType];

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5]">
      <div className="sm:pt-5" />
      <div className="flex items-center px-5 py-3 border-b border-[#E8E0D8]">
        <button
          onClick={goBack}
          className="w-9 h-9 rounded-full bg-white border border-[#E8E0D8] flex items-center justify-center shadow-sm"
        >
          <ChevronLeft size={18} className="text-[#1A1614]" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ scale: 0.78, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 20 }}
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{
            background:
              errorType === 'blurry'
                ? 'linear-gradient(135deg,#FEE2E2,#FECACA)'
                : errorType === 'nodish' || errorType === 'ratelimit'
                  ? 'linear-gradient(135deg,#FEF3C7,#FDE68A)'
                  : 'linear-gradient(135deg,#F1F5F9,#E2E8F0)',
          }}
        >
          {errorType === 'blurry' && (
            <ImageOff size={40} className="text-rose-400" />
          )}
          {errorType === 'nodish' && (
            <AlertCircle size={40} className="text-amber-400" />
          )}
          {errorType === 'ratelimit' && (
            <Clock size={40} className="text-amber-500" />
          )}
          {errorType === 'audio' && (
            <WifiOff size={40} className="text-slate-400" />
          )}
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-extrabold text-[#1A1614] mb-2"
        >
          {copy.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-sm text-[#9B8E84] leading-relaxed mb-8"
        >
          {copy.body}
        </motion.p>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => setScreen('camera')}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-[#F75A2C] to-[#D94010] text-white font-bold text-sm shadow-[0_8px_24px_rgba(247,90,44,0.35)] active:scale-[0.97] transition-transform"
          >
            <Camera size={17} />
            {errorType === 'audio' ? 'Try Again' : 'Take New Photo'}
          </button>
          <button
            onClick={() => setScreen('landing')}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white border border-[#E8E0D8] text-[#1A1614] font-semibold text-sm"
          >
            Go to Home
          </button>
        </div>

        {errorType === 'blurry' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-6 bg-white rounded-2xl border border-[#E8E0D8] p-4 w-full text-left"
          >
            <p className="text-xs font-bold text-[#1A1614] mb-2.5">
              Tips for a clear scan:
            </p>
            {BLUR_TIPS.map((tip) => (
              <div key={tip} className="flex items-center gap-2.5 py-1">
                <div className="w-4 h-4 rounded-full bg-[#F75A2C]/12 flex items-center justify-center flex-shrink-0">
                  <Check size={9} className="text-[#F75A2C]" />
                </div>
                <span className="text-xs text-[#9B8E84]">{tip}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
