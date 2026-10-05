// KAYA — Life is Good's boss: a confident dancehall queen. Green, gold and
// black headwrap with braids falling out the back, big gold hoops and a
// chain, a gold crop top, high-waisted fuchsia flares with a gold stripe,
// bangles and chunky white sneakers.
// Authentic dancehall: the wine, the bogle, gully creepa, pon di river,
// row di boat, log on, tek weh yuhself, wacky dip, willie bounce, the
// butterfly, the dutty wine, and signal di plane for the taunt.

// Wine feel: the hips roll in a circle over two beats (the dancehall
// "wine"), the chest isolating against them, a soft drop into each beat.
function wine(p, { B, Bb, down, d, amt, e, s }) {
  const a = Math.PI * B, k = amt * e * s.swagger;
  const cx = Math.cos(a), cz = Math.sin(a);
  p.root(0.05 * cx * k, -0.06 * d, 0.035 * cz * k);
  p.add('hips', 0.1 * cz * k, 0.08 * cx * k, 0.1 * cx * k);
  p.add('spine', -0.06 * cz * k, 0, -0.06 * cx * k);
  p.add('chest', 0.03 * d, -0.06 * cx * k, -0.05 * cx * k);
  p.add('head', 0.06 * d, 0, 0.05 * cx * k);
  p.shrug(0.06 * (1 - down) * amt * e);
}

