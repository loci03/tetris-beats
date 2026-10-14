// Commands — Bust a Groove's command system as data and pure functions.
//
// ORIGINAL MECHANICS (Bust a Groove, PS1 1998 — see story/BAG-RESEARCH.md):
//   • One command per 4-beat measure: a sequence of directions entered in
//     order any time before beat 4 (not timed individually), then the
//     command's button — ✕ or ○ — pressed ON beat 4.
//   • Commands come from an 8-row tree ("dance string"), the same for every
//     character: each success moves one row down to one of two children —
//     the left child (easier, fewer points) or the right one (harder, more
//     points). Row 7 leads to a single row-8 node, the FREEZE; the measure
//     after it carries no command, then a new string starts at row 1.
//   • A miss (wrong / incomplete / mistimed) cuts the string short.
//   • Attack (△ on beat 4, twice per battle) and dodge (□ on the next beat
//     4) are separate actions and don't break the string.
// The tree below is the original's, transcribed from the frame-exact
// tool-assisted run fullmoonissue/tas-bust-a-groove (scripts/nodes/
// combos.lua) with its point values (README).
//
// OUR ADDITIONS (modern, documented as such): Perfect / Great / Good
// judgments in configurable windows; the harder line is offered once the
// Enthusiasm gauge is high (the original offers it "at certain points");
// a hot streak restarts the next string two rows in; the earned SOLO.

// ── Inputs ──────────────────────────────────────────────────────────
export const DIRS = ['U', 'D', 'L', 'R'];
export const BUTTONS = ['X', 'O'];                 // ✕ cross, ○ circle
export const GLYPH = { U: '↑', D: '↓', L: '←', R: '→', X: '✕', O: '○', T: '△', S: '□' };
export const BUTTON_NAME = { X: 'CROSS', O: 'CIRCLE', T: 'TRIANGLE', S: 'SQUARE' };

// ── The original command tree ───────────────────────────────────────
// Row r (1-8) has r nodes, row 8 has 7. Code: directions then the button.
const RAW = [
  ['O'],
  ['X', 'RO'],
  ['RX', 'LO', 'UUO'],
  ['DX', 'DO', 'UUX', 'URO'],
  ['UX', 'DDO', 'LRX', 'LRO', 'UUUO'],
  ['RRX', 'RRO', 'DRX', 'DDDO', 'LLLO', 'UDLRO'],
  ['DDX', 'LLO', 'DDDX', 'DUDO', 'RURO', 'DUDUO', 'DDRLLO'],
  ['URX', 'RRRO', 'UDUX', 'LRLO', 'UDUDO', 'LLURRO', 'DLRULX'],
];
const POINTS = [
  [100], [100, 200], [200, 200, 600], [300, 600, 900, 1200], [400, 800, 1200, 1600, 2000],
  [500, 1000, 1500, 3000, 4500, 5000], [1200, 1800, 2400, 4200, 5400, 6000, 6600],
  [2100, 3500, 4900, 7000, 7700, 7700, 8757],
];
export const ROWS = 8;

export const LATTICE = RAW.map((row, r) => row.map((code, c) => Object.freeze({
  id: `r${r + 1}c${c}`, row: r + 1, col: c,
  seq: Object.freeze(code.slice(0, -1).split('')), button: code.slice(-1), points: POINTS[r][c],
})));

export function latticeNode(row, col) { return (LATTICE[row - 1] && LATTICE[row - 1][col]) || null; }
export function nodeById(id) {
  const m = /^r(\d)c(\d)$/.exec(id || '');
  return m ? latticeNode(+m[1], +m[2]) : null;
}
// Children of a node: left (same column = same move level) and right
// (next level). Row 7 has a single child; row 8 (the freeze) has none.
export function children(row, col) {
  if (row >= ROWS) return [];
  if (row === ROWS - 1) return [latticeNode(ROWS, col)].filter(Boolean);
  return [latticeNode(row + 1, col), latticeNode(row + 1, col + 1)].filter(Boolean);
}

