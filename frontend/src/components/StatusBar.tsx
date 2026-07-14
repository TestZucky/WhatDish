export function StatusBar({ dark = false }: { dark?: boolean }) {
  const cls = dark ? 'text-white/75' : 'text-[#1A1614]/50';
  return (
    <div
      className={`flex items-center justify-between px-6 pt-4 pb-1 text-[11px] font-bold select-none ${cls}`}
    >
      <span className="text-sm font-black">9:41</span>
      <div className="flex items-center gap-2">
        {/* Signal bars */}
        <div className="flex items-end gap-[2px]">
          {[10, 13, 16, 19].map((h, i) => (
            <div
              key={i}
              className="w-[3px] rounded-sm bg-current"
              style={{ height: h }}
            />
          ))}
        </div>
        {/* WiFi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm0-3.5a5.5 5.5 0 0 1 4.24 2L13.7 6.5A7.5 7.5 0 0 0 8 4a7.5 7.5 0 0 0-5.7 2.5L3.76 8A5.5 5.5 0 0 1 8 6zm0-4a9.5 9.5 0 0 1 7.16 3.26l1.46-1.46A11.5 11.5 0 0 0 8 0a11.5 11.5 0 0 0-8.62 3.8L.84 5.26A9.5 9.5 0 0 1 8 2z" />
        </svg>
        {/* Battery */}
        <div className="flex items-center">
          <div className="w-6 h-3 rounded-[3px] border border-current relative">
            <div
              className="absolute inset-[2px] rounded-[1px] bg-current"
              style={{ right: '30%' }}
            />
          </div>
          <div className="w-[2px] h-1.5 rounded-r-sm bg-current ml-px" />
        </div>
      </div>
    </div>
  );
}
