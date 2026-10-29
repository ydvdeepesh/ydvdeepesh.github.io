import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { CREDITS } from "./content";
import { HEADLINE } from "./Plain";
import * as THREE from "three";
import Scene from "./Scene";
import Modal from "./Modal";
import { MOODS, MOOD_LABEL, SPOT_LABEL, useHotspots, type Mood, type Spot } from "./spots";

const SCREENS: Spot[] = ["monitor", "laptop", "phone"];  // the camera flies to these; everything else opens a popup
const ALL: Spot[] = ["monitor", "laptop", "phone", "story", "globe", "chess", "gym", "maxel", "lamp"];

const store = {  // per-visitor convenience only; the page works without it
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

function moodForNow(): Mood {
  const h = new Date().getHours();
  return h >= 6 && h < 9 ? "golden" : h < 16 ? "afternoon" : h < 19 ? "golden" : h < 21 ? "evening" : "night";
}

function Loader() {
  const { progress, active } = useProgress();
  return active ? <div className="loader" role="status">Setting up the desk… {Math.round(progress)}%</div> : null;
}

export default function Room3D() {
  const [mood, setMood] = useState<Mood>(moodForNow);
  const [focus, setFocus] = useState<Spot | null>(null);
  const [modal, setModal] = useState<{ spot: Spot; index: number } | null>(null);
  const [hover, setHover] = useState<Spot | null>(null);
  const [hints, setHints] = useState(false);
  const [menu, setMenu] = useState(false);
  const [found, setFound] = useState<Set<string>>(() => new Set(JSON.parse(store.get("found") ?? "[]")));
  const boxes = useHotspots();

  useEffect(() => {  // the tooltip follows the pointer
    const onMove = (e: PointerEvent) => { document.body.style.setProperty("--mx", `${e.clientX}px`); document.body.style.setProperty("--my", `${e.clientY}px`); };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const open = useCallback((s: Spot, index = 0) => {
    setMenu(false);
    setFound((f) => { const n = new Set(f).add(s); store.set("found", JSON.stringify([...n])); return n; });
    if (s === "lamp") setMood((m) => MOODS[(MOODS.indexOf(m) + 1) % MOODS.length]);
    else if (SCREENS.includes(s)) { setModal(null); setFocus(s); }
    else { setFocus(null); setModal({ spot: s, index }); }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setModal(null); setFocus(null); setMenu(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Canvas className="room-canvas" dpr={[1, 2]} camera={{ position: [0.17, 1.27, 2.7], fov: 50, near: 0.05, far: 30 }}
        gl={{ toneMapping: THREE.AgXToneMapping /* matches the Blender renders */ }} onPointerMissed={() => setFocus(null)}>
        <Suspense fallback={null}>
          {boxes && <Scene mood={mood} focus={focus} hints={hints && !modal} boxes={boxes} onSpot={open} onHover={setHover} />}
        </Suspense>
      </Canvas>
      <Loader />

      {!focus && (
        <header className="room-intro">
          <h1>Deepesh Yadav</h1>
          <p>{HEADLINE}</p>
          <p className="hint">Click around the desk, or use the menu for a quicker way through.</p>
          <p className="count">{found.size} of {ALL.length} discovered</p>
        </header>
      )}

      <nav className="top">
        {focus ? <button onClick={() => setFocus(null)}>← Back to the room</button> : (
          <button aria-pressed={hints} onClick={() => setHints((h) => !h)}>Hints</button>
        )}
        <button aria-expanded={menu} onClick={() => setMenu((m) => !m)}>Menu</button>
      </nav>

      {menu && (
        <div className="menu" role="dialog" aria-label="Menu">
          <ul>
            {ALL.map((s) => (
              <li key={s}><button onClick={() => open(s)}>{SPOT_LABEL[s]}{found.has(s) && <span aria-label="seen"> ✓</span>}</button></li>
            ))}
            <li><a href="#plain">Plain view (quick read)</a></li>
          </ul>
          {CREDITS}
        </div>
      )}

      {modal && <Modal spot={modal.spot} index={modal.index} onClose={() => setModal(null)} />}

      <button className="mood" onClick={() => open("lamp")} title="Or click the lamp">
        <span className="dot" data-mood={mood} /> {MOOD_LABEL[mood]}
      </button>

      {hover && !focus && !modal && <div className="tip" role="tooltip">{SPOT_LABEL[hover]}</div>}
    </>
  );
}
