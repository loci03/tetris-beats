// NULL — the Back for More boss: a ghost in the machine. Long black coat,
// wraparound shades, slicked-back hair, a green earpiece and a code-green
// trim that glows on his coat. He dances like a popper who learned from
// the source code: tutting in perfect right angles, liquid arm waves,
// glitch hits that tick like a buffering video, and slow-motion lean-backs
// as if he's dodging something only he can see.

export default {
  name: 'NULL',
  scale: 1.04,
  skin: 0xc8946c,
  colors: {
    top: 0x262a30, topShade: 0x15181c, pants: 0x1a1c21, shoe: 0x0c0c0e, shoeAccent: 0x00ff41,
    hair: 0x0b0a0c, code: 0x00ff41, lens: 0x07120a, glove: 0x16181b, shirt: 0x1d2a22,
  },
  // Popping / tutting: hits land on the pulse, the head stays level while
  // the body ticks underneath it (custom feel below), poses on count 3.
  style: {
    swagger: 0.9, bounce: 0.85, phraseOffset: 1,
    // POP: every pulse is a muscle hit — knees and chest contract on the
    // beat and release, shoulders tick, the head holds still (isolation)
    // while a slow two-beat liquid sway rolls through the torso.
    feel(p, { B, Bb, amt, e, s }) {
      const f = ((Bb % 1) + 1) % 1;
      const pop = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * f), 8) * amt * e * s.bounce;
      const sway = Math.sin(Math.PI * B) * amt * e;
      p.root(0.03 * sway, -0.05 - 0.06 * pop, 0);
      p.add('chest', 0.11 * pop, 0.06 * sway, -0.04 * sway);
      p.add('spine', -0.04 * pop, 0, 0.03 * sway);
      p.add('head', -0.09 * pop, -0.05 * sway, 0.03 * sway);    // isolation: head counters the hit
      p.shrug(0.08 * pop, 0.08 * pop);
    },
    routines: { chill: ['nullTutGroove', 'nullLiquid'], hype: ['nullGlitchHit', 'nullRoll', 'nullTutGroove'] },
    accent: { pose: 'nullAccent', at: 3 },
  },
  moves: {
    1: ['nullTick', 'nullArmWave'],
    2: ['nullTutBox', 'nullFingerTut'],
    3: ['nullBulletDodge', 'nullGlide'],
    4: ['nullStrobe', 'nullWaveDrop'],
  },
  branchMoves: { 2: 'nullHitCombo', 3: 'nullMatrixLimbo', 4: 'nullSystemCrash' },
  solo: 'nullOverride',
  introTaunt: 'nullIntro',
  // Types the exploit on an invisible keyboard, then pushes it at you:
  // glitched panel and falling code over your arrows.
  taunt: 'nullHack',
  tauntFx: { projectile: 'nullCode', disrupt: 'glitch+fall', color: '#00ff41', n: 9 },
  victory: 'nullVictory',
  fx: { move: 'nullGlyph', big: 'sparkle', taunt: 'nullCode' },

  build(kit) {
    const { THREE, C, toon, part, capsule, sphere, limbs, face, hips, spine, chest, head } = kit;
    const coat = toon(C.top), coatIn = toon(C.topShade, { side: THREE.DoubleSide });
    const code = new THREE.MeshBasicMaterial({ color: C.code });
    const lens = toon(C.lens, { emissive: 0x062a12 });
    const glove = toon(C.glove);

    // Slicked-back hair with a sharp hairline and a little swept quiff.
    part(head, sphere(0.258), toon(C.hair), 0, 0.235, -0.03, 0.97, 0.96, 0.98);
    part(head, capsule(0.07, 0.18), toon(C.hair), 0, 0.43, 0.06, 1.4, 0.8, 1).rotation.z = Math.PI / 2;

    // Wraparound shades: two narrow lenses + bridge + arms to the ears.
    for (const sx of [1, -1]) {
      const l = part(face, sphere(0.06), lens, 0.083 * sx, 0.238, 0.226, 1.25, 0.6, 0.45);
      l.rotation.z = -0.12 * sx;
      part(head, new THREE.BoxGeometry(0.012, 0.012, 0.2), lens, 0.215 * sx, 0.245, 0.11, 1, 1, 1, false);
    }
    part(face, new THREE.BoxGeometry(0.05, 0.012, 0.012), lens, 0, 0.25, 0.245, 1, 1, 1, false);
    // Green glint on the left lens.
    part(face, new THREE.BoxGeometry(0.03, 0.008, 0.005), code, 0.1, 0.255, 0.256, 1, 1, 1, false).rotation.z = 0.5;
    // Earpiece with a coiled lead.
    part(head, sphere(0.03), code, -0.24, 0.19, 0.02, 1, 1, 1, false);
    part(head, capsule(0.008, 0.16), toon(0x222222), -0.24, 0.07, -0.02, 1, 1, 1, false);

    // High coat collar, lapels over a dark shirt, code-green trim.
    part(chest, new THREE.CylinderGeometry(0.17, 0.2, 0.16, 18, 1, true), coatIn, 0, 0.36, -0.01, 1.15, 1, 1);
    part(chest, new THREE.BoxGeometry(0.16, 0.3, 0.02), toon(C.shirt), 0, 0.17, 0.155, 1, 1, 1, false);
    for (const sx of [1, -1]) {
      const lap = part(chest, new THREE.BoxGeometry(0.075, 0.34, 0.025), coat, 0.07 * sx, 0.15, 0.162, 1, 1, 1, false);
      lap.rotation.z = 0.22 * sx;
      const trim = part(chest, new THREE.BoxGeometry(0.012, 0.34, 0.012), code, 0.035 * sx, 0.15, 0.178, 1, 1, 1, false);
      trim.rotation.z = 0.22 * sx;
      part(spine, new THREE.BoxGeometry(0.012, 0.2, 0.012), code, 0.05 * sx, 0.08, 0.145, 1, 1, 1, false);
    }
    // Belt line of the coat.
    part(spine, new THREE.TorusGeometry(0.175, 0.018, 6, 22), toon(0x050506), 0, 0.03, 0, 1.05, 0.78, 1, false).rotation.x = Math.PI / 2;

    // The long coat: a skirt over the hips, and tails that hang off each
    // thigh to below the knee (they follow the legs, so the coat swings
    // with every step and flares on kicks and spins).
    part(hips, new THREE.CylinderGeometry(0.21, 0.27, 0.2, 18, 1, true), coatIn, 0, -0.02, 0, 1.05, 1, 0.85);
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      // Outer / back panel of the tail, open toward the inside of the leg
      // (theta 0 = front, π/2 = +x).
      const tail = new THREE.CylinderGeometry(0.16, 0.24, 0.86, 10, 1, true, L.sx > 0 ? Math.PI * 0.25 : Math.PI * 0.75, Math.PI);
      part(L.thigh, tail, coatIn, 0.025 * L.sx, -0.36, -0.02, 1, 1, 1, false);
      // Trim down the coat's front edge.
      part(L.thigh, new THREE.BoxGeometry(0.01, 0.74, 0.01), code, 0.128 * L.sx, -0.37, 0.128, 1, 1, 1, false);
      // Code-green seams down the sleeves so the arms read in the dark.
      part(L.arm, new THREE.BoxGeometry(0.014, 0.3, 0.02), code, 0.068 * L.sx, -0.15, 0, 1, 1, 1, false);
      part(L.fore, new THREE.BoxGeometry(0.014, 0.24, 0.02), code, 0.058 * L.sx, -0.12, 0, 1, 1, 1, false);
      // Gloves, cuffs, boots.
      L.hand.children[0].material = glove;
      part(L.fore, new THREE.TorusGeometry(0.062, 0.014, 6, 14), code, 0, -0.25, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      part(L.foot, new THREE.BoxGeometry(0.16, 0.12, 0.17), toon(C.shoe), 0, 0.03, -0.02);
    }
  },
};
