// 動かない部品をまとめて一つの形にし、描画の呼び出し回数を減らす。
// 同じ材質・同じ影の設定のものを、ワールド座標に焼き込んで結合する。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mergeStatic(scene, dynamic) {
  scene.updateMatrixWorld(true);
  const groups = new Map();
  const victims = [];
  const visit = (obj) => {
    if (dynamic.has(obj) || !obj.visible || obj.isLight || obj.isSprite || obj.isReflector) return;
    if (obj.isMesh && !Array.isArray(obj.material) && obj.material.visible !== false && !obj.material.transparent) {
      const key = `${obj.material.uuid}|${obj.castShadow ? 1 : 0}${obj.receiveShadow ? 1 : 0}`;
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { material: obj.material, cast: obj.castShadow, receive: obj.receiveShadow, geos: [] }));
      let geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
      for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      if (!geo.attributes.normal) geo.computeVertexNormals();
      geo.applyMatrix4(obj.matrixWorld);
      g.geos.push(geo);
      victims.push(obj);
    }
    for (const c of obj.children) visit(c);
  };
  for (const c of scene.children) visit(c);
  for (const o of victims) o.parent.remove(o);
  let calls = 0;
  for (const g of groups.values()) {
    const merged = mergeGeometries(g.geos, false);
    g.geos.forEach((x) => x.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, g.material);
    m.castShadow = g.cast;
    m.receiveShadow = g.receive;
    m.matrixAutoUpdate = false;
    scene.add(m);
    calls++;
  }
  return { before: victims.length, after: calls };
}

// 動く部品（襖・提灯・扉など、まとめて動かす Group）の中身を、材質ごとに一つの形にまとめる。
// 部品そのものは残して動かせるようにし、中の枠・引手・骨などの細かい形だけを部品の座標で結合する。
// skip に入っている物（個別に見せ隠しする札など）とその中身は触らない
export function mergeChildren(root, skip) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  const visit = (obj) => {
    for (const c of obj.children) {
      if (skip.has(c) || !c.visible || c.isLight || c.isSprite) continue;
      if (c.isMesh && !Array.isArray(c.material) && c.material.visible !== false && !c.material.transparent && !c.userData.id) {
        const key = `${c.material.uuid}|${c.castShadow ? 1 : 0}${c.receiveShadow ? 1 : 0}`;
        let g = groups.get(key);
        if (!g) groups.set(key, (g = { material: c.material, cast: c.castShadow, receive: c.receiveShadow, meshes: [] }));
        g.meshes.push(c);
      }
      visit(c);
    }
  };
  visit(root);
  let before = 0, after = 0;
  const m = new THREE.Matrix4();
  for (const g of groups.values()) {
    // 子を持つ物や一つしかない物はそのまま（中身ごと動かす必要がある・まとめても減らない）
    const list = g.meshes.filter((x) => !x.children.length);
    if (list.length < 2) continue;
    const geos = list.map((x) => {
      const geo = x.geometry.index ? x.geometry.toNonIndexed() : x.geometry.clone();
      for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      if (!geo.attributes.normal) geo.computeVertexNormals();
      geo.applyMatrix4(m.multiplyMatrices(inv, x.matrixWorld));
      return geo;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    if (!merged) continue;
    for (const x of list) x.parent.remove(x);
    const mesh = new THREE.Mesh(merged, g.material);
    mesh.castShadow = g.cast;
    mesh.receiveShadow = g.receive;
    root.add(mesh);
    before += list.length;
    after++;
  }
  return { before, after };
}
