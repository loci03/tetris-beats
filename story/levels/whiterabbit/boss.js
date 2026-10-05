// BUNNI — the White Rabbit boss: a purple raver who fell down the rabbit
// hole and never stopped shuffling. Tall white rabbit ears, lavender twin
// buns, a glow-stick in each hand, a cropped purple top, fluffy leg
// warmers, platform sneakers, a cotton tail — and a gold pocket watch on a
// chain that she will absolutely swing at you. She dances Melbourne
// shuffle: running man, T-steps, Charleston kicks, jumpstyle, rave hand
// waves and glow-stick swirls, with little rabbit hops in between.

export default {
  name: 'BUNNI',
  scale: 0.96,
  skin: 0xf2c6a6,
  colors: {
    top: 0xa23cff, topShade: 0x7420d0, pants: 0xf2c6a6, shoe: 0xffffff, shoeAccent: 0xff4fd8,
    hair: 0xb48cff, ear: 0xfbf7ff, earIn: 0xff9ed8, shorts: 0x2a1240, fluff: 0xf6eaff, fluffStripe: 0xb15cff,
    stickA: 0xff3fd0, stickB: 0x3ff6ff, gold: 0xffc93a, lips: 0xd0307a,
  },
  bareForearms: true,
  // Shuffle bounce: the knees drop on every pulse and spring straight
  // back up (light, quick, on the balls of the feet), shoulders bob, the
  // head bops, the body rocks a little side to side with each step.
  style: {
    swagger: 1.1, bounce: 0.95, phraseOffset: 1,
    feel(p, { B, Bb, amt, e, s }) {
      const f = ((Bb % 1) + 1) % 1;
      const down = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * f), 3);
      const spring = Math.sin(2 * Math.PI * f) * 0.5 + 0.5;
      const k = amt * e * s.bounce, rock = Math.cos(Math.PI * Bb) * amt * e;
      p.root(0.025 * rock, -0.09 * down * k + 0.02 * spring * k, 0);
      p.add('chest', 0.06 * down * k, 0.06 * rock, -0.05 * rock);
      p.add('head', 0.13 * down * k * s.swagger, 0, 0.07 * rock);
      p.shrug(0.1 * spring * k, 0.1 * spring * k);
    },
    routines: { chill: ['bunniRunningMan', 'bunniHandWave'], hype: ['bunniTStep', 'bunniCharleston', 'bunniRunningMan'] },
    accent: { pose: 'bunniAccent', at: 5 },
  },
  moves: {
    1: ['bunniHop', 'bunniGlowSwirl'],
    2: ['bunniKickSpin', 'bunniGloving'],
    3: ['bunniJumpstyle', 'bunniSpinStep'],
    4: ['bunniRabbitHole', 'bunniStarJump'],
  },
  branchMoves: { 2: 'bunniHyperShuffle', 3: 'bunniWatchSpin', 4: 'bunniWonderleap' },
  solo: 'bunniDownTheHole',
  introTaunt: 'bunniIntro',
  // Swings her pocket watch at you like a hypnotist: your arrows go round
  // and round in a purple swirl.
  taunt: 'bunniHypno',
  tauntFx: { projectile: 'bunniWatch', disrupt: 'swirl+wobble', color: '#c440ff', n: 7 },
  victory: 'bunniVictory',
  fx: { move: 'bunniCard', big: 'sparkle', taunt: 'bunniWatch' },

  build(kit) {
    const { THREE, C, mats, toon, part, capsule, limbs, face, hips, spine, chest, head } = kit;
    const sphere = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
    const hair = toon(C.hair), ear = toon(C.ear), earIn = toon(C.earIn);
    const gold = toon(C.gold, { emissive: 0x4a3300 });

    // Bare midriff under the crop top.
    spine.children[0].material = mats.skin;
    // Hair: lavender bob with bangs, twin buns.
    part(head, sphere(0.262), hair, 0, 0.25, -0.03, 1.0, 1.0, 1.0);
    part(head, capsule(0.12, 0.24), hair, 0, 0.36, 0.14, 1.5, 0.55, 0.6).rotation.z = Math.PI / 2;
    for (const sx of [1, -1]) {
      part(head, sphere(0.1), hair, 0.2 * sx, 0.44, -0.04);
      part(head, capsule(0.06, 0.2), hair, 0.215 * sx, 0.1, -0.02, 1, 1, 0.8).rotation.z = 0.08 * sx;
    }
    // Rabbit ears: tall, a little floppy at the tips, pink inside.
    for (const sx of [1, -1]) {
      const g = new THREE.Group();
      g.position.set(0.09 * sx, 0.46, -0.02);
      g.rotation.set(-0.12, 0, -0.16 * sx);
      head.add(g);
      part(g, capsule(0.055, 0.34), ear, 0, 0.22, 0, 1.1, 1, 0.55);
      part(g, capsule(0.03, 0.28), earIn, 0, 0.22, 0.026, 1.1, 1, 0.4, false);
      const tip = new THREE.Group(); tip.position.set(0, 0.42, 0); tip.rotation.x = sx > 0 ? 0.55 : 0.1; g.add(tip);
      part(tip, capsule(0.05, 0.1), ear, 0, 0.06, 0, 1.1, 1, 0.55);
    }
    // Lashes + rave face gems.
    for (const sx of [1, -1]) {
      part(face, new THREE.BoxGeometry(0.09, 0.016, 0.02), mats.dark, 0.088 * sx, 0.285, 0.22, 1, 1, 1, false).rotation.z = -0.25 * sx;
      part(face, sphere(0.014, 6, 4), new THREE.MeshBasicMaterial({ color: sx > 0 ? C.stickB : C.stickA }), 0.13 * sx, 0.17, 0.2, 1, 1, 0.5, false);
    }
    // Choker with a heart.
    part(chest, new THREE.TorusGeometry(0.075, 0.012, 6, 18), toon(0x1a0a24), 0, 0.42, 0.0, 1, 1, 1, false).rotation.x = Math.PI / 2;
    // Crop top hem + a white heart on it.
    part(chest, new THREE.TorusGeometry(0.2, 0.025, 6, 22), toon(C.topShade), 0, -0.02, 0, 1.22, 0.78, 1, false).rotation.x = Math.PI / 2;
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.05); heart.bezierCurveTo(-0.07, 0, -0.05, 0.05, 0, 0.025); heart.bezierCurveTo(0.05, 0.05, 0.07, 0, 0, -0.05);
    part(chest, new THREE.ShapeGeometry(heart, 6), toon(0xffffff), 0, 0.16, 0.17, 1, 1, 1, false);
    // Shorts, belt, cotton tail, and the pocket watch on its chain.
    part(hips, new THREE.CylinderGeometry(0.21, 0.25, 0.22, 18), toon(C.shorts), 0, -0.03, 0, 1.02, 1, 0.82);
    part(hips, new THREE.TorusGeometry(0.205, 0.02, 6, 22), toon(0xffffff), 0, 0.07, 0, 1.02, 0.82, 1, false).rotation.x = Math.PI / 2;
    part(hips, sphere(0.085), ear, 0, -0.02, -0.2);
    part(hips, new THREE.TorusGeometry(0.06, 0.006, 4, 12, Math.PI), gold, 0.12, -0.0, 0.15, 1, 1, 1, false).rotation.z = Math.PI;
    const watch = part(hips, new THREE.CylinderGeometry(0.05, 0.05, 0.018, 16), gold, 0.19, -0.07, 0.15, 1, 1, 1);
    watch.rotation.x = Math.PI / 2;
    part(hips, new THREE.CircleGeometry(0.04, 16), toon(0xfff8e8), 0.19, -0.07, 0.161, 1, 1, 1, false);
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      // Shorts legs.
      part(L.thigh, new THREE.CylinderGeometry(0.105, 0.1, 0.13, 14), toon(C.shorts), 0, -0.06, 0);
      // Fluffy leg warmers: a fat fluffy tube with stripes.
      part(L.shin, new THREE.CylinderGeometry(0.105, 0.135, 0.34, 14), toon(C.fluff), 0, -0.25, 0);
      for (const y of [-0.13, -0.24, -0.35]) part(L.shin, new THREE.TorusGeometry(0.118 + (-y - 0.13) * 0.12, 0.016, 4, 14), toon(C.fluffStripe), 0, y, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      // Platform soles.
      part(L.foot, new THREE.BoxGeometry(0.165, 0.06, 0.3), toon(C.shoeAccent), 0, -0.1, 0.06);
      // Glow sticks, one per hand, gripped in the fist.
      const stick = part(L.hand, new THREE.CylinderGeometry(0.026, 0.026, 0.46, 8), new THREE.MeshBasicMaterial({ color: side === 'L' ? C.stickB : C.stickA }), 0, -0.08, 0.05, 1, 1, 1, false);
      stick.rotation.x = Math.PI / 2;
      part(L.hand, sphere(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, -0.08, 0.28, 1, 1, 1, false);
      // Bracelets.
      part(L.fore, new THREE.TorusGeometry(0.06, 0.015, 6, 14), new THREE.MeshBasicMaterial({ color: side === 'L' ? C.stickA : C.stickB }), 0, -0.22, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
    }
  },
};
