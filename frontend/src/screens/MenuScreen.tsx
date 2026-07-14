import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { StatusBar } from '../components/StatusBar';
import { PulsingVolume } from '../components/PulsingVolume';

export function MenuScreen() {
  const { menu, openDish } = useApp();

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5]">
      <div className="bg-[#FAF8F5]/96 backdrop-blur-md border-b border-[#E8E0D8] z-30 flex-shrink-0">
        <div className="sm:pt-5" />
        <StatusBar />
        <div className="flex items-center px-5 py-3">
          <div>
            <p className="font-extrabold text-[#1A1614] text-[15px]">
              {menu.restaurant.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <p className="text-xs text-[#9B8E84] font-medium">
                {menu.dishCount} dishes detected
              </p>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="flex-1 overflow-y-auto hide-scroll"
      >
        <div className="menu-paper min-h-full px-6 py-8">
          <div className="text-center mb-7">
            {menu.restaurant.established && (
              <p className="text-[10px] font-bold text-[#9B7A60] tracking-[0.25em] uppercase mb-1.5">
                Established {menu.restaurant.established}
              </p>
            )}
            <h2
              className="text-3xl text-[#2C1810] font-bold leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {menu.restaurant.name}
            </h2>
            <p
              className="text-sm text-[#7A5C4A] mt-1 italic"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {menu.restaurant.tagline}
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#C4A882]" />
              <div className="text-[#C4A882] text-sm">❧</div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#C4A882]" />
            </div>
          </div>

          {menu.sections.map((section) => (
            <div key={section.title} className="mb-7">
              <h3
                className="text-[11px] font-bold text-[#7A5C4A] tracking-[0.22em] uppercase mb-3 pb-2 border-b border-[#C4A882]/35"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                — {section.title} —
              </h3>
              <div className="flex flex-col gap-3.5">
                {section.items.map((item) => (
                  <div key={item.name} className="group">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[15px] font-semibold text-[#2C1810] leading-snug"
                            style={{
                              fontFamily: "'Playfair Display', Georgia, serif",
                            }}
                          >
                            {item.name}
                          </span>
                          {item.dish && (
                            <PulsingVolume
                              onClick={() => item.dish && openDish(item.dish)}
                            />
                          )}
                        </div>
                        {item.dish?.description && (
                          <p className="text-xs text-[#9B7A60] mt-0.5 leading-relaxed">
                            {item.dish.description}
                          </p>
                        )}
                      </div>
                      <span
                        className="text-sm font-semibold text-[#7A5C4A] flex-shrink-0 pt-0.5"
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}
                      >
                        {item.price}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-center gap-3 mt-4 mb-2">
            <div className="h-px flex-1 bg-[#C4A882]/40" />
            <div className="text-[#C4A882]/60 text-xs">✦</div>
            <div className="h-px flex-1 bg-[#C4A882]/40" />
          </div>
          <p
            className="text-center text-[10px] text-[#C4A882]/60 italic"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            All prices include VAT · Please inform us of any allergies
          </p>
        </div>
      </motion.div>
    </div>
  );
}
