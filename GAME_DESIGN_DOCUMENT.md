# Burger Run Game Design Document

## Game Overview

Burger Run is a 3-lane endless runner where a stylized burger hero sprints through an automated cyberpunk burger factory. The player survives as long as possible by switching lanes, jumping, sliding, collecting burger coins, and using temporary powerups.

## Core Loop

1. Start a run from the main menu.
2. Dodge obstacles and factory hazards.
3. Collect burger coins and powerups.
4. Speed increases over time.
5. Score and distance climb while the player survives.
6. Collision without protection ends the run.
7. Game over panel shows rewards and restart options.
8. Persistent totals support future upgrades, unlocks, and missions.

## Controls

Keyboard:

- `ArrowLeft` or `A`: move one lane left.
- `ArrowRight` or `D`: move one lane right.
- `ArrowUp`, `W`, or `Space`: jump.
- `ArrowDown` or `S`: slide.
- `P` or `Escape`: pause or resume.

Touch:

- Swipe left: move one lane left.
- Swipe right: move one lane right.
- Swipe up: jump.
- Swipe down: slide.

## Lanes

The runner uses 3 fixed lanes:

- Left lane: `x = -2.4`
- Center lane: `x = 0`
- Right lane: `x = 2.4`

Lane switching is responsive but eased, with enough travel time to feel animated and readable.

## Player States

- Running: default state.
- Jumping: vertical clearance over low and floor hazards.
- Sliding: lowered collision height for overhead gates.
- Shielded: absorbs one hit or protects during timer.
- Invincible: Ketchup Rush state; destroys or ignores hazards.
- Boosting: increased speed and stronger visual trails.
- Crashed: gameplay stops and game over flow begins.

## Obstacles

Initial obstacle families:

- Hot crate: lane blocker on the floor.
- Spiked sauce roller: rolling floor hazard.
- Grill flame: jump-required hazard.
- Overhead sauce gate: slide-required hazard.
- Robotic arm sweep: lane blocker with strong factory silhouette.

Obstacles must be readable from distance and use emissive warning colors. Spawn rules should avoid impossible patterns.

## Collectibles

Burger Coins:

- Spawn in arcs, straight lane lines, and staggered clusters.
- Increase run coin count.
- Add to persistent wallet after run.
- Affected by Double Coins powerup.
- Pulled in by Magnet powerup.

## Powerups

- Magnet: pulls nearby burger coins toward the player.
- Shield: protects against a collision.
- Speed Boost: temporarily increases speed and score gain.
- Double Coins: doubles collected coin value.
- Ketchup Rush: invincibility with red sauce trail and impact sparks.

Powerups have timers displayed in the HUD powerup dock.

## Scoring

Score combines:

- Distance survived.
- Coin pickups.
- Speed multiplier.
- Temporary multiplier badges.

Distance is displayed in meters. Speed scales gradually over time with a capped maximum.

## Characters

Launch foundation roster:

- Classic Burger: balanced default.
- Bacon Beast: heavier silhouette, red-orange accents.
- Robot Burger: metallic bun plates, blue emissive circuits.
- King Burger: crown, gold trim, higher prestige styling.

Initial models can be stylized geometry, but they must use layered geometry, emissive trims, trails, and particles so they feel premium.

## Screens

- Start screen: direct playable entry with character/shop/settings access.
- Gameplay HUD: score, distance, coins, multiplier, powerups, mission placeholder, pause.
- Pause menu: resume, restart, settings.
- Game over: score, distance, coins earned, rewards panel, restart, menu.
- Character select: roster cards and selected character.
- Shop/upgrades: placeholder slots for future economy.
- Settings: audio, haptics, visual quality, reduced effects.

## Difficulty Curve

- Start speed is forgiving.
- Track speed increases continuously.
- Spawn density increases after distance milestones.
- More mixed obstacle patterns appear after early onboarding distance.
- Powerups remain occasional relief moments and should not remove skill pressure.

## Manual QA Checklist

- Desktop lane switching works with arrows and `A/D`.
- Desktop jump works with `ArrowUp`, `W`, and `Space`.
- Desktop slide works with `ArrowDown` and `S`.
- Pause and resume work with HUD button, `P`, and `Escape`.
- Mobile swipe controls work for all four directions.
- Coins increment run and wallet totals.
- Obstacles trigger game over when unprotected.
- Shield prevents a crash.
- Ketchup Rush prevents a crash.
- Restart resets run state without reloading the page.
- Score and distance advance while running and stop on pause/game over.
- HUD fits common mobile portrait sizes.
- PWA manifest is present and install metadata is correct.
- Build passes without TypeScript errors.
