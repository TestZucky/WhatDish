import { useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, Upload, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function LandingScreen() {
  const { setScreen, setScanImage } = useApp();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again still fires onChange.
    e.target.value = '';
    if (!file) return;
    setScanImage(file);
    setScreen('processing');
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5] overflow-hidden">
      <div className="sm:pt-6" />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#F75A2C]/10 blur-3xl" />
        <div className="absolute top-48 -left-20 w-56 h-56 rounded-full bg-amber-300/8 blur-2xl" />
        <div className="absolute bottom-36 right-4 w-40 h-40 rounded-full bg-[#F75A2C]/6 blur-2xl" />
      </div>

      <div className="flex flex-col flex-1 px-6 pt-6 pb-8 overflow-y-auto hide-scroll relative">
        <motion.div
          className="flex flex-col items-center mb-9"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 22 }}
        >
          <div
            className="relative mb-5"
            style={{ animation: 'floatY 3.2s ease-in-out infinite' }}
          >
            <div className="w-20 h-20 rounded-[26px] bg-gradient-to-br from-[#F75A2C] to-[#D94010] flex items-center justify-center shadow-[0_12px_40px_rgba(247,90,44,0.45)]">
              <Volume2 size={34} className="text-white" />
            </div>
            <div
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-sm shadow-lg text-white font-bold"
              style={{ animation: 'sparkSpin 2.4s ease-in-out infinite' }}
            >
              ✦
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-[#1A1614] tracking-tight">
            WhatDish
          </h1>
          <p className="text-[28px] font-bold text-[#1A1614] mt-2 text-center leading-snug">
            What is this dish?
          </p>
          <p className="text-sm text-[#9B8E84] mt-2.5 text-center leading-relaxed">
            Scan any menu. Hear how every
            <br />
            dish is pronounced. Instantly.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col gap-3 mb-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <button
            onClick={() => setScreen('camera')}
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-gradient-to-r from-[#F75A2C] to-[#D94010] text-white font-bold text-[15px] shadow-[0_8px_32px_rgba(247,90,44,0.42)] active:scale-[0.97] transition-transform"
          >
            <Camera size={22} />
            Scan Menu
          </button>
          <button
            onClick={() => uploadInputRef.current?.click()}
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-white text-[#1A1614] font-semibold text-[15px] border border-[#E8E0D8] shadow-sm active:scale-[0.97] transition-transform"
          >
            <Upload size={20} className="text-[#9B8E84]" />
            Upload Photo
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </motion.div>

        <motion.div
          className="flex items-center justify-center gap-3 text-xs text-[#B4A89E] mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
        >
          <span>🔒 No login</span>
          <span className="opacity-40">·</span>
          <span>🗑 Images auto deleted</span>
          <span className="opacity-40">·</span>
          <span>⚡ Instant</span>
        </motion.div>
      </div>
    </div>
  );
}
