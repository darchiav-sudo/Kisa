export const colors = {
  bg: '#04060c',
  bgElevated: '#080c17',
  card: '#0b1120',
  cardHi: '#101830',
  pill: '#0f1320',
  line: 'rgba(255,255,255,0.10)',
  lineStrong: 'rgba(255,255,255,0.22)',
  text: '#f5f7ff',
  muted: '#8b96b0',
  mutedSoft: '#b4bdd3',
  faint: 'rgba(255,255,255,0.38)',
  blue: '#4c8dff',
  blueBright: '#7aa8ff',
  blueDeep: '#2a4bff',
  blueGlow: 'rgba(76,141,255,0.45)',
  blueDim: 'rgba(76,141,255,0.14)',
  blueBorder: 'rgba(76,141,255,0.45)',
  cyan: '#38bdf8',
  pink: '#f472b6',
  violet: '#a78bfa',
  amber: '#fbbf24',
  orange: '#fb923c',
  gold: '#ffd36d',
  goldDim: 'rgba(255,211,109,0.10)',
  goldBorder: 'rgba(255,211,109,0.35)',
  danger: '#ff6b81',
  white: '#ffffff',
  black: '#000000',
  /** Soft light surface for the one thing that matters on a screen, with ink text on it. */
  paper: '#d9e0ec',
  ink: '#0b1020',
  inkSoft: 'rgba(11,16,32,0.62)',
  inkLine: 'rgba(11,16,32,0.16)',
} as const;

/** Rotating accent colors for option icons, like VS dating's pink/blue gender marks. */
export const iconPalette = [
  colors.blueBright,
  colors.pink,
  colors.cyan,
  colors.amber,
  colors.violet,
  colors.orange,
] as const;

export const gradients = {
  screen: ['#04060c', '#04060c', '#04060c', '#071233'] as const,
  screenLocations: [0, 0.38, 0.72, 1] as const,
  accent: ['#6c9dff', '#3a5bff'] as const,
  card: ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)'] as const,
  cardActive: ['rgba(76,141,255,0.22)', 'rgba(76,141,255,0.06)', 'rgba(76,141,255,0.14)'] as const,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 11,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;
