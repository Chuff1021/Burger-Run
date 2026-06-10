# Burger Run Project Vision

## Mission

Burger Run is a premium mobile-first 3-lane endless runner set inside a futuristic high-tech burger factory. The feel target is the immediacy of Subway Surfers and Temple Run, translated into a neon fast-food production line with cinematic depth, glossy materials, glowing conveyors, oversized machines, sauce pipes, robotic arms, and high-energy hazards.

The first playable foundation must be a real game loop, not a static scene or marketing mockup. The player should be able to start a run, switch lanes, jump, slide, collect coins, avoid obstacles, trigger powerups, pause, lose, restart, and see persistent progress.

## Quality Pillars

- Playable first: every visual decision supports fast, readable runner gameplay.
- Premium mobile presentation: layered HUD, glass panels, metallic borders, glowing accents, animated controls, and responsive safe-area layout.
- Futuristic burger factory identity: no generic boxes, flat tracks, or bland cartoon props in final-facing screens.
- Performance discipline: reusable geometries, object pools, bounded spawning, mobile-aware materials, and optional visual intensity settings.
- Upgrade-ready architecture: state, save data, characters, powerups, settings, and content spawning should be easy to extend.

## Current Repo Audit

Date: 2026-06-10

Repository: `https://github.com/Chuff1021/Burger-Run`

Finding: The repository cloned successfully but was empty, with no existing source files, package manager files, framework, or build scripts. There is no working code to preserve. Because the repo has no established stack, Burger Run will use the requested stack:

- React
- TypeScript
- Vite
- Three.js
- React Three Fiber
- Drei
- Zustand
- TailwindCSS
- Framer Motion
- PWA manifest and service-worker readiness
- Capacitor-ready project structure

## Launch Foundation Scope

The first complete foundation should include:

- 3-lane endless runner controls on keyboard and touch.
- Cinematic rear-follow camera with speed-based field of view.
- Procedural track chunks with object pooling.
- Collectible burger coins, obstacles, and powerups.
- Score, distance, multiplier, coin totals, local persistence, settings, pause, restart, and game over.
- Premium burger factory visual set made from optimized procedural 3D primitives and reusable materials.
- Character roster placeholders: Classic Burger, Bacon Beast, Robot Burger, King Burger.
- App shell screens: start, HUD, pause, game over, character select placeholder, upgrade/shop placeholder, settings.

## Non-Goals For The Foundation

- Online leaderboard.
- Real money purchases.
- Full character unlock economy.
- Final authored 3D production assets.
- Native Capacitor builds.
- Heavy postprocessing pipeline on mobile by default.

## Success Criteria

- `npm run build` succeeds.
- The app runs locally as a playable PWA-ready Vite app.
- No TypeScript errors.
- Main gameplay loop is playable with keyboard and swipe controls.
- The scene presents as a glowing, layered, futuristic burger factory rather than a basic web prototype.
- `TASKS.md` reflects completed phase work and remaining follow-up work.
