# deepeshdeu.is-a.dev

My portfolio: a 3D model of my desk you can click around, with a plain page for phones and quick reading (`#plain`).

## How it's made

1. `blender/textures.py` draws the flat textures (globe, labels, lanyard cards, chessboard) and recolours the dog model into Maxel.
2. `blender/scene.py` builds the room in Blender from code. With `RENDER=1` (default) it renders stills.
3. `blender/bake.py` bakes five lighting moods into texture atlases and exports `public/room/` (`room.glb`, `maxel.glb`, `bake/*.webp`, `hotspots.json`).
4. The site (Vite, React, three.js via React Three Fiber) shows the baked room, swaps moods when you click the lamp, and moves the camera to whatever you click.

## Commands

```sh
python3 blender/textures.py                  # needs Pillow and numpy
BPY_PYTHON=~/.bpy-venv/bin/python npm run bake  # needs the bpy 4.2 package: uv venv --python 3.11 ~/.bpy-venv && uv pip install bpy==4.2.0 pillow
npm run dev
npm run build
node src/lib/rules.test.mjs                  # ReqAgent's rule checks, ported to the browser
```

A full bake (96 samples, 2048 px atlas) takes about an hour on 4 CPU cores.

Asset credits are in `blender/CREDITS.md`.
