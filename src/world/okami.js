// 女将。黒留袖に金の裾模様、お太鼓結びの帯、日本髪、白粉を塗った顔。
// 二周目の廊下に立つ「影」は、同じ形を黒く半透明にしたもの。
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// 黒留袖。u=0 が正面。裾に金と白の模様、正面に衽（おくみ）の合わせ、上に白い半襟
function kimonoTexture() {
  const W = 1024, H = 1024;
  const [c, x] = canvas(W, H);
  const r = rng(7);
  x.fillStyle = '#0c0a0b';
  x.fillRect(0, 0, W, H);
  // 縮緬のしぼ
  for (let i = 0; i < 26000; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? '60,55,60' : '0,0,0'},${0.05 + r() * 0.1})`;
    x.fillRect(r() * W, r() * H, 1.5, 1.5);
  }
  // 裾模様（下が v=0 なので canvas では下端）
  const hemTop = H * 0.72;
  const g = x.createLinearGradient(0, hemTop, 0, H);
  g.addColorStop(0, 'rgba(40,30,20,0)');
  g.addColorStop(1, 'rgba(60,45,30,0.35)');
  x.fillStyle = g;
  x.fillRect(0, hemTop, W, H - hemTop);
  // 流水
  x.strokeStyle = 'rgba(200,190,170,0.55)';
  x.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    x.beginPath();
    for (let px = 0; px <= W; px += 8) {
      const py = H - 40 - k * 22 + Math.sin(px * 0.018 + k) * 10;
      px === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
    }
    x.stroke();
  }
  // 金の松と椿
  const flowers = [[60, 830], [180, 900], [880, 860], [960, 920], [520, 880], [400, 840], [660, 905]];
  for (const [fx, fy] of flowers) {
    x.fillStyle = 'rgba(190,150,70,0.85)';
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      x.beginPath();
      x.arc(fx + Math.cos(a) * 9, fy + Math.sin(a) * 9, 9, 0, Math.PI * 2);
      x.fill();
    }
    x.fillStyle = 'rgba(150,30,35,0.9)';
    x.beginPath();
    x.arc(fx, fy, 5, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = 'rgba(170,135,60,0.8)';
    x.lineWidth = 2;
    for (let n = 0; n < 6; n++) {
      x.beginPath();
      x.moveTo(fx + 18, fy - 5);
      x.lineTo(fx + 18 + Math.cos(n) * 22, fy - 5 - Math.abs(Math.sin(n)) * 22);
      x.stroke();
    }
  }
  // 衽の合わせ（左前ではなく右前：着る人から見て左が上）
  x.strokeStyle = 'rgba(70,65,60,0.9)';
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(W * 0.045, 0);
  x.lineTo(W * 0.02, H);
  x.stroke();
  // 半襟と襟（上端の正面＝u の両端に V 字）
  for (const side of [0, 1]) {
    const sx = side ? W : 0, d = side ? -1 : 1;
    x.fillStyle = '#e8e2d6';
    x.beginPath();
    x.moveTo(sx, 0);
    x.lineTo(sx + d * 40, 0);
    x.lineTo(sx, 105);
    x.closePath();
    x.fill();
    x.strokeStyle = '#1a1618';
    x.lineWidth = 10;
    x.beginPath();
    x.moveTo(sx + d * 46, 0);
    x.lineTo(sx, 125);
    x.stroke();
  }
  // 背の家紋
  x.strokeStyle = 'rgba(230,225,215,0.85)';
  x.lineWidth = 3;
  x.beginPath();
  x.arc(W / 2, 90, 18, 0, Math.PI * 2);
  x.stroke();
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
    x.beginPath();
    x.arc(W / 2 + Math.cos(a) * 9, 90 + Math.sin(a) * 9, 6, 0, Math.PI * 2);
    x.stroke();
  }
  const t = tex(c);
  t.flipY = false;
  return t;
}

// 帯（錦）
function obiTexture() {
  const W = 512, H = 128;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#6a5228';
  x.fillRect(0, 0, W, H);
  const r = rng(11);
  for (let i = 0; i < 9000; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? '210,180,110' : '40,25,10'},${0.1 + r() * 0.2})`;
    x.fillRect(r() * W, r() * H, 2, 1);
  }
  x.strokeStyle = 'rgba(230,200,130,0.6)';
  x.lineWidth = 2;
  for (let px = 0; px < W; px += 32) {
    for (let py = 16; py < H; py += 32) {
      x.beginPath();
      x.moveTo(px, py - 10);
      x.lineTo(px + 10, py);
      x.lineTo(px, py + 10);
      x.lineTo(px - 10, py);
      x.closePath();
      x.stroke();
    }
  }
  x.fillStyle = 'rgba(20,10,5,0.5)';
  x.fillRect(0, 0, W, 6);
  x.fillRect(0, H - 6, W, 6);
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// 顔。球の u=0.25 が正面。白粉、伏し目、紅
function faceTexture() {
  const W = 1024, H = 512;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#e6ddd2';
  x.fillRect(0, 0, W, H);
  const cx = 256, cy = 262;
  // 頬と目元の影
  const sh = x.createRadialGradient(cx, cy + 30, 30, cx, cy + 30, 150);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(110,90,80,0.35)');
  x.fillStyle = sh;
  x.fillRect(cx - 200, cy - 200, 400, 400);
  for (const s of [-1, 1]) {
    const ex = cx + s * 50, ey = cy - 8;
    const hollow = x.createRadialGradient(ex, ey, 4, ex, ey, 42);
    hollow.addColorStop(0, 'rgba(70,50,50,0.45)');
    hollow.addColorStop(1, 'rgba(70,50,50,0)');
    x.fillStyle = hollow;
    x.fillRect(ex - 50, ey - 50, 100, 100);
    // 伏し目（細い切れ長）
    x.fillStyle = '#1a1010';
    x.beginPath();
    x.moveTo(ex - 26 * s, ey);
    x.quadraticCurveTo(ex, ey - 9, ex + 24 * s, ey + 3);
    x.quadraticCurveTo(ex, ey + 6, ex - 26 * s, ey);
    x.fill();
    // わずかに覗く白目と黒目
    x.fillStyle = 'rgba(200,190,180,0.7)';
    x.beginPath();
    x.ellipse(ex + 2 * s, ey + 1.5, 13, 2.2, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#050303';
    x.beginPath();
    x.ellipse(ex + 4 * s, ey + 2, 5.5, 2.4, 0, 0, Math.PI * 2);
    x.fill();
    // 眉（細く描いた引眉）
    x.strokeStyle = 'rgba(40,30,28,0.75)';
    x.lineWidth = 3;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(ex - 24 * s, ey - 34);
    x.quadraticCurveTo(ex + 2 * s, ey - 44, ex + 26 * s, ey - 32);
    x.stroke();
  }
  // 鼻筋
  x.strokeStyle = 'rgba(120,100,90,0.35)';
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(cx + 6, cy + 10);
  x.quadraticCurveTo(cx + 10, cy + 40, cx + 4, cy + 54);
  x.stroke();
  x.fillStyle = 'rgba(100,80,75,0.4)';
  for (const s of [-1, 1]) {
    x.beginPath();
    x.ellipse(cx + s * 9, cy + 58, 4, 2, 0, 0, Math.PI * 2);
    x.fill();
  }
  // 紅（下唇だけ濃く差す）
  x.fillStyle = '#8a1a20';
  x.beginPath();
  x.moveTo(cx - 20, cy + 86);
  x.quadraticCurveTo(cx, cy + 78, cx + 20, cy + 86);
  x.quadraticCurveTo(cx, cy + 100, cx - 20, cy + 86);
  x.fill();
  x.fillStyle = 'rgba(120,30,35,0.7)';
  x.beginPath();
  x.moveTo(cx - 18, cy + 86);
  x.quadraticCurveTo(cx - 6, cy + 79, cx, cy + 82);
  x.quadraticCurveTo(cx + 6, cy + 79, cx + 18, cy + 86);
  x.quadraticCurveTo(cx, cy + 88, cx - 18, cy + 86);
  x.fill();
  x.strokeStyle = 'rgba(40,10,10,0.7)';
  x.lineWidth = 1.5;
  x.beginPath();
  x.moveTo(cx - 19, cy + 86);
  x.lineTo(cx + 19, cy + 86);
  x.stroke();
  // 白粉のむら
  const r = rng(5);
  for (let i = 0; i < 3000; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '150,130,120'},0.06)`;
    x.fillRect(r() * W, r() * H, 3, 3);
  }
  return tex(c);
}

function hairTexture() {
  const W = 256, H = 256;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#060506';
  x.fillRect(0, 0, W, H);
  const r = rng(13);
  for (let i = 0; i < 500; i++) {
    x.strokeStyle = `rgba(${70 + r() * 40},${70 + r() * 40},${80 + r() * 50},${0.15 + r() * 0.25})`;
    x.lineWidth = 0.6 + r();
    const px = r() * W;
    x.beginPath();
    x.moveTo(px, 0);
    x.bezierCurveTo(px + (r() - 0.5) * 40, H * 0.3, px + (r() - 0.5) * 40, H * 0.7, px + (r() - 0.5) * 30, H);
    x.stroke();
  }
  return tex(c);
}

let cache = null;
function materials() {
  if (cache) return cache;
  const silk = (opts) => new THREE.MeshPhysicalMaterial({ roughness: 0.62, sheen: 0.6, sheenRoughness: 0.5, ...opts });
  cache = {
    kimono: silk({ map: kimonoTexture(), sheenColor: new THREE.Color(0x3a3440) }),
    sleeve: silk({ color: 0x0d0b0c, sheenColor: new THREE.Color(0x3a3440) }),
    obi: silk({ map: obiTexture(), roughness: 0.45, sheenColor: new THREE.Color(0xc8a060), metalness: 0.25 }),
    obijime: new THREE.MeshStandardMaterial({ color: 0x8a2a2a, roughness: 0.6 }),
    obiage: silk({ color: 0xc8b8c0, sheenColor: new THREE.Color(0xffffff) }),
    skin: new THREE.MeshStandardMaterial({ color: 0xd8cec2, roughness: 0.55, emissive: 0x060504 }),
    face: new THREE.MeshStandardMaterial({ map: faceTexture(), color: 0xe8e0d8, roughness: 0.5, emissive: 0x060504 }),
    hair: new THREE.MeshPhysicalMaterial({ map: hairTexture(), color: 0x9a9aa0, roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
    tabi: new THREE.MeshStandardMaterial({ color: 0xdcd6cc, roughness: 0.8 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xb08a3a, roughness: 0.3, metalness: 0.9 }),
    coral: new THREE.MeshStandardMaterial({ color: 0x9a1a1a, roughness: 0.35 }),
  };
  return cache;
}

function ellipsoid(r, sx, sy, sz, mat, x, y, z, seg = 24) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

// mode: 'caster'     姿は見えず、灯りに照らされて影だけを落とす
//       'silhouette' 黒い半透明の人影（鏡の中にだけ映すのに使う）
export function buildOkami({ mode = 'caster' } = {}) {
  const M = materials();
  const g = new THREE.Group();

  // 胴（着物）：裾は細くすぼまり、腰から胸へ。上端は衿元
  const prof = [
    [0.0, 0.17], [0.05, 0.185], [0.3, 0.19], [0.6, 0.185], [0.85, 0.178], [0.98, 0.168],
    [1.12, 0.163], [1.24, 0.168], [1.3, 0.162], [1.35, 0.12], [1.375, 0.065], [1.39, 0.05],
  ];
  const pts = prof.map(([y, r]) => new THREE.Vector2(r, y));
  const bodyGeo = new THREE.LatheGeometry(pts, 48);
  // テクスチャの v を高さに合わせる（Lathe の v は点の番号順なので、高さで振り直す）
  {
    const uv = bodyGeo.attributes.uv, pos = bodyGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - pos.getY(i) / 1.39);
    // 裾に布のゆらぎ
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < 0.4) {
        const a = Math.atan2(pos.getX(i), pos.getZ(i));
        const k = (0.4 - y) / 0.4;
        const s = 1 + Math.sin(a * 7) * 0.025 * k;
        pos.setX(i, pos.getX(i) * s);
        pos.setZ(i, pos.getZ(i) * s);
      }
    }
    bodyGeo.computeVertexNormals();
  }
  const body = new THREE.Mesh(bodyGeo, M.kimono);
  body.scale.set(1, 1, 0.78);
  g.add(body);

  // 帯・帯締め・帯揚げ・お太鼓
  const obi = new THREE.Mesh(new THREE.CylinderGeometry(0.178, 0.176, 0.27, 48, 1, true), M.obi);
  obi.scale.set(1, 1, 0.8);
  obi.position.y = 1.08;
  g.add(obi);
  const jime = new THREE.Mesh(new THREE.TorusGeometry(0.178, 0.008, 8, 48), M.obijime);
  jime.rotation.x = Math.PI / 2;
  jime.scale.set(1, 0.8, 1);
  jime.position.y = 1.07;
  g.add(jime);
  const age = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.012, 8, 48, Math.PI), M.obiage);
  age.rotation.x = Math.PI / 2;
  age.rotation.z = Math.PI;
  age.scale.set(1, 0.8, 1);
  age.position.y = 1.215;
  g.add(age);
  const taiko = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.07, 4, 4, 1), M.obi);
  {
    const p = taiko.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - (p.getX(i) ** 2) * 0.6);
    taiko.geometry.computeVertexNormals();
  }
  taiko.position.set(0, 1.07, -0.17);
  g.add(taiko);
  const tare = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.05), M.obi);
  tare.position.set(0, 0.9, -0.165);
  g.add(tare);

  // 肩
  const shoulders = ellipsoid(0.17, 1.25, 0.42, 0.78, M.sleeve, 0, 1.3, 0);
  g.add(shoulders);

  // 腕は肘で曲げて手を前で重ね、袂（たもと）は前腕の下に長く垂れる
  const limb = (from, to, r0, r1, mat) => {
    const a0 = new THREE.Vector3(...from), a1 = new THREE.Vector3(...to);
    const len = a0.distanceTo(a1);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 16), mat);
    m.position.copy(a0).add(a1).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a1.clone().sub(a0).normalize());
    g.add(m);
    return m;
  };
  for (const s of [-1, 1]) {
    const shoulder = [s * 0.17, 1.3, -0.01];
    const elbow = [s * 0.2, 1.05, 0.02];
    const wrist = [s * 0.06, 1.0, 0.17];
    limb(shoulder, elbow, 0.055, 0.05, M.sleeve);
    limb(elbow, wrist, 0.05, 0.042, M.sleeve);
    const sleeveGeo = new THREE.CapsuleGeometry(0.1, 0.16, 6, 16);
    {
      const p = sleeveGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        // 下へ行くほど少し外へ、布のたるみ
        const y = p.getY(i);
        p.setX(i, p.getX(i) * (1 + Math.max(0, -y) * 0.6));
      }
      sleeveGeo.computeVertexNormals();
    }
    const sleeve = new THREE.Mesh(sleeveGeo, M.sleeve);
    sleeve.scale.set(1.05, 1, 0.26);
    sleeve.position.set(s * 0.14, 0.86, 0.1);
    sleeve.rotation.set(0.12, s * 0.75, s * 0.05);
    g.add(sleeve);
    const hand = ellipsoid(0.034, 0.75, 0.45, 1.35, M.skin, s * 0.03, 0.995, 0.205 - (s > 0 ? 0.01 : 0));
    hand.rotation.y = s * 0.6;
    g.add(hand);
  }

  // 足袋の爪先
  for (const s of [-1, 1]) g.add(ellipsoid(0.04, 0.85, 0.55, 1.5, M.tabi, s * 0.06, 0.02, 0.13));

  // 頭部（少しうつむく）
  const head = new THREE.Group();
  head.position.set(0, 1.37, 0.0);
  g.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.045, 0.1, 16), M.skin);
  neck.position.y = 0.035;
  head.add(neck);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.09, 40, 28), M.face);
  // 顎を細く、後頭部をやや大きく
  {
    const p = skull.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), z = p.getZ(i);
      if (y < 0) {
        const k = -y / 0.09;
        p.setX(i, p.getX(i) * (1 - k * 0.32));
        p.setZ(i, z * (1 - k * 0.15) + (z > 0 ? k * 0.008 : 0));
      }
      if (z > 0.05 && Math.abs(p.getX(i)) < 0.015 && y > -0.03 && y < 0.02) p.setZ(i, z + 0.006); // 鼻
    }
    skull.geometry.computeVertexNormals();
  }
  skull.scale.set(0.84, 1.08, 0.95);
  skull.position.y = 0.135;
  head.add(skull);

  // 日本髪：額の生え際、鬢（左右の張り出し）、髷、髱（後ろ）
  const hair = M.hair;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.094, 40, 20, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.62), hair);
  cap.scale.set(0.86, 1.08, 0.97);
  cap.position.y = 0.14;
  head.add(cap);
  const front = new THREE.Mesh(new THREE.SphereGeometry(0.095, 40, 12, 0, Math.PI * 2, 0, Math.PI * 0.26), hair);
  front.scale.set(0.86, 1.08, 0.97);
  front.position.y = 0.141;
  head.add(front);
  for (const s of [-1, 1]) head.add(ellipsoid(0.06, 0.55, 0.85, 1.05, hair, s * 0.075, 0.165, -0.01));
  head.add(ellipsoid(0.07, 1.25, 0.62, 0.95, hair, 0, 0.265, -0.02));
  head.add(ellipsoid(0.04, 0.9, 0.9, 1.1, hair, 0, 0.295, 0.035));
  head.add(ellipsoid(0.065, 1.2, 0.75, 0.85, hair, 0, 0.095, -0.09));
  // 簪と珊瑚玉
  const kanzashi = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 6), M.gold);
  kanzashi.rotation.z = Math.PI / 2 - 0.2;
  kanzashi.position.set(0.0, 0.265, -0.005);
  head.add(kanzashi);
  head.add(ellipsoid(0.011, 1, 1, 1, M.coral, 0.1, 0.285, -0.005, 12));
  head.add(ellipsoid(0.011, 1, 1, 1, M.coral, -0.1, 0.245, -0.005, 12));
  // ほつれ毛
  const strand = (pts) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 20, 0.0016, 4), hair);
  head.add(strand([[0.06, 0.205, 0.04], [0.075, 0.135, 0.065], [0.07, 0.065, 0.075], [0.078, 0.005, 0.06]]));
  head.add(strand([[-0.05, 0.215, 0.06], [-0.068, 0.145, 0.075], [-0.06, 0.085, 0.08], [-0.066, 0.035, 0.07]]));
  head.add(strand([[0.02, 0.225, 0.075], [0.03, 0.165, 0.09], [0.022, 0.115, 0.093]]));
  head.rotation.x = 0.2;

  if (mode === 'silhouette') {
    const dark = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.92, depthWrite: false });
    g.traverse((o) => {
      if (o.isMesh) o.material = dark;
    });
  } else {
    // 色も奥行きも書かない材質：画面には何も映らないが、影の計算には加わる
    const ghost = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    g.traverse((o) => {
      if (o.isMesh) {
        o.material = ghost;
        o.castShadow = true;
        o.frustumCulled = false;
      }
    });
  }
  // ゆっくり息をする。少しずつ首が傾く
  g.userData.update = (t) => {
    body.scale.y = 1 + Math.sin(t * 1.3) * 0.004;
    head.rotation.z = Math.sin(t * 0.37) * 0.05;
    head.rotation.x = 0.2 + Math.sin(t * 0.23) * 0.04;
  };
  g.visible = false;
  return g;
}
