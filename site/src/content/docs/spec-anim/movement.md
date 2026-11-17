---
title: "Movement: speeds, the per-frame step, the run drain and knockback"
sidebar:
  order: 3
---

## Purpose

A walking, running or knocked-back unit moves along a path whose points the planner gives ([path/search](../../spec-path/search/), an input
here). This page specifies how fast it moves and how far its position advances on each game frame: the path speed
that the rate code sets from the unit's tables and stats, the step that the unit's every-frame mode event takes, the
snap onto a path point, the collision walk across subtiles, the run's stamina drain, and knockback's distance, speed
and length. The modes, their events and the animation rate are [anim/timing](../timing/). Positions are 16.16
subtiles (the high word the subtile, as in [drlg/collision](../../spec-drlg/collision/)); a speed `v` is the path's `+0x7C`.

```mermaid
flowchart LR
  rate["UNIT_AnimSetRate<br/>moving or knockback branch"] --> sp["path speed v<br/>§ A"]
  plan["path points<br/>(path/search)"] --> step
  sp --> step["UnitMoveStep → PathStep<br/>once per game frame § B"]
  step --> snap["snap onto the next point"]
  snap --> coll["collision walk<br/>(the test: oracle)"]
  coll --> pos["position, point index"]
  step -->|"2: arrived or stopped"| endm["mode end<br/>anim/timing § I"]
```

## Entry points

| When | Function | Tag |
|---|---|---|
| A moving or knockback mode's rate is set | `UNIT_AnimSetRate` (the path speed) | [C] (127 584 path speeds) |
| A player starts running (or is knocked back) | — | [C] |
| A moving unit's every-frame event | — | [C] (99 241 steps) |
| A running player's frame, outside town | — | [C] (37 434 frames) |
| A knockback path is planned | — | [C] E1's point in 575 of 576 unblocked monster plans, the line test's cut by `PathLineFree`; [I] the 1 plan off E1 |
| A monster's MonStats speeds at load | — | [C] |

## Inputs

### Tables

| Anchor | Used for |
|---|---|
| `CharStats.txt:WalkVelocity`, `CharStats.txt:RunVelocity` | a player's path base and run bonus (A1, A2) |
| `CharStats.txt:RunDrain`, `Armor.txt:speed`, `ItemStatCost.txt:Stat` (stats 10, 154) | the run drain (§ D) |
| `MonStats.txt:Velocity`, `MonStats.txt:Run`, `MonStats.txt:BaseId` | a monster's path base, its walk and run animation bases (A1, A4) |
| `animdata.d2` | the `WL` and `RN` records' speeds behind the monster bases (A4) |

### Runtime state

| State | Type | Source |
|---|---|---|
| path `+0x00`/`+0x04` (`PathMove`) | 16.16 position | the planner, then § B |
| path `+0x24`, `+0x28`, `+0x9C` | point index, point count, the points | [path/search](../../spec-path/search/) |
| path `+0x6A`/`+0x6E` | i16 direction, a unit vector × 4096 | § B2 |
| path `+0x72`/`+0x76` | the step | § B1 |
| path `+0x7C` | i32 speed `v` | A1 |
| path `+0x90` | u8 knockback distance byte, decremented per subtile change | § E |
| stats 67, 96 (and 10, 154 for the drain) | as the aggregate holds them | [stats/aggregate](../../spec-stats/aggregate/) |

### Inputs and oracles

