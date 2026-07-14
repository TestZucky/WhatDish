import { CUISINE_COLORS } from '../lib/constants';

export function CuisineBadge({ cuisine }: { cuisine: string }) {
  const c = CUISINE_COLORS[cuisine] ?? {
    pill: 'bg-gray-100 text-gray-700',
    dot: 'bg-gray-400',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${c.pill}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {cuisine}
    </span>
  );
}
