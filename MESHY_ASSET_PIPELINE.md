# Meshy Asset Pipeline

Burger Run uses Meshy as a private asset-generation tool for high-end GLB models. The API key must stay server/local only.

## Setup

Store the key in `.env.local`:

```bash
MESHY_API_KEY=...
```

`.env.local` is ignored by git. Do not use a `VITE_` prefix, because that would expose the key in the browser bundle.

## Commands

Check account credits:

```bash
npm run meshy:balance
```

Generate a textured GLB from a prompt:

```bash
npm run meshy:text-to-3d -- --name mega-manager-boss --prompt "massive cyberpunk fast food boss, armored burger executive, glowing red sauce gauntlets, premium mobile fighting game villain, clean readable silhouette" --polycount 18000
```

Output lands in:

```text
public/models/generated/<asset-name>/<asset-name>.glb
public/models/generated/<asset-name>/<asset-name>.preview.glb
```

Use generated GLBs in React Three Fiber with a public path like:

```text
/models/generated/mega-manager-boss/mega-manager-boss.glb
```

## Recommended Burger Run Asset Queue

1. `mega-manager-boss`: cinematic boss model for the grill-pit duel.
2. `classic-burger-fighter`: upgraded hero character with jacket, gloves, sneakers.
3. `robot-burger-fighter`: metallic cyber character variant.
4. `grill-pit-props`: chains, sauce injectors, flame vents, overhead machinery.
5. `finisher-vfx-props`: oversized glowing spatula, fryer cage, sauce cannon.

## Notes

Meshy Text to 3D is asynchronous: preview generates geometry, refine textures it, and the script polls until each task completes. The tooling requests GLB output because Vite can serve it directly from `public/models`.
