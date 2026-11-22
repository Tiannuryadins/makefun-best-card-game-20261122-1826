// Paints the whole table on one canvas: the forge backdrop, both forgers with life bars and
// mana, the two hands, the log, the floating damage numbers, and the title / how-to / pause /
// win / loss screens. All art is drawn with canvas paths — no image files, no network.
import { FIELD, PALETTE, SUITS } from './config.js';
import { cardDef } from './cards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const CARD_W = 148;
const CARD_H = 208;
const HAND_Y = 430;
/** The player's info strip sits below the hand; the AI's block sits at the top. */
const STRIP_Y = 650;

/** Round-rect path helper. */
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = '600') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** A suit glyph drawn at (x, y) with radius r, in `color`. */
function drawGlyph(ctx, glyph, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.lineCap = 'round';
  if (glyph === 'flame') {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.bezierCurveTo(x + r * 0.9, y - r * 0.2, x + r * 0.7, y + r * 0.6, x, y + r * 0.8);
    ctx.bezierCurveTo(x - r * 0.7, y + r * 0.6, x - r * 0.9, y - r * 0.2, x, y - r);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.3);
    ctx.bezierCurveTo(x + r * 0.45, y + r * 0.1, x + r * 0.35, y + r * 0.55, x, y + r * 0.6);
    ctx.bezierCurveTo(x - r * 0.35, y + r * 0.55, x - r * 0.45, y + r * 0.1, x, y - r * 0.3);
    ctx.fill();
  } else if (glyph === 'wave') {
    ctx.beginPath();
    for (let i = 0; i <= 3; i += 1) {
      const yy = y - r * 0.5 + i * r * 0.5;
      ctx.moveTo(x - r, yy);
      ctx.bezierCurveTo(x - r * 0.4, yy - r * 0.35, x - r * 0.1, yy + r * 0.35, x + r * 0.3, yy);
      ctx.bezierCurveTo(x + r * 0.6, yy - r * 0.3, x + r * 0.8, yy + r * 0.2, x + r, yy - r * 0.1);
    }
    ctx.stroke();
  } else if (glyph === 'wind') {
    ctx.beginPath();
    for (let i = 0; i < 3; i += 1) {
      const yy = y - r * 0.55 + i * r * 0.55;
      const len = r * (1.6 - i * 0.3);
      ctx.moveTo(x - len / 2, yy);
      ctx.lineTo(x + len / 2, yy);
      ctx.moveTo(x + len / 2 - r * 0.3, yy - r * 0.25);
      ctx.lineTo(x + len / 2, yy);
      ctx.lineTo(x + len / 2 - r * 0.3, yy + r * 0.25);
    }
    ctx.stroke();
  } else {
    // mountain
    ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.7);
    ctx.lineTo(x - r * 0.25, y - r * 0.8);
    ctx.lineTo(x + r * 0.15, y + r * 0.1);
    ctx.lineTo(x + r * 0.55, y - r * 0.4);
    ctx.lineTo(x + r, y + r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.25, y - r * 0.8);
    ctx.lineTo(x - r * 0.05, y - r * 0.35);
    ctx.lineTo(x - r * 0.45, y - r * 0.35);
    ctx.closePath();
    ctx.fill();
  }
}

