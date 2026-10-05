// CHEF GOUDA — Mac & Cheese's boss: a big jolly chef with a tall toque, a
// handlebar mustache, rolled-up sleeves, a cheese-yellow apron over a round
// belly and a giant wooden spoon he never puts down (right hand).
// Old-school party dances: stir the pot, the sprinkler, the cabbage patch,
// the twist, the bump, spoon-drum hits, the belly bounce, Cossack kicks.

// Jolly feel: drops into the beat and rocks side to side over two beats,
// the belly jiggling a half-beat behind and the head tilting the other way.
function jolly(p, { Bb, down, d, amt, e, s }) {
  const side = Math.sin(Math.PI * Bb) * amt * e;
  const jig = Math.sin(Math.PI * 2 * Bb - 1.2) * amt * e;
  p.root(0.035 * side, -0.09 * d, 0);
  p.add('spine', 0.03 * d, 0, 0.05 * side);
  p.add('chest', 0.05 * d - 0.03 * jig, 0.04 * side, 0.06 * side);
  p.add('head', 0.12 * d * s.swagger, 0, -0.1 * side);
  p.shrug(0.08 * (1 - down) * amt * e);
}

export default {
  name: 'CHEF GOUDA',
  scale: 1.1,
  skin: 0xf2c09a,
  colors: {
    top: 0xf8f5ec, topShade: 0xe2ddd0, pants: 0x2e2e3a, shoe: 0x1c1a1e, shoeAccent: 0xffcc33,
    hair: 0x3b2414, apron: 0xffc532, apronShade: 0xff9a1a, scarf: 0xe2322a, wood: 0xc98a4a, woodDark: 0x8a5426,
    cheek: 0xff8f8f,
  },
  bareForearms: true,
  style: {
    swagger: 1.15, bounce: 1.05, phraseOffset: 1,
    feel: jolly,
    routines: { chill: ['goudaStirPot', 'goudaBellyBounce'], hype: ['goudaSprinkler', 'goudaBump', 'goudaStirPot'] },
    accent: { pose: 'goudaAccent', at: 3 },
  },
  moves: {
    1: ['goudaSpoonDrum', 'goudaSeasoning'],
    2: ['goudaSprinkler', 'goudaCabbage'],
    3: ['goudaTwist', 'goudaBump'],
    4: ['goudaHeelClick', 'goudaMixer'],
  },
  branchMoves: { 2: 'goudaChefKiss', 3: 'goudaCossack', 4: 'goudaPotSpin' },
  solo: 'goudaCheeseStorm',
  introTaunt: 'goudaIntro',
  taunt: 'goudaTaunt',
  // Scoops a dollop of molten cheese and catapults it with the spoon:
  // cheese splats all over your arrows.
  tauntFx: { projectile: 'goudaSplat', disrupt: 'splat+wobble', color: '#ffcc33', n: 7 },
  victory: 'goudaVictory',
  fx: { move: 'goudaMac', big: 'sparkle', taunt: 'goudaSplat' },

  build(kit) {
    const { THREE, C, mats, toon, part, limbs, face, brows, hips, spine, chest, neck, head } = kit;
    // Low-poly helpers for the outfit (the rig's own are high-res).
    const sphere = (r) => new THREE.SphereGeometry(r, r > 0.12 ? 16 : 10, r > 0.12 ? 12 : 7);
    const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 3, 8);
    const white = mats.top, apron = toon(C.apron), apronShade = toon(C.apronShade, { side: THREE.DoubleSide });
    const wood = toon(C.wood), woodDark = toon(C.woodDark), scarf = toon(C.scarf), black = toon(0x1a1416);

    // ── Round belly under the jacket, with the apron bib over it ──
    part(spine, sphere(0.25), white, 0, 0.1, 0.05, 1.12, 1.0, 1.0);
    part(spine, new THREE.SphereGeometry(0.262, 20, 12, 0.35, Math.PI - 0.7, 0.35, 1.9), toon(C.apron, { side: THREE.DoubleSide }), 0, 0.1, 0.05, 1.12, 1.0, 1.0, false);
    part(chest, new THREE.BoxGeometry(0.26, 0.2, 0.03), apron, 0, 0.0, 0.2, 1, 1, 1, false);
    // Apron strings round the neck and the waist.
    for (const sx of [1, -1]) part(chest, capsule(0.012, 0.3), apronShade, 0.1 * sx, 0.24, 0.12, 1, 1, 1, false).rotation.z = -0.35 * sx;
    part(hips, new THREE.TorusGeometry(0.235, 0.02, 6, 24), apronShade, 0, 0.1, 0, 1, 0.85, 1.05, false).rotation.x = Math.PI / 2;
    // Apron skirt down over the thighs, with a cheese-drip hem.
    part(hips, new THREE.CylinderGeometry(0.25, 0.33, 0.42, 18, 1, true, -1.05, 2.1), apronShade, 0, -0.14, 0.02, 1, 1, 0.95, false);
    part(hips, new THREE.CylinderGeometry(0.248, 0.328, 0.4, 18, 1, true, -1.0, 2.0), toon(C.apron, { side: THREE.DoubleSide }), 0, -0.13, 0.025, 1, 1, 0.95);
    for (let i = 0; i < 5; i++) {
      const a = -0.8 + i * 0.4;
      part(hips, capsule(0.03, 0.05 + (i % 2) * 0.05), apronShade, Math.sin(a) * 0.335, -0.35 - (i % 2) * 0.03, Math.cos(a) * 0.32 + 0.02, 1, 1, 0.6, false);
    }
    // Pocket with a little cheese wedge peeking out.
    part(hips, new THREE.BoxGeometry(0.13, 0.08, 0.02), apronShade, -0.1, -0.1, 0.3, 1, 1, 1, false).rotation.y = -0.3;

    // ── Chef jacket: double-breasted buttons, collar, red neckerchief ──
    for (const sx of [1, -1]) for (let k = 0; k < 2; k++) part(chest, sphere(0.022), black, 0.075 * sx, 0.22 + k * 0.09, 0.19 - k * 0.012, 1, 1, 0.6, false);
    part(chest, new THREE.TorusGeometry(0.11, 0.04, 8, 20), white, 0, 0.36, 0.0, 1.15, 1, 1).rotation.x = Math.PI / 2;
    part(neck, new THREE.TorusGeometry(0.075, 0.03, 8, 18), scarf, 0, 0.0, 0, 1, 1, 1).rotation.x = Math.PI / 2;
    const knot = part(neck, new THREE.ConeGeometry(0.06, 0.13, 3), scarf, 0, -0.07, 0.085);
    knot.rotation.set(Math.PI, 0, 0);
    // Rolled-up sleeves.
    for (const side of ['L', 'R']) part(limbs[side].arm, new THREE.TorusGeometry(0.068, 0.03, 8, 16), white, 0, -0.29, 0, 1, 1, 1).rotation.x = Math.PI / 2;

    // ── Head: toque, mustache, bushy brows, rosy cheeks, button nose ──
    part(head, sphere(0.235), mats.hair, 0, 0.2, -0.05, 1.0, 0.95, 0.95);            // short hair at the back
    for (const sx of [1, -1]) part(head, capsule(0.045, 0.1), mats.hair, 0.22 * sx, 0.18, 0.02, 1, 1, 0.8);  // sideburns
    part(head, new THREE.CylinderGeometry(0.235, 0.24, 0.09, 24), white, 0, 0.38, 0, 1, 1, 1);          // band
    part(head, new THREE.CylinderGeometry(0.2, 0.235, 0.36, 24), white, 0, 0.58, -0.01, 1, 1, 1);        // tall toque
    for (let i = 0; i < 6; i++) {                                                                       // the puff
      const a = (i / 6) * Math.PI * 2;
      part(head, sphere(0.15), white, Math.cos(a) * 0.13, 0.8, Math.sin(a) * 0.13 - 0.01, 1, 0.85, 1);
    }
    part(head, sphere(0.17), white, 0, 0.86, -0.01, 1, 0.8, 1);
    // Pleats on the toque.
    for (let i = 0; i < 8; i++) {
      const a = -1.2 + i * 0.34;
      part(head, new THREE.BoxGeometry(0.012, 0.32, 0.012), mats.topShade, Math.sin(a) * 0.218, 0.58, Math.cos(a) * 0.218 - 0.01, 1, 1, 1, false).rotation.y = a;
    }
    // Handlebar mustache: two fat curls from under the nose.
    for (const sx of [1, -1]) {
      const m = part(face, capsule(0.034, 0.1), mats.hair, 0.065 * sx, 0.135, 0.232, 1, 1, 0.8);
      m.rotation.z = (Math.PI / 2 - 0.3) * sx;
      part(face, sphere(0.035), mats.hair, 0.135 * sx, 0.165, 0.2, 1, 1, 0.8);
    }
    part(head, sphere(0.06), mats.skin, 0, 0.18, 0.24, 1, 0.9, 1, false);              // big round nose
    for (const sx of [1, -1]) part(face, sphere(0.045), toon(C.cheek), 0.14 * sx, 0.16, 0.19, 1, 0.7, 0.4, false);
    for (const b of brows) b.scale.set(1.35, 1.9, 1);

    // ── Clogs ──
    for (const side of ['L', 'R']) part(limbs[side].foot, new THREE.BoxGeometry(0.17, 0.05, 0.32), black, 0, -0.065, 0.06, 1, 1, 1, false);

    // ── The giant wooden spoon (right fist, bowl forward and down) ──
    const grip = new THREE.Group();
    grip.position.set(0, -0.07, 0.03);
    grip.rotation.x = -0.52;
    limbs.R.hand.add(grip);
    part(grip, new THREE.CylinderGeometry(0.02, 0.026, 0.56, 8), wood, 0, -0.14, 0);
    part(grip, sphere(0.085), wood, 0, -0.48, 0, 1, 1.35, 0.42);
    part(grip, sphere(0.06), toon(0xffcc33), 0, -0.49, 0.022, 1, 1.2, 0.3, false);     // cheese in the bowl
    part(grip, new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), woodDark, 0, 0.13, 0, 1, 1, 1, false);
  },
};
