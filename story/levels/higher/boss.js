// SKYE — Higher's boss: a laid-back rooftop DJ/dancer. Cream bucket hat,
// round amber shades, an oversized ember-orange hoodie with a kangaroo
// pocket, glowing green headphones round the neck, baggy olive cargos and
// chunky white sneakers.
// Laid-back hip-hop / R&B: the lean back, two-step glides, shoulder rolls,
// slow-mo bounce, the woah, smooth arm waves, a turntable scratch.

// Laid-back feel: nods on the pulse but a hair behind it, knees easy, the
// body leaning back and swaying slowly over two beats, shoulders rolling.
function laidBack(p, { B, Bb, d, amt, e, s }) {
  const lag = Bb - 0.07;                                         // sits behind the beat
  const nod = Math.pow(0.5 + 0.5 * Math.cos(Math.PI * 2 * lag), 2) * amt * e;
  const sway = Math.sin(Math.PI * B) * amt * s.swagger;
  const roll = Math.sin(Math.PI * B + 0.6) * amt * e;
  p.root(0.035 * sway, -0.07 * d, -0.015 * amt);
  p.add('spine', -0.04 * amt, 0, 0.04 * sway);
  p.add('chest', -0.04 * amt + 0.04 * nod, 0.07 * sway, -0.04 * sway);
  p.add('head', 0.16 * nod * s.swagger, 0, 0.05 * sway);
  p.shrug(0.1 * (0.5 + 0.5 * roll) ** 2, 0.1 * (0.5 - 0.5 * roll) ** 2);
}