| Input | How it enters | Tag |
|---|---|---|
| The path plan (its points, the replan and the target revalidation's planner calls) | taken as given by the run; specified in [path/search](../../spec-path/search/) and [path/overview § C](../../spec-path/overview/#c-pathplan) | [C] |
| The AI's mode command and its velocity block; the catalogue speed writers (Charge, Leap Attack) | taken as given | [C] the 33 067 monster rate calls from `MonModeVelocity` reproduce with the stat 67 they carry; [I] the block's `+0x10` and Charge's `MulDiv`, not tallied |

### Constants

| Name | Value | Tag |
| --- | --- | --- |
| server step factor `k` | `0x400` | [C] |
| moving factor floor | 25 | [C] (monsters: 105 moving calls below 25) |
| FR/W bonus `k` | 150 | [C] |
| knockback path speed | `0x1000` | [C] |
| animation base `vbase` (player) | `0x65` run, `0xD5` otherwise | [C] |
| collision crossings per step | 10 | [C] |

## Algorithm

### A. Speeds

```
A1. The moving branch of UNIT_AnimSetRate (anim/timing J2):       [C] (UNIT_AnimSetRate, all of A1 but the lines marked)
      if the unit has no path: return                               ; +0x4C kept, no speed set; [I] no case
      X: i32 ← max(B_FRW + stat67, 25)                              ; the floor 25: monsters reach it (A1); [I] B_FRW = 150 s / (150 + s), anim/timing J1: no logged stat 96 above 0 separates it
      pbase: i32 ← display type 0 ? CharStats[class].WalkVelocity << 8 : MonStats[class].Velocity << 8
      +0x4C ← clamp((vbase × X) ÷ 100, 0, 0x7FFF)                   ; signed divide
      PathSetSpeed(path, (pbase × X) ÷ 100)                         ; signed; writes +0x7C and the maximum +0x84
    knockback branch: +0x4C ← vbase;  PathSetSpeed(path, 0x1000)

A2. RunVelocityStat(class, unit), from UNIT_AnimInit for a player form in mode 3 or 19:   [C] (all of A2 but the line marked)
      list ← a new stat list with flag 4 (dropped at the next mode change)
      if CharStats[class].WalkVelocity ≠ 0:                          ; [I] the 0 branch: no stock class
        SetStat(list, 67, (RunVelocity × 100) ÷ WalkVelocity − 100)  ; unsigned 64-bit divide; 50 on stock data
        link the list to the unit
```

- A1. [C] At every moving and knockback rate exit the path speed is `(pbase · max(B_FRW + stat 67, 25)) / 100` with
  CharStats `WalkVelocity << 8` (player) or MonStats `Velocity << 8` (monster), and `0x1000` in knockback (127 584 path
  speeds); each windowed step's speed equals the last such call's (131 167 steps). Walk `v` 1 536 and run 2 304 for
  every player at `X` 100 and 150.
- A1. [C] **The floor 25** is reached by monsters: 105 logged moving calls with `X` below 25 (`X` −15, −9, 5 and 8, under
  a Holy Freeze slow in session `sp-pal-slow`), each with the rate and `PathSetSpeed`'s speed equal to the floored
  product; the controls with a floor of 24, 26 or none differ in all 105. No player reaches it (least logged `X` 150);
  the one instruction serves both.
  [I] The path base has no mode argument:
  a running monster's path base is its walk `Velocity`; the RN record's speed changes only its animation rate.
  `PathSetSpeed` also sets path `+0x38 = 15` when the speed changed.
- A1. [C] **The animation base** `vbase`: a player's `0x65` in run, `0xD5` otherwise; a monster's MonStats `+0x38`
  in RN, else `+0x36` (A4): the logged rate at 33 390 monster RN calls whose `+0x38` differs from `+0x36`, and players'
  run on `0x65` (5 395) and walk on `0xD5` (938).
- A2. [C] A player's run is the walk base with the mode-scoped stat-67 list: the run's path speed 2 304 at `X` 150
  (A1). [C] The list is made at the run's start and dropped at the next `UNIT_SetMode` to
  another mode (stat 67 + 50 at 5 121 run starts, − 50 at 5 119 ends; `RunVelocity · 100 ÷ WalkVelocity − 100` = 50 for
  every class), and the wolf (26) and bear (28) keep RN and the + 50. [I] The class it reads is the unit's real class, the path base the
  display class (every class's ratio is 50, so the logs do not separate them); the vampire and fetish forms have no RN
  mode; the unsigned divide is not separated.
- A3. [C] **A monster's stat 67** starts at 75 (6 578 logged units with no mod, 338 of them at `Velocity` 0); the
  `champion` and `possessed` mods give 95 (50 and 7 units), `fast` the `Velocity` clamp (161) and the two logged
  `fanatic` units 175 (75 and the clamp only). [I] 74 logged units carry none of these values, unexplained; the mods' code is
  [monsters/stats § G](../../spec-monsters/stats/#g-the-mod-handlers-stat-effects)'s. `MonSetMode` calls
  `MonModeVelocity` when the mode command's block has a non-zero `+0x10`, which writes that value as stat 67 into the
  unit's `0x4000` list (made with flags `0x4004`, so it too drops at a mode change) and re-runs the rate. So a
  monster's run is faster than its walk only through the AI's command.

```
A4. MonStatsSpeeds, for each MonStats row i at load:              [C] (all of A4)
      b ← MonStats[i].BaseId  (out of range → i, also written back into the row's BaseId)   ; no stock row out of range
      walk: i32 ← ANIMDATA_Lookup(mode 2, type 1, class b).speed  ; the fallback record's 256 when no WL record
      if b ≠ i and Velocity(b) > 0: walk ← ((i16) Velocity(i) × walk) ÷ Velocity(b)   ; unsigned
      +0x36 ← min(walk, 0x7FFF)
      if i < 410: run ← +0x36 of row b, ÷ 2 (signed)
      else:       run ← ANIMDATA_Lookup(mode 15, type 1, class b).speed
      if b ≠ i and Run(b) > 0: run ← (Run(i) × run) ÷ Run(b)
      +0x38 ← min(run, 0x7FFF)
```

- A4. [C] Every monster moving and knockback call (124 391) uses `+0x36`/`+0x38` as A4 gives for its class, the
  `Run(i) / Run(b)` scaling of the run base below class 410 included (54 classes). [C] The `BaseId` guard as the pseudocode gives
  it, by a second read; none of the 734 stock rows is out of range.
- A4. [C] **A class with no walk record** (the classic `9A` traps, `compellingorb` and the `E9` rows) gets walk base
  256, run 128 below class 410: every row's `+0x36` and `+0x38`, read after the load in 11 sessions (734 rows each),
  equals A4; 109 rows per load have no walk record, 62 of them their own base, whose word is 256 in 682 of 682 (the
  control taking an absent record as 0 differs in all 1 199 absent-record rows). No stock row has a `BaseId` above its
  own index (0 of 734), so row `b`'s `+0x36` is computed first. [I] A row whose base came later would scale the base's
  unscaled word; no stock row reaches it.
- A5. [I] **A `Velocity`-0 classic class in S1** (a classic monster's S1–S4 take the moving branch, anim/timing J3) has
  a path when it was created with create flag bit 0, so the branch writes `+0x4C = ⌊256 · X / 100⌋` (192 at `X` 75)
  and a path speed of 0: the animation runs while the unit does not move.
- A6. [I] Charge's start sets `MulDiv(RunVelocity << 8, max(stat 67, 50) + Param1, 100)`, `Param1` 150; the run's 160 Charge steps ran at 5 760 at stat 67 100
  (`2 304 · 250 / 100`, what that reading gives), but the speed is a catalogue writer's, taken as given and not
  compared, and Charge at stat 67 ≤ 50 (P1b-15) is not met (not played in Phase 2 part 3).

### B. The per-frame step

```mermaid
flowchart TD
  p0["PathStep(unit, k = 0x400)"] --> c{"flag 0x20, points left,<br/>speed ≠ 0, target ok?"}
  c -->|no| stop["PathStop: snap to the subtile centre<br/>return 0 → UnitMoveStep 2"]
  c -->|yes| v["PathVelocityStep: step = (d · ((v · k) >> 6)) >> 12"]
  v --> z{"step ≠ 0?"}
  z -->|no| stop
  z -->|yes| mv["PathStepMove: snap, collision walk,<br/>point index + 1 on a reached point"]
  mv --> sp["PathSetPoint; aim at the next point"]
  sp --> left{"points left?"}
  left -->|yes| one["return 1 → UnitMoveStep 1"]
  left -->|no| stop
```

```
B1. PathStep(unit, k):                                            [C] (all of B1)
      p ← unit.path;  p.flags &= ~8
      if p.flags & 0x20 and p.nPoints > 0 and p.speed ≠ 0
         and (p.flags & 0x40000 or PathStepTargetCheck(p)) and p.iPoint < p.nPoints:
        if k ≤ 0: k ← 0x400                                        ; the server passes 0x400 (B1 below)
        s: i32 ← (p.speed × k) >> 6                                ; = 16 v on the server
        p.stepX ← (p.dirX × s) >> 12;  p.stepY ← (p.dirY × s) >> 12 ; imul, sar: signed 32-bit
        if p.stepX ≠ 0 or p.stepY ≠ 0:
          (x, y) ← PathStepMove(p)                                 ; B3, B4
          PathSetPoint(p, x, y)
          if p.type ≠ 4 and p.iPoint < p.nPoints: PathAimNextPoint(p, 1; 1)   ; [I] the two words, path/overview H1
          if p.iPoint < p.nPoints: return 1
      PathStop(p);  return 0                                       ; UnitMoveStep returns 2 − (ret ≠ 0)
```

- B1. [C] 99 241 consecutive path steps of the windowed units (the player always, one monster at a time) reproduce the
  next position (16.16) and point index: `(d · 16 v) >> 12` per axis, the snap, and the collision walk over the
  logged collision results (3 steps stopped by a blocked subtile, 2 102 after a replan).
- B2. [C] **The direction** `(+0x6A, +0x6E)` is a `g_PathDirTable` row, axes swapped and signed by octant; every one
  of its 128 rows has a norm² between 16 767 217 and 4096² (a second read), so a speed `v` moves `v / 16`
  subtiles per frame along an axis (`v · 2896 / 4096 / 16` on the diagonal).
- B2. [I] It points toward the next point and is set after each plan and each move; walk 0.375, run 0.5625,
  knockback 1 subtile per frame on an axis. The aim's return and its facing step are
  [path/overview § H](../../spec-path/overview/#h-the-aim-and-the-facing-step): `PathStep` calls it with `f` = 1 and `arg` = 1, so
  each move step with a point ahead aims the facing at that point, and only the client turns `+0x64` toward it (H5). [I]

- B3. [I] **The snap** (not for path type 4): with `m = max(|stepX|, |stepY|)` and the next point at its subtile
  centre (`(word << 16) + 0x8000`), when both remaining axis distances are at most `m` the step becomes exactly the
  remaining delta and the point counts as reached. So a point `d` subtiles away on an axis takes `⌈65536 d / step⌉`
  frames, the last one partial: walk 8 frames for 3 subtiles, run 6, knockback 3.
  [C] The logged segments started at a centre take `⌈rem ÷ step⌉` frames per point in 2 387 of 2 407; the 20 longer
  ones (14 monster, 6 player run) are not compared with the collision walk.
- B4. [I] After a block, a monster path with flag `0x10` re-plans and any other path ends; a reached point increments
  `+0x24`; the byte `+0x90` drops at each subtile change for path types other than 8 and 11 (`PathStep`'s, not run
  whole).
- B6. [C] **Wrap bound.** `d · s` (`s = 16 v`) fits 32 bits up to `v = 32 767` and wraps from `v = 32 768` on a
  component of +4096, turning that axis negative; a component of −4096 reaches −2³¹ exactly at `v = 32 768` and wraps
  from 32 769; the diagonal 2 896 does not wrap there; no test guards it. [I] A player reaches it from `X = 2 134`, a
  `Velocity`-15 monster from `X = 854` (derived from the rate formulas); whether a stock source does is not surveyed.


### C. Who steps

- C1. [C] `UnitMoveStep` has 11 call sites, each in a mode's every-frame function: the player's skill frame
  (move-first skills) and move frame (walk, run, town walk, knockback), and the monster's DT (while moving), S3,
  `MonAttackFrame` (two), WL, RN, KB and `MonSeqFrame`, and a missile's move (`MissileMoveCollide`,
  [skills/missiles](../../spec-skills/missiles/)) (a second tool).
  [I] So a moving unit steps once per game frame; its first step runs in the start's frame only when the every-frame event
  is queued before its type's list.

- C2. [C] Player walk and run, and monster WL and RN, end when `UnitMoveStep` returns 2: a step reaching the last
  point is followed in its frame by the mode set (player walk 657, run 3 816, monster WL 2 578, RN 249).
 [I] A walking monster's animation
  advances but does not end the mode (not tallied). `PlrModeMoveFrame` runs state 13's handler and, in run, the drain (§ D) before
  the step, and a wall-clock position history after it, which the step does not read.

### D. The run drain

```
D1. RunStaminaDrain(unit) → bool, each run frame:                 [C] (all of D1)
      if the unit's room is a town: return 1                       ; [C] 4 685 town drains
      if the unit has no inventory: return 0                        ; [I] read from the code
      q: i32 ← CharStats.RunDrain × 2
      q ← q × (Armor[body location 3].speed ÷ 10 + 1)              ; signed: speed 0, 5, 10 → × 1, 1, 2
      if stat154 ≠ 0: q ← q + (q × stat154) ÷ 100                  ; signed, toward zero
      if q < 1: q ← 1
      stat10 ← stat10 − q                                          ; stamina, 1/256 units
      if stat10 > 0: return 1
      stat10 ← 0;  return 0
```

- D2. [C] **The turn to a walk.** On 0, `PlrModeMoveFrame` restarts the move (`PlrModeStartMove`), which turns a run
  with stamina 0 into a walk, before this frame's step. Phase 2 part 3 reached it: a Sorceress turned from mode 3 to
  mode 2 81 times in five run sessions (`op-run2` to `op-run6`). The 75 turns that follow the drain's 0 in their frame
  queue the walk's `EF` in phase 3 and take the first walk step in that frame. The other 6 are not the drain's turn:
  each `EF` is queued in phase 11 by a later set in the same frame (2 sets 3 → 2 after a request, with the frame's
  drain returning 1, and 4 same-mode sets 2 → 2 after the drain's 0).

### E. Knockback

```
E1. PathPlanKnockback (path type 8):                               [C] (all of E1)
      n: i32 ← (path.+0x90 >> 1) + 1                               ; +0x90 = 5 → n 3; [I] 10 (base class 78) → n 6
      (dx, dy) ← the unit's subtile − the attacker's;  M ← max(|dx|, |dy|)
      point ← the unit's subtile + (n·dx ÷ M, n·dy ÷ M)            ; signed; unchanged when M = 0
      point ← PathLineFree(ctx.start, point)                       ; path/search A4, its last free point when blocked
      no point when it equals the start;  else the path's one point
```

- E1. [C] The plan: 575 of 576 unblocked monster plans of the 131 logs put the point where E1 gives it against the
  player attacker (378 off an axis), and the line test's cut is `PathLineFree`'s (300 of 300 kept emulated plans
  recounted, 193 cut, 142 to the start); `n = (+0x90 >> 1) + 1` holds over the 7 values met, 5 to 77.
 [I] The
  one plan off E1 is a possibly stale attacker position, not compared.
- E1. [C] **Start**, for a monster: a hit with bit `0x8` on a class whose MonStats2 `mKB` is 1 sets mode 13 (919) or a
  kill's 0 (104) in its frame, and every first knockback step has path type 8, one point and `+0x90` 5 (644).
 [I] A player: `COMBAT_GetHit` with result bit `0x8`
  commands mode 19 at the attacker; `PlrModeStartMove(19)` sets path type 8 and `+0x90 = 5`. A monster: a class without
  the KB mode takes a get-hit instead; base class 78 (`sandleaper1`) adds `0x8` to every get-hit unless frozen; the
  knockback start needs both GH and KB, sets path type 8 and `+0x90` 10 for base class 78 else 5.
- E2. [C] **Speed.** The knockback branch sets the path speed to `0x1000`, one subtile per frame on an axis (A1).

- E2. [I] **A player's length**: the path's, 3 frames for `n` 3 on an axis and 5 on the diagonal (6 and 9 for `n` 6),
  fewer when the collision walk stops it; then neutral. The run met two mode-19 starts (part 1; Phase 2 parts 2 and 3
  name player knockbacks short: part 3's three Hell sessions never met Blood Raven and logged no player knockback,
  `kb-end` 5 027 all monsters'); 12 of Blood Raven's 13 knockback results put the player in neutral in the hit's own frame.

- E3. [C] **A monster's length**: its knockback ends on its animation, in the frame its advance reaches the `GH`
  record's length at the walk-base rate `+0x36` (541 ends), however far the path got; then `MonKnockbackEnd`'s
  get-hit command.
  [C] From `+0x44 = 0` that is `max(1, ⌈L / r⌉ − 1)` calls of its every-frame event, derived from the advance and
  `UNIT_AnimAtEnd`: 717 of 717 logged knockbacks advance that many times to `MonKnockbackEnd`, all with `⌈L ÷ r⌉ ≥ 2`.


### F. The slowing states

- F1. [I] Slowing reaches movement only through stat 67 and the FR/W bonus in `X`, floored at 25: chill sets 67 (and
  68, 69) to the cold effect (a player's −50, [combat/delivery § D](../../spec-combat/delivery/#d-stun-cold-freeze-poison-burn)),
  `item_slow` and the curses through their stat lists, each re-running the rate. A mid-move change takes effect at
  once: the moving branch writes the path speed at each call and the step reads `+0x7C` every frame.

  [C] The 32 logged mid-window speed changes (cold 10, others 22) take effect at the next step; the floor 25 is not
  reached in those windows (monsters reach it in H6d's calls, A1) and the "only" is not separated.
- F1. [C] 212 slowed monster windows and 9 slowed player windows are reproduced (the step and the speed of A1).

- F2. [I] **Slows Target** sets stats 68 and 69 only (attack and default rate), capped at 50 for players, bosses,
  hirelings and a `MonTypeFlag`, else 75 or 90; it has no velocity effect. Not staged in part 1 (P1b-13); Phase 2
  part 2's session `sp-pal-slow` ran, but its record reports no outcome for it; part 3's record counts 13 player
  movement windows under a slow (`win-slow-p`) over the 131 logs, from the Slows Target belts, not a floor of 30, and
  327 for monsters.

### G. Draws

- G1. [C] None. The step, the snap, the collision walk, the speeds, the knockback planner and the run drain call no RNG
  function: a second walker from `PathStep` and `RunStaminaDrain` with `PathPlan` stopped reaches 154 functions and no
  draw; the one draw beyond is `PathPlanRandomWalk` through `PathReplan`, the next bullet's. A movement step is an event
  kind with no draw and chains on nothing.
- G1. [C] The replan and the target revalidation reach the planner, and `PathReplan`'s plans draw nothing: 836 + 889 replans (810 of the 836 stock)
  reproduce with the unit seed unchanged, all with a target unit at `PathPlan`'s entry. [path/overview § D](../../spec-path/overview/#d-the-17-types-planner-and-draws) has the draws per type, of
  which only the random walk (type 10) and type 16 make any: `PathReplan` writes neither and plans any other type as it stands, which the logged replans
  (types 5, 6, 13, 15 in both runs) don't separate. The target revalidation before the call is not compared there.

## Outputs

- [C] Per moving unit per frame: the 16.16 position and the point index; per run frame, stamina.
- [C] The mode end on arrival (2 from `UnitMoveStep`), which [anim/timing § I](../timing/#i-the-mode-machines) turns
  into the next mode in the step's frame (C2).

## Reimplementation notes

- [C] **The run is a stat, not a base.** A player's run speed comes from the walk base and a +50 stat-67 list that
  lives only while the run lasts (A2). [I] A
  monster runs at its walk path speed unless its AI command carries a velocity (A3).

- [C] **Two bases.** The path speed (`WalkVelocity` or `Velocity << 8`) moves the unit; the animation base (`vbase`)
  only paces the animation. They take the same factor `X`: 208 555 monster and 5 889 player moving calls at `X` ≠ 100
  give both from one `X`.
- [C] **The snap is exact.** A step that would pass the point lands on its subtile centre (3 277 logged point
  reaches), so frames per point are a ceiling, and the next step starts from the centre.

- [C] **The tenth crossing is unchecked.** A very fast step can pass a blocked subtile after ten free crossings (376
  emulated walks reach the 10th crossing, 69 of them across a blocked cell).

## Evidence

- Planner: [path/overview](../../spec-path/overview/), [path/search](../../spec-path/search/).
- Tables: the § Timing sections of CharStats,
  MonStats, States,
  ItemStatCost.
- Tools:. Plan: 0050.