/** The procedural illustration on a card face, per art id, inside (x, y, w, h). */
function drawArt(ctx, art, x, y, w, h, suit) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const c = suit.color;
  const d = suit.dark;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, d);
  grad.addColorStop(1, '#241a10');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (art === 'strike' || art === 'hammer') {
    // A swung hammer / blade: handle plus head, with motion arcs.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.6);
    ctx.fillStyle = '#d8c9a8';
    ctx.fillRect(-4, -h * 0.32, 8, h * 0.6);
    ctx.fillStyle = c;
    if (art === 'hammer') ctx.fillRect(-w * 0.32, -h * 0.38, w * 0.64, h * 0.2);
    else {
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.42);
      ctx.lineTo(w * 0.2, -h * 0.05);
      ctx.lineTo(0, h * 0.08);
      ctx.lineTo(-w * 0.2, -h * 0.05);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,210,62,0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.42, -2.4, -0.6);
    ctx.stroke();
  } else if (art === 'burst' || art === 'wildfire') {
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const len = art === 'wildfire' ? h * 0.42 : h * 0.32;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.lineTo(cx + Math.cos(a + 0.35) * len * 0.55, cy + Math.sin(a + 0.35) * len * 0.55);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#ffd23e' : c;
      ctx.fill();
    }
    drawGlyph(ctx, 'flame', cx, cy, h * 0.2, '#ffd23e');
  } else if (art === 'anvil') {
    ctx.fillStyle = '#3a3f4a';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.12, y + h * 0.3);
    ctx.lineTo(x + w * 0.88, y + h * 0.3);
    ctx.lineTo(x + w * 0.78, y + h * 0.48);
    ctx.lineTo(x + w * 0.62, y + h * 0.48);
    ctx.lineTo(x + w * 0.62, y + h * 0.72);
    ctx.lineTo(x + w * 0.38, y + h * 0.72);
    ctx.lineTo(x + w * 0.38, y + h * 0.48);
    ctx.lineTo(x + w * 0.22, y + h * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(cx + w * 0.18, y + h * 0.22, 3, 0, Math.PI * 2);
    ctx.arc(cx - w * 0.05, y + h * 0.12, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (art === 'guard' || art === 'wall') {
    if (art === 'wall') {
      ctx.fillStyle = '#8a6a42';
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          ctx.fillRect(x + w * 0.12 + col * w * 0.26 + (row % 2) * w * 0.06, y + h * 0.18 + row * h * 0.26, w * 0.22, h * 0.2);
        }
      }
    }
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.14);
    ctx.lineTo(cx + w * 0.3, y + h * 0.24);
    ctx.lineTo(cx + w * 0.3, y + h * 0.55);
    ctx.quadraticCurveTo(cx + w * 0.3, y + h * 0.8, cx, y + h * 0.88);
    ctx.quadraticCurveTo(cx - w * 0.3, y + h * 0.8, cx - w * 0.3, y + h * 0.55);
    ctx.lineTo(cx - w * 0.3, y + h * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.12, cy);
    ctx.lineTo(cx, cy + h * 0.12);
    ctx.lineTo(cx + w * 0.12, cy - h * 0.14);
    ctx.stroke();
  } else if (art === 'feather') {
    // A phoenix feather: pointed vane, centre shaft, barb strokes each side.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0.45);
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.36);
    ctx.quadraticCurveTo(w * 0.24, -h * 0.1, w * 0.12, h * 0.3);
    ctx.quadraticCurveTo(0, h * 0.4, -w * 0.12, h * 0.3);
    ctx.quadraticCurveTo(-w * 0.24, -h * 0.1, 0, -h * 0.36);
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.36);
    ctx.lineTo(0, h * 0.44);
    ctx.stroke();
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 3; i += 1) {
      const yy = -h * 0.18 + i * h * 0.14;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w * 0.14, yy + h * 0.07);
      ctx.moveTo(0, yy);
      ctx.lineTo(-w * 0.14, yy + h * 0.07);
      ctx.stroke();
    }
    ctx.restore();
    drawGlyph(ctx, 'flame', cx + w * 0.28, cy - h * 0.28, h * 0.1, c);
  } else if (art === 'kindling') {
    ctx.strokeStyle = '#c9a06a';
    ctx.lineWidth = 5;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx + i * w * 0.16, y + h * 0.78);
      ctx.lineTo(cx + i * w * 0.1, y + h * 0.2);
      ctx.stroke();
    }
    drawGlyph(ctx, 'flame', cx, y + h * 0.22, h * 0.14, '#ffd23e');
  } else if (art === 'bellows') {
    ctx.fillStyle = '#8a5a2a';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.3, cy - h * 0.2);
    ctx.lineTo(cx + w * 0.1, cy - h * 0.2);
    ctx.lineTo(cx + w * 0.34, cy);
    ctx.lineTo(cx + w * 0.1, cy + h * 0.2);
    ctx.lineTo(cx - w * 0.3, cy + h * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8c9a8';
    ctx.fillRect(cx - w * 0.38, cy - h * 0.08, w * 0.1, h * 0.16);
    ctx.fillRect(cx + w * 0.3, cy - h * 0.05, w * 0.16, h * 0.1);
  } else if (art === 'spark') {
    ctx.fillStyle = '#ffd23e';
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * w * 0.36, cy + Math.sin(a) * h * 0.36);
      ctx.lineTo(cx + Math.cos(a + 0.5) * w * 0.12, cy + Math.sin(a + 0.5) * h * 0.12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // quench: droplet and steam
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.16);
    ctx.bezierCurveTo(cx + w * 0.26, y + h * 0.5, cx + w * 0.2, y + h * 0.78, cx, y + h * 0.78);
    ctx.bezierCurveTo(cx - w * 0.2, y + h * 0.78, cx - w * 0.26, y + h * 0.5, cx, y + h * 0.16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,234,214,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.3, y + h * 0.3);
    ctx.quadraticCurveTo(cx - w * 0.36, y + h * 0.15, cx - w * 0.28, y + h * 0.05);
    ctx.moveTo(cx + w * 0.3, y + h * 0.35);
    ctx.quadraticCurveTo(cx + w * 0.38, y + h * 0.2, cx + w * 0.3, y + h * 0.08);
    ctx.stroke();
  }
  ctx.restore();
}

