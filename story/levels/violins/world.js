// FALLING VIOLINS — a grand golden opera house. The battle happens on the
// stage: polished wood with footlights along the apron, red velvet curtains
// swagged open under a gilded proscenium, a gold pipe-organ shell upstage,
// crystal chandeliers, an orchestra pit sawing away on the beat (conductor
// included) and loge boxes of applauding patrons. Violins rain from the
// flies the whole time — harder when someone lands a big move.
// Everything that moves is driven by the music clock via update().

import * as THREE from '../../../vendor/three/three.module.min.js';

const GOLD = 0xffc93a, VELVET = 0x8c0f22;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Violin silhouette as one extruded shape (body, neck, scroll) — so the
// falling violins and the pit fiddles are a single instanced geometry.
function violinGeometry(scale = 1) {
  const half = [[0, -0.31], [0.07, -0.3], [0.105, -0.25], [0.1, -0.2], [0.06, -0.16], [0.06, -0.13], [0.09, -0.095], [0.09, -0.05], [0.055, -0.01],
    [0.018, 0.0], [0.016, 0.17], [0.03, 0.19], [0.032, 0.22], [0.012, 0.235], [0, 0.236]];
  const s = new THREE.Shape();
  s.moveTo(half[0][0] * scale, half[0][1] * scale);
  for (let i = 1; i < half.length; i++) s.lineTo(half[i][0] * scale, half[i][1] * scale);
  for (let i = half.length - 2; i >= 0; i--) s.lineTo(-half[i][0] * scale, half[i][1] * scale);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.04 * scale, bevelEnabled: false, curveSegments: 2 });
  g.translate(0, 0, -0.02 * scale);
  return g;
}

