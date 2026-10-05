// SAGE — Relax Your Mind's boss: a serene floating mystic. Bald head with a
// glowing third-eye gem, a long white beard, lavender robe with wide
// sleeves over a pink sash, wooden prayer beads, loose trousers, and he
// hovers a hand's width off the ground the whole time.
// Flowing moves: tai chi cloud hands, liquid waves, white crane, snake
// creeps down, yoga tree and warrior poses, slow-motion glides, lotus
// levitation.

// Float feel: the song pulses at 134 but Sage breathes on the slow beat —
// he hovers, bobbing up on every half-time beat with a slow sway, chest
// rising like a breath. (Uses B, not the doubled bounce beat Bb.)
function float(p, { B, amt, e, s }) {
  const breathe = 0.5 - 0.5 * Math.cos(Math.PI * 2 * B);       // 0 on the beat → 1 between
  const sway = Math.sin(Math.PI * B / 2) * amt;
  const hover = (0.05 + 0.035 * breathe) * Math.min(1, amt * 1.4);
  p.root(0.03 * sway, hover - 0.04 * (1 - breathe) * amt * e, 0);
  p.lift('L', hover); p.lift('R', hover);
  p.add('chest', -0.05 * breathe * amt, 0.04 * sway, 0.03 * sway);
  p.add('head', 0.04 * (1 - breathe) * amt, 0, -0.04 * sway);
  p.shrug(0.05 * breathe * amt);
}

