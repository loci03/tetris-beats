// SARGE — a hulking drill-sergeant krumper. Camo tank top and fatigues,
// red beret, dog tags, combat boots, face paint, arms like tree trunks.
// He barks orders, salutes and runs PT drills — and when the beat drops he
// krumps: chest pops, arm swings, stomps, jabs, buck hops. No weapons —
// his taunt is a smoke canister.

const TAU = Math.PI * 2;

// Woodland camo, painted once and shared (never disposed, like the rig's
// toon gradient).
let _camo = null;
function camoTexture(THREE) {
  if (_camo) return _camo;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#66703f'; g.fillRect(0, 0, 128, 128);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const col of ['#47522b', '#2c3420', '#8a7e52']) {
    g.fillStyle = col;
    for (let i = 0; i < 14; i++) {
      const x = rnd() * 128, y = rnd() * 128, r = 6 + rnd() * 12;
      g.beginPath();
      for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, rr = r * (0.6 + rnd() * 0.6); g.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr); }
      g.fill();
      // wrap so the texture tiles
      g.save(); g.translate(x > 64 ? -128 : 128, 0); g.fill(); g.restore();
    }
  }
  _camo = new THREE.CanvasTexture(c);
  _camo.colorSpace = THREE.SRGBColorSpace;
  _camo.wrapS = _camo.wrapT = THREE.RepeatWrapping;
  _camo.repeat.set(2, 1);
  return _camo;
}

