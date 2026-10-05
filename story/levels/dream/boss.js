// MECHA-9 — the Dream or Nightmare boss: a chrome dance-bot built in the
// neon megacity. Plated armour, a visor with glowing cyan eyes and an LED
// mouth grille, an antenna, shoulder pauldrons, a magenta power core in the
// chest, glowing joint rings at every elbow, knee and wrist, and jet
// nozzles on its back. It dances the robot for real: servo-locked arm
// waves, animatronic stutters, ticking, a mechanical walk, laser-eye scans,
// a waist that spins all the way round — and a transformation solo.

export default {
  name: 'MECHA-9',
  scale: 1.08,
  skin: 0xc9d2de,
  colors: {
    top: 0xdfe6ee, topShade: 0x8b97a8, pants: 0x5d6a7c, shoe: 0x2a3142, shoeAccent: 0xff2dd0,
    hair: 0x3a4456, visor: 0x0b1222, glow: 0x22e8ff, core: 0xff2dd0, plate: 0xf2f6fa, dark: 0x262d3a,
  },
  // Servo feel: the body drops onto the beat and *holds* there like a
  // piston, then lifts and holds — no bounce, just two locked positions
  // with fast transitions; the head ticks to a new angle every two beats.
  style: {
    swagger: 0.8, bounce: 1.0, phraseOffset: 1,
    feel(p, { B, Bb, amt, e, s }) {
      const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      const f = ((Bb % 1) + 1) % 1;
      const q = (sm((f - 0.7) / 0.15) + 1 - sm((f - 0.18) / 0.2)) * amt * e * s.bounce;
      const h = ((B % 4) + 4) % 4;
      const tick = sm((h - 0.0) / 0.15) - sm((h - 2.0) / 0.15) * 2 + sm((h - 3.85) / 0.15);   // -1 / +1 head positions
      p.root(0, -0.03 - 0.075 * q, 0);
      p.add('chest', 0.05 * q, 0.04 * tick * amt, 0);
      p.add('head', 0.08 * q, 0.14 * tick * amt * e, 0);
      p.shrug(0.06 * (1 - q), 0.06 * (1 - q));
    },
    routines: { chill: ['mechaRobotWalk', 'mechaServoGroove'], hype: ['mechaPistonPump', 'mechaCircuit', 'mechaRobotWalk'] },
    accent: { pose: 'mechaAccent', at: 3 },
  },
  moves: {
    1: ['mechaRobot', 'mechaServoWave'],
    2: ['mechaAnimatronic', 'mechaTicking'],
    3: ['mechaLaserEyes', 'mechaMoonbot'],
    4: ['mechaPowerSlide', 'mechaRocketJump'],
  },
  branchMoves: { 2: 'mechaBreakdown', 3: 'mechaRocketPunch', 4: 'mechaOverdrive' },
  solo: 'mechaTransform',
  introTaunt: 'mechaIntro',
  // Hand-cannon: locks on and fires a laser at you — your panel glitches,
  // flashes and shakes.
  taunt: 'mechaLaser',
  tauntFx: { projectile: 'mechaBolt', disrupt: 'glitch+flash+shake', color: '#22e8ff', n: 6 },
  victory: 'mechaVictory',
  fx: { move: 'mechaSpark', big: 'sparkle', taunt: 'mechaBolt' },

  build(kit) {
    const { THREE, C, mats, toon, part, capsule, sphere, limbs, face, eyes, brows, mouth, hips, spine, chest, neck, head } = kit;
    const plate = toon(C.plate), steel = toon(C.topShade), dark = toon(C.dark);
    const glow = new THREE.MeshBasicMaterial({ color: C.glow });
    const core = new THREE.MeshBasicMaterial({ color: C.core });
    const visor = toon(C.visor, { emissive: 0x06223a });

    // Head: a boxy helmet over the skull, visor band, glowing eyes, LED
    // mouth grille, ear discs, antenna.
    part(head, new THREE.BoxGeometry(0.46, 0.42, 0.4), plate, 0, 0.23, -0.015);
    part(head, new THREE.BoxGeometry(0.48, 0.06, 0.42), steel, 0, 0.45, -0.015, 1, 1, 1, false);
    part(face, new THREE.BoxGeometry(0.38, 0.13, 0.03), visor, 0, 0.235, 0.19, 1, 1, 1, false);
    // Glowing eyes and an LED mouth: recolour the rig's own face materials
    // (kept in the tree, so the rig disposes them).
    mats.white.color.set(C.glow); mats.white.emissive.set(C.glow);
    mats.mouth.color.set(C.core);
    for (const e of eyes) { e.eye.position.z = 0.2; e.pupil.visible = false; }
    for (const b of brows) b.visible = false;
    mouth.position.z = 0.205;
    part(face, new THREE.BoxGeometry(0.16, 0.07, 0.02), dark, 0, 0.1, 0.193, 1, 1, 1, false);
    for (const sx of [1, -1]) {
      const ear = part(head, new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16), steel, 0.245 * sx, 0.23, 0);
      ear.rotation.z = Math.PI / 2;
      part(head, new THREE.TorusGeometry(0.05, 0.012, 6, 16), glow, 0.278 * sx, 0.23, 0, 1, 1, 1, false).rotation.y = Math.PI / 2;
    }
    part(head, new THREE.CylinderGeometry(0.012, 0.016, 0.22, 6), steel, 0.12, 0.55, -0.06, 1, 1, 1, false);
    part(head, sphere(0.035), core, 0.12, 0.67, -0.06, 1, 1, 1, false);
    // Neck: hydraulic collar.
    part(neck, new THREE.CylinderGeometry(0.085, 0.1, 0.1, 12), dark, 0, 0.0, 0);

    // Torso armour: chest plate with a power core, abdominal segments,
    // shoulder pauldrons, back pack with jet nozzles.
    part(chest, new THREE.BoxGeometry(0.44, 0.34, 0.1), plate, 0, 0.18, 0.13);
    part(chest, new THREE.CircleGeometry(0.06, 20), core, 0, 0.2, 0.182, 1, 1, 1, false);
    part(chest, new THREE.TorusGeometry(0.075, 0.012, 6, 20), glow, 0, 0.2, 0.183, 1, 1, 1, false);
    for (const sx of [1, -1]) part(chest, new THREE.BoxGeometry(0.1, 0.02, 0.01), glow, 0.13 * sx, 0.3, 0.183, 1, 1, 1, false);
    for (let i = 0; i < 3; i++) part(spine, new THREE.BoxGeometry(0.3 - i * 0.02, 0.05, 0.05), steel, 0, 0.17 - i * 0.065, 0.12, 1, 1, 1, false);
    part(chest, new THREE.BoxGeometry(0.34, 0.32, 0.14), steel, 0, 0.18, -0.18);
    for (const sx of [1, -1]) {
      part(chest, new THREE.CylinderGeometry(0.05, 0.065, 0.12, 12), dark, 0.09 * sx, 0.03, -0.24);
      part(chest, new THREE.CircleGeometry(0.04, 12), core, 0.09 * sx, -0.031, -0.24, 1, 1, 1, false).rotation.x = Math.PI / 2;
    }
    part(hips, new THREE.TorusGeometry(0.2, 0.03, 6, 22), dark, 0, 0.06, 0, 1.02, 0.8, 1, false).rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const a = -0.6 + i * 0.3;
      part(hips, new THREE.BoxGeometry(0.03, 0.02, 0.01), i % 2 ? core : glow, Math.sin(a) * 0.205, 0.06, Math.cos(a) * 0.165, 1, 1, 1, false).rotation.y = a;
    }
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.sh, new THREE.SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), plate, 0.03 * L.sx, 0.02, 0, 1, 0.9, 1.05);
      part(L.sh, new THREE.TorusGeometry(0.12, 0.012, 5, 18), glow, 0.03 * L.sx, 0.02, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      // Upper arm plate, elbow ring, forearm gauntlet, wrist ring.
      part(L.arm, new THREE.BoxGeometry(0.15, 0.2, 0.15), plate, 0, -0.13, 0);
      part(L.fore, new THREE.TorusGeometry(0.068, 0.016, 6, 16), glow, 0, 0.0, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      part(L.fore, new THREE.BoxGeometry(0.14, 0.2, 0.14), plate, 0, -0.14, 0);
      part(L.fore, new THREE.BoxGeometry(0.02, 0.14, 0.01), glow, 0.0, -0.14, 0.072, 1, 1, 1, false);
      part(L.hand, new THREE.TorusGeometry(0.06, 0.012, 6, 14), core, 0, 0.0, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      // Thigh plate, knee ring + cap, shin armour, heavy boots.
      part(L.thigh, new THREE.BoxGeometry(0.19, 0.26, 0.19), plate, 0, -0.18, 0.005);
      part(L.shin, new THREE.TorusGeometry(0.085, 0.016, 6, 16), glow, 0, 0.0, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      part(L.shin, sphere(0.075), steel, 0, 0.0, 0.06, 1, 1, 0.7);
      part(L.shin, new THREE.BoxGeometry(0.17, 0.3, 0.17), plate, 0, -0.22, 0.01);
      part(L.shin, new THREE.BoxGeometry(0.02, 0.2, 0.01), core, 0, -0.22, 0.096, 1, 1, 1, false);
      part(L.foot, new THREE.BoxGeometry(0.19, 0.13, 0.32), toon(C.shoe), 0, -0.01, 0.05);
    }
  },
};
