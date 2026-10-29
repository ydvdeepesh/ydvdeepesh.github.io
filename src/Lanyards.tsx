// The four lanyards on the story board: a short rope (verlet) from each pin to its card, swaying and pushed by the cursor.
import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { LANYARDS } from "./content";

// pins from blender/scene.py (x = 1.2 + 0.165 i, z_blender = 1.72), in browser coordinates (x, z, -y)
const PIN = (i: number) => new THREE.Vector3(1.2 + 0.165 * i, 1.72, 0.045);
const COLORS = ["#179c7d", "#4285f4", "#d97326", "#bf2633"];
const N = 12, SEG = 0.013, CARD = [0.12, 0.17] as const, STRAP = 0.011;

function cardTexture(i: number) {
  const c = document.createElement("canvas");
  c.width = 480; c.height = 680;
  const g = c.getContext("2d")!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const draw = () => {
    const l = LANYARDS[i];
    g.fillStyle = "#f7f4ee"; g.beginPath(); g.roundRect(0, 0, 480, 680, 36); g.fill();
    g.fillStyle = COLORS[i]; g.beginPath(); g.roundRect(0, 0, 480, 200, [36, 36, 0, 0]); g.fill();
    g.fillStyle = "#f7f4ee"; g.beginPath(); g.roundRect(195, 34, 90, 22, 11); g.fill();  // slot for the clip
    g.textAlign = "center";
    const [name, ...rest] = l.org.split(",")[0].split(" ");
    g.fillStyle = "#fff"; g.font = "800 64px Archivo, sans-serif"; g.fillText(name.toUpperCase(), 240, 140);
    g.fillStyle = "#1d1b18"; g.font = "700 46px Archivo, sans-serif"; g.fillText(rest.join(" ") || " ", 240, 290);
    g.font = "500 38px Archivo, sans-serif"; g.fillStyle = "#4a443c"; g.fillText(l.role, 240, 370);
    if (l.years) g.fillText(l.years, 240, 420);
    g.fillStyle = "#1d1b18"; g.font = "700 40px Archivo, sans-serif"; g.fillText("Deepesh Yadav", 240, 600);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load("800 64px Archivo").then(draw, () => {});  // redraw once the web font is in
  return tex;
}

function Lanyard({ i, tint, onOpen, onHover }: { i: number; tint: THREE.Color; onOpen: (i: number) => void; onHover: (on: boolean) => void }) {
  const pin = useMemo(() => PIN(i), [i]);
  // rope points: current and previous position (verlet)
  const pts = useMemo(() => Array.from({ length: N }, (_, k) => pin.clone().add(new THREE.Vector3(0, -k * SEG, 0))), [pin]);
  const prev = useMemo(() => pts.map((p) => p.clone()), [pts]);
  const strap = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    g.setIndex(Array.from({ length: N - 1 }, (_, k) => [2 * k, 2 * k + 1, 2 * k + 2, 2 * k + 1, 2 * k + 3, 2 * k + 2]).flat());
    return g;
  }, []);
  const card = useRef<THREE.Group>(null!);
  const mats = useMemo(() => ({
    strap: new THREE.MeshBasicMaterial({ color: COLORS[i], side: THREE.DoubleSide }),
    card: new THREE.MeshBasicMaterial({ map: cardTexture(i), transparent: true }),
  }), [i]);
  const base = useMemo(() => ({ strap: new THREE.Color(COLORS[i]), card: new THREE.Color("#ffffff") }), [i]);
  const goal = useMemo(() => new THREE.Color(), []);
  const push = useRef(new THREE.Vector3());
  useEffect(() => () => { mats.card.map?.dispose(); strap.dispose(); }, [mats, strap]);

  useFrame(({ clock }, dt) => {
    dt = Math.min(dt, 1 / 30);
    const t = clock.elapsedTime;
    const wind = Math.sin(t * 0.9 + i * 1.7) * 0.5 + Math.sin(t * 2.3 + i) * 0.2;  // a gentle draught
    for (let k = 1; k < N; k++) {
      const p = pts[k], v = p.clone().sub(prev[k]).multiplyScalar(0.985);  // damping
      prev[k].copy(p);
      p.add(v).add(new THREE.Vector3(wind * dt * dt * (k / N), -9.8 * dt * dt, 0));
      if (k === N - 1) { p.addScaledVector(push.current, dt); push.current.multiplyScalar(0.8); }
      p.z = Math.max(p.z, pin.z);  // the cork board is behind
    }
    for (let it = 0; it < 6; it++) {  // keep segment lengths
      pts[0].copy(pin);
      for (let k = 0; k < N - 1; k++) {
        const a = pts[k], b = pts[k + 1], d = b.clone().sub(a), err = (d.length() - SEG) / d.length();
        if (k === 0) b.addScaledVector(d, -err); else { a.addScaledVector(d, err / 2); b.addScaledVector(d, -err / 2); }
      }
    }
    const pos = strap.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < N; k++) {
      const dir = (k < N - 1 ? pts[k + 1].clone().sub(pts[k]) : pts[k].clone().sub(pts[k - 1])).normalize();
      const side = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(STRAP / 2);
      pos.setXYZ(2 * k, pts[k].x - side.x, pts[k].y - side.y, pts[k].z + 0.001);
      pos.setXYZ(2 * k + 1, pts[k].x + side.x, pts[k].y + side.y, pts[k].z + 0.001);
    }
    pos.needsUpdate = true; strap.computeBoundingSphere();
    const end = pts[N - 1], last = end.clone().sub(pts[N - 2]);
    card.current.position.copy(end);
    card.current.rotation.z = Math.atan2(last.x, -last.y);  // hang along the strap
    const k3 = 1 - Math.exp(-dt * 3);  // mood tint, multiplied onto each part's own colour
    mats.strap.color.lerp(goal.copy(base.strap).multiply(tint), k3);
    mats.card.color.lerp(goal.copy(base.card).multiply(tint), k3);
  });

  const nudge = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation(); onHover(true); document.body.style.cursor = "pointer";
    push.current.set((Math.random() - 0.5) * 0.6, 0.15, 0.05);
  };
  return (
    <>
      <mesh geometry={strap} material={mats.strap} />
      <group ref={card}>
        <mesh position={[0, -0.012, 0.004]}><boxGeometry args={[0.014, 0.024, 0.006]} /><meshBasicMaterial color="#9aa0a6" /></mesh>
        <mesh material={mats.card} position={[0, -0.02 - CARD[1] / 2, 0.003]}
          onPointerOver={nudge} onPointerOut={() => { onHover(false); document.body.style.cursor = ""; }}
          onClick={(e) => { e.stopPropagation(); onOpen(i); }}>
          <planeGeometry args={CARD} />
        </mesh>
      </group>
    </>
  );
}

export default function Lanyards({ tint, onOpen, onHover }: { tint: THREE.Color; onOpen: (i: number) => void; onHover: (on: boolean) => void }) {
  return <>{LANYARDS.map((_, i) => <Lanyard key={i} i={i} tint={tint} onOpen={onOpen} onHover={onHover} />)}</>;
}
