// RHETT RYDER — boss of Level 6, FERRARI WINDOW.
//
// The fastest cowboy on the interstate: a Nashville line-dance champion
// who traded his horse for a red Italian supercar and never looked back.
// Big cream cattleman hat, tinted aviators, toothpick, racing-red western
// shirt with a black yoke, white piping and suede fringe, checkered racing
// bandana, a belt buckle the size of a hubcap, bootcut denim over pointed
// boots with spurs, black driving gloves — and a lariat coiled on his hip.
//
// Anime personality: the cocky, charming rival. Talks slow, drives fast,
// tips his hat before he beats you ("Eat my dust, partner"). Dances like a
// honky-tonk line-dance captain: heel-toe, grapevines, jazz boxes, slap
// leather, Cotton-Eyed Joe kicks — and when he gets serious the lasso
// comes out.
//
// Props without new framework hooks: the lariat appears (and spins) in a
// hand raised over his hat while the move flags it with a wrist roll
// (|handR/L z| ≈ 0.9 — invisible on the round gloves); the air-fiddle and
// bow scale in when a move twists the hands (|hand y| ≈ 0.5). Both are
// placed at render time in onBeforeRender (see build()).

let _checker = null;
function checkerTexture(THREE) {
  if (_checker) return _checker;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 2 ? '#15131a' : '#f6f2ea';
    g.fillRect(x * 8, y * 8, 8, 8);
  }
  _checker = new THREE.CanvasTexture(c);
  _checker.colorSpace = THREE.SRGBColorSpace;
  _checker.magFilter = THREE.NearestFilter;
  return _checker;
}

