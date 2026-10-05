// MR. MONDAY — the boss of the open-plan office. Charcoal suit, red tie,
// thick glasses, side parting, a "#1 BOSS" mug in his right hand and a
// clipboard of TPS reports in his left. Uptight on the clock; secretly a
// Chicago-house head who jacks, skates and loose-legs like it's 1988.
// His tie hangs off the neck joint, so neck sway (with the head counter-
// rotated) swings it — the groove feel keeps it flapping on the beat.

const TAU = Math.PI * 2;

export default {
  name: 'MR. MONDAY',
  scale: 1.03,
  skin: 0xf0c4a0,
  colors: {
    top: 0x34405e, topShade: 0x262f48, pants: 0x2f3a56, shoe: 0x17110f, shoeAccent: 0x4a3324,
    hair: 0x5b4636, tie: 0xd8262e, shirt: 0xf6f4ee, mug: 0xffffff, coffee: 0x5a3318,
    board: 0xb9813f, paper: 0xfbfbf6, metal: 0xb8bcc8, glasses: 0x15121a, grey: 0x9a9088, gold: 0xffc43a,
  },
  bareForearms: false,
  // House: the "jack" — the torso rolls into every beat, the knees pump and
  // the tie swings on the two-beat sway. Not the player's hip-hop drop,
  // Toni's disco pop or Tina's catwalk sway.
  style: {
    swagger: 1.15, bounce: 1.0, phraseOffset: 1,
    feel: (p, { B, Bb, d, amt, e, s }) => {
      const ph = TAU * Bb, k = amt * e;
      const jack = Math.cos(ph), lag = Math.cos(ph - 0.9);
      const sway = Math.sin(Math.PI * B) * k * s.swagger;
      p.root(0.03 * sway, -0.075 * d, -0.025 * jack * k);
      p.add('spine', 0.05 * jack * k); p.add('chest', 0.09 * lag * k);
      p.add('head', -0.05 * jack * k + 0.06 * d, 0, 0);
      p.shrug(0.05 * (0.5 - 0.5 * jack) * k);
      p.add('chest', 0, 0.06 * sway, -0.03 * sway);
      // Tie swing: the neck rolls, the head stays level.
      const t = 0.22 * Math.sin(Math.PI * B - 0.6) * k;
      p.add('neck', 0.08 * (0.5 + 0.5 * lag) * k, 0, t); p.add('head', -0.08 * (0.5 + 0.5 * lag) * k, 0, -t);
    },
    routines: { chill: ['mondayJack', 'mondayHeelToe'], hype: ['mondaySkate', 'mondayLooseLegs', 'mondayJack'] },
    accent: { pose: 'mondayAccent', at: 3 },
  },
  moves: {
    1: ['mondayTyping', 'mondayFarmer'],
    2: ['mondayShuffle', 'mondayCopier'],
    3: ['mondayTieSwing', 'mondayStapler'],
    4: ['mondayCoffeeSpin', 'mondayGrinder'],
  },
  branchMoves: { 2: 'mondayJackTrain', 3: 'mondaySwivelChair', 4: 'mondayOvertime' },
  solo: 'mondayHappyHour',
  introTaunt: 'mondayIntro',
  // Rips the TPS reports off the clipboard and flings them at you: a
  // blizzard of paperwork rains down over your arrows.
  taunt: 'mondayTaunt',
  tauntFx: { projectile: 'mondayTps', disrupt: 'fall+shake', color: '#6db4ff', n: 9 },
  victory: 'mondayVictory',
  fx: { move: 'mondayMug', big: 'sparkle', taunt: 'mondayTps' },

  build(kit) {
    const { THREE, C, mats, toon, part, capsule, sphere, limbs, face, head, neck, chest, spine, hips } = kit;
    const shirt = toon(C.shirt), tieM = toon(C.tie), dark = toon(C.topShade);
    const gold = toon(C.gold, { emissive: 0x3a2800 });

    // Side-parted, slicked hair with greying temples.
    part(head, sphere(0.255), mats.hair, 0, 0.255, -0.035, 0.99, 0.82, 0.98);
    part(head, capsule(0.07, 0.24), mats.hair, -0.03, 0.43, 0.08, 1.15, 1, 0.75).rotation.z = 1.45;
    part(head, new THREE.BoxGeometry(0.012, 0.02, 0.2), toon(0xe8c0a0), 0.09, 0.445, 0.02, 1, 1, 1, false);
    for (const sx of [1, -1]) part(head, sphere(0.06), toon(C.grey), 0.22 * sx, 0.27, -0.02, 0.55, 1, 1.2);
    // Thick black glasses (frames only — the eyes show through).
    const gl = toon(C.glasses);
    for (const sx of [1, -1]) {
      const x = 0.088 * sx;
      part(face, new THREE.BoxGeometry(0.13, 0.024, 0.02), gl, x, 0.288, 0.238, 1, 1, 1, false);
      part(face, new THREE.BoxGeometry(0.13, 0.016, 0.02), gl, x, 0.19, 0.236, 1, 1, 1, false);
      part(face, new THREE.BoxGeometry(0.016, 0.1, 0.02), gl, x + 0.058, 0.24, 0.234, 1, 1, 1, false);
      part(face, new THREE.BoxGeometry(0.016, 0.1, 0.02), gl, x - 0.058, 0.24, 0.238, 1, 1, 1, false);
      part(head, new THREE.BoxGeometry(0.012, 0.016, 0.2), gl, 0.205 * sx, 0.26, 0.12, 1, 1, 1, false);
    }
    part(face, new THREE.BoxGeometry(0.05, 0.014, 0.02), gl, 0, 0.27, 0.242, 1, 1, 1, false);
    // Neat mustache.
    part(face, capsule(0.024, 0.09), mats.hair, 0, 0.142, 0.236, 1, 1, 0.8, false).rotation.z = Math.PI / 2;

    // Suit: shirt front, lapels, jacket hem over the hips, buttons, paunch.
    const v = part(chest, new THREE.CircleGeometry(0.11, 3), shirt, 0, 0.27, 0.168, 1, 1.5, 1, false);
    v.rotation.z = -Math.PI / 2;
    for (const sx of [1, -1]) {
      const lap = part(chest, new THREE.BoxGeometry(0.06, 0.26, 0.02), dark, 0.075 * sx, 0.24, 0.163, 1, 1, 1, false);
      lap.rotation.z = 0.42 * sx; lap.rotation.x = -0.08;
    }
    part(chest, new THREE.TorusGeometry(0.105, 0.03, 6, 18), shirt, 0, 0.36, 0.0, 1.1, 1, 1).rotation.x = Math.PI / 2 - 0.25;
    part(spine, sphere(0.17), mats.top, 0, 0.1, 0.05, 1.08, 0.95, 0.92);
    part(hips, new THREE.CylinderGeometry(0.215, 0.245, 0.24, 18, 1, true), mats.top, 0, 0.04, 0, 1.0, 1, 0.8);
    for (const y of [0.13, 0.02]) part(spine, sphere(0.018), gold, 0, y, 0.205, 1, 1, 0.6, false);
    // Breast pocket: square + pen.
    part(chest, new THREE.BoxGeometry(0.06, 0.035, 0.012), toon(C.tie), 0.115, 0.17, 0.165, 1, 1, 1, false).rotation.z = 0.15;
    part(chest, new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6), toon(0x2050c0), 0.075, 0.18, 0.168, 1, 1, 1, false);

    // The tie: knot + blade, hung off the neck so neck sway swings it.
    part(neck, new THREE.BoxGeometry(0.05, 0.045, 0.04), tieM, 0, -0.06, 0.15, 1, 1, 1);
    const blade = part(neck, new THREE.CylinderGeometry(0.028, 0.042, 0.33, 4), tieM, 0, -0.25, 0.17, 1, 1, 0.35);
    blade.rotation.y = Math.PI / 4;
    part(neck, new THREE.ConeGeometry(0.042, 0.05, 4), tieM, 0, -0.44, 0.17, 1, 1, 0.35).rotation.set(Math.PI, Math.PI / 4, 0);

    // Shirt cuffs + oxford shoes.
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.fore, new THREE.TorusGeometry(0.058, 0.016, 5, 14), shirt, 0, -0.25, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      part(L.foot, new THREE.BoxGeometry(0.16, 0.03, 0.06), toon(C.shoeAccent), 0, -0.03, -0.06, 1, 1, 1, false);
    }

    // "#1 BOSS" coffee mug in the right hand (upright when the forearm is
    // held forward — his default carry).
    const mug = new THREE.Group();
    mug.position.set(-0.02, -0.07, 0.07);
    mug.rotation.x = Math.PI / 2;
    limbs.R.hand.add(mug);
    part(mug, new THREE.CylinderGeometry(0.068, 0.06, 0.15, 14), toon(C.mug), 0, 0, 0);
    part(mug, new THREE.CylinderGeometry(0.06, 0.06, 0.01, 14), toon(C.coffee), 0, 0.071, 0, 1, 1, 1, false);
    part(mug, new THREE.CylinderGeometry(0.0695, 0.064, 0.035, 14), toon(C.tie), 0, 0.01, 0, 1, 1, 1, false);
    part(mug, new THREE.TorusGeometry(0.04, 0.013, 6, 12), toon(C.mug), 0.075, 0, 0).rotation.y = 0;

    // Clipboard of TPS reports in the left hand.
    const cb = new THREE.Group();
    cb.position.set(0.02, -0.07, 0.03);
    limbs.L.hand.add(cb);
    part(cb, new THREE.BoxGeometry(0.018, 0.34, 0.25), toon(C.board), 0, -0.13, 0.04);
    part(cb, new THREE.BoxGeometry(0.008, 0.29, 0.21), toon(C.paper), 0.013, -0.15, 0.04, 1, 1, 1, false);
    part(cb, new THREE.BoxGeometry(0.03, 0.04, 0.1), toon(C.metal), 0.006, 0.02, 0.04, 1, 1, 1, false);
    for (let i = 0; i < 4; i++) part(cb, new THREE.BoxGeometry(0.004, 0.012, 0.15), toon(0x7a8aa8), 0.018, -0.07 - i * 0.05, 0.04, 1, 1, 1, false);
  },
};
