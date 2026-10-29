// Everything a visitor reads. Facts come from job-hunt/experience/facts.md and bank.yaml; keep them in sync.
import { useEffect, useState, type ReactNode } from "react";
import { check } from "./lib/rules.js";

export const LINKS = {
  linkedin: "https://www.linkedin.com/in/deepeshy/",
  email: "mailto:deepeshdeu@gmail.com",
  github: "https://github.com/ydvdeepesh",
  reqagent: "https://github.com/ydvdeepesh/reqagent",
  demo: "https://reqagent.graybeach-f9d0c697.belgiumcentral.azurecontainerapps.io/",
  repmind: "https://github.com/ydvdeepesh/repminds",
  instagram: "https://www.instagram.com/deepesh.07/",
  chess: "https://www.chess.com/member/dailybleh",
};

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target={href.startsWith("mailto") ? undefined : "_blank"} rel="noreferrer">{children}</a>
);

const SAMPLE = "The system shall respond quickly and/or log errors if possible.";

/** ReqAgent's rule checks, live in the browser. */
export function RequirementCheck() {
  const [text, setText] = useState(SAMPLE);
  const findings = check(text);
  const marked: ReactNode[] = [];
  let at = 0;
  for (const f of findings.filter((f) => f.code !== "NO_SHALL")) {
    if (f.start < at) continue;
    marked.push(text.slice(at, f.start), <mark key={f.start} title={f.name}>{text.slice(f.start, f.end)}</mark>);
    at = f.end;
  }
  marked.push(text.slice(at));
  return (
    <div className="check">
      <label htmlFor="req">Try it: write a requirement</label>
      <textarea id="req" value={text} onChange={(e) => setText(e.target.value)} rows={2} spellCheck={false} />
      <p className="check-marked" aria-hidden>{marked}</p>
      <ul className="check-findings" aria-live="polite">
        {findings.length === 0 ? <li className="ok">No problems found. A tester could check this one.</li> :
          findings.map((f) => <li key={f.code + f.start}><strong>{f.name}:</strong> {f.message}</li>)}
      </ul>
    </div>
  );
}

export function Projects() {
  return (
    <section className="projects">
      <p className="kicker">Projects</p>
      <article className="project hero">
        <h3>ReqAgent</h3>
        <p>
          Reviews natural-language requirements the way a systems engineer would on a first pass. A LangGraph pipeline runs nine rule
          checks, uses local embeddings and ChromaDB to choose which pairs an LLM should compare, labels duplicates and conflicts,
          suggests rewrites and exports SysML v2.
        </p>
        <table>
          <thead><tr><th>On 101 hand-labelled requirements</th><th>Precision</th><th>Recall</th></tr></thead>
          <tbody>
            <tr><td>Rule checks</td><td>0.945</td><td>0.867</td></tr>
            <tr><td>Duplicates and conflicts (LLM)</td><td>0.889</td><td>0.941</td></tr>
          </tbody>
        </table>
        <RequirementCheck />
        <p className="links"><A href={LINKS.demo}>Live demo</A> <A href={LINKS.reqagent}>Code on GitHub</A></p>
        <p className="small">Python, LangGraph, LangSmith, Groq, ChromaDB, FastAPI, Docker, Kubernetes test cluster, Azure Container Apps. The first demo request can take a minute while the server starts.</p>
      </article>
      <article className="project">
        <h3>RepMind <span className="tag">in development</span></h3>
        <p>An offline-first workout tracker with natural-language and voice logging. The goal: log a set in under five seconds. Flutter, FastAPI, llama.cpp and whisper.cpp running locally.</p>
        <p className="links"><A href={LINKS.repmind}>Code on GitHub</A></p>
      </article>
      <article className="project">
        <h3>InterviewHelp <span className="tag">private</span></h3>
        <p>A desktop app for mock interviews. It builds a persona from the candidate's CV, the job description and notes on the interviewer, listens to the microphone and the speakers, spots each question as it's asked, drafts a sample answer alongside and scores both. Windows today, macOS untested. Private for now: message me on LinkedIn for access.</p>
        <p className="links"><A href={LINKS.linkedin}>Ask on LinkedIn</A></p>
      </article>
    </section>
  );
}

