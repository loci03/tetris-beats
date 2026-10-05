// DEACON GRACE — the choir director of the He Got Me cathedral: a
// powerhouse with a voice that rattles the stained glass. Royal-blue choir
// robe with wide bell sleeves, a gold stole embroidered with crosses, a
// crisp white collar, a crown of natural curls with a gold comb, gold
// earrings — and a white handkerchief in her right hand for waving when
// the spirit moves. Dignified, joyful, unstoppable.
//
// No three.js import here: build(kit) gets THREE through the kit.

export default {
  name: 'DEACON GRACE',
  scale: 1.02,
  skin: 0x6b4226,
  colors: {
    top: 0x1f3c9a, topShade: 0x162c74, pants: 0x2a2232, shoe: 0x1a1214, shoeAccent: 0xffc93a,
    hair: 0x1a0f0c, gold: 0xffc93a, stole: 0xffcf4a, collar: 0xfffaf0, hanky: 0xffffff, lips: 0x8a2a3a,
  },
  bareForearms: false,
  style: {
    // Gospel feel: the choir rock — a slow side-to-side over two beats,
    // weight landing on each side, the chest lifting and the head tipping
    // back on the beat (joy, not a drop), shoulders bouncing between.
    swagger: 1.2, bounce: 0.95, phraseOffset: 1,
    feel(p, { Bb, d, down, amt, e, s }) {
      const rock = Math.sin(Math.PI * Bb) * amt * e;
      p.root(0.06 * rock, -0.05 - 0.06 * d, 0);
      p.add('hips', 0, 0.08 * rock, 0.1 * rock);
      p.add('spine', 0.02 * d, 0, -0.06 * rock); p.add('chest', -0.06 * d, -0.06 * rock, -0.05 * rock);
      p.add('head', -0.1 * d * s.swagger, 0.05 * rock, 0.08 * rock);
      p.shrug(0.1 * (1 - down) * amt * e);
    },
    routines: { chill: ['graceChoirSway', 'graceRaiseHands'], hype: ['graceGospelStomp', 'graceShoutStep', 'graceChoirSway'] },
    accent: { pose: 'graceAccent', at: 3 },
  },
  moves: {
    1: ['gracePraiseHands', 'graceChoirClap'],
    2: ['graceHankyWave', 'graceTwoStep'],
    3: ['graceHolyShout', 'graceDirect'],
    4: ['graceRobeTwirl', 'graceJumpForJoy'],
  },
  branchMoves: { 2: 'graceHallelujah', 3: 'graceGloryStomp', 4: 'graceRejoice' },
  solo: 'graceAnointed',
  introTaunt: 'graceIntro',
  // Throws both hands at you and a blinding hallelujah light pours out:
  // the panel whites out and doves of light float up over your arrows.
  taunt: 'graceTaunt',
  tauntFx: { projectile: 'graceDove', disrupt: 'flash+float', color: '#fff3c4', n: 7 },
  victory: 'graceVictory',
  fx: { move: 'graceHalo', big: 'graceLight', taunt: 'graceDove' },

  build(k) {
    const { THREE, C, mats, toon, part, capsule, sphere, limbs, head, face, chest, spine, hips, neck } = k;
    const gold = toon(C.gold, { emissive: 0x4a3300 });
    const robe = mats.top, stole = toon(C.stole, { emissive: 0x3a2800 });
    // ── Hair: a full crown of natural curls with a gold comb ──
    part(head, sphere(0.3), mats.hair, 0, 0.33, -0.05, 1.08, 0.9, 1.0);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      part(head, sphere(0.1), mats.hair, Math.cos(a) * 0.24, 0.36 + 0.06 * Math.sin(a * 2), -0.05 + Math.sin(a) * 0.2, 1, 0.9, 1);
    }
    part(head, new THREE.TorusGeometry(0.09, 0.018, 5, 12, Math.PI), gold, 0.16, 0.5, 0.08, 1, 1, 1, false).rotation.set(0.3, 0.5, 0.4);
    for (const sx of [1, -1]) {
      part(head, new THREE.TorusGeometry(0.04, 0.012, 5, 12), gold, 0.245 * sx, 0.08, 0.02, 1, 1, 1, false).rotation.y = Math.PI / 2;
      part(face, new THREE.BoxGeometry(0.1, 0.018, 0.02), mats.dark, 0.088 * sx, 0.285, 0.22, 1, 1, 1, false).rotation.z = -0.2 * sx;
    }
    // ── Robe: V-neck with a white collar, gold stole with crosses ──
    part(neck, new THREE.TorusGeometry(0.085, 0.03, 6, 18), toon(C.collar), 0, -0.03, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
    part(chest, new THREE.ConeGeometry(0.07, 0.14, 3), toon(C.collar), 0, 0.33, 0.15, 1, 1, 0.3, false).rotation.z = Math.PI;
    const crossMat = toon(0xb0124a);
    for (const sx of [1, -1]) {
      const st = part(chest, new THREE.BoxGeometry(0.075, 0.46, 0.02), stole, 0.07 * sx, 0.12, 0.17, 1, 1, 1, false);
      st.rotation.z = 0.12 * sx;
      part(hips, new THREE.BoxGeometry(0.075, 0.38, 0.02), stole, 0.09 * sx, -0.26, 0.21, 1, 1, 1, false);
      part(hips, new THREE.BoxGeometry(0.04, 0.01, 0.01), crossMat, 0.09 * sx, -0.36, 0.225, 1, 1, 1, false);
      part(hips, new THREE.BoxGeometry(0.012, 0.07, 0.01), crossMat, 0.09 * sx, -0.355, 0.225, 1, 1, 1, false);
      part(hips, new THREE.BoxGeometry(0.08, 0.025, 0.022), gold, 0.09 * sx, -0.45, 0.215, 1, 1, 1, false); // fringe
    }
    part(chest, new THREE.CylinderGeometry(0.2, 0.2, 0.06, 18), toon(C.topShade), 0, 0.31, 0, 1.2, 1, 0.8, false);
    // Long flowing skirt of the robe, flaring to mid-shin, open low at the
    // back so the steps stay free.
    part(hips, new THREE.CylinderGeometry(0.25, 0.42, 0.6, 26, 1, true), robe, 0, -0.27, 0, 1, 1, 0.85).material.side = THREE.DoubleSide;
    part(hips, new THREE.TorusGeometry(0.42, 0.018, 4, 30), toon(C.topShade), 0, -0.57, 0, 1, 1, 0.85, false).rotation.x = Math.PI / 2;
    part(spine, new THREE.CylinderGeometry(0.21, 0.24, 0.24, 18), robe, 0, 0.04, 0, 1.05, 1, 0.82, false);
    // Bell sleeves flaring at the wrist, a gold cuff stripe.
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.sh, sphere(0.1), robe, 0.03 * L.sx, 0.0, 0, 1.1, 0.95, 1.05);
      // The thighs live entirely inside the robe; hidden so bent knees never poke through it.
      for (const c of L.thigh.children) if (c.isMesh) c.visible = false;
      const sl = part(L.fore, new THREE.CylinderGeometry(0.072, 0.12, 0.24, 16, 1, true), robe, 0, -0.15, 0);
      sl.material.side = THREE.DoubleSide;
      part(L.fore, new THREE.TorusGeometry(0.118, 0.009, 4, 18), stole, 0, -0.265, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
    }
    // Gold cross pendant.
    part(chest, new THREE.BoxGeometry(0.02, 0.07, 0.015), gold, 0, 0.2, 0.195, 1, 1, 1, false);
    part(chest, new THREE.BoxGeometry(0.05, 0.018, 0.015), gold, 0, 0.215, 0.195, 1, 1, 1, false);
    // ── White handkerchief in the right hand ──
    const hanky = new THREE.Group();
    const cloth = new THREE.PlaneGeometry(0.2, 0.22, 3, 3);
    const pos = cloth.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, 0.03 * Math.sin(pos.getX(i) * 20) + 0.02 * Math.cos(pos.getY(i) * 15));
    cloth.computeVertexNormals();
    const hk = part(hanky, cloth, toon(C.hanky, { side: THREE.DoubleSide, emissive: 0x222222 }), 0, -0.13, 0.02, 1, 1, 1);
    hk.rotation.set(0.2, 0.3, 0.2);
    hanky.position.set(0, -0.06, 0.02);
    limbs.R.hand.add(hanky);
  },
};
