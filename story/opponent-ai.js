// Opponent AI — the rival plays the same command tree as the player. Its
// skill profile rolls which line it takes and how well it times beat 4;
// RhythmBattle turns that into timestamped inputs (arrows, then the
// button) that go through the same input buffer and judge as the
// player's. Pressure matters: a rival that's being out-danced gets
// flustered, and longer commands are harder for it too.

export class OpponentAI {
  constructor(profile, rng) {
    this.p = profile;
    this.rng = rng;
  }

  // Finisher judgment for a command option. `pressure` is 0..1 (how badly
  // it's losing).
  judge(option, pressure) {
    const p = this.p;
    const penalty = Math.max(0, option.seq.length - 3) * 0.03 + pressure * p.fluster;
    const r = this.rng();
    const perfect = Math.max(0.05, p.perfect - penalty * 0.6);
    const great = p.great;
    const good = Math.max(0.05, p.good - penalty * 0.2);
    let j;
    if (r < perfect) j = 'perfect';
    else if (r < perfect + great) j = 'great';
    else if (r < perfect + great + good) j = 'good';
    else j = 'miss';
    // Timing error to show early/late flavour, consistent with the judgment.
    const spread = { perfect: 0.03, great: 0.075, good: 0.12, miss: 0.2 }[j];
    const delta = (this.rng() * 2 - 1) * spread;
    return { judgment: j, delta };
  }

  // Go for the ★ branch / solo when the tree offers it?
  takesBranch(option) {
    const base = this.p.branch ?? Math.min(0.9, this.p.perfect + 0.25);
    return this.rng() < (option.kind === 'solo' ? base * 0.85 : base);
  }

  // Does it dodge an incoming attack (□ on beat 4)? A sharper attack is
  // harder to dodge.
  dodges(tauntJudgment, leading) {
    const sharp = tauntJudgment === 'perfect' ? -0.12 : tauntJudgment === 'great' ? -0.05 : 0.05;
    return this.rng() < this.p.dodge + sharp + (leading ? 0.08 : 0);
  }
}
