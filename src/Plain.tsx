// The quick-read page (phones, no WebGL, or "Plain view"): the original dark look of the site, with current content.
// Facts come from job-hunt/experience/bank.yaml and facts.md; keep them in sync.
import { useEffect, useRef, useState } from "react";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/fraunces/latin-600.css";
import "@fontsource/fraunces/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./plain.css";
import { LINKS, RequirementCheck } from "./content";

export const HEADLINE = "I build AI tools that work inside real engineering teams.";

const SECTIONS = ["about", "skills", "experience", "projects", "education", "contact"];

const ICONS = {
  mail: "M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  linkedin: "M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8h4V23h-4V8zm7.5 0h3.8v2.1h.05c.53-1 1.83-2.1 3.77-2.1 4.03 0 4.78 2.65 4.78 6.1V23h-4v-6.3c0-1.5-.03-3.4-2.07-3.4-2.07 0-2.39 1.6-2.39 3.3V23h-4V8z",
  github: "M12 .5a12 12 0 00-3.79 23.4c.6.11.82-.26.82-.58v-2.1c-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.34-1.77-1.34-1.77-1.1-.75.08-.73.08-.73 1.21.09 1.85 1.25 1.85 1.25 1.08 1.84 2.83 1.31 3.52 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.64.24 2.86.12 3.16.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.62-5.47 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0012 .5z",
  cube: "M12 2l9 5v10l-9 5-9-5V7l9-5zm0 2.3L5.2 8 12 11.7 18.8 8 12 4.3zM5 9.7v6.1l6 3.4v-6.2L5 9.7zm8 9.5l6-3.4V9.7l-6 3.3v6.2z",
};
const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
const Chips = ({ items }: { items: string[] }) => <div className="chip-row">{items.map((c) => <span key={c}>{c}</span>)}</div>;
const ext = { target: "_blank", rel: "noreferrer" };

const SKILLS: [string, string[]][] = [
  ["AI & LLM engineering", ["LLMs", "RAG", "LangGraph", "LangChain", "LangSmith", "OpenAI", "Gemini", "Claude", "Hugging Face", "Self-hosted models", "Prompt engineering"]],
  ["Software & deployment", ["Python", "TypeScript", "JavaScript", "Java", "React", "FastAPI", "Docker", "Kubernetes", "GitHub Actions", "Azure"]],
  ["Systems engineering & MBSE", ["MBSE", "SysML v1/v2", "RFLP", "Requirements", "Architecture", "Automotive SPICE"]],
  ["Tools & platforms", ["Cameo", "Enterprise Architect", "Codebeamer", "Jira", "Confluence", "n8n", "Google AI Studio"]],
  ["Standards", ["ISO 15288", "ISO 26262", "ISO 21434", "Functional Safety", "Cybersecurity"]],
  ["Languages", ["English (C1)", "German (B1, actively improving)"]],
];

const EXPERIENCE: { title: string; meta: string; impact: string[]; how: string[]; chips: string[] }[] = [
  { title: "AI-Augmented ASPICE Assessment Tool", meta: "LLM compliance automation",
    impact: ["Cut manual compliance review effort by 40%.", "100% consistent stakeholder evaluations through structured reports."],
    how: ["End-to-end RAG pipeline: document ingestion, semantic retrieval, LLM reasoning.", "React front end to explore the AI-generated findings."],
    chips: ["Python", "FastAPI", "React", "RAG", "Gemini", "OpenAI"] },
  { title: "LLM Requirements Assistant for Codebeamer", meta: "Browser extension in the live toolchain",
    impact: ["Engineers query requirements, test cases and use cases in plain language inside Codebeamer.", "Four checks: INCOSE rules, contradictions and gaps, overlap, free-form questions."],
    how: ["Chrome extension (Manifest V3) on the Codebeamer REST API.", "OpenAI models for the analysis."],
    chips: ["TypeScript", "Codebeamer", "OpenAI", "INCOSE"] },
  { title: "LLM-Based Internal Q&A System", meta: "Private engineering knowledge",
    impact: ["Information retrieval 60% faster, answers in under 2 seconds.", "GDPR-friendly: gpt-oss and DeepSeek on Fraunhofer's own servers."],
    how: ["RAG over internal knowledge bases with a React front end.", "FastAPI, FAISS and Redis, shipped with Docker and Kubernetes."],
    chips: ["RAG", "Self-hosted LLMs", "React", "Kubernetes"] },
  { title: "SysML-Based System Architecture", meta: "Government-funded research project",
    impact: ["Traceability for 500+ requirements across system levels.", "Smoother decomposition work between interdisciplinary teams."],
    how: ["SysML architecture modelling in Cameo Systems Modeler.", "Models later reused as inputs for AI-assisted analysis."],
    chips: ["MBSE", "SysML", "Cameo", "ISO 15288"] },
  { title: "GenSYS: GenAI for SysML Models", meta: "Product Owner, 2023 to 2024",
    impact: ["Led a team of 6 developers: vision, backlog, sprints, stakeholders.", "Live demo to 50+ industry and academic participants."],
    how: ["Natural-language interaction with SysML v2 models.", "SysML 1.x diagram images converted into SysML v2 models."],
    chips: ["SysML v2", "RAG", "Python", "Jira"] },
  { title: "Cybersecurity Solution Concept", meta: "Automotive wiring harness",
    impact: ["Identified potential vulnerability points in vehicle wiring systems.", "Mapped safety-critical flows and use cases."],
    how: ["RFLP architecture and flow modelling.", "Enterprise Architect for system decomposition."],
    chips: ["RFLP", "SysML", "Enterprise Architect", "ISO 21434"] },
];

