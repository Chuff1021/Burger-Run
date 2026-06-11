# BURGER RUN: WORLD TOUR — Expansion Blueprint

The vision: turn the endless runner into a **campaign**. Five themed worlds,
each a designed course with checkpoints, capped by a **boss fight against a
fast-food villain** in an arena. Beat the boss, unlock the next world.

---

## 1. Structure: Worlds → Sections → Checkpoints → Boss

```
WORLD (themed course, ~2,000m designed run)
 ├─ Section 1 (~600m) ──► CHECKPOINT GATE (banked coins + star)
 ├─ Section 2 (~650m) ──► CHECKPOINT GATE
 ├─ Section 3 (~750m, hardest) ──► BOSS DOOR
 └─ BOSS ARENA ──► victory ──► next world unlocked
```

- **Lives**: 3 per world. Crash = restart at last checkpoint, not the start.
  This is the single biggest kid-friendliness feature.
- **Stars**: each section awards up to 3 stars (finish / finish with 50+ coins
  / finish without getting hit). Stars gate cosmetic unlocks, never progress.
- **Endless mode stays** as its own menu item ("Marathon") — the current game,
  with global leaderboard score. Campaign and Marathon share the engine.

## 2. The Worlds

| # | World | Theme & gimmick | Boss |
|---|-------|-----------------|------|
| 1 | **Burger Factory** | Current neon kitchen. Tutorial-paced. | **The Mega Manager** — giant angry franchise boss, throws clipboards & burger boxes |
| 2 | **Freezer Frontier** | Ice-blue palette, slippery lane changes (longer tween), icicle obstacles, fog breath | **Sgt. Soft Serve** — ice-cream drill sergeant, freezes lanes, snow-cone mortar |
| 3 | **Pizza Inferno** | Lava-oven reds, rolling pizza cutters, cheese-bridge gaps (mandatory jumps) | **The Pizza Phantom** — teleports between lanes, flings pepperoni discs |
| 4 | **Sushi Dojo** | Night garden + neon koi, conveyor sushi lanes that push you sideways, bamboo gates | **Sushi Shogun** — samurai with a rolling-pin katana, wave attacks across lanes |
| 5 | **Candy Kingdom** | Pastel glow, bouncy gummy floors (higher jumps), lollipop forests | **King Cavity** — final boss, candy armor phases, summons minions from earlier worlds |

Each world = same engine + a **theme pack**: palette/HDRI swap, obstacle
reskins, 2-3 unique mechanics, music variation (tempo/key change on the same
synth engine). Kenney's CC0 kits already cover food props for ALL of these
(sushi, ice cream, pizza, candy models exist in the food kit we ship).

## 3. Boss Fights — "Lane Brawler" design

The out-of-the-box insight: **don't bolt on a different game — weaponize the
controls the player has already mastered.** The arena IS the three lanes.

### The Arena
Camera pulls back and orbits 30°; the runner stops on a circular arena
platform (same bend-transform tech renders it). The boss towers at the far
side, health pips above. Crowd of food characters around the edge. Smash-style
HUD: player hearts left, boss pips right, special meter center.

### Combat loop (rounds of ~20s)
1. **DODGE PHASE** — the boss attacks in telegraphed lane patterns
   (red telegraph rings — same language as the runner):
   - lane slam (move), low sweep (jump), high sweep (slide),
     ring shockwave (jump timed), feint-double (the skill test)
   - Every clean dodge fills the **SMASH METER**.
2. **STAGGER** — after a pattern set, the boss winds up a big attack; dodge
   it and he staggers, dropping his guard.
3. **STRIKE PHASE** — "GO!" prompt: swipe UP to leap in and land combo hits
   (each swipe = a hit, mash window ~3s). Full smash meter = swipe DOWN
   instead for the **BURGER SLAM** super (cinematic camera, big damage).
4. Boss loses a pip → next round, faster pattern + a new attack mixed in.
   Three pips = KO with slow-mo Smash-style launch off the platform.

- Getting hit costs a heart (3 hearts; shield power-up earned in the
  preceding run carries in as a 4th).
- Fights are 60-90 seconds, fully skill-based, zero new inputs to learn.
- Mortal Kombat flavor = the KO moment + "FINISH THE ORDER!" prompt;
  Smash flavor = knockback physics, meter, launch KO. Kid-appropriate
  throughout — bosses get comically launched, never gore.

### Tech architecture
- `gameMode: 'run' | 'boss'` in the store; the engine gains a `bossSim`
  module (attack pattern scheduler = same chunk-pattern system, but
  emitting attacks instead of obstacles).
- Boss characters: built like the player (procedural rigs + Kenney/Blender
  parts), animated with the same imperative useFrame system. Phase 2 can
  upgrade to Blender-sculpted bosses with baked AO.
- Save schema v2: `{ campaign: { world, checkpoint, stars[], bossesBeaten[] }, ... }`
  — migrate v1 saves, never wipe (wallet/best scores carry over).

## 4. Build order (each milestone is shippable)

| Milestone | What ships | Size |
|-----------|-----------|------|
| **M1 — Campaign skeleton** | Level/checkpoint/lives system on World 1, world map menu screen, save v2 migration, section stars | ~1 session |
| **M2 — First boss** | Arena mode + Mega Manager fight with 3 attack patterns, victory/defeat flow, world unlock | ~1-2 sessions |
| **M3 — Freezer Frontier** | Theme-pack pipeline (palette/HDRI/obstacle reskin/mechanic hooks) proven on World 2 + Sgt. Soft Serve | ~1-2 sessions |
| **M4 — Worlds 3-4** | Pizza Inferno + Sushi Dojo using the pipeline | ~2 sessions |
| **M5 — Candy Kingdom finale** | King Cavity multi-phase fight, ending celebration, credits | ~1-2 sessions |
| **Polish track (ongoing)** | Blender hero character + boss models, run-cycle mocap via Mixamo, voice barks, more music | parallel |

## 5. Design principles (locked)

1. **One control grammar everywhere** — swipe left/right/up/down is the whole
   game, runner and boss alike.
2. **Red means danger, gold means grab, arrows mean turn** — never violated.
3. **Checkpoints are generous, stars are hard** — a kid always progresses;
   mastery is optional and rewarded with cosmetics.
4. **Every world must pass the "show a friend" test** — one screenshot should
   explain the whole theme.