// ── Rules (tunable) ─────────────────────────────────────────────────
export const RULES = {
  // Judgment windows around beat 4, seconds (proposed modern tuning, not
  // verified original values). Capped per tempo so they never reach the
  // neighbouring beats (windowsFor).
  timing: { perfect: 0.045, great: 0.09, good: 0.15 },
  branchEnthusiasm: 40,       // the harder line is offered from here
  soloEnthusiasm: 90,         // the SOLO replaces it from here (rows 5-7)
  hotStartEnthusiasm: 70,     // a hot streak starts the next string on row 3
  jammers: 2,                 // attacks per battle (original: twice)
  judgmentScale: { perfect: 1, great: 0.8, good: 0.6, miss: 0 },
  // A press this soon after a judged press is a double tap, not a new one.
  doubleTap: 0.15,
  // An early press this soon after a command appears is a late / doubled
  // press on the previous one, not a commitment to the new one.
  graceAfterShow: 0.25,
};

// The windows at a tempo: never more than 45% of a beat, so a window can't
// overlap the beats either side of beat 4.
export function windowsFor(spb, timing = RULES.timing) {
  const cap = 0.45 * spb;
  return { perfect: Math.min(timing.perfect, cap * 0.3), great: Math.min(timing.great, cap * 0.6), good: Math.min(timing.good, cap) };
}

export function judgeTiming(dt, win) {
  const a = Math.abs(dt) - 1e-6;          // window edges are inclusive (float-safe)
  if (a <= win.perfect) return 'perfect';
  if (a <= win.great) return 'great';
  if (a <= win.good) return 'good';
  return 'miss';
}

// ── Command resolver ────────────────────────────────────────────────
// The commands a dancer may enter next, from their string state:
//   s = { row: 0-7 (the next row to earn), col: column of the left child,
//         enthusiasm, soloReady?, practice? }
// Returns [{ slot: 'top'|'bottom', kind: 'std'|'branch'|'solo', node, … }]:
// TOP continues at the current move level, BOTTOM steps up a level (only
// when it's actually eligible).
export function resolveCommands(s, opts = {}) {
  const row = Math.min(ROWS - 1, s.row) + 1;
  const width = LATTICE[row - 1].length;
  const col = Math.max(0, Math.min(width - 1, s.col | 0));
  const out = [];
  const top = latticeNode(row, col);
  out.push(option('top', 'std', top));
  const branchRule = opts.branch || 'auto';               // 'auto' | 'always' | 'never'
  const canBranch = row > 1 && row < ROWS && col + 1 < width;
  const eligible = branchRule === 'always' || (branchRule === 'auto' && (s.enthusiasm || 0) >= RULES.branchEnthusiasm);
  if (opts.solo && opts.solo.seq && (s.enthusiasm || 0) >= RULES.soloEnthusiasm && row >= 5 && row < ROWS) {
    out.push({ slot: 'bottom', kind: 'solo', node: 'solo', row, col, seq: opts.solo.seq.slice(), button: opts.solo.button, points: 5000 });
  } else if (canBranch && eligible) {
    out.push(option('bottom', 'branch', latticeNode(row, col + 1)));
  }
  return out;
}
function option(slot, kind, n) {
  return { slot, kind, node: n.id, row: n.row, col: n.col, seq: n.seq.slice(), button: n.button, points: n.points };
}

// After landing `node`: the dancer's next string state.
export function advance(s, landed, { hold = false } = {}) {
  if (hold) return { ...s };
  if (landed.kind === 'solo') return { ...s, row: 0, col: 0 };
  const n = nodeById(landed.node);
  if (!n) return { ...s };
  if (n.row >= ROWS) {
    // Freeze: the next string starts at the top (row 3 on a hot streak).
    const hot = (s.enthusiasm || 0) >= RULES.hotStartEnthusiasm;
    return { ...s, row: hot ? 2 : 0, col: hot ? 1 : 0 };
  }
  return { ...s, row: n.row, col: n.col };
}

// ── Candidate matcher ───────────────────────────────────────────────
// Every option on offer is a live candidate. A direction that is the next
// arrow of at least one candidate advances those and drops the rest (the
// prefix narrows the choice); one that fits none is WRONG — flagged, and
// ignored (the entered arrows stay). Shared prefixes keep both alive.
export function startCandidates(options) {
  return options.map(o => ({ ...o, progress: 0, alive: true }));
}

export function applyDirection(cands, dir) {
  const fit = cands.filter(o => o.alive && o.progress < o.seq.length && o.seq[o.progress] === dir);
  if (!fit.length) return { ok: false, alive: cands.filter(o => o.alive) };
  for (const o of cands) {
    if (fit.includes(o)) o.progress++;
    else o.alive = false;
  }
  return { ok: true, alive: fit, complete: fit.filter(o => o.progress === o.seq.length) };
}

