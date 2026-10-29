// The popup for everything that isn't a screen: a centred card over the dimmed room, like a page lifted off the desk.
import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import pins from "../blender/tex/globe_pins.json";
import { AskMaxel, COUNTRIES, Chess, Gym, LANYARDS, LINKS } from "./content";
import { BASE, type Spot } from "./spots";

const HOME = new Set(["Germany", "India"]);

/** Same layout as three.js SphereGeometry UVs, so a pin lands on its country in the equirectangular texture. */
export function lonLatToXYZ(lon: number, lat: number, r = 1) {
  const phi = ((lon + 180) / 360) * 2 * Math.PI, theta = ((90 - lat) / 180) * Math.PI;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
}

function Globe() {
  const map = useLoader(THREE.TextureLoader, `${BASE}globe.webp`);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const front = lonLatToXYZ(30, 0);  // turn the globe so Europe to India faces the visitor first
  const spin = Math.atan2(-front.x, front.z);
  const up = new THREE.Vector3(0, 1, 0);
  return (
    <group rotation={[0.55, spin, 0, "XYZ"]}>
      <mesh><sphereGeometry args={[1, 64, 32]} /><meshStandardMaterial map={map} roughness={0.55} /></mesh>
      {Object.entries(pins as Record<string, number[]>).map(([name, [lon, lat]]) => {
        const n = lonLatToXYZ(lon, lat).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(up, n);
        const color = HOME.has(name) ? "#3d6fd6" : "#e8562a";
        return (
          <group key={name} position={n} quaternion={q}>
            <mesh position={[0, 0.09, 0]}><cylinderGeometry args={[0.006, 0.006, 0.18, 8]} /><meshStandardMaterial color="#c9c4bb" metalness={0.6} roughness={0.3} /></mesh>
            <mesh position={[0, 0.19, 0]}><sphereGeometry args={[0.04, 16, 12]} /><meshStandardMaterial color={color} roughness={0.35} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

function Travel() {
  return (
    <>
      <div className="globe-view">
        <Canvas camera={{ position: [0, 0, 3.4], fov: 38 }} dpr={[1, 2]}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 2, 4]} intensity={2.2} />
          <Suspense fallback={null}><Globe /></Suspense>
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.7} />
        </Canvas>
      </div>
      <p className="count">{COUNTRIES.visited.length + COUNTRIES.home.length} countries so far · drag to spin</p>
      <ul className="chips">
        {COUNTRIES.home.map((c) => <li key={c} className="home">{c}</li>)}
        {COUNTRIES.visited.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <p className="actions"><a href={LINKS.instagram} target="_blank" rel="noreferrer">Photos on Instagram</a></p>
    </>
  );
}

/** Lanyard stories as a stack of cards, one at a time. */
function StoryCards({ start }: { start: number }) {
  const [i, setI] = useState(start);
  const l = LANYARDS[i];
  const go = (d: number) => setI((i + d + LANYARDS.length) % LANYARDS.length);
  return (
    <>
      <div className="stack">
        <article className={`paper ${l.key}`} key={l.key} aria-live="polite">
          <p className="org">{l.org}</p>
          <p className="role">{l.role}{l.years && ` · ${l.years}`}</p>
          <ul>{l.points.map((p) => <li key={p}>{p}</li>)}</ul>
          {l.note && <p className="note">{l.note}</p>}
        </article>
      </div>
      <div className="pager">
        <button onClick={() => go(-1)} aria-label="Previous">‹</button>
        <span>{i + 1} / {LANYARDS.length}</span>
        <button onClick={() => go(1)} aria-label="Next">›</button>
      </div>
    </>
  );
}

const META: Partial<Record<Spot, { eyebrow: string; title: string; sub?: string }>> = {
  globe: { eyebrow: "Travel", title: "Where I've been", sub: "Blue pins are home. Orange pins are places I've visited." },
  chess: { eyebrow: "Chess.com", title: "Fancy a game?" },
  gym: { eyebrow: "Gym", title: "Let's talk training" },
  story: { eyebrow: "Story board", title: "Where I've worked and helped out" },
  maxel: { eyebrow: "Ask Maxel", title: "Woof." },
};

export default function Modal({ spot, index, onClose }: { spot: Spot; index: number; onClose: () => void }) {
  const meta = META[spot]!;
  const body = useMemo(() => ({
    globe: <Travel />, chess: <Chess />, gym: <Gym />, maxel: <AskMaxel />, story: <StoryCards start={index} />,
  } as Partial<Record<Spot, React.ReactNode>>)[spot], [spot, index]);
  useEffect(() => { document.querySelector<HTMLElement>(".backdrop > button.x")?.focus(); }, [spot]);
  return (
    <div className="backdrop" onClick={onClose}>
      <button className="x" onClick={onClose} aria-label="Close">×</button>
      <div className={`modal modal-${spot}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">{meta.eyebrow}</p>
        <h2 id="modal-title">{meta.title}</h2>
        {meta.sub && <p className="sub">{meta.sub}</p>}
        {body}
      </div>
    </div>
  );
}
