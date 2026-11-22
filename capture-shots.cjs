// Capture Emberforge Duel screenshots + play-test in headless Chrome for Testing via
// playwright-core (from the npx cache, as previous entries did). Run from the repo root.
const { chromium } = require('/home/hatch/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core');
const { join, resolve } = require('node:path');
const { statSync } = require('node:fs');

const here = resolve(__dirname);
const BASE = 'http://127.0.0.1:8081';
const shots = JSON.parse(require('node:fs').readFileSync(join(here, 'shots.json'), 'utf8'));
const COST = { emberStrike: 1, hammerBlow: 2, cinderBurst: 3, anvilDrop: 4, wildfire: 5, forgeGuard: 1, moltenWall: 2, phoenixFeather: 3, kindling: 0, bellows: 1, sparkTrick: 1, quench: 2 };

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/hatch/cft-dl/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb'],
  });
  const errors = [];
  // --- Screenshots ---
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(`pageerror ${shot.name}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console ${shot.name}: ${m.text()}`); });
    await page.goto(`${BASE}/${shot.query}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
    const out = join(here, 'screenshots', shot.name);
    await page.screenshot({ path: out, type: 'jpeg', quality: 82 });
    const size = statSync(out).size;
    console.log('SHOT_OK', shot.name, `${size} bytes`, size <= 262144 ? 'UNDER_256K' : 'OVER_256K!');
    await page.close();
  }
  // --- Self-test (200 logic games) ---
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(`pageerror selftest: ${e.message}`));
    await page.goto(`${BASE}/?selftest=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__selftest !== undefined, null, { timeout: 30000 });
    console.log('SELFTEST', JSON.stringify(await page.evaluate(() => window.__selftest)));
    await page.close();
  }
  // --- Interactive play-test: click cards, end turns, until someone wins ---
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(`pageerror playtest: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console playtest: ${m.text()}`); });
    await page.goto(BASE + '/', { waitUntil: 'load' });
    console.log('PLAYTEST title screen:', await page.evaluate(() => window.__ember.screen()));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log('PLAYTEST after Enter:', await page.evaluate(() => window.__ember.screen()));
    let turns = 0;
    let aiTurnsSeen = 0;
    while (turns < 45) {
      const st = await page.evaluate(() => {
        const s = window.__ember.state();
        return { over: s.over, active: s.active, winner: s.winner, hp: s.player.hp, aiHp: s.ai.hp, mana: s.player.mana, hand: s.player.hand, turn: s.turn };
      });
      if (st.over) break;
      if (st.active !== 'player') {
        aiTurnsSeen += 1;
        await page.waitForTimeout(1500);
        continue;
      }
      const playable = st.hand.map((id, i) => ({ id, i, cost: COST[id] })).filter((c) => c.cost <= st.mana);
      if (playable.length > 0) {
        const rect = await page.evaluate((idx) => {
          const r = window.__ember.handRects()[idx];
          const cr = window.__ember.canvasRect();
          return { x: cr.x + (r.x + r.w / 2) * (cr.width / 1280), y: cr.y + (r.y + r.h / 2) * (cr.height / 720) };
        }, playable[0].i);
        await page.mouse.click(rect.x, rect.y);
        await page.waitForTimeout(450);
      } else {
        await page.keyboard.press('Enter');
        turns += 1;
        await page.waitForTimeout(900);
        for (let k = 0; k < 25; k += 1) {
          const s2 = await page.evaluate(() => ({ over: window.__ember.state().over, active: window.__ember.state().active }));
          if (s2.active === 'ai') aiTurnsSeen += 1;
          if (s2.over || s2.active === 'player') break;
          await page.waitForTimeout(1000);
        }
      }
    }
    const fin = await page.evaluate(() => ({
      over: window.__ember.state().over, winner: window.__ember.state().winner,
      screen: window.__ember.screen(), playerHp: window.__ember.state().player.hp,
      aiHp: window.__ember.state().ai.hp, stats: window.__ember.stats(),
    }));
    console.log('PLAYTEST final:', JSON.stringify(fin), 'aiTurnsSeen:', aiTurnsSeen);
    await page.screenshot({ path: join(here, 'screenshots', 'playtest-end.jpg'), type: 'jpeg', quality: 82 });
    // Pause test.
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    await page.keyboard.press('p');
    await page.waitForTimeout(300);
    console.log('PLAYTEST pause screen:', await page.evaluate(() => window.__ember.screen()));
    await page.close();
  }
  await browser.close();
  console.log('JS_ERRORS:', errors.length === 0 ? 'NONE' : JSON.stringify(errors, null, 2));
  if (errors.length) process.exit(1);
  console.log('ALL_OK');
})().catch((e) => { console.error('DRIVER_FAIL', e.message); process.exit(1); });
