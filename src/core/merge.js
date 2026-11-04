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
