// Keyboard and pointer input. Held keys give nothing here — the game is click-and-key
// driven — so this module queues one-shot presses (confirm, pause, mute, help, play card
// 1–7, end turn) as bit flags the loop takes once, so a press between two frames is never
// lost and never counted twice. Pointer moves report the logical position for card hover.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_HELP = 8;
export const ACTION_END_TURN = 16;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const HELP = new Set(['KeyH']);

export function createInput(target, toLogical) {
  let actions = 0;
  let cardKey = -1;
  let pointer = { x: -1, y: -1, clicked: false, clickX: 0, clickY: 0 };

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (HELP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_HELP;
    } else if (event.code.startsWith('Digit')) {
      const n = Number(event.code.slice(5));
      if (n >= 1 && n <= 7 && !event.repeat) cardKey = n - 1;
    } else return;
    event.preventDefault();
  });

  target.addEventListener('pointermove', (event) => {
    const p = toLogical(event.clientX, event.clientY);
    pointer = { ...pointer, x: p.x, y: p.y };
  });
  target.addEventListener('pointerdown', (event) => {
    const p = toLogical(event.clientX, event.clientY);
    pointer = { ...pointer, x: p.x, y: p.y, clicked: true, clickX: p.x, clickY: p.y };
  });

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeCardKey() {
      const taken = cardKey;
      cardKey = -1;
      return taken;
    },
    takeClick() {
      if (!pointer.clicked) return null;
      pointer = { ...pointer, clicked: false };
      return { x: pointer.clickX, y: pointer.clickY };
    },
    pointer() {
      return { x: pointer.x, y: pointer.y };
    },
  };
}
