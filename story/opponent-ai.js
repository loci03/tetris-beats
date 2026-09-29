// Opponent AI — the rival plays the same kind of chart as the player, but
// its hits are rolled from a skill profile instead of read from input.
// Pressure matters: a rival that's being out-danced gets flustered, and
// harder commands (higher tier) are harder for it too.

export class OpponentAI {
  constructor(profile, rng) {
    this.p = profile;
    this.rng = rng;
  }

  // Judgment for one note. `pressure` is 0..1 (how badly it's losing).
  judge(note, tier, pressure) {
    const p = this.p;
    const penalty = Math.max(0, tier - 1) * 0.035 + pressure * p.fluster;
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

  // Taunt note on the downbeat of its own taunt bar.
  judgeTaunt() {
    return this.rng() < this.p.taunt ? (this.rng() < 0.5 ? 'perfect' : 'great') : 'miss';
  }

  // Should it spend a full hype gauge on a taunt next bar?
  wantsTaunt(leading) {
    return this.rng() < this.p.tauntChance * (leading ? 0.8 : 1.2);
  }

  // Does it dodge an incoming taunt? A sharper taunt is harder to dodge.
  dodges(tauntJudgment, leading) {
    const sharp = tauntJudgment === 'perfect' ? -0.12 : tauntJudgment === 'great' ? -0.05 : 0.05;
    return this.rng() < this.p.dodge + sharp + (leading ? 0.08 : 0);
  }
}
