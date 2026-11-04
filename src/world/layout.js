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

// ---- 増築：東の渡り廊下・中庭・大浴場・大広間、西の階段と二階
export const WATARI = { x0: 10.6, x1: 18.0, z0: 1.92, z1: 3.5, steps: [13.95, 14.75] };
export const GARDEN = { x0: 10.6, x1: 17.9, z0: -6.6, z1: 1.8, y: -0.4 };
export const DATSUI = { x0: 18.12, x1: 21.72, z0: 0.8, z1: 4.4, door: [2.2, 3.2], out: [19.4, 20.4] };
export const ROTEN = { x0: 18.0, x1: 24.5, z0: -5.5, z1: 0.68, pool: [21.3, -2.5, 2.0, 1.5] };
export const HIROMA = { x0: 10.72, x1: 17.92, z0: 3.62, z1: 10.82, ceil: 2.9, door: 14.32 };
export const STAIRS = { x0: -5.0, x1: -2.4, z0: 1.92, z1: 3.5, bottom: -2.5, top: -5.0 };
export const F2 = 2.75; // 二階の床の高さ
export const F2CORR = { x0: -6.6, x1: -5.0, z0: 1.92, z1: 9.6 };
export const MATSU = { cx: -8.07, cz: 3.92 };
export const TAKE = { cx: -8.07, cz: 7.74 };
