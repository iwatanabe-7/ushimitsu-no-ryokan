// 手燭と女将の影のバランス値（設計書の GameBalance に相当）。意図は docs/GDD.md 2.14
// コードに数値を直書きせず、ここを直して手触りを調整する
export const BALANCE = Object.freeze({
  // 手燭
  // 手元の灯り。設計書の初期値 2.4 では、ほかの灯り（影なし）に負けて女将の影が見えなかったので上げた
  CandleIntensity: 6.0,
  CandleDistance: 5.0, // 光と影が届く距離（m）
  CandleColor: 0xffa858, // 自分の灯りだと分かる色
  // 壁に近づいたときのまぶしさ対策：壁までの距離がこれより近いと、手燭を (距離 ÷ これ)² 倍に弱める（m）
  CandleNearFull: 1.2,
  CandleNearMin: 0.02, // 壁に密着したときの最小の倍率（壁の明るさが、1.2m 先の壁のおよそ2倍までに収まる）
  CandleOffsetRight: 0.2, // 持つ位置（m、カメラから）
  CandleOffsetDown: 0.3,
  CandleOffsetForward: 0.38,
  CandleFlicker: 0.08, // 炎の揺れ
  CandleWalkSway: 0.03, // 歩いたときの揺れ（m）
  // 吹き消す：口元へ持ち上げ → 息で炎が倒れて消える → 細い煙を残して手元へ戻す（秒）
  BlowLiftTime: 0.22,
  BlowOutTime: 0.25,
  BlowReturnTime: 0.35,
  // 点ける：左手の燐寸（マッチ）を寄せる → 擦る → 芯に火を移す → 燐寸を振って下げる（秒、点け始めから）
  MatchStrikeAt: 0.35,
  WickCatchAt: 0.75,
  RelightTime: 1.0, // 芯に火が点ききる（ここで点いたことになる）
  MatchAwayTime: 0.35, // そのあと燐寸を下げるまで
  SmokeTime: 1.6, // 吹き消したあとの煙が消えるまで
  // 暗がり
  DarkMoveSpeedMul: 0.65, // 火なしの暗がりの歩く速さ
  DarkAdaptStart: 0.15, // 吹き消した直後の明るさ
  DarkAdaptEnd: 0.45, // 目が慣れたあとの明るさ
  DarkAdaptTime: 2.5, // 目が慣れるまで（秒）
  // 暗がりの境目（灯りの強さ ÷ 距離²）。今いる区画に点いた灯りがなく、ほかの灯りのすぐそば（この値以上）でもなければ暗がり。
  // 設計書の初期値 0.12 では、驚かせ2のあとの廊下でも帳場・玄関の灯りで 0.22〜1.4 あり暗がりにならなかったので、区画で判定して 1.0 にした
  DarkThreshold: 1.0,
  DarkEnterDelay: 0.5, // 暗がりの出入りの切り替え待ち（秒）
  VignetteMax: 0.35, // 気配最大のときの画面のふちの暗さ
  // 気配
  KehaiRiseWalk: 6.0, // 歩いているときの溜まり方（／秒）
  KehaiRiseStill: 3.5, // 立ち止まっているとき
  KehaiRiseRead: 4.0, // 文章を読んでいるとき
  KehaiReadCap: 90, // 文章のあいだはここで止める（見つからない）
  KehaiAfterReadGrace: 1.0, // 文章を閉じてから見つからない時間（秒）
  KehaiDecay: 12, // 引き方（／秒）
  KehaiDecayDelay: 1.5, // 最後に溜まってから引き始めるまで（秒）
  KehaiStage1: 35,
  KehaiStage2: 70,
  KehaiStageHysteresis: 8, // 段階が下がるときは、ここまで手前で戻す
  KehaiLap2Mul: 1.25, // 二周目は溜まりやすい
  KehaiCaughtEase: 0.8, // 見つかるたびに溜まり方をこの倍率で下げる
  KehaiCaughtFloor: 0.6, // その下限
  // 女将の影（2026-11-17 ユーザーの判断で、途中の影と「見つかって戻される」は使わない。
  // 気配は、炎の傾き・足音・画面のふちの暗さの手がかりとしてだけ残す。true にすると元の駆け引きに戻る）
  OkamiShadowEnabled: false, // 気配の段階で、女将の影を壁際に立たせる
  CatchEnabled: false, // 気配 100 で見つかり、最後の明るい場所へ戻される
  // 立つ距離。設計書の初期値（3.0 / 1.8 / 1.0）では、手燭が低い（目より 0.3m 下）ため影が天井と奥へ逃げて見えなかった。
  // 壁際に 1.8m ほどで立つと、壁に頭と肩の影がはっきり映ったので、これに合わせた
  OkamiStage1Dist: 2.0, // 段階1で立つ距離（m）
  OkamiStage2Dist: 1.4, // 段階2で立つ距離
  OkamiMinDist: 0.9, // 近づく最短
  OkamiCreepSpeed: 0.3, // 見ていないあいだ近づく速さ（m/秒）
  OkamiFlankAfter: 2.0, // この秒数見ていなければ背後側へ回り込める
  OkamiParkDelay: 0.3, // 火を消してから床下へ戻すまで（秒）
  OkamiShadowSurfaceMax: 4.0, // 影が落ちる面までの距離の上限（m）
  OkamiLookCone: 0.6, // 「見ている」とみなす、視線からの角度（rad）
  OkamiWallReach: 1.2, // 横の壁がこの距離以内なら、壁際（OkamiWallGap）まで寄せる。影が壁に等身大で映る
  OkamiWallGap: 0.3,
  FlameLean1: 0.15, // 段階1で炎が傾く角度（rad）
  FlameLean2: 0.45, // 段階2
  FlameJitter2: 0.25, // 段階2の明るさの乱れ
  // 見つかったとき
  CaughtOkamiDist: 0.9,
  CaughtTurnTime: 0.8,
  CaughtHoldTime: 1.2,
  CaughtFadeTime: 1.0,
  CaughtRepeatMul: 0.6, // 2回目以降の演出の長さ
  SafePointLitTime: 1.0, // 明るい場所にこれだけいたら「戻る場所」として覚える（秒）
  // 影の描き直しの間引き
  CandleShadowHzIdle: 15, // 女将がいないとき
  CandleShadowHzActive: 30, // 女将がいるとき
  CandleShadowHzLow: 8, // 画質「低」で女将がいないとき
  CandleShadowMoveEps: 0.04, // これだけ動いたら描き直す（m）
  // 宿じゅうの暗がり（GDD 2.6・2.10・2.11）
  GardenLitRadius: 2.5, // 中庭の石灯籠は、このまわり（m、水平）だけ明るい場所にする
  BathCardGlowLit: 0.0, // 火を点けているときの湯の底の札の発光（湯面の照り返しで見えない）
  BathCardGlowDark: 1.4, // 火を消したときの札の発光。月明かりの中でも見つけられる強さ
  LanternScareKehai: 40, // 驚かせ2が明けたときの気配（段階1）。最初に暗がりに入るまで引かない
  ShobuHotMul: 1.5, // 驚かせ2のあと、足音が止まった菖蒲の間の襖のまわりでの溜まり方
  ShobuHotRadius: 3.0, // そのまわり（m）
  LockPenaltyKehai: 12, // 花札錠を間違えるたびに足す気配（明るさに関係なく）
  // 二周目・エンディングCの前に一つだけ灯る提灯。まぶしすぎたので下げた（2026-11-19：灯り 2.7→1.3、紙の光 1.3→0.55）。
  // これより下げると、壁の女将の影の輪郭が周りの暗さに沈んで見えにくくなる
  LoneLanternLevel: 1.3,
  LoneLanternPaper: 0.55,
  LoneLanternDistance: 9,
  GenkanCandleDim: 0.2, // 驚かせ3のあいだの手燭の明るさ（影は落とさない）
  MirrorForcedLampTime: 1.0, // 驚かせ1で、影の灯りを行灯に渡しておく時間（秒）
});