// Cattleman brim: a thick ring whose sides curl up and front/back dip.
function brimGeometry(THREE) {
  const nA = 40, nR = 5, ri = 0.2, ro = 0.47, th = 0.018;
  const pos = [], idx = [];
  const P = (r, a) => {
    const u = (r - ri) / (ro - ri), ca = Math.cos(a), sa = Math.sin(a);
    const y = 0.17 * Math.pow(u, 1.7) * ca * ca - 0.05 * u * Math.max(0, sa) - 0.025 * u * Math.max(0, -sa);
    return [r * ca * 0.96, y, r * sa * 1.12];
  };
  // top (0..), bottom (offset)
  for (const off of [0, -th]) {
    for (let i = 0; i <= nR; i++) for (let j = 0; j < nA; j++) {
      const [x, y, z] = P(ri + (ro - ri) * i / nR, j / nA * Math.PI * 2);
      pos.push(x, y + off, z);
    }
  }
  const N = (nR + 1) * nA, at = (i, j, b) => b * N + i * nA + (j % nA);
  for (let i = 0; i < nR; i++) for (let j = 0; j < nA; j++) {
    idx.push(at(i, j, 0), at(i + 1, j, 0), at(i + 1, j + 1, 0), at(i, j, 0), at(i + 1, j + 1, 0), at(i, j + 1, 0));
    idx.push(at(i, j, 1), at(i + 1, j + 1, 1), at(i + 1, j, 1), at(i, j, 1), at(i, j + 1, 1), at(i + 1, j + 1, 1));
  }
  for (let j = 0; j < nA; j++) {            // outer and inner edges
    idx.push(at(nR, j, 0), at(nR, j, 1), at(nR, j + 1, 1), at(nR, j, 0), at(nR, j + 1, 1), at(nR, j + 1, 0));
    idx.push(at(0, j, 0), at(0, j + 1, 1), at(0, j, 1), at(0, j, 0), at(0, j + 1, 0), at(0, j + 1, 1));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Crown with a cattleman crease (dented top, pinched front).
function crownGeometry(THREE) {
  const pts = [[0.235, -0.01], [0.24, 0.05], [0.236, 0.13], [0.222, 0.2], [0.18, 0.245], [0.1, 0.235], [0.03, 0.215], [0.0, 0.212]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, 22);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    z *= 1.1; x *= 0.94;
    // Front pinch: narrower toward the top at the front.
    if (z > 0) x *= 1 - 0.32 * Math.max(0, (y - 0.08) / 0.17) * (z / 0.26);
    // Centre crease runs front to back.
    y -= 0.035 * Math.exp(-(x * x) / 0.004) * Math.max(0, (y - 0.15) / 0.1);
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

export default {
  name: 'RHETT RYDER',
  scale: 1.04,
  skin: 0xd9a07a,
  colors: {
    top: 0xd0142c, topShade: 0x8c0b1d, pants: 0x34558f, shoe: 0x7a4320, shoeAccent: 0x2e1a0e,
    hair: 0x6b3a1c, hat: 0xf1e7d2, band: 0x1a1418, yoke: 0x17141c, piping: 0xf5f0e6, fringe: 0xc9965a,
    gold: 0xffc43a, silver: 0xd9dee8, lens: 0x6a2412, glove: 0x1b1a20, rope: 0xd2a05a,
  },
  bareForearms: false,
  // Country two-step feel: a light knee bounce on every pulse (the song is
  // ~144 BPM, bounce 2), the pelvis "chugs" forward on the down, hips rock
  // side to side across each beat pair, shoulders stay level and loose,
  // chin up with a cocky head tilt. Lighter than the hip-hop drop, no disco
  // pop, no diva sway — a honky-tonk glide.
  style: {
    swagger: 1.25, bounce: 0.95, phraseOffset: 1,
    feel(p, { B, down, d, amt, e, s }) {
      const side = Math.sin(Math.PI * B) * amt * e * s.swagger;
      p.root(0.03 * side, -0.075 * d, 0);
      p.add('hips', 0.07 * d, 0.1 * side, 0.07 * side);
      p.add('spine', -0.03 * d, 0, 0);
      p.add('chest', -0.02 * d, -0.08 * side, -0.035 * side);
      p.add('head', 0.05 * d * s.swagger, 0.05 * side, 0.08 * side);
      p.shrug(0.05 * (1 - down) * amt * e);
    },
    routines: { chill: ['rhettJazzBox', 'rhettHeelToe'], hype: ['rhettGrapevine', 'rhettBootScoot', 'rhettJazzBox'] },
    accent: { pose: 'rhettAccent', at: 3 },
  },
  moves: {
    1: ['rhettHatTip', 'rhettHipSway'],
    2: ['rhettSlapLeather', 'rhettScuffHitch'],
    3: ['rhettLassoTwirl', 'rhettAirFiddle'],
    4: ['rhettCottonEye', 'rhettRollingVine'],
  },
  branchMoves: { 2: 'rhettBronco', 3: 'rhettLassoTornado', 4: 'rhettHeelClick' },
  solo: 'rhettRodeo',
  introTaunt: 'rhettIntro',
  taunt: 'rhettTaunt',
  // Twirls the lariat, ropes your arrows and yanks: lassos swirl round the
  // command panel while it wobbles like a bucking bronco.
  tauntFx: { projectile: 'lasso', disrupt: 'swirl+wobble', color: '#d2a05a', n: 6 },
  victory: 'rhettVictory',
  fx: { move: 'sheriff', big: 'horseshoe', taunt: 'lasso' },

  build(kit) {
    const { THREE, C, toon, part, capsule, sphere, g, limbs, head, face, chest, spine, hips, neck, mats } = kit;
    const hat = toon(C.hat), band = toon(C.band), yoke = toon(C.yoke), piping = toon(C.piping);
    const fringe = toon(C.fringe), gold = toon(C.gold, { emissive: 0x4a3300 }), silver = toon(C.silver, { emissive: 0x222630 });
    const glove = toon(C.glove), rope = toon(C.rope), leather = toon(0x4a2a14), heelMat = toon(0x2a170a);

    // ── Hair: chestnut, short sides, a little mullet, sideburns ──
    part(head, sphere(0.255), mats.hair, 0, 0.215, -0.04, 0.99, 0.95, 0.96);
    part(head, capsule(0.08, 0.12), mats.hair, 0, 0.02, -0.16, 1.5, 1, 0.8);
    for (const sx of [1, -1]) part(head, new THREE.BoxGeometry(0.035, 0.13, 0.06), mats.hair, 0.226 * sx, 0.18, 0.06, 1, 1, 1, false);
    part(head, capsule(0.045, 0.16), mats.hair, 0.04, 0.37, 0.19, 1, 1, 0.7).rotation.z = Math.PI / 2 - 0.25;  // forelock under the brim
    // Square jaw + chin.
    part(head, sphere(0.15), mats.skin, 0, 0.1, 0.07, 1.25, 0.72, 1.0, false);

    // ── Cattleman hat, tilted back a touch and cocked to one side ──
    const hatG = new THREE.Group();
    hatG.position.set(0, 0.385, -0.01);
    hatG.rotation.set(-0.12, 0, 0.07);
    head.add(hatG);
    part(hatG, g(crownGeometry(THREE)), hat, 0, 0.02, 0);
    part(hatG, g(brimGeometry(THREE)), hat, 0, 0.0, 0);
    part(hatG, new THREE.TorusGeometry(0.236, 0.022, 6, 28), band, 0, 0.045, 0, 0.94, 1.1, 1, false).rotation.x = Math.PI / 2;
    part(hatG, new THREE.CylinderGeometry(0.03, 0.03, 0.012, 10), silver, 0.215, 0.05, 0.06, 1, 1, 1, false).rotation.z = Math.PI / 2;

    // ── Tinted aviators + toothpick ──
    const lens = toon(C.lens, { transparent: true, opacity: 0.8, emissive: 0x200400, depthWrite: false });
    for (const sx of [1, -1]) {
      part(face, sphere(0.062), lens, 0.088 * sx, 0.224, 0.238, 1.15, 0.85, 0.28, false).rotation.z = -0.2 * sx;
      part(face, new THREE.TorusGeometry(0.064, 0.007, 5, 18), gold, 0.088 * sx, 0.224, 0.245, 1.15, 0.85, 1, false).rotation.z = -0.2 * sx;
      part(face, new THREE.BoxGeometry(0.08, 0.01, 0.01), gold, 0.19 * sx, 0.255, 0.17, 1, 1, 1, false).rotation.y = -0.9 * sx;
    }
    part(face, new THREE.BoxGeometry(0.05, 0.01, 0.01), gold, 0, 0.268, 0.245, 1, 1, 1, false);
    const pick = part(face, new THREE.CylinderGeometry(0.006, 0.005, 0.15, 5), toon(0xe8c890), 0.075, 0.085, 0.25, 1, 1, 1, false);
    pick.rotation.set(0.35, 0, 1.25);

    // ── Checkered racing bandana knotted at the throat ──
    const chk = toon(0xffffff, { map: checkerTexture(THREE) });
    part(neck, new THREE.TorusGeometry(0.085, 0.03, 6, 16), chk, 0, 0.0, 0.0, 1, 1, 1).rotation.x = Math.PI / 2;
    const tri = part(chest, new THREE.ConeGeometry(0.1, 0.16, 3), chk, 0, 0.3, 0.135, 1.1, 1, 0.3);
    tri.rotation.set(-0.35, Math.PI, Math.PI);

    // ── Western shirt: black yoke, white piping, pearl snaps, fringe ──
    part(chest, capsule(0.206, 0.04), yoke, 0, 0.215, -0.004, 1.26, 1, 0.83);
    for (const sx of [1, -1]) {
      const pip = part(chest, new THREE.BoxGeometry(0.2, 0.02, 0.012), piping, 0.1 * sx, 0.255, 0.15, 1, 1, 1, false);
      pip.rotation.set(0, -0.35 * sx, -0.42 * sx);
      // Fringe hanging off the yoke line.
      for (let k = 0; k < 4; k++) {
        const x = (0.03 + k * 0.042) * sx, y = 0.235 + k * 0.036;
        part(chest, new THREE.BoxGeometry(0.014, 0.075, 0.008), fringe, x, y - 0.045, 0.155 - k * 0.012 - Math.abs(x) * 0.1, 1, 1, 1, false);
      }
    }
    for (const y of [0.2, 0.12, 0.04]) part(chest, sphere(0.014), piping, 0, y, 0.16, 1, 1, 0.6, false);
    part(spine, sphere(0.014), piping, 0, 0.1, 0.13, 1, 1, 0.6, false);
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      // Suede fringe flaring off the back of each sleeve.
      for (let k = 0; k < 5; k++) {
        const f = part(L.arm, new THREE.BoxGeometry(0.012, 0.09, 0.012), fringe, 0.06 * L.sx, -0.06 - k * 0.045, -0.035, 1, 1, 1, false);
        f.rotation.z = 0.75 * L.sx;
      }
      // Black driving gloves with red cuffs.
      part(L.hand, sphere(0.08), glove, 0, -0.06, 0.01, 0.97, 1.1, 0.8);
      part(L.fore, new THREE.TorusGeometry(0.058, 0.016, 6, 14), mats.top, 0, -0.25, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      // Bootcut hem over the boot.
      part(L.shin, new THREE.CylinderGeometry(0.083, 0.108, 0.13, 14), mats.pants, 0, -0.37, 0.01);
      // Cowboy boots: shaft, pointed toe, stacked heel, spur.
      part(L.foot, new THREE.CylinderGeometry(0.078, 0.074, 0.12, 12), mats.shoe, 0, 0.04, -0.01, 1, 1, 1, false);
      const toe = part(L.foot, new THREE.ConeGeometry(0.075, 0.13, 6), mats.shoe, 0, -0.045, 0.255, 1, 1, 0.58);
      toe.rotation.x = Math.PI / 2;
      part(L.foot, new THREE.BoxGeometry(0.11, 0.06, 0.08), heelMat, 0, -0.085, -0.045);
      part(L.foot, new THREE.BoxGeometry(0.152, 0.012, 0.2), toon(C.shoeAccent), 0, 0.005, 0.07, 1, 1, 1, false);   // stitch band
      part(L.foot, new THREE.TorusGeometry(0.075, 0.008, 4, 14, Math.PI), silver, 0, -0.04, -0.03, 1, 1, 1, false).rotation.set(Math.PI / 2, 0, Math.PI);
      const rowel = part(L.foot, new THREE.CylinderGeometry(0.03, 0.03, 0.008, 8), silver, 0, -0.04, -0.12, 1, 1, 1, false);
      rowel.rotation.z = Math.PI / 2;
    }

    // ── Belt, hubcap buckle, coiled lariat on the left hip ──
    part(hips, new THREE.TorusGeometry(0.19, 0.024, 6, 26), leather, 0, 0.07, 0, 1, 0.76, 1, false).rotation.x = Math.PI / 2;
    const buckle = part(hips, new THREE.CylinderGeometry(0.066, 0.066, 0.024, 20), gold, 0, 0.065, 0.152, 1.42, 1, 1);
    buckle.rotation.x = Math.PI / 2;
    const inner = part(hips, new THREE.CylinderGeometry(0.045, 0.045, 0.01, 18), silver, 0, 0.065, 0.166, 1.42, 1, 1, false);
    inner.rotation.x = Math.PI / 2;
    const gem = part(hips, new THREE.CylinderGeometry(0.02, 0.02, 0.012, 5), toon(0xe0102a, { emissive: 0x400008 }), 0, 0.066, 0.172, 1, 1, 1, false);
    gem.rotation.x = Math.PI / 2;
    for (let k = 0; k < 3; k++) {
      const coil = part(hips, new THREE.TorusGeometry(0.1 - k * 0.006, 0.013, 5, 20), rope, 0.215 + k * 0.012, -0.06, -0.02 + k * 0.004, 1, 1.15, 1, false);
      coil.rotation.y = Math.PI / 2;
    }

    // ── Air-fiddle props: a fiddle along the left forearm and a bow in the
    // right hand. Moves bring them out by twisting the hands (handL/handR
    // y-rotation ≈ 0.5, invisible on the round gloves); they scale in with it.
    const wood = toon(0x8a3a12, { emissive: 0x200800 }), dark = toon(0x1a0e08), hair = toon(0xf4ead0);
    const props = [];
    const prop = (parent, joint, geo, mat, x, y, z, rx, ry, rz, sx = 1, sy = 1, sz = 1) => {
      const m = new THREE.Mesh(g(geo), mat);
      m.matrixAutoUpdate = false; m.matrixWorldAutoUpdate = false; m.frustumCulled = false;
      const local = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
      props.push({ m, local, parent, joint });
      parent.add(m);
    };
    const handL = limbs.L.hand, handR = limbs.R.hand;
    // Fiddle tucked under the chin on the left collarbone, neck out toward the left hand.
    const F = new THREE.Matrix4().compose(new THREE.Vector3(0.12, 0.39, 0.15), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0.85, 0.35, 'YXZ')), new THREE.Vector3(1, 1, 1));
    const fprop = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
      prop(chest, handL, geo, mat, x, y, z, 0, 0, 0, sx, sy, sz);
      const pr = props[props.length - 1]; pr.local.premultiply(F);
    };
    fprop(new THREE.SphereGeometry(0.1, 10, 8), wood, 0, 0, 0.03, 0.8, 0.3, 1.0);
    fprop(new THREE.SphereGeometry(0.085, 10, 8), wood, 0, 0, 0.15, 0.72, 0.3, 0.8);
    fprop(new THREE.BoxGeometry(0.035, 0.025, 0.22), dark, 0, 0.015, 0.31);
    fprop(new THREE.SphereGeometry(0.026, 6, 5), dark, 0, 0.015, 0.44);
    fprop(new THREE.BoxGeometry(0.03, 0.012, 0.36), hair, 0, 0.035, 0.2);
    prop(handR, handR, new THREE.CylinderGeometry(0.007, 0.007, 0.62, 5), dark, 0.0, -0.06, 0.05, 0, 0, Math.PI / 2 - 0.15);
    prop(handR, handR, new THREE.BoxGeometry(0.58, 0.02, 0.006), hair, -0.02, -0.035, 0.05, 0, 0, -0.15);
    const PM = new THREE.Matrix4(), PS = new THREE.Matrix4();
    for (const pr of props) {
      pr.m.onBeforeRender = () => {
        const k = Math.max(0, Math.min(1, (Math.abs(pr.joint.rotation.y) - 0.2) / 0.25));
        PS.makeScale(k || 1e-5, k || 1e-5, k || 1e-5);
        pr.m.matrixWorld.multiplyMatrices(pr.parent.matrixWorld, PM.multiplyMatrices(pr.local, PS));
      };
    }

    // ── The lariat: shows in a hand raised over the hat with the lasso flag set ──
    // Each part places itself at render time (onBeforeRender runs after the
    // scene's matrices are updated, before the draw), so it tracks the hand
    // exactly; hidden = collapsed to nothing.
    const loopR = 0.42, lassoParts = [];
    const addPart = (geo, x, y, z, rx, ry, rz) => {
      const m = new THREE.Mesh(g(geo), rope);
      m.matrixAutoUpdate = false; m.matrixWorldAutoUpdate = false; m.frustumCulled = false;
      const local = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
      lassoParts.push({ m, local });
      return m;
    };
    addPart(new THREE.TorusGeometry(loopR, 0.024, 5, 36), loopR * 0.85, 0.1, 0, Math.PI / 2, 0, 0);
    addPart(new THREE.SphereGeometry(0.034, 8, 6), 0.07, 0.1, 0, 0, 0, 0);
    addPart(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 5), 0.03, 0.05, 0, 0, 0, 0.6);
    const hands = [limbs.R.hand, limbs.L.hand], root = kit.joints.hips.parent, _hq = new THREE.Vector3();
    const L = new THREE.Matrix4(), _hp = new THREE.Vector3(), _ht = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
    let frame = -1, lastT = 0, spin = 0;
    const place = (renderer) => {
      const f = renderer && renderer.info ? renderer.info.render.frame : -2;
      if (f === frame && f !== -2) return;
      frame = f;
      const now = performance.now() / 1000, dt = Math.min(0.1, Math.max(0, now - lastT));
      lastT = now; spin += dt * 11;
      // Whichever hand is up over the hat AND flagged by the move (a wrist
      // roll |z| ≈ 0.9 — mirrored moves flip hands) holds the lariat.
      _ht.setFromMatrixPosition(head.matrixWorld);
      const sc = root.matrixWorld.getMaxScaleOnAxis() || 1;
      let k = 0;
      for (const h of hands) {
        const sig = Math.max(0, Math.min(1, (Math.abs(h.rotation.z) - 0.4) / 0.35));
        if (sig <= 0) continue;
        _hq.setFromMatrixPosition(h.matrixWorld);
        const kh = sig * Math.max(0, Math.min(1, ((_hq.y - _ht.y) / sc - 0.2) / 0.2));
        if (kh > k) { k = kh; _hp.copy(_hq); }
      }
      if (k <= 0.001) { L.makeScale(1e-5, 1e-5, 1e-5).setPosition(_hp); return; }
      _hp.y += 0.03 * sc;
      _q.setFromEuler(_e.set(0.12 * Math.sin(spin * 0.5), spin, 0.18, 'YXZ'));
      L.compose(_hp, _q, _s.setScalar(sc * (0.35 + 0.65 * k)));
    };
    for (const { m, local } of lassoParts) {
      m.onBeforeRender = (renderer) => { place(renderer); m.matrixWorld.multiplyMatrices(L, local); };
      root.add(m);
    }
  },
};
