// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps, and the renderer paints what is there. The game moves between four screens:
// title, play, paused and game over. Cinder's turn is paced one card per beat so each of
// her cards is seen being played.
//
// ?seed=N fixes the deck order. ?shot=title|table|win|loss (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
// ?selftest=1 plays 200 full games in logic only and reports the outcome in
// window.__selftest — no rendering, no sound.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_DAMAGE, EVENT_HEAL, EVENT_OVER, EVENT_PLAY, EVENT_SHIELD } from './world.js';
import {
  ACTION_CONFIRM, ACTION_END_TURN, ACTION_HELP, ACTION_MUTE, ACTION_PAUSE, createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { cardDef } from './cards.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;
/** Seconds between Cinder's cards, so her turn is watchable. */
const AI_BEAT = 0.75;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const selftest = params.get('selftest') === '1';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

/** Self-test: 200 full games, both sides on autopilot, reported for the test harness. */
function runSelfTest() {
  const { createWorld: makeWorld } = { createWorld };
  let wins = 0;
  let losses = 0;
  let longest = 0;
  let totalTurns = 0;
  for (let g = 0; g < 200; g += 1) {
    const w = makeWorld(createRandom(1000 + g));
    w.reset();
    let guard = 0;
    while (!w.state.over && guard < 500) {
      guard += 1;
      // Player: play the first playable card, then end the turn.
      let played = true;
      while (played && !w.state.over) {
        played = false;
        for (let i = 0; i < w.state.player.hand.length; i += 1) {
          if (w.playable(w.state.player, i)) {
            w.playCard(w.state.player, i);
            played = true;
            break;
          }
        }
      }
      if (w.state.over) break;
      w.endPlayerTurn();
      while (!w.state.over && !w.aiDone()) w.aiPlayOne();
      if (w.state.over) break;
      w.state.active = 'player';
      w.startTurn(w.state.player);
    }
    totalTurns += w.state.turn;
    longest = Math.max(longest, w.state.turn);
    if (w.state.winner === 'player') wins += 1;
    else if (w.state.winner === 'ai') losses += 1;
  }
  window.__selftest = {
    games: 200, wins, losses, draws: 200 - wins - losses,
    avgTurns: Math.round((totalTurns / 200) * 10) / 10, longest,
  };
  document.title = `selftest wins=${wins} losses=${losses}`;
}

function readBest() {
  try {
    return window.localStorage.getItem(BEST_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, value);
  } catch {
    // Storage can be off (private windows): the best result then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.update(0, 4.2);
    renderer.draw(world.state, scene.screen, {
      hoverCard: -1, showHowto: false, best: readBest(), stats: world.stats,
    });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, renderer.toLogical);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let showHowto = false;
  let hoverCard = -1;
  let accumulator = 0;
  let last = performance.now();
  let aiTimer = 0;
  let aiWaiting = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    aiWaiting = false;
    screen = SCREEN_PLAY;
    showHowto = false;
    audio.unlock();
    announce('Playing. Your turn — play a card or end your turn.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    const result = world.state.winner === 'player'
      ? `Victory in ${world.stats.turns} turns`
      : `Defeat in ${world.stats.turns} turns`;
    if (result !== best) {
      best = result;
      saveBest(best);
    }
    if (world.state.winner === 'player') audio.win();
    else audio.lose();
    announce(`Game over. ${result}.`);
  }

  /** Turn the world's queued events into floating numbers, sounds and shakes. */
  function consumeEvents() {
    for (const event of world.events) {
      if (event.type === EVENT_PLAY) {
        renderer.playAnim(event.def, event.side);
        audio.playCard();
      } else if (event.type === EVENT_DAMAGE) {
        const target = event.side === 'player'
          ? { x: 340, y: 600 } : { x: 340, y: 60 };
        renderer.floatText(target.x, target.y, `-${event.amount}`, '#ff6b5e');
        renderer.addShake(event.amount >= 7 ? 10 : 5);
        audio.damage(event.amount >= 7);
      } else if (event.type === EVENT_HEAL) {
        const target = event.side === 'player' ? { x: 340, y: 600 } : { x: 340, y: 60 };
        renderer.floatText(target.x, target.y, `+${event.amount}`, '#7ee081');
        audio.heal();
      } else if (event.type === EVENT_SHIELD) {
        const target = event.side === 'player' ? { x: 340, y: 600 } : { x: 340, y: 60 };
        renderer.floatText(target.x, target.y, `+${event.amount} shield`, '#4fc3f7');
        audio.shield();
      } else if (event.type === EVENT_OVER) {
        endGame();
      }
    }
    world.events = [];
  }

  function endPlayerTurn() {
    if (!world.endPlayerTurn()) return;
    audio.turn();
    aiWaiting = true;
    aiTimer = AI_BEAT;
    announce("Cinder's turn.");
  }

  /** One beat of Cinder's turn: play a card, or hand the table back when she is done. */
  function aiBeat() {
    if (world.state.over) {
      consumeEvents();
      return;
    }
    if (!world.aiPlayOne() || world.aiDone()) {
      aiWaiting = false;
      const state = world.state;
      if (!state.over) {
        state.active = 'player';
        world.startTurn(state.player);
        announce('Your turn.');
      }
    }
    consumeEvents();
  }

  function cardAt(point) {
    const rects = renderer.handRects(world.state.player.hand, -1);
    for (let i = rects.length - 1; i >= 0; i -= 1) {
      const r = rects[i];
      const lift = i === hoverCard ? 26 : 0;
      if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y - lift && point.y <= r.y - lift + r.h) return i;
    }
    return -1;
  }

  function inRect(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_HELP) {
      if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) showHowto = !showHowto;
      return;
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (showHowto) {
        showHowto = false;
        return;
      }
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      else if (screen === SCREEN_PLAY && world.state.active === 'player' && !aiWaiting) endPlayerTurn();
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_END_TURN && screen === SCREEN_PLAY) endPlayerTurn();
  }

  function handlePointer() {
    const click = input.takeClick();
    const p = input.pointer();
    if (screen === SCREEN_PLAY && !world.state.over) {
      hoverCard = p.x >= 0 ? cardAt(p) : -1;
      if (click) {
        audio.unlock();
        if (showHowto) {
          showHowto = false;
          return;
        }
        if (inRect(click, renderer.helpRect)) {
          showHowto = true;
          return;
        }
        if (inRect(click, renderer.endTurnRect)) {
          if (world.state.active === 'player' && !aiWaiting) endPlayerTurn();
          return;
        }
        const index = cardAt(click);
        if (index >= 0 && world.state.active === 'player' && !aiWaiting) {
          const def = cardDef(world.state.player.hand[index]);
          if (world.playCard(world.state.player, index)) {
            consumeEvents();
            announce(`Played ${def.name}.`);
          }
        }
      }
    } else if (click) {
      audio.unlock();
      if (showHowto) showHowto = false;
      else if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    const key = input.takeCardKey();
    if (key >= 0 && screen === SCREEN_PLAY && world.state.active === 'player' && !aiWaiting && !world.state.over) {
      if (world.playCard(world.state.player, key)) consumeEvents();
    }
  }

  function step() {
    if (aiWaiting) {
      aiTimer -= STEP;
      if (aiTimer <= 0) {
        aiTimer = AI_BEAT;
        aiBeat();
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handlePointer();
    while (accumulator >= STEP && (screen === SCREEN_PLAY || screen === SCREEN_TITLE)) {
      step();
      accumulator -= STEP;
      renderer.update(STEP);
    }
    if (screen === SCREEN_PAUSED) renderer.update(0);
    renderer.draw(world.state, screen, {
      hoverCard, showHowto, best, stats: world.stats,
    });
  }

  // Leaving the tab pauses a running game rather than letting Cinder play unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // Test hook: the play-test driver reads state and hand rectangles through this.
  window.__ember = {
    state: () => world.state,
    stats: () => world.stats,
    screen: () => screen,
    handRects: () => renderer.handRects(world.state.player.hand, hoverCard),
    endTurnRect: () => renderer.endTurnRect,
    canvasRect: () => canvas.getBoundingClientRect(),
  };

  announce('Emberforge Duel. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (selftest) runSelfTest();
else if (shot) runShot(shot);
else runGame();
