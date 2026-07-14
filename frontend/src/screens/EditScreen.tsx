import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, X, Sparkles, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBar } from '../components/StatusBar';

export function EditScreen() {
  const {
    goBack,
    editText,
    setEditText,
    setEditRegenerated,
    editRegenerating,
    editRegenerated,
    handleRegenerate,
    regenResult,
    selectedDish,
  } = useApp();

  const english = regenResult?.english ?? selectedDish?.english ?? '—';
  const hindi = regenResult?.hindi ?? selectedDish?.hindi ?? '—';

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5]">
      <div className="sm:pt-5" />
      <StatusBar />
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#E8E0D8]">
        <button
          onClick={goBack}
          className="w-9 h-9 rounded-full bg-white border border-[#E8E0D8] flex items-center justify-center shadow-sm"
        >
          <ChevronLeft size={18} className="text-[#1A1614]" />
        </button>
        <div>
          <p className="font-extrabold text-[#1A1614] text-[15px]">
            Edit Dish Name
          </p>
          <p className="text-xs text-[#9B8E84]">Correct OCR and regenerate</p>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 overflow-y-auto hide-scroll flex flex-col gap-4">
        <div className="bg-white rounded-2xl border border-[#E8E0D8] p-4 shadow-sm">
          <label className="text-[10px] font-bold text-[#9B8E84] uppercase tracking-widest block mb-2">
            Dish Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value);
                setEditRegenerated(false);
              }}
              className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#E8E0D8] text-[#1A1614] font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#F75A2C]/25 focus:border-[#F75A2C]/50 transition-all"
            />
            {editText && (
              <button
                onClick={() => {
                  setEditText('');
                  setEditRegenerated(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#E8E0D8] flex items-center justify-center"
              >
                <X size={11} className="text-[#9B8E84]" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={editRegenerating || !editText.trim()}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-gradient-to-r from-[#F75A2C] to-[#D94010] text-white font-bold text-sm shadow-[0_8px_24px_rgba(247,90,44,0.38)] active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {editRegenerating ? (
            <>
              <div
                className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white"
                style={{ animation: 'spinCW 0.75s linear infinite' }}
              />
              Generating…
            </>
          ) : (
            <>
              <Sparkles size={17} />
              Regenerate Pronunciation
            </>
          )}
        </button>

        <AnimatePresence>
          {editRegenerated && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="bg-white rounded-2xl border border-[#E8E0D8] p-4 shadow-sm"
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles size={13} className="text-[#F75A2C]" />
                <span className="text-[10px] font-bold text-[#F75A2C] uppercase tracking-widest">
                  AI Generated
                </span>
              </div>
              <h3 className="font-extrabold text-[#1A1614] text-xl mb-3">
                {editText}
              </h3>
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center gap-3 bg-[#FAF8F5] rounded-xl px-3.5 py-2.5">
                  <span className="text-lg">🇬🇧</span>
                  <div>
                    <p className="text-[9px] text-[#9B8E84] font-bold uppercase tracking-wider">
                      English
                    </p>
                    <p className="text-sm font-bold text-[#F75A2C]">{english}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-[#FAF8F5] rounded-xl px-3.5 py-2.5">
                  <span className="text-lg">🇮🇳</span>
                  <div>
                    <p className="text-[9px] text-[#9B8E84] font-bold uppercase tracking-wider">
                      Hindi
                    </p>
                    <p className="text-sm font-bold text-[#1A1614]">{hindi}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={goBack}
                className="w-full py-3 rounded-xl bg-[#1A1614] text-white text-sm font-bold flex items-center justify-center gap-2"
              >
                <Check size={15} /> Save & Return
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
