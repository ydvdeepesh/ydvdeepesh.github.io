// The room: baked lighting from blender/bake.py, clickable hotspots, camera moves, live screens.
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { About, PhoneContact, Projects } from "./content";
import Lanyards from "./Lanyards";
import { BASE, MODEL_EXT, MOODS, PREVIEW, SPOT_LABEL, type Box, type Mood, type Spot } from "./spots";

// direction the camera looks at a hotspot from (the phone lies flat on the desk)
const VIEW_DIR: Partial<Record<Spot, [number, number, number]>> = { phone: [0, 1, 0.22], laptop: [0, 0.15, 1] };

// lighting for the few live-lit things (globe, Maxel); everything else is baked
const LIVE_LIGHT: Record<Mood, { sky: string; ground: string; hemi: number; sun: string; sunI: number; decal: string }> = {
  golden: { sky: "#ffd9b5", ground: "#6b4a35", hemi: 1.3, sun: "#ffb27a", sunI: 1.8, decal: "#f2dccb" },
  afternoon: { sky: "#e9f0ff", ground: "#8a7560", hemi: 1.6, sun: "#fff4e6", sunI: 2.2, decal: "#f2efea" },
  overcast: { sky: "#e8edf3", ground: "#8a8580", hemi: 1.9, sun: "#ffffff", sunI: 0.4, decal: "#e6e9ee" },
  evening: { sky: "#8f86b0", ground: "#4a3a30", hemi: 0.4, sun: "#ffb070", sunI: 0.5, decal: "#9a8c8a" },
  night: { sky: "#4a5170", ground: "#2a2018", hemi: 0.12, sun: "#ffc890", sunI: 0.3, decal: "#5e5550" },
};

// ---------- baked atlases with crossfade ----------
// without createImageBitmap, GLTFLoader decodes textures through <img>, which the preview allows
if (PREVIEW) (globalThis as { createImageBitmap?: unknown }).createImageBitmap = undefined;
const loader = new THREE.TextureLoader();
const cache = new Map<string, Promise<THREE.Texture>>();
function atlas(group: string, mood: Mood) {
  const url = `${BASE}bake/${group}_${mood}.webp`;
  if (!cache.has(url)) {
    cache.set(url, loader.loadAsync(url).then((t) => {
      t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      return t;
    }));
  }
  return cache.get(url)!;
}