export default {
  name: 'SKYE',
  scale: 1.03,
  skin: 0xa0663f,
  colors: {
    top: 0xf08a3a, topShade: 0xd06a22, pants: 0x55603a, shoe: 0xf6f6f2, shoeAccent: 0x7fff00,
    hair: 0x1a1210, hat: 0xeee0c0, hatBand: 0x2a2a2a, shades: 0xffa020, phones: 0x1a1a1e, glow: 0x7fff00,
  },
  bareForearms: false,
  style: {
    swagger: 1.2, bounce: 0.85, phraseOffset: 1,
    feel: laidBack,
    routines: { chill: ['skyeLeanBack', 'skyeShoulderRoll'], hype: ['skyeGlide', 'skyeSlowBounce', 'skyeShoulderRoll'] },
    accent: { pose: 'skyeAccent', at: 5 },
  },
  moves: {
    1: ['skyeNodSnap', 'skyeArmWave'],
    2: ['skyeWoah', 'skyeShoulderRoll'],
    3: ['skyeGlide', 'skyeSlowBounce'],
    4: ['skyeScratch', 'skyeKneeDrop'],
  },
  branchMoves: { 2: 'skyeHatTip', 3: 'skyeFloatWalk', 4: 'skyeChillSpin' },
  solo: 'skyeSkyHigh',
  introTaunt: 'skyeIntro',
  taunt: 'skyeTaunt',
  // Sweeps a big ember-lit haze cloud over at you: clouds drift across your
  // panel and it all goes soft-focus.
  tauntFx: { projectile: 'skyeCloud', disrupt: 'cloud+blur', color: '#ffb070', n: 6 },
  victory: 'skyeVictory',
  fx: { move: 'note', big: 'sparkle', taunt: 'skyeCloud' },

  build(kit) {
    const { THREE, C, mats, toon, part, limbs, face, hips, spine, chest, neck, head } = kit;
    const sphere = (r) => new THREE.SphereGeometry(r, r > 0.12 ? 16 : 10, r > 0.12 ? 12 : 7);
    const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 3, 10);
    const hat = toon(C.hat), band = toon(C.hatBand), phones = toon(C.phones);
    const glow = new THREE.MeshBasicMaterial({ color: C.glow });
    const shades = toon(C.shades, { emissive: 0x6a3000, transparent: true, opacity: 0.9 });

    // Oversized hoodie: a roomier torso, baggy sleeves, hood, pocket, strings.
    part(chest, capsule(0.235, 0.18), mats.top, 0, 0.14, 0.0, 1.3, 1, 0.9);
    part(spine, capsule(0.2, 0.14), mats.top, 0, 0.06, 0.0, 1.2, 1, 0.95);
    part(spine, new THREE.CylinderGeometry(0.235, 0.25, 0.1, 20), mats.topShade, 0, -0.06, 0, 1.08, 1, 0.92);   // ribbed hem
    part(spine, new THREE.BoxGeometry(0.28, 0.13, 0.04), mats.topShade, 0, 0.06, 0.2, 1, 1, 1, false);           // kangaroo pocket
    part(chest, new THREE.TorusGeometry(0.15, 0.06, 8, 18), mats.topShade, 0, 0.36, -0.1, 1.25, 1, 1).rotation.x = 1.15;  // hood
    for (const sx of [1, -1]) part(chest, capsule(0.01, 0.14), toon(0xffffff), 0.05 * sx, 0.24, 0.21, 1, 1, 1, false);
    // Ember print on the chest.
    part(chest, new THREE.CircleGeometry(0.07, 16), toon(0xfff0a0, { side: THREE.DoubleSide }), 0, 0.18, 0.218, 1, 1, 1, false);
    part(chest, new THREE.ConeGeometry(0.05, 0.1, 10), toon(0xff4a1a), 0, 0.2, 0.22, 1, 1, 0.3, false);
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.arm, capsule(0.088, 0.2), mats.top, 0, -0.15, 0);
      part(L.fore, capsule(0.078, 0.16), mats.top, 0, -0.12, 0);
      part(L.fore, new THREE.TorusGeometry(0.068, 0.025, 6, 14), mats.topShade, 0, -0.24, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      // Baggy cargos with side pockets, bunched at the ankle.
      part(L.thigh, capsule(0.11, 0.26), mats.pants, 0, -0.2, 0);
      part(L.shin, capsule(0.095, 0.24), mats.pants, 0, -0.2, 0);
      part(L.thigh, new THREE.BoxGeometry(0.05, 0.12, 0.12), toon(0x48522e), 0.11 * L.sx, -0.24, 0.01, 1, 1, 1, false);
      part(L.shin, new THREE.TorusGeometry(0.09, 0.03, 6, 14), mats.pants, 0, -0.38, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      // Chunky sneakers.
      part(L.foot, new THREE.BoxGeometry(0.18, 0.07, 0.32), mats.shoe, 0, -0.06, 0.06);
      part(L.foot, new THREE.BoxGeometry(0.185, 0.025, 0.2), mats.shoeAccent, 0, -0.02, 0.02, 1, 1, 1, false);
    }

    // Headphones round the neck, glowing cups.
    const ph = part(chest, new THREE.TorusGeometry(0.18, 0.026, 8, 24, Math.PI), phones, 0, 0.33, 0.0, 1.05, 1, 1);
    ph.rotation.x = Math.PI / 2 + 0.3; ph.rotation.z = Math.PI;
    for (const sx of [1, -1]) {
      part(chest, new THREE.CylinderGeometry(0.075, 0.075, 0.06, 16), phones, 0.18 * sx, 0.33, 0.06, 1, 1, 1).rotation.z = Math.PI / 2;
      part(chest, new THREE.CylinderGeometry(0.05, 0.05, 0.065, 14), glow, 0.185 * sx, 0.33, 0.06, 1, 1, 1, false).rotation.z = Math.PI / 2;
    }

    // Head: twists peeking out under a bucket hat, round amber shades.
    part(head, sphere(0.25), mats.hair, 0, 0.22, -0.02, 0.98, 1.0, 0.98);
    for (let i = 0; i < 7; i++) {
      const a = -1.6 + i * 0.53;
      part(head, capsule(0.03, 0.08), mats.hair, Math.sin(a) * 0.24, 0.12, Math.cos(a) * 0.2 - 0.06, 1, 1, 1).rotation.z = Math.sin(a) * 0.4;
    }
    part(head, new THREE.CylinderGeometry(0.235, 0.27, 0.2, 22), hat, 0, 0.42, -0.01, 1, 1, 1);
    part(head, sphere(0.235), hat, 0, 0.5, -0.01, 1, 0.42, 1);
    part(head, new THREE.CylinderGeometry(0.28, 0.4, 0.06, 26, 1, true), toon(C.hat, { side: THREE.DoubleSide }), 0, 0.33, 0.0, 1, 1, 1);
    part(head, new THREE.TorusGeometry(0.262, 0.022, 6, 26), band, 0, 0.36, -0.01, 1, 1, 1, false).rotation.x = Math.PI / 2;
    for (const sx of [1, -1]) part(face, new THREE.CylinderGeometry(0.058, 0.058, 0.02, 18), shades, 0.085 * sx, 0.235, 0.235, 1, 1, 1).rotation.x = Math.PI / 2;
    part(face, new THREE.BoxGeometry(0.06, 0.012, 0.012), phones, 0, 0.245, 0.245, 1, 1, 1, false);
    // A small chain and a little goatee.
    part(chest, new THREE.TorusGeometry(0.12, 0.012, 5, 20), toon(0xffd25a, { emissive: 0x3a2a00 }), 0, 0.25, 0.12, 1, 1.2, 1, false).rotation.x = 1.2;
    part(face, sphere(0.03), mats.hair, 0, 0.04, 0.225, 1.1, 1, 0.6, false);
  },
};
