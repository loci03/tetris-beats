// Dancer rigs — toon-shaded characters built on a joint hierarchy
// (hips → spine → chest → neck → head, shoulders → arms → forearms → hands,
// hips → thighs → shins → feet). Body parts hang off the joints, so the
// DanceController animates the rig purely through joint rotations. Every
// part gets an ink outline (inverted hull) for the cel-shaded arcade look.

import * as THREE from '../vendor/three/three.module.min.js';

export const CHARACTERS = {
  player: {
    name: 'YOU',
    scale: 1.0,
    skin: 0xc98a5c,
    colors: {
      top: 0xff2e88, topShade: 0xd01a6a, pants: 0x232746, shoe: 0xf6f6ff, shoeAccent: 0x00e1ff,
      hair: 0x1b1016, cap: 0x00c8ff, capBrim: 0x0a2a5c, extra: 0x151515,
    },
    // Hip-hop: base routines cycle one 8-count each; moves are earned per tier.
    style: { swagger: 1.0, bounce: 1.1, routines: ['twoStep', 'bounceRock', 'kickStep', 'bounceRock'] },
    look: 'player',
    moves: { 1: ['stepClap', 'bodyRoll'], 2: ['runningMan', 'rogerRabbit', 'cabbagePatch'], 3: ['robot', 'moonwalk'], 4: ['jumpSplit', 'windmillFreeze'] },
  },
  alfred: {
    name: 'ALFRED',
    scale: 1.07,
    skin: 0xf0c9a5,
    colors: {
      top: 0xe4e4ee, topShade: 0xc4c4d4, pants: 0xe4e4ee, shoe: 0xe01830, shoeAccent: 0xffffff,
      hair: 0x3a2213, stripe: 0xe01830, gold: 0xffc43a, shades: 0x0b0b12,
    },
    // Old-school disco swagger.
    style: { swagger: 1.35, bounce: 0.9, routines: ['hustle', 'twoStep', 'hustle', 'bounceRock'] },
    look: 'alfred',
    moves: { 1: ['discoPoint', 'stepClap'], 2: ['cabbagePatch', 'rogerRabbit', 'runningMan'], 3: ['spinPoint', 'moonwalk', 'robot'], 4: ['windmillFreeze', 'jumpSplit'] },
  },
};

let _gradient = null;
function toonGradient() {
  if (_gradient) return _gradient;
  const data = new Uint8Array([70, 150, 215, 255]);
  _gradient = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  _gradient.minFilter = _gradient.magFilter = THREE.NearestFilter;
  _gradient.needsUpdate = true;
  return _gradient;
}

function makeOutlineMaterial(width) {
  const m = new THREE.MeshBasicMaterial({ color: 0x14081a, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>',
      `vec3 transformed = position + normal * ${width.toFixed(4)};`);
  };
  return m;
}

let _shadowTex = null;
function shadowTexture() {
  if (_shadowTex) return _shadowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  _shadowTex = new THREE.CanvasTexture(c);
  return _shadowTex;
}