export default {
  name: 'SAGE',
  scale: 1.02,
  skin: 0xd8a47a,
  colors: {
    top: 0xb69cff, topShade: 0x8f72e8, pants: 0xf2e6ff, shoe: 0x5a3a7a, shoeAccent: 0xffc8ec,
    hair: 0xf4f0ff, sash: 0xff7ac8, gold: 0xffd27a, bead: 0x7a4a2a, gem: 0xff4fb0,
  },
  bareForearms: true,
  style: {
    swagger: 0.9, bounce: 0.8, phraseOffset: 1,
    feel: float,
    routines: { chill: ['sageCloudHands', 'sageWave'], hype: ['sageFlow', 'sageCloudHands', 'sageWave'] },
    accent: { pose: 'sageAccent', at: 3 },
  },
  moves: {
    1: ['sageBreath', 'sageLotusHands'],
    2: ['sageCrane', 'sageGlide'],
    3: ['sageTree', 'sageWarrior'],
    4: ['sageSpiral', 'sageLevitate'],
  },
  branchMoves: { 2: 'sageRipple', 3: 'sageSnake', 4: 'sageAscend' },
  solo: 'sageNirvana',
  introTaunt: 'sageIntro',
  taunt: 'sageTaunt',
  // Hypnotic mind-wave: palms push out and spiral, sending lotus ripples
  // across — your panel blurs while lotuses swirl over it.
  tauntFx: { projectile: 'sageLotus', disrupt: 'blur+swirl', color: '#c89bff', n: 6 },
  victory: 'sageVictory',
  fx: { move: 'sageLotus', big: 'sparkle', taunt: 'sageLotus' },

  build(kit) {
    const { THREE, C, mats, toon, part, limbs, face, brows, hips, chest, head } = kit;
    const sphere = (r) => new THREE.SphereGeometry(r, r > 0.12 ? 16 : 8, r > 0.12 ? 12 : 6);
    const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 3, 8);
    const robe = mats.top, robeShade = mats.topShade;
    const sash = toon(C.sash), gold = toon(C.gold, { emissive: 0x3a2a00 }), bead = toon(C.bead);
    const gem = toon(C.gem, { emissive: 0xc02a80 });

    // Robe skirt to the knees (split at the sides so the legs can move),
    // gold hem, sash across the chest, knotted at the hip.
    for (const sx of [1, -1]) {
      const panel = part(hips, new THREE.CylinderGeometry(0.22, 0.3, 0.5, 12, 1, true, sx > 0 ? -0.2 : Math.PI - 0.2, Math.PI * 0.55), toon(C.top, { side: THREE.DoubleSide }), 0, -0.2, 0, 1, 1, 0.9);
      panel.rotation.y = sx > 0 ? -0.45 : 0.45;
    }
    part(hips, new THREE.CylinderGeometry(0.205, 0.22, 0.16, 18), robe, 0, 0.0, 0, 1.05, 1, 0.85);
    part(hips, new THREE.TorusGeometry(0.205, 0.035, 6, 24), sash, 0, 0.06, 0, 1.08, 0.86, 1, false).rotation.x = Math.PI / 2;
    part(hips, sphere(0.05), sash, 0.17, 0.04, 0.12, 1, 1, 0.8, false);
    part(hips, capsule(0.03, 0.22), sash, 0.18, -0.12, 0.12, 1, 1, 0.6, false).rotation.z = 0.15;
    const band = part(chest, new THREE.BoxGeometry(0.1, 0.62, 0.05), sash, 0.02, 0.15, 0.16, 1, 1, 1, false);
    band.rotation.z = 0.62;
    part(chest, new THREE.BoxGeometry(0.1, 0.5, 0.05), sash, 0.0, 0.2, -0.16, 1, 1, 1, false).rotation.z = -0.62;
    // V collar.
    for (const sx of [1, -1]) part(chest, new THREE.BoxGeometry(0.04, 0.26, 0.03), gold, 0.05 * sx, 0.28, 0.165, 1, 1, 1, false).rotation.z = 0.4 * sx;
    // Wide flared sleeves from the elbow (forearms bare beneath).
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.arm, new THREE.CylinderGeometry(0.085, 0.13, 0.22, 14, 1, true), toon(C.top, { side: THREE.DoubleSide }), 0, -0.25, 0);
      part(L.arm, new THREE.TorusGeometry(0.128, 0.015, 5, 16), gold, 0, -0.36, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      part(L.fore, new THREE.TorusGeometry(0.06, 0.012, 5, 12), bead, 0, -0.22, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      // Soft slippers.
      part(L.foot, sphere(0.09), mats.shoe, 0, -0.02, 0.12, 1, 0.6, 1.2, false);
    }

    // Prayer beads (mala) round the neck, with a tassel.
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      part(chest, sphere(0.022), bead, Math.sin(a) * 0.16, 0.33 - (Math.cos(a) > 0 ? Math.cos(a) * 0.17 : Math.cos(a) * 0.02), Math.cos(a) * 0.13 + 0.03, 1, 1, 1, false);
    }
    part(chest, sphere(0.032), gold, 0, 0.13, 0.19, 1, 1, 1, false);
    part(chest, new THREE.ConeGeometry(0.025, 0.08, 6), sash, 0, 0.07, 0.19, 1, 1, 1, false);

    // Head: bald, third-eye gem, long white beard, eyebrows, earlobes.
    part(face, sphere(0.022), gem, 0, 0.36, 0.215, 1, 1.2, 0.6, false);
    part(face, capsule(0.075, 0.14), mats.hair, 0, 0.0, 0.17, 1.2, 1, 0.7);
    part(face, new THREE.ConeGeometry(0.07, 0.18, 10), mats.hair, 0, -0.14, 0.17, 1, 1, 0.6).rotation.x = Math.PI;
    for (const sx of [1, -1]) {
      const m = part(face, capsule(0.02, 0.07), mats.hair, 0.055 * sx, 0.125, 0.235, 1, 1, 0.8, false);
      m.rotation.z = (Math.PI / 2 + 0.45) * sx;
      part(head, sphere(0.045), mats.skin, 0.235 * sx, 0.12, 0.0, 0.5, 1.3, 0.9);                // long earlobes
    }
    part(head, sphere(0.02), gold, 0.24, 0.06, 0.02, 1, 1, 1, false);
    for (const b of brows) { b.material = mats.hair; b.scale.set(1.3, 1.8, 1.4); }
  },
};
