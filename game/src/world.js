// The duel itself: two ember-forgers, each with life, shield, mana, a deck, a hand and a
// discard pile. Pure logic — no DOM, no canvas — so a test can import it in Node and play
// whole games. The renderer and the main loop only read `state` and listen to `events`.
import { HAND_LIMIT, MAX_MANA, OPENING_HAND, START_HP } from './config.js';
import { buildDeck, cardDef } from './cards.js';

export const EVENT_PLAY = 1;
export const EVENT_DAMAGE = 2;
export const EVENT_HEAL = 4;
export const EVENT_SHIELD = 8;
export const EVENT_DRAW = 16;
export const EVENT_TURN = 32;
export const EVENT_OVER = 64;

function makeSide(random, name) {
  return {
    name,
    hp: START_HP,
    maxHp: START_HP,
    shield: 0,
    mana: 0,
    maxMana: 0,
    deck: buildDeck(random),
    hand: [],
    discard: [],
  };
}

export function createWorld(random) {
  const world = {
    random,
    state: null,
    /** The last play's events, for the renderer and sound, in order. Cleared each step. */
    events: [],
    /** The card just played, for the play animation: { side, def, handIndex }. */
    lastPlay: null,
    /** Running counts for the end screens. */
    stats: { turns: 0, cardsPlayed: 0, damageDealt: 0 },
    reset,
    startTurn,
    playCard,
    playable,
    endPlayerTurn,
    aiPlayOne,
    aiDone,
  };

  function reset() {
    world.state = {
      turn: 1,
      active: 'player',
      over: false,
      winner: null,
      player: makeSide(random, 'You — the Emberforger'),
      ai: makeSide(random, 'Cinder, the Ash Warden'),
      log: ['The forge is lit. The duel begins.'],
    };
    world.events = [];
    world.lastPlay = null;
    world.stats = { turns: 0, cardsPlayed: 0, damageDealt: 0 };
    drawCards(world.state.player, OPENING_HAND);
    drawCards(world.state.ai, OPENING_HAND);
    startTurn(world.state.player);
    log('Your turn — draw, play cards, then end your turn.');
  }

  function log(message) {
    const lines = world.state.log;
    lines.push(message);
    if (lines.length > 6) lines.shift();
  }

  /** Draw `n` cards, reshuffling the discard pile when the deck runs dry. */
  function drawCards(side, n) {
    for (let i = 0; i < n; i += 1) {
      if (side.deck.length === 0) {
        if (side.discard.length === 0) return;
        side.deck = side.discard;
        side.discard = [];
        // Reshuffle with the seeded generator.
        for (let j = side.deck.length - 1; j > 0; j -= 1) {
          const k = Math.floor(random() * (j + 1));
          const tmp = side.deck[j];
          side.deck[j] = side.deck[k];
          side.deck[k] = tmp;
        }
        log(`${side.name === world.state.player.name ? 'You' : 'Cinder'} reshuffle${side.name === world.state.player.name ? '' : 's'} the discard pile into a new deck.`);
      }
      if (side.hand.length >= HAND_LIMIT) {
        side.discard.push(side.deck.pop());
        continue;
      }
      side.hand.push(side.deck.pop());
    }
  }

  /** Open a side's turn: one more mana crystal (up to the cap), mana refills, draw a card. */
  function startTurn(side) {
    side.maxMana = Math.min(MAX_MANA, side.maxMana + 1);
    side.mana = side.maxMana;
    drawCards(side, 1);
  }

  function other(side) {
    return side === world.state.player ? world.state.ai : world.state.player;
  }

  function sideLabel(side) {
    return side === world.state.player ? 'You' : 'Cinder';
  }

  /** Deal damage through shield first; returns the life lost. */
  function dealDamage(target, amount) {
    const blocked = Math.min(target.shield, amount);
    target.shield -= blocked;
    const through = amount - blocked;
    target.hp = Math.max(0, target.hp - through);
    return { blocked, through };
  }

  /** Whether the card at `handIndex` can be played right now. */
  function playable(side, handIndex) {
    if (world.state.over || world.state.active !== (side === world.state.player ? 'player' : 'ai')) return false;
    const id = side.hand[handIndex];
    if (id === undefined) return false;
    return cardDef(id).cost <= side.mana;
  }

  /**
   * Play the card at `handIndex` from `side`'s hand. Returns false when it cannot be played.
   * Applies every part of the effect, records events for the renderer, and ends the duel when
   * a life total hits zero.
   */
  function playCard(side, handIndex) {
    if (!playable(side, handIndex)) return false;
    const id = side.hand[handIndex];
    const def = cardDef(id);
    const foe = other(side);
    side.mana -= def.cost;
    side.hand.splice(handIndex, 1);
    side.discard.push(id);
    world.lastPlay = { side: side === world.state.player ? 'player' : 'ai', def };
    world.stats.cardsPlayed += 1;
    world.events.push({ type: EVENT_PLAY, side: side === world.state.player ? 'player' : 'ai', def });
    if (def.damage) {
      const { blocked, through } = dealDamage(foe, def.damage);
      world.events.push({ type: EVENT_DAMAGE, side: foe === world.state.player ? 'player' : 'ai', amount: def.damage, blocked, through });
      if (side === world.state.player) world.stats.damageDealt += through;
      log(`${sideLabel(side)} ${def.name} — ${def.damage} damage${blocked ? ` (${blocked} blocked)` : ''}.`);
    }
    if (def.shield) {
      side.shield += def.shield;
      world.events.push({ type: EVENT_SHIELD, side: side === world.state.player ? 'player' : 'ai', amount: def.shield });
      log(`${sideLabel(side)} raise${side === world.state.player ? '' : 's'} ${def.shield} shield.`);
    }
    if (def.heal) {
      const healed = Math.min(def.heal, side.maxHp - side.hp);
      side.hp += healed;
      world.events.push({ type: EVENT_HEAL, side: side === world.state.player ? 'player' : 'ai', amount: healed });
      log(`${sideLabel(side)} restore${side === world.state.player ? '' : 's'} ${healed} life.`);
    }
    if (def.mana) {
      side.mana += def.mana;
      log(`${sideLabel(side)} fan${side === world.state.player ? '' : 's'} the bellows: +${def.mana} mana.`);
    }
    if (def.draw) {
      drawCards(side, def.draw);
      world.events.push({ type: EVENT_DRAW, side: side === world.state.player ? 'player' : 'ai', amount: def.draw });
    }
    if (foe.hp <= 0) {
      world.state.over = true;
      world.state.winner = side === world.state.player ? 'player' : 'ai';
      world.events.push({ type: EVENT_OVER, winner: world.state.winner });
      log(side === world.state.player ? 'Cinder falls. The forge is yours!' : 'Your flame gutters out. Cinder claims the forge.');
    }
    return true;
  }

  /** End the player's turn and hand the table to Cinder. */
  function endPlayerTurn() {
    if (world.state.over || world.state.active !== 'player') return false;
    world.state.active = 'ai';
    world.state.turn += 1;
    world.stats.turns += 1;
    startTurn(world.state.ai);
    world.events.push({ type: EVENT_TURN, side: 'ai' });
    log(`Turn ${world.state.turn} — Cinder plays.`);
    return true;
  }

  /**
   * Score a card for the AI: damage is worth its face value (more when it wins the game or
   * when the foe is low), shield and healing matter most when Cinder is hurt, draw and mana
   * matter when the hand or the mana is short. A card that spends the last mana on nothing
   * useful scores below zero and is not played.
   */
  function aiScore(def, ai, player) {
    let score = 0;
    if (def.damage) {
      score += def.damage * 2;
      if (def.damage >= player.hp + player.shield) score += 100;
      else if (player.hp <= 8) score += 4;
    }
    if (def.shield) score += ai.hp <= 12 ? def.shield * 2.2 : def.shield * 0.9;
    if (def.heal) score += ai.hp <= 18 ? def.heal * 2.4 : def.heal * 0.4;
    if (def.draw) score += ai.hand.length <= 3 ? 6 : 2;
    if (def.mana) score += ai.mana < 2 ? 5 : 1;
    // A cheap card that does little is still better than passing with mana to spare.
    score -= def.cost * 0.5;
    return score;
  }

  /**
   * Play one sensible AI card, or return false when Cinder passes. The main loop calls this
   * once per beat so each card is seen being played; the shot stager calls it in a loop.
   */
  function aiPlayOne() {
    const ai = world.state.ai;
    const player = world.state.player;
    if (world.state.over || world.state.active !== 'ai') return false;
    let bestIndex = -1;
    let bestScore = 1.5;
    for (let i = 0; i < ai.hand.length; i += 1) {
      const def = cardDef(ai.hand[i]);
      if (def.cost > ai.mana) continue;
      const score = aiScore(def, ai, player);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) return false;
    return playCard(ai, bestIndex);
  }

  /** True when Cinder has nothing sensible left to play this turn. */
  function aiDone() {
    const ai = world.state.ai;
    for (let i = 0; i < ai.hand.length; i += 1) {
      const def = cardDef(ai.hand[i]);
      if (def.cost <= ai.mana && aiScore(def, ai, world.state.player) > 1.5) return false;
    }
    return true;
  }

  return world;
}