export default {
  name: 'SARGE',
  scale: 1.14,
  skin: 0x8a5a3c,
  colors: {
    top: 0x66703f, topShade: 0x47522b, pants: 0x66703f, shoe: 0x1b1a17, shoeAccent: 0x3a3328,
    hair: 0x1a1410, beret: 0xa01c1c, badge: 0xffc43a, tag: 0xc8ccd4, paint: 0x1c2414, belt: 0x2a2418, strap: 0x3a3a2a,
  },
  bareForearms: true,
  // Krump: every pulse (the half-time song bounces at 145) is a chest pop —
  // shoulders hunched, the body dropping hard, a heavy sway on the beat.
  style: {
    swagger: 1.3, bounce: 1.05, phraseOffset: 1,
    feel: (p, { B, Bb, d, amt, e, s }) => {
      const k = amt * e;
      const pop = Math.pow(0.5 + 0.5 * Math.cos(TAU * Bb), 5);
      p.root(0, -0.12 * d, 0.02 * pop * k);
      p.add('spine', 0.05 * d - 0.03 * k);
      p.add('chest', 0.15 * pop * k - 0.06 * k);
      p.add('head', 0.14 * d * s.swagger - 0.06 * pop * k);
      p.shrug(0.1 * k + 0.06 * pop * k);
      const sw = Math.sin(Math.PI * B) * k * s.swagger;
      p.root(0.035 * sw, 0, 0);
      p.add('chest', 0, 0.1 * sw, -0.04 * sw);
    },
    routines: { chill: ['sargeStomp', 'sargeMarch'], hype: ['sargeArmSwing', 'sargeBuck', 'sargeStomp'] },
    accent: { pose: 'sargeAccent', at: 3 },
  },
  moves: {
    1: ['sargeChestPop', 'sargeSalute'],
    2: ['sargeJabs', 'sargeGetOffMe'],
    3: ['sargeJumpingJacks', 'sargeTantrum'],
    4: ['sargeGroundPound', 'sargeAboutFace'],
  },
  branchMoves: { 2: 'sargeDoubleTime', 3: 'sargeBeastMode', 4: 'sargeKillOff' },
  solo: 'sargeBootCamp',
  introTaunt: 'sargeIntro',
  // Bowls a smoke canister across the floor at you: grey smoke rolls over
  // your arrows and the panel goes dark.
  taunt: 'sargeTaunt',
  tauntFx: { projectile: 'sargeSmoke', disrupt: 'cloud+darkness', color: '#9aa08a', n: 6 },
  victory: 'sargeVictory',
  fx: { move: 'sargeStar', big: 'anger', taunt: 'sargeSmoke' },

  build(kit) {
    const { THREE, C, mats, toon, part, capsule, sphere, limbs, face, head, neck, chest, spine, hips, brows } = kit;
    // Camo on the tank top and fatigues.
    const camo = camoTexture(THREE);
    mats.top.map = camo; mats.top.color.set(0xffffff); mats.top.needsUpdate = true;
    mats.pants.map = camo; mats.pants.color.set(0xe6e6e6); mats.pants.needsUpdate = true;
    const skin = mats.skin, dark = toon(C.paint), boot = mats.shoe, tagM = toon(C.tag, { emissive: 0x222222 });

    // Buzz cut + red beret tilted to his right, gold badge.
    part(head, sphere(0.252), mats.hair, 0, 0.235, -0.02, 0.985, 0.9, 0.985);
    const beret = part(head, sphere(0.25), toon(C.beret), -0.05, 0.44, -0.05, 1.0, 0.3, 0.98);
    beret.rotation.z = 0.3;
    part(head, new THREE.TorusGeometry(0.235, 0.022, 6, 22), toon(0x2a1010), -0.01, 0.38, -0.03, 1, 1, 1, false).rotation.set(Math.PI / 2, 0.12, 0);
    part(head, new THREE.CylinderGeometry(0.04, 0.04, 0.015, 10), toon(C.badge, { emissive: 0x3a2800 }), 0.1, 0.43, 0.17, 1, 1, 1, false).rotation.x = 1.15;
    // Square jaw, heavy brows, face paint stripes.
    part(head, new THREE.BoxGeometry(0.3, 0.13, 0.22), skin, 0, 0.08, 0.06, 1, 1, 1);
    for (const b of brows) b.scale.set(1.25, 1.8, 1);
    for (const sx of [1, -1]) part(face, new THREE.BoxGeometry(0.1, 0.022, 0.01), dark, 0.09 * sx, 0.175, 0.232, 1, 1, 1, false).rotation.z = 0.15 * sx;
    // Thick neck.
    part(neck, new THREE.CylinderGeometry(0.1, 0.12, 0.14, 12), skin, 0, 0.03, 0);
    // Dog tags on a chain + a drill whistle.
    part(chest, new THREE.TorusGeometry(0.15, 0.008, 4, 22), tagM, 0, 0.28, 0.06, 1, 1.25, 1, false).rotation.x = 1.25;
    part(chest, new THREE.BoxGeometry(0.05, 0.075, 0.008), tagM, 0.012, 0.13, 0.175, 1, 1, 1, false).rotation.z = 0.12;
    part(chest, new THREE.BoxGeometry(0.05, 0.075, 0.008), tagM, -0.01, 0.12, 0.172, 1, 1, 1, false).rotation.z = -0.1;
    part(chest, new THREE.CylinderGeometry(0.015, 0.018, 0.07, 8), tagM, -0.075, 0.2, 0.17, 1, 1, 1, false).rotation.z = 1.2;
    // Tank-top straps over bare deltoids, big pecs.
    for (const sx of [1, -1]) {
      part(chest, sphere(0.13), skin, 0.2 * sx, 0.29, 0, 1.1, 0.9, 1.05);
      part(chest, new THREE.BoxGeometry(0.07, 0.22, 0.3), mats.top, 0.12 * sx, 0.33, 0, 1, 1, 1, false);
      part(chest, sphere(0.12), mats.top, 0.085 * sx, 0.2, 0.08, 1.05, 0.8, 0.75);
    }
    // Arms like tree trunks: skin biceps over the sleeves, wristbands.
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.sh, sphere(0.11), skin, 0.03 * L.sx, -0.01, 0, 1, 1, 1);
      part(L.arm, capsule(0.092, 0.2), skin, 0, -0.15, 0.005);
      part(L.arm, sphere(0.085), skin, 0, -0.14, 0.04, 1, 1.2, 1);
      part(L.fore, capsule(0.075, 0.17), skin, 0, -0.13, 0);
      part(L.fore, new THREE.CylinderGeometry(0.072, 0.072, 0.06, 12), toon(0x1c1c1c), 0, -0.24, 0, 1, 1, 1, false);
      part(L.hand, sphere(0.085), skin, 0, -0.06, 0.01, 1, 1.05, 0.85);
      // Combat boots: tall shafts, laces, chunky soles.
      part(L.shin, new THREE.CylinderGeometry(0.095, 0.09, 0.2, 12), boot, 0, -0.36, 0);
      part(L.shin, new THREE.TorusGeometry(0.095, 0.015, 5, 14), toon(C.shoeAccent), 0, -0.27, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      part(L.foot, new THREE.BoxGeometry(0.18, 0.05, 0.33), toon(C.shoeAccent), 0, -0.07, 0.06, 1, 1, 1, false);
      part(L.foot, new THREE.BoxGeometry(0.08, 0.01, 0.14), toon(0x7a7060), 0, 0.012, 0.1, 1, 1, 1, false);
      // Bulkier thighs (cargo pocket).
      part(L.thigh, new THREE.BoxGeometry(0.06, 0.13, 0.12), mats.pants, 0.1 * L.sx, -0.24, 0.01);
    }
    // Web belt with pouches.
    part(hips, new THREE.TorusGeometry(0.2, 0.035, 6, 24), toon(C.belt), 0, 0.08, 0, 1.05, 0.85, 1, false).rotation.x = Math.PI / 2;
    part(hips, new THREE.BoxGeometry(0.07, 0.045, 0.02), toon(C.tag), 0, 0.08, 0.175, 1, 1, 1, false);
    for (const sx of [1, -1]) part(hips, new THREE.BoxGeometry(0.09, 0.1, 0.07), toon(C.strap), 0.17 * sx, 0.03, 0.08);
  },
};
