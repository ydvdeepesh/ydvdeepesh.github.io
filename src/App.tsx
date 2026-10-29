import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import Plain from "./Plain";

// three.js only loads for visitors who get the room
const Room3D = lazy(() => import("./Room3D"));

const canRun3D = () => {
  if (window.matchMedia("(max-width: 760px)").matches) return false;
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
};
const wantsPlain = () => location.hash === "#plain" || (location.hash !== "#room" && !canRun3D());

/** If the room can't load (old GPU, blocked file), show the plain page instead of a blank screen. */
class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Plain /> : this.props.children; }
}

export default function App() {
  const [plain, setPlain] = useState(wantsPlain);
  useEffect(() => {
    const onHash = () => setPlain(wantsPlain());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return plain ? <Plain /> : <Fallback><Suspense fallback={<div className="loader">Setting up the desk…</div>}><Room3D /></Suspense></Fallback>;
}