const bakedMaterial = () => new THREE.ShaderMaterial({
  uniforms: { a: { value: null }, b: { value: null }, t: { value: 0 } },
  vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  // bake.py stores radiance / 3 in sRGB; the GPU decodes sRGB, we scale it back
  fragmentShader: `uniform sampler2D a; uniform sampler2D b; uniform float t; varying vec2 vUv;
    void main() {
      gl_FragColor = vec4(mix(texture2D(a, vUv).rgb, texture2D(b, vUv).rgb, t) * 3.0, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});

// whichever atlas is mostly on screen right now, so a fade can start from it
const mixedTexture = (m: THREE.ShaderMaterial) => (m.uniforms.t.value > 0.5 ? m.uniforms.b.value : m.uniforms.a.value);

function Room({ mood, onSpot, focus, onHover }: { mood: Mood; onSpot: (s: Spot, index?: number) => void; focus: Spot | null; onHover: (s: Spot | null) => void }) {
  const { scene } = useGLTF(`${BASE}room${MODEL_EXT}`, false, !PREVIEW);
  const mats = useMemo(() => ({ shell: bakedMaterial(), props: bakedMaterial() }), []);
  const parts = useMemo(() => {
    const p = { decals: [] as THREE.MeshBasicMaterial[], globe: null as THREE.Object3D | null, screens: {} as Record<string, THREE.Mesh> };
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (o.name === "shell" || o.name === "props") o.material = mats[o.name];
      else if (o.name === "globe") p.globe = o;
      else if (o.name.endsWith("_screen")) { o.material = new THREE.MeshBasicMaterial({ color: "#0d1a33" }); p.screens[o.name] = o; }
      else { // decals keep their own sharp texture, tinted by the mood
        const m = new THREE.MeshBasicMaterial({ map: (o.material as THREE.MeshStandardMaterial).map });
        p.decals.push(m); o.material = m;
      }
    });
    return p;
  }, [scene, mats]);

  // mood change: load the new atlases, then fade
  const fade = useRef(1);
  useEffect(() => {
    let live = true;
    Promise.all([atlas("shell", mood), atlas("props", mood)]).then(([s, p]) => {
      if (!live) return;
      for (const [m, tex] of [[mats.shell, s], [mats.props, p]] as const) {
        if (!m.uniforms.a.value) m.uniforms.a.value = tex;
        else m.uniforms.a.value = mixedTexture(m);
        m.uniforms.b.value = tex; m.uniforms.t.value = 0;
      }
      fade.current = 0;
      MOODS.forEach((m) => { atlas("shell", m); atlas("props", m); }); // warm the cache for the lamp
    });
    return () => { live = false; };
  }, [mood, mats]);

  const decalTint = useMemo(() => new THREE.Color(LIVE_LIGHT[mood].decal), [mood]);
  useFrame((_, dt) => {
    if (fade.current < 1) {
      fade.current = Math.min(1, fade.current + dt / 0.8);
      mats.shell.uniforms.t.value = mats.props.uniforms.t.value = fade.current;
    }
    for (const m of parts.decals) m.color.lerp(decalTint, 1 - Math.exp(-dt * 3));
    parts.globe?.rotateY(dt * 0.25);
  });

  const screen = (name: string) => parts.screens[name];
  return (
    <>
      <primitive object={scene} />
      <Screen mesh={screen("monitor_screen")} px={[1210, 690]} spot="monitor" focus={focus} onSpot={onSpot}><Projects /></Screen>
      <Screen mesh={screen("laptop_screen")} px={[660, 400]} spot="laptop" focus={focus} onSpot={onSpot}><About /></Screen>
      <Screen mesh={screen("phone_screen")} px={[272, 600]} spot="phone" focus={focus} onSpot={onSpot}><PhoneContact /></Screen>
      <Lanyards tint={decalTint} onOpen={(i) => onSpot("story", i)} onHover={(on) => onHover(on ? "story" : null)} />
    </>
  );
}

// screen widths (m) and tilts from blender/scene.py; the export bakes their transforms into the vertices
const SCREEN_POSE: Record<string, { width: number; euler: [number, number, number] }> = {
  monitor: { width: 0.605, euler: [0, 0, 0] },
  laptop: { width: 0.33, euler: [THREE.MathUtils.degToRad(-10), 0, 0] },
  phone: { width: 0.068, euler: [-Math.PI / 2, 0, THREE.MathUtils.degToRad(-8)] },  // lies flat, turned 8 degrees
};

/** HTML pinned to a screen mesh; it scrolls and takes clicks only while the camera is on it. */
function Screen({ mesh, px, spot, focus, onSpot, children }: { mesh?: THREE.Mesh; px: [number, number]; spot: Spot; focus: Spot | null; onSpot: (s: Spot) => void; children: React.ReactNode }) {
  if (!mesh) return null;
  const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());  // world space: compression adds node transforms
  const { width, euler } = SCREEN_POSE[spot];
  const active = focus === spot;
  return (
    <Html transform position={center.add(new THREE.Vector3(0, 0, 0.002).applyEuler(new THREE.Euler(...euler)))} rotation={euler}
      distanceFactor={(width / px[0]) * 400} zIndexRange={[10, 0]} style={{ width: px[0], height: px[1] }}>
      <div className={`screen screen-${spot} ${active ? "active" : ""}`} style={{ width: px[0], height: px[1] }}
        // keep clicks here: the canvas would read their position relative to this element and hit the wrong object
        onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); if (!active) onSpot(spot); }} aria-hidden={!active}>
        {children}
      </div>
    </Html>
  );
}

function Maxel({ mood }: { mood: Mood }) {
  const { scene, animations } = useGLTF(`${BASE}maxel${MODEL_EXT}`, false, !PREVIEW);
  const { actions } = useAnimations(animations, scene);
  useEffect(() => { Object.values(actions).forEach((a) => a?.play()); }, [actions]);
  const l = LIVE_LIGHT[mood];
  return (
    <>
      <primitive object={scene} />
      <hemisphereLight args={[l.sky, l.ground, l.hemi]} />
      <directionalLight color={l.sun} intensity={l.sunI} position={[-3, 3, 2]} />
    </>
  );
}

// ---------- camera ----------
const HOME = { pos: new THREE.Vector3(0.17, 1.2, 2.75), target: new THREE.Vector3(0.17, 1.1, 0) };

function Rig({ focus, boxes }: { focus: Spot | null; boxes: Record<Spot, Box> }) {
  const { camera, size, pointer } = useThree();
  const goal = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3() }), []);
  const look = useRef(HOME.target.clone());
  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height, tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    if (!focus) {
      // fit the room (x -1.5 to 1.85) on narrow windows, plus a little parallax
      const d = Math.max(HOME.pos.z, 1.68 / (tan * aspect) + 0.2);
      goal.target.copy(HOME.target);
      goal.pos.set(HOME.pos.x + pointer.x * 0.08, HOME.pos.y + pointer.y * 0.05, d);
    } else {
      const b = boxes[focus];
      const dir = new THREE.Vector3(...(VIEW_DIR[focus] ?? [0, 0, 1])).normalize();
      const w = b.size[0], h = focus === "phone" ? b.size[2] : b.size[1];
      const d = Math.max(h / (2 * tan), w / (2 * tan * aspect)) * 1.12 + b.size[2] * 0.5;
      goal.target.set(...b.center);
      goal.pos.copy(goal.target).addScaledVector(dir, d);
    }
    const k = 1 - Math.exp(-dt * 3.2);
    cam.position.lerp(goal.pos, k);
    look.current.lerp(goal.target, k);
    cam.lookAt(look.current);
  });
  return null;
}

// ---------- hotspots ----------
function Hotspots({ boxes, hints, onSpot, onHover }: { boxes: Record<Spot, Box>; hints: boolean; onSpot: (s: Spot) => void; onHover: (s: Spot | null) => void }) {
  const hidden = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), []);
  return (
    <>
      {(Object.keys(boxes) as Spot[]).map((k) => {
        const b = boxes[k];
        return (
          <group key={k} position={b.center}>
            <mesh material={hidden}
              onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSpot(k); }}
              onPointerOver={(e) => { e.stopPropagation(); onHover(k); document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }}>
              <boxGeometry args={[b.size[0] + 0.04, b.size[1] + 0.04, Math.max(b.size[2], 0.04)]} />
            </mesh>
            {hints && <Html center zIndexRange={[20, 10]}><span className="hint-dot"><span>{SPOT_LABEL[k]}</span></span></Html>}
          </group>
        );
      })}
    </>
  );
}

export default function Scene(props: { mood: Mood; focus: Spot | null; hints: boolean; boxes: Record<Spot, Box>;
  onSpot: (s: Spot, index?: number) => void; onHover: (s: Spot | null) => void }) {
  return (
    <>
      {/* the rig goes first so the camera moves before the screen HTML reads it each frame */}
      <Rig focus={props.focus} boxes={props.boxes} />
      <Room mood={props.mood} onSpot={props.onSpot} focus={props.focus} onHover={props.onHover} />
      <Maxel mood={props.mood} />
      <Hotspots boxes={props.boxes} hints={props.hints && !props.focus} onSpot={props.onSpot} onHover={props.onHover} />
    </>
  );
}