export function createCharacter(def) {
  const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...extra });
  const outline = makeOutlineMaterial(0.018);
  const C = def.colors;
  const mats = {
    skin: toon(def.skin), top: toon(C.top), topShade: toon(C.topShade), pants: toon(C.pants),
    shoe: toon(C.shoe), shoeAccent: toon(C.shoeAccent), hair: toon(C.hair),
    white: toon(0xffffff), dark: new THREE.MeshBasicMaterial({ color: 0x120a10 }),
    mouth: new THREE.MeshBasicMaterial({ color: 0x5a0f1f }),
  };
  const geoms = [];
  const g = (geo) => { geoms.push(geo); return geo; };

  const root = new THREE.Group();
  root.name = def.name;
  const body = new THREE.Group();          // uniform scale for the whole rig
  body.scale.setScalar(def.scale);
  root.add(body);

  const joints = {};
  const joint = (name, parent, x, y, z) => {
    const j = new THREE.Group();
    j.name = name;
    j.position.set(x, y, z);
    (parent || body).add(j);
    joints[name] = j;
    return j;
  };
  const part = (parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ink = true) => {
    const m = new THREE.Mesh(g(geo), mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    parent.add(m);
    if (ink) m.add(new THREE.Mesh(m.geometry, outline));
    return m;
  };
  const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 14);
  const sphere = (r) => new THREE.SphereGeometry(r, 20, 16);

  // ── Skeleton ──
  const hips = joint('hips', null, 0, 1.0, 0);
  const spine = joint('spine', hips, 0, 0.08, 0);
  const chest = joint('chest', spine, 0, 0.22, 0);
  const neck = joint('neck', chest, 0, 0.36, 0);
  const head = joint('head', neck, 0, 0.1, 0);
  const limbs = {};
  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const sh = joint('sh' + side, chest, 0.2 * sx, 0.3, 0);
    const arm = joint('arm' + side, sh, 0.06 * sx, 0, 0);
    arm.rotation.order = 'XZY';     // twist about the arm's own axis first (dance.js arm())
    const fore = joint('fore' + side, arm, 0, -0.3, 0);
    const hand = joint('hand' + side, fore, 0, -0.27, 0);
    const thigh = joint('thigh' + side, hips, 0.11 * sx, -0.04, 0);
    thigh.rotation.order = 'ZXY';   // matches the leg IK in dance.js
    const shin = joint('shin' + side, thigh, 0, -0.44, 0);
    const foot = joint('foot' + side, shin, 0, -0.44, 0);
    limbs[side] = { sh, arm, fore, hand, thigh, shin, foot, sx };
  }

  // ── Body parts ──
  part(hips, sphere(0.2), mats.pants, 0, 0, 0, 1.0, 0.62, 0.72);
  part(spine, capsule(0.165, 0.12), mats.top, 0, 0.11, 0, 1.08, 1, 0.78);
  part(chest, capsule(0.2, 0.2), mats.top, 0, 0.16, 0, 1.25, 1, 0.8);
  part(neck, new THREE.CylinderGeometry(0.06, 0.07, 0.12, 12), mats.skin, 0, 0.03, 0, 1, 1, 1);
  const headMesh = part(head, sphere(0.25), mats.skin, 0, 0.21, 0, 0.95, 1.05, 0.95);
  part(head, sphere(0.05), mats.skin, 0.235, 0.2, 0, 0.5, 1, 1);   // ears
  part(head, sphere(0.05), mats.skin, -0.235, 0.2, 0, 0.5, 1, 1);
  part(head, sphere(0.035), mats.skin, 0, 0.17, 0.235, 1, 0.9, 1, false); // nose

  for (const side of ['L', 'R']) {
    const L = limbs[side];
    part(L.sh, sphere(0.085), mats.top, 0.02 * L.sx, 0, 0, 1, 0.9, 1);
    part(L.arm, capsule(0.068, 0.2), mats.top, 0, -0.15, 0);
    part(L.fore, capsule(0.058, 0.18), def.look === 'player' ? mats.topShade : mats.top, 0, -0.13, 0);
    part(L.hand, sphere(0.075), mats.skin, 0, -0.06, 0.01, 0.95, 1.1, 0.75);
    part(L.thigh, capsule(0.09, 0.28), mats.pants, 0, -0.2, 0);
    part(L.shin, capsule(0.075, 0.28), mats.pants, 0, -0.2, 0);
    part(L.foot, new THREE.BoxGeometry(0.15, 0.09, 0.28, 2, 1, 2), mats.shoe, 0, -0.035, 0.06);
    part(L.foot, new THREE.BoxGeometry(0.155, 0.03, 0.29), mats.shoeAccent, 0, -0.075, 0.06, 1, 1, 1, false);
  }

  // ── Face ──
  const face = new THREE.Group();
  head.add(face);
  const eyes = [];
  for (const sx of [1, -1]) {
    const eye = part(face, sphere(0.045), mats.white, 0.085 * sx, 0.235, 0.205, 1, 1.25, 0.6, false);
    const pupil = part(face, sphere(0.024), mats.dark, 0.085 * sx, 0.232, 0.232, 1, 1.2, 0.6, false);
    eyes.push({ eye, pupil });
  }
  const brows = [1, -1].map(sx => part(face, new THREE.BoxGeometry(0.085, 0.022, 0.02), mats.dark, 0.088 * sx, 0.31, 0.225, 1, 1, 1, false));
  const mouth = part(face, sphere(0.05), mats.mouth, 0, 0.1, 0.225, 1.2, 0.45, 0.4, false);

  // ── Look-specific outfit / accessories ──
  if (def.look === 'player') {
    // Short fade under a backwards cap
    part(head, sphere(0.255), mats.hair, 0, 0.225, -0.015, 0.97, 1.02, 0.97);
    const cap = part(head, new THREE.SphereGeometry(0.268, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(C.cap), 0, 0.235, -0.01, 0.99, 0.95, 0.99);
    cap.rotation.x = -0.18;
    part(head, new THREE.BoxGeometry(0.27, 0.028, 0.2), toon(C.capBrim), 0, 0.26, -0.3).rotation.x = 0.28;
    part(head, sphere(0.03), toon(C.capBrim), 0, 0.5, -0.05, 1, 0.5, 1, false);          // button
    part(head, new THREE.TorusGeometry(0.262, 0.018, 6, 28), toon(C.capBrim), 0, 0.245, -0.01, 1, 1, 1, false).rotation.x = Math.PI / 2 - 0.18;
    // Taco emblem on the hoodie
    const emblem = part(chest, new THREE.CircleGeometry(0.075, 20, 0, Math.PI), toon(0xffc93a, { side: THREE.DoubleSide }), 0, 0.14, 0.178, 1, 1, 1, false);
    emblem.rotation.z = Math.PI;
    part(chest, new THREE.BoxGeometry(0.13, 0.018, 0.01), toon(0x6bd13b), 0, 0.14, 0.182, 1, 1, 1, false);
    // Drawstrings + cuffs + belt
    for (const sx of [1, -1]) part(chest, capsule(0.01, 0.1), mats.white, 0.05 * sx, 0.24, 0.17, 1, 1, 1, false);
    // Headphones resting on the collar
    const phones = part(chest, new THREE.TorusGeometry(0.17, 0.028, 8, 24, Math.PI), toon(C.extra), 0, 0.3, 0.02, 1, 1, 1);
    phones.rotation.x = Math.PI / 2 + 0.25;
    phones.rotation.z = Math.PI;
    part(chest, new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), toon(C.shoeAccent), 0.17, 0.3, 0.05, 1, 1, 1).rotation.z = Math.PI / 2;
    part(chest, new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), toon(C.shoeAccent), -0.17, 0.3, 0.05, 1, 1, 1).rotation.z = Math.PI / 2;
    // Hood + pocket
    part(chest, new THREE.TorusGeometry(0.14, 0.05, 8, 18), mats.topShade, 0, 0.33, -0.12, 1.2, 1, 1).rotation.x = 1.2;
    part(spine, new THREE.BoxGeometry(0.24, 0.1, 0.04), mats.topShade, 0, 0.06, 0.13, 1, 1, 1, false);
    part(hips, new THREE.TorusGeometry(0.19, 0.022, 6, 24), toon(0x0e0e12), 0, 0.07, 0, 1, 0.75, 1, false).rotation.x = Math.PI / 2;
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.fore, new THREE.TorusGeometry(0.06, 0.018, 6, 16), mats.topShade, 0, -0.25, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
      part(L.shin, new THREE.TorusGeometry(0.08, 0.02, 6, 16), mats.pants, 0, -0.38, 0, 1, 1, 1, false).rotation.x = Math.PI / 2;
    }
  } else {
    // Pompadour + sideburns
    part(head, capsule(0.12, 0.2), mats.hair, 0, 0.42, 0.05, 1.3, 0.9, 1.2).rotation.z = Math.PI / 2;
    part(head, sphere(0.2), mats.hair, 0, 0.36, -0.06, 1.15, 0.7, 1.1);
    // Shades
    const shades = toon(C.shades, { emissive: 0x222244 });
    part(face, new THREE.BoxGeometry(0.11, 0.06, 0.03), shades, 0.07, 0.24, 0.235);
    part(face, new THREE.BoxGeometry(0.11, 0.06, 0.03), shades, -0.07, 0.24, 0.235);
    part(face, new THREE.BoxGeometry(0.05, 0.015, 0.02), shades, 0, 0.255, 0.24, 1, 1, 1, false);
    // Mustache
    part(face, capsule(0.022, 0.1), mats.hair, 0, 0.14, 0.235, 1, 1, 1, false).rotation.z = Math.PI / 2;
    // Gold chain
    const chain = part(chest, new THREE.TorusGeometry(0.16, 0.022, 8, 28), toon(C.gold, { emissive: 0x4a3300 }), 0, 0.22, 0.1, 1, 1.2, 1);
    chain.rotation.x = 1.25;
    // Jacket collar, zipper and a couple of rings
    part(chest, new THREE.TorusGeometry(0.12, 0.035, 8, 20), mats.topShade, 0, 0.33, 0.01, 1.2, 1, 1).rotation.x = Math.PI / 2 - 0.3;
    part(chest, new THREE.BoxGeometry(0.012, 0.36, 0.01), toon(0x9a9aa8), 0, 0.12, 0.162, 1, 1, 1, false);
    part(spine, new THREE.BoxGeometry(0.012, 0.16, 0.01), toon(0x9a9aa8), 0, 0.1, 0.13, 1, 1, 1, false);
    for (const side of ['L', 'R']) part(limbs[side].hand, new THREE.TorusGeometry(0.03, 0.01, 6, 12), toon(C.gold, { emissive: 0x4a3300 }), 0.02 * limbs[side].sx, -0.1, 0.03, 1, 1, 1, false);
    // Tracksuit stripes
    const stripe = toon(C.stripe);
    for (const side of ['L', 'R']) {
      const L = limbs[side];
      part(L.arm, new THREE.BoxGeometry(0.02, 0.3, 0.035), stripe, 0.066 * L.sx, -0.15, 0, 1, 1, 1, false);
      part(L.fore, new THREE.BoxGeometry(0.02, 0.26, 0.03), stripe, 0.056 * L.sx, -0.13, 0, 1, 1, 1, false);
      part(L.thigh, new THREE.BoxGeometry(0.02, 0.42, 0.04), stripe, 0.088 * L.sx, -0.2, 0, 1, 1, 1, false);
      part(L.shin, new THREE.BoxGeometry(0.02, 0.4, 0.035), stripe, 0.074 * L.sx, -0.2, 0, 1, 1, 1, false);
    }
  }

  // Blob shadow
  const shadow = new THREE.Mesh(g(new THREE.PlaneGeometry(1.1, 1.1)),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  const base = {};
  for (const [n, j] of Object.entries(joints)) base[n] = j.position.clone();
  const hipsBaseY = hips.position.y;

  return {
    def, root, joints, headMesh,
    baseYaw: 0,
    applyPose(pose, J, ROOT) {
      for (const [name, o] of Object.entries(J)) {
        const j = joints[name];
        if (j) j.rotation.set(pose[o], pose[o + 1], pose[o + 2]);
      }
      hips.position.set(pose[ROOT], hipsBaseY + pose[ROOT + 1], pose[ROOT + 2]);
      body.rotation.y = this.baseYaw + pose[ROOT + 3];
      // Shadow follows the hips on the floor and shrinks when airborne.
      const s = def.scale;
      shadow.position.x = pose[ROOT] * s;
      shadow.position.z = pose[ROOT + 2] * s;
      const air = Math.max(0, pose[ROOT + 1]);
      shadow.scale.setScalar(1 - Math.min(0.5, air * 0.6));
    },
    setExpression(kind, beat) {
      // Mouth / brows / eyes per expression, with a blink every few beats.
      const M = {
        smile: [1.2, 0.4, 0], grin: [1.45, 0.55, -0.05], shout: [0.95, 1.25, 0.05], o: [0.7, 0.9, 0.12],
        smirk: [1.1, 0.35, -0.12], focus: [0.9, 0.3, -0.14], dizzy: [0.8, 0.7, 0.1], sad: [1.0, 0.3, 0.16],
      }[kind] || [1.2, 0.4, 0];
      mouth.scale.set(M[0], M[1], 0.4);
      mouth.rotation.z = kind === 'smirk' ? 0.25 : 0;
      brows[0].rotation.z = M[2] * 2; brows[1].rotation.z = -M[2] * 2;
      brows[0].position.y = brows[1].position.y = 0.31 + (kind === 'shout' || kind === 'o' ? 0.02 : 0);
      const blink = ((beat % 7) + 7) % 7 < 0.12 ? 0.12 : 1;
      const dizzy = kind === 'dizzy' ? 0.5 + 0.5 * Math.sin(beat * 12) : 1;
      for (const e of eyes) { e.eye.scale.y = 1.25 * blink; e.pupil.scale.y = 1.2 * blink * dizzy; }
    },
    dispose() {
      for (const geo of geoms) geo.dispose();
      root.traverse(o => { if (o.material && o.material.dispose) o.material.dispose(); });
    },
  };
}
