// The 9 rule checks from ReqAgent (github.com/ydvdeepesh/reqagent, src/reqagent/rules.py), ported to the browser.
// Keep the word lists in sync; rules.test.mjs checks the same cases. Run: node src/lib/rules.test.mjs

const MODAL = "(?:shall|must|will)";
const words = (...terms) => new RegExp("(?<![\\w-])(?:" + terms.join("|") + ")(?![\\w-])", "gi");

const VAGUE = words("user-friendly", "easy", "easily", "simple", "fast", "quick", "quickly", "slow",
  "adequate", "appropriate", "sufficient", "efficient", "efficiently", "flexible", "robust", "reliable",
  "intuitive", "normal", "typical", "good", "best", "state-of-the-art", "significant", "several",
  "some", "many", "few", "approximately", "as needed", "timely", "seamless");
const ESCAPE = words("if possible", "where possible", "as far as possible", "to the extent possible",
  "if practicable", "as far as practicable", "where feasible", "if feasible", "if necessary",
  "where necessary", "as appropriate");
const OPEN = words("etc\\.?", "and so on", "including but not limited to", "and the like");
const AND_OR = words("and/or", "as well as");
const PASSIVE = new RegExp("\\b" + MODAL + "\\s+(?:not\\s+)?be\\s+(?!able\\b)(\\w+(?:ed|en))\\b", "gi");
const NEGATIVE = new RegExp("\\b" + MODAL + "\\s+(?:not|never)\\b", "gi");
const PRONOUN = words("it", "its", "they", "them", "their");
const BOUND = words("at least", "at most", "no more than", "no less than", "up to", "maximum", "minimum");
const UNTESTABLE = words("minimi[sz]e", "maximi[sz]e", "optimi[sz]e", "optimal", "always", "as much as", "as little as");
const SHALL = new RegExp("\\b" + MODAL + "\\b", "gi");

const MESSAGES = {
  VAGUE: "Replace it with something a tester can measure.",
  ESCAPE: "It makes the requirement impossible to verify.",
  OPEN: "Name every item instead.",
  COMBINATOR: "Several requirements in one sentence. Split them.",
  PASSIVE: "Say which system or person does it.",
  NEGATIVE: "State what the system shall do instead.",
  PRONOUN: "Repeat the noun so the requirement stands on its own.",
  UNBOUNDED: "Give a number with a unit.",
  NO_SHALL: "Use \"shall\" so the requirement is binding.",
};
const NAMES = {
  VAGUE: "Vague term", ESCAPE: "Escape clause", OPEN: "Open-ended list", COMBINATOR: "Two in one",
  PASSIVE: "No actor", NEGATIVE: "Negative", PRONOUN: "Pronoun", UNBOUNDED: "Unbounded", NO_SHALL: "No \"shall\"",
};

export function check(text) {
  const hits = [];
  const all = (re) => [...text.matchAll(re)];
  const add = (code, re, skipProperNames) => {
    for (const m of all(re)) {
      // "Fast Fourier Transform" is a name, not a vague term
      if (skipProperNames && /[A-Z]/.test(m[0][0]) && m.index > 0) continue;
      hits.push([code, m.index, m.index + m[0].length]);
    }
  };
  add("VAGUE", VAGUE, true);
  add("ESCAPE", ESCAPE);
  add("OPEN", OPEN);
  add("COMBINATOR", AND_OR);
  const shalls = all(SHALL);
  if (shalls.length > 1) hits.push(["COMBINATOR", shalls[1].index, shalls[1].index + shalls[1][0].length]);
  for (const m of all(PASSIVE)) {
    const end = m.index + m[0].length;
    if (!/\bby\b/i.test(text.slice(end))) hits.push(["PASSIVE", m.index, end]);
  }
  add("NEGATIVE", NEGATIVE);
  add("PRONOUN", PRONOUN);
  for (const m of all(BOUND)) {
    const end = m.index + m[0].length;
    if (!/^\s*\d/.test(text.slice(end))) hits.push(["UNBOUNDED", m.index, end]);
  }
  add("UNBOUNDED", UNTESTABLE);
  if (shalls.length === 0 && text.trim()) hits.push(["NO_SHALL", 0, text.length]);
  return hits.sort((a, b) => a[1] - b[1]).map(([code, start, end]) => ({ code, start, end, name: NAMES[code], message: MESSAGES[code] }));
}

