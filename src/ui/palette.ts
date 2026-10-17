/** Eight colour-blind-safe player colours, each paired with a shape and an initial. */
export const PALETTE = [
  { colour: '#E9762B', shape: 'circle(50% at 50% 50%)' },
  { colour: '#1AA39A', shape: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)' },
  { colour: '#E56DB8', shape: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' },
  { colour: '#A58BFF', shape: 'inset(6% round 22%)' },
  { colour: '#F2C94C', shape: 'polygon(50% 4%, 96% 96%, 4% 96%)' },
  { colour: '#7FB6F5', shape: 'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)' },
  { colour: '#B5651D', shape: 'polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
  { colour: '#9BC53D', shape: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }
] as const;

export const paletteFor = (seat: number) => PALETTE[seat % PALETTE.length];
