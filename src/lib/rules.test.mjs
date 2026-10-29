// Same cases as reqagent/tests/test_rules.py. Run: node src/lib/rules.test.mjs
import assert from "node:assert";
import { check } from "./rules.js";
const codes = (t) => new Set(check(t).map((f) => f.code));

assert.deepStrictEqual(codes("The pump controller shall stop the pump within 200 ms of a stop command."), new Set());
for (const [code, text] of [
  ["VAGUE", "The interface shall be user-friendly for operators."],
  ["VAGUE", "The system shall respond quickly to the operator."],
  ["ESCAPE", "The logger shall store all events if possible."],
  ["OPEN", "The display shall show speed, altitude, etc."],
  ["COMBINATOR", "The operator shall start and/or stop the pump."],
  ["COMBINATOR", "The system shall log errors. The system shall send alerts."],
  ["PASSIVE", "The warning shall be displayed within 2 s."],
  ["NEGATIVE", "The valve shall not open during startup."],
  ["PRONOUN", "The sensor shall report its status every 10 s."],
  ["UNBOUNDED", "The battery shall last at least a full shift."],
  ["UNBOUNDED", "The system shall minimize energy use."],
  ["NO_SHALL", "The pump stops within 200 ms."],
  ["NO_SHALL", "The pump should stop within 200 ms."],
]) assert.ok(codes(text).has(code), `${code} missed in: ${text}`);
for (const [code, text] of [
  ["PASSIVE", "The report shall be approved by the safety manager."],
  ["PASSIVE", "The operator shall be able to stop the pump."],
  ["UNBOUNDED", "The battery shall last at least 8 hours."],
  ["VAGUE", "The system shall use the Fast Fourier Transform."],
  ["PRONOUN", "The system shall reject commands that lack a checksum."],
]) assert.ok(!codes(text).has(code), `${code} false positive in: ${text}`);

const text = "The interface shall be user-friendly.";
const f = check(text).find((x) => x.code === "VAGUE");
assert.strictEqual(text.slice(f.start, f.end).toLowerCase(), "user-friendly");
console.log("rules.js: all checks pass");