export function About() {
  return (
    <section className="about">
      <img src={`${import.meta.env.BASE_URL}photo.jpeg`} alt="Deepesh Yadav" width={120} height={120} />
      <p className="kicker">About me</p>
      <p>
        I build AI tools that work inside real engineering teams: LLM agents, RAG pipelines and the software around them, with systems engineering depth from Fraunhofer IEM. I'm from India and live in
        Paderborn, Germany, with valid German work authorisation. I can start right away and I'm open to moving anywhere in Germany or the EU.
      </p>
      <h4>Where I studied</h4>
      <ul className="timeline">
        <li><strong>M.Sc. Computer Science</strong>, Paderborn University <span>2022 to 2026</span></li>
        <li><strong>B.Tech. Information Technology</strong>, JSS Academy of Technical Education, India <span>2017 to 2021</span></li>
      </ul>
      <h4>What I work with</h4>
      <p className="small">
        LLMs, RAG, LangChain, LangGraph, LangSmith, self-hosted models · Python, TypeScript, Java, React, FastAPI · Docker, Kubernetes,
        GitHub Actions, Azure · MBSE, SysML v1 and v2, requirements engineering, Cameo, Codebeamer, Automotive SPICE
      </p>
      <p className="small">English (C1) · German (B1, improving)</p>
    </section>
  );
}

export function Contact() {
  return (
    <section className="contact">
      <p className="kicker">Talk with me</p>
      <p>The quickest way to reach me is a LinkedIn message.</p>
      <ul className="link-list">
        <li><A href={LINKS.linkedin}>LinkedIn</A></li>
        <li><A href={LINKS.email}>deepeshdeu@gmail.com</A></li>
        <li><A href={LINKS.github}>GitHub</A></li>
        <li><A href={LINKS.instagram}>Instagram</A></li>
        <li><A href={LINKS.chess}>Chess.com</A></li>
      </ul>
    </section>
  );
}

/** The phone on the desk: three ways to reach me, big enough to read. */
export function PhoneContact() {
  return (
    <section className="phone-ui">
      <p className="time">Talk with me</p>
      <p className="quip">Maxel screens my calls. Recruiters always get through.</p>
      <A href={LINKS.linkedin}><span>LinkedIn</span><small>fastest reply</small></A>
      <A href={LINKS.email}><span>Email</span><small>deepeshdeu@gmail.com</small></A>
      <A href={LINKS.github}><span>GitHub</span><small>ydvdeepesh</small></A>
    </section>
  );
}

export const LANYARDS = [
  { key: "fraunhofer", org: "Fraunhofer IEM, Paderborn", role: "Student Research Assistant", years: "Aug 2023 to Mar 2026", points: [
    "A Chrome extension that adds an LLM assistant to Codebeamer and checks requirements against the INCOSE rules.",
    "An Automotive SPICE assessment tool with a Python RAG pipeline. Manual review effort dropped by 40%.",
    "A Q&A system on gpt-oss and DeepSeek running on Fraunhofer's own servers, answering in under 2 seconds.",
    "The SysML architecture of a government-funded project, with 500+ requirements traced across system levels.",
  ], note: "Most of this work, my Master's thesis and the GenSYS project are under NDA, so the code isn't public." },
  { key: "gdg", org: "GDG Paderborn", role: "Team member", years: "Since 2023", points: ["Part of the Google Developer Group Paderborn team since the group started."] },
  { key: "isg", org: "ISG Paderborn", role: "Volunteer", years: "", points: ["Volunteering and leadership: organising cultural activities and events."] },
  { key: "asv", org: "ASV Paderborn", role: "Volunteer", years: "", points: ["Volunteering and leadership: organising cultural activities and events."] },
];

export function Story() {
  return (
    <section className="story">
      <p className="kicker">Story board</p>
      {LANYARDS.map((l) => (
        <article key={l.key} className={`lanyard ${l.key}`}>
          <h3>{l.org}</h3>
          <p className="meta">{l.role}{l.years && ` · ${l.years}`}</p>
          <ul>{l.points.map((p) => <li key={p}>{p}</li>)}</ul>
          {l.note && <p className="small">{l.note}</p>}
        </article>
      ))}
    </section>
  );
}

