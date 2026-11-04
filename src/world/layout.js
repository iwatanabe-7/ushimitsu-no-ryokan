// 宿の間取り（メートル）。x が東、z が南、y が上。
// 廊下は東西に延び、北側に客室（椿・菖蒲・桔梗）、南側に帳場と玄関が並ぶ。
export const WT = 0.12; // 壁厚
export const CEIL = 2.4;
export const EYE = 1.5;
export const R = 0.22; // プレイヤーの半径

export const TSUBAKI = { x0: -1.8, x1: 1.8, z0: -1.8, z1: 1.8, door: 0 };
export const SHOBU = { x0: 2.84, x1: 6.44, z0: -0.9, z1: 1.8, door: 4.64 };
export const KIKYO = { x0: 6.68, x1: 10.28, z0: -0.9, z1: 1.8, door: 8.48 };
export const CORRIDOR = { x0: -2.4, x1: 10.6, z0: 1.92, z1: 3.5, ceil: 2.3 };
export const CHOBA = { x0: -2.4, x1: 3.2, z0: 3.62, z1: 6.4, open: [-1.6, 1.6] };
export const GENKAN = { x0: 5.4, x1: 10.6, z0: 3.62, z1: 7.4, open: [6.4, 9.6], step: 5.45, doma: -0.35, door: [7.1, 8.9] };

// 6畳（3.6m × 2.7m）の畳の割り付け
export function sixMats(x0, z0) {
  return [
    [x0, x0 + 1.8, z0, z0 + 0.9],
    [x0 + 1.8, x0 + 3.6, z0, z0 + 0.9],
    [x0, x0 + 0.9, z0 + 0.9, z0 + 2.7],
    [x0 + 0.9, x0 + 1.8, z0 + 0.9, z0 + 2.7],
    [x0 + 1.8, x0 + 2.7, z0 + 0.9, z0 + 2.7],
    [x0 + 2.7, x0 + 3.6, z0 + 0.9, z0 + 2.7],
  ];
}
