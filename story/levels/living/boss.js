// COCO — queen of the boardwalk roller rink. Big curly afro under a
// rainbow sweatband, round pink shades, a striped tube top, high-waisted
// denim shorts, striped tube socks and white quad roller skates. Glides
// everywhere: roller-disco spins, shoot-the-duck, surf stances, the bump,
// hula hips. Her taunt is a beach ball spiked straight at your head.

const TAU = Math.PI * 2;

export default {
  name: 'COCO',
  scale: 0.98,
  skin: 0xa86a42,
  colors: {
    top: 0xffd23f, topShade: 0xffb02e, pants: 0xa86a42, shoe: 0xfff6f0, shoeAccent: 0xff4f9a,
    hair: 0x24140c, denim: 0x3f78d8, denimDark: 0x2c5aa8, stripeA: 0xff6a2a, stripeB: 0xff3d8b,
    band1: 0xff3d3d, band2: 0xffd23f, band3: 0x3ddc84, band4: 0x29c7ff, shades: 0xff7ac0, wheel: 0xff8a3a, sock: 0xffffff, gold: 0xffc43a,
  },
  bareForearms: true,
  // Roller glide: she never bounces down, she *rolls* — the weight swings
  // side to side with a long lean into each side, a lift on the beat, the
  // head floating against it.
  style: {
    swagger: 1.25, bounce: 0.85, phraseOffset: 1,
    feel: (p, { B, Bb, d, amt, e, s }) => {
      const k = amt * e;
      const sw = Math.sin(Math.PI * B - 0.4) * k * s.swagger;
      const lift = Math.pow(0.5 + 0.5 * Math.cos(TAU * Bb), 2);
      p.root(0.06 * sw, -0.07 * k + 0.05 * lift * k, 0.02 * Math.cos(Math.PI * B) * k);
      p.add('spine', 0, 0, 0.07 * sw); p.add('chest', -0.05 * lift * k, -0.08 * sw, 0.06 * sw);
      p.add('head', -0.04 * lift * k, 0.05 * sw, -0.1 * sw);
      p.add('hips', 0, 0.06 * sw, -0.08 * sw);
      p.shrug(0.06 * lift * k);
    },
    routines: { chill: ['cocoGlide', 'cocoHula'], hype: ['cocoCrossover', 'cocoClapSkate', 'cocoGlide'] },
    accent: { pose: 'cocoAccent', at: 5 },
  },
  moves: {
    1: ['cocoSurfer', 'cocoShaka'],
    2: ['cocoBump', 'cocoFishtail'],
    3: ['cocoSpin', 'cocoDuck'],
    4: ['cocoCamel', 'cocoTidalWave'],
  },
  branchMoves: { 2: 'cocoLimbo', 3: 'cocoAxel', 4: 'cocoSunset' },
  solo: 'cocoRollerQueen',
  introTaunt: 'cocoIntro',
  // Tosses a beach ball up and spikes it at you: beach balls bonk down all
  // over your arrows.
  taunt: 'cocoTaunt',
  tauntFx: { projectile: 'cocoBall', disrupt: 'fall+shake', color: '#40ddff', n: 5 },
  victory: 'cocoVictory',
  fx: { move: 'cocoShell', big: 'sparkle', taunt: 'cocoBall' },

  build(kit) {
    const { THREE, C, mats, toon, part, capsule, sphere, limbs, face, head, chest, spine, hips } = kit;
    const lo = (r) => new THREE.SphereGeometry(r, 12, 9);
    const skin = mats.skin, denim = toon(C.denim), denimD = toon(C.denimDark);
    const gold = toon(C.gold, { emissive: 0x3a2800 });

    // Big curly afro: a cloud of puffs, rainbow sweatband.
    part(head, sphere(0.34), mats.hair, 0, 0.33, -0.08, 1.15, 1.0, 1.0);
    for (const [x, y, z, r] of [[0.25, 0.3, 0.02, 0.15], [-0.25, 0.3, 0.02, 0.15], [0.17, 0.5, 0.06, 0.14], [-0.17, 0.5, 0.06, 0.14], [0, 0.58, 0.04, 0.15], [0.3, 0.12, -0.08, 0.12], [-0.3, 0.12, -0.08, 0.12], [0, 0.3, -0.3, 0.2]]) {
      part(head, lo(r), mats.hair, x, y, z, 1, 1, 1);
    }
    const bands = [C.band1, C.band2, C.band3, C.band4];
    bands.forEach((c, i) => part(head, new THREE.TorusGeometry(0.262, 0.016, 5, 28), toon(c), 0, 0.37 - i * 0.03, 0.0, 1.0, 1, 1.04, false).rotation.x = Math.PI / 2 - 0.12);
    // Round pink shades (see-through), gold hoops.
    const sh = toon(C.shades, { transparent: true, opacity: 0.45, emissive: 0x501030 });
    const frame = toon(0xffffff);
    for (const sx of [1, -1]) {
      part(face, new THREE.CircleGeometry(0.062, 18), sh, 0.088 * sx, 0.235, 0.252, 1, 1, 1, false);
      part(face, new THREE.TorusGeometry(0.062, 0.011, 5, 18), frame, 0.088 * sx, 0.235, 0.25, 1, 1, 1, false);
      part(head, new THREE.TorusGeometry(0.055, 0.011, 5, 16), gold, 0.245 * sx, 0.08, 0.02, 1, 1, 1, false).rotation.y = Math.PI / 2;
    }
    part(face, new THREE.BoxGeometry(0.05, 0.012, 0.012), frame, 0, 0.245, 0.255, 1, 1, 1, false);
    // Lashes.
    for (const sx of [1, -1]) part(face, new THREE.BoxGeometry(0.09, 0.016, 0.02), mats.dark, 0.088 * sx, 0.29, 0.22, 1, 1, 1, false).rotation.z = -0.25 * sx;

    // Bare midriff + bare arms, striped tube top.
    part(spine, capsule(0.172, 0.12), skin, 0, 0.11, 0, 1.08, 1, 0.8);
    part(chest, capsule(0.205, 0.08), mats.top, 0, 0.17, 0, 1.25, 1, 0.82);
    for (const [y, c] of [[0.1, C.stripeA], [0.2, C.stripeB], [0.3, C.stripeA]]) {
      part(chest, new THREE.CylinderGeometry(0.212, 0.212, 0.03, 20, 1, true), toon(c, { side: THREE.DoubleSide }), 0, y, 0, 1.25, 1, 0.82, false);
    }
    part(chest, capsule(0.19, 0.14), skin, 0, 0.29, -0.01, 1.18, 1, 0.76);         // shoulders / collar
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.sh, sphere(0.088), skin, 0.02 * L.sx, 0, 0, 1, 0.9, 1);
      part(L.arm, capsule(0.07, 0.2), skin, 0, -0.15, 0);
      part(L.fore, new THREE.CylinderGeometry(0.066, 0.066, 0.06, 12), toon(side === 'L' ? C.band4 : C.band1), 0, -0.24, 0, 1, 1, 1, false);
      // Tube socks + quad skates.
      part(L.shin, new THREE.CylinderGeometry(0.083, 0.08, 0.3, 12), toon(C.sock), 0, -0.3, 0);
      part(L.shin, new THREE.CylinderGeometry(0.0845, 0.0845, 0.025, 12), toon(C.band1), 0, -0.2, 0, 1, 1, 1, false);
      part(L.shin, new THREE.CylinderGeometry(0.0845, 0.0845, 0.025, 12), toon(C.band4), 0, -0.25, 0, 1, 1, 1, false);
      part(L.foot, new THREE.BoxGeometry(0.16, 0.14, 0.2), mats.shoe, 0, 0.03, -0.01);
      part(L.foot, new THREE.BoxGeometry(0.14, 0.02, 0.34), toon(0xd0d0d8), 0, -0.05, 0.05, 1, 1, 1, false);
      for (const zz of [-0.06, 0.17]) for (const xx of [-0.06, 0.06]) {
        part(L.foot, new THREE.CylinderGeometry(0.03, 0.03, 0.035, 10), toon(C.wheel), xx * 1.25, -0.058, zz, 1, 1, 1, false).rotation.z = Math.PI / 2;
      }
      part(L.foot, new THREE.CylinderGeometry(0.025, 0.03, 0.04, 8), toon(C.shoeAccent), 0, -0.055, 0.23, 1, 1, 1, false).rotation.x = Math.PI / 2;
      // Shorts legs.
      part(L.thigh, new THREE.CylinderGeometry(0.11, 0.115, 0.13, 14), denim, 0, -0.04, 0);
      part(L.thigh, new THREE.TorusGeometry(0.113, 0.014, 5, 14), denimD, 0, -0.105, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
    }
    // High-waisted denim shorts + belt.
    part(hips, new THREE.CylinderGeometry(0.205, 0.235, 0.26, 18), denim, 0, 0.02, 0, 1, 1, 0.78);
    part(hips, new THREE.TorusGeometry(0.205, 0.018, 5, 22), toon(0xffffff), 0, 0.14, 0, 1, 0.78, 1, false).rotation.x = Math.PI / 2;
    part(hips, new THREE.BoxGeometry(0.06, 0.04, 0.02), gold, 0, 0.14, 0.165, 1, 1, 1, false);
    // A flower behind the ear.
    const petal = toon(0xff5fa2);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; part(head, lo(0.03), petal, 0.27 + Math.cos(a) * 0.035, 0.2 + Math.sin(a) * 0.035, 0.08, 1, 1, 0.5, false); }
    part(head, sphere(0.022), toon(0xffe066), 0.27, 0.2, 0.09, 1, 1, 1, false);
  },
};
