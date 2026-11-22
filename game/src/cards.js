// The card catalogue: every card in Emberforge Duel is original — its own name, school and
// effect. A card's effect is a small object the world applies: damage to the foe, shield for
// its owner, healing, drawing cards, or extra mana for this turn. `art` picks the procedural
// illustration the renderer paints on the card face.
export const CARD_DEFS = {
  emberStrike: {
    id: 'emberStrike', name: 'Ember Strike', suit: 'ember', cost: 1,
    text: 'Deal 3 damage.', damage: 3, art: 'strike',
  },
  hammerBlow: {
    id: 'hammerBlow', name: 'Hammer Blow', suit: 'stone', cost: 2,
    text: 'Deal 5 damage.', damage: 5, art: 'hammer',
  },
  cinderBurst: {
    id: 'cinderBurst', name: 'Cinder Burst', suit: 'ember', cost: 3,
    text: 'Deal 7 damage.', damage: 7, art: 'burst',
  },
  anvilDrop: {
    id: 'anvilDrop', name: 'Anvil Drop', suit: 'stone', cost: 4,
    text: 'Deal 9 damage.', damage: 9, art: 'anvil',
  },
  wildfire: {
    id: 'wildfire', name: 'Wildfire', suit: 'ember', cost: 5,
    text: 'Deal 12 damage.', damage: 12, art: 'wildfire',
  },
  forgeGuard: {
    id: 'forgeGuard', name: 'Forge Guard', suit: 'stone', cost: 1,
    text: 'Gain 5 shield.', shield: 5, art: 'guard',
  },
  moltenWall: {
    id: 'moltenWall', name: 'Molten Wall', suit: 'stone', cost: 2,
    text: 'Gain 9 shield.', shield: 9, art: 'wall',
  },
  phoenixFeather: {
    id: 'phoenixFeather', name: 'Phoenix Feather', suit: 'ember', cost: 3,
    text: 'Restore 6 life.', heal: 6, art: 'feather',
  },
  kindling: {
    id: 'kindling', name: 'Kindling', suit: 'gale', cost: 0,
    text: 'Draw 2 cards.', draw: 2, art: 'kindling',
  },
  bellows: {
    id: 'bellows', name: 'Bellows', suit: 'gale', cost: 1,
    text: 'Gain 2 mana this turn.', mana: 2, art: 'bellows',
  },
  sparkTrick: {
    id: 'sparkTrick', name: 'Spark Trick', suit: 'gale', cost: 1,
    text: 'Deal 2 damage. Draw 1 card.', damage: 2, draw: 1, art: 'spark',
  },
  quench: {
    id: 'quench', name: 'Quench', suit: 'tide', cost: 2,
    text: 'Deal 4 damage. Gain 2 shield.', damage: 4, shield: 2, art: 'quench',
  },
};

/** How many copies of each card a 30-card deck holds. */
const DECK_LIST = [
  ['emberStrike', 4], ['hammerBlow', 3], ['cinderBurst', 2], ['anvilDrop', 2],
  ['wildfire', 1], ['forgeGuard', 4], ['moltenWall', 2], ['phoenixFeather', 2],
  ['kindling', 3], ['bellows', 2], ['sparkTrick', 3], ['quench', 2],
];

/** A fresh shuffled 30-card deck of card ids. */
export function buildDeck(random) {
  const deck = [];
  for (const [id, count] of DECK_LIST) {
    for (let i = 0; i < count; i += 1) deck.push(id);
  }
  // Shuffle with the seeded generator so a seed fixes the whole game.
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

/** The definition for a card id. */
export function cardDef(id) {
  return CARD_DEFS[id];
}
