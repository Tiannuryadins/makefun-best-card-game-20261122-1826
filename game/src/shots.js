// The screenshot scenes behind ?shot=title|table|win|loss. Each one plays the real rules
// forward from a fresh world, steered by a simple autopilot, so the frame is what a real
// game looks like and the same seed always gives the same frame. The win scene's pilot plays
// hard and Cinder plays weakly; the loss scene's pilot passes while Cinder plays hard.
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { cardDef } from './cards.js';

/** The best card the autopilot can play for `side`, by the world's own AI scoring. */
function bestCardFor(world, side) {
  const state = world.state;
  const foe = side === state.player ? state.ai : state.player;
  let bestIndex = -1;
  let bestScore = 1.5;
  for (let i = 0; i < side.hand.length; i += 1) {
    const def = cardDef(side.hand[i]);
    if (def.cost > side.mana) continue;
    let score = 0;
    if (def.damage) score += def.damage * 2 + (def.damage >= foe.hp + foe.shield ? 100 : 0);
    if (def.shield) score += side.hp <= 12 ? def.shield * 2 : def.shield;
    if (def.heal) score += side.hp <= 18 ? def.heal * 2 : def.heal * 0.4;
    if (def.draw) score += side.hand.length <= 3 ? 6 : 2;
    if (def.mana) score += 3;
    score -= def.cost * 0.5;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/** Play one full player turn with the autopilot, then hand over to Cinder. */
function autopilotTurn(world, strong) {
  const state = world.state;
  if (state.over) return;
  if (strong) {
    let idx = bestCardFor(world, state.player);
    while (idx >= 0 && !state.over) {
      world.playCard(state.player, idx);
      idx = bestCardFor(world, state.player);
    }
  }
  if (state.over) return;
  world.endPlayerTurn();
  if (strong) {
    // Weak Cinder: one card at most, then done.
    world.aiPlayOne();
  } else {
    while (!state.over && !world.aiDone()) world.aiPlayOne();
  }
  if (state.over) return;
  state.active = 'player';
  world.startTurn(state.player);
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * title: a fresh table behind the title screen.
 * table: a mid-game table after several real turns.
 * win: a real game the player wins.
 * loss: a real game the player loses.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name === 'title' || !name) return { screen: SCREEN_TITLE };
  const limit = 400;
  if (name === 'table') {
    for (let i = 0; i < 6 && !state.over; i += 1) autopilotTurn(world, true);
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY };
  }
  if (name === 'win') {
    for (let i = 0; i < limit && !state.over; i += 1) autopilotTurn(world, true);
    return { screen: SCREEN_OVER };
  }
  // loss: the player passes every turn while Cinder plays hard.
  for (let i = 0; i < limit && !state.over; i += 1) {
    world.endPlayerTurn();
    while (!state.over && !world.aiDone()) world.aiPlayOne();
    if (state.over) break;
    state.active = 'player';
    world.startTurn(state.player);
  }
  return { screen: SCREEN_OVER };
}

export { EVENT_OVER };
