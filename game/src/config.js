// Every tuning number and colour in one place. The table is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const START_HP = 30;
export const MAX_MANA = 10;
export const HAND_LIMIT = 7;
export const OPENING_HAND = 4;

/** The four schools of the forge. Each card belongs to one; the suit glyph is drawn on the card. */
export const SUITS = {
  ember: { name: 'Ember', color: '#ff6b35', dark: '#a83208', glyph: 'flame' },
  tide: { name: 'Tide', color: '#4fc3f7', dark: '#0d5c86', glyph: 'wave' },
  gale: { name: 'Gale', color: '#7ee081', dark: '#2c6e31', glyph: 'wind' },
  stone: { name: 'Stone', color: '#e0a458', dark: '#7a4d16', glyph: 'mountain' },
};

export const PALETTE = {
  backdrop: '#14100c',
  table: '#1d1710',
  felt: '#23301f',
  feltEdge: '#3a2c1c',
  panel: '#241c13',
  panelEdge: '#4a3823',
  text: '#f5ead6',
  muted: '#b8a888',
  gold: '#f2c94c',
  red: '#e5534b',
  blue: '#4fc3f7',
  green: '#7ee081',
  cardBack: '#5a2d1e',
  cardFace: '#f7ecd7',
  cardInk: '#241a10',
  button: '#8a5a1d',
  buttonEdge: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best result is kept between visits (this browser only). */
export const BEST_KEY = 'emberforge-duel.best';
