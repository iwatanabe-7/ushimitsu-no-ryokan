// 暗がり・気配・段階の計算。THREE も DOM も使わない（node --test でテストする）
// 仕様は docs/GDD.md 2.6〜2.8

// 暗がりかどうか。score は手燭以外の灯りの強さ（L.now ÷ max(1, 距離²) の最大）
export const isDarkScore = (score, B) => score < B.DarkThreshold;

// 境目でちらつかないよう、DarkEnterDelay 秒続いたときに切り替える。s = { dark, t }
export function stepDark(s, rawDark, dt, B) {
  if (rawDark === s.dark) {
    s.t = 0;
    return s;
  }
  s.t += dt;
  if (s.t >= B.DarkEnterDelay) {
    s.dark = rawDark;
    s.t = 0;
  }
  return s;
}

// 溜まり方の倍率：二周目は 1.25 倍、見つかるたびに 0.8 倍（下限 0.6 倍）。input.mul は場所の倍率（菖蒲の間のまわりなど）
export function kehaiMul(input, B) {
  const ease = Math.max(B.KehaiCaughtFloor, B.KehaiCaughtEase ** (input.caughtCount || 0));
  return (input.lap2 ? B.KehaiLap2Mul : 1) * ease * (input.mul ?? 1);
}

// 気配を dt 秒進める。s = { k, sinceRise, grace }
// input = { dark, lit, awake, moving, reading, modal, lap2, caughtCount, mul }
export function stepKehai(s, input, dt, B) {
  const rising = input.dark && input.lit && input.awake;
  const busy = input.reading || input.modal;
  if (rising) {
    const rate = input.reading ? B.KehaiRiseRead : input.moving ? B.KehaiRiseWalk : B.KehaiRiseStill;
    s.k = Math.min(100, s.k + rate * kehaiMul(input, B) * dt);
    s.sinceRise = 0;
  } else if (input.modal) {
    // 花札錠などの画面のあいだは引かない（錠の罰で足した気配を、開いたまま消さない）
    s.sinceRise = 0;
  } else {
    s.sinceRise += dt;
    if (s.sinceRise > B.KehaiDecayDelay) s.k = Math.max(0, s.k - B.KehaiDecay * dt);
  }
  // 文章や画面のあいだは見つからない。閉じてからも少しのあいだ猶予を残す
  if (busy) {
    s.k = Math.min(s.k, B.KehaiReadCap);
    s.grace = B.KehaiAfterReadGrace;
  } else {
    s.grace = Math.max(0, s.grace - dt);
  }
  return s;
}

// 段階（0 静か／1 気づき／2 接近）。上がるときは 35・70、下がるときは 8 手前（27・62）を下回ってから
export function stageOf(k, prev, B) {
  const up = k >= B.KehaiStage2 ? 2 : k >= B.KehaiStage1 ? 1 : 0;
  if (up >= prev) return up;
  const h = B.KehaiStageHysteresis;
  let s = prev;
  if (s === 2 && k < B.KehaiStage2 - h) s = 1;
  if (s === 1 && k < B.KehaiStage1 - h) s = 0;
  return s;
}

// 見つかるかどうか。文章・画面のあいだと、閉じた直後の猶予中は見つからない
export const shouldCatch = (s, input) => s.k >= 100 && !input.reading && !input.modal && s.grace <= 0;