export const COUNTRIES = { home: ["India (where I'm from)", "Germany (where I live)"],
  visited: ["Portugal", "Spain", "France", "Czech Republic", "Netherlands", "Poland", "Italy", "Luxembourg", "Switzerland"] };

export function Travel() {
  return (
    <section className="travel">
      <p className="kicker">Places</p>
      <p>Where I'm from, where I live, and the countries I've visited so far.</p>
      <ul className="pills">
        {COUNTRIES.home.map((c) => <li key={c} className="home">{c}</li>)}
        {COUNTRIES.visited.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <p className="links"><A href={LINKS.instagram}>Photos on Instagram</A></p>
    </section>
  );
}

type Stats = Record<string, { last?: { rating: number }; highest?: { rating: number } }>;
const MODES: [string, string][] = [["chess_rapid", "Rapid"], ["chess_blitz", "Blitz"], ["chess_bullet", "Bullet"], ["chess_daily", "Daily"], ["tactics", "Puzzles"]];

export function Chess() {
  const [stats, setStats] = useState<Stats | null | "error">(null);
  useEffect(() => {
    fetch("https://api.chess.com/pub/player/dailybleh/stats").then((r) => (r.ok ? r.json() : Promise.reject())).then(setStats, () => setStats("error"));
  }, []);
  return (
    <section className="chess">
      <p className="kicker">Chess</p>
      <p>I play on Chess.com as <strong>Dailybleh</strong>. Send me a challenge.</p>
      {stats === null && <p className="small">Loading ratings…</p>}
      {stats === "error" && <p className="small">The ratings didn't load. They're on my profile.</p>}
      {stats && stats !== "error" && (
        <dl className="ratings">
          {MODES.filter(([k]) => stats[k]).map(([k, label]) => (
            <div key={k}><dt>{label}</dt><dd>{stats[k].last?.rating ?? stats[k].highest?.rating}</dd></div>
          ))}
        </dl>
      )}
      <p className="links"><A href={LINKS.chess}>Add me on Chess.com</A></p>
    </section>
  );
}

export function Gym() {
  return (
    <section className="gym">
      <p className="kicker">Gym</p>
      <p>I train and follow bodybuilding. Happy to talk diet and workouts any time. My favourite classic physique athlete is Chris Bumstead (CBum).</p>
      <p>I'm also building RepMind, a workout tracker you can log sets with by voice or in plain words.</p>
      <p className="links"><A href={LINKS.linkedin}>Talk gym with me</A></p>
    </section>
  );
}

const QA: [string, string][] = [
  ["Who are you?", "I'm Maxel, a brown miniature bull terrier. I keep an eye on the desk."],
  ["What does Deepesh do?", "He builds LLM tools for systems engineers: requirements checks, architecture and compliance work. His latest is ReqAgent, it's on the big screen."],
  ["Is he looking for a job?", "Yes. AI engineering, forward deployed and systems engineering roles, anywhere in Germany or the EU. He can start right away."],
  ["Where is he from?", "India. He lives in Paderborn, Germany, and has valid German work authorisation."],
  ["What does he like besides work?", "Chess, the gym, and travelling around Europe. And me, obviously."],
  ["How do I reach him?", "Send him a message on LinkedIn. He answers faster than I fetch."],
];

export function AskMaxel() {
  const [i, setI] = useState<number | null>(null);
  return (
    <section className="maxel">
      <p className="kicker">Ask Maxel</p>
      <p className="bubble" aria-live="polite">{i === null ? "Woof. Pick a question." : QA[i][1]}</p>
      <div className="questions">
        {QA.map(([q], k) => <button key={q} onClick={() => setI(k)} aria-pressed={i === k}>{q}</button>)}
      </div>
    </section>
  );
}

export const CREDITS = (
  <p className="credits">
    "Bull Terrier" (<A href="https://skfb.ly/oRHnN">skfb.ly/oRHnN</A>) by kenchoo, licensed under{" "}
    <A href="http://creativecommons.org/licenses/by/4.0/">CC BY 4.0</A>, recoloured to look like Maxel. Country shapes from Natural Earth.
  </p>
);
