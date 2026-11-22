# Emberforge Duel

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Tiannuryadins/makefun-best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Tiannuryadins/makefun-best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

An original card battler for the [Make the best card game](https://make.fun/bounty/best-card-game-20261122-1826) bounty on make.fun.

## The game

You are the Emberforger. Across the table sits **Cinder, the Ash Warden**. You each
start with 30 life and a 30-card deck drawn from four schools of the forge:

- **Ember** — raw damage: Ember Strike, Cinder Burst, Wildfire, Phoenix Feather
- **Stone** — heavy blows and shields: Hammer Blow, Anvil Drop, Forge Guard, Molten Wall
- **Gale** — cunning: Kindling (draw), Bellows (mana), Spark Trick
- **Tide** — balance: Quench (damage + shield)

Each turn you gain a mana crystal (up to 10), mana refills, and you draw a card.
Play cards by clicking them or pressing **1–7**, end your turn with **Enter** or the
End Turn button, and watch Cinder answer — she plays sensibly, shielding when hurt,
healing when low, and finishing you off when she can. Reduce her to 0 life to win
the forge; if your life hits 0, the forge is hers.

## Features

- Complete turn structure with mana economy, deck, hand limit and discard reshuffle
- Sensible AI opponent (greedy scoring: lethal, defence when hurt, draw/mana value)
- Procedural canvas art — every card has its own illustration, plus hooded-forger portraits
- Animations: card-play zoom, floating damage/heal numbers, screen shake, rising embers
- Synthesised WebAudio sound (no audio files): card plays, hits, heals, win/lose jingles
- Title screen, how-to-play panel (**H**), pause (**P**), mute (**M**), win and loss screens
- Deterministic screenshot modes: `?shot=title|table|win|loss&seed=N`

## Play it

Serve `game/` with any static server and open `game/index.html` in a desktop browser —
it plays fully offline, no network request:

```sh
node serve.ts
# then open http://localhost:8080
```

## Entry

`main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored make.fun library:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

MIT licensed — see [LICENSE](LICENSE).
