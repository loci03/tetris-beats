// ROTTEN REX — a goofy cartoon zombie who just wants to dance. Mint-green
// skin, a messy mop of hair with a little sprout growing out of it, one
// eye way bigger than the other, forehead stitches, a buck tooth, a torn
// tee, ripped purple jeans (one leg torn off at the knee), a bandaged arm
// and mismatched sneakers. Nothing gory — just floppy. Dances like a
// Thriller video extra: claw hands, shoulder shimmies, the dead-man lean,
// limbs that flop and snap back, and a crawl-out-of-the-grave solo.

const TAU = Math.PI * 2;

export default {
  name: 'ROTTEN REX',
  scale: 1.0,
  skin: 0x92c45c,
  colors: {
    top: 0xd9d2b4, topShade: 0xb5ad8e, pants: 0x5d4c92, shoe: 0x6a4630, shoeAccent: 0xe8e4d4,
    hair: 0x2c1c3c, stitch: 0x2a1a30, bandage: 0xf0ead8, bruise: 0x6a5a9a, tooth: 0xfffbea, sprout: 0x4fd04a, shoe2: 0xd83a3a,
  },
  bareForearms: true,
  // Zombie lurch: drops into the beat like everyone else, but the head
  // lolls in late, one shoulder hangs higher, the spine stays hunched and
  // tilted — a puppet with a couple of strings cut.
  style: {
    swagger: 1.2, bounce: 1.0, phraseOffset: 1,
    feel: (p, { B, Bb, d, amt, e, s }) => {
      const k = amt * e;
      const lag = Math.pow(0.5 + 0.5 * Math.cos(TAU * Bb - 1.1), 2);
      const sw = Math.sin(Math.PI * B) * k;
      p.root(0.03 * sw, -0.1 * d, 0);
      p.add('spine', 0.05 * k, 0, 0.05 * k);
      p.add('chest', 0.06 * d + 0.05 * k, 0.08 * sw, 0);
      p.add('head', 0.2 * lag * k * s.swagger, 0, 0.12 * Math.sin(Math.PI * B - 0.9) * k + 0.06 * k);
      p.shrug(0.12 * k * (0.5 + 0.5 * Math.sin(Math.PI * B)), 0.02 * k);
    },
    routines: { chill: ['rexShamble', 'rexSway'], hype: ['rexThriller', 'rexShimmyStep', 'rexShamble'] },
    accent: { pose: 'rexAccent', at: 5 },
  },
  moves: {
    1: ['rexClaw', 'rexLimbFlop'],
    2: ['rexThrillerStep', 'rexShimmy'],
    3: ['rexDeadLean', 'rexJitter'],
    4: ['rexRiseUp', 'rexBoneCrack'],
  },
  branchMoves: { 2: 'rexMoonShamble', 3: 'rexHeadRoll', 4: 'rexGraveDance' },
  solo: 'rexGraveCrawl',
  introTaunt: 'rexIntro',
  // Scoops up a glob of toxic goo and lobs it at you: slime splats all over
  // your arrows and everything goes blurry.
  taunt: 'rexTaunt',
  tauntFx: { projectile: 'rexGoo', disrupt: 'splat+blur', color: '#66ff33', n: 6 },
  victory: 'rexVictory',
  fx: { move: 'rexBone', big: 'sparkle', taunt: 'rexGoo' },

  build(kit) {
    const { THREE, C, mats, toon, part, capsule, sphere, limbs, face, eyes, mouth, head, chest, spine, hips } = kit;
    const skin = mats.skin, stitch = toon(C.stitch), dark = toon(0x7aa84a);

    // One eye way bigger than the other: the left eye (and pupil) move into
    // a scaled group, so the expression code still squashes them.
    {
      const e = eyes[0], grp = new THREE.Group();
      grp.position.copy(e.eye.position); grp.scale.setScalar(1.55);
      face.add(grp);
      e.pupil.position.sub(e.eye.position); e.eye.position.set(0, 0, 0);
      e.pupil.scale.x *= 0.7;
      grp.add(e.eye); grp.add(e.pupil);
      grp.position.x += 0.012; grp.position.y += 0.01;
    }
    eyes[1].pupil.scale.x *= 0.8;
    // Bags under the eyes.
    for (const [sx, s] of [[1, 1.4], [-1, 1]]) part(face, sphere(0.04), toon(C.bruise), 0.088 * sx, 0.18, 0.21, s * 1.3, 0.45, 0.4, false);

    // Messy mop of hair: tufts sticking out every which way, plus a sprout.
    part(head, sphere(0.255), mats.hair, 0, 0.27, -0.04, 1.0, 0.8, 1.0);
    const tuft = new THREE.ConeGeometry(0.07, 0.24, 6);
    for (const [x, y, z, rx, rz] of [[0.1, 0.46, 0.08, 0.4, -0.5], [-0.12, 0.47, 0.05, 0.3, 0.6], [0.02, 0.5, -0.06, -0.3, 0.1], [0.2, 0.36, -0.05, 0, -1.1], [-0.21, 0.35, -0.04, 0, 1.2], [-0.04, 0.44, 0.16, 0.9, 0.2], [0.08, 0.4, -0.2, -0.9, -0.2]]) {
      part(head, tuft, mats.hair, x, y, z).rotation.set(rx, 0, rz);
    }
    part(head, new THREE.CylinderGeometry(0.008, 0.01, 0.14, 5), toon(C.sprout), 0.03, 0.58, 0.0, 1, 1, 1, false).rotation.z = -0.2;
    for (const sx of [1, -1]) part(head, sphere(0.035), toon(C.sprout), 0.05 + 0.04 * sx, 0.65, 0, 1.4, 0.5, 0.8, false).rotation.z = 0.5 * sx;

    // Forehead stitches + a cheek stitch.
    part(face, new THREE.BoxGeometry(0.16, 0.012, 0.012), stitch, -0.04, 0.38, 0.215, 1, 1, 1, false).rotation.z = 0.15;
    for (let i = 0; i < 5; i++) part(face, new THREE.BoxGeometry(0.01, 0.045, 0.012), stitch, -0.11 + i * 0.035, 0.375 + i * 0.005, 0.218, 1, 1, 1, false);
    part(face, new THREE.BoxGeometry(0.06, 0.01, 0.01), stitch, -0.15, 0.15, 0.2, 1, 1, 1, false).rotation.z = -0.4;
    for (let i = 0; i < 3; i++) part(face, new THREE.BoxGeometry(0.008, 0.03, 0.01), stitch, -0.17 + i * 0.02, 0.16 - i * 0.008, 0.202, 1, 1, 1, false);
    // Buck tooth.
    part(face, new THREE.BoxGeometry(0.035, 0.035, 0.01), toon(C.tooth), 0.012, 0.115, 0.238, 1, 1, 1, false);

    // Torn tee: ragged hem + a hole.
    const tee = mats.top;
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU;
      part(spine, new THREE.ConeGeometry(0.045, 0.1, 4), tee, Math.sin(a) * 0.18, -0.02, Math.cos(a) * 0.14, 1, 1, 1, false).rotation.x = Math.PI;
    }
    part(chest, new THREE.CircleGeometry(0.045, 7), dark, 0.07, 0.08, 0.162, 1.2, 1, 1, false);
    part(chest, new THREE.BoxGeometry(0.1, 0.012, 0.01), toon(C.topShade), -0.06, 0.2, 0.163, 1, 1, 1, false).rotation.z = 0.5;
    // Sleeve hems.
    for (const side of ['L', 'R']) part(limbs[side].arm, new THREE.TorusGeometry(0.07, 0.016, 5, 12), tee, 0, -0.27, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
    part(limbs.L.arm, capsule(0.064, 0.06), skin, 0, -0.3, 0);
    part(limbs.R.arm, capsule(0.064, 0.06), skin, 0, -0.3, 0);
    // Bandage wraps on the left forearm.
    for (let i = 0; i < 4; i++) part(limbs.L.fore, new THREE.TorusGeometry(0.06, 0.016, 5, 12), toon(C.bandage), 0, -0.06 - i * 0.05, 0, 1, 1, 1, false).rotation.set(Math.PI / 2 + (i % 2 ? 0.2 : -0.2), 0, 0);

    // Ripped jeans: the right leg torn off at the knee, a patch on the left.
    part(limbs.R.shin, capsule(0.068, 0.28), skin, 0, -0.2, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(limbs.R.shin, new THREE.ConeGeometry(0.035, 0.08, 4), mats.pants, Math.sin(a) * 0.075, -0.03, Math.cos(a) * 0.075, 1, 1, 1, false).rotation.x = Math.PI; }
    part(limbs.R.thigh, new THREE.CylinderGeometry(0.095, 0.085, 0.12, 12), mats.pants, 0, -0.4, 0);
    part(limbs.L.thigh, new THREE.BoxGeometry(0.1, 0.1, 0.02), toon(0x9a7a3a), 0.02, -0.25, 0.09, 1, 1, 1, false).rotation.z = 0.2;
    // Mismatched sneakers: one red, laces flopping.
    part(limbs.R.foot, new THREE.BoxGeometry(0.155, 0.095, 0.285), toon(C.shoe2), 0, -0.035, 0.06);
    for (const sx of [1, -1]) part(limbs.L.foot, new THREE.BoxGeometry(0.012, 0.01, 0.12), toon(C.shoeAccent), 0.03 * sx, 0.0, 0.16, 1, 1, 1, false).rotation.y = 0.5 * sx;
  },
};
