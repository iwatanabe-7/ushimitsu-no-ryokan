# 驚かせ4「天井の女」（案A：見上げると、いる）

> **取りやめ（2026-11-17 ユーザー決定）**。実装・確認まで済ませたが、遊んだうえでゲームから外した。`ceiling-woman.js`・ハーネス `ceiling`・`public/models/MON_001.glb` は削除、`main.js`・`balance.js`・`messages.js` の追加分も戻した。化け物の原本（`assets/monsters/MON_001/`）と読み込み部品（`src/world/monster.js`）・確認画面（`monster-lab.html`）は残してある。以下は記録。

2026-11-17 ユーザー決定。化け物は「見せない」から「実際に見せる」へ方針を変えた。捕まえて失敗させる敵ではなく、見せて怖がらせる演出。

## 目的（プレイヤー体験）
提灯が消えたあと、玄関へ向かう廊下で、目の前に黒い髪が垂れているのに気づく。見上げると、天井に白い着物の女が張り付いている。
首がぎこちなく回ってこちらを向き、次の瞬間、天井を這って闇の奥へ消える。宣伝の「天井を、見てはいけない。」の回収。

## 仕様
- 化け物: `public/models/MON_001.glb`（原本 `assets/monsters/MON_001/`、読み込みは `src/world/monster.js`）。動き idle / crawl / turn_head
- 出る条件: 一周目のみ／`state.lanternsOut`（驚かせ2のあと）／操作中で一時停止していない／廊下（zone `corridor`）の `x > CeilingSpawnMinX` に入った。1回の起動につき1回だけ
- 置き場所: 廊下の天井（`CORRIDOR.ceil` = 2.3m）、廊下の幅の中央、`x = CeilingX`（玄関の入口の真上。桔梗の間から玄関へ行くとき必ず近くを通る）。頭は東（桔梗の間の戸の側）向き。戸から出ると、すぐ目の前に頭と垂れた髪がある（2026-11-17 変更：西向きだと、見上げても体に隠れて頭が見えなかった）。天井が低いので、髪の先が目の高さより下まで垂れ、見上げなくても「何か垂れている」と分かる
- 待つ（lurk）: idle を再生。気配を `CeilingKehai` まで上げて保つ（炎が傾き、画面のふちが暗くなる＝既存の手がかり）。頭の位置から、髪のこすれる音（`CeilingRustleEvery` 秒ごと）と滴の音（`CeilingDripEvery` 秒ごと）
- 現れる（reveal）: 次のどれかで始まる
  1. 頭を見上げた（視線と頭の方向の角度 < `CeilingLookCone`、距離 < `CeilingRevealDist`、視線が `CeilingLookUpPitch` 以上上向き。天井が低く、正面を見ただけで頭が視界に入るため）
  2. 真下を通った（水平距離 < `CeilingUnderDist`）
  - turn_head を再生（顔が天井側から真下へ）。0.6 / 1.3 / 2.1 秒に関節の鳴る音。`CeilingRevealHold` 秒後に逃げる
- 逃げる（flee）: crawl を `CeilingFleeTimeScale` 倍で再生し、天井を東へ `CeilingFleeSpeed` m/秒で這う（プレイヤーの頭上を越えて渡り廊下の闇へ）。爪で引っかく音。`x > CeilingVanishX` か `CeilingFleeMax` 秒で消える。字幕 `MSG.ceilingFled`。気配を `LanternScareKehai` に戻す
- 見ずに廊下を出た（玄関・桔梗の間へ入った）: 見せずに、頭上を這い去る音だけ鳴らして消える。字幕 `MSG.ceilingPassed`
- 失敗・捕まる・戻されるはない（`CatchEnabled: false` の方針どおり）
- 二周目は出ない（案B「天井をついてくる」で別に作る）
- GLB の読み込みに失敗しても、ゲームは続く（この演出が出ないだけ）

## バランス値（`src/game/balance.js`）
| 名前 | 初期値 | 意図 |
|---|---|---|
| CeilingSpawnMinX | 5.0 | 廊下のこの x より東に入ったら出す（桔梗の間〜玄関の区間） |
| CeilingX | 7.9 | 化け物の原点の x（玄関の入口 6.4〜9.6 の真上） |
| CeilingKehai | 75 | 待つあいだの気配（段階2：炎が大きく傾く） |
| CeilingRustleEvery | 0.9 | 髪のこすれる音の間隔（秒、±30% ゆらぐ） |
| CeilingDripEvery | 1.6 | 滴の音の間隔（秒） |
| CeilingLookCone | 0.32 | 「頭を見た」とみなす視線からの角度（rad） |
| CeilingLookUpPitch | 0.12 | 見上げているとみなす視線の上向きの角度（rad） |
| CeilingRevealDist | 4.5 | 見て気づける距離（m） |
| CeilingUnderDist | 0.7 | 真下を通ったとみなす水平距離（m） |
| CeilingRevealHold | 3.0 | 首が回り始めてから逃げるまで（秒） |
| CeilingFleeSpeed | 3.2 | 逃げる速さ（m/秒） |
| CeilingFleeTimeScale | 2.8 | 逃げるときの這う動きの速さ（倍） |
| CeilingVanishX | 11.8 | ここより東で消える（渡り廊下の闇の中） |
| CeilingFleeMax | 2.6 | 逃げ始めてから消えるまでの上限（秒） |

## 文章（`messages.js`）
- `ceilingFled`: 「……天井を、何かが這っていった。」
- `ceilingPassed`: 「……頭の上を、何かが通り過ぎた気がした。」

## 完了条件（qa-tester が確かめる）
- [x] `npm run build` が通る
- [x] ハーネス `ceiling`: 驚かせ2のあとの状態で廊下（x≈9.3）に立つと化け物が現れ、気配が `CeilingKehai` になる
- [x] 頭を見上げると turn_head → 逃げる → 消える（状態 done、シーンから外れる）。字幕 ceilingFled
- [x] 見ずに玄関へ入ると、見せずに消える（字幕 ceilingPassed）
- [x] 提灯が消える前は出ない（ハーネス）／二周目は lap2 で off（コードのみ確認、ハーネス未）
- [x] ハーネス `regressions` と `playthrough` が通る（既存の流れを壊していない）
- [ ] 手動: 見上げたときに怖いか、髪が目の高さに見えるか、逃げる速さ、音の大きさ

## 担当
仕様: メイン会話（game-designer の形式）／実装: メイン会話（Web 版）／確認: ハーネス

## 実装メモ（2026-11-17）
- `src/game/ceiling-woman.js`（新規）、`main.js` は import・生成・毎フレームの update・`__inn.ceilingWoman` の4か所、`balance.js` と `messages.js` に追記
- update は「文章が出ていても動かす」「dt は演出のタイマーと同じゲーム内時間（0.25 秒まで）」。0.05 秒に切り詰めると重い端末で化け物だけスローになった
- 「頭を見た」は視線の上向き（CeilingLookUpPitch）も条件。天井が低く、正面を見ただけで頭が視界に入るため
- 化け物 MON_001 v004: 髪の骨を首にぶら下げた（首が回っても髪は垂れたまま）、idle は顔を天井側に
- GLB は起動時に読み込む（695KB）。public/models/MON_001.glb は未採用の確認用（`factory.py approve` してから `sync`）
