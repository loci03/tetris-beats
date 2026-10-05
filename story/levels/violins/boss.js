// VIOLETTA — prima ballerina and virtuoso violinist of the Falling Violins
// concert hall. Violet bodice and opera gloves, platter tutu with gold trim,
// pointe shoes, a sleek bun under a gold tiara — and she never puts down her
// violin (left hand) or her bow (right hand): in her dancing they read as
// long extensions of her arms, and in the "air violin" poses she flips the
// violin up under her chin and saws away.
//
// No three.js import here: build(kit) gets THREE through the kit.

// Wrist angle that swings the violin from hanging off the left hand up under
// the chin (shared with moves.js through the def).
export default {
  name: 'VIOLETTA',
  scale: 1.0,
  skin: 0xf1c6a4,
  colors: {
    top: 0x7b2fbf, topShade: 0x55208c, pants: 0xf6d2cc, shoe: 0xf7bccb, shoeAccent: 0xe58aa6,
    hair: 0x24121e, gold: 0xffc93a, tutu: 0xc9a2f2, tutuLight: 0xeee0ff, violin: 0xb5521c,
    violinDark: 0x5a240a, ebony: 0x16100e, bowHair: 0xfff6dc, lips: 0xc8183e, gem: 0x9b4dff,
  },
  bareForearms: false,
  style: {
    // Ballet feel: rises up on the beat (plié between, relevé on it), a long
    // lifted neck, épaulement — shoulders and head turning against each
    // other over two beats. Nothing like the hip-hop drop or the disco pop.
    swagger: 1.15, bounce: 0.9, phraseOffset: 1,
    feel(p, { Bb, d, amt, e, s }) {
      p.root(0, -0.085 + 0.08 * d, 0);
      p.add('spine', -0.03 * d); p.add('chest', -0.07 * d); p.add('head', -0.06 * d * s.swagger);
      const ep = Math.sin(Math.PI * Bb / 2) * amt * e;
      p.add('chest', 0, 0.12 * ep, 0.03 * ep);
      p.add('head', 0, -0.16 * ep, 0.07 * ep);
      p.shrug(-0.03 * amt + 0.04 * (1 - d) * amt * e);
    },
    routines: { chill: ['violettaBalance', 'violettaPortDeBras'], hype: ['violettaChasse', 'violettaBourree', 'violettaBalance'] },
    accent: { pose: 'violettaAccent', at: 3 },
  },
  moves: {
    1: ['violettaTendu', 'violettaAirViolin'],
    2: ['violettaPasDeChat', 'violettaTango'],
    3: ['violettaPirouette', 'violettaArabesque'],
    4: ['violettaGrandJete', 'violettaFouette'],
  },
  branchMoves: { 2: 'violettaFlamenco', 3: 'violettaCambre', 4: 'violettaFinale' },
  solo: 'violettaVirtuoso',
  introTaunt: 'violettaIntro',
  // Saws out a screeching note right at you: shrieking notes swirl over the
  // panel and everything goes out of focus like ringing ears.
  taunt: 'violettaTaunt',
  tauntFx: { projectile: 'violettaScreech', disrupt: 'swirl+blur', color: '#ffd23f', n: 8 },
  victory: 'violettaBow',
  fx: { move: 'violettaNote', big: 'violettaRose', taunt: 'violettaScreech' },

  build(k) {
    const { THREE, C, mats, toon, part, capsule, sphere, limbs, head, face, chest, spine, hips } = k;
    const gold = toon(C.gold, { emissive: 0x4a3300 });
    // ── Hair: sleek and pulled back into a high ballet bun, tiara on top ──
    part(head, sphere(0.265), mats.hair, 0, 0.29, -0.075, 1.04, 0.98, 1.0);
    part(head, sphere(0.13), mats.hair, 0, 0.47, -0.17, 1, 0.9, 1);          // bun
    part(head, new THREE.TorusGeometry(0.11, 0.022, 6, 18), toon(C.tutu), 0, 0.45, -0.17, 1, 1, 1, false).rotation.x = 1.0;
    for (const sx of [1, -1]) part(head, capsule(0.05, 0.16), mats.hair, 0.2 * sx, 0.24, 0.02, 1, 1, 0.8).rotation.z = 0.35 * sx;
    const tiara = part(head, new THREE.TorusGeometry(0.2, 0.016, 6, 22, Math.PI), gold, 0, 0.4, 0.06, 1, 1, 1, false);
    tiara.rotation.x = -0.35;
    const gem = toon(C.gem, { emissive: 0x3a1080 });
    part(head, new THREE.OctahedronGeometry(0.045), gem, 0, 0.62, 0.0, 1, 1.3, 0.6, false);
    for (const sx of [1, -1]) part(head, new THREE.OctahedronGeometry(0.028), gem, 0.13 * sx, 0.56, 0.02, 1, 1.2, 0.6, false);
    // Lashes, drop earrings.
    for (const sx of [1, -1]) {
      part(face, new THREE.BoxGeometry(0.1, 0.018, 0.02), mats.dark, 0.088 * sx, 0.285, 0.22, 1, 1, 1, false).rotation.z = -0.25 * sx;
      part(head, sphere(0.022), gold, 0.24 * sx, 0.1, 0.03, 1, 1, 1, false);
      part(head, new THREE.OctahedronGeometry(0.03), gem, 0.24 * sx, 0.05, 0.03, 1, 1.5, 1, false);
    }
    // ── Bodice: gold lacing and waist trim, puff sleeves, bare upper arms
    // and violet opera gloves (the forearms) with gold cuffs. ──
    part(chest, new THREE.BoxGeometry(0.02, 0.3, 0.01), gold, 0, 0.1, 0.19, 1, 1, 1, false);
    for (let i = 0; i < 4; i++) part(chest, new THREE.BoxGeometry(0.12 - i * 0.015, 0.012, 0.01), gold, 0, 0.0 + i * 0.07, 0.188, 1, 1, 1, false);
    part(spine, new THREE.TorusGeometry(0.175, 0.02, 6, 24), gold, 0, 0.05, 0, 1.05, 0.75, 1, false).rotation.x = Math.PI / 2;
    const sleeve = toon(C.topShade);
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.sh, sphere(0.11), sleeve, 0.03 * L.sx, 0.0, 0, 1, 0.85, 1);
      const upper = L.arm.children.find(c => c.isMesh);
      if (upper) upper.material = mats.skin;
      part(L.fore, new THREE.TorusGeometry(0.062, 0.016, 6, 16), gold, 0, -0.01, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      // Pointe shoes: slimmer satin boxes with ribbons criss-crossing the ankle.
      for (const c of L.foot.children) if (c.isMesh) c.scale.x *= 0.72;
      const ribbon = toon(C.shoeAccent);
      part(L.shin, new THREE.TorusGeometry(0.07, 0.012, 5, 14), ribbon, 0, -0.38, 0, 1, 1, 1, false).rotation.x = Math.PI / 2 + 0.3;
      part(L.shin, new THREE.TorusGeometry(0.066, 0.012, 5, 14), ribbon, 0, -0.33, 0, 1, 1, 1, false).rotation.x = Math.PI / 2 - 0.3;
    }
    // ── Platter tutu: two stiff layers and a gold edge ──
    part(hips, new THREE.CylinderGeometry(0.46, 0.48, 0.045, 30), toon(C.tutu), 0, -0.05, 0, 1, 1, 0.92);
    part(hips, new THREE.CylinderGeometry(0.4, 0.43, 0.05, 30), toon(C.tutuLight), 0, -0.005, 0, 1, 1, 0.92, false);
    part(hips, new THREE.TorusGeometry(0.47, 0.012, 4, 40), gold, 0, -0.05, 0, 1, 1, 0.92, false).rotation.x = Math.PI / 2;
    part(hips, new THREE.CylinderGeometry(0.22, 0.24, 0.12, 20), mats.top, 0, 0.04, 0, 1, 1, 0.8, false);

    // ── The violin, hanging off the left hand by its neck (scroll in the
    // fist, figure-eight face toward the audience). ──
    const vmat = toon(C.violin, { emissive: 0x2a0c00 }), dark = toon(C.violinDark), ebony = toon(C.ebony);
    const shape = new THREE.Shape();
    // Half outline (x ≥ 0) from the bottom up, mirrored: lower bout, C-bout waist, upper bout.
    const half = [[0, 0], [0.07, 0.012], [0.105, 0.06], [0.1, 0.11], [0.06, 0.15], [0.06, 0.18], [0.09, 0.215], [0.09, 0.26], [0.055, 0.3], [0, 0.31]];
    shape.moveTo(0, 0);
    for (let i = 1; i < half.length; i++) shape.lineTo(half[i][0], half[i][1]);
    for (let i = half.length - 2; i >= 0; i--) shape.lineTo(-half[i][0], half[i][1]);
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 4 });
    bodyGeo.translate(0, 0, -0.0225);
    const violin = new THREE.Group();
    // Group frame: +y toward the scroll; the grip sits at the scroll end.
    part(violin, bodyGeo, vmat, 0, -0.52, 0, 1, 1, 1);
    part(violin, new THREE.BoxGeometry(0.028, 0.26, 0.02), ebony, 0, -0.26, 0.035, 1, 1, 1, false);   // fingerboard
    part(violin, new THREE.BoxGeometry(0.03, 0.16, 0.035), dark, 0, -0.14, 0.005);                    // neck
    part(violin, sphere(0.03), dark, 0, -0.045, 0.0, 1, 1.25, 0.8);                                     // scroll
    part(violin, new THREE.BoxGeometry(0.035, 0.07, 0.012), ebony, 0, -0.47, 0.033, 1, 1, 1, false);  // tailpiece
    part(violin, new THREE.BoxGeometry(0.05, 0.012, 0.02), toon(0xf0dcb0), 0, -0.4, 0.04, 1, 1, 1, false); // bridge
    for (const sx of [1, -1]) part(violin, new THREE.BoxGeometry(0.006, 0.07, 0.006), ebony, 0.038 * sx, -0.39, 0.03, 1, 1, 1, false).rotation.z = 0.15 * sx; // f-holes
    part(violin, new THREE.BoxGeometry(0.02, 0.36, 0.004), toon(0xf4f0e0), 0, -0.29, 0.047, 1, 1, 1, false); // strings
    violin.position.set(0, -0.02, 0.015);
    limbs.L.hand.add(violin);
    // ── The bow in the right hand: a long dark stick, pale hair, gold frog —
    // pointing on along the forearm, so every arm line ends in a flourish.
    const bow = new THREE.Group();
    part(bow, new THREE.CylinderGeometry(0.008, 0.011, 0.68, 6), toon(0x3a1a0c), 0, -0.36, 0, 1, 1, 1);
    part(bow, new THREE.BoxGeometry(0.008, 0.6, 0.004), toon(C.bowHair), 0.024, -0.37, 0, 1, 1, 1, false);
    part(bow, new THREE.BoxGeometry(0.026, 0.06, 0.03), gold, 0.014, -0.06, 0, 1, 1, 1, false);       // frog
    part(bow, new THREE.BoxGeometry(0.022, 0.03, 0.012), toon(0xf4f0e0), 0.01, -0.69, 0, 1, 1, 1, false); // tip
    bow.position.set(0, -0.03, 0.02);
    limbs.R.hand.add(bow);
  },
};
