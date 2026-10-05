// ZOOT — the swing cat who runs the Trumpets Please jazz club. A teal zoot
// suit with a knee-length drape jacket and shoulders out to here, pegged
// trousers, a long gold watch chain, two-tone spectator shoes, a wide-brim
// fedora with a feather cocked over one eye, a pencil moustache — and his
// gold trumpet in the right hand, always.
//
// No three.js import here: build(kit) gets THREE through the kit.

export default {
  name: 'ZOOT',
  scale: 1.04,
  skin: 0x8a5a3b,
  colors: {
    top: 0x1aa39c, topShade: 0x127a75, pants: 0x1aa39c, shoe: 0xf4f0e6, shoeAccent: 0x1a1214,
    hair: 0x150d0a, hat: 0x2a1030, hatBand: 0xff3d9a, feather: 0xffd23f, shirt: 0xfff4e0, tie: 0xff3d9a,
    gold: 0xffc13a, brass: 0xf5b829, stripe: 0x0c5c58,
  },
  bareForearms: false,
  style: {
    // Swing feel: the Lindy pulse — knees drop into the floor on every
    // beat, the chest rides forward, hips swivel side to side each beat and
    // the shoulders roll a little behind the beat, laid back.
    swagger: 1.3, bounce: 1.0, phraseOffset: 1,
    feel(p, { B, Bb, d, amt, e, s }) {
      p.root(0, -0.12 * d, 0);
      p.add('spine', 0.07 * amt + 0.04 * d); p.add('chest', 0.03 * d);
      const sw = Math.cos(Math.PI * Bb) * amt * e;
      p.add('hips', 0, 0.12 * sw, 0.05 * sw);
      p.add('chest', 0, -0.1 * sw, -0.04 * sw);
      const lag = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * (Bb - 0.18)), 2) * amt;
      p.add('head', 0.16 * lag * s.swagger, 0.06 * sw, 0);
      p.shrug(0.09 * (1 - lag) * e, 0.09 * (1 - lag) * e);
    },
    routines: { chill: ['zootTripleSnap', 'zootBoogieBack'], hype: ['zootCharleston', 'zootSuzieQ', 'zootTripleSnap'] },
    accent: { pose: 'zootAccent', at: 3 },
  },
  moves: {
    1: ['zootJazzHands', 'zootTrumpetBlast'],
    2: ['zootBeesKnees', 'zootTapStomp'],
    3: ['zootSwingOut', 'zootScatStrut'],
    4: ['zootNicholasSplits', 'zootSpin'],
  },
  branchMoves: { 2: 'zootShimSham', 3: 'zootShortyGeorge', 4: 'zootHiDeHo' },
  solo: 'zootHotSolo',
  introTaunt: 'zootIntro',
  // A full-blast trumpet shot right in your face: brass notes rain over the
  // panel and everything rattles.
  taunt: 'zootTaunt',
  tauntFx: { projectile: 'zootBlast', disrupt: 'fall+shake', color: '#f5b829', n: 8 },
  victory: 'zootVictory',
  fx: { move: 'zootNote', big: 'zootStar', taunt: 'zootBlast' },

  build(k) {
    const { THREE, C, mats, toon, part, capsule, sphere, limbs, head, face, chest, spine, hips, neck } = k;
    const gold = toon(C.gold, { emissive: 0x4a3300 });
    // ── Fedora: wide brim cocked over the right eye, pinched crown,
    // magenta band and a yellow feather. ──
    const hat = new THREE.Group();
    hat.position.set(-0.02, 0.4, -0.01); hat.rotation.set(-0.08, 0, 0.16);
    head.add(hat);
    const hatMat = toon(C.hat);
    part(hat, new THREE.CylinderGeometry(0.4, 0.4, 0.025, 28), hatMat, 0, 0, 0, 1, 1, 0.95);
    part(hat, new THREE.CylinderGeometry(0.2, 0.235, 0.22, 20), hatMat, 0, 0.11, 0, 1, 1, 0.92);
    part(hat, new THREE.BoxGeometry(0.03, 0.06, 0.2), hatMat, 0, 0.22, 0.02, 1, 1, 1, false);       // pinch
    part(hat, new THREE.CylinderGeometry(0.238, 0.24, 0.05, 20), toon(C.hatBand), 0, 0.035, 0, 1, 1, 0.93, false);
    const feather = part(hat, capsule(0.025, 0.2), toon(C.feather, { emissive: 0x3a2a00 }), -0.2, 0.12, -0.05, 1, 1, 0.5, false);
    feather.rotation.set(0.2, 0, 0.75);
    // Short hair at the sides under the hat, pencil moustache, brows.
    part(head, sphere(0.25), mats.hair, 0, 0.22, -0.04, 0.99, 0.95, 0.96);
    part(face, capsule(0.012, 0.11), mats.hair, 0, 0.145, 0.236, 1, 1, 1, false).rotation.z = Math.PI / 2;
    // ── Shirt front, wide tie, peak lapels ──
    part(chest, new THREE.BoxGeometry(0.12, 0.3, 0.02), toon(C.shirt), 0, 0.17, 0.165, 1, 1, 1, false);
    part(chest, new THREE.BoxGeometry(0.06, 0.24, 0.02), toon(C.tie), 0, 0.14, 0.18, 1, 1, 1, false);
    part(chest, new THREE.BoxGeometry(0.075, 0.05, 0.03), toon(C.tie), 0, 0.29, 0.178, 1, 1, 1, false);
    for (const sx of [1, -1]) {
      const lap = part(chest, new THREE.BoxGeometry(0.07, 0.3, 0.02), mats.topShade, 0.085 * sx, 0.15, 0.17, 1, 1, 1, false);
      lap.rotation.z = -0.3 * sx;
    }
    // Pinstripes on the jacket front.
    const stripe = toon(C.stripe);
    for (const sx of [1, -1]) for (const dx of [0.14, 0.2]) part(chest, new THREE.BoxGeometry(0.008, 0.34, 0.01), stripe, dx * sx, 0.12, 0.15, 1, 1, 1, false).rotation.y = 0.5 * sx;
    // ── Drape jacket: huge padded shoulders, long tail flaring at the back
    // and sides (open in front so the kicks are free). ──
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.sh, sphere(0.125), mats.top, 0.05 * L.sx, 0.03, 0, 1.25, 0.8, 1.05);
      part(L.fore, new THREE.TorusGeometry(0.06, 0.012, 5, 14), toon(C.shirt), 0, -0.24, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      // Pegged trousers: full at the knee, tight at the ankle.
      for (const c of L.thigh.children) if (c.isMesh) c.scale.set(1.45, 1, 1.4);
      for (const c of L.shin.children) if (c.isMesh) c.scale.set(1.15, 1, 1.15);
      part(L.shin, new THREE.CylinderGeometry(0.07, 0.075, 0.05, 12), mats.topShade, 0, -0.39, 0, 1, 1, 1, false);
      // Spectator shoes: white with a dark toe cap and heel.
      part(L.foot, new THREE.BoxGeometry(0.158, 0.095, 0.1), toon(C.shoeAccent), 0, -0.03, 0.17, 1, 1, 1, false);
      part(L.foot, new THREE.BoxGeometry(0.158, 0.095, 0.07), toon(C.shoeAccent), 0, -0.03, -0.06, 1, 1, 1, false);
    }
    part(hips, new THREE.CylinderGeometry(0.27, 0.36, 0.55, 22, 1, true, Math.PI * 0.32, Math.PI * 1.36), mats.top, 0, -0.18, 0, 1, 1, 0.9).material.side = THREE.DoubleSide;
    part(spine, new THREE.CylinderGeometry(0.205, 0.22, 0.2, 18), mats.top, 0, 0.06, 0, 1.05, 1, 0.82, false);
    part(spine, new THREE.TorusGeometry(0.2, 0.018, 5, 22), mats.topShade, 0, 0.0, 0, 1.05, 0.82, 1, false).rotation.x = Math.PI / 2;
    // Watch chain looping from the waist to the knee.
    const chain = part(hips, new THREE.TorusGeometry(0.2, 0.012, 5, 20, Math.PI), gold, -0.18, -0.2, 0.17, 1, 1.5, 1, false);
    chain.rotation.set(0, 0.35, Math.PI + 0.25);
    part(chest, new THREE.ConeGeometry(0.04, 0.06, 4), toon(C.tie), 0.15, 0.24, 0.15, 1, 1, 0.4, false); // pocket square
    // ── The trumpet (right hand): bell flaring forward along the hand's z,
    // three valves on top, lead pipe back to the mouthpiece. ──
    const brass = toon(C.brass, { emissive: 0x4a3000 });
    const trumpet = new THREE.Group();
    const bellPts = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; bellPts.push(new THREE.Vector2(0.014 + 0.085 * Math.pow(t, 3.2), t * 0.2)); }
    const bell = part(trumpet, new THREE.LatheGeometry(bellPts, 16), brass, 0, 0.03, 0.2, 1, 1, 1);
    bell.rotation.x = Math.PI / 2; bell.material.side = THREE.DoubleSide;
    part(trumpet, new THREE.CylinderGeometry(0.014, 0.014, 0.36, 8), brass, 0, 0.03, 0.03, 1, 1, 1).rotation.x = Math.PI / 2;
    part(trumpet, new THREE.CylinderGeometry(0.013, 0.013, 0.24, 8), brass, 0, -0.025, 0.02, 1, 1, 1, false).rotation.x = Math.PI / 2;
    part(trumpet, new THREE.TorusGeometry(0.028, 0.012, 6, 12, Math.PI), brass, 0, 0.003, -0.1, 1, 1, 1, false).rotation.set(0, Math.PI / 2, Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      part(trumpet, new THREE.CylinderGeometry(0.016, 0.016, 0.09, 8), brass, 0, 0.01, -0.03 + i * 0.035);
      part(trumpet, new THREE.CylinderGeometry(0.012, 0.012, 0.02, 8), toon(0xfff2d0), 0, 0.065, -0.03 + i * 0.035, 1, 1, 1, false);
    }
    part(trumpet, new THREE.CylinderGeometry(0.018, 0.008, 0.05, 8), brass, 0, 0.03, -0.17, 1, 1, 1, false).rotation.x = Math.PI / 2;
    // Attachment solved so that with the arm at PLAY (moves.js) the mouthpiece
    // sits on the lips and the bell points out over the crowd.
    trumpet.position.set(-0.015, -0.085, -0.04); trumpet.rotation.set(2.831, -0.088, 0.901);
    limbs.R.hand.add(trumpet);
  },
};