export default {
  name: 'KAYA',
  scale: 1.0,
  skin: 0x7a4a2e,
  colors: {
    top: 0xffc81e, topShade: 0xe8a800, pants: 0xe8247a, shoe: 0xf8f8f8, shoeAccent: 0x1faa4f,
    hair: 0x1a0f0c, wrapA: 0x1faa4f, wrapB: 0xffc81e, wrapC: 0x141414, gold: 0xffc43a, lips: 0x8a1f3a,
  },
  bareForearms: true,
  style: {
    swagger: 1.25, bounce: 1.0, phraseOffset: 1,
    feel: wine,
    routines: { chill: ['kayaWine', 'kayaBogle'], hype: ['kayaGullyCreepa', 'kayaPonDiRiver', 'kayaBogle'] },
    accent: { pose: 'kayaAccent', at: 5 },
  },
  moves: {
    1: ['kayaRowBoat', 'kayaLogOn'],
    2: ['kayaGullyCreepa', 'kayaPonDiRiver'],
    3: ['kayaTekWeh', 'kayaWackyDip'],
    4: ['kayaDuttyWine', 'kayaSpinDrop'],
  },
  branchMoves: { 2: 'kayaWillieBounce', 3: 'kayaButterfly', 4: 'kayaQueenWine' },
  solo: 'kayaDancehallQueen',
  introTaunt: 'kayaIntro',
  taunt: 'kayaTaunt',
  // Signal di plane: points to the sky and flicks it down at you — a shower
  // of glowing stars, and your panel wobbles like the bass hit it.
  tauntFx: { projectile: 'kayaStar', disrupt: 'fall+wobble', color: '#ffd23a', n: 8 },
  victory: 'kayaVictory',
  fx: { move: 'kayaStar', big: 'sparkle', taunt: 'kayaStar' },

  build(kit) {
    const { THREE, C, mats, toon, part, limbs, face, hips, spine, chest, neck, head } = kit;
    const sphere = (r) => new THREE.SphereGeometry(r, r > 0.12 ? 16 : 10, r > 0.12 ? 12 : 7);
    const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 3, 8);
    const gold = toon(C.gold, { emissive: 0x4a3300 });
    const wrapA = toon(C.wrapA), wrapB = toon(C.wrapB), wrapC = toon(C.wrapC);

    // Crop top: bare midriff and shoulders (the rig's spine / upper arms
    // swap to skin), a gold top with a black trim band.
    const meshOf = (j) => j.children.find(c => c.isMesh);
    meshOf(spine).material = mats.skin;
    for (const side of ['L', 'R']) { meshOf(limbs[side].arm).material = mats.skin; meshOf(limbs[side].sh).material = mats.skin; }
    part(chest, new THREE.TorusGeometry(0.2, 0.025, 6, 24), wrapA, 0, 0.02, 0, 1.27, 0.82, 1, false).rotation.x = Math.PI / 2;
    for (const sx of [1, -1]) part(chest, capsule(0.03, 0.12), mats.top, 0.14 * sx, 0.36, 0.0, 1, 1, 1);   // straps
    part(spine, sphere(0.02), gold, 0, 0.06, 0.15, 1, 1, 0.5, false);                                       // navel ring

    // High-waisted fuchsia flares with a gold side stripe and a wide waistband.
    part(hips, new THREE.CylinderGeometry(0.19, 0.2, 0.14, 20), mats.pants, 0, 0.1, 0, 1.05, 1, 0.8);
    part(hips, new THREE.TorusGeometry(0.195, 0.022, 6, 24), gold, 0, 0.12, 0, 1.06, 0.82, 1, false).rotation.x = Math.PI / 2;
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.shin, new THREE.CylinderGeometry(0.08, 0.15, 0.24, 14, 1, true), toon(C.pants, { side: THREE.DoubleSide }), 0, -0.34, 0.01);
      part(L.thigh, new THREE.BoxGeometry(0.02, 0.42, 0.04), gold, 0.09 * L.sx, -0.2, 0, 1, 1, 1, false);
      part(L.shin, new THREE.BoxGeometry(0.02, 0.4, 0.035), gold, 0.085 * L.sx, -0.22, 0, 1, 1, 1, false);
      // Chunky platform soles.
      part(L.foot, new THREE.BoxGeometry(0.17, 0.06, 0.31), mats.shoe, 0, -0.1, 0.06, 1, 1, 1, false);
      // Bangles stacked on the forearms.
      for (let k = 0; k < 3; k++) part(L.fore, new THREE.TorusGeometry(0.06, 0.012, 5, 14), k === 1 ? wrapA : gold, 0, -0.18 - k * 0.03, 0, 1, 1, 1, false).rotation.x = Math.PI / 2 + 0.2 * (k - 1);
    }

    // ── Head: headwrap with a top knot, braids out the back, hoops ──
    part(head, sphere(0.268), wrapA, 0, 0.3, -0.03, 1.08, 0.85, 1.08);
    part(head, new THREE.TorusGeometry(0.255, 0.035, 6, 24), wrapB, 0, 0.3, -0.02, 1.08, 1.08, 1, false).rotation.x = Math.PI / 2 - 0.15;
    part(head, new THREE.TorusGeometry(0.235, 0.03, 6, 24), wrapC, 0, 0.4, -0.04, 1.08, 1.08, 1, false).rotation.x = Math.PI / 2 - 0.2;
    part(head, sphere(0.17), wrapB, 0.02, 0.56, 0.0, 1.15, 0.85, 1.0);                      // the knot
    part(head, sphere(0.12), wrapA, -0.1, 0.62, 0.06, 1, 0.9, 1).rotation.z = 0.4;
    part(head, sphere(0.1), wrapC, 0.12, 0.6, 0.08, 1, 0.85, 1);
    const tails = part(head, capsule(0.05, 0.12), wrapB, 0.17, 0.58, -0.02, 1, 1, 0.6);
    tails.rotation.z = -1.0;
    part(head, sphere(0.24), mats.hair, 0, 0.18, -0.07, 1.0, 0.95, 0.95);                    // hairline under the wrap
    for (let i = 0; i < 6; i++) {                                                            // braids
      const x = -0.15 + i * 0.06;
      const br = part(head, capsule(0.026, 0.42), mats.hair, x, -0.08, -0.2 - Math.abs(x) * 0.2, 1, 1, 1);
      br.rotation.x = 0.25; br.rotation.z = x * 0.6;
      part(head, sphere(0.03), i % 2 ? gold : wrapA, x * 1.15, -0.33, -0.27 - Math.abs(x) * 0.2, 1, 1.3, 1, false);
    }
    for (const sx of [1, -1]) {
      part(head, new THREE.TorusGeometry(0.085, 0.014, 6, 22), gold, 0.245 * sx, 0.06, 0.02, 1, 1, 1, false).rotation.y = Math.PI / 2;
      const lash = part(face, new THREE.BoxGeometry(0.1, 0.018, 0.02), mats.dark, 0.088 * sx, 0.285, 0.22, 1, 1, 1, false);
      lash.rotation.z = -0.25 * sx;
    }
    // Gold chain with a little pendant.
    part(chest, new THREE.TorusGeometry(0.15, 0.016, 6, 26), gold, 0, 0.3, 0.07, 1, 1.15, 1, false).rotation.x = 1.25;
    part(chest, sphere(0.035), wrapA, 0, 0.2, 0.18, 1, 1, 0.5, false);
    part(neck, new THREE.CylinderGeometry(0.068, 0.072, 0.05, 14), gold, 0, 0.02, 0, 1, 1, 1, false);
  },
};