export function buildWorld({ lowGraphics = false } = {}) {
  const group = new THREE.Group();
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const toonGrad = (() => {
    const t = new THREE.DataTexture(new Uint8Array([80, 165, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return keep(t);
  })();
  const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: toonGrad, ...extra }));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = group) => { const m = new THREE.Mesh(keep(geo), mat); m.position.set(x, y, z); parent.add(m); return m; };
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  const goldMat = toon(GOLD, { emissive: 0x3a2400 });
  const velvet = toon(VELVET, { emissive: 0x1a0004 });

  // ── The hall: warm dark dome ─────────────────────────────────────
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(70, 24, 12)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uPulse: { value: 0 }, uLight: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uPulse; uniform float uLight;
      void main(){
        float h = vP.y;
        vec3 c = mix(vec3(0.16,0.06,0.03), vec3(0.04,0.01,0.02), smoothstep(-0.1, 0.6, h));
        c += vec3(0.35,0.2,0.05) * uPulse * smoothstep(0.5, 0.0, abs(h - 0.1));
        gl_FragColor = vec4(c * (0.35 + 0.65 * uLight), 1.0);
      }`,
  })));
  group.add(sky);

  // Curved gilded hall shell behind the stage, with lit arched panels.
  const shellTex = keep(canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2a1006'); gr.addColorStop(1, '#5a2a0c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const x = i * 64 + 10;
      g.fillStyle = '#7a3c10'; g.fillRect(x, 40, 44, 200);
      g.beginPath(); g.arc(x + 22, 40, 22, Math.PI, 0); g.fill();
      const lg = g.createLinearGradient(0, 30, 0, 240); lg.addColorStop(0, '#ffcf6a'); lg.addColorStop(1, '#a8501a');
      g.fillStyle = lg; g.fillRect(x + 6, 46, 32, 186); g.beginPath(); g.arc(x + 22, 46, 16, Math.PI, 0); g.fill();
      g.strokeStyle = '#ffd86a'; g.lineWidth = 3; g.strokeRect(x, 40, 44, 200);
    }
    g.fillStyle = '#c8901e'; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 14, w, 14);
  }));
  shellTex.wrapS = THREE.RepeatWrapping; shellTex.repeat.set(2, 1);
  const shellMat = toon(0xffffff, { map: shellTex, side: THREE.BackSide, emissive: 0x2a1404 });
  const shell = mesh(new THREE.CylinderGeometry(10, 10, 11, 32, 1, true, Math.PI * 0.62, Math.PI * 0.76), shellMat, 0, 4.0, 1.0);

  // ── Stage: polished wood ─────────────────────────────────────────
  const woodTex = keep(canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      const y = i * 32;
      g.fillStyle = ['#b8742e', '#a8662a', '#c07c34', '#ae6c2c'][i % 4];
      g.fillRect(0, y, w, 32);
      g.fillStyle = 'rgba(60,24,6,0.6)'; g.fillRect(0, y, w, 2);
      const seam = (i * 97) % w; g.fillRect(seam, y, 2, 32);
      g.strokeStyle = 'rgba(90,40,10,0.25)'; g.lineWidth = 1;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0, y + 8 + k * 8); g.bezierCurveTo(w * 0.3, y + 4 + k * 9, w * 0.6, y + 12 + k * 7, w, y + 8 + k * 8); g.stroke(); }
    }
  }));
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.repeat.set(5, 3);
  const floorMat = toon(0xffffff, { map: woodTex });
  mesh(new THREE.BoxGeometry(13.5, 0.4, 8.2), floorMat, 0, -0.2, -1.4);
  // A soft pool of reflected light in the polish (additive ellipse).
  const poolTex = keep(canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,220,140,0.55)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }));
  const poolMat = basic(0xffffff, { map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 });
  const pool = mesh(new THREE.PlaneGeometry(9, 4.5), poolMat, 0, 0.012, 0.3);
  pool.rotation.x = -Math.PI / 2;
  // Apron face, gold lip and footlights.
  mesh(new THREE.BoxGeometry(13.5, 1.6, 0.2), toon(0x3a0a10), 0, -0.8, 2.75);
  const lip = mesh(new THREE.BoxGeometry(13.6, 0.08, 0.14), goldMat, 0, 0.0, 2.72);
  const FOOT = lowGraphics ? 14 : 22;
  const footMesh = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.07, 8, 6)), basic(0xffffff), FOOT);
  for (let i = 0; i < FOOT; i++) {
    dummy.position.set(-6 + 12 * i / (FOOT - 1), 0.05, 2.6); dummy.scale.set(1.4, 0.7, 1); dummy.updateMatrix();
    footMesh.setMatrixAt(i, dummy.matrix); footMesh.setColorAt(i, col.set(0xffd27a));
  }
  group.add(footMesh);

  // ── Proscenium: gold columns, velvet curtains swagged open, valance ──
  const curtainGeo = (w, h, folds, amp) => {
    const geo = new THREE.PlaneGeometry(w, h, folds * 4, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.sin((x / w + 0.5) * folds * Math.PI * 2) * amp * (0.6 + 0.4 * (0.5 - y / h)));
    }
    geo.computeVertexNormals();
    return geo;
  };
  for (const sx of [-1, 1]) {
    const col1 = mesh(new THREE.CylinderGeometry(0.28, 0.32, 7.5, 16), goldMat, sx * 5.35, 3.2, 2.4);
    col1.add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.8, 0.3, 0.8)), goldMat)).position.y = -3.6;
    // Side drape, gathered toward the column by a tie-back.
    const drape = mesh(curtainGeo(1.6, 7.2, 5, 0.12), velvet, sx * 4.55, 3.0, 2.15);
    drape.rotation.y = sx * 0.12;
    const pos = drape.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), x = pos.getX(i);
      const pinch = Math.exp(-Math.pow((y + 1.1) / 1.2, 2));                // tie-back at y≈1.9
      pos.setX(i, x * (1 - 0.55 * pinch) + sx * 0.35 * pinch);
    }
    drape.geometry.computeVertexNormals();
    const tie = mesh(new THREE.TorusGeometry(0.32, 0.05, 6, 16), goldMat, sx * 4.85, 1.9, 2.25);
    tie.rotation.y = Math.PI / 2;
  }
  // Valance: velvet swags with a gold fringe.
  const valance = mesh(curtainGeo(11.2, 1.1, 14, 0.08), velvet, 0, 5.15, 2.35);
  for (let i = 0; i < 5; i++) {
    const sw = mesh(new THREE.TorusGeometry(1.1, 0.16, 6, 18, Math.PI), velvet, -4.4 + i * 2.2, 4.95, 2.45);
    sw.rotation.z = Math.PI; sw.scale.set(1, 0.42, 1);
    const fr = mesh(new THREE.TorusGeometry(1.1, 0.04, 4, 18, Math.PI), goldMat, -4.4 + i * 2.2, 4.88, 2.52);
    fr.rotation.z = Math.PI; fr.scale.set(1, 0.42, 1);
  }
  mesh(new THREE.BoxGeometry(11.6, 0.35, 0.3), goldMat, 0, 5.75, 2.45);
  // Gilded cartouche with the level name.
  const signTex = keep(canvasTex(512, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = 'italic 700 58px Georgia, "Times New Roman", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ffb300'; g.shadowBlur = 18;
    g.fillStyle = '#fff1c2'; g.fillText('Falling Violins', w / 2, h / 2 + 4);
    g.shadowBlur = 0; g.strokeStyle = '#8a5a00'; g.lineWidth = 1.5; g.strokeText('Falling Violins', w / 2, h / 2 + 4);
  }));
  const sign = mesh(new THREE.PlaneGeometry(3.6, 0.68), basic(0xffffff, { map: signTex, transparent: true, depthWrite: false }), 0, 5.75, 2.62);

  // ── Upstage: the golden pipe organ ───────────────────────────────
  const PIPES = lowGraphics ? 23 : 35;
  const pipeGeo = keep(new THREE.CylinderGeometry(0.11, 0.11, 1, 10, 1, true));
  const pipeMat = toon(0xffd25a, { emissive: 0x3a2200 });
  const pipes = new THREE.InstancedMesh(pipeGeo, pipeMat, PIPES);
  const pipeInfo = [];
  for (let i = 0; i < PIPES; i++) {
    const u = i / (PIPES - 1), x = -4.2 + 8.4 * u;
    const hgt = 2.2 + 2.6 * Math.pow(Math.sin(u * Math.PI), 1.5) + (i % 2) * 0.35;
    pipeInfo.push({ x, h: hgt });
    dummy.position.set(x, 1.0 + hgt / 2, -4.6 - (i % 2) * 0.18); dummy.scale.set(1, hgt, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    pipes.setMatrixAt(i, dummy.matrix);
  }
  group.add(pipes);
  // Organ case and mouths.
  mesh(new THREE.BoxGeometry(9.2, 1.0, 0.7), toon(0x5a2408), 0, 0.5, -4.6);
  mesh(new THREE.BoxGeometry(9.4, 0.12, 0.8), goldMat, 0, 1.02, -4.55);
  const arch = mesh(new THREE.TorusGeometry(4.8, 0.14, 6, 40, Math.PI), goldMat, 0, 3.6, -4.9);
  arch.scale.set(1, 0.75, 1);
  // Lyre emblem crowning the organ.
  const lyre = new THREE.Group(); lyre.position.set(0, 7.0, -4.8); group.add(lyre);
  for (const sx of [-1, 1]) { const h = mesh(new THREE.TorusGeometry(0.45, 0.07, 6, 16, Math.PI * 0.9), goldMat, sx * 0.28, 0, 0, lyre); h.rotation.z = sx > 0 ? -0.2 : Math.PI + 0.2 - Math.PI * 0.9 + Math.PI; }
  mesh(new THREE.BoxGeometry(1.1, 0.1, 0.1), goldMat, 0, 0.42, 0, lyre);
  mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), goldMat, 0, -0.35, 0, lyre);
  for (let k = -2; k <= 2; k++) mesh(new THREE.BoxGeometry(0.02, 0.75, 0.02), basic(0xfff3c0), k * 0.09, 0.04, 0.02, lyre);

  // ── Chandeliers ──────────────────────────────────────────────────
  const CH = [[-3.1, 5.25, -0.6], [0, 5.55, -1.2], [3.1, 5.25, -0.6]];
  const crystalN = lowGraphics ? 10 : 16, bulbN = 8;
  const crystals = new THREE.InstancedMesh(keep(new THREE.OctahedronGeometry(0.07)), basic(0xfff6e0, { transparent: true, opacity: 0.85 }), CH.length * crystalN);
  const bulbs = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.06, 8, 6)), basic(0xffffff), CH.length * bulbN);
  CH.forEach(([x, y, z], c) => {
    const r1 = mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 28), goldMat, x, y - 0.4, z); r1.rotation.x = Math.PI / 2;
    const r2 = mesh(new THREE.TorusGeometry(0.36, 0.03, 6, 22), goldMat, x, y - 0.1, z); r2.rotation.x = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.5, 5), goldMat, x, y + 1.0, z);
    mesh(new THREE.SphereGeometry(0.13, 10, 8), goldMat, x, y - 0.55, z);
    for (let i = 0; i < crystalN; i++) {
      const a = i / crystalN * Math.PI * 2, r = i % 2 ? 0.62 : 0.36;
      dummy.position.set(x + Math.cos(a) * r, y - (i % 2 ? 0.55 : 0.25), z + Math.sin(a) * r); dummy.scale.set(0.8, 1.8, 0.8); dummy.rotation.set(0, a, 0); dummy.updateMatrix();
      crystals.setMatrixAt(c * crystalN + i, dummy.matrix);
    }
    for (let i = 0; i < bulbN; i++) {
      const a = i / bulbN * Math.PI * 2 + 0.2;
      dummy.position.set(x + Math.cos(a) * 0.62, y - 0.33, z + Math.sin(a) * 0.62); dummy.scale.set(1, 1.3, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      bulbs.setMatrixAt(c * bulbN + i, dummy.matrix); bulbs.setColorAt(c * bulbN + i, col.set(0xffe2a0));
    }
  });
  group.add(crystals, bulbs);

  // ── Falling violins ──────────────────────────────────────────────
  const VN = lowGraphics ? 18 : 34;
  const violinGeo = keep(violinGeometry(1.5));
  const violinMat = toon(0xc0601e, { emissive: 0x301000 });
  const violins = new THREE.InstancedMesh(violinGeo, violinMat, VN);
  violins.frustumCulled = false;
  const fall = [];
  const spawn = (v, top) => {
    // Upstage of the dancers (and clear of close-up cameras), wider at the sides.
    v.x = (Math.random() - 0.5) * 12; v.z = -3.9 + Math.random() * 3.6;
    if (Math.abs(v.x) > 4.2) v.z += 1.8;
    v.y = top ? 7.5 + Math.random() * 3 : Math.random() * 9;
    v.vy = 0.55 + Math.random() * 0.5; v.rx = Math.random() * 6; v.ry = Math.random() * 6;
    v.sx = (Math.random() - 0.5) * 1.2; v.sy = (Math.random() - 0.5) * 2; v.s = 0.8 + Math.random() * 0.5;
  };
  for (let i = 0; i < VN; i++) { const v = {}; spawn(v, false); fall.push(v); }
  group.add(violins);

  // ── Orchestra pit: players sawing on the beat, and the conductor ──
  const pitN = lowGraphics ? 10 : 16;
  mesh(new THREE.BoxGeometry(14, 0.2, 2.6), toon(0x1c0a08), 0, -1.45, 4.2);
  mesh(new THREE.BoxGeometry(14, 0.6, 0.12), toon(0x3a0a10), 0, -0.6, 5.5);
  const players = [];
  for (let i = 0; i < pitN; i++) {
    const u = i / (pitN - 1), x = -6.2 + 12.4 * u;
    if (Math.abs(x) < 0.7) continue;
    players.push({ x, z: 3.55 + 0.6 * (i % 2) + 0.25 * Math.pow(Math.abs(x) / 6.2, 2), ph: (i * 0.37) % 1 });
  }
  const PN = players.length;
  const pBody = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.2, 0.3, 3, 8)), toon(0x15121a), PN);
  const pHead = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.15, 10, 8)), toon(0xffffff), PN);
  const pFiddle = new THREE.InstancedMesh(keep(violinGeometry(0.7)), violinMat, PN);
  const pBow = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.015, 0.55, 0.015)), basic(0xf4ead0), PN);
  const skin = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x5a3a22, 0xd9a07a];
  players.forEach((pl, i) => { pHead.setColorAt(i, col.set(skin[i % skin.length])); });
  group.add(pBody, pHead, pFiddle, pBow);
  const conductor = new THREE.Group(); conductor.position.set(0, -1.45, 3.3); conductor.scale.setScalar(0.78); group.add(conductor);
  const tux = toon(0x111018);
  mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.35, 12), toon(0x3a0a10), 0, 0.17, 0, conductor);  // podium
  mesh(new THREE.CapsuleGeometry(0.17, 0.5, 3, 8), tux, 0, 1.0, 0, conductor);
  mesh(new THREE.SphereGeometry(0.14, 10, 8), toon(0xb88866), 0, 1.5, 0, conductor);
  mesh(new THREE.SphereGeometry(0.15, 10, 8), toon(0xdddddd), 0, 1.56, 0.03, conductor);       // silver hair
  const tails = mesh(new THREE.BoxGeometry(0.3, 0.45, 0.05), tux, 0, 0.62, 0.12, conductor);
  tails.rotation.x = 0.15;
  const cArms = [-1, 1].map(sx => {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.2, 1.25, 0); conductor.add(pivot);
    mesh(new THREE.CapsuleGeometry(0.05, 0.42, 3, 6), tux, 0, -0.25, 0, pivot);
    if (sx > 0) mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 4), basic(0xffffff), 0, -0.65, 0, pivot);
    return pivot;
  });

  // ── Loge boxes with patrons (visible on the wide shots) ──────────
  const fans = [];
  for (const sx of [-1, 1]) for (const tier of [0, 1]) {
    const bx = sx * 6.3, by = 1.2 + tier * 1.9;
    mesh(new THREE.BoxGeometry(1.4, 0.55, 2.2), velvet, bx, by, 3.2);
    mesh(new THREE.BoxGeometry(1.45, 0.07, 2.25), goldMat, bx, by + 0.3, 3.2);
    const n = lowGraphics ? 2 : 3;
    for (let k = 0; k < n; k++) fans.push({ x: bx + sx * 0.25, y: by + 0.35, z: 2.4 + k * 0.7, ph: Math.random() * 6, hype: 0.6 + Math.random() * 0.6, sx });
  }
  const FN = fans.length;
  const fBody = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.2, 0.3, 3, 8)), toon(0xffffff), FN);
  const fHead = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.15, 10, 8)), toon(0xffffff), FN);
  const fArm = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.05, 0.35, 3, 6)), toon(0xffffff), FN * 2);
  const gowns = [0x1a3a8a, 0x6a1a5a, 0x0e5a3a, 0x15121a, 0x7a1020, 0x3a2a6a];
  fans.forEach((f, i) => {
    fBody.setColorAt(i, col.set(gowns[i % gowns.length])); fHead.setColorAt(i, col.set(skin[(i + 2) % skin.length]));
    fArm.setColorAt(i * 2, col.set(skin[(i + 2) % skin.length])); fArm.setColorAt(i * 2 + 1, col.set(skin[(i + 2) % skin.length]));
  });
  group.add(fBody, fHead, fArm);

  // ── Spotlight cones from the fly gallery ─────────────────────────
  const coneGeo = keep(new THREE.ConeGeometry(0.85, 6.8, 20, 1, true));
  coneGeo.translate(0, -3.4, 0);
  const cones = [];
  for (const [x, targetX] of [[-3.4, -1.6], [-1.1, -1.6], [1.1, 1.6], [3.4, 1.6]]) {
    mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.38, 10), toon(0x1a1410), x, 6.55, 1.0);
    const mat = keep(new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const cone = new THREE.Mesh(coneGeo, mat);
    cone.position.set(x, 6.55, 1.0);
    group.add(cone);
    cones.push({ cone, mat, baseX: x, targetX });
  }

  // ── Gold glitter + rose petals ───────────────────────────────────
  const GL = lowGraphics ? 220 : 480;
  const gPos = new Float32Array(GL * 3), gCol = new Float32Array(GL * 3), gVel = new Float32Array(GL * 3), gLife = new Float32Array(GL);
  for (let i = 0; i < GL; i++) gPos[i * 3 + 1] = -100;
  const gGeo = keep(new THREE.BufferGeometry());
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
  gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
  const glitter = new THREE.Points(gGeo, keep(new THREE.PointsMaterial({ size: 0.11, vertexColors: true, sizeAttenuation: true })));
  glitter.frustumCulled = false;
  group.add(glitter);
  let gCursor = 0;
  function burst(n, x, spread, roses = false) {
    for (let k = 0; k < n; k++) {
      const i = gCursor = (gCursor + 1) % GL;
      gPos[i * 3] = x + (Math.random() - 0.5) * spread; gPos[i * 3 + 1] = 5.5 + Math.random() * 1.5; gPos[i * 3 + 2] = (Math.random() - 0.5) * 3 + 0.4;
      gVel[i * 3] = (Math.random() - 0.5) * 1.0; gVel[i * 3 + 1] = -0.9 - Math.random() * 1.1; gVel[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      col.set(roses && k % 3 ? (k % 2 ? 0xd0102e : 0xff4060) : (k % 2 ? 0xffd23f : 0xfff1b0));
      gCol[i * 3] = col.r; gCol[i * 3 + 1] = col.g; gCol[i * 3 + 2] = col.b;
      gLife[i] = 6;
    }
    gGeo.attributes.color.needsUpdate = true;
  }

  // ── Lights ───────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffe2b0, 0x4a1a10, 1.05);
  const key = new THREE.DirectionalLight(0xfff0d8, 1.5);
  key.position.set(1.2, 6, 6);
  const rimL = new THREE.PointLight(0xffb040, 16, 12, 1.6); rimL.position.set(-3.6, 3.2, -1.2);
  const rimR = new THREE.PointLight(0xd070ff, 14, 12, 1.6); rimR.position.set(3.6, 3.2, -1.2);
  const footGlow = new THREE.PointLight(0xffc870, 10, 9, 1.6); footGlow.position.set(0, 0.6, 2.4);
  const organGlow = new THREE.PointLight(0xffa830, 12, 12, 1.5); organGlow.position.set(0, 3.5, -3.2);
  group.add(hemi, key, rimL, rimR, footGlow, organGlow);
  const base = { hemi: hemi.intensity, key: key.intensity, rimL: rimL.intensity, rimR: rimR.intensity, foot: footGlow.intensity, organ: organGlow.intensity };

  // ── State + update ───────────────────────────────────────────────
  const state = { lightLevel: 1, flash: 0, cheer: 0, focus: 0, solo: null, rain: 0, organ: 0, lastBeat: -1 };

  function update(dt, info) {
    const { beat, songTime } = info;
    const ph = ((beat % 1) + 1) % 1, onBeat = Math.exp(-ph * 6), whole = Math.floor(beat);
    const L = state.lightLevel;
    state.flash = Math.max(0, state.flash - dt * 2.2);
    state.cheer = Math.max(0, state.cheer - dt * 0.45);
    state.rain = Math.max(0, state.rain - dt * 0.35);
    state.organ = Math.max(0, state.organ - dt * 0.8);
    state.focus += ((info.leader || 0) - state.focus) * Math.min(1, dt * 2);
    let soloK = 0, soloX = 0;
    if (state.solo) {
      const so = state.solo;
      soloK = Math.min(1, Math.max(0, (songTime - so.t0) / 0.35)) * Math.min(1, Math.max(0, (so.t1 - songTime) / 0.5));
      soloX = so.x;
      if (songTime > so.t1) state.solo = null;
    }
    const house = L * (1 - 0.6 * soloK);

    // Footlights chase on the beat; near the soloist they blaze.
    for (let i = 0; i < FOOT; i++) {
      const x = -6 + 12 * i / (FOOT - 1);
      let k = 0.35 + 0.65 * (((i + whole) % 4 === 0) ? onBeat : 0.25 * onBeat);
      k = k * house + soloK * Math.exp(-Math.pow((x - soloX) / 1.6, 2));
      footMesh.setColorAt(i, col.setRGB(1.0 * (0.25 + k), 0.8 * (0.2 + k), 0.45 * (0.15 + k)));
    }
    footMesh.instanceColor.needsUpdate = true;
    poolMat.opacity = (0.35 + 0.25 * onBeat + 0.3 * state.flash) * house + 0.3 * soloK;
    pool.position.x = soloX * soloK;

    // Organ pipes breathe with the music, flare on big moves.
    const glow = (0.15 + 0.35 * onBeat + 0.6 * state.organ + 0.4 * state.flash) * L * (1 - 0.5 * soloK);
    pipeMat.emissive.setRGB(0.45 * glow, 0.28 * glow, 0.04 * glow);
    shellMat.emissive.setRGB(0.18 * house + 0.1 * onBeat * L, 0.08 * house, 0.015);

    // Chandeliers twinkle: a ripple of bulbs around each ring on the beat.
    for (let c = 0; c < CH.length; c++) for (let i = 0; i < bulbN; i++) {
      const tw = 0.55 + 0.45 * Math.cos(TAU * (beat * 0.5 + i / bulbN + c * 0.33));
      const k = (0.45 + 0.55 * tw * (0.5 + 0.5 * onBeat) + state.flash) * house;
      bulbs.setColorAt(c * bulbN + i, col.setRGB(Math.min(1, 0.3 + k), Math.min(1, 0.22 + 0.85 * k), Math.min(1, 0.1 + 0.55 * k)));
    }
    bulbs.instanceColor.needsUpdate = true;
    crystals.material.opacity = 0.55 + 0.35 * onBeat * L;

    // Violins rain from the flies, tumbling — harder after a big move.
    const sp = 1 + 2.4 * state.rain;
    fall.forEach((v, i) => {
      v.y -= v.vy * sp * dt; v.rx += v.sx * dt * sp; v.ry += v.sy * dt * sp;
      if (v.y < -1.2) spawn(v, true);
      dummy.position.set(v.x + Math.sin(songTime * 0.6 + i) * 0.3, v.y, v.z);
      dummy.rotation.set(0.4 * Math.sin(v.rx), v.ry, 0.5 * Math.sin(v.rx * 0.7 + i));
      dummy.scale.setScalar(v.s);
      dummy.updateMatrix();
      violins.setMatrixAt(i, dummy.matrix);
    });
    violins.instanceMatrix.needsUpdate = true;

    // Pit: one bow stroke per beat (alternating desks), heads nodding.
    players.forEach((pl, i) => {
      const bow = Math.cos(Math.PI * (beat + (i % 2) * 0.5)), nod = Math.exp(-frac(beat + pl.ph * 0.1) * 5) * 0.04;
      dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
      dummy.position.set(pl.x, -0.75 - nod, pl.z); dummy.updateMatrix(); pBody.setMatrixAt(i, dummy.matrix);
      dummy.position.set(pl.x, -0.3 - nod * 1.5, pl.z); dummy.updateMatrix(); pHead.setMatrixAt(i, dummy.matrix);
      dummy.position.set(pl.x + 0.16, -0.42, pl.z - 0.08); dummy.rotation.set(-0.3, 0.2, -1.2); dummy.updateMatrix(); pFiddle.setMatrixAt(i, dummy.matrix);
      dummy.position.set(pl.x + 0.12 - 0.12 * bow, -0.36 + 0.05 * bow, pl.z - 0.18); dummy.rotation.set(0, 0, 1.0 + 0.25 * bow); dummy.updateMatrix(); pBow.setMatrixAt(i, dummy.matrix);
    });
    pBody.instanceMatrix.needsUpdate = pHead.instanceMatrix.needsUpdate = pFiddle.instanceMatrix.needsUpdate = pBow.instanceMatrix.needsUpdate = true;
    // Conductor: a 4/4 pattern — down on 1, in on 2, out on 3, up on 4.
    const b4 = ((beat % 4) + 4) % 4, seg = Math.floor(b4), u = b4 - seg, e = 0.5 - 0.5 * Math.cos(Math.PI * u);
    const PAT = [[0.2, 1.2], [0.9, 2.2], [-0.3, 1.9], [0.6, 2.6]];   // [swing out, raise]
    const a0 = PAT[(seg + 3) % 4], a1 = PAT[seg];
    const sw = lerp(a0[0], a1[0], e), up = lerp(a0[1], a1[1], e) - 0.35 * Math.sin(Math.PI * u) * (seg === 0 ? 1 : 0.4);
    cArms[1].rotation.set(0, 0, up * 0.9 + sw * 0.3); cArms[1].rotation.x = -0.4;
    cArms[0].rotation.set(-0.4, 0, -(1.3 + 0.25 * Math.sin(Math.PI * beat / 2)) - 0.3 * state.cheer);
    conductor.rotation.y = Math.PI + 0.12 * Math.sin(Math.PI * beat / 4);

    // Patrons: applause on the beat, standing ovations when hyped.
    const hype = Math.min(1, 0.3 + state.cheer + Math.abs(state.focus) * 0.3);
    fans.forEach((f, i) => {
      const jump = (0.5 - 0.5 * Math.cos(TAU * beat + f.ph)) * (0.03 + 0.18 * hype * f.hype) * L;
      dummy.scale.set(1, 1, 1);
      dummy.position.set(f.x, f.y + 0.45 + jump, f.z); dummy.rotation.set(0, -f.sx * 1.2, 0); dummy.updateMatrix(); fBody.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.47; dummy.updateMatrix(); fHead.setMatrixAt(i, dummy.matrix);
      const clap = 0.5 + 0.5 * Math.cos(TAU * beat * 2 + f.ph);
      for (const s of [-1, 1]) {
        dummy.position.set(f.x, f.y + 0.7 + jump, f.z + s * 0.16);
        dummy.rotation.set(s * (hype > 0.65 ? 2.6 : 0.9 + 0.35 * clap), 0, -f.sx * 0.6);
        dummy.updateMatrix(); fArm.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), dummy.matrix);
      }
    });
    fBody.instanceMatrix.needsUpdate = fHead.instanceMatrix.needsUpdate = fArm.instanceMatrix.needsUpdate = true;

    // Spotlights: swing to the dancers, converge on the soloist.
    cones.forEach((c, i) => {
      const lead = c.targetX < 0 ? Math.max(0, state.focus) : Math.max(0, -state.focus);
      const sway = Math.sin(songTime * 0.8 + i * 1.9) * 0.3;
      const dx = c.targetX + (soloX - c.targetX) * soloK + sway * (1 - soloK) - c.baseX;
      c.cone.rotation.z = Math.atan2(dx, 6.5); c.cone.rotation.x = -0.1;
      c.mat.opacity = (0.035 + 0.04 * onBeat + 0.05 * lead + 0.1 * state.flash) * L * (1 - 0.3 * soloK) + 0.07 * soloK;
    });

    // Glitter / petals drift down.
    for (let i = 0; i < GL; i++) {
      if (gLife[i] <= 0) continue;
      gLife[i] -= dt;
      gPos[i * 3] += (gVel[i * 3] + Math.sin(songTime * 2 + i) * 0.35) * dt;
      gPos[i * 3 + 1] += gVel[i * 3 + 1] * dt; gPos[i * 3 + 2] += gVel[i * 3 + 2] * dt;
      if (gLife[i] <= 0 || gPos[i * 3 + 1] < 0.02) { gLife[i] = 0; gPos[i * 3 + 1] = -100; }
    }
    gGeo.attributes.position.needsUpdate = true;
    sign.material.opacity = L * (0.85 + 0.15 * onBeat);
    sky.material.uniforms.uPulse.value = onBeat * 0.4 * L + state.flash * 0.6;
    sky.material.uniforms.uLight.value = house;

    // Lights.
    const soloL = soloX < 0 ? 1 : -1;
    hemi.intensity = base.hemi * (0.15 + 0.85 * L) * (1 - 0.55 * soloK);
    key.intensity = base.key * L * (1 - 0.45 * soloK);
    rimL.intensity = base.rimL * L * (0.7 + 0.5 * onBeat + 0.6 * Math.max(0, state.focus)) * (1 + 1.6 * soloK * Math.max(0, soloL) - 0.6 * soloK * Math.max(0, -soloL));
    rimR.intensity = base.rimR * L * (0.7 + 0.5 * onBeat + 0.6 * Math.max(0, -state.focus)) * (1 + 1.6 * soloK * Math.max(0, -soloL) - 0.6 * soloK * Math.max(0, soloL));
    footGlow.intensity = base.foot * L * (0.8 + 0.4 * onBeat + state.flash);
    footGlow.position.x = soloX * soloK;
    organGlow.intensity = base.organ * L * (0.6 + 0.5 * onBeat + state.organ) * (1 - 0.6 * soloK);
  }

  function react(type, data = {}) {
    const x = data.who === 'rival' ? 1.6 : data.who === 'player' ? -1.6 : 0;
    switch (type) {
      case 'move':
        if (data.tier >= 3) { state.rain = Math.min(1.2, state.rain + 0.6); state.cheer = Math.min(1, state.cheer + 0.35); }
        if (data.tier >= 4) { burst(60, x, 3); state.flash = 0.6; state.organ = 1; }
        break;
      case 'taunt': state.flash = 0.4; state.organ = 0.5; break;
      case 'tauntLanded': burst(90, data.attacker === 'rival' ? 1.6 : -1.6, 3); state.flash = 1; state.cheer = 1; state.rain = 1.2; break;
      case 'dodge': state.cheer = Math.min(1, state.cheer + 0.6); state.flash = 0.5; break;
      case 'end': burst(220, x, 6, true); state.cheer = 1; state.flash = 1; state.rain = 1.2; state.organ = 1; break;
      case 'drop': state.flash = 1; state.rain = 1.2; burst(80, 0, 8); break;
      case 'solo':
        state.solo = { x, t0: data.songTime, t1: data.until };
        state.flash = 0.8; state.cheer = 1; burst(70, x, 2.5, true);
        break;
    }
  }

  return {
    group,
    anchors: { player: new THREE.Vector3(-1.6, 0.03, 0.2), rival: new THREE.Vector3(1.6, 0.03, 0.2) },
    update, react,
    setLightLevel(v) { state.lightLevel = Math.max(0, Math.min(1, v)); },
    dispose() { for (const d of disposables) if (d && d.dispose) d.dispose(); },
  };
}

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const frac = (x) => ((x % 1) + 1) % 1;