/** The old site's motion: tilting cards, sections that rise in, drifting dots that move away from the cursor. */
function useOldSiteMotion(root: React.RefObject<HTMLDivElement | null>, canvas: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const el = root.current!, cv = canvas.current!, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const off: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(t: Window | Element, ev: K, fn: (e: WindowEventMap[K]) => void) => {
      t.addEventListener(ev, fn as EventListener); off.push(() => t.removeEventListener(ev, fn as EventListener));
    };
    if (!reduce) el.querySelectorAll<HTMLElement>("[data-tilt]").forEach((card) => {
      on(card, "pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const rx = Math.max(-10, Math.min(10, ((e.clientY - r.top) / r.height - 0.5) * -12));
        const ry = Math.max(-10, Math.min(10, ((e.clientX - r.left) / r.width - 0.5) * 12));
        card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(18px) scale(1.02)`;
        card.style.boxShadow = "0 35px 70px rgba(0, 0, 0, 0.45)";
      });
      on(card, "pointerleave", () => { card.style.transform = ""; card.style.boxShadow = ""; });
    });
    const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && x.target.classList.add("show")), { threshold: 0.12 });
    el.querySelectorAll("section").forEach((s) => { s.classList.add("reveal"); io.observe(s); });
    off.push(() => io.disconnect());

    const ctx = cv.getContext("2d")!;
    const mouse = { x: -9999, y: -9999 };
    let dots: { x: number; y: number; vx: number; vy: number; ox: number; oy: number; r: number }[] = [];
    const resize = () => {
      cv.width = innerWidth; cv.height = innerHeight;
      dots = Array.from({ length: Math.floor((innerWidth * innerHeight) / 2800) }, () => ({
        x: Math.random() * cv.width, y: Math.random() * cv.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, ox: 0, oy: 0, r: 0.8 + Math.random() * 1.4 }));
    };
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height); ctx.fillStyle = "rgba(255,255,255,0.22)";
      for (const d of dots) {
        if (!reduce) { d.x += d.vx; d.y += d.vy; }
        if (d.x < 0 || d.x > cv.width) d.vx *= -1;
        if (d.y < 0 || d.y > cv.height) d.vy *= -1;
        const dx = d.x - mouse.x, dy = d.y - mouse.y, dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < 110) { const f = (110 - dist) / 110; d.ox = (dx / dist) * f * 26; d.oy = (dy / dist) * f * 26; } else { d.ox *= 0.9; d.oy *= 0.9; }
        ctx.beginPath(); ctx.arc(d.x + d.ox, d.y + d.oy, d.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    resize(); draw(); off.push(() => cancelAnimationFrame(raf));
    on(window, "resize", resize);
    on(window, "pointermove", (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      el.style.setProperty("--mx", `${(e.clientX / innerWidth) * 100}%`); el.style.setProperty("--my", `${(e.clientY / innerHeight) * 100}%`);
    });
    on(window, "scroll", () => {
      const s = scrollY, o = (c: string, t: string) => { const n = el.querySelector<HTMLElement>(c); if (n) n.style.transform = t; };
      o(".orb-1", `translate3d(${s * 0.02}px, ${s * 0.04}px, 0)`); o(".orb-2", `translate3d(${s * -0.03}px, ${s * 0.02}px, 0)`); o(".orb-3", `translate3d(-50%, ${s * -0.02}px, 0)`);
    });
    return () => off.forEach((f) => f());
  }, [root, canvas]);
}

function useActiveSection() {
  const [active, setActive] = useState("about");
  useEffect(() => {
    const update = () => {
      let a = SECTIONS[0];
      for (const id of SECTIONS) {
        const r = document.getElementById(id)?.getBoundingClientRect();
        if (r && r.top <= innerHeight * 0.45 && r.bottom > innerHeight * 0.2) a = id;
      }
      setActive(a);
    };
    update(); addEventListener("scroll", update); addEventListener("resize", update);
    return () => { removeEventListener("scroll", update); removeEventListener("resize", update); };
  }, []);
  return active;
}

export default function Plain() {
  const root = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [menu, setMenu] = useState(false);
  const active = useActiveSection();
  useOldSiteMotion(root, canvas);
  const go = (id: string) => (e: React.MouseEvent) => {  // section links must not touch the hash: "#plain" / "#room" route the app
    e.preventDefault(); setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  const navLinks = SECTIONS.map((id) => (
    <a key={id} href={`#${id}`} onClick={go(id)} className={active === id ? "active" : undefined}>{id[0].toUpperCase() + id.slice(1)}</a>
  ));

  return (
    <div className="plain-site" ref={root}>
      <div className="bg-orb orb-1" aria-hidden="true" />
      <div className="bg-orb orb-2" aria-hidden="true" />
      <div className="bg-orb orb-3" aria-hidden="true" />
      <div className="grid-sheen" aria-hidden="true" />
      <canvas id="dot-field" ref={canvas} aria-hidden="true" />
      <div className="depth-panel panel-1" aria-hidden="true" />
      <div className="depth-panel panel-2" aria-hidden="true" />
      <div className="depth-panel panel-3" aria-hidden="true" />

      <header className="nav">
        <div className="logo">DY</div>
        <nav aria-label="Sections">{navLinks}</nav>
        <div className="nav-actions">
          <a className="icon-btn" href={LINKS.email} aria-label="Email"><Icon d={ICONS.mail} /></a>
          <a className="icon-btn" href={LINKS.linkedin} {...ext} aria-label="LinkedIn"><Icon d={ICONS.linkedin} /></a>
          <a className="icon-btn primary" href="#room" aria-label="Walk around my desk in 3D" title="Walk around my desk in 3D"><Icon d={ICONS.cube} /></a>
          <button className="menu-toggle" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>Menu</button>
        </div>
      </header>
      <div className={`mobile-nav${menu ? " open" : ""}`} aria-hidden={!menu}>
        <button className="menu-close" onClick={() => setMenu(false)}>Close</button>
        {navLinks}
        <div className="mobile-links">
          <a className="btn ghost" href={LINKS.linkedin} {...ext}>LinkedIn</a>
          <a className="btn primary" href="#room">My desk in 3D</a>
        </div>
      </div>

      <div className="scene">
        <main>
          <section className="intro" id="about">
            <div className="intro-grid alt-hero">
              <div className="intro-media circle">
                <figure className="portrait-circle tilt" data-tilt>
                  <img src={`${import.meta.env.BASE_URL}photo.jpeg`} alt="Deepesh Yadav" width={420} height={420} />
                </figure>
                <div className="floating-figures" aria-hidden="true"><span className="float-dot" /><span className="float-ring" /><span className="float-triangle" /></div>
              </div>
              <div className="intro-inner">
                <h1>Deepesh <span>Yadav</span></h1>
                <h2>AI & Systems Engineer</h2>
                <p className="intro-lead">LLM agents • RAG • MBSE • SysML • Automotive</p>
                <div className="intro-meta">
                  <span>Paderborn, Germany</span>
                  <span>Open to relocation (Germany/EU)</span>
                  <span>Available immediately</span>
                </div>
                <div className="intro-actions">
                  <a className="btn primary" href="#contact" onClick={go("contact")}>Let's connect</a>
                  <a className="btn ghost" href="#room">Walk around my desk in 3D</a>
                </div>
              </div>
            </div>
            <div className="scroll-hint"><span /><p>Scroll for details</p></div>
          </section>

          <section className="hero detail" aria-label="Overview">
            <div className="hero-copy">
              <p className="eyebrow">Overview</p>
              <h2>{HEADLINE}</h2>
              <p className="lead">
                LLM agents, RAG pipelines and the software around them, from the first prototype to a deployed service. Two and a half
                years of research projects at Fraunhofer IEM also gave me real systems engineering depth: SysML, MBSE and Automotive SPICE.
              </p>
              <div className="hero-meta"><span>AI engineering</span><span>Prototypes that ship</span><span>Systems engineering</span></div>
            </div>
            <div className="hero-stack">
              <div className="holo-card tilt" data-tilt>
                <div className="card-top"><p className="label">Core focus</p><h3>LLM agents • RAG • MBSE</h3></div>
                <div className="card-body">
                  <p>Turning unclear problem statements into working AI prototypes, and bridging AI with requirements, architecture and compliance work.</p>
                  <Chips items={["LangGraph", "RFLP", "V-Model", "V&V"]} />
                </div>
              </div>
              <div className="holo-card tilt" data-tilt>
                <div className="card-top"><p className="label">Tech stack</p><h3>Python • TypeScript • React • FastAPI</h3></div>
                <div className="card-body">
                  <p>Built AI-augmented assessment tools, internal Q&A systems and LLM plugins for engineering tools, and shipped them with Docker and CI/CD.</p>
                  <Chips items={["RAG", "OpenAI", "Gemini", "LangChain", "Docker", "Azure"]} />
                </div>
              </div>
              <div className="holo-card tilt" data-tilt>
                <div className="card-top"><p className="label">Impact</p><h3>40% less manual compliance review</h3></div>
                <div className="card-body">
                  <p>Measurable results from structured reporting pipelines and LLM analysis of engineering artifacts.</p>
                  <Chips items={["ASPICE", "ISO 26262", "ISO 21434"]} />
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="skills">
            <div className="section-title"><h2>Skill matrix</h2><h3>AI engineering, with systems engineering depth.</h3></div>
            <div className="skill-grid">
              {SKILLS.map(([title, items]) => <div className="skill-card tilt" data-tilt key={title}><h3>{title}</h3><Chips items={items} /></div>)}
            </div>
          </section>

          <section className="section" id="experience">
            <div className="section-title">
              <h2>Experience</h2>
              <p>Fraunhofer IEM, Paderborn · Student Research Assistant (Aug 2023 to Mar 2026)</p>
            </div>
            <div className="experience-board">
              {EXPERIENCE.map((x) => (
                <article className="experience-card tilt" data-tilt key={x.title}>
                  <div className="experience-head"><h3>{x.title}</h3><span className="experience-meta">{x.meta}</span></div>
                  <div className="experience-body">
                    <div className="experience-col"><h4>Impact</h4><ul>{x.impact.map((i) => <li key={i}>{i}</li>)}</ul></div>
                    <div className="experience-col"><h4>How</h4><ul>{x.how.map((i) => <li key={i}>{i}</li>)}</ul></div>
                  </div>
                  <Chips items={x.chips} />
                </article>
              ))}
            </div>
            <p className="nda-note">Most of this work, my Master's thesis and GenSYS are under NDA, so the code isn't public.</p>
          </section>

          <section className="section" id="projects">
            <div className="section-title"><h2>Projects</h2><p>Things I build in the open.</p></div>
            <div className="project-grid">
              <article className="project-card featured tilt" data-tilt>
                <div className="project-header"><h3>ReqAgent</h3><span>Live on Azure</span></div>
                <p>
                  Reviews natural-language requirements the way a systems engineer would on a first pass. A LangGraph pipeline runs nine
                  rule checks, uses local embeddings and ChromaDB to pick which pairs an LLM should compare, flags duplicates and conflicts,
                  suggests rewrites and exports SysML v2.
                </p>
                <div className="metrics">
                  <div><strong>0.89 / 0.94</strong><span>precision / recall on duplicates and conflicts</span></div>
                  <div><strong>0.95 / 0.87</strong><span>precision / recall of the rule checks</span></div>
                  <div><strong>101</strong><span>hand-labelled requirements</span></div>
                </div>
                <RequirementCheck />
                <div className="project-links">
                  <a className="btn primary" href={LINKS.demo} {...ext}>Live demo</a>
                  <a className="btn ghost" href={LINKS.reqagent} {...ext}>Code on GitHub</a>
                </div>
                <Chips items={["LangGraph", "LangSmith", "ChromaDB", "FastAPI", "Docker", "Kubernetes", "Azure"]} />
              </article>
              <article className="project-card tilt" data-tilt>
                <div className="project-header"><h3>RepMind</h3><span>In development</span></div>
                <p>An offline-first workout tracker you can log sets with by voice or in plain words. The goal: log a set in under five seconds.</p>
                <div className="project-links"><a className="btn ghost" href={LINKS.repmind} {...ext}>Code on GitHub</a></div>
                <Chips items={["Flutter", "FastAPI", "llama.cpp", "whisper.cpp"]} />
              </article>
              <article className="project-card tilt" data-tilt>
                <div className="project-header"><h3>InterviewHelp</h3><span>Private</span></div>
                <p>
                  A desktop app for mock interviews. It builds a persona from the candidate's CV, the job description and notes on the
                  interviewer, listens to the microphone and the speakers, spots each question as it's asked, drafts a sample answer
                  alongside and scores both in real time. Windows today, macOS untested.
                </p>
                <div className="project-links"><a className="btn ghost" href={LINKS.linkedin} {...ext}>Ask for access on LinkedIn</a></div>
                <Chips items={["Electron", "TypeScript", "OpenAI", "Speech-to-text", "Encrypted SQLite"]} />
              </article>
              <article className="project-card tilt" data-tilt>
                <div className="project-header"><h3>Research Analysis Tool</h3><span>Late 2025</span></div>
                <p>Extracts and summarises engineering challenges from 50+ academic dissertations, cutting literature review from weeks to hours, with 95% extraction precision across Gemini, Claude and OpenAI.</p>
                <Chips items={["RAG", "GraphRAG", "Neo4j", "LangChain", "n8n"]} />
              </article>
            </div>
          </section>

          <section className="section" id="education">
            <div className="section-title"><h2>Education</h2><p>Computer science, with a focus on systems and AI.</p></div>
            <div className="edu-grid">
              <article className="edu-card tilt" data-tilt>
                <h3>M.Sc. in Computer Science</h3>
                <p>Paderborn University, Germany (Oct 2022 to Nov 2026, expected)</p>
                <p className="project-highlight">
                  Thesis: AI-augmented alternative architecture generation. Several LLMs and a Cameo plugin cut the time to generate valid
                  architecture alternatives by 35%.
                </p>
              </article>
              <article className="edu-card tilt" data-tilt>
                <h3>B.Tech. in Information Technology</h3>
                <p>JSS Academy of Technical Education, India (Aug 2017 to Jul 2021)</p>
              </article>
            </div>
          </section>

          <section className="section contact" id="contact">
            <div className="section-title">
              <h2>Let's build together</h2>
              <p>Open to AI engineering, forward deployed and systems engineering roles in Germany and the EU.</p>
            </div>
            <div className="contact-tiles">
              <a className="contact-tile tilt" data-tilt href={LINKS.email}><div className="tile-icon"><Icon d={ICONS.mail} /></div><h3>Email</h3><p>deepeshdeu@gmail.com</p></a>
              <a className="contact-tile tilt" data-tilt href={LINKS.linkedin} {...ext}><div className="tile-icon"><Icon d={ICONS.linkedin} /></div><h3>LinkedIn</h3><p>linkedin.com/in/deepeshy</p></a>
              <a className="contact-tile tilt" data-tilt href={LINKS.github} {...ext}><div className="tile-icon"><Icon d={ICONS.github} /></div><h3>GitHub</h3><p>github.com/ydvdeepesh</p></a>
              <a className="contact-tile tilt" data-tilt href="#room"><div className="tile-icon"><Icon d={ICONS.cube} /></div><h3>My desk in 3D</h3><p>Click around the room</p></a>
            </div>
          </section>
        </main>
        <footer className="footer"><p>Built with an MBSE mindset and AI curiosity.</p></footer>
      </div>
    </div>
  );
}
