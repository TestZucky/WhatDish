/** Pill + dot colors for each cuisine badge. */
export const CUISINE_COLORS: Record<string, { pill: string; dot: string }> = {
  Italian: { pill: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400' },
  French: { pill: 'bg-blue-100 text-blue-800', dot: 'bg-blue-400' },
  Spanish: { pill: 'bg-rose-100 text-rose-800', dot: 'bg-rose-400' },
  Japanese: { pill: 'bg-violet-100 text-violet-800', dot: 'bg-violet-400' },
  Vietnamese: { pill: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-400' },
};

/** Steps shown on the processing screen while the menu is being read. */
export const PROCESSING_STEPS = [
  'Uploading image',
  'Reading menu text',
  'Detecting dishes',
  'Preparing pronunciations',
];

/** Static bar heights for the pronunciation waveform animation. */
export const WAVEFORM_HEIGHTS = [
  8, 18, 26, 12, 32, 20, 10, 28, 16, 32, 14, 22, 30, 8, 20, 28, 32, 12, 18, 10,
  24, 28, 12, 30,
];