/** One face-up card, drawn at (x, y) with size (w, h). `lift` raises it, `glow` lights it up. */
function drawCard(ctx, def, x, y, w, h, { lift = 0, glow = false, dim = false } = {}) {
  const suit = SUITS[def.suit];
  y -= lift;
  ctx.save();
  if (dim) ctx.globalAlpha = 0.55;
  ctx.shadowColor = glow ? suit.color : 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = glow ? 26 : 12;
  ctx.shadowOffsetY = 6;
  rr(ctx, x, y, w, h, 12);
  ctx.fillStyle = PALETTE.cardFace;
  ctx.fill();
  ctx.restore();
  ctx.save();
  if (dim) ctx.globalAlpha = 0.55;
  rr(ctx, x, y, w, h, 12);
  ctx.strokeStyle = glow ? suit.color : '#8a7a5c';
  ctx.lineWidth = glow ? 3.5 : 1.5;
  ctx.stroke();
  // Suit band across the top.
  rr(ctx, x + 4, y + 4, w - 8, 30, 8);
  ctx.fillStyle = suit.color;
  ctx.fill();
  text(ctx, suit.name.toUpperCase(), x + w / 2, y + 20, 13, '#ffffff', 'center', '700');
  // Mana cost gem, top left.
  ctx.beginPath();
  ctx.arc(x + 20, y + 52, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#2b6cb0';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, String(def.cost), x + 20, y + 53, 17, '#ffffff', 'center', '800');
  // Suit glyph, top right.
  drawGlyph(ctx, suit.glyph, x + w - 22, y + 52, 11, suit.dark);
  // Art panel.
  drawArt(ctx, def.art, x + 10, y + 72, w - 20, h - 130, suit);
  // Name.
  text(ctx, def.name, x + w / 2, y + h - 40, 14, PALETTE.cardInk, 'center', '700');
  // Effect text, wrapped to two lines.
  ctx.fillStyle = PALETTE.cardInk;
  ctx.font = '500 12.5px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = def.text.split(' ');
  const lines = [''];
  for (const word of words) {
    const test = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
    if (ctx.measureText(test).width > w - 18 && lines[lines.length - 1]) lines.push(word);
    else lines[lines.length - 1] = test;
  }
  lines.slice(0, 2).forEach((line, i) => ctx.fillText(line, x + w / 2, y + h - 22 + i * 15));
  ctx.restore();
}

/** A face-down card back, small, at (x, y) with size (w, h). */
function drawCardBack(ctx, x, y, w, h) {
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = PALETTE.cardBack;
  ctx.fill();
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawGlyph(ctx, 'flame', x + w / 2, y + h / 2, Math.min(w, h) * 0.24, '#f2c94c');
}

/** A forger portrait: a hooded figure in a circle, `foe` gives Cinder the ash look. */
function drawPortrait(ctx, x, y, r, foe, t) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  const grad = ctx.createLinearGradient(x, y - r, x, y + r);
  grad.addColorStop(0, foe ? '#3a1c10' : '#4a2c14');
  grad.addColorStop(1, foe ? '#120a06' : '#241a10');
  ctx.fillStyle = grad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // Hood.
  ctx.fillStyle = foe ? '#241207' : '#5a3a1c';
  ctx.beginPath();
  ctx.arc(x, y - r * 0.1, r * 0.72, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.72, y - r * 0.1);
  ctx.quadraticCurveTo(x - r * 0.85, y + r * 0.7, x - r * 0.4, y + r * 0.75);
  ctx.lineTo(x + r * 0.4, y + r * 0.75);
  ctx.quadraticCurveTo(x + r * 0.85, y + r * 0.7, x + r * 0.72, y - r * 0.1);
  ctx.closePath();
  ctx.fill();
  // Face shadow and glowing eyes.
  ctx.fillStyle = '#120a06';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.05, r * 0.42, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  const glow = foe ? '#ff6b35' : '#ffd23e';
  const blink = Math.sin(t * 2.2) > -0.92 ? 1 : 0.15;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.18, y + r * 0.02, r * 0.07, r * 0.05 * blink + 0.5, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.18, y + r * 0.02, r * 0.07, r * 0.05 * blink + 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Beard for the player, ash streaks for Cinder.
  if (!foe) {
    ctx.fillStyle = '#c9a06a';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, y + r * 0.2);
    ctx.quadraticCurveTo(x, y + r * 0.85, x + r * 0.3, y + r * 0.2);
    ctx.quadraticCurveTo(x, y + r * 0.42, x - r * 0.3, y + r * 0.2);
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,107,53,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, y + r * 0.5);
    ctx.lineTo(x - r * 0.1, y + r * 0.3);
    ctx.moveTo(x + r * 0.25, y + r * 0.55);
    ctx.lineTo(x + r * 0.1, y + r * 0.32);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = foe ? '#ff6b35' : '#f2c94c';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawHpBar(ctx, x, y, w, h, hp, maxHp, shield) {
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = '#120d08';
  ctx.fill();
  const frac = Math.max(0, hp / maxHp);
  if (frac > 0) {
    rr(ctx, x + 2, y + 2, (w - 4) * frac, h - 4, (h - 4) / 2);
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#e5534b');
    grad.addColorStop(1, '#ff8a5c');
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.strokeStyle = '#4a3823';
  ctx.lineWidth = 1.5;
  rr(ctx, x, y, w, h, h / 2);
  ctx.stroke();
  text(ctx, `${hp} / ${maxHp}`, x + w / 2 - (shield > 0 ? 18 : 0), y + h / 2 + 1, 14, '#ffffff', 'center', '700');
  if (shield > 0) {
    // Shield lives inside the bar's right end, so it never covers a card.
    ctx.save();
    ctx.translate(x + w - 48, y + h / 2);
    ctx.fillStyle = '#2b6cb0';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(8, -5);
    ctx.lineTo(8, 2);
    ctx.quadraticCurveTo(8, 8, 0, 11);
    ctx.quadraticCurveTo(-8, 8, -8, 2);
    ctx.lineTo(-8, -5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    text(ctx, String(shield), x + w - 36, y + h / 2 + 1, 13, '#ffffff', 'left', '800');
  }
}

/** Mana crystals: filled gems for current mana, hollow for the rest of the cap. */
function drawMana(ctx, x, y, mana, maxMana, size = 13) {
  for (let i = 0; i < maxMana; i += 1) {
    const cx = x + i * (size * 2 + 6);
    ctx.beginPath();
    ctx.moveTo(cx, y - size);
    ctx.lineTo(cx + size, y);
    ctx.lineTo(cx, y + size);
    ctx.lineTo(cx - size, y);
    ctx.closePath();
    if (i < mana) {
      ctx.fillStyle = '#4fc3f7';
      ctx.fill();
      ctx.strokeStyle = '#bfe9ff';
    } else {
      ctx.fillStyle = '#1d1710';
      ctx.fill();
      ctx.strokeStyle = '#4a3823';
    }
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  text(ctx, `${mana}/${maxMana} mana`, x, y + size + 14, 11, PALETTE.muted, 'left', '600');
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const fx = [];
  let shake = 0;
  let time = 0;

  function resize() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = Math.round(FIELD.width * scale * window.devicePixelRatio);
    canvas.height = Math.round(FIELD.height * scale * window.devicePixelRatio);
    canvas.style.width = `${Math.round(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.round(FIELD.height * scale)}px`;
  }
  resize();
  window.addEventListener('resize', resize);

  /** Logical (1280x720) coordinates of a point given in CSS pixels. */
  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * FIELD.width,
      y: ((clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  /** The on-screen rectangles of the player's hand, in logical coordinates. */
  function handRects(hand, hoverIndex) {
    const rects = [];
    const gap = 12;
    const total = hand.length * CARD_W + (hand.length - 1) * gap;
    let x = (FIELD.width - total) / 2;
    for (let i = 0; i < hand.length; i += 1) {
      const lift = i === hoverIndex ? 26 : 0;
      rects.push({ x, y: HAND_Y - lift, w: CARD_W, h: CARD_H, index: i });
      x += CARD_W + gap;
    }
    return rects;
  }

  const endTurnRect = { x: 1072, y: 348, w: 184, h: 52 };
  const helpRect = { x: 1072, y: 290, w: 184, h: 44 };

  function update(dt, frozenTime) {
    time = frozenTime !== undefined ? frozenTime : time + dt;
    if (shake > 0) shake = Math.max(0, shake - dt * 26);
    for (let i = fx.length - 1; i >= 0; i -= 1) {
      fx[i].t += dt;
      if (fx[i].t > fx[i].life) fx.splice(i, 1);
    }
  }

  function floatText(x, y, str, color) {
    fx.push({ kind: 'float', x, y, str, color, t: 0, life: 1.3 });
  }

  function playAnim(def, side) {
    fx.push({ kind: 'play', def, side, t: 0, life: 0.9 });
  }

  function addShake(amount) {
    shake = Math.max(shake, amount);
  }

  function drawBackdrop() {
    const grad = ctx.createRadialGradient(640, 300, 80, 640, 360, 760);
    grad.addColorStop(0, '#2a1c10');
    grad.addColorStop(0.55, PALETTE.table);
    grad.addColorStop(1, PALETTE.backdrop);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Felt table.
    rr(ctx, 12, 148, FIELD.width - 24, 272, 18);
    ctx.fillStyle = PALETTE.felt;
    ctx.fill();
    ctx.strokeStyle = PALETTE.feltEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    // A faint anvil watermark in the middle of the felt.
    ctx.save();
    ctx.globalAlpha = 0.12;
    drawArt(ctx, 'anvil', 560, 220, 160, 130, SUITS.stone);
    ctx.restore();
    // Rising embers, seeded positions so a frozen time is deterministic.
    for (let i = 0; i < 42; i += 1) {
      const seed = i * 97.13;
      const speed = 12 + (i % 5) * 7;
      const yy = FIELD.height - ((seed * 13 + time * speed) % (FIELD.height + 40)) + 20;
      const xx = (seed * 37) % FIELD.width + Math.sin(time * 0.7 + i) * 12;
      ctx.fillStyle = `rgba(255,${140 + (i % 3) * 30},40,${0.25 + (i % 4) * 0.12})`;
      ctx.beginPath();
      ctx.arc(xx, yy, 1.5 + (i % 3) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFighter(state, side, isPlayer, t) {
    if (isPlayer) {
      // The player's strip lives below the hand, clear of every card.
      const portraitX = 54;
      const portraitY = STRIP_Y + 32;
      drawPortrait(ctx, portraitX, portraitY, 30, false, t);
      text(ctx, 'YOU — THE EMBERFORGER', 96, STRIP_Y + 12, 16, PALETTE.text, 'left', '700');
      drawHpBar(ctx, 96, STRIP_Y + 24, 360, 20, side.hp, side.maxHp, side.shield);
      drawMana(ctx, 490, STRIP_Y + 32, side.mana, Math.max(1, side.maxMana), 11);
      text(ctx, `Deck ${side.deck.length}  •  Discard ${side.discard.length}`, 800, STRIP_Y + 32, 12, PALETTE.muted, 'left', '500');
      return;
    }
    const top = 16;
    const portraitX = 72;
    const portraitY = top + 48;
    drawPortrait(ctx, portraitX, portraitY, 44, true, t);
    const name = 'CINDER — THE ASH WARDEN';
    text(ctx, name, 132, top + 18, 17, '#ffb59e', 'left', '700');
    drawHpBar(ctx, 132, top + 34, 420, 24, side.hp, side.maxHp, side.shield);
    drawMana(ctx, 132, top + 86, side.mana, Math.max(1, side.maxMana), 11);
    text(ctx, `Deck ${side.deck.length}  •  Discard ${side.discard.length}`, 600, top + 86, 12, PALETTE.muted, 'left', '500');
    // Opponent's hand, face down.
    const n = side.hand.length;
    for (let i = 0; i < n; i += 1) {
      drawCardBack(ctx, 1000 + i * 34, top + 8, 46, 64);
    }
    text(ctx, `${n} cards`, 1000 + n * 34 + 8, top + 40, 12, PALETTE.muted, 'left', '500');
  }

  function drawLog(state) {
    rr(ctx, 24, 168, 300, 150, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(ctx, 'FORGE LOG', 40, 188, 12, PALETTE.gold, 'left', '700');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '500 12.5px system-ui, -apple-system, "Segoe UI", sans-serif';
    state.log.slice(-5).forEach((line, i) => {
      ctx.fillStyle = i === state.log.slice(-5).length - 1 ? PALETTE.text : PALETTE.muted;
      ctx.fillText(line.length > 44 ? `${line.slice(0, 43)}…` : line, 40, 206 + i * 22, 272);
    });
  }

  function drawTurnBanner(state, screen, ui) {
    if (screen !== SCREEN_PLAY || ui.hideBanner) return;
    const label = state.active === 'player' ? 'YOUR TURN' : "CINDER'S TURN";
    const color = state.active === 'player' ? PALETTE.gold : '#ff8a5c';
    rr(ctx, 560, 160, 160, 34, 17);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(ctx, label, 640, 178, 14, color, 'center', '800');
    text(ctx, `Turn ${state.turn}`, 640, 212, 12, PALETTE.muted, 'center', '600');
  }

  function drawFx() {
    for (const item of fx) {
      const p = item.t / item.life;
      if (item.kind === 'float') {
        ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
        text(ctx, item.str, item.x, item.y - p * 46, 26 + (p < 0.15 ? 6 : 0), item.color, 'center', '800');
        ctx.globalAlpha = 1;
      } else if (item.kind === 'play') {
        const scale = p < 0.25 ? 0.7 + p * 1.6 : 1.3 - (p - 0.25) * 0.45;
        const w = CARD_W * 1.25 * scale;
        const h = CARD_H * 1.25 * scale;
        ctx.globalAlpha = p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1;
        drawCard(ctx, item.def, 640 - w / 2, 250 - h / 2, w, h, {});
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawTable(state, ui) {
    drawBackdrop();
    drawFighter(state, state.ai, false, time);
    drawLog(state);
    drawTurnBanner(state, SCREEN_PLAY, ui);
    // End Turn + Help buttons.
    const canEnd = state.active === 'player' && !state.over;
    rr(ctx, endTurnRect.x, endTurnRect.y, endTurnRect.w, endTurnRect.h, 12);
    ctx.fillStyle = canEnd ? PALETTE.button : '#3a2c1c';
    ctx.fill();
    ctx.strokeStyle = canEnd ? PALETTE.buttonEdge : '#5a4a33';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, 'END TURN  ⏎', endTurnRect.x + endTurnRect.w / 2, endTurnRect.y + 27, 16, canEnd ? '#ffffff' : PALETTE.muted, 'center', '700');
    rr(ctx, helpRect.x, helpRect.y, helpRect.w, helpRect.h, 10);
    ctx.fillStyle = '#241c13';
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(ctx, 'HOW TO PLAY  (H)', helpRect.x + helpRect.w / 2, helpRect.y + 23, 13, PALETTE.text, 'center', '600');
    // Player's hand.
    const rects = handRects(state.player.hand, ui.hoverCard);
    state.player.hand.forEach((id, i) => {
      const def = cardDef(id);
      const rect = rects[i];
      const playable = def.cost <= state.player.mana && state.active === 'player' && !state.over;
      drawCard(ctx, def, rect.x, rect.y, rect.w, rect.h, { lift: 0, glow: playable && i === ui.hoverCard, dim: !playable });
    });
    drawFighter(state, state.player, true, time);
    if (!ui.hideFx) drawFx();
    if (ui.showHowto) drawHowto();
  }

  function drawHowto() {
    ctx.fillStyle = 'rgba(10,6,3,0.82)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    rr(ctx, 340, 110, 600, 500, 16);
    ctx.fillStyle = '#241c13';
    ctx.fill();
    ctx.strokeStyle = PALETTE.buttonEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, 'HOW TO PLAY', 640, 150, 26, PALETTE.gold, 'center', '800');
    const lines = [
      'You and Cinder each start with 30 life.',
      'Each turn you gain 1 mana crystal (up to 10)',
      'and draw a card. Mana refills every turn.',
      '',
      'Click a glowing card — or press 1–7 — to play it.',
      'Attack cards damage Cinder through her shield.',
      'Shield cards block damage. Heal restores life.',
      'Kindling draws cards; Bellows gives extra mana.',
      '',
      'End your turn (button or Enter) and Cinder plays.',
      'Reduce Cinder to 0 life to win the forge.',
      'If your life hits 0, the forge is hers.',
      '',
      'P pauses · M mutes sound · H closes this panel.',
    ];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 15px system-ui, -apple-system, "Segoe UI", sans-serif';
    lines.forEach((line, i) => {
      ctx.fillStyle = line === '' ? PALETTE.text : PALETTE.text;
      ctx.fillText(line, 640, 190 + i * 26);
    });
    text(ctx, 'Press H or click anywhere to continue', 640, 572, 13, PALETTE.muted, 'center', '600');
  }

  function drawTitle(state, ui) {
    drawBackdrop();
    // Decorative cards flank the title at the sides, clear of every line of text.
    ctx.save();
    ctx.translate(150, 330);
    ctx.rotate(-0.14);
    drawCard(ctx, cardDef('wildfire'), -66, -94, CARD_W * 0.9, CARD_H * 0.9, {});
    ctx.restore();
    ctx.save();
    ctx.translate(1130, 330);
    ctx.rotate(0.14);
    drawCard(ctx, cardDef('moltenWall'), -66, -94, CARD_W * 0.9, CARD_H * 0.9, {});
    ctx.restore();
    text(ctx, 'EMBERFORGE', 640, 190, 84, PALETTE.gold, 'center', '800');
    text(ctx, 'D U E L', 640, 262, 44, '#ff8a5c', 'center', '800');
    text(ctx, 'A duel of cards at the forge — outplay Cinder, the Ash Warden,', 640, 330, 18, PALETTE.text, 'center', '500');
    text(ctx, 'before your flame gutters out.', 640, 356, 18, PALETTE.text, 'center', '500');
    const pulse = 0.65 + Math.sin(time * 3) * 0.35;
    ctx.globalAlpha = pulse;
    text(ctx, 'CLICK OR PRESS ENTER TO PLAY', 640, 430, 22, '#ffffff', 'center', '800');
    ctx.globalAlpha = 1;
    text(ctx, 'Press H for how to play  •  30 life each  •  mana grows every turn', 640, 470, 14, PALETTE.muted, 'center', '500');
    if (ui.best) text(ctx, `Best result: ${ui.best}`, 640, 505, 14, PALETTE.gold, 'center', '600');
    text(ctx, 'An original card game — no copied cards, art or music.', 640, 640, 12, PALETTE.muted, 'center', '500');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(10,6,3,0.75)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'PAUSED', 640, 330, 56, PALETTE.text, 'center', '800');
    text(ctx, 'Press P or Enter to resume', 640, 390, 18, PALETTE.muted, 'center', '500');
  }

  function drawOver(state, ui) {
    drawTable(state, { ...ui, showHowto: false, hideBanner: true, hideFx: true });
    ctx.fillStyle = 'rgba(10,6,3,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const won = state.winner === 'player';
    text(ctx, won ? 'VICTORY' : 'DEFEAT', 640, 240, 72, won ? PALETTE.gold : '#e5534b', 'center', '800');
    text(ctx, won ? 'Cinder falls. The forge is yours!' : 'Your flame gutters out. Cinder claims the forge.', 640, 310, 20, PALETTE.text, 'center', '500');
    text(ctx, `Turns played: ${state.turn}    Cards played: ${ui.stats.cardsPlayed}    Damage dealt: ${ui.stats.damageDealt}`, 640, 360, 16, PALETTE.muted, 'center', '600');
    text(ctx, `Your life left: ${state.player.hp}    Cinder's life left: ${state.ai.hp}`, 640, 392, 16, PALETTE.muted, 'center', '600');
    const pulse = 0.65 + Math.sin(time * 3) * 0.35;
    ctx.globalAlpha = pulse;
    text(ctx, 'PRESS ENTER TO PLAY AGAIN', 640, 460, 22, '#ffffff', 'center', '800');
    ctx.globalAlpha = 1;
  }

  function draw(state, screen, ui) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.scale(scale, scale);
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, ui);
    else if (screen === SCREEN_OVER) drawOver(state, ui);
    else {
      drawTable(state, ui);
      if (screen === SCREEN_PAUSED) drawPaused();
    }
  }

  return {
    draw, update, toLogical, handRects, floatText, playAnim, addShake,
    endTurnRect, helpRect,
    /** Logical width of the canvas backing store, for tests. */
    get width() { return FIELD.width; },
    get height() { return FIELD.height; },
  };
}
