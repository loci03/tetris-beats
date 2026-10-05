// NOVA — the Galaxy boss: a cosmic space diva. A sleek silver-white
// flight suit with glowing cyan seams, a pink star on the chest, rounded
// shoulder pads, a Saturn ring orbiting her hips, glowing boots, a cloud of
// indigo hair pinned with stars, star earrings — and a halo of light
// floating over her head. She dances like gravity is optional: floating
// zero-g steps, moonwalks and glides, slow-motion waves, orbit spins,
// impossible leans and supernova bursts.

function starShape(THREE, r, inner = 0.45) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * inner : r;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  return s;
}

export default {
  name: 'NOVA',
  scale: 1.0,
  skin: 0x9a6442,
  colors: {
    top: 0xeef1ff, topShade: 0xb9c3f2, pants: 0xe6eaff, shoe: 0x2c2c66, shoeAccent: 0x7df9ff,
    hair: 0x2c1c74, glow: 0x7df9ff, pink: 0xff66e0, gold: 0xffe27a, lips: 0xb02a6a,
  },
  // Float: weightless — she rises a touch on every beat instead of
  // dropping into it, with a slow four-beat sway rolling through the hips
  // and arms that drift up as if there were no gravity.
  style: {
    swagger: 1.2, bounce: 0.9, phraseOffset: 1,
    feel(p, { B, Bb, amt, e, s }) {
      const f = ((Bb % 1) + 1) % 1;
      const up = Math.sin(Math.PI * Math.min(1, f * 1.4)) * amt * e * s.bounce;
      const sway = Math.sin(Math.PI * B / 2) * amt * e, roll = Math.cos(Math.PI * B / 2) * amt * e;
      p.root(0.05 * sway, -0.07 + 0.045 * up, 0);
      p.add('hips', 0, 0.1 * sway, 0.08 * sway);
      p.add('chest', -0.04 * up, -0.08 * sway, -0.07 * sway);
      p.add('head', -0.05 * up, 0.05 * roll, 0.07 * sway);
      p.shrug(0.06 * up, 0.06 * up);
      p.add('armL', 0, 0, 0.08 * up); p.add('armR', 0, 0, -0.08 * up);
    },
    routines: { chill: ['novaFloat', 'novaGlide'], hype: ['novaOrbitStep', 'novaStarReach', 'novaFloat'] },
    accent: { pose: 'novaAccent', at: 5 },
  },
  moves: {
    1: ['novaMoonwalk', 'novaWave'],
    2: ['novaOrbitSpin', 'novaComet'],
    3: ['novaZeroG', 'novaMoonJump'],
    4: ['novaSupernova', 'novaBlackHole'],
  },
  branchMoves: { 2: 'novaStardust', 3: 'novaGravityFlip', 4: 'novaBigBang' },
  solo: 'novaCosmicDiva',
  introTaunt: 'novaIntro',
  // Calls down a meteor shower: stars rain over your arrows, the panel
  // flashes and shakes.
  taunt: 'novaMeteor',
  tauntFx: { projectile: 'novaMeteor', disrupt: 'fall+flash+shake', color: '#7df9ff', n: 8 },
  victory: 'novaVictory',
  fx: { move: 'novaStar', big: 'sparkle', taunt: 'novaMeteor' },

  build(kit) {
    const { THREE, C, toon, part, capsule, limbs, face, mats, hips, spine, chest, head } = kit;
    const sphere = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
    const glow = new THREE.MeshBasicMaterial({ color: C.glow });
    const pink = new THREE.MeshBasicMaterial({ color: C.pink });
    const gold = toon(C.gold, { emissive: 0x4a3a00 });
    const hair = toon(C.hair, { emissive: 0x0c0624 });
    const halo = new THREE.MeshBasicMaterial({ color: C.glow, transparent: true, opacity: 0.9 });

    // Hair: a big cosmic cloud, side-swept, with star pins.
    part(head, sphere(0.3, 20, 14), hair, 0, 0.33, -0.08, 1.25, 1.05, 1.1);
    part(head, sphere(0.2), hair, 0.2, 0.5, -0.02, 1, 0.9, 1);
    part(head, sphere(0.2), hair, -0.22, 0.42, -0.06, 1, 0.9, 1);
    part(head, capsule(0.08, 0.22), hair, 0.05, 0.44, 0.16, 1.6, 1, 0.7).rotation.z = 1.2;
    for (const sx of [1, -1]) part(head, capsule(0.075, 0.24), hair, 0.235 * sx, 0.14, -0.03, 1, 1, 0.8).rotation.z = 0.1 * sx;
    const starG = new THREE.ShapeGeometry(starShape(THREE, 0.05), 1);
    for (const [x, y, z, r] of [[0.26, 0.48, 0.12, 0.3], [-0.3, 0.38, 0.1, -0.2], [0.06, 0.63, 0.02, 0.6]]) {
      const st = part(head, starG, gold, x, y, z, 1, 1, 1, false); st.rotation.set(-0.2, x * 1.5, r);
    }
    // The halo: a ring of light floating over her head, and a faint second orbit.
    part(head, new THREE.TorusGeometry(0.24, 0.016, 6, 40), halo, 0, 0.78, -0.04, 1, 1, 1, false).rotation.x = Math.PI / 2 - 0.25;
    part(head, new THREE.TorusGeometry(0.3, 0.008, 4, 40), pink, 0, 0.76, -0.04, 1, 1, 1, false).rotation.set(Math.PI / 2 + 0.3, 0.3, 0);
    // Star earrings, lashes, glitter freckles.
    for (const sx of [1, -1]) {
      const e = part(head, new THREE.ShapeGeometry(starShape(THREE, 0.04), 1), gold, 0.25 * sx, 0.07, 0.03, 1, 1, 1, false);
      e.rotation.y = sx * Math.PI / 2;
      part(face, new THREE.BoxGeometry(0.095, 0.016, 0.02), mats.dark, 0.088 * sx, 0.285, 0.22, 1, 1, 1, false).rotation.z = -0.25 * sx;
      part(face, sphere(0.01, 6, 4), glow, 0.12 * sx, 0.18, 0.205, 1, 1, 0.5, false);
      part(face, sphere(0.008, 6, 4), glow, 0.14 * sx, 0.2, 0.195, 1, 1, 0.5, false);
    }
    // Suit: high collar, chest star, glowing seams, shoulder pads.
    part(chest, new THREE.CylinderGeometry(0.1, 0.13, 0.1, 16, 1, true), toon(C.topShade, { side: THREE.DoubleSide }), 0, 0.4, 0);
    part(chest, new THREE.ShapeGeometry(starShape(THREE, 0.09), 1), pink, 0, 0.17, 0.168, 1, 1, 1, false);
    part(chest, new THREE.TorusGeometry(0.11, 0.008, 4, 30), glow, 0, 0.17, 0.165, 1, 1, 1, false);
    for (const sx of [1, -1]) {
      part(chest, new THREE.BoxGeometry(0.012, 0.36, 0.012), glow, 0.22 * sx, 0.12, 0.06, 1, 1, 1, false).rotation.z = 0.1 * sx;
      part(spine, new THREE.BoxGeometry(0.012, 0.2, 0.012), glow, 0.16 * sx, 0.1, 0.06, 1, 1, 1, false);
    }
    // Saturn ring round her hips.
    const ring = part(hips, new THREE.TorusGeometry(0.32, 0.018, 6, 48), glow, 0, 0.0, 0, 1, 1, 1, false);
    ring.rotation.set(Math.PI / 2 + 0.25, 0.2, 0);
    part(hips, new THREE.TorusGeometry(0.36, 0.008, 4, 48), pink, 0, 0.0, 0, 1, 1, 1, false).rotation.set(Math.PI / 2 + 0.25, 0.2, 0);
    part(hips, new THREE.TorusGeometry(0.2, 0.02, 6, 22), toon(C.topShade), 0, 0.08, 0, 1.02, 0.8, 1, false).rotation.x = Math.PI / 2;
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.sh, new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(C.topShade), 0.03 * L.sx, 0.02, 0, 1, 0.85, 1.05);
      part(L.sh, new THREE.TorusGeometry(0.11, 0.008, 4, 20), glow, 0.03 * L.sx, 0.02, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      part(L.arm, new THREE.BoxGeometry(0.012, 0.28, 0.012), glow, 0.07 * L.sx, -0.15, 0, 1, 1, 1, false);
      part(L.fore, new THREE.TorusGeometry(0.062, 0.014, 6, 14), glow, 0, -0.22, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      L.hand.children[0].material = toon(0xffffff);
      part(L.thigh, new THREE.BoxGeometry(0.012, 0.4, 0.012), glow, 0.095 * L.sx, -0.2, 0, 1, 1, 1, false);
      // Boots: tall, glossy, glowing soles.
      part(L.shin, new THREE.CylinderGeometry(0.085, 0.09, 0.34, 14), toon(C.shoe), 0, -0.26, 0);
      part(L.shin, new THREE.TorusGeometry(0.088, 0.012, 5, 16), glow, 0, -0.1, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      part(L.foot, new THREE.BoxGeometry(0.16, 0.03, 0.3), glow, 0, -0.085, 0.06, 1, 1, 1, false);
    }
  },
};