// The candidate a final button completes (whole sequence entered and the
// button it asks for), or why it doesn't.
export function resolveFinal(cands, button) {
  const complete = cands.filter(o => o.alive && o.progress === o.seq.length);
  if (!complete.length) return { ok: false, reason: 'incomplete' };
  const hit = complete.filter(o => o.button === button).sort((a, b) => b.seq.length - a.seq.length)[0];
  if (!hit) return { ok: false, reason: 'wrong-button' };
  return { ok: true, option: hit };
}

// What the dancer still has to do, for the HUD / practice readout.
export function commandStatus(cands) {
  const alive = cands.filter(o => o.alive);
  if (!alive.length) return { phase: 'none' };
  const complete = alive.filter(o => o.progress === o.seq.length);
  if (complete.length) return { phase: 'button', buttons: [...new Set(complete.map(o => o.button))] };
  const best = alive.reduce((a, b) => (b.progress > a.progress ? b : a));
  return { phase: 'dirs', next: [...new Set(alive.map(o => o.seq[o.progress]))], entered: best.progress, total: best.seq.length };
}

// ── Input buffer ────────────────────────────────────────────────────
// Ordered, timestamped inputs of one command measure (song seconds).
export class InputBuffer {
  constructor() { this.events = []; }
  push(t, kind, value, result = null) {
    const e = { t, kind, value, result };
    // Keep song-time order even if two inputs arrive out of order.
    let i = this.events.length;
    while (i > 0 && this.events[i - 1].t > t) i--;
    this.events.splice(i, 0, e);
    return e;
  }
  get directions() { return this.events.filter(e => e.kind === 'dir' && e.result === 'ok').map(e => e.value); }
  get length() { return this.events.length; }
}

// ── Move definitions (CommandDefinition per character) ──────────────
// Every node of the tree is a move of each dancer: its command, points,
// successors and the animation it plays. Rows 1-7 take the character's
// standard line on the lower columns and the ★ line on the upper ones
// (odd columns mirrored, so neighbouring nodes read differently); row 8
// is the finisher into the freeze. `plan` is the Choreographer's plan.
export function moveDefinitions(charId, plan, overrides = {}) {
  const defs = new Map();
  for (const row of LATTICE) for (const n of row) {
    const harder = n.col > (n.row - 1) / 2;
    let anim, freeze = null;
    if (n.row < ROWS) anim = overrides[n.id] || (harder ? plan.alt : plan.std)[n.row - 1];
    else { anim = overrides[n.id] || (n.col > 3 ? plan.finisher.alt : plan.finisher.std); freeze = plan.freeze; }
    const kids = children(n.row, n.col);
    defs.set(n.id, {
      id: `${charId}:${n.id}`, character: charId, node: n.id,
      type: n.row,                            // move type 1-8
      level: n.col + 1,                       // move level (tree column)
      seq: n.seq, button: n.button, points: n.points,
      anim, mirror: n.col % 2 === 1, freeze,
      beats: 4,                               // one measure (row 8: 2 + the freeze)
      successors: kids.map(k => k.id),
      branch: { top: kids[0] ? kids[0].id : null, bottom: kids[1] ? kids[1].id : null, rule: kids[1] ? `enthusiasm ≥ ${RULES.branchEnthusiasm}` : 'none' },
      transition: n.row < ROWS ? { lead: 0.5, fade: 0.5, out: 0.6 } : { lead: 0.5, finisherBeats: 2, freezeAt: 2, freezeHold: 3.5, out: 1.5 },
    });
  }
  return defs;
}

// ── Solo commands ───────────────────────────────────────────────────
// The command that starts a dancer's SOLO (our earned solo). The original's
// secret-solo openers (research table) lend their shapes: YOU = Heat's
// ↑↓↑○, COOL TONI = Hiro's →↑↓○, TINA = Kelly's →←→○; level bosses take one
// of the others by name, or set boss.soloCommand = 'UDU' + 'O'.
const SOLO_OPENERS = ['DDDO', 'UULO', 'DRLO', 'ULUO', 'LDRUO', 'DDRO', 'RURX', 'UDLRO'];
const SOLO_BY_ID = { player: 'UDUO', toni: 'RUDO', tina: 'RLRO' };
export function soloCommandFor(charId, def = {}) {
  let code = def.soloCommand || SOLO_BY_ID[charId];
  if (!code) {
    let h = 0;
    for (const ch of String(charId)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    code = SOLO_OPENERS[h % SOLO_OPENERS.length];
  }
  return { seq: code.slice(0, -1).split(''), button: code.slice(-1) };
}
