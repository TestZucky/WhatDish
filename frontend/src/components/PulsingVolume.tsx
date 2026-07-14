import { Volume2 } from 'lucide-react';

export function PulsingVolume({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Hear pronunciation"
      className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#F75A2C] shadow-[0_4px_14px_rgba(247,90,44,0.55)] active:scale-90 transition-transform flex-shrink-0 z-10"
    >
      <Volume2 size={13} className="text-white relative z-10" />
      <span
        className="absolute inset-0 rounded-full bg-[#F75A2C]/50 pointer-events-none"
        style={{ animation: 'speakerPulse 2s ease-out infinite' }}
      />
      <span
        className="absolute inset-0 rounded-full bg-[#F75A2C]/25 pointer-events-none"
        style={{ animation: 'speakerPulse 2s ease-out 0.6s infinite' }}
      />
    </button>
  );
}
