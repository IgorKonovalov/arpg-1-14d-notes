---
title: "Monster AI: the catalogue, one entry per AI row"
sidebar:
  order: 3
---

## Purpose

What the think function of each AI row does on an AI event: which `aip` slots it reads and what each means, its decision tree, its draws in order. There are 148 rows in `g_MonAiTable` and 18 in `g_MonAiStateRows`, and each has one entry here (`R<row>` and `S<state>`), grouped by the batches. The event around the think, its seeds and the row kinds are [the overview](../overview/); the helpers and the 18 tier AIs are [machinery](../machinery/), and a tier row's entry here is one link to its § T entry.

## Entry points

| When | Function | Tag |
|---|---|---|
| An AI event reaches the think call | its call | [C] |
| A row's `init` and `alt` | — | [C] the two tables' only `.text` operands are `MonAiEntryGet`'s; its 3 calls lie in `MonAiTargetByKind` (`+0` only) and `MonAiInit`, which reads `+8`/`+0xC` and calls `[row+4]` |

## Inputs

### Tables

| Anchor | Used for |
|---|---|
| `MonStats.txt:AI` | a class's row |
| `MonStats.txt:aip1` | `aip1..8`, per difficulty; what each slot means is per row, below |
| `MonStats.txt:Skill1`, `MonStats.txt:Sk1mode` | the skills and modes a think uses |

### Runtime state

| State | Type | Source |
|---|---|---|
| the think's context | `AiCtx`: `t`, `dist`, `melee` | [README D3](../overview/#d-the-ai-table-and-its-dispatch) |
| the AI control | `AiCtl`: `v14`, `v18`, `v1C`, the parameter list | [README § E](../overview/#e-the-ai-state-on-the-unit), [machinery § E](../machinery/#e-following) |
| the unit's seed | `U+0x20/+0x24`, every `draw#k` below unless the entry says otherwise | [machinery § F](../machinery/#f-draws-and-seeds-of-the-helpers) |

### Constants

Each entry states its own. No constant is shared across entries.

### Notation

[Machinery § Notation](../machinery/#notation) applies throughout: `U`, `G`, `T`, `d`, `t`, `dist`, `melee`, `v14`, `v18`,
`v1C`, `aip(K)`, `D100()`, `chance(K)`, `Range(n)`, `draw#k` and the helpers named there, and the mode numbers. Added here: [C] `LifePct`/`UnitLifePct`, `O` and `St3or19`, each run whole on 240 images, 0 mismatches, every control failing; [I] the rest:

| Write | Means |
|---|---|
| `LifePct`, `UnitLifePct` | `AiLifePct` and `UnitLifePct`, one map: `AiLifePct` is `push ecx; call UnitLifePct; ret`, the same value on 240 of 240 emulated images, with two calling conventions; each entry names the one its code calls |
| `rchance(K)` | `Range(100) < aip(K)`, one draw, the same test as `chance(K)` by another helper call |
| `O` | `MonsterOwner(U)` |
| `Ovr(type, param, byte)` | as machinery's; each word is stored only when non-zero, so a 0 keeps what an earlier call set this event |
| `St3or19` | `AiMonState3or19(U)`: `MonsterData+0x54` is 3 or 19 |
| `Head`, `Pop`, `Push(blk)` | `AiParamsHead`, `AiParamsPop`, `AiParamsPush` on `U`'s parameter list |
| `UseSkillK(x)` | `MonAiUseSkill(SkKmode, SkillK, x, 0, 0)`: the record's K-th skill in its K-th mode |
| `DelayE(n)` | `MonAiDelayEarlier(n)` |
| `State(n, v)` | `STATE_Set(U, n, v)` |

### How to read an entry

- [I] **`aip` meanings** are read from each think's code unless the entry says "table doc". A community source's meaning is not
  evidence and is not given above Open questions. The block is the code reading of the named finding: where it reads a
  word, the row reads that word for every record of the row, and a slot a record leaves at 0 is read as 0.
- [I] **The row's `i` line** is the table's bytes and the MonAI index, data. **The `l` line** is the row's own logged count at the
  first boundary: the sum over the three kept batches of the `ROW` lines of each batch's check file, in order
, and, for rows 10 and 44, and [README § G](../overview/#g-the-first-boundary) says what the comparison is. A count
  that is `[C]` covers the first callee, its site, its words and its seed, and nothing past that call.
- [I] **The `r` line** is the resumed comparison over the rev 4 and rev 6 logs for the row's own think (other thinks of its classes,
  the state rows, are counted under the state's entry). It is a consistency check. **Twenty entries here are under sentence H1**, on their `r` lines (`^- [RS][0-9]+r\. \[C\] Under`): R44 and S13; the ten the S1a batch raised on the rev 4 and rev 6 logs (rows 3, 4, 5, 15, 52, 63, 65, 68, 96 and state 12) and state 11's 66 fork-free decisions; and the seven raised on the 84 logs (rows 7, 26, 49, 71, 95, 114, 124). Past the first boundary, the rest here is `[C]` only on the `p` lines and the bullets that cite those batches. No row's role, symbol or reading is raised by being resumed.
- [I] **The catalogue sample is short, by name:** batches 5, 10, 11 have no row that counts. Batch 7's is row 44 (R44r) and batch 12's is state 13 (S13r), both owner-played and Normal, state 13 with H1b's three given words; neither raises another row of its batch. Batches 5 and 11 have no row outside the tier logged. Batch 10's one logged row, 130, has its first boundary compared by the S1d hand map since, and no call past the first in its 33 resumed (R130l, R130r). This census is the one of the first H1 review; the rows put under sentence H1 since are in the `r` bullet above. Of batch 12's other logged rows, row 54 cannot fail (0 of 3 sites), row 99 has no call past the first, row 32 has a fork in all 199 decisions of the rev 4 logs, row 100 has 4 decisions.

- [C] **Emulated maps** are named per entry. Each runs the think on a declared image up to its first observed callee and covers that code's map and no callee, and no store or command after it.

## Algorithm

### Batch 0: the machinery rows

#### R0. Row 0 `None`

```
ret 4                                                                       [I]
```

Stub: no behaviour of its own; no MonStats record names it, and a class whose `AI` is outside 0..147 gets it.

- R0i. [C] As data: kind 0, no `init`, no `alt`; 0 records; reach none; `aip` set —; `aidel` —; skills —.
- R0l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R1. Row 1 `Idle`

```
if U has a room: Idle(200)                                                  [I]
```

No draw; no `aip` read by this think, although records set slot 1.
- R1p. [C] **Logged paths of the block** (the logged-path model): 86 decisions, 82 fork-free, 0 mismatches. One arm met, failing alone: `has-room` true. [I] The untaken arm of each one-arm branch; the no-room arm (never met); `<` against `≤` but at the equal pairs met (none); what the model does not compare.

- R1i. [C] As data: kind 0, no `init`, no `alt`; 61 records (61 records, as the index lists them); reach S; `aip` set 1; `aidel` 0,15/0,14,15/0,13,15; skills Jab, Baal Taunt.
- R1r. [I] Past the first boundary, a consistency check only: 4 of its own think's decisions in the rev 4 and rev 6 logs, 4 resumed, 0 mismatches, 0 stopped, 0 later calls matched, an unknown value deciding 0 of 0 later steps. The row is not under sentence H1.

#### S0. State row 0 (zero row)

Zero row: the state word 0 selects the class's row instead. No think here. [C] `MonAiEntryGet`, 240 emulated cases: a state ≠ 0 takes the state row (179), 0 the class's row by MonStats `+0x1E` (25), row 0 when that index is outside `[0, 0x94)` (36); both controls fail

- S0i. [C] As data: kind 0, no `init`, no `alt`.

#### S1. State row 1

- S1i. [C] As data: kind 0, no `init`, no `alt`.

### Batch 1: pool-A (acts I and II)

#### R2. Row 2 `Skeleton`

Tier AI: [machinery § T2](../machinery/), not repeated here.

#### R3. Row 3 `Zombie`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | chance to run at the target once nearer than `aip(2)` |
| `aip(2)` | the distance below which that draw is made |
| `aip(4)` | A1 against A2 in melee range |

```
1. if melee: SetModeAtUnit(chance(4) ? 4 : 5, t); return     ; draw#1      [I]
2. if not St3or19:
     if not (dist < aip(2) and chance(1)):                   ; draw#1, only when dist < aip(2)
       if RoomGetLevelId(UnitGetRoom(U)) ≠ 17: Ring(3); return
3. Ovr(0, 100, 0);  RunToUnit(t)
```

- R3a. [C] The run at `t` (override parameter 100) when nearer than `aip(2)` and drawn below `aip(1)` (12 decisions), else `Ring(3)` (119). [I] So a zombie runs at its target (override parameter 100) when `MonsterData+0x54` is 3 or 19, when it is nearer than `aip(2)` and draws below `aip(1)`, or anywhere in level 17 (Levels `Id` 17); otherwise it wanders to a ring point of radius 3.
- R3b. [C] The map to its first callee, family `zombie`, 240 cases, 4 boundaries; the `≤` and Normal-column controls fail the 26 and 50 that separate them. It ends at `UnitGetRoom` on the level branch; the level test is a reading.
- R3p. [C] **Logged paths of the block** (the S1b model): 136 decisions, all fork-free, 0 mismatches, 381 calls past the first. Step 1's two draws; step 2 with `St3or19` 0, both arms of `dist < aip(2)` and of `chance(1)`, the level test's ≠ 17 arm (levels 4, 36, 37) to `Ring(3)`; step 3's override and run. [I] The `St3or19` arm and level 17.

- R3i. [C] As data: kind 1, no `init`, no `alt`; 5 records (5-9 zombie1..zombie5); reach PU; `aip` set 1,2,4; `aidel` 15/14/13; skills —.
- R3l. [C] First boundary: 352 decisions compared (216 + 136), 0 mismatches, 4 first-call outcomes.
- R3r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 136 decisions (rev 4), all fork-free, 381 calls past the first, 4 of 4 two-way sites failing alone.

#### R4. Row 4 `Bighead`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | life percent at or above which it fights, below which it keeps away |
| `aip(2)` | keeping away: chance of a `T56` walk against an `Idle(10)` |
| `aip(3)` | fighting: chance of A2 at a target within 15 with a hostile found |
| `aip(4)` | keeping away: chance of A2 with a hostile found |

```
1. if not melee and St3or19: SetModeAtUnit(5, t); return                   [I]
2. life ← LifePct(U)
3. if life ≥ aip(1):
     if melee: SetModeAtUnit(4, t); return
     if dist < 15 and FindHostile(&dist, &m) and Range(100) < aip(3):      ; draw#1
       SetModeAtUnit(5, t); return
     Walk(t, 7); return
4. if dist < 3:
     Ovr(0, 50, 0)
     if not StepAway(t, 5, 1): SetModeAtUnit(5, t)
     return
5. if dist > 15: WalkStop(t, 6); return
6. if FindHostile(&dist, &m) and Range(100) < aip(4):                      ; draw#1
     SetModeAtUnit(5, t); return
7. if Range(100) < aip(2): T56(t, 3, 0)                                    ; draw#1, or #2 after step 6's
   else: Idle(10)
```

- R4a. [I] The A2 command is aimed at `t` even when the hostile `FindHostile` (search kind 6) found is another unit. The `dist` tests after a `FindHostile` read the distance from `ctx`, taken before the call. Below `aip(1)` percent life the bighead keeps 3–15 from its target.
- R4b. [C] The map up to `AiLifePct` or the `MonsterData+0x54` shortcut only: family `bighead`, 240 cases, two boundaries, no draw before them and no `aip` read, so no draw control separates it.
- R4p. [C] **Logged paths of the block** (the S1b model): 353 decisions, all fork-free, 0 mismatches, 740 calls past the first. Step 1's A2; step 3's A1 and its walks after `FindHostile` (no draw below `aip(3)` met) and beyond 15; step 5's `WalkStop(t, 6)`; step 6's A2 (1). [I] Step 3's drawn A2, step 4, step 6's other arms, step 7.

- R4i. [C] As data: kind 1, no `init`, no `alt`; 10 records (10-14 bighead1..bighead5, 580-584 bighead6..bighead10); reach PU; `aip` set 1,2,3,4; `aidel` 15/14/13; skills —.
- R4l. [C] First boundary: 913 decisions compared (560 + 342 + 11), 0 mismatches, 2 first-call outcomes.
- R4r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 353 decisions (342 rev 4, 11 rev 6), all fork-free, 740 calls past the first, 7 of 7 two-way sites failing alone.

#### R5. Row 5 `BloodHawk`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | out of melee range: chance of the swoop |
| `aip(2)` | farther than 3: chance of the ring-4 retreat with override −50, else ring 3 |
| `aip(3)` | in melee range: chance of A1 |
| `aip(4)` | the override parameter of the step away |
| `aip(5)` | the swoop's override parameter (100 in every record, as data) |

```
1. if v14 = 1 and melee: v14 ← 0;  SetModeAtUnit(4, t); return             [I]
2. v14 ← 0
3. if not melee:
     if chance(1):                         ; draw#1
       Ovr(0, aip(5), dist);  v14 ← 1;  Walk(t, 0); return
     if dist > 3:
       if chance(2):                       ; draw#2
         Ovr(0, −50, 0);  Ring(4); return
       Ovr(0, 0, 0);  Ring(3); return
   else if chance(3):                      ; draw#1
     SetModeAtUnit(4, t); return
4. Ovr(0, aip(4), 0)
   if not StepAway(t, 4, 1): SetModeAtUnit(4, t)
```

- R5a. [C] `v14 ← 1` before the swoop's `Walk(t, 0)` with `Ovr(0, aip(5), dist)` (65 decisions), and the A1 at once at the next event in melee range with `v14` 1 (21). [I] `v14` is the swoop flag: set after an approach walk with override parameter `aip(5)` and the override byte `dist` (capped at 77 by `MonAiPathOverride`); the next event in melee range attacks at once. `Ovr(0, 0, 0)` before `Ring(3)` stores nothing.
- R5b. [C] The map, `AiCtl+0x14` at the boundary included: family `bloodhawk`, 240 cases, 6 boundaries; the controls fail the 34 and 106 that separate them.
- R5p. [C] **Logged paths of the block** (the S1b model): 271 decisions, all fork-free, 0 mismatches, 251 calls past the first. Step 1 (21); the swoop, the ring-4 retreat and ring 3 beyond 3; step 4's override and step away, accepted or refused with A1; the three draws met at equality 5 times. [I] Out of melee range within 3, and `chance(3)`'s A1.

- R5i. [C] As data: kind 1, no `init`, no `alt`; 8 records (15-18 foulcrow1..foulcrow4, 590-593 foulcrow5..foulcrow8); reach P; `aip` set 1,2,3,4,5; `aidel` 15/14,15/13,15; skills —.
- R5l. [C] First boundary: 399 decisions compared (128 + 271), 0 mismatches, 5 first-call outcomes. 1 not comparable (the log's window).
- R5r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 271 of 272 decisions resumed (1 stopped), all fork-free, 251 calls past the first, 6 of 6 two-way sites failing alone.

#### R6. Row 6 `Fallen`

Tier AI: [machinery § T6](../machinery/), not repeated here.

#### R7. Row 7 `Brute`

| Slot | Meaning (code reading) |
|---|---|
| `aip(3)` | in melee range: chance to attack; on a miss, a second draw on the same slot for a `T56` walk |
| `aip(4)` | A1 against A2 |

```
1. if not melee:                                                           [I]
     p ← clamp(UnitLifePct(U), 40, 100)
     Ovr(0, 100 − p, 0);  Walk13(t, 7); return
2. if chance(3):                                ; draw#1
     SetModeAtUnit(chance(4) ? 4 : 5, t); return ; draw#2
3. if chance(3): T56(t, 4, 0); return           ; draw#2, aip(3) again
4. Idle(15)
```

- R7a. [C] At full life the override parameter is 0, compared at the override call (life 100 % in all 106 such decisions). [I] Out of melee range the override parameter is `100 − life%` with life clamped to 40..100: 60 at 40 % and below, and at full life 0, which stores nothing.
- R7b. [C] The melee map; out of melee range up to `UnitLifePct`: family `brute`, 240 cases, 5 boundaries; the controls fail the 29 and 37 that separate them.
- R7p. [C] **Logged paths of the block** (the logged-path model): 131 decisions, 131 fork-free, 0 mismatches. Both arms met, each failing alone: `1.melee`, `2.chance(3)`, `2.chance(4)`; one arm met, failing alone: `3.chance(3)` true, `1.p.v<40` false. [I] The untaken arm of each one-arm branch; `1.p.100<v` (separates nothing); `<` against `≤` but at the equal pairs met (`1.p.100<v`); what the model does not compare.

- R7i. [C] As data: kind 1, no `init`, no `alt`; 9 records (24-28 brute2..brute1, 446-449 snowyeti1..snowyeti4); reach PU; `aip` set 3,4; `aidel` 15/14/13; skills —.
- R7l. [C] First boundary: 37 decisions compared (23 + 8 + 6), 0 mismatches, 5 first-call outcomes.
- R7r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 131 decisions of its own think in the 84 logs, all resumed, all fork-free, 212 calls past the first in 106 of them, 3 of 3 two-way sites failing alone.

#### R8. Row 8 `SandRaider`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | life percent below which it looks for an ally |
| `aip(2)` | farther than 4 and unarmed: chance of a `T56` walk |
| `aip(3)` | in melee range: chance of an attack |
| `aip(4)` | out of melee range, unarmed: chance to walk at `t` |
| `aip(5)` | the event count at which it arms |
| `aip(6)` | 1: state 90 and overlay 150; otherwise state 91 and overlay 46 (`sandraider2`, 4, 7, 9 have 1, the six others 0, as data) |
| `aip(7)` | A1 when `Range(100) ≥ aip(7)`, else A2 (50 in every record, as data), inverted against the other rows |

```
1. if v14 = 0: State(90, 0);  State(91, 0);  v18 ← 0                       [I]
2. v14 ← v14 + 1;  n: i32 ← v14
3. if n = aip(5):
     UnitSetOverlayStat(U, aip(6) = 1 ? 150 : 46, 0);  Idle(aidel[d] + 1); return
4. if n > aip(5):
     State(aip(6) = 1 ? 90 : 91, 1);  v18 ← 1                  ; armed
5. if v1C < 7 and LifePct(U) < aip(1):
     best ← {0, 0x7FFFFFFF};  AiUnitSearch(G, U, &best, AiNearAllyCb, 1)
     if best.unit: Walk(best.unit, 0); return
     v1C ← v1C + 1
6. if dist > 4 and v18 = 0 and chance(2):                      ; draw#1
     T56(t, 0, 0); return
7. if not melee:
     if v18 ≠ 0 or chance(4): Walk(t, 0); return               ; draw#1 or #2, none when armed
     goto wait
8. if v18 = 1 and Skill1 ≥ 0:
     UseSkill1(t);  v14 ← 0;  v18 ← 0; return                  ; Fire Hit
9. if chance(3):
     SetModeAtUnit(Range(100) ≥ aip(7) ? 4 : 5, t); return
wait:
10. k ← max(24 − aip(5), 6)
    if v14 > aip(5) + k: v14 ← 0;  v18 ← 0
11. Idle(15)
```

- R8a. [C] The count (`set v14+=1` fails all 211 alone), the overlay and wait at `n = aip(5)` (2 decisions), the armed `Skill1` in melee range (1). [I] The count's restart, the values by record and difficulty, the wait outside Normal, and: `v14` counts the raider's AI events since its last Fire Hit; at `aip(5)` (18 … 4 by record and difficulty, as data) it shows an overlay and waits `aidel[d] + 1` frames, past it it holds the state and is armed: the next event in melee range uses `Skill1` and starts the count again.
- R8b. [I] **The ally.** Below `aip(1)` percent life, up to 7 tries counted in `v1C`, which this function never resets, it walks to the nearest other monster of alignment 0 that is not in a death mode, by squared distance. [C] `AiNearAllyCb`: candidate ≠ searcher, type 1, `UnitAlignGet` 0, `MonIsDeathMode` 0, `UnitDistSq` below the best; search kind 1 walks the near rooms' unit lists. No draw in the walk. `UnitDistSq` is `dx² + dy²`, 32-bit signed, its wrap met in 5 of 240 emulated cases, 0 mismatches, 7 controls failing, the kind-1 search run whole in family `mephpick`. [I] The wrap is out of reach on stock maps.
- R8c. [C] `UnitSetOverlayStat(U, v, 0)` with the value of the `aip(6) ≠ 1` arm (2 decisions). [I] The other value, and which Overlay.txt rows the two are. The overlay is `UnitSetOverlayStat(unit, overlay, 0)`; the two values are rows 150 and 46 of Overlay.txt by row index, not followed further.
- R8d. [I] Not emulated: the unit search lies before its draws.
- R8p. [C] **Logged paths of the block** (the logged-path model): 211 decisions, 211 fork-free, 0 mismatches. Both arms met, each failing alone: `1.v14=0`, `3.n=aip(5)`, `4.aip(5)<n`, `6.4<dist`, `6.chance(2)`, `6.v18=0`, `7.chance(4)`, `7.melee`, `7.v18!=0`, `8.v18=1`, `9.Range<aip(7)`, `9.chance(3)`; one arm met, failing alone: `5.v1C<7`, `8.Skill1>=0` true; `10.aip(5)+k<v14`, `3.aip(6)=1`, `4.aip(6)=1`, `5.life<aip(1)` false; stores failing alone: `set v14+=1`, `set v18=1`. [I] The untaken arm of each one-arm branch; `10.24-aip(5)<6`, `set v14=0`, `set v18=0` and its second store (separate nothing); `<` against `≤` but at the equal pairs met (`6.4<dist`, `6.chance(2)`, `7.chance(4)`); what the model does not compare.

- R8i. [C] As data: kind 1, no `init`, no `alt`; 10 records (29-33 sandraider1..sandraider5, 599-603 sandraider6..sandraider10); reach PU; `aip` set 1,2,3,4,5,6,7; `aidel` 15/9,14/7,13; skills Fire Hit.
- R8l. [C] First boundary: 211 decisions of the 84 logs, 211 fork-free, compared at the first call, 0 mismatches, 0 stops there.

#### R9. Row 9 `Wraith`

Tier AI: [machinery § T9](../machinery/), not repeated here.

#### R10. Row 10 `CorruptRogue`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | out of melee range, near: chance to approach at all, else `Idle(aip(2))` |
| `aip(2)` | the idle wait |
| `aip(3)` | in melee range: chance of A1 |
| `aip(4)` | the run's override parameter (100 in every record, as data) |
| `aip(5)` | near: chance of the run against a walk |

```
1. MonPlayerBonus(G, &pb, UnitGetRoom(U), U)                  ; for pb.difficulty, min(d, 2)   [I]
2. if dist > 20 − 3·pb.difficulty:
     Ovr(13, aip(4), 0);  RunStop(t, 3); return
3. if melee:
     if chance(3): SetModeAtUnit(4, t); return                ; draw#1
     Idle(aip(2)); return
4. if not chance(1): Idle(aip(2)); return                     ; draw#1
5. if chance(5):                                              ; draw#2
     Ovr(13, aip(4), 0);  RunStop(t, 3); return
6. Walk(t, 7)
```

- R10a. [C] Beyond 20 in Normal the run (`2.20-3pb<dist` both ways, 10 equal pairs). [I] Beyond 20, 17 or 14 (Normal, Nightmare, Hell) the rogue runs in mode 15, type 13, stop distance 3. `MonPlayerBonus` is called for its difficulty word only (`[ebp−0x18]`). `corruptrogue3`'s `CountessFirewall` is not used by this function.
- R10b. [I] Not emulated: `MonPlayerBonus` and the room lie before its first draw.
- R10p. [C] **Logged paths of the block** (the logged-path model): 302 decisions, 302 fork-free, 0 mismatches. Both arms met, each failing alone: `2.20-3pb<dist`, `3.chance(3)`, `3.melee`, `4.chance(1)`, `5.chance(5)`. [I] The untaken arm of each one-arm branch; `pb.difficulty` is an input, not compared, and all 302 decisions are Normal, so the Nightmare and Hell bounds; `<` against `≤` but at the equal pairs met (`2.20-3pb<dist`, `3.chance(3)`, `5.chance(5)`); what the model does not compare.

- R10i. [C] As data: kind 1, no `init`, no `alt`; 6 records (43-47 corruptrogue1..corruptrogue5, 721 corruptrogue6); reach PU; `aip` set 1,2,3,4,5; `aidel` 15/14/13; skills CountessFirewall.
- R10r. [C] This think, by the logged-path model with the rev 7 `MonPlayerBonus` word: 302 decisions, all fork-free, 0 mismatches, each arm the block names reached, in Normal only: melee A1 and melee idle, near idle, near run and walk, and the far run, each test failing alone both ways (`tour-1` has no Nightmare or Hell decision of the row).

#### R11. Row 11 `Baboon`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | life percent below which it may flee, only when `St3or19` |
| `aip(2)` | after an attack, on a failed `aip(3)` draw: chance of a `T56` walk |
| `aip(3)` | after an attack: chance to attack again |
| `aip(4)` | A1 against A2 (`baboon1` has 0, the others 15–50, as data, so `baboon1` draws A2) |
| `aip(5)` | the factor of the regeneration raise while fleeing |

```
1. life ← UnitLifePct(U)                                                   [I]
2. bonus: i32 ← 0
   if Velocity ≥ 1:
     q ← Run·100 ÷ Velocity             ; MonStats +0x32, +0x34, signed
     if q ≥ 100: bonus ← min(q − 100, 120)
3. if v14 = 0:
     if not melee: Walk13(t, 7); return
     if St3or19:
       if life < aip(1) and Range(100) < 50:                  ; draw#1
         v14 ← Range(5) + 2                                   ; draw#2: 2..6 events of flight
         s ← STATS_GetUnitStat(U, 74, 0)
         v1C ← s ≠ 0 ? (aip(5)·s) ÷ 8 : 0
         if s ≠ 0: UnitSetStat(U, 74, s + v1C, 0)
         Ovr(2, bonus, 0);  StepAway(t, 15, 0); return
       if v18 ≠ 0 and Range(100) < 20:
         T56(t, 3, 0);  v18 ← 0; return
     if v18 ≠ 0 and not chance(3):
       if Range(100) < aip(2): T56(t, 3, 0);  v18 ← 0
       Idle(15); return
     v18 ← 1;  SetModeAtUnit(chance(4) ? 4 : 5, t); return
4. v14 ← v14 − 1;  v18 ← 0                                    ; in flight
5. if v14 = 0 or life > 75: UnitSetStat(U, 74, STATS_GetUnitStat(U, 74, 0) − v1C, 0)
6. if not melee:
     if life > 75:
       v14 ← 0;  Ovr(13, bonus, 0);  Walk13(t, 7); return
   else if D100() < 33:
     SetModeAtUnit(chance(4) ? 4 : 5, t); return
7. if dist > 23 and not St3or19:
     if Range(100) < 33: T56(t, 4, 0)
     Idle(20); return
8. Ovr(2, bonus, 0)
   if not StepAway(t, 15, 1):
     if not melee: Ring(5); return
     SetModeAtUnit(Range(100) < aip(4) ? 4 : 5, t)
```

- R11a. [I] **The flight:** stat 74 (`hpregen`) is raised by `aip(5)·s ÷ 8`, a signed 32-bit product divided toward zero (`(x + (x >> 31 & 7)) >> 3`), and taken back when the count ends or life passes 75 %. The product wraps only for `|s| > 715 827 882` with the stock `aip(5)` ≤ 3. The bonus is `Run·100 ÷ Velocity − 100`, 0..120, and 0 for a `Velocity` below 1 or `Run < Velocity`. `v18` marks "attacked last time".
- R11b. [I] Not emulated: `UnitLifePct` comes first.
- R11p. [C] **Logged paths of the block** (the logged-path model): 93 decisions, 93 fork-free, 0 mismatches. Both arms met, each failing alone: `3.chance(4)`, `3.melee`; one arm met, failing alone: `3.v14=0` true, `3.v18!=0#2` false; stores failing alone: `set v18=1`. [I] The untaken arm of each one-arm branch; `3.St3or19` (separates nothing); `<` against `≤` but at the equal pairs met (none); what the model does not compare.

- R11i. [C] As data: kind 1, no `init`, no `alt`; 8 records (48-52 baboon1..baboon5, 295 baboon6, 665-666 baboon7..baboon8); reach P; `aip` set 1,2,3,4,5; `aidel` 15/14/13; skills —.
- R11l. [C] First boundary: 17 decisions compared at `UnitLifePct(U)`, 0 mismatches, one outcome, hand map; the site control fails 17.

#### R12. Row 12 `Goatman`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | out of melee range: chance to walk at `t` |
| `aip(2)` | the idle wait |
| `aip(3)` | in melee range: chance of A1 |

```
1. if not melee:                                                           [C]
     if chance(1): Walk(t, 7); return    ; draw#1
   else if chance(3):                    ; draw#1
     SetModeAtUnit(4, t); return         ; A1 only
2. Idle(aip(2))
```

- R12a. [C] No A2 draw: the melee miss's exit seed (31 decisions). [I] Row 2's shape with no A2 draw, and its own code: `aip(4)` is not read.
- R12b. [C] The map, family `goatman`, 240 cases, 3 boundaries; the controls fail the 40 and 138 that separate them.
- R12p. [C] **Logged paths of the block** (the S1b model): 603 decisions, all fork-free, 0 mismatches, one call each; every arm taken (walk 350, idle 108, A1 114, idle 31), every branch failing alone, both draws met at equality (`le` fails 5).

- R12i. [C] As data: kind 1, no `init`, no `alt`; 10 records (53-57 goatman1..goatman5, 585-589 goatman6..goatman10); reach P; `aip` set 1,2,3; `aidel` 15/14/13; skills —.
- R12l. [C] First boundary: 930 decisions compared (327 + 375 + 228), 0 mismatches, 3 first-call outcomes. Outside it: 210 decisions of the row's classes with no model (another think, a state row, or a case the model refuses).
- R12r. [I] Past the first boundary, a consistency check only: 603 of its own think's decisions in the rev 4 and rev 6 logs, 603 resumed, 0 mismatches, 0 stopped, 0 later calls matched, an unknown value deciding 0 of 0 later steps. The row is not under sentence H1.

#### R13. Row 13 `FallenShaman`

Tier AI: [machinery § T13](../machinery/), not repeated here.

#### R14. Row 14 `QuillRat`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | the distance below which it shoots or steps away |
| `aip(2)` | within `aip(1)`: chance of A2 against the step |
| `aip(4)` | the step's length, and the ring's radius at 3 or more |

```
1. rec ← Head                                                              [I]
   if rec ≠ 0:
     if GameFindUnit(G, rec+0x0C, rec+0x10) ≠ 0:
       SetModeAtUnit(5, t);  Pop; return
     Pop
2. if melee: SetModeAtUnit(4, t); return
3. if St3or19: SetModeAtUnit(5, t); return
4. if dist < aip(1):
     if chance(2): SetModeAtUnit(5, t); return                ; draw#1
     if StepAway(t, aip(4) & 0xFF, 1): return
     if dist < 4: SetModeAtUnit(5, t); return
5. Ring(aip(4) < 3 ? 3 : aip(4) & 0xFF)                       ; signed word compare
```

- R14a. [I] A head record whose unit is found makes it shoot once and drop the record; the record's kind is not tested. The ring argument is the target pointer's stack slot with its low byte replaced (`mov byte [ebp+8]`), so its upper 24 bits are the target's, and `MonAiWanderRing` uses `r & 0xFF`.
- R14b. [C] The map, the ring argument's upper bits included: family `quillrat`, 240 cases, 6 boundaries; the controls fail the 5 and 44 that separate them.
- R14p. [C] **Logged paths of the block** (the logged-path model): 77 decisions, 77 fork-free, 0 mismatches. Both arms met, each failing alone: `2.melee`, `4.chance(2)`, `4.dist<aip(1)`, `4.stepped`; one arm met, failing alone: `5.aip(4)<3` true; `1.rec`, `3.St3or19`, `4.dist<4` false. [I] The untaken arm of each one-arm branch; `<` against `≤` but at the equal pairs met (`4.chance(2)`, `4.dist<aip(1)`); what the model does not compare.

- R14i. [C] As data: kind 1, no `init`, no `alt`; 8 records (63-67 quillrat1..quillrat5, 605-607 quillrat6..quillrat8); reach PU; `aip` set 1,2,4; `aidel` 15/12,14/9,13; skills —.
- R14l. [C] First boundary: 25 decisions compared (25), 0 mismatches, 4 first-call outcomes.

#### R15. Row 15 `SandMaggot`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | under the lay count: chance to walk or lay |
| `aip(2)` | with a hostile nearer than 15: chance of A2 at it |
| `aip(3)` | the lifetime lay count (2, or 3–4 in Nightmare and Hell for `sandmaggot6`, 7, as data) |
| `aip(4)` | in melee range: chance of A1 |
| `aip(5)` | the frames of cooldown after coming up or going down |

```
1. h ← FindHostile(&hd, 0);  ph ← v14                  ; ph: 1 up, 2 laying, 3 down   [I]
2. if ph = 3 and v18 < G.frame and Skill1 ≥ 0:
     UseSkill1(t);  DelayE(25);  v18 ← G.frame + aip(5);  v14 ← 1; return  ; MagottUp
3. if ph = 3: DelayE(20); return
4. if LifePct(U) < 25 and Skill2 ≥ 0 and hd < 7 and v18 < G.frame and Range(100) < 20:
     UseSkill2(t);  DelayE(30);  v18 ← G.frame + aip(5);  v14 ← 3; return  ; MagottDown
5. if melee and chance(4): SetModeAtUnit(4, t); return
6. if h ≠ 0 and hd < 15 and Range(100) < aip(2): SetModeAtUnit(5, h); return
7. if D100() < 20: T56(t, 6, 0); return
8. if v1C < aip(3) and Range(100) < aip(1):
     if ph ≠ 2 or Skill3 < 0:
       T56(t, 6, 0);  v14 ← 2; return
     v1C ← v1C + 1;  v14 ← 1;  UseSkill3(t);  DelayE(20); return           ; MagottLay
9. DelayE(12)
```

The alt, [I]:

```
rec ← AiCtlParamGet(kind 14)                           ; finds or makes it
if rec+0x18 = 1 and Skill1 ≥ 0:
  UseSkill1(UNIT_GetTargetUnit(G, U));  delay 30;  rec+0x18 ← 0
else:
  MonAiInit(ctl, ctl.state)                            ; clears +0x14, +0x18, frees the records, installs the think
  restore v1C;  delay 1
```

- R15a. [C] The A2 aimed at `h`, not `t` (2 of 14 with `h ≠ t`), and `hd` the word `FindHostile` writes, `0x7FFFFFFF` with no hostile (1). [I] The row is kind 4, so `t` is set; the function's branches for `t = 0` (a burrow with `Skill2` at no target when the hostile is absent or beyond 10) are not reached from the row. `hd` is the distance `FindHostile` returns, `0x7FFFFFFF` with no hostile. The A2 shot is aimed at `h`, not `t`. The AI event is re-queued by `DelayE` after each skill and wait.
- R15b. [C] `MonAiInit`'s alt step calls row 15's alt, which tests `AiCtlParamGet(14, 0)` and its `+0x18 = 1`. [I] The alt runs when `MonAiInit` is called for a maggot whose think is already the row's. The kind-14 record is made with `+0x18 = 0`; no writer of it was found, so its skill branch has no writer: Open questions.
- R15c. [I] Not emulated: `MonAiFindHostile` comes first.
- R15p. [C] **Logged paths of the block** (the S1b model, the think): 107 decisions, all fork-free, 0 mismatches, 167 calls past the first. Steps 1 and 5 to 8 on their taken arms (A2 at `h`, 2 with `h ≠ t`; the lay; the walks with `v14 ← 2`). [I] Steps 2 to 4 (`ph` 3 and life below 25 not met), and every `DelayE` (is not a boundary).

- R15i. [C] As data: kind 4, no `init`, `alt`; 7 records (68-72 sandmaggot1..sandmaggot5, 679 sandmaggot6, 716 sandmaggot7); reach P; `aip` set 1,2,3,4,5; `aidel` 15/14/13; skills MagottUp, MagottDown, MagottLay.
- R15l. [C] First boundary: 177 of the 181 decisions compared (70 + 62 + 45), the think's at `FindHostile(…, 0)`, 0 mismatches, one outcome, hand map. [I] The alt's 4 each fork on the kind-14 record's `+0x18`, which no log holds.
- R15r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): its think only: 107 decisions (62 and 45), all fork-free, 167 calls past the first, 9 of 9 two-way sites failing alone.

#### R16. Row 16 `ClawViper`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | in charge range: chance of the charge |
| `aip(2)` | the charge's range |
| `aip(3)` | in melee range: chance of an attack |
| `aip(4)` | A1 against A2 |
| `aip(5)` | the idle wait |
| `aip(6)` | 0 no state, 2 state 91, else state 90 |

```
1. if v14 ≠ 0 and aip(6) ≠ 0: State(aip(6) = 2 ? 91 : 90, 0)               [I]
2. if melee:
     if not chance(3): Idle(aip(5)); return                   ; draw#1
     SetModeAtUnit(chance(4) ? 4 : 5, t); return              ; draw#2
3. if Skill1 ≥ 0 and dist < aip(2) and chance(1) and MonSkillTargetOk(Skill1, t, t.x, t.y):  ; draw#1
     UseSkill1(t)                                             ; SerpentCharge
     if aip(6) ≠ 0: State(aip(6) = 2 ? 91 : 90, 1)
     v14 ← 1; return
4. if D100() < 50: Walk(t, 7)                                 ; draw#1 or #2
   else: Idle(aip(5))
```

- R16a. [I] `v14` is set at the first charge and never cleared here, so from then on every event clears the state it set (when `aip(6) ≠ 0`). `t.x, t.y` are the target's subtile position.
- R16b. [C] The map, family `viper`, 240 cases, 7 boundaries; the controls fail the 18 and 87 that separate them.

- R16i. [C] As data: kind 1, no `init`, no `alt`; 5 records (73-77 clawviper1..clawviper5); reach PU; `aip` set 1,2,3,4,5,6; `aidel` 15/14/13; skills SerpentCharge.
- R16l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R142. Row 142 `ClawViperEx`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)`, `aip(2)`, `aip(5)`, `aip(6)` | as row 16 (`aip(6)` is 0 in `clawviper8`, 2 in `clawviper10`, 1 in the others, as data) |
| `aip(3)` | in melee range: chance of A2 |
| `aip(4)` | within `aip(7)`: chance of the A1 test |
| `aip(7)` | the A1 range (18–28, as data) |
| `aip(8)` | the frames of A1's cooldown (50, as data) |

```
1. if v14 ≠ 0 and aip(6) ≠ 0: State(aip(6) = 2 ? 91 : 90, 0)               [I]
2. if melee:
     if chance(3): SetModeAtUnit(5, t); return                ; draw#1
     Idle(aip(5)); return
3. if dist < aip(7) and chance(4):                            ; draw#1
     if v18 < G.frame:
       SetModeAtUnit(4, t);  v18 ← G.frame + aip(8); return
     Idle(aip(5)); return
4. if Skill1 ≥ 0 and dist < aip(2) and chance(1) and MonSkillTargetOk(Skill1, t, t.x, t.y):
     UseSkill1(t)                                             ; Charge
     if aip(6) ≠ 0: State(aip(6) = 2 ? 91 : 90, 1)
     v14 ← 1; return
5. if D100() < 50: Walk(t, 7)
   else: Idle(aip(5))
```

- R142a. [C] Within `aip(7)`, A1 gated by `v18 < T` (both ways, 4 equal pairs at `aip(7)`) and `v18 ← T + aip(8)`. [I] Unlike row 16, in melee range it uses A2 only; within `aip(7)` it uses A1 at most once per `aip(8)` frames. Steps 4 and 5 are the row-16 charge and approach.
- R142b. [C] The map up to the A1 command: family `viperex`, 240 cases, 8 boundaries; the controls fail the 28 and 114 that separate them. The `+0x18` store after it is a reading only.
- R142p. [C] **Logged paths of the block** (the logged-path model): 131 decisions, 131 fork-free, 0 mismatches. Both arms met, each failing alone: `1.aip(6)=2`, `1.v14!=0`, `2.chance(3)`, `2.melee`, `3.chance(4)`, `3.dist<aip(7)`, `3.v18<T`, `4.aip(6)=2`, `4.chance(1)`, `4.dist<aip(2)`, `5.D100<50`; one arm met, failing alone: `1.aip(6)!=0`, `4.Skill1>=0`, `4.aip(6)!=0`, `4.targetok` true; stores failing alone: `set v14=1`, `set v18=T + aip(8)`. [I] The untaken arm of each one-arm branch; `<` against `≤` but at the equal pairs met (`3.chance(4)`, `3.dist<aip(7)`); what the model does not compare.

- R142i. [C] As data: kind 1, no `init`, no `alt`; 5 records (594-598 clawviper6..clawviper10); reach P; `aip` set 1,2,3,4,5,6,7,8; `aidel` 15/14/13; skills Charge.
- R142l. [C] First boundary: 131 decisions of the 84 logs, 131 fork-free, compared at the first call, 0 mismatches, 0 stops there.

### Batch 2: pool-B (acts II and III)

#### R17. Row 17 `SandLeaper`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | below 5: chance of the leap (20–25 by difficulty, as data) |
| `aip(2)` | in melee range: chance of A2 |
| `aip(3)` | within 10, out of melee range: chance to walk at `t` |
| `aip(4)` | then: chance of a `T56` walk |

```
1. if Skill1 ≥ 0 and dist < 5 and chance(1) and MonSkillTargetOk(Skill1, t, 0, 0):   [I]
     UseSkill1(t); return                        ; draw#1 only when the two tests before it pass; Leap
2. if not melee:
     if dist > 10: Ovr(0, 75, 0);  WanderNear(t, 5); return       ; no draw
     if chance(3): Walk(t, 7); return            ; draw#1 or #2
     if chance(4): T56(t, 4, 0); return
   else if chance(2): SetModeAtUnit(5, t); return
3. Idle(10)
```

- R17a. [I] In melee range it only ever uses A2.
- R17b. [C] The map, family `leaper`, 240 cases, 6 boundaries; the `≤` and Normal-column controls fail the 17 and 45 that separate them.
- R17p. [C] **Logged paths of the block** (the logged-path model): 145 decisions, 145 fork-free, 0 mismatches. Both arms met, each failing alone: `1.chance(1)`, `1.dist<5`, `1.targetok`, `2.10<dist`, `2.chance(2)`, `2.chance(3)`, `2.chance(4)`, `2.melee`; one arm met, failing alone: `1.Skill1>=0` true. [I] The untaken arm of each one-arm branch; `<` against `≤` but at the equal pairs met (`1.dist<5`, `2.10<dist`); what the model does not compare.

- R17i. [C] As data: kind 1, no `init`, no `alt`; 7 records (78-82 sandleaper1..sandleaper5, 629-630 sandleaper6..sandleaper7); reach P; `aip` set 1,2,3,4; `aidel` 15/14/13; skills Leap.
- R17l. [C] First boundary: 145 decisions of the 84 logs, 145 fork-free, compared at the first call, 0 mismatches, 0 stops there.

#### R18. Row 18 `PantherWoman`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | out of melee range: chance of the fast approach |
| `aip(2)` | in melee range: chance of A1 |
| `aip(3)` | the distance to its nearest packmate past which it rejoins (8–24, as data) |
| `aip(4)` | the idle wait |

```
1. if melee:                                                               [I]
     if chance(2): SetModeAtUnit(4, t); return   ; draw#1
     Idle(aip(4)); return
2. if chance(1):                                 ; draw#1
     Ovr(0, 75, 0);  Walk13(t, 7); return
3. s ← {unit 0, best 0x7FFFFFFF};  AiUnitSearch(G, U, &s, AiSameBaseNearCb, 1)
4. if s.unit ≠ 0 and aip(3)·aip(3) < s.best:
     Ovr(0, 75, 0);  Walk(s.unit, 7); return
5. if D100() < 25: T56(t, 3, 0)                  ; draw#2
   else: Idle(aip(4))
```

- R18a. [C] The callback takes a monster (`Unit+0x00` = 1) other than the searcher with the searcher's `MonBaseId`, not in a death mode, and keeps the nearest by `UnitDistSq` (`AiSameBaseNearCb`, 240 emulated cases, 0 mismatches, 7 controls failing). [I] The search block is a stack block `{+0x00 unit, +0x04 best}` at `EBP − 0x2C`. Step 5's flag is 0: `push ebx`, with `ebx` zeroed by `xor ebx, ebx` in the inline step's `adc`, so the walk goes to `MonAiMove` with flags 0.
- R18b. [C] The map up to the search, the block's two words included: family `panther`, 240 cases, 4 boundaries; the controls fail the 26 and 99 that separate them.
- R18p. [C] **Logged paths of the block** (the logged-path model): 47 decisions, 47 fork-free, 0 mismatches. Both arms met, each failing alone: `1.chance(2)`, `1.melee`, `2.chance(1)`, `4.aip(3)^2<best`, `5.D100<25`; one arm met, failing alone: `4.unit` true. [I] The untaken arm of each one-arm branch; `<` against `≤` but at the equal pairs met (`1.chance(2)`); what the model does not compare.

- R18i. [C] As data: kind 1, no `init`, no `alt`; 6 records (83-86 pantherwoman1..pantherwoman4, 627-628 pantherwoman5..pantherwoman6); reach PU; `aip` set 1,2,3,4,5; `aidel` 15/13,14/12,13; skills —.
- R18l. [C] First boundary: 47 decisions of the 84 logs, 47 fork-free, compared at the first call, 0 mismatches, 0 stops there.

#### R19. Row 19 `Swarm`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | out of melee range: chance to walk at `t` |
| `aip(2)` | the idle wait (12–20, as data) |
| `aip(3)` | in melee range: chance of A1 |

```
1. if not melee:                                                           [I]
     if chance(1): Walk(t, 7); return            ; draw#1
   else if chance(3):                            ; draw#1
     SetModeAtUnit(4, t); return
2. Idle(aip(2))
```

- R19a. [C] The map, family `swarm`, 240 cases, 3 boundaries; the controls fail the 34 and 120 that separate them.
- R19p. [C] **Logged paths of the block** (the S1b model): 122 decisions, all fork-free, 0 mismatches, one call each; every arm taken (walk 60, idle 50, A1 6, idle 6), every branch failing alone. [I] The draws' `<` against `≤` (no equal pair).

- R19i. [C] As data: kind 1, no `init`, no `alt`; 5 records (87-90 swarm1..swarm4, 715 swarm5); reach P; `aip` set 1,2,3; `aidel` 15/14/13; skills Swarm Move.
- R19l. [C] First boundary: 193 decisions compared (71 + 82 + 40), 0 mismatches, 3 first-call outcomes.
- R19r. [I] Past the first boundary, a consistency check only: 122 of its own think's decisions in the rev 4 and rev 6 logs, 122 resumed, 0 mismatches, 0 stopped, 0 later calls matched, an unknown value deciding 0 of 0 later steps. The row is not under sentence H1.

#### R20. Row 20 `Scarab`

Tier AI: [machinery § T20](../machinery/), not repeated here.

#### R21. Row 21 `Mummy`

Tier AI: [machinery § T21](../machinery/), not repeated here.

#### R22. Row 22 `GreaterMummy`

Tier AI: [machinery § T22](../machinery/), not repeated here.

#### R23. Row 23 `Vulture`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | on the ground, in melee range: chance of A1 |
| `aip(2)` | the wait, by `Delay` |
| `aip(3)` | the percent of life at or below which a near unit makes it land |
| `aip(4)` | on the ground: chance of a `T56` walk against `Toward(t, 9, 0)` |
| `aip(5)` | on the ground: chance to move at all; skipped in the event after a landing |

`fly ← v14`: above 0 airborne events left, 0 on the ground, −1 just landed.

```
1. fly ← v14;  far ← UnitDistSq(U, t) > 144                                [I]
2. if RoomOf(t) ≠ RoomOf(U) and far:
     if fly < 1: Toward(t, 9, 0); return
     if AiVultureLand(U):
       MoveToUnitDist(U, 9, 2, 3);  Delay(12);  v14 ← −1; return    ; the unit itself as the target
3. if fly = 0 and MonsterOwner(U) = 0 and far and Range(100) < 60:   ; take off
     AiVultureTakeOff(U);  v14 ← 24 + Pow2(8);  MoveToUnitDist(t, 8, 8, 8);  Delay(12); return
4. s ← {unit 0, bound 121, pct aip(3)};  AiUnitSearch(G, U, &s, AiWoundedNearCb, 1)
5. if fly ≥ 2:
     if s.unit ≠ 0 or (dist < 6 and Range(100) < 15):
       v14 ← 1;  goto land
     AiVultureTakeOff(U)
     if v18 = 0 or v1C = 0 or AiPathDistToPoint(U, v18, v1C) < 2:    ; a new circling point
       c ← fly + 8
       x ← tx − c + RangeB(2c);  y ← ty − c + RangeB(2c)
       r ← clamp(2c, 12, 36)
       while AiPathDistToPoint(U, x, y) < r:
         step x and y one away from U's position; if at it, both + 1
       v18 ← x;  v1C ← y;  Ovr(1, 0, 0);  MoveToPoint(x, y, 8);  Delay(12);  v14 ← v14 − 1; return
     FreeNearFallback(room of t, then of U, (v18, v1C), size, 0xFFFF, 1) → (v18, v1C) when found
     v14 ← v14 − 1;  Ovr(7, 0, 0);  MoveToPoint(v18, v1C, 8);  Delay(12); return
6. if fly = 1:
   land:
     if AiVultureLand(U):
       MoveToUnitDist(t, 9, 2, 3);  Delay(12);  v14 ← −1; return
     v14 ← 8;  Delay(12)                                             ; no room to land: fly 8 more
7. if melee:
     if chance(1): SetModeAtUnit(4, t); return
     Delay(aip(2)); return
8. if fly ≠ −1 and Range(100) ≥ aip(5): Delay(aip(2)); return
9. if Range(100) < aip(4): T56(t, 6, 0)
   else: Toward(t, 9, 0)
10. v14 ← 0;  Delay(12)
```

- R23a. [I] `v14` is the flight counter. A vulture with no owner, more than 12 subtiles from its target (squared 144), takes off on 60 % of events for 24–31 airborne events, circles points drawn around the target (`RNG_RangeB` twice, a square of half-side `fly + 8`) at least `clamp(2(fly + 8), 12, 36)` from itself, and lands when the counter reaches 1, when the callback finds a unit, or within 6 on 15 %. `v18` and `v1C` hold the circling point. Modes 8 and 9 are the move commands' modes here.
- R23b. [C] **The callback** `AiWoundedNearCb`: a monster or player other than itself, not in a death mode by `MonIsDeathMode` (0 for every player), `UnitDistSq` ≤ the block's bound, stat 6 ≤ `UnitGetMaxHp ÷ 100 ·` the block's percent, keeping the nearest, ties replacing (`≤`): 240 emulated cases, 0 mismatches, 8 controls failing, 16 players and 34 monsters taken. [I] The bound 121 and the percent `aip(3)` are the think's initial block words.
- R23c. [C] Row 23 is kind 1, and kind 1 stops the event when `MonAiTargetOrIdle` returns 0: the think tests `t` for null, and the block leaves those arms out: the row is kind 1, whose think runs only with a target. Not emulated: the first callee is `UnitDistSq` and the next two `UnitGetRoom`, before any draw.

- R23i. [C] As data: kind 1, no `init`, no `alt`; 5 records (110-113 vulture1..vulture4, 608 vulture5); reach P; `aip` set 1,2,3,4,5; `aidel` 15/13,14/11,13; skills —.
- R23l. [C] First boundary: 1 062 decisions (375 + 431 + 256) compared at `UnitDistSq`, 0 mismatches, one outcome, hand map (the S1b model's first call); the site control fails 1 062.
- R23r. [I] Past the first boundary, a consistency check only: 687 of its own think's decisions in the rev 4 and rev 6 logs, 679 resumed, 8 mismatches, 0 stopped, 4284 later calls matched, an unknown value deciding 179 of 4284 later steps. The row is not under sentence H1.

#### R24. Row 24 `Mosquito`

| Slot | Meaning (code reading) |
|---|---|
| `aip(3)` | in melee range: chance to keep attacking |
| `aip(4)` | chance of the skill against A1 |
| `aip(5)` | ring points of the retreat, less one (5 in every record, as data) |

```
1. if melee:                                                               [I]
     if chance(3) or v18 = 0:                 ; draw#1, always taken
       v18 ← v18 + 1
       if Skill1 ≥ 0 and chance(4): UseSkill1(t); return    ; the drain
       SetModeAtUnit(4, t); return
     if D100() > 20: Idle(15); return         ; draw#2
     v14 ← 2;  v18 ← 0
2. switch v14:
     0: Ovr(13, 100, 0);  Walk(t, 0)
     1: Ovr(0, 50, 0);  Ring(4);  v18 ← v18 + 1;  if v18 > aip(5): v14 ← 0;  v18 ← 0
     2: Ovr(2, 100, 0);  StepAway(t, 10, 1);  v14 ← 1;  v18 ← 0
     else: v14 ← 0;  v18 ← 0;  Idle(10)
```

- R24a. [I] An attack-and-retreat cycle: `v18` counts the attacks of a melee bout, the first free of the `aip(3)` test; a failed `aip(3)` draw then 21 % of the time starts the retreat, then `aip(5)` + 1 ring points, then the approach under override type 13.
- R24b. [C] The map, `AiCtl+0x14/+0x18` at the boundary included: family `mosquito`, 240 cases, 7 boundaries; the controls fail the 16 and 26 that separate them.

- R24i. [C] As data: kind 1, no `init`, no `alt`; 4 records (114-117 mosquito1..mosquito4); reach P; `aip` set 3,4,5; `aidel` 15/14/13; skills Mosquito.
- R24l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R25. Row 25 `WillOWisp`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | in the plain states: chance of S1, or of the cast out of melee range |
| `aip(2)` | in melee range: chance of A1 |
| `aip(3)` | chance to walk at `t` against a ring point |

`v14` is the state below: 0–3 plain, 4 the gather, 5 and 6–12 the dance. `v1C` is the gather cooldown frame outside the dance and the wisp's place in it.

```
gather trigger, at entry:                                                  [I]
  if t ≠ 0 and v1C < G.frame and UnitDistSq(U, t) < 1024 and v14 < 4 and Range(1000) ≤ d + 2: v14 ← 4   ; the draw only past the three tests

state 4:                                                                   [I]
  a room unit search of radius 32 around U (RoomUnitSearchInit, flags 0x583; AiWispCb)
  exactly 4 found: each gets v14 ← 6, v18 ← 0, v1C ← its index 1..4 (AiCtlSetVar), Idle(337 − G.frame mod 337)
  exactly 5 found: v14 ← 5 and indices 1..5, the same idle
  then U itself idles to the same frame; return
  any other count: v14 ← 2;  Idle(8); return

the dance, v14 = 5 (five wisps) or v14 ≥ 6 (four wisps):                   [I]
1. if v1C > 5 (v14 = 5) or v1C > 4 (v14 ≥ 6): v14 ← 2;  Idle(8); return     ; v1C still a cooldown frame
2. e ← v1C when v14 = 5, else v1C + 4·v14
   point ← t's subtile position + A[e]                        ; both dances; A5 for v14 = 5
3. if AiPathDistToPoint(U, point) > 3 (unsigned):
     if Range(100) < 34: Ring(4)
     else: MoveToPointNoStop(point.x, point.y, 2)
     return
4. if G.frame mod 67 ≠ 0: Idle(67 − G.frame mod 67); return
5. if v18 < 3:
     if B[e] = (0, 0):                                        ; B5 for v14 = 5; see The tables, below
       v18 ← v18 + 1;  v14 = 5: Idle(337 − G.frame mod 337), else Idle(67)
     else:
       MonAiSetMode(7, t's subtile x + B[e].x, t's subtile y + B[e].y);  v18 ← v18 + 1
     return
6. v14 = 5: v14 ← 2;  v1C ← G.frame + 1800;  Idle(337 − G.frame mod 337); return     ; no grant
7. v14 ≥ 6: v14 ← v14 + 1;  v18 ← 0
     if v14 > 12: v14 ← 2;  v1C ← G.frame + 1800
     Idle(337 − G.frame mod 337)
     the grant

the grant:                                                                 [I]
  if t ≠ 0, t is a player (t+0x00 = 0) and not UnitIsDead(t):
    l ← STATLIST_Alloc(flags 2, end G.frame + 1 728 000, t's type and id);  if l = 0: nothing more
    stat 80 ← 50·(d + 1) on l;  StatListSetEnd(l, end)
    UnitQueueEvent(t, 12, end, 0, 0);  STATLIST_LinkToUnit(t, l, 1)

state 1 (after an approach):                                               [I]
1. if v18 ≤ 0:
     if melee: SetModeAtUnit(8, 0);  v14 ← 3; return
     if chance(1): SetModeAtUnit(8, 0);  v14 ← 2; return     ; a failed draw falls through to step 2
2. v18 ← v18 − 1;  v14 ← 1                                   ; may go below 0
   if Range(100) < aip(3): Walk(t, 0)
   else: Ring(6)

states 0, 2, 3:                                                            [I]
1. if not melee and (v14 = 2 or chance(1)): SetModeAtUnit(7, t);  v14 ← 0; return    ; SC, Chain Lightning by Skill1's mode
2. if melee and (v14 = 3 or chance(2)): SetModeAtUnit(4, t);  v14 ← 0; return        ; the draw only when v14 is not the state named
3. v14 ← 1
   if Range(100) < aip(3): Walk(t, 0)
   else: Ring(4)
   v18 ← 3
```

- R25a. [I] The trigger's `Range(1000) ≤ d + 2` is 3, 4 or 5 in 1000. `AiWispCb`: a monster not in a death mode whose `MonBaseId` is 118, `willowisp1`'s row. Both dances' origin is the target's subtile position.

| Table | Base | Index | Rows | Given here |
| --- | --- | --- | --- | --- |
| `A` | `EBP−0x2F4` | `v1C + 4·v14`, 25..52 | 28 `(x, y)` | listed below |
| `B` | `EBP−0x214` | as `A` | 28 `(x, y)` | listed below |
| `A5` | `EBP−0x38` | `v1C`, 1..5 | 5 `(x, y)` | listed below |
| `B5` | `EBP−0x64` | `v1C`, 1..5 | 5 `(x, y)` | by rule below |

`A5[1..5]` = (−5, −5), (3, −5), (6, 3), (3, 6), (−5, 3).

[C] As an equality on the image, `B5[p] = A5[((p + 1) mod 5) + 1]`. [I] So each of the five wisps aims two places on around the ring of `A5`'s points.

No rule is known for `A` or `B`, and the forms searched give neither, so they are listed. `place` is `v1C`, 1 to 4.

```
A[v14, place], (x, y) of places 1 to 4; index v1C + 4·v14:
 6: (-10, -3) (1, -5) (6, 0) (4, 10)
 7: (-9, -2) (-6, -11) (-2, -5) (6, 1)
 8: (0, 13) (-12, 0) (7, 5) (-3, -11)
 9: (-15, -3) (-6, -3) (-4, -5) (-6, -13)
10: (-12, -2) (-6, 2) (-5, 5) (1, 11)
11: (-13, -6) (-8, -11) (-7, 0) (1, 8)
12: (-5, -8) (-8, 1) (1, -6) (6, 9)
```

```
B[v14, place], (x, y) of places 1 to 4; index v1C + 4·v14:
 6: (1, -5) (6, 0) (4, 10) (-10, -3)
 7: (1, 8) (-9, -2) (-5, 4) (1, 8)
 8: (-12, 0) (7, 5) (-3, -11) (11, -2)
 9: (7, 9) (-15, -3) (-6, -13) (9, 7)
10: (-5, -7) (-5, -7) (9, 0) (-12, -2)
11: (-8, -11) (-2, -6) (-2, -6) (-13, -6)
12: (-8, 1) (1, -6) (6, 9) (0, 0)
```

[C] `A5`, `A` and `B`, each element as written, equal the image's stores, i32, and the docs gate's survey compares these listings with the image.

[C] Step 5's `B[e]` is `(0, 0)` at `v14` = 12, place 4 only (entry 52), and `B5` has no `(0, 0)`, from the image stores. [I] That wisp's three shots there are the `v18`-only arm, and that arm with `v14` = 5 is reached by no value of the image.

- R25b. [I] Each of the four wisps grants on each of its seven advances: the end-of-dance reset is skipped over, not the grant.
- R25c. [I] The block is read from the code. **Event 12:** at the end frame `EVENT_TimedListExpire` frees the list, by [stats/states C1](../../spec-stats/states/#c-expiry-and-removal); the grant carries no state, so C2 has no part; death may free it first (C3). Each of a dance's grants has its own list and its own event. **The tables:** the think holds them on the stack at each entry and none depends on an input, so a reimplementation may hold them as constants. Not emulated: `UnitDistSq` comes first on most events and the room search in state 4.
- R25p. [C] **Logged paths of the block** (the logged-path model): 193 decisions, 193 fork-free, 0 mismatches. Gather trigger: `0.dsq<1024` both arms, each failing alone; one arm met, failing alone: `0.d+2<Range(1000)`, `0.t`, `0.v14<4`, `0.v1C<T` true. State 1: `s1.1.0<v18`, `s1.1.chance(1)`, `s1.1.melee`, `s1.2.Range<aip(3)`, `s1.v14=1` both arms, each failing alone; the store `set v14=2#s1` failing alone. States 0, 2, 3: `p.1.chance(1)`, `p.1.melee`, `p.1.v14=2`, `p.2.melee`, `p.2.v14=3`, `p.3.Range<aip(3)` both arms, each failing alone; `p.2.chance(2)` true only, failing alone; the stores `set v14=0#p1`, `set v14=0#p2`, `set v14=1#p` failing alone. [I] The untaken arm of each one-arm branch; `set v14=1#s1` (separates nothing); `<` against `≤` but at the equal pairs met (`s1.1.0<v18`, `s1.1.chance(1)`, `s1.2.Range<aip(3)`, `p.1.chance(1)`, `p.3.Range<aip(3)`); what the model does not compare.

- R25i. [C] As data: kind 1, no `init`, no `alt`; 8 records (118-121 willowisp1..willowisp4, 639-641 willowisp5..willowisp7, 733 willowisp8); reach PU; `aip` set 1,2,3; `aidel` 15/14/13; skills Chain Lightning.
- R25l. [C] First boundary: 193 decisions of the 84 logs, 193 fork-free, compared at the first call, 0 mismatches, 0 stops there.
- R25m. [C] Reach, as data, since R25l's zero is the batches' coverage and says nothing of reach: class 118 is in the spawn columns of levels 77, 86, 87 and 90 (`mon`, `nmon`, `umon`), class 120 in level 105 and as one superunique's class, classes 639 to 641 in levels 114, 119, 129 and 131 (`nmon` only); classes 119, 121 and 733 are in none. Each of those levels has `NumMon` 3, so a listed class is in a level's pool only when the pick of [monsters/pool § C](../../spec-monsters/pool/) takes it.

#### R26. Row 26 `Arach`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | in melee range: chance of A1; while retreating, `aip(1) − 25` is the attack chance |
| `aip(2)` | life at or above `aip(5)`: chance of a `T56` walk |
| `aip(3)` | retreat over: chance to approach; cycle's approach draw |
| `aip(4)` | while retreating: the distance at or past which it stops |
| `aip(5)` | life percent below which it lays (25–45, as data) |

```
1. life ← UnitLifePct(U)                                                   [I]
2. if v14 = 1:                                       ; retreating after a lay
     v18 ← 0
     if life > 75:
       v14 ← 0
       if chance(3): v14 ← 2;  Walk13(t, 0); return
       T56(t, 6, 0); return
     if melee and aip(1) > 25 and Range(100) < aip(1) − 25: SetModeAtUnit(4, t); return
     if dist ≥ aip(4) and not St3or19: v14 ← 0;  T56(t, 12, 0); return
     StepAway(t, 4, 0); return
3. if not melee:
     if St3or19 or v18 = 1: v18 ← 1;  Walk13(t, 0); return
     v1C ← v1C + 1;  if v1C > 20: v1C ← 0
     v18 ← 0
     if v1C = 1 and Range(100) < aip(3): v18 ← 1;  Walk13(t, 0); return
     if Range(100) < 20: Ring(6); return
     Idle(15); return
4. v14 ← 2
5. if chance(1): SetModeAtUnit(4, t); return         ; draw#1
6. if life ≥ aip(5):
     if Range(100) < aip(2): T56(t, 4, 0); return
     Idle(15); return
7. v14 ← 1
8. if Skill1 ≥ 0 and not UNIT_HasState(U, 22): MonAiUseSkill(Sk1mode, Skill1, 0, 0, 0); return  ; SpiderLay, no target
9. StepAway(t, 8, 0)
```

- R26a. [C] `v1C` counts the events out of melee range and gives the approach draw at `v1C = 1` (30 decisions, 8 at 1). [I] Below `aip(5)` percent life a spider in melee range lays (state 22 `spiderlay` not yet set) and retreats until above 75 % life; `v1C` is a 21-event cycle that gives one approach draw per cycle out of melee range.
- R26b. [I] Not emulated: `UnitLifePct` is the first callee.
- R26p. [C] **Logged paths of the block** (the S1b model): 46 decisions, all fork-free, 0 mismatches, 91 calls past the first. Step 3's arms out of melee range (the `v18 = 1` walk, the `v1C` count with the approach at 1, `Ring(6)`, `Idle(15)`) and one melee decision's `v14 ← 2`, no A1, `Idle(15)`. [I] Step 2 (`v14` never 1), the wrap past 20, `St3or19`, step 5's A1, step 6's walk, steps 7 to 9; step 3's `v18 ← 0` and `v18 ← 1` stores (they separate nothing).

- R26i. [C] As data: kind 1, no `init`, no `alt`; 7 records (122-126 arach1..arach5, 685 arach6, 717 arach7); reach PU; `aip` set 1,2,3,4,5; `aidel` 15/14/13; skills SpiderLay.
- R26l. [C] First boundary: 119 decisions (73 + 28 + 18) compared at `UnitLifePct(U)`, 0 mismatches, one outcome, hand map; the site control fails 119.
- R26r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 75 decisions of its own think in the 84 logs, all resumed, all fork-free, 145 calls past the first in 75 of them, 7 of 7 two-way sites failing alone.

#### R27. Row 27 `ThornHulk`

| Slot | Meaning (code reading) |
|---|---|
| `aip(1)` | in melee range: chance to attack at all |
| `aip(2)` | a plain attack: A2 against A1 |
| `aip(3)` | on a failed `aip(1)`: chance of a `T56` walk |
| `aip(4)` | chance to start a frenzy bout |
| `aip(5)` | the frames added to the mode's first event as a delay |
| `aip(6)` | the bout's repeat count (3–5; 5 in `thornhulk5`, as data) |

```
1. if not melee: v14 ← 0;  Walk13(t, 7); return                            [I]
2. if v14 < 1:
     if not chance(1):                               ; draw#1
       if Range(100) < aip(3): T56(t, 4, 0); return
       Idle(15); return
     if v18 < 1 and Range(100) < aip(4):             ; draw#2, only when v18 < 1
       MonAiUseSkill(5, Skill1, t, 0, 0)             ; MonFrenzy, in mode A2
       f ← UnitEventFirstFrame(G, U, 1)
       if G.frame < f: Delay(aip(5) − G.frame + f)
       v14 ← aip(6); return
     v18 ← v18 − 1
     SetModeAtUnit(Range(100) < aip(2) ? 5 : 4, t); return
3. MonAiUseSkill(5, Skill1, t, 0, 0)
4. f ← UnitEventFirstFrame(G, U, 1)
   if G.frame < f: Delay(aip(5) − G.frame + f)
5. v14 ← v14 − 1;  if v14 < 1: v18 ← 3
```

- R27a. [I] The think's null test of `t` is not in the block: the row is kind 1, whose think runs only with a target. A frenzy bout: once started the hulk repeats the skill for `aip(6)` events, then `v18` = 3 makes the next three melee decisions plain attacks. The skill is always used in mode 5, not `Sk1mode`. `v18` keeps decreasing below 0 on further plain attacks.
- R27b. [C] The map up to the first callee: family `thornhulk`, 240 cases, 7 boundaries; the controls fail the 28 and 42 that separate them. The `Delay` and the stores after the skill are readings.

- R27i. [C] As data: kind 1, no `init`, no `alt`; 5 records (127-130 thornhulk1..thornhulk4, 609 thornhulk5); reach PU; `aip` set 1,2,3,4,5,6; `aidel` 15/13,14/12,13; skills MonFrenzy.
- R27l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R28. Row 28 `Vampire`

Tier AI: [machinery § T28](../machinery/), not repeated here.

#### R29. Row 29 `BatDemon`

Tier AI: [machinery § T29](../machinery/), not repeated here.

#### R30. Row 30 `Fetish`

Tier AI: [machinery § T30](../machinery/), not repeated here.

### Batch 3: pool-C (ranged, maggots, the Zakarum, nests)

#### R33. Row 33 `HellMeteor`

**`aip`:** 1 chance to cast; 2 the idle wait; 3 half the side of the square around itself (10, as data).

```
1. if Skill1 ≥ 0 and chance(1):                 ; draw#1                   [I]
     x ← U.x + RangeB(2·aip(3)) − aip(3)        ; draw#2
     y ← U.y + RangeB(2·aip(3)) − aip(3)        ; draw#3
     MonAiUseSkill(Sk1mode, Skill1, 0, x, y); return
2. Idle(aip(2))
```

- R33a. [I] The point runs from `−aip(3)` to `aip(3) − 1` off itself on each axis, with no target unit. The x getter runs before the first `RangeB` and the y getter between the two. Widths: `aip(3)` i16, `2·aip(3)` and the sums 32-bit, the position u16 zero-extended, so nothing wraps.
- R33b. [C] The map, family `meteor`, 240 cases, 157 with a draw, 2 boundaries; the `≤` and Normal-column controls fail the 16 and 151 that separate them.

- R33i. [C] As data: kind 1, no `init`, no `alt`; 1 records (153 hellmeteor); reach ·; `aip` set 1,2,3; `aidel` 15/15/15; skills HellMeteor.
- R33l. [C] First boundary: 56 decisions compared (56), 0 mismatches, 2 first-call outcomes.

#### R35. Row 35 `CorruptArcher`

Tier AI: [machinery § T35](../machinery/), not repeated here.

#### R36. Row 36 `CorruptLancer`

**`aip`:** 1 out of melee range: chance to approach; 2 melee: chance to attack, skipped after a charge; 3 the idle wait; 4 chance to run against a walk (0 in Normal in every record, as data, so a lancer never runs to its target in Normal); 5 the charge distance; 6 chance of `Skill1`; 7 of `Skill2`; 8 of `Skill3`. `cr_lancer1..5` have no skills and `aip(6)`, `aip(7)` 0; `cr_lancer6..8` have `Jab` and a second skill and set them, as data.

```
1. if dist > aip(5):                                                       [I]
     PathSetStopDist(U.path, MeleeRng);  Ovr(13, 100, 0);  RunStop(t, MeleeRng);  v14 ← 1; return   ; the charge
2. if not melee:
     if not chance(1): Idle(aip(3)); return                    ; draw#1
     PathSetStopDist(U.path, MeleeRng)
     if not chance(4): WalkStop(t, 3); return                  ; draw#2
     Ovr(13, 100, 0);  RunStop(t, MeleeRng); return
3. if v14 = 0 and not chance(2): Idle(aip(3)); return          ; draw#1
4. v14 ← 0
5. if Skill1 ≥ 0 and chance(6): UseSkill1(t); return           ; Jab
6. if Skill2 ≥ 0 and Range(100) < aip(7): UseSkill2(t); return
7. if Skill3 ≥ 0 and Range(100) < aip(8): UseSkill3(t); return
8. SetModeAtUnit(4, t)
```

- R36a. [I] `MeleeRng` is the MonStats2 byte `+0x0E`. [C] After a charge the first melee decision attacks without the `aip(2)` draw (`3.v14=0` both ways, its two stores failing alone). [I] Up to four draws.
- R36b. [C] The map, family `lancer`, 240 cases, 160 with a draw, 8 boundaries; the controls fail the 25 and 106 that separate them.
- R36p. [C] **Logged paths of the block** (the logged-path model): 32 decisions, 32 fork-free, 0 mismatches. Both arms met, each failing alone: `1.aip(5)<dist`, `2.melee`, `3.v14=0`; one arm met, failing alone: `2.chance(1)` true; `2.chance(4)`, `3.chance(2)`, `5.Skill1>=0`, `6.Skill2>=0`, `7.Skill3>=0` false; stores failing alone: `set v14=0`, `set v14=1`. [I] The untaken arm of each one-arm branch; `<` against `≤` but at the equal pairs met (`1.aip(5)<dist`); what the model does not compare.

- R36i. [C] As data: kind 1, no `init`, no `alt`; 9 records (165-169 cr_lancer1..cr_lancer5, 615-617 cr_lancer6..cr_lancer8, 723 cr_lancer8); reach P; `aip` set 1,2,3,4,5,6,7; `aidel` 15/13,14/12,13; skills Jab, MonPowerStrike, MonIceSpear.
- R36l. [C] First boundary: 4 decisions compared (4), 0 mismatches, 2 first-call outcomes. Outside it: 32 decisions of the row's classes with no model (another think, a state row, or a case the model refuses).

#### R37. Row 37 `SkeletonBow`

Tier AI: [machinery § T37](../machinery/), not repeated here.

#### R38. Row 38 `MaggotLarva`

**`aip`:** 1 melee: chance of A1; 2 the wait in melee range; 3 out of melee range: chance to walk; 4 the wait out of it.

```
1. if not melee:                                                           [I]
     v14 ← 0
     if chance(3): Walk(t, 1); return     ; draw#1
     Idle(aip(4)); return
2. if v14 = 0 and chance(1):              ; draw#1, only when v14 = 0
     v14 ← 1;  SetModeAtUnit(4, t); return
3. v14 ← 0;  Idle(aip(2))
```

- R38a. [C] `v14` is set by the attack (`set v14=1` fails alone). [I] The larva alternates an attack with a wait, `v14` cleared by the next decision.
- R38b. [C] The map, family `larva`, 240 cases, 153 with a draw, 4 boundaries; the controls fail the 20 and 131 that separate them.
- R38p. [C] **Logged paths of the block** (the logged-path model): 41 decisions, 41 fork-free, 0 mismatches. Both arms met, each failing alone: `1.chance(3)`, `1.melee`, `2.chance(1)`; one arm met, failing alone: `2.v14=0` true; stores failing alone: `set v14=1`. [I] The untaken arm of each one-arm branch; `set v14=0` and its second store (separate nothing); `<` against `≤` but at the equal pairs met (`2.chance(1)`); what the model does not compare.

- R38i. [C] As data: kind 1, no `init`, no `alt`; 6 records (180-184 maggotbaby1..maggotbaby5, 680 maggotbaby6); reach ·; `aip` set 1,2,3,4,5; `aidel` 15/14/13; skills —.
- R38l. [C] First boundary: 41 decisions of the 84 logs, 41 fork-free, compared at the first call, 0 mismatches, 0 stops there.

#### R39. Row 39 `PinHead`

**`aip`:** 1 melee after the first decision: chance to act; 2 the wait in melee range; 3 out of melee range: chance to walk; 4 the wait out of it; 5 chance of `Skill1`; 6 chance of `Skill2`.

```
1. if not melee:                                                           [I]
     v14 ← 0
     if chance(3): Walk(t, 7); return     ; draw#1
     Idle(aip(4)); return
2. if v14 ≠ 0 and not chance(1): Idle(aip(2)); return   ; draw#1, only when v14 ≠ 0
3. v14 ← 1
4. if Skill1 ≥ 0 and chance(5): UseSkill1(t); return    ; Smite
5. if Skill2 ≥ 0 and chance(6): UseSkill2(t); return
6. SetModeAtUnit(4, t)
```

- R39a. [C] It skips the `aip(1)` draw on its first melee decision (`v14` = 0). [I] It makes it after that; the skill draws come after it either way.
- R39b. [C] The map, family `pinhead`, 240 cases, 237 with a draw, 6 boundaries; the controls fail the 23 and 116 that separate them.
- R39p. [C] **Logged paths of the block** (the logged-path model): 226 decisions, 225 fork-free, 0 mismatches. Both arms met, each failing alone: `1.chance(3)`, `1.melee`, `4.chance(5)`; one arm met, failing alone: `4.Skill1>=0` true; `2.v14!=0`, `5.Skill2>=0` false; stores failing alone: `set v14=0`, `set v14=1`. [I] The untaken arm of each one-arm branch; `<` against `≤` but at the equal pairs met (`1.chance(3)`, `4.chance(5)`); what the model does not compare.

- R39i. [C] As data: kind 1, no `init`, no `alt`; 6 records (186-189 blunderbore1..blunderbore4, 618-619 blunderbore5..blunderbore6); reach P; `aip` set 1,2,3,4,5; `aidel` 15/13,14/12,13; skills Smite.
- R39l. [C] First boundary: 202 decisions compared (202), 0 mismatches, 4 first-call outcomes.

#### R40. Row 40 `MaggotEgg`

**`aip`:** 1 the delay and the idle (the delay after hatching: 250 down to 150 in Normal, 200 above, as data); 2 chance to hatch.

```
1. if Skill1 ≥ 0 and v14 ≠ 1 and chance(2):             ; draw#1           [I]
     UseSkill1(t);  Delay(aip(1));  v14 ← 1; return      ; hatch
2. if v14 = 1: UnitKilled(G, U, UNIT_GetTargetUnit(G, U), 1)    ; no return
3. Idle(aip(1))
```

- R40a. [I] One hatch per egg: after it, the next event kills the egg with its own last target as the killer and still queues `Idle(aip(1))` (no jump between the two calls).
- R40b. [C] The map up to the skill, `UNIT_GetTargetUnit` (its stack arguments `G`, `U` and `UnitKilled`'s pending 1) or the idle: family `egg`, 240 cases, 110 with a draw, 3 boundaries; the controls fail the 11 and 98 that separate them.

- R40i. [C] As data: kind 1, no `init`, no `alt`; 6 records (190-194 maggotegg1..maggotegg5, 681 maggotegg6); reach ·; `aip` set 1,2; `aidel` 15/14,15/13,15; skills MaggotEgg.
- R40l. [C] First boundary: 7 decisions compared (1 + 5 + 1), 0 mismatches, 1 first-call outcome.
- R40r. [I] Past the first boundary, a consistency check only: 6 of its own think's decisions in the rev 4 and rev 6 logs, 6 resumed, 0 mismatches, 0 stopped, 0 later calls matched, an unknown value deciding 0 of 0 later steps. The row is not under sentence H1.

#### R43. Row 43 `FoulCrowNest`

**`aip`:** 1 the frames between spawns (100/80/70, as data); 3 the spawn count (6–15 in Normal up to 15–24 in Hell, as data).

```
init:  v14 ← T;  v18 ← 0                                        [I]

1. if dist > 20: Idle(25); return                                          [I]
2. if v18 ≥ aip(3):
     U+0xC4 ← U+0xC4 | 0x20000;  MonAiSetMode(0, 0, 0); return             ; die
3. e ← |T − v14|                        ; 32-bit subtract, then neg if negative
4. if Skill1 ≥ 0 and e ≥ aip(1):
     v14 ← T
     cls ← MonStats count > 206 ? 206 : −1
     if SpawnClassCellTest(cls, UnitGetRoom(U), U.x, U.y, 0):
       v18 ← v18 + 1;  UseSkill1(t); return      ; Nest
5. Idle(20 + low mod 10)                ; draw#1
```

- R43a. [C] The nest moves its timer to `T` before the cell test (seen at it, 4 decisions); the class is 206 (`ECX`, 4); the only draw on the taken paths is the idle's, its remainder unsigned (3 of 4 lows ≥ 2³¹; a signed divide fails 3). [I] So a failed test waits a full `aip(1)` again. The class compare is inlined as `((count > C) − 1 & mask) + C`; row 206 is `crownest1`, for all four nest records. The idle's divide is the inline `0xCCCCCCCD`. `e` cannot wrap on a timer that holds a past frame; for `T − v14 = −2³¹` the `neg` leaves `−2³¹`, below any `aip(1)`.
- R43b. [C] The map up to `SpawnClassCellTest` (its `ECX` class, `EDX` room and the position arguments), the death command (with `Unit+0xC4`) or an idle: family `nest`, 240 cases, 28 with a draw, 4 boundaries. `≤` cannot separate the draw, which is compared with nothing, and the Normal column separates 48; the draw is checked by its value (`Idle` argument and moved seed in all 28). Two controls at the lane check, the death compare flipped and the range test moved by one, fail all the 53 and 30 they separate. The `e ≥ aip(1)` edge has no control.
- R43p. [C] **Logged paths of the block** (the S1b model, the think): 32 decisions, all fork-free, 0 mismatches, 8 calls past the first. Step 1; step 4 both ways with the accepted cell test (class 206, `U`'s room and position, `v18 + 1`, `UseSkill1(t)`); step 5's idle. [I] The death (`v18 < aip(3)` in all), a refused cell test, `Skill1 < 0`.

- R43i. [C] As data: kind 1, `init`, no `alt`; 4 records (206-209 crownest1..crownest4); reach P; `aip` set 1,3; `aidel` 15/15/15; skills Nest.
- R43l. [C] First boundary: 32 decisions compared (32), 0 mismatches, 3 first-call outcomes.
- R43r. [I] Past the first boundary, a consistency check only: 32 of its own think's decisions in the rev 4 and rev 6 logs, 32 resumed, 0 mismatches, 0 stopped, 8 later calls matched, an unknown value deciding 0 of 8 later steps. The row is not under sentence H1.

#### R45. Row 45 `Sarcophagus`

**`aip`:** 1 the frames between spawns (125/110/90, as data); 3 one less than the spawn count.

```
init:  v14 ← T;  v18 ← 0                                        [I]

1. if dist > 25: Idle(25); return                                          [I]
2. if v18 > aip(3):
     U+0xC4 ← U+0xC4 | 0x20000;  MonAiSetMode(0, 0, 0); return             ; die
3. e ← |T − v14|                        ; 32-bit subtract, then neg if negative
4. if Skill1 ≥ 0 and e ≥ aip(1):
     cls ← MonStats count > 228 ? 228 : −1
     if SpawnClassCellTest(cls, UnitGetRoom(U), U.x, U.y, 0):
       v18 ← v18 + 1;  v14 ← T;  UseSkill1(t); return      ; Nest
5. Idle(20 + low mod 10)                ; draw#1
```

- R45a. [I] Row 43's code differs by these three: the bound (`>` against `≥`), the distance and class, and that the sarcophagus moves its timer only on success, so it tries again at the next event. Row 228 is `sarcophagus`.
- R45b. [C] The map up to the same three ends: family `sarco`, 240 cases, 79 with a draw, 4 boundaries, the draw checked by its value; `≤` separates none, the Normal column 84, and the two lane-check controls fail all the 72 and 24 they separate. The `e ≥ aip(1)` edge has no control.

- R45i. [C] As data: kind 1, `init`, no `alt`; 1 records (228 sarcophagus); reach ·; `aip` set 1,3; `aidel` 15/15/15; skills Nest.
- R45l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R46. Row 46 `ElementalBeast`

**`aip`:** 1 chance of a walk against a ring (20, as data); 2 the distance at which it wakes (16–24, as data); 3 the idle wait.

```
switch v14:                                                                [I]
  2: UnitKilled(G, U, t, 1)
  0: if dist < aip(2) or St3or19:
       SetModeAtUnit(8, t);  v14 ← 1
     else: Idle(aip(3))
  1: if melee:
       SetModeAtUnit(8, t);  UnitQueueEvent(G, U, 0, T + 1, 0, 0);  v14 ← 2
     else if Range(100) < aip(1): Walk(t, 0)     ; draw#1
     else: Ring(8)
  else: Idle(aip(3))
```

- R46a. [I] The orb casts S1 once when woken, flies at the target, in melee range casts S1 again and queues a kind-0 event (the mode frame event, code 0, index 0) at `T + 1`, then dies at the event after, the target as killer.
- R46b. [C] The map, family `beast`, 240 cases, 49 with a draw, 6 boundaries; the controls fail the 5 and 46 that separate them.

- R46i. [C] As data: kind 1, no `init`, no `alt`; 4 records (230-233 firebeast..poisonorb); reach ·; `aip` set 1,2,3; `aidel` 15/15/15; skills —.
- R46l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R47. Row 47 `FlyingScimitar`

**`aip`:** 1 out of melee range, both approach draws (90, as data); 2 melee: chance of A1; 3 the idle wait; 4 melee: chance of a `T56` walk.

```
1. if not melee:                                                           [I]
     if chance(1): Toward(t, 8, 1); return     ; draw#1
     if chance(1): Walk(t, 7); return          ; draw#2, aip(1) again
   else:
     if chance(2): SetModeAtUnit(4, t); return ; draw#1
     if chance(4): T56(t, 2, 0); return        ; draw#2
2. Idle(aip(3))
```

- R47a. [C] The map, family `scimitar`, 240 cases, all with a draw, 5 boundaries; the controls fail the 35 and 120 that separate them.

- R47i. [C] As data: kind 1, no `init`, no `alt`; 1 records (234 flyingscimitar); reach ·; `aip` set 1,2,3,4; `aidel` 15/13/10; skills Charge.
- R47l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R48. Row 48 `ZakarumZealot`

**`aip`:** 1 melee after an attack: chance to attack again; 2 chance of A2 against A1 (50–65, as data); 3 the life percent below which it steps away (35–50, as data); 4 out of melee range: `not chance(4)` walks, else runs (50–90, as data).

```
1. run: i32 ← 0                                                            [I]
   if Velocity > 0:
     run ← Run·100 ÷ Velocity − 100       ; i16 fields, signed idiv
     if run < 1: run ← 0
     if run ≥ 120: run ← 120
2. life ← UnitLifePct(U)
3. if t ≠ 0:
     p ← t
     if t.type = 1:
       MonsterOwnerRef(t, &guid, &type)
       if type = 0: p ← GameFindUnit(G, 0, guid)
     if p ≠ 0 and p.type = 0 and DRLG_ActFromLevelId(RoomGetLevelId(UnitGetRoom(U))) = 2
          and QUESTRECORD_GetState(PlayerData(p).quests[d], 21, 0):
       Ovr(0, run, 0)
       if StepAwayXY(t, 8, 1): return
       Ring(6); return
4. if St3or19:                                                             [I]
     if v18 = 0 and life < aip(3):
       v14 ← 0;  Ovr(0, run, 0)
       if StepAwayXY(t, 8, 1): return
       v18 ← 5
     if COLL_CellTestAt(UnitGetRoom(U), U.x, U.y, 0x40):
       if melee: T56(t, 4, 0)
       else: Walk(t, 7)
       return
5. if v18 ≠ 0: v18 ← v18 − 1
6. if not melee:
     v14 ← 0
     if not chance(4): Walk(t, 7); return     ; draw#1
     Ovr(0, run, 0);  RunToUnit(t); return
7. if v14 ≠ 0 and not chance(1):              ; draw#1, only when v14 ≠ 0
     v14 ← 0
     if Range(100) < 80: Idle(10); return     ; draw#2
     T56(t, 4, 0); return
8. v14 ← 1
9. SetModeAtUnit(chance(2) ? 5 : 4, t)        ; draw#1 or #2
```

- R48a. [I] **The act III truce.** In an act III level (act index 2) a zealot whose target is a player, or a monster whose owner record names a player (`MonsterOwnerRef` type 0, found by GUID), steps 8 away from it and wanders when that player's quest record of the game's difficulty has quest word 21 bit 0, the word the Durance portal tests.
- R48b. [I] With `MonsterData+0x54` 3 or 19 and life below `aip(3)` it steps away once and then holds a five-decision cooldown in `v18`; with that state and a cell that fails mask `0x40` it moves. Up to two draws. Not emulated: `UnitLifePct` is the first call.

- R48i. [C] As data: kind 1, no `init`, no `alt`; 5 records (235-237 zealot1..zealot3, 671-672 zealot4..zealot5); reach P; `aip` set 1,2,3,4; `aidel` 15/14/13; skills —.
- R48l. [C] First boundary: 321 decisions (200 + 121) compared at `UnitLifePct(U)`, 0 mismatches, one outcome, hand map; the site control fails 321.
- R48r. [I] Past the first boundary, a consistency check only: 121 of its own think's decisions in the rev 4 and rev 6 logs, 121 resumed, 0 mismatches, 0 stopped, 702 later calls matched, an unknown value deciding 360 of 702 later steps. The row is not under sentence H1.

#### R49. Row 49 `ZakarumPriest`

**`aip`:** 1 melee: chance of A1, and the blocked line's draw; 2 chance of the Blizzard; 3 chance of `Skill2`; 4 clear line: chance to cast; 5 the Blizzard's cooldown (120 frames, as data), and a quarter of the teleport's (480); 6 the heal search's distance.

```
1. life ← UnitLifePct(U)                                                   [I]
2. if melee or St3or19:
     if Skill3 ≥ 0 and life < 33 and T > v14:              ; MonTeleport
       v14 ← T + 4·aip(5)
       s ← melee ? 2 : 0
       x ← t.x + ((t.x − U.x) << s);  y ← t.y + ((t.y − U.y) << s)
       if MonSkillTargetOk(Skill3, 0, x, y):
         MonAiUseSkill(Sk3mode, Skill3, 0, x, y); return
     if melee and chance(1): SetModeAtUnit(4, t); return   ; draw#1
3. s ← {unit 0, count 0, best 0x7FFFFFFF, bound aip(6)²}
   AiUnitSearch(G, U, &s, AiZakarumHealCb, 1)
4. if Skill1 ≥ 0 and s.unit ≠ 0 and D100() < 25:           ; ZakarumHeal, unsigned compare
     UseSkill1(s.unit); return
5. if not AiLineClear(U, t):
     if chance(1) and Skill4 ≥ 0 and v18 < T and Range(100) < aip(2): goto blizzard
   else if chance(4):
     if Skill4 ≥ 0 and v18 < T and Range(100) < aip(2):
   blizzard:
       UseSkill4(t);  v18 ← T + aip(5); return             ; MonBlizzard
     if Skill2 ≥ 0 and v1C < T and Range(100) < aip(3):
       UseSkill2(t);  v1C ← T + 20; return                 ; ZakarumLightning
6. if D100() < 30: T56(t, 4, 0); return
7. Idle(20)
```

- R49c. [I] Step 6's third argument is `ESI`, which holds 0 there: `xor esi, esi` in the inline step's `adc`, after the MonStats record it held. So the walk reaches `MonAiMove` with flags 0.
- R49a. [I] **The teleport** goes to the far side of the target: the target's point plus the unit-to-target offset, ×4 in melee range, ×1 otherwise. The first `GetSubX/Y` pair is the unit's, the second the target's (`ECX` = `[ebp−4]` then `[ebp+8]`). The offset is a u16 difference, so `<< 2` cannot wrap. A blocked line (`AiLineClear` 0: `UnitLineBlocked(U, t, 4)` non-zero) allows only Blizzard. Up to six draws. Not emulated: `UnitLifePct` is the first call.
- R49b. [C] **`AiZakarumHealCb`** takes a monster other than the searcher, `AlignSame02` with it, alignment not 2, not in a death mode, whose `MonClassCheck(MonBaseId)` is 235 (`zealot1`) or 238 (`cantor1`), with `UnitDistSq ≤ bound` and `UnitLifePct ≤ 60`; each such unit adds one to `+0x04` and becomes `+0x00`, since `+0x08` stays `0x7FFFFFFF` (written only when below 1) and every life is below it (240 emulated cases, 0 mismatches, 15 controls failing; every counted unit below `+0x08` taken, 49). It returns 0, so the search goes on. [I] With the think's block, the unit kept in play is the last taken. Block `{+0x00 unit, +0x04 count, +0x08 best, +0x0C bound}` at `EBP − 0x4C`.
- R49p. [C] **Logged paths of the block** (the logged-path model): 99 decisions, 99 fork-free, 0 mismatches. Both arms met, each failing alone: `2.chance(1)`, `2.life<33`, `2.melee`, `4.unit`, `5.Range<aip(2)`, `5.Range<aip(2)#2`, `5.Range<aip(3)`, `5.chance(1)`, `5.chance(4)`, `5.clear`, `5.v18<T#2`, `6.D100<30`; one arm met, failing alone: `2.Skill3>=0`, `2.targetok`, `2.v14<T`, `4.D100<25`, `4.Skill1>=0`, `5.Skill2>=0`, `5.Skill4>=0` (both sites), `5.v18<T`, `5.v1C<T` true; stores failing alone: `set v14=T+4aip(5)`, `set v18=T+aip(5)`, `set v1c=T+20`. [I] The untaken arm of each one-arm branch; `2.St3or19` (separates nothing); `<` against `≤` but at the equal pairs met (`5.chance(1)`, `5.chance(4)`); what the model does not compare.

- R49i. [C] As data: kind 1, no `init`, no `alt`; 6 records (238-241 cantor1..cantor4, 673-674 cantor5..cantor6); reach P; `aip` set 1,2,3,4,5,6; `aidel` 15/14/13; skills ZakarumHeal, ZakarumLightning, MonTeleport, MonBlizzard.
- R49l. [C] First boundary: 74 decisions (57 + 17) compared at `UnitLifePct(U)`, 0 mismatches, one outcome, hand map; the site control fails 74.
- R49r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 99 decisions of its own think in the 84 logs, all resumed, all fork-free, 385 calls past the first in 99 of them, 12 of 12 two-way sites failing alone.

#### R52. Row 52 `FrogDemon`

**`aip`:** 1 melee: chance of A1, after `aip(2)`; 2 melee: chance of A2; 3 melee: chance of a `T56` walk; 4 chance of a `T56` walk out of it; 5 within `aip(6)`: chance of A2; 6 that distance; 7 the delay; 8 submerged: the distance at which it surfaces (9, as data).

`v1C`: 0 start, 1 submerged, 2 surfaced. `Skill1` is `Submerge`, `Skill2` `Emerge`.

```
1. if v1C = 0:                                                             [I]
     if Skill1 ≥ 0 and dist > 12:
       UseSkill1(t);  Delay(8);  v1C ← 1;  AiVultureTakeOff(G, U); return
     if Skill2 ≥ 0 and AiVultureLand(G, U): goto emerge
     if not COLL_CellTestAt(UnitGetRoom(U), U.x, U.y, 0xC01): v1C ← 2
     Idle(12); return
2. if v1C = 1:
     if Skill2 ≥ 0 and ((dist < aip(8) and AiVultureLand(G, U))
                        or (dist < 20 and v18 > 64 and AiVultureLand(G, U))):
   emerge:
       MonAiUseSkill(Sk2mode, Skill2, U, 0, 0);  v1C ← 2; return
     AiVultureTakeOff(G, U);  Delay(24);  v18 ← v18 + 1;  v1C ← 1; return
3. if t = 0: Delay(32); return
4. if melee:
     if Range(100) < aip(2): SetModeAtUnit(5, t); return
     if Range(100) < aip(1): SetModeAtUnit(4, t); return
     if Range(100) < aip(3): T56(t, 3, 0); return
     Delay(aip(7)); return
5. if dist < aip(6):
     if Range(100) < aip(5): SetModeAtUnit(5, t); return
     if Range(100) < aip(4): T56(t, 4, 0); return
     Delay(aip(7)); return
6. if Range(100) < aip(4): T56(t, 3, 0); return
7. WalkStop(t, 4)
```

The alt, [I]:

```
if ctl.state ≠ 10 and ctl.state ≠ 11 and Skill1 ≥ 0 and v1C ≥ 2:
  UseSkill1(t);  v1C ← 1;  AiVultureTakeOff(G, U); return
MonAiInit(G, U, ctl, ctl.state);  Delay(1)
```

- R52a. [C] The take-off helper on the submerge and on each failed submerged event, `v18 + 1` per failed submerged event (388 at the next decision), the skill's `x`, `y` 0 (6). [I] The frog uses the vulture's take-off and landing helpers, the collision off and on, for its submerge and emerge. Each failed submerged event adds one to `v18`. Kind 5: with no target a surfaced frog delays 32. The `alt` runs when `MonAiInit` swaps the think: a surfaced frog whose state changes to anything but 10 or 11 submerges first. The skill's `x, y` are 0 (the pushed `EDX` is the zero `v1C`). Up to three draws.
- R52b. [C] Both maps up to the first callee, the landing helper, the cell test (its stack arguments, room, `U.x`, `U.y`, `0xC01`), the take-off, the commands and delays: families `frog` (240 cases, 95 with a draw, 14 boundaries; the controls fail the 18 and 54 that separate them) and `frogalt` (240 cases, no draw, 2 boundaries, so no control separates it, and its `[C]` is the map of its state tests only).
- R52p. [C] **Logged paths of the block** (the S1b model): 400 decisions, all fork-free, 0 mismatches, 406 calls past the first. Step 1's submerge (6) and step 2's failed submerged event (394: take-off, `Delay(24)`, `v18 + 1` seen at the next decision in 388). [I] Step 1's other arms, the emerge, steps 3 to 7; the `Skill2 ≥ 0` test and step 2's `v1C ← 1` (they separate nothing).

- R52i. [C] As data: kind 5, no `init`, `alt`; 3 records (247-249 frogdemon1..frogdemon3); reach P; `aip` set 1,2,3,4,5,6,7,8; `aidel` 15/14/13; skills Submerge, Emerge.
- R52l. [C] First boundary: 600 decisions compared (200 + 400), 0 mismatches, 2 first-call outcomes.
- R52r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 400 decisions (rev 4), all fork-free, 406 calls past the first, 1 of 1 (narrow: one two-way site) two-way sites failing alone.

#### R56. Row 56 `Tentacle`

**`aip`:** 1 melee: chance of A1; 2 out of melee range: chance to submerge; 3 the submerged minimum, in 25-frame units (300–400 frames, as data); 4 the surfaced minimum, the same units; 5 the wait; 6 the distance past which it submerges and within which it surfaces.

`v1C`: 0 start, 1 submerged, 2 surfaced. `Skill1` is `Submerge`, `Skill2` `Emerge`.

```
1. o ← MonsterOwner(U)                                                     [I]
2. if o = 0: UnitKilled(G, U, 0, 1); return
3. if o.mode = 12 and D100() < 40:              ; draw#1, unsigned
     UnitKilled(G, U, UNIT_GetTargetUnit(G, o), 1); return
4. if Skill1 ≥ 0:
     if v1C = 0: goto submerge8
     if v1C = 2 and v18 < T and (dist > aip(6) or (not melee and Range(100) < aip(2))
                                 or (o.mode = 14 and Range(100) < 50)):
   submerge8:
       UseSkill1(t);  Delay(8);  v18 ← T + 25·aip(3);  v1C ← 1; return
5. if Skill2 ≥ 0:
     if v1C ≠ 1: goto act
     if v18 < T and (melee or dist < aip(6) or (o.mode ≠ 14 and Range(100) < 5)):
       MonAiUseSkill(Sk2mode, Skill2, U, 0, 0);  v18 ← T + 25·aip(4);  v1C ← 2; return
6. if v1C = 1: Delay(aip(5)); return
act:
7. if melee and Range(100) < aip(1): SetModeAtUnit(4, t); return
8. Idle(aip(5))
```

- R56a. [I] A tentacle follows its owner, the head (row 57): it dies with none, and with 40 percent per event once the owner is in mode 12, the owner's target the killer; it submerges with 50 percent while the owner is in mode 14 and surfaces by itself (5 percent) only while it is not. `25·aip` is 32-bit and fits for every i16; the sum with `T` wraps only past frame `2³¹ − 819 176`. Up to four draws. Not emulated: `MonsterOwner`'s `GameFindUnit` comes before the first draw.

- R56i. [C] As data: kind 2, no `init`, no `alt`; 3 records (258-260 tentacle1..tentacle3); reach ·; `aip` set 1,2,3,4,5,6; `aidel` 15/15/15; skills Submerge, Emerge.
- R56l. [C] First boundary: 16 decisions compared at `MonsterOwner(U)`, 0 mismatches, one outcome, hand map; the site control fails 16.

#### R57. Row 57 `TentacleHead`

**`aip`:** as row 56 for 2, 3, 4, 5, 6 (`aip(6)` 12–14, as data), and 1 the chance of A1 at its own hostile.

```
1. if Skill1 ≥ 0:                                                          [I]
     if v1C = 0:
       UseSkill1(t);  Delay(8);  goto arm
     if v1C = 2 and v18 < T and (dist > aip(6) or (not melee and Range(100) < aip(2))):
       UseSkill1(t);  Delay(20)
   arm:
       v18 ← T + 25·aip(3);  v1C ← 1; return
2. if Skill2 ≥ 0 and v1C = 1 and v18 < T and (melee or dist < aip(6)):
     MonAiUseSkill(Sk2mode, Skill2, U, 0, 0);  v18 ← T + 25·aip(4);  v1C ← 2; return
3. if v1C = 1: Delay(aip(5)); return
4. r ← dist;  h ← FindHostile(&r, 0)
5. if chance(1): SetModeAtUnit(4, h); return      ; the draw after the search
6. Idle(aip(5))
```

- R57a. [C] The head surfaces when the target is within `aip(6)` (both ways, failing alone), and its first submerge delay is `T + 25·aip(3)`. [I] It surfaces only then, never by chance, and its A1 is aimed at its own hostile `h`, which may be 0 when `FindHostile` finds none: the call is made with it. Its later submerges delay 20, the first 8.
- R57b. [C] The map up to the skills, the delay or `FindHostile` (the word at its pointer argument, `EBP − 4`, holding `dist`): family `thead`, 240 cases, 18 with a draw, 5 boundaries; the controls fail the 3 and 27 that separate them.
- R57p. [C] **Logged paths of the block** (the logged-path model): 52 decisions, 52 fork-free, 0 mismatches. Both arms met, each failing alone: `1.v1C=0`, `2.dist<aip(6)`, `2.melee`, `2.v18<T`; one arm met, failing alone: `1.Skill1>=0`, `2.Skill2>=0`, `2.v1C=1`, `3.v1C=1` true; `1.v1C=2` false; stores failing alone: `set v18=T+25aip(3)`, `set v1c=1`. [I] The untaken arm of each one-arm branch; `set v18=T+25aip(4)`, `set v1c=2` (separate nothing); `<` against `≤` but at the equal pairs met (none); what the model does not compare.

- R57i. [C] As data: kind 2, no `init`, no `alt`; 3 records (261-263 tentaclehead1..tentaclehead3); reach ·; `aip` set 1,2,3,4,5,6; `aidel` 15/15/15; skills Submerge, Emerge.
- R57l. [C] First boundary: 8 decisions compared (8), 0 mismatches, 2 first-call outcomes.

#### R63. Row 63 `GargoyleTrap`

**`aip`:** 1 the shooting range (24–28, as data); 2 chance to shoot (20/50/80, as data); 3 the idle after a shot (12/10/8 frames, as data); 4 the idle after no shot (15/7/0, as data).

```
1. if v14 > 0: Idle(v14);  v14 ← 0; return       ; the cooldown after a shot  [I]
2. UnitSetPathTargetUnit(U, t)
3. dx ← t.x − U.x;  dy ← t.y − U.y
   (px, py) ← |dx| < |dy| ? (U.x, t.y) : (t.x, U.y)       ; on the unit's row or column
4. PathSetFacing(U.path, g_FacingOfClass4[g_FacingClass64[(u8) UnitDirToPoint(U, px, py)]])
5. if (|dx| ≤ 5 or |dy| ≤ 5) and Skill1 ≥ 0 and dist < aip(1) and chance(2):  ; draw#1
     UseSkill1(t);  v14 ← aip(3); return
6. Idle(aip(4))
```

- R63a. [C] The shot only within 5 of the row or column (each term both ways), and the facing map at directions 7 → 31, 40 → 0, 56 → 17 (49 decisions). [I] The map elsewhere (9–24 → 49 not met), and: the trap turns to one of four facings and shoots only at a target within 5 subtiles of its row or column. `UnitDirToPoint`'s low byte indexes the 64-byte table, whose quarter indexes the four bytes: directions 57–63 and 0–8 → 31, 9–24 → 49, 25–40 → 0, 41–56 → 17.
- R63b. [C] The cooldown test up to `Idle` or `UnitSetPathTargetUnit` only: family `garg`, 240 cases, no draw before them, 2 boundaries, so no control separates it.
- R63p. [C] **Logged paths of the block** (the S1b model): 54 decisions, all fork-free, 0 mismatches, 147 calls past the first. Steps 1 to 6 on their taken arms: the cooldown idle (49 equal pairs at `0 < v14`), the row/column point, the facing, the shot with `v14 ← aip(3)`, the idle. [I] `Skill1 < 0`.

- R63i. [C] As data: kind 1, no `init`, no `alt`; 1 records (273 gargoyletrap); reach ·; `aip` set 1,2,3,4; `aidel` 15/15/15; skills GargoyleTrap.
- R63l. [C] First boundary: 145 decisions compared (91 + 54), 0 mismatches, 2 first-call outcomes.
- R63r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 54 decisions (rev 4), all fork-free, 147 calls past the first in 49 of them, 10 of 10 two-way sites failing alone.

### Batch 4: pool-D (`SkeletonMage` to the traps)

#### R64. Row 64 `SkeletonMage`

Tier AI: [machinery § T64](../machinery/), not repeated here.

#### R65. Row 65 `FetishShaman`

**`aip`:** 1 chance of the revive; 2 the revive filter (0/1/2 to 0/2/3, as data); 3 the **squared** distance past which it walks to the corpse (15/16/18 to 15/18/22, as data); 4 chance of a `T56` walk (66, as data); 5 the search radius (50, as data).

```
1. n ← 1                                                                   [I]
   if Skill1 ≥ 0:
     s ← SkillFindByOwner(U, Skill1, −1)
     if s ≠ 0:
       lv ← SKILLS_GetSkillLevel(U, s, 1)
       if lv > 0: n ← lv
2. if Skill1 ≥ 0 and dist < n and not HasState(U, 12):
     blk.kind ← 1;  blk+0x0C ← t ≠ 0 ? t.guid : −1;  blk+0x10 ← t ≠ 0 ? t.type : 6
     MonHelpBlock(U, &blk)
     UseSkill1(t); return                                     ; the breath, FetishInferno
3. if HasState(U, 12): State(12, 0)
4. s ← {dead 0, deadD2 0x7FFFFFFF, r2 aip(5)·aip(5), live 0, liveD2 0x7FFFFFFF, count 0, filter aip(2)}
   AiUnitSearch(G, U, &s, AiFetishReviveCb, 1)
5. if s.dead ≠ 0 and chance(1) and MonSkillTargetOk(Skill3, s.dead, 0, 0):   ; draw#1
     blk.kind ← 14;  blk+0x0C ← s.dead.guid;  blk+0x10 ← 1
     MonHelpBlock(U, &blk)
     if s.deadD2 > aip(3): WanderNear(s.dead, 10); return
     MonAiUseSeqSkill(Skill3, s.dead, 0, 0); return           ; Resurrect2
6. if chance(4): T56(t, 4, 0); return                         ; draw#1 or #2
7. Idle(10)
```

The alt, [I]:

```
if HasState(U, 12): State(12, 0)         ; state 12 `inferno`
MonAiInit(ctl, ctl.state)
Idle(1)
```

- R65a. [C] The breath while `dist` is below the level `SKILLS_GetSkillLevel` returns (9 or 10 in the logs; 2 within, 87 not). [I] The breath is used while the target is nearer than the skill's level, 7–11 in Normal by the records' `Sk1lvl` before any level bonus, or 1 when the unit has no such skill or the level is below 1.
- R65b. [C] `aip(3)` is compared with the search block's word 1 as written (5 cases, 153 to 1 170 against 15). [I] That word is a squared distance (`cmp [ebp-0x4c], aip3`: `deadD2` from the callback's `UnitDistSq`).
- R65c. [C] **`AiFetishReviveCb`** takes a candidate that is not the unit, is a monster (type 1) with `Unit+0xC4` bit `0x02`, is not in state set 33, and, when `s.filter` is 0, whose owner is the shaman (`MonsterOwner(cand) = U`); whose class by `MonClassCheck(MonBaseId(cand))` is 141 (`fetish1`), or 396 (`fetishblow1`) unless the filter is 1; of alignment 0; for a filter below 3 not of the `MonTypeFlag(cand, 12)` type; and within `UnitDistSq ≤ s.r2`. A candidate in mode 12 replaces `s.dead` when strictly nearer; any other counts in `s.count` and replaces `s.live` when strictly nearer. It returns 0, so the search goes on. No draw. (240 emulated cases, 0 mismatches, 21 controls failing, dead taken 18, live counted 42) [I] The think reads only `s.dead` and `s.deadD2`.
- R65d. [C] The filter tests decode as below, and row 65's eight records hold `aip2` 0 in Normal, 3 in Hell in `fetishshaman4`–`8`. [I] The filter word is the difficulty's `aip2`. So the filter widens with difficulty: 0 (Normal in every record) revives only the shaman's own minions, 1 any `fetish1`-based dead, 2 also the `fetishblow1` base, 3 (Hell in `fetishshaman4..8`) drops the type test.
- R65e. [C] The kind-1 block's `+0x0C` is the target's id and `+0x10` its type (2 decisions), the kind-14 block's `+0x10` is 1 (5). [I] The kind-14 block's guid, and: the blocks' `+0x0C` and `+0x10` are the guid and the type, the order row 30 `Fetish` reads as `GameFindUnit(G, rec+0x10, rec+0x0C)`; the kind-14 block's `+0x10` = 1 is the monster type. `+0x14` and `+0x18` are left as the stack held them. Whether the call reaches fetish minions is Open questions.
- R65f. [C] Two maps only: the skill-sign test up to `SkillFindByOwner(U, Skill1, −1)` or, for `Skill1 < 0`, `HasState(U, 12)`, family `fetish`; and the alt's entry call `HasState(U, 12)`, family `fetishalt`. Each 240 cases, no draw and no compare before the calls, so no control separates them.
- R65p. [C] **Logged paths of the block** (the S1b model): 89 decisions, all fork-free, 0 mismatches, 370 calls past the first. Steps 1, 2 (2 breaths), 4 to 7 on their taken arms (`WanderNear(dead, 10)`, `T56`, `Idle(10)`). [I] `n`'s default 1, state 12 set (the arms of steps 2 and 3), the resurrect `UseSeqSkill`.

- R65i. [C] As data: kind 1, no `init`, `alt`; 8 records (278-282 fetishshaman1..fetishshaman5, 662-664 fetishshaman6..fetishshaman8); reach PU; `aip` set 1,2,3,4,5; `aidel` 15/14/13; skills FetishInferno, FetishAura, Resurrect2.
- R65l. [C] First boundary: 104 decisions compared (15 + 27 + 62), 0 mismatches, 1 first-call outcome.
- R65r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 89 decisions (27 and 62), all fork-free, 370 calls past the first, 5 of 5 two-way sites failing alone.

#### R66. Row 66 `SandMaggotQueen`

**`aip`:** 1 the brood size (7/8/9 in `maggotqueen1` up to 11/12/13 in 5, as data); 2 the delay, and with 25 the idle (12 down to 4, as data).

```
1. if v1C ≠ 0: Idle(25·aip(2));  v1C ← 0; return                 ; i32 product  [I]
2. if v18 = 0:
     if v14 < aip(1):
       MoveToPoint(U.x, U.y, 8);  Delay(aip(2));  v18 ← 1
     return                                                      ; the brood is complete: no command
3. SpawnClassByBase(U, &cls, &x, &y, &mode, 0, MonLinkClass3C)
4. room ← RoomAtSubtile(UnitGetRoom(U), x, y)
   if room ≠ 0:
     m ← SpawnAtPos(G, room, x, y, cls, mode, 2, 0x42)
     if m ≠ 0: m+0xC4 ← m+0xC4 | 0x4000000;  v14 ← v14 + 1
5. Delay(aip(2));  v18 ← 0;  v1C ← 1
```

- R66a. [I] A three-event cycle while fewer than `aip(1)` young were spawned: a move at its own position with 8, then the spawn, then `Idle(25·aip(2))`. `v14` counts successful spawns only. No draw. The row is kind 0: the think runs with no target search.
- R66b. [C] The map of `AiCtl+0x14/+0x18/+0x1C` to `Idle`, `MoveToPoint` (`U.x`, `U.y` read through `UnitGetSubX/Y`), `SpawnClassByBase` (its seven stack arguments) or the return: family `queen`, 240 cases, 3 boundaries and the return; the Normal-column and compare controls fail the 64 and 29 that separate them. The write of `v1C ← 0` after the `Idle` and every write after a boundary are not covered.

- R66i. [C] As data: kind 0, no `init`, no `alt`; 5 records (284-288 maggotqueen1..maggotqueen5); reach U; `aip` set 1,2; `aidel` 15/15/15; skills MagottUp, MagottDown, MagottLay, QueenDeath.
- R66l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R68. Row 68 `VileMother`

**`aip`:** 1 the lifetime count of spawn events (16–22, as data); 2 the most near children (5/6, as data); 3 chance to place; 4 melee: chance of A1 (80–95, as data); 5 `D100() ≥ aip(5)` gives the wander branch (70/60/50, as data); 6 chance of a `T56` walk (30, as data); 7 the wait in melee range.

```
1. pos ← MONSTATS_GetClassChainPos(U ≠ 0 ? U.class : −1, 0, 0)             [I]
2. child ← MonClassChainStep(count > 301 ? 301 : −1, pos)       ; 301 `vilechild1`
3. if v14 < aip(1) and UnitAlignGet(U) = 0 and chance(3):       ; draw#1
     s ← {child, 25, 0};  AiUnitSearch(G, U, &s, 0, 12)         ; kind 12: living `child` within 25
     if s.count < aip(2) and AiVileMotherSpawn(G, U, t, M):
       v14 ← v14 + 1; return
4. if melee:
     if chance(4): SetModeAtUnit(4, t); return                  ; draw#1 or #2
     Idle(aip(7)); return
5. if v14 < aip(1) and D100() ≥ aip(5):                         ; draw#1 or #2
     if chance(6): T56(t, 4, 0); return                         ; draw#2 or #3
     Idle(15); return
6. Walk(t, 7)
```

- R68a. [I] The mother's child class is the class at her own chain position in `vilechild1`'s chain. [C] The `ECX` of `MonClassChainStep` is 301 with the MonStats count above 301 (79 decisions). [I] It is `(count > 0x12D) ? 0x12D : −1`.
- R68b. [I] **`AiVileMotherSpawn(game, unit, t, M)`:** the direction from the unit to the target (`UnitDirToPoint`, 64 steps) cut to eight (`Dir64To8`); for eight tries from that direction, the try's 8-direction index `k & 7` maps through the stack table `{6, 4, 2, 2, 2, 0, 6, 6}` to a `DirOffset` direction, the cell is the unit's position plus three times that offset, and when `Skill1 ≥ 0` and `SpawnClassCellTest` (class `MONSTATS_ValidId(298)`, `vilemother1`) accepts the cell, `MonAiUseSkill(Sk1mode, Skill1, 0, x, y)` and return 1; after eight refusals, 0. No draw.
- R68c. [C] The entry call `MONSTATS_GetClassChainPos(U.class, 0, 0)` only, before any test: family `vmother`, 240 cases; no control separates it.
- R68p. [C] **Logged paths of the block** (the S1b model): 79 decisions, all fork-free, 0 mismatches, 259 calls past the first. Steps 1 to 6 on their taken arms. [I] `v14 ≥ aip(1)`, alignment ≠ 0, count ≥ `aip(2)`.

- R68i. [C] As data: kind 1, no `init`, no `alt`; 5 records (298-300 vilemother1..vilemother3, 675-676 vilemother4..vilemother5); reach PU; `aip` set 1,2,3,4,5,6,7; `aidel` 15/14/13; skills Nest.
- R68l. [C] First boundary: 150 decisions compared (71 + 79), 0 mismatches, 1 first-call outcome.
- R68r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 79 decisions (rev 4), all fork-free, 259 calls past the first, 6 of 6 two-way sites failing alone.

#### R69. Row 69 `VileDog`

**`aip`:** 1 melee: chance of A1 (80/85/90, as data); 2 the melee wait (10, as data); 3 out of melee range: chance to walk (80/85/90, as data).

```
1. if v14 = 0: v14 ← 1;  Idle(5); return                ; the first event after the spawn  [I]
2. if melee:
     if chance(1): SetModeAtUnit(4, t); return          ; draw#1
     Idle(aip(2)); return
3. if chance(3): Walk(t, 7); return                     ; draw#1
4. Idle(10)
```

- R69a. [C] The map, `AiCtl+0x14` included: family `vdog`, 240 cases, 200 with a draw, 5 boundaries; the controls fail the 34 and 69 that separate them.
- R69p. [C] **Logged paths of the block** (the S1b model): 78 decisions, all fork-free, 0 mismatches, one call each; every arm taken. [I] `chance(1)`'s `<` against `≤` (no equal pair; `chance(3)` met once).

- R69i. [C] As data: kind 1, no `init`, no `alt`; 10 records (10 records, as the index lists them); reach ·; `aip` set 1,2,3; `aidel` 15/14/13; skills —.
- R69l. [C] First boundary: 198 decisions compared (120 + 78), 0 mismatches, 5 first-call outcomes.
- R69r. [I] Past the first boundary, a consistency check only: 78 of its own think's decisions in the rev 4 and rev 6 logs, 78 resumed, 0 mismatches, 0 stopped, 0 later calls matched, an unknown value deciding 0 of 0 later steps. The row is not under sentence H1.

#### R70. Row 70 `FingerMage`

**`aip`:** 1 melee: chance of A1; 2 chance of `Skill1`, `FingerMageSpider`; 3 the life percent above which the flight ends (50–70, as data); 4 the life percent below which an ownerless mage flees (30–50, as data); 5 the skill range (15/20/26, as data); 6 the flight's most events (5, as data); 7 the walk's limit (40, as data); 8 the idle (12/10/8, as data).

```
1. life ← UnitLifePct(U)                                                   [I]
2. p ← Velocity > 0 ? min(max(Run·100 ÷ Velocity − 100, 0), 120) : 0       ; i16 columns, idiv
3. if St3or19:
     v14 ← 0
     if melee: SetModeAtUnit(4, t); return
     if Skill1 ≥ 0 and dist < aip(5): UseSkill1(t); return
4. if v14 = 1:                                                             ; fleeing
     v18 ← v18 + 1
     if life > aip(3) or D100() < 25 or v18 > aip(6): v14 ← 0              ; draw#1, only when life ≤ aip(3)
     else if dist < 14:
       Ovr(0, p, 0);  StepAway(t, 14, 0); return
     Idle(15); return
5. if MonsterOwner(U) = 0 and life < aip(4):
     v14 ← 1;  v18 ← 0;  StepAway(t, 9, 0); return
6. if melee:
     if chance(1): SetModeAtUnit(4, t); return                             ; draw#1
     if Skill1 ≥ 0 and rchance(2): UseSkill1(t); return                    ; draw#2
     T56(t, 5, 0); return
7. if dist ≥ aip(5):
     if dist < aip(7): Walk(t, 7); return
     Idle(15); return
8. if Skill1 ≥ 0 and rchance(2): UseSkill1(t); return                      ; draw#1
9. if HasState(t, 84): Walk(t, 0); return                                  ; state 84 `fingermagecurse`
10. Idle(aip(8))
```

- R70a. [I] `p` is the run speed's excess over the walk speed in percent, 0–120: `q = Run·100 ÷ Velocity − 100` (signed `idiv`), `q ≤ 0 → 0`, `q ≥ 120 → 120`.
- R70b. [C] The entry call `UnitLifePct(U)` only, before any test: family `fmage`, 240 cases; no control separates it.
- R70p. [C] **Logged paths of the block** (the S1b model): 154 decisions, all fork-free, 0 mismatches, 481 calls past the first. Steps 1, 3, 5 to 10 on their taken arms. [I] Step 4 (`v14` never 1), the flee, step 3's A1 and its `v14 ← 0` (separates nothing), `Idle(15)` beyond `aip(7)`, `p` (not compared).

- R70i. [C] As data: kind 1, no `init`, no `alt`; 5 records (304-306 fingermage1..fingermage3, 692-693 fingermage4..fingermage5); reach PU; `aip` set 1,2,3,4,5,6,7,8; `aidel` 15/14/13; skills FingerMageSpider.
- R70l. [C] First boundary: 274 decisions compared (120 + 99 + 55), 0 mismatches, 1 first-call outcome.
- R70r. [I] Past the first boundary, a consistency check only: 154 of its own think's decisions in the rev 4 and rev 6 logs, 154 resumed, 0 mismatches, 0 stopped, 481 later calls matched, an unknown value deciding 0 of 481 later steps. The row is not under sentence H1.

#### R71. Row 71 `Regurgitator`

**`aip`:** 1 melee: chance of A1; 2 a corpse nearer than 9 (squared): chance to eat; 3 out of melee range: chance to walk at `t`; 4 the late chance to eat; 5 the second chance to eat; 6 the corpse radius.

`v14`: 0 idle, 1 looking, 2 walking, 3 eating, 4 after the meal, 5 stepping away. `v18` the corpse's guid; `v1C` a walk count, six at most.

```
clear ≝ v14 ← 0;  v18 ← 0;  v1C ← 0                                        [I]

1. switch v14:
     5: StepAway(t, 16, 1);  v14 ← 0; return
     2: m ← GameFindUnit(G, 1, v18)
        if m = 0 or m.mode ≠ 12: clear;  Ring(8); return
        if UnitDistSq(U, m) > 4:
          if v1C ≥ 6: clear;  Ring(8); return
          WalkStop(m, 1);  v1C ← v1C + 1
        v14 ← 3;  Idle(8); return
     3: m ← GameFindUnit(G, 1, v18)
        if Skill1 ≥ 0 and m ≠ 0 and m.mode = 12: UseSkill1(m);  v14 ← 4; return
        clear;  Ring(8); return
     4: if not melee: SetModeAtUnit(5, t);  v14 ← 5; return
        StepAway(t, 8, 1); return
2. s ← {0, aip(6)·aip(6)};  AiUnitSearch(G, U, &s, AiRegurgitatorCb, 1)
3. if v14 = 1:
     if s.found ≠ 0:
       v18 ← s.found.guid
       if UnitDistSq(U, s.found) > 2: WalkStop(s.found, 1);  v14 ← 2;  v1C ← 0; return
       Idle(8);  v14 ← 3;  v1C ← 0; return
     if Range(100) < 20: clear; return                       ; draw#1
     Ring(8); return
4. if s.found ≠ 0:
     if UnitDistSq(U, s.found) < 9 and rchance(2): goto eat  ; draw#1
     if rchance(5): goto eat                                 ; draw#1 or #2
5. r ← Range(100)                                            ; draw#1..#3
6. if melee:
     if r < aip(1): SetModeAtUnit(4, t); return
     Idle(15); return
7. if r < aip(3): Walk(t, 0); return
8. if s.found ≠ 0 and rchance(4): goto eat                   ; draw#2..#4
9. Idle(8); return
eat:
   WalkStop(s.found, 1);  v14 ← 2;  v18 ← s.found.guid;  v1C ← 0
```

- R71b. [C] **`AiRegurgitatorCb`** takes a monster other than the unit with `Unit+0xC4` bit `0x200` clear and bit `0x02` set, in a death mode, not in state set 33, of alignment 0, with the MonStats2 flag `MonStats2FlagTest` tests, within `UnitDistSq ≤ s.r2`; it keeps the last such candidate at or nearer than the current best (`jg` skips, so ties replace: 17 taken at an equal distance). No draw. 240 emulated cases, 0 mismatches, 11 controls failing.
- R71c. [C] The state dispatch only: states 5, 2, 3 and 4 (both melee cases) to their first callee and the search's block (`{0, aip(6)²}` at `EBP−0x34`, callback, kind 1) for every other value, no draw before them: family `regurg`, 240 cases, 6 boundaries; the Normal-column control fails the 77 it separates, the search radius.
- R71p. [C] **Logged paths of the block** (the logged-path model): 129 decisions, 126 fork-free, 0 mismatches. Both arms met, each failing alone: `1.v14=4`, `1.v14=5`, `4.distsq<9`, `4.found`, `4.rchance(2)`, `6.melee`, `6.r<aip(1)`, `7.r<aip(3)`, `8.found`, `8.rchance(4)`; one arm met, failing alone: `1.v14=2`, `1.v14=3`, `4.melee`, `4.rchance(5)`, `s.v14=1` false; stores failing alone: `set v14=0`, `set v14=2#e`, `set v14=5`, `set v18=guid#e`. [I] The untaken arm of each one-arm branch; `set v1c=0#e` (separates nothing); the 3 forked decisions; `<` against `≤` but at the equal pairs met (`4.distsq<9`, `4.rchance(5)`, `7.r<aip(3)`); what the model does not compare.

- R71i. [C] As data: kind 1, no `init`, no `alt`; 4 records (307-309 regurgitator1..regurgitator3, 694 regurgitator4); reach PU; `aip` set 1,2,3,4,5,6; `aidel` 15/14/13; skills RegurgitatorEat.
- R71l. [C] First boundary: 53 decisions compared (44 + 9), 0 mismatches, 2 first-call outcomes.
- R71r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 129 decisions of its own think in the 84 logs, all resumed, 126 fork-free, 161 calls past the first in 124 of them, 12 of 12 two-way sites failing alone.

#### R72. Row 72 `DoomKnight`

**`aip`:** 1 melee: chance of A1 (90/95/100, as data); 2 the melee wait (10/5/5, as data); 3 out of melee range: chance of the type-13 walk (80/85/90, as data); 4 the wait out of it (10, as data).

```
1. if not melee:                                                           [I]
     if chance(3): Walk13(t, 7); return     ; draw#1
     Idle(aip(4)); return
2. if chance(1): SetModeAtUnit(4, t); return ; draw#1
3. Idle(aip(2))
```

- R72a. [C] The map, family `dknight`, 240 cases, all with a draw, 4 boundaries; the controls fail the 27 and 136 that separate them.
- R72p. [C] **Logged paths of the block** (the logged-path model): 35 decisions, 35 fork-free, 0 mismatches. Both arms met, each failing alone: `1.chance(3)`, `1.melee`, `2.chance(1)`. [I] The untaken arm of each one-arm branch; `<` against `≤` but at the equal pairs met (none); what the model does not compare.

- R72i. [C] As data: kind 1, no `init`, no `alt`; 3 records (310 doomknight1, 699-700 dkfig1..dkfig2); reach P; `aip` set 1,2,3,4; `aidel` 15/14/13; skills —.
- R72l. [C] First boundary: 35 decisions of the 84 logs, 35 fork-free, compared at the first call, 0 mismatches, 0 stops there.

#### R73. Row 73 `AbyssKnight`

**`aip`:** 1 the life percent below which it casts its armour (40/75/100, as data); 2 chance of that (80, as data); 3 melee: chance of A1 (90/94/97, as data); 4 the melee wait; 5 the distance inside which the countdown arms (6/6/5, as data); 6 the countdown (1/1/0, as data); 7 chance of the walk (70/65/50, as data); 8 the distance inside which it `T56` walks (40, as data).

```
1. life ← UnitLifePct(U)                                                   [I]
2. if Skill2 in [0, Skills count) and (st ← Skills[Skill2].aurastate) ≥ 0 and not HasState(U, st)
      and life < aip(1) and rchance(2):                  ; draw#1
     MonAiUseSkill(Sk2mode, Skill2, 0, 0, 0); return     ; MonBoneArmor
3. if melee:
     if chance(3): SetModeAtUnit(4, t); return           ; draw#1 or #2
     Idle(aip(4)); return
4. if dist < aip(5) and v14 ≤ 0: v14 ← aip(6)
5. if Skill1 ≥ 0 and v14 = 0 and not (U is a monster with MonsterData+0x0E ≥ 4):
     UseSkill1(t);  v14 ← aip(6); return                 ; DoomKnightMissile
6. if v14 > 0: v14 ← v14 − 1
7. if chance(7):                                         ; draw#1 or #2
     step U's seed                                       ; one more step
     Ovr(2, 0, 6 + (new low & 1));  Walk(t, 7); return
8. if dist < aip(8): T56(t, 3, 0); return
9. Idle(15)
```

- R73a. [I] The aura state is Skills `+0x080`, records at `DataTables+0xB98`, `0x23C` bytes each, count `+0xBA0`. The gate's `MonsterData+0x0E` is the appearance byte that class 311 draws as `Range(4)` at its creation, so 0–3 and always passing for the stock record. [C] The override byte is `6 +` the **low bit of the next step's low word**, not mod 100 (`and al,1; add al,6`), compared at `Ovr` in the 28 decisions of that path, and the gate passes in all (`5.md0e>=4` false, failing alone). [I] Up to three steps.
- R73b. [C] The entry call `UnitLifePct(U)` only, before any test: family `aknight`, 240 cases; no control separates it.
- R73p. [C] **Logged paths of the block** (the logged-path model): 269 decisions, 98 fork-free, 0 mismatches. Both arms met, each failing alone: `2.life<aip(1)`, `2.rchance(2)`, `3.chance(3)`, `3.melee`, `4.0<v14`, `4.dist<aip(5)`, `5.v14=0`, `7.chance(7)`; one arm met, failing alone: `2.Skill2>=0`, `2.st>=0`, `5.Skill1>=0`, `6.0<v14`, `8.dist<aip(8)` true; `2.hasstate`, `5.md0e>=4` false; stores failing alone: `set v14-=1`, `set v14=aip(6)`, `set v14=aip(6)#2`. [I] The untaken arm of each one-arm branch; the 171 forked decisions (the rev 6 ones; the 98 fork-free are rev 7's, with the aura state and `MonsterData+0x0E` given); `<` against `≤` but at the equal pairs met (`4.0<v14`, `4.dist<aip(5)`); what the model does not compare.

- R73i. [C] As data: kind 1, no `init`, no `alt`; 1 records (311 doomknight2); reach P; `aip` set 1,2,3,4,5,6,7,8; `aidel` 15/14/13; skills DoomKnightMissile, MonBoneArmor, MonBoneSpirit.
- R73l. [C] First boundary: 395 decisions compared (224 + 94 + 77), 0 mismatches, 1 first-call outcome.
- R73r. [I] Past the first boundary, a consistency check only: 171 of its own think's decisions in the rev 4 and rev 6 logs, 171 resumed, 0 mismatches, 0 stopped, 384 later calls matched, an unknown value deciding 250 of 384 later steps. The row is not under sentence H1.

#### R74. Row 74 `OblivionKnight`

**`aip`:** 1 the near distance (6/7/8, as data); 2 the hostile's distance (25–27, as data); 3 the curses' frame timer (500/350/200, as data); 4 chance of `Skill6` (50, as data); 5 chance to cast at the hostile (80/85/90, as data); 6 chance of `Skill3` (30, as data); 7 chance to wander near (30, as data); 8 the distance past which it may (9/10/11, as data).

```
1. s ← {knight 0, weak 0, r2 2500, knightD2 0x7FFFFFFF, weakD2 0x7FFFFFFF}  [I]
   AiUnitSearch(G, U, &s, AiOblivionKnightCb, 1)
2. if dist < aip(1):
     if Skill4 > 0 and Skill4 < Skills count and (st ← Skills[Skill4].auratargetstate) > 0 and not HasState(t, st):
       goto curse4
     if s.knight ≠ 0 and UnitDistSq(s.knight, t) > dist·dist and Walk(s.knight, 4): return
     Ovr(2, 50, 0)
     if StepAway(t, 10, 1): return
     if Skill3 ≥ 0: UseSkill3(t); return
3. h ← FindHostile(&d2, 0)                   ; d2: the frame word EBP−0x10, not set before the call
4. if h ≠ 0 and d2 < aip(2):
     if Skill6 > 0 and v14 < T and rchance(4): goto curse6     ; draw#1
     if chance(5):                                             ; draw#1 or #2
       if Skill3 ≥ 0 and rchance(6): UseSkill3(h); return      ; draw#2 or #3
       if Skill1 ≥ 0 and not (U is a monster with MonsterData+0x0E ≥ 4): UseSkill1(h); return
5. if dist > aip(8) and chance(7): WanderNear(t, 6); return
6. if D100() > 69: Idle(10); return
7. T56(t, 3, 0); return
curse4:  UseSkill4(t);  v14 ← T + aip(3); return               ; Decrepify
curse6:  MonAiUseSkill(Sk6mode, Skill6, t, 0, 0);  v14 ← T + aip(3); return   ; MonCurseCast
```

- R74d. [I] Step 7's third argument is `EDI`, which holds 0 there: `xor edi, edi` in the inline step's `adc`, after the MonStats record it held. So the walk reaches `MonAiMove` with flags 0.
- R74a. [I] Step 2's walk keeps a `doomknight1` between itself and the target: it walks to the knight when that knight is farther from the target than it is. Curse 6 is aimed at the event's target, while the other casts of step 4 go to the hostile. `Skill3` is `MonBoneSpirit`, `Skill1` `DoomKnightMissile`, gated as in row 73. Up to five draws.
- R74b. [C] **`AiOblivionKnightCb`:** a monster other than the unit, not in a death mode, with `Unit+0xC4` bit `0x02`, of base class 310 (`doomknight1`; `MonBaseId` in `[0, MonStats count)` and equal to `0x136`), within `UnitDistSq ≤` the block's bound, on the unit's side (`AlignSame02`) and of alignment 0: the nearest strictly nearer goes to `s.knight`, the nearest below 40 percent life to `s.weak`. No draw. (240 emulated cases, 0 mismatches, 18 controls failing, weak taken 25) [I] The bound is 2 500 (the think's block word), and the think reads `s.knight` only.
- R74c. [C] The entry call to the search only, with its block's five words, before any test: family `oknight`, 240 cases; no control separates it.

- R74i. [C] As data: kind 1, no `init`, no `alt`; 4 records (312 doomknight3, 701-702 dkmag1..dkmag2, 713 dkmag3); reach PU; `aip` set 1,2,3,4,5,6,7,8; `aidel` 15/14/13; skills DoomKnightMissile, MonBoneArmor, MonBoneSpirit, Decrepify, Bestow, MonCurseCast.
- R74l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R75. Row 75 `QuillMother`

**`aip`:** 1 melee: chance of A1 (60–95, as data); 2 out of melee range: chance to walk (50–90, as data); 3 the melee wait (16 down to 6, as data); 4 the wait out of it (15, as data).

```
1. if St3or19:                                                             [I]
     blk.kind ← 1;  blk+0x0C ← t ≠ 0 ? t.type : 6;  blk+0x10 ← t ≠ 0 ? t.guid : −1
     MonHelpBlock(U, &blk)
     if melee: SetModeAtUnit(4, t); return
     Walk(t, 7); return
2. if not melee:
     if chance(2): Walk(t, 7); return            ; draw#1
     Idle(aip(4)); return
3. if chance(1): SetModeAtUnit(4, t); return     ; draw#1
4. Idle(aip(3))
```

- R75a. [I] The block's order, type then guid, is the order row 14 `QuillRat` reads as `GameFindUnit(G, rec+0x0C, rec+0x10)`, and the reverse of row 65's; `+0x14` and `+0x18` are left as the stack held them. Whether the call reaches quill rat minions is Open questions.
- R75b. [C] The map, the group block's three words at `EBP−0x20` included: family `quill`, 240 cases, 137 with a draw, 5 boundaries; the controls fail the 17 and 75 that separate them.

- R75i. [C] As data: kind 1, no `init`, no `alt`; 5 records (313-317 quillbear1..quillbear5); reach ·; `aip` set 1,2,3,4; `aidel` 15/15/15; skills —.
- R75l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R76. Row 76 `EvilHole`

**`aip`:** 1 the spawn stock (10; 3 for `demonhole`, as data); 2 the frames between spawns (50; 25, as data).

- R76a. [I] No draw. The stock counts down on each placed spawn, and the hole dies in mode 0 when it is spent. The `demonhole`'s spawns get state 184 (`uberminion`). `Skill1`, `Nest`, is not read.
- R76b. [C] The map, the first event's `AiCtl+0x14/+0x18` and the re-armed `+0x14` before `SpawnClassByBase` included: family `ehole`, 240 cases, 5 boundaries; the Normal-column and compare controls fail the 75 and 67 that separate them. `SetMode`'s `Delay(20)` after it is not covered.

- R76i. [C] As data: kind 1, no `init`, no `alt`; 6 records (321-325 evilhole1..evilhole5, 711 demonhole); reach ·; `aip` set 1,2; `aidel` 15/15/15; skills Nest.
- R76l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R77. Row 77 `Trap-Missile`

**`aip`:** 1 the range (25/30/32, as data); 2 the shot count (1, as data); 3 the wait between (15, as data).

```
1. if t ≠ 0 and dist ≤ aip(1) and v14 < aip(2):                            [I]
     if v18 = 0:
       SetModeAtUnit(4, t);  v14 ← v14 + 1;  v18 ← 1; return     ; the shot, by A1
     v18 ← 0;  Idle(aip(3)); return
2. if U ≠ 0: U+0xC4 ← U+0xC4 | 0x20000
3. MonAiSetMode(0, 0, 0)
```

- R77a. [I] It shoots on every second event, then or when the target is gone or out of range it dies. Kind 2, so it also runs with no target; that path dies. No draw. Its records have no skill.
- R77b. [C] The map, `AiCtl+0x18` and `Unit+0xC4` before the boundaries included: family `tmissile`, 240 cases, 3 boundaries; the Normal-column and compare controls fail the 64 and 52 that separate them. The shot's stores come after its call and are not covered.

- R77i. [C] As data: kind 2, no `init`, no `alt`; 2 records (326 trap-firebolt, 330 trap-lightning); reach ·; `aip` set 1,2,3; `aidel` 15/15/15; skills —.
- R77l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R78. Row 78 `Trap-RightArrow`

**`aip`:** 1 the near bound (5, as data); 2 the far bound (15, as data); 3 the frame timer (30/23/18, as data); 4 the frames written to a word nothing reads (200, as data).

```
1. if dist < aip(1) or dist > aip(2): Idle(40); return                     [I]
2. UnitGetPos(U, &u);  UnitGetPos(t, &v)
3. a: i32 ← u.x − v.x                                  ; |a| by jns, neg
4. if |a| ≤ 2 and T > v14:
     v14 ← T + aip(3)
     if AiTrapArrowKind(G, U) ≠ 1: SetModeAtUnit(4, t); return
     if Skill1 ≥ 0: v1C ← T + aip(4);  UseSkill1(t); return   ; PoisonBallTrap
5. Idle(30)
```

`AiTrapArrowKind`, [C] with `UnitGetRoom`, `RoomGetLevelId`, `MonRegionGet` and `RNG_RandLoHi` run whole, 240 cases, 0 mismatches: kept 115, 0 below level 40 76, drawn 49; 6 of 7 controls fail:

```
lvl ← RoomGetLevelId(UnitGetRoom(U))
r ← MonRegionGet(G + 0xF0, lvl)
if r+0x2D4 < 0:
  r+0x2D4 ← lvl < 40 ? 0 : RNG_RandLoHi(U's seed, 0, 3)     ; 0, 1 or 2: one step, low mod 3
return r+0x2D4
```

- R78a. [I] The trap shoots when the target is within 2 of its own **x** (the first word of `UnitGetPos`), between `aip(1)` and `aip(2)`, and its timer has passed; the timer re-arms before the kind is read. `v1C` is read by nothing in the function. Skill2 is not read.
- R78c. [C] The map, the kind helper and the region word included (the region word before and after, the step and its `mod 3`, the `lvl < 40` edge): family `trarrow`, 240 cases, 21 with a draw, 4 boundaries; the Normal-column, compare and `mod 4` controls fail the 71, 53 and 14 that separate them.
- R78p. [C] **Logged paths of the block** (the S1b model): 199 decisions, 195 fork-free (the AID positions for `UnitGetPos`), 0 mismatches. Step 1 (120 equal pairs at `aip(1)`), step 3, step 4's `|a| > 2` and timer-not-passed arms, step 5. [I] The shots, and the 4 decisions that fork on the region word.

- R78i. [C] As data: kind 1, no `init`, no `alt`; 1 records (327 trap-horzmissile); reach ·; `aip` set 1,2,3,4; `aidel` 15/15/15; skills PoisonBallTrap, CursedBallTrapRight.
- R78l. [C] First boundary: 305 decisions compared (110 + 14 + 181), 0 mismatches, 2 first-call outcomes. Outside it: 20 decisions of the row's classes with no model (another think, a state row, or a case the model refuses).
- R78r. [I] Past the first boundary, a consistency check only: 199 of its own think's decisions in the rev 4 and rev 6 logs, 199 resumed, 0 mismatches, 0 stopped, 8 later calls matched, an unknown value deciding 4 of 8 later steps. The row is not under sentence H1.

#### R79. Row 79 `Trap-LeftArrow`

**`aip`:** as row 78.

```
1. if dist < aip(1) or dist > aip(2): Idle(40); return                     [I]
2. UnitGetPos(U, &u);  UnitGetPos(t, &v)
3. a: i32 ← u.y − v.y                                  ; |a| by jns, neg
4. if |a| ≤ 2 and T > v14:
     v14 ← T + aip(3)
     if AiTrapArrowKind(G, U) ≠ 1: SetModeAtUnit(4, t); return
     if Skill1 ≥ 0: v1C ← T + aip(4);  UseSkill1(t); return
5. Idle(30)
```

- R79a. [C] Row 78's code with **y** for x: the x-axis control fails 14 of 53, row 78's y-axis control 123 of 199, y being the second word of `UnitGetPos`. [I] The kind helper is R78's.
- R79b. [C] The map as row 78's: family `tlarrow`, 240 cases, 24 with a draw, 4 boundaries; the controls fail the 78, 62 and 20 that separate them.
- R79p. [C] **Logged paths of the block** (the S1b model): 53 decisions, 39 fork-free, 0 mismatches; raised as row 78's block on `y`. [I] The kind and the shots (14 fork).

- R79i. [C] As data: kind 1, no `init`, no `alt`; 1 records (328 trap-vertmissile); reach ·; `aip` set 1,2,3,4; `aidel` 15/15/15; skills PoisonBallTrap, CursedBallTrapLeft.
- R79l. [C] First boundary: 79 decisions compared (40 + 18 + 21), 0 mismatches, 2 first-call outcomes. Outside it: 15 decisions of the row's classes with no model (another think, a state row, or a case the model refuses).
- R79r. [I] Past the first boundary, a consistency check only: 53 of its own think's decisions in the rev 4 and rev 6 logs, 53 resumed, 0 mismatches, 0 stopped, 28 later calls matched, an unknown value deciding 14 of 28 later steps. The row is not under sentence H1.

#### R80. Row 80 `Trap-Poison`

**`aip`:** 1 the range (20, as data); 2 the shot count (1, as data); 3 the wait (15, as data).

```
1. if t ≠ 0 and dist ≤ aip(1) and v14 < aip(2):                            [I]
     if v18 = 0 and Skill1 ≥ 0:
       UseSkill1(t);  v14 ← v14 + 1;  v18 ← 1; return     ; PrimePoisonNova
     v18 ← 0;  Idle(aip(3)); return
2. if U ≠ 0: U+0xC4 ← U+0xC4 | 0x20000
3. MonAiSetMode(0, 0, 0)
```

- R80a. [I] Row 77's shape with a skill for the shot; a `Skill1 < 0` falls to the idle branch with `v18 = 0`. Kind 2, so it also runs with no target; that path dies. No draw.
- R80b. [C] The map as row 77's: family `tpoison`, 240 cases, 3 boundaries; the controls fail the 62 and 56 that separate them.

- R80i. [C] As data: kind 2, no `init`, no `alt`; 1 records (329 trap-poisoncloud); reach ·; `aip` set 1,2,3; `aidel` 15/15/15; skills PrimePoisonNova.
- R80l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R87. Row 87 `Trap-Melee`

**`aip`:** 1 melee: chance of A1 (70, as data); 2 the wait (15, as data).

```
1. if not melee: Idle(40); return                                          [I]
2. if chance(1): SetModeAtUnit(4, t); return     ; draw#1
3. Idle(aip(2))
```

- R87a. [C] The map, family `tmelee`, 240 cases, 117 with a draw, 3 boundaries; the controls fail the 13 and 71 that separate them.

- R87i. [C] As data: kind 1, no `init`, no `alt`; 1 records (354 trap-melee); reach ·; `aip` set 1,2; `aidel` 15/15/15; skills —.
- R87l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R92. Row 92 `Trap-Nova`

**`aip`:** as row 80.

```
1. if t ≠ 0 and dist ≤ aip(1) and v14 < aip(2):                            [I]
     if v18 = 0 and Skill1 ≥ 0:
       UseSkill1(t);  v14 ← v14 + 1;  v18 ← 1; return     ; Trap Nova
     v18 ← 0;  Idle(aip(3)); return
2. if U ≠ 0: U+0xC4 ← U+0xC4 | 0x20000
3. MonAiSetMode(0, 0, 0)
```

- R92a. [I] Row 80's code, with this row's kind 1, so the think runs only with a target. No draw.
- R92b. [C] The map as row 77's: family `tnova`, 240 cases, 3 boundaries; the controls fail the 62 and 44 that separate them.

- R92i. [C] As data: kind 1, no `init`, no `alt`; 1 records (369 trap-nova); reach ·; `aip` set 1,2,3; `aidel` 15/15/15; skills Trap Nova.
- R92l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

### Batch 5: summons

#### R67. Row 67 `NecroPet`

Tier AI: [machinery § T67](../machinery/), not repeated here.

#### R84. Row 84 `BoneWall`

No `aip` read. `Skill1`'s `Param2` is its only table input.

```
init:                                                                      [C]
  if M ≠ 0 and (s: i16 ← Skill1) > 0:                ; movzx; test ax,ax; jle
    rec ← s < Skills count ? Skills + 0x23C·s : 0
    v14 ← T + (rec ≠ 0 ? rec.Param2 : 0)
think:                                               ; compare signed      [C]
  if v14 < T: MonAiSetMode(0, 0, 0)
  else: Idle(15)
```

- R84a. [I] The bone wall's life is its `Skill1`'s `Param2` in frames from its AI init. A `Sk lvl` of 0 on the record feeds no level this row reads.
- R84b. [C] Families `bwinit` (return, 240 cases; the compare and unsigned-`Skill1` controls fail the 51 and 94 that separate them) and `bwall` (240 cases, 2 outcomes; the compare control fails the 44 it separates).

- R84i. [C] As data: kind 0, `init`, no `alt`; 1 records (344 bonewall); reach S; `aip` set —; `aidel` 15/15/15; skills Bone Wall.
- R84l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R86. Row 86 `Hydra`

No `aip` read: the draw's bound is the constant 60.

```
if v14 < T: MonAiSetMode(0, 0, 0); return            ; signed              [C]
if t ≠ 0 and dist < 25 and D100() < 60:              ; one step, only when t is set and dist < 25
  UseSkill1(t); return
Idle(10)
```

- R86a. [I] The hydra's `v14` is not set by its row, which has no init: its writer is Open questions.
- R86b. [C] Family `hydra`, 240 cases, 121 with a draw, 3 outcomes; the `≤` and compare controls fail the 21 and 58 that separate them, and `v14 < T`, `dist < 25` and the draw are each met at equality.

- R86i. [C] As data: kind 2, no `init`, no `alt`; 3 records (351-353 hydra1..hydra3); reach S; `aip` set —; `aidel` 15/15/15; skills HydraMissile.
- R86l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R101. Row 101 `AssassinSentry`

**`aip`:** 1 chance to shoot (100 in all four records, as data, so the draw never refuses); 2 the idle after a refused draw; 3 the idle with no near hostile; 4 the hostile's distance (15, 25, 25, 13, as data).

`O` below is `MonsterOwner(U)`.

```
init:  v14 ← T;  v18 ← −1                                       [C]

charge(ctx, use) → 1 when the sentry was ended:                            [I]
  if O = 0 or UnitGetRoom(O) = 0 or InTown(O): MonAiSetMode(0, 0, 0); return 1
  if v18 < 0:
    if Skill1 is not a Skills row: goto end
    sk ← SKILLS_GetUnitSkill(U, Skill1)
    if sk = 0: MonAiSetMode(0, 0, 0); return 1
    v18 ← EvalCalc(U, calc4, Skill1, SkillLevel(U, sk, 1))
  if v18 > 0:
    if use: v18 ← v18 − 1
    return 0
  end: MonAiSetMode(0, 0, 0); return 1

think:                                                                     [I]
  if charge(ctx, 0): return
  sk ← SKILLS_GetUnitSkill(U, Skill1)
  if sk = 0: MonAiSetMode(0, 0, 0); return
  if HasState(U, 12): State(12, 0)
  h ← FindHostile(&d, &m)
  if h = 0 or d ≥ aip(4): Idle(aip(3)); return
  if Range(100) ≥ aip(1): Idle(aip(2)); return           ; draw#1
  if charge(ctx, 1): return
  UNIT_CancelEvents(2, 0)
  MonAiUseSkill(SkillMode(sk), Skill1, h, 0, 0)
```

- R101a. [I] `v18` is the shot count from `calc4` at the sentry's own level. The row uses `Skill1` only.
- R101b. [C] The init's two stores and return, and the think's entry call only: `charge` reaches `MonsterOwner` with `ECX` the unit, before any test. Families `sentinit`, `asentry`, 240 cases each; no control separates them.

- R101i. [C] As data: kind 0, `init`, no `alt`; 4 records (410-412 wakeofdestruction..lightningsentry, 415 infernosentry); reach S; `aip` set 1,2,3,4; `aidel` 15/15/15; skills Wake Of Destruction Sentry, BoltSentry, Shock Field, sentry lightning, mon inferno sentry, Wake of Fire Sentry.
- R101l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R102. Row 102 `BladeCreeper`

No `aip` read. The two points come from the head record of its parameter list.

```
init:  v14 ← −1;  v18 ← 1;  v1C ← 0                             [C]

1. s ← Skill1                                                              [C]
   if s < 0 or s ≥ Skills count or rec(s) = 0: MonAiSetMode(0, 0, 0); return
   sk ← SKILLS_GetUnitSkill(U, s)
   if sk = 0: MonAiSetMode(0, 0, 0); return
2. lvl ← SkillLevel(U, sk, 1)                                              [I]
3. if v14 < 0: v14 ← EvalCalc(U, calc4, s, lvl) + T
4. if T > v14: MonAiSetMode(0, 0, 0); return
5. if v1C = 0 and 0 ≤ srvmissilea < Missiles count:
     p ← O ≠ 0 ? O : U
     m ← MissileCreateAt(G, p, s, lvl, srvmissilea, U.x, U.y)     ; p the creating unit (EDX)
     if m ≠ 0:
       UnitSetOwner(m, U)
       UnitAddStat(U, 19, PlayerBaseToHit(p), 0)
       UnitAddStat(U, 119, p.stat119 + the mastery bonus of p's weapon, 0)
     v1C ← 1
6. prm ← Head;  if prm = 0: Idle(3); return
7. Ovr(15, 0, 20)
   MonAiWalkToPointOrStop to the point v18 ≠ 0 ? (prm+0x14, prm+0x18) : (prm+0x0C, prm+0x10)
   if refused: v18 ← not v18;  walk to the other
   if both refused and not WanderNear(O, 5): Idle(5)
```

- R102c. [I] The missile's creating unit is `p`, the owner when there is one (`EDX` = `EDI`), with `U` as the missile's owner set after it.
- R102a. [I] The creeper shuttles between the two points of its parameter record until its `calc4` life passes. The stats 19 and 119 go on the missile's owner chain (the creeper), from the owner's to-hit. `Skill1` is sign-extended (`movsx`).
- R102b. [C] The init and the Skill1 bound only: families `bladeinit` and `blade`, 240 cases each; the compare and unsigned-`Skill1` controls fail the 12 and 46 that separate `blade`.

- R102i. [C] As data: kind 0, `init`, no `alt`; 1 records (413 bladecreeper); reach S; `aip` set —; `aidel` 15/15/15; skills Blade Sentinel.
- R102l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R103. Row 103 `InvisoPet`

**`aip`:** 1 half the side of the square around the owner; 2 the frames between teleports.

```
1. O ← MonsterOwner(U);  r ← aip(1);  om ← O ≠ 0 ? O.mode : 0              [I]
2. if om = 3: r ← r ÷ 2                         ; owner running; signed, toward zero
3. if T ≤ v14 and om ≠ 3 and not St3or19: Idle(aip(2)); return
4. x ← O.x + R(2r) − r                          ; one inline step
5. y ← O.y + R(2r) − r                          ; one inline step
6. MonAiUseSkill(9, 292, 0, x, y);  v14 ← T + aip(2)    ; 292 Teleport 2
```

- R103a. [I] `R(n)` is one inline step, `& (n−1)` when `n` is a power of 2, else mod `n`; 0 for `n < 1`. Two steps per teleport. `r ÷ 2` is `cdq; sub; sar`. With no owner the function reads `*O` (`mov eax,[ebx]`), a fault on that path: whether it is reached is Open questions.
- R103b. [C] The entry call `MonsterOwner` only, before any test: family `inviso`, 240 cases; no control separates it.

- R103i. [C] As data: kind 0, no `init`, no `alt`; 1 records (414 invisopet); reach ·; `aip` set 1,2; `aidel` 15/15/15; skills —.
- R103l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R104. Row 104 `DeathSentry`

**`aip`:** 2 the idle; 3 chance of `Skill2`; 4 the hostile's distance for it.

`init` and `charge` are row 101's.

```
1. if charge(ctx, 0): return                                               [I]
2. sk ← SKILLS_GetUnitSkill(U, Skill1);  lvl ← SkillLevel(U, sk, 1)
   if sk = 0 or lvl < 1: return
3. h ← FindHostile(&d, &m)
   if h = 0: Idle(aip(2)); return
4. c ← CorpsePickNear(h; Skill1, lvl);  r ← SkillParam3ByLevel(Skill1, lvl) ÷ 2     ; around the hostile; signed, toward zero
5. if c ≠ 0 and c.guid ≠ v14 and EdgeDist(h, c) < r:
     if charge(ctx, 1): return
     v14 ← c.guid
     MonAiUseSkill(9, Skill1, c, 0, 0); return
6. if d < aip(4) and Range(100) < aip(3):              ; draw#1
     if charge(ctx, 1): return
     MonAiUseSkill(14, Skill2, h, 0, 0); return
7. Idle(aip(2))
```

- R104a. [I] `v14` is the last corpse it exploded, so it never explodes the same corpse twice running. Its modes 9 and 14 are passed as immediates.
- R104b. [C] The entry call only, as row 101's: family `dsentry`, 240 cases; no control separates it.

- R104i. [C] As data: kind 0, `init`, no `alt`; 1 records (416 deathsentry); reach S; `aip` set 1,3,4; `aidel` 15/15/15; skills mon death sentry, death sentry ltng.
- R104l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R105. Row 105 `ShadowWarrior`

**`aip`:** 1 the target's distance limit; 2 the owner's distance limit; 3 the base of the plain-attack chance; 4 the amount that decays `v18`; 8 three parameters by column: `aip8[n]` the skill read at init (268), `aip8[m]` the floor of the reset, `aip8[h]` the cap.

```
init:                                                         [I]
  v1C ← 1
  O ← MonsterOwner(U)
  if O ≠ 0: v1C ← the owner's level in skill aip8[n]     ; SKILLS_GetUnitSkill(O, aip8[n]), 268

think:                                                                     [I]
1. UNIT_CancelEvents(2, 0)
2. if O = 0: Idle(100); return
3. cap ← clamp(aip8[h], 1, 256)
   v18 ← v18 + (−1 − aip(4))
   if v18 < 0 or v18 > 64·cap: v18 ← 0
4. if dist > aip(1) or UnitEdgeDistance(U, O) > aip(2): t ← 0
5. if AiPetGuard(t, O, melee, ctx, 0, 6): return
6. if t = 0: Idle(25); return
7. r ← O's right skill;  l ← O's left skill;  if r = 0 or l = 0: Idle(25); return
   add r's and l's ids to U at AiShadowWarriorSkLvl               ; v1C ÷ 3 + level ÷ 2, at least 1
   find both on U;  if either is missing: Idle(25); return
8. pick ← r when Range(2) = 0, else l                             ; draw#1
   p ← clamp(aip(3) − 2·max(v1C, 1), 5, 100)
   if melee and Range(100) < p: pick ← U's skill 0, id 0          ; draw#2, its attack, only in melee
9. if not AiShadowSkillRoll(pick):
     pick ← r when pick was l, else l                             ; after a skill-0 pick, l
     if not AiShadowSkillRoll(pick):
       pick ← U's skill 0;  when missing: add it at level 1 and find it again
10. if pick = 0: Idle(25); return
11. if RangeType(pick) = 1 and not melee: RunToUnit(t); return
    MonAiUseSkill(SkillMode(pick), id, t, 0, 0)
    v14 ← T + 18 + delay ÷ 3                    ; delay: the record's +0x190 calc at max(level, 1), signed, truncating
```

`AiShadowSkillRoll(owner, skill, id, melee, ctx)`, 0, 1 or 3 draws per tried skill (id 0: one, with no draw at the fourth step; refused at the third draw; accepted after three), the fourth argument `melee` never read (`ret 0x14`, no `[ebp+0x14]`), [C] run whole, 240 cases, 0 mismatches, 12 of 13 controls failing; [I] `AiShadowSkillFits` past its declared paths and the bonus-level branch of `SKILLS_GetSkillLevel`:

- R105a. [I] The block is read from the code; the source-file strings at the skill adds are `.\Ai\AiThink4.cpp` lines 0xB59 and 0xB5A. `AiPetGuard` and `PetMove` are [T67's](../machinery/).
- R105b. [C] The init's store of `v1C` and its `MonsterOwner` call; the think's first call `UNIT_CancelEvents(2, 0)`, and no more: families `swinit`, `swarrior`, 240 cases each; no control separates them.

- R105i. [C] As data: kind 2, `init`, no `alt`; 1 records (417 shadowwarrior); reach S; `aip` set 1,2,3,4,8; `aidel` 15/15/15; skills Fists of Fire, Blade Fury, Blades of Ice, Dragon Claw, Dragon Flight, Claws of Thunder, Attack.
- R105l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R106. Row 106 `ShadowMaster`

**`aip`:** 2 three parameters by column (`aip2[h]` squared the owner's distance, `aip2[m]` a target's distance that holds it, `aip2[n]` the scoring draw's range, 20 for `shadowmaster`, as data); 3 the base of the plain-attack chance; 8 `aip8[n]` the skill read at init (279). `aip1` is read by step 13's terms: `aip1[n]` squared in cases 4 and 12, `aip1[m]` added in cases 4, 12 and 13, `aip1[h]` in the `state` word and case 4. Each of these is the column itself, read `movsx` from 16 bits, and is not indexed by the game's difficulty (`shadowmaster` has 20, 10, 10, as data).

```
init:                                                         [C]
  v14 ← 0;  v18 ← 0;  v1C ← 1;  O ← MonsterOwner(U)
init, after that call:                                                     [I]
  if O is a player (O+0x00 = 0): v1C ← the owner's level in aip8[n]
  add the skill-0 entry at level 1 when missing;  set the left and right skills to 0
  copy every skill of the unit's class (count, per index)
    that AiShadowSkillAllowed admits, at AiShadowMasterSkLvl(O, v1C)       ; level ÷ 2 + v1C ÷ 2, in [1, 24]

think, entry:                                                              [C]
  if U+0xA8 = 0: Idle(100); return                                         ; the skill list head
  O ← MonsterOwner(U)

think:                                                                     [I]
1. UNIT_CancelEvents(2, 0)
2. if O ≠ 0 and DistSq(U, O) > aip2[h]²:
     if AiPetGuard(0, O, melee, ctx, 0, 6): return
3. if v14 > 0:                                  ; a pending sequence, set at step 14
     t ← UNIT_GetTargetUnit(U) when non-zero
     if t = 0: v14 ← 0;  v18 ← 0
     else:
       v14 ← v14 − 1
       if Use(v18, melee, t): return
4. if dist > aip2[m]: t ← 0                     ; dist is the event's
5. if t = 0: for each of U's skills whose record exists:
     aitype 1, aurastate > 0, U lacks that state:
       if AiStateGroupHeld(U, aurastate) and Range(100) ≥ 4: next    ; draw only when held
       if D100() ≥ 60: next                                          ; inline step
       s ← the skill on U;  if s = 0: next
       if RangeType(s) = 1 and not melee: x ← RunToUnitFlags(0, 4)
       else: x ← MonAiUseSkill(SkillMode(s), id, 0, 0, 0)
       if x ≠ 0: return
     aitype 6, no left skill set:
       if D100() < 20: it becomes the left skill                     ; inline step, no command
6. o ← 0
   if O ≠ 0:
     g ← UNIT_GetTargetUnit(O);  if g ≠ 0, not dead and hostile to U: t ← g;  o ← g
     if DistSq(U, O) ≤ 144 and AiPetGuard(t, O, melee, ctx, 0, 6): return
7. if t = 0: Idle(25); return
8. p ← clamp(aip(3) − 2·max(v1C, 1), 5, 100)
   if melee and Range(100) < p and Use(0, melee, t): return          ; draw only in melee
9. AiUnitSearch(blk, AiShadowMasterCb, 1)       ; blk+0 = O, no draw; R106b
10. if not melee:
      if o ≠ 0: t ← o
      else if the hostile nearest O exists: t ← it
      else if a priority target exists and DistSq(U, it) < 1024: t ← it
      unless AiShadowPriorityTarget(U, t):
        w ← MonsterOwner(t);  if w ≠ 0, not dead and DistSq(U, w) < 1024: t ← w
11. n ← blk's count of hostiles within 10 of U  ; n10; step 13's inputs are read here, once, before this test
    if n > 3 and Range(32) < 2·n:
      if O ≠ 0 and DistSq(U, O) > 36: RunToUnit(O); return
      if StepAwayXY(t, 8, 1): return
12. L[0] ← (t, skill 0, score 0, 0, 0);  k ← 1
13. acc ← 0
    for each node of U's skill list:             ; first ← list+4, next ← node+4
      id ← SkillNodeId(node);  level ← SKILLS_GetSkillLevel(U, node, 1)
      if id < 0, id ≥ the Skills count or the record is null: next   ; no draw
      x ← t;  sc ← 0
      base ← aibonus + reqlevel ÷ 4 + level      ; +0x232 and +0x174, s16; ÷ truncates
      if EType is in its map: base ← base + STATS_GetUnitStat(t, stat, 0) ÷ −10     ; ÷ truncates; t, not x
      run the case of aitype (+0x230, read as a byte)                ; below; none outside 1..13
      if sc > L[k − 1].score (signed): L[k] ← (x, id, sc, 0, 0);  k ← k + 1
14. while k > 0:                                 ; L[0] is walked last, with skill 0
      k ← k − 1;  one inline step                ; the seed's new low word
      ; the list's two zero words go to Use's last two, and from there to MonAiUseSkill's last two
      if low word & 3 ≠ 0 and Use(L[k].id, InMeleeRange(U, L[k].target, 0), L[k].target):
        if the id's record has +0x2E = 19: v18 ← the id;  v14 ← 25
        return
15. if t ≠ 0 and Use(0, InMeleeRange(U, t, 0), t): return
16. Idle(15)

Use(id, m, x), AiShadowUseSkill:                                           [I]
  if x ≠ 0 and (x = O or x = U): return 0
  s ← the skill on U;  if s = 0: return 0
  if x ≠ 0 and (x+0xC4 bit 0x04 is clear or U's room is a town): return 0
  if RangeType(s) = 1 and not m: return RunToUnitFlags(x, 4)
  return MonAiUseSkill(SkillMode(s), id, x, 0, 0)
```

**Step 13's inputs.** [I] Copied once, before step 11's test, from what steps 9 and 10 left: nothing here is recomputed per skill except `acc`. `blk`'s `+8` and `+0x14` start at 0x7FFFFFFF, every other word at 0 and `+0` at `O`. "Hostile" here is the callback's whole gate, R106b: `x` is not `U`, not null, not dead, has `+0xC4` bit `0x04`, and returns non-zero. An allied monster of a base the `allies` word counts returns there and enters no other word.

| Name | Word | What it holds |
| --- | --- | --- |
| `melee` | `EBP−0x20` | the event's word at `ctx+0x18`, read at entry and never recomputed, though steps 3, 4 and 6 can change `t` (step 10 changes it only with this 0). Cases 4 and 12 read this; step 14 calls `InMeleeRange` afresh |
| `life` | `EBP−0x38` | `UnitLifePct(U)`: `100·(stat 6 >> 8) ÷ (max >> 8)`, 0 when the maximum is 0 |
| `dsq` | `EBP−0x24` | `DistSq(U, t)`, `t` after step 10 |
| `state` | `EBP−0x40` | 1 when `aip1[h] > 0` and `UnitHasStateInMaskDC(U)` is non-zero; else 0, with no call when `aip1[h] ≤ 0` |
| `clear` | `EBP−0x28` | 1 when `UnitLineBlocked(U, t, 4)` returned 0, else 0 |
| `near` | `blk+8` | smallest `DistSq(U, x)` of a hostile `x` within 1024; 0x7FFFFFFF with none |
| `n10` | `blk+0xC` | hostiles with `DistSq(U, x)` ≤ 100 |
| `nearO` | `blk+0x10` | the hostile of the search nearest `O`, at any distance; 0 with no owner or none |
| `nO` | `blk+0x18` | hostiles with `DistSq(O, x)` ≤ 100 |
| `n32` | `blk+0x1C` | hostiles with `DistSq(U, x)` ≤ 1024 |
| `allies` | `blk+0x20` | allied monsters of base 410 to 416 but 414, counted before the hostile words |
| `acc` | `EBP−0x30` | starts 0 at this think, carried from record to record |

`UnitHasStateInMaskDC` tests the states of DataTables `+0xDC`, flag bit 4 `pgsv`; the stock rows with `pgsv` are the six `progressive_*` states, 122 to 127. [C] The stock rows, `.txt` and `.bin`; [I] the `+0xDC` mask and its bit 4

**The `EType` map.** [I] `+0x1DC`, a byte (the byte table, the jump table):

| Byte | 0 | 1 | 2 | 3 | 4 | 5 | 12 | 6 to 11, above 12 |
|---|---|---|---|---|---|---|---|---|
| Stat of `t` | 36 | 39 | 41 | 37 | 43 | 45 | 43 | none: a resistance of 0 |

A blank cell is byte 0, so it reads stat 36. `stun` is byte 9 and reads nothing. The stat's arguments are `(t, stat, 0)`, the target of the think and not the case's `x`. The division is a signed division by −10 truncating toward zero: 25 gives −2 and −25 gives 2.

**Step 13's cases.** `sc` starts at 0 on each record, so a `drop` leaves it at 0 and 0 is never kept: `L[0]`'s score is 0 and the test is strict. A negative `sc` is never kept either. `Draw` is `Range(aip2[n])` on `U`'s seed: one step unless `aip2[n]` ≤ 0, which returns 0 with no step. `Keep(v)` is `sc ← v`. A draw comes before the list's test, so a record that does not beat the last has still drawn. The comparisons are signed `cmp`s of the words above. [I]

```
case 1, x ← U:                                               [I]
    s ← aurastate (+0x80, s16)
    if s > 0 and U lacks state s: drop                     ; no draw; step 5's test is the reverse
    if near ≤ 25: base ← base − 6
    base ← base − 10 if AiStateGroupHeld(U, s), else base + 10
    Keep(Draw + base)

case 2, x ← t:
    if aurastate > 0 and U has it: drop
    if auratargetstate (+0x82) > 0 and t has it: drop
    if near ≤ 25: base ← base − 10
    Keep(Draw + base)

case 3, x ← t:
    if allies > 5: base ← base − 2·allies
    if near ≤ 25: base ← base − 7
    if n32 < 3: base ← base − 10
    Keep(Draw + base + 3·n32 − 9)

case 4, x ← t:
    if dsq > aip1[n]²: base ← base − 10
    base ← base + aip1[m]
    if melee or dsq ≤ 25: base ← base + 10
    if progressive (+4 bit 2):
        Aura(); may drop
        Keep(Draw + base + aip1[h])
    else if aip1[h] > 0 and state = 0:
        Keep(Draw + base − 10)
    else:
        Keep(Draw + base + 4·acc + 3)

case 5 and case 11, x ← t:
    if clear = 0: drop
    if srvmissile (+0x46) < 0 and srvmissilea (+0x48) ≥ 0 and its Missiles record exists:
        r ← the record's Range (+0x96, s16) − 1
        if dsq ≥ r²: drop
    if near ≤ 25: base ← base − 5
    if dsq ≤ 25: base ← base − 5
    if state ≠ 0: base ← base − 5
    case 5:  Keep(Draw + base)
    case 11: Keep(Draw + base + 3·n32)

case 6, never kept:
    v ← Range(100)
    if v < (20 when U has no left skill, else 6): UnitSetLeftSkill(U, id, −1)
    drop

case 7:
    v ← Draw + base
    if life > 66: drop
    x ← 0
    if O = 0: Range(40); Range(40)                       ; both results discarded
    Keep(v + 10, or v + 20 when life < 45)

case 8, x ← U:
    v ← Draw + base
    if life > 66: drop
    Keep(2·v, or 4·v when life < 45)

case 9, case 10: drop, no draw                           ; both entries

case 12, x ← t:
    if t is a monster (UnitGetType = 1):
        r ← UnitMonRecord(t);  if r = 0: drop
        if byte r[+0xA0 + d] < 25 (unsigned): drop       ; d the game's difficulty
    if dsq > aip1[n]²: base ← base − 10
    base ← base + aip1[m]
    if melee or dsq ≤ 25: base ← base + 10
    if progressive: Aura(); may drop                     ; case 4's else has no counterpart here
    v ← Draw + base
    if life < 75: v ← v + 8
    if life < 50: v ← v + 12
    Keep(v)

case 13, x ← t:
    base ← base + aip1[m]
    if aip1[h] > 0 and state = 0: base ← base − 5
    else: base ← base + acc
    if (life < 50 or n10 > 3) and nearO ≠ 0 and nO < 4 and DistSq(U, nearO) > 25:
        Keep(Draw + base + 20);  x ← nearO
    else:
        if dsq < 25: drop
        if dsq > 324: base ← base + 10
        Keep(Draw + base)

Aura(), cases 4 and 12:
    s ← aurastate
    if s > 0 and U has it and UNIT_FindStatListByState(U, s) ≠ 0:
        v ← StatListGetBaseStat(the list, aurastat1 (+0x54, s16), 0)
        acc ← acc + v
        if v ≥ 3: drop                                   ; acc keeps the value
```

**The draws per record, in step 13.** [I] Every draw is on `U`'s seed. `aitype`s marked stock are those the Skills table has.

| `aitype` | Draws | Fails to draw when |
|---|---|---|
| 1, stock | one `Draw` | `aurastate` > 0 and `U` lacks it |
| 2, stock | one `Draw` | either state test drops it |
| 3, stock | one `Draw` | never |
| 4, stock | one `Draw` | `Aura` drops it |
| 5, 11, stock | one `Draw` | `clear` = 0, or beyond the missile's `r` |
| 6 | one `Range(100)` | never |
| 7 | one `Draw`, then two `Range(40)` with no owner and `life` ≤ 66 | never |
| 8 | one `Draw` | never |
| 9, 10 (10 stock) | none | always |
| 12, stock | one `Draw` | the monster test or `Aura` drops it |
| 13, stock | one `Draw` | no `nearO` choice and `dsq` < 25 |
| anything else, or no `aitype` | none | always |

- R106b. [C] `AiShadowMasterCb` on a live unit with `+0xC4` bit `0x04`, hostile to `U`: with `blk+0` set, `DistSq(O, unit)` ≤ 100 counts `blk+0x18`, and the smallest is kept at `blk+0x10` and `blk+0x14`; then within `DistSq(U, unit)` ≤ 1024: `blk+0x1C` counts, ≤ 100 counts `blk+0xC`, the smallest is kept at `blk+4` and `blk+8`, and a unit passing `AiShadowPriorityTarget` goes to `blk+0x24`. An ally (`AlignSame02`) of base 410 to 416 but 414 only counts `blk+0x20`, by the callback's byte table. 240 emulated cases, 0 mismatches, 21 controls failing; the seven allies and `AiShadowPriorityTarget` (5) all met.
- R106c. [C] Families `sminit` and `smaster` (the think, shared with row 143), 240 cases each; `smaster` has 2 outcomes, `Idle` 116 and `MonsterOwner` 124; no control separates them.
- R106d. [I] **Self-targets cannot command.** A record of case 1 or 8 is kept with `x = U`, and `Use`'s first test returns 0 for `x = U`. So in step 14 such a record costs a seed step and may hold the top of the list against lower ones, and commands nothing. `aitype` 1 skills command only in step 5.
- R106e. [C] **Wrap.** The bounds as computed below, the `lea`, case 8's `lea esi,[eax+eax]`/`add esi,esi` and the signed compare; no Skills row has `aitype` 8. [I] `aip1[n]²` and `r²` fit: the largest magnitudes are (−32 768)² = 2³⁰ and (−32 769)² = 1 073 807 361. `|res ÷ −10|` ≤ 214 748 364. All of this is 32-bit `add`, `lea` and `imul` with no check. Past a sum with `level` near 2³¹, three products can wrap: case 8's `4·v` (`2·v` doubled by `add esi, esi`), where `v` = 2²⁹ − 1 fits and 2²⁹ wraps to −2³¹, and on the low side −2²⁹ gives −2³¹ exactly and −2²⁹ − 1 wraps; case 8's `2·v` alone, from `v` = 2³⁰; and case 4's `4·acc + 3` (`lea`), whose `acc` sums `StatListGetBaseStat` returns with no bound in this code. A wrapped sum is then compared signed. None is reached by stock values as read here: the `level` of a copied skill is in [1, 24] by `AiShadowMasterSkLvl`, no stock skill has case 8, and `acc` sums the progressive charges.
- R106f. [C] **The list's room.** Records of 20 bytes at `EBP−0x444 + 20k`: 48 fit above `EBP−0x84`; 32 Skills rows have an `aitype`. [I] Nothing limits `k` in the code, and a record needs an `aitype`, so with the skill ids of a list distinct a stock unit's `k` stays at or below 33 (distinctness is not read here).
- R106g. [I] **A check of the reading, and no more.** The think's instructions, run in an interpreter, and a model of the block above give the same words over 6 000 synthetic cases, with 0 mismatches; 98 of 99 one-term controls fail, the 99th being a chance of 100 against 101, which cannot. Every callee is a stub that returns what the case declares, `RNG_Range` included, along with the search's callback, `AiStateGroupHeld` and `Use`: the check says the pseudocode and the instructions are the same map from those returns, not what the callees return in play. `use1_held`'s lower side, step 5's `Range(100) ≥ 4` against `≥ 3`, is separated by no case and rests on its instruction. 6 of the think's 142 conditional branches went one way only:. It raises nothing. (§ 1.6)
- R106h. [C] As data: the stock Skills table has only `aitype` 1, 2, 3, 4, 5, 10, 11, 12 and 13, 32 rows, so no stock skill reaches cases 6, 7, 8 and 9. A blank `EType` is byte 0 in 257 of 357 rows.
- R106j. [C] **Widths and case 7's calls.** The `progressive` test reads `+4` bit 2 through the mask table, whose entry 2 is 4. `aitype` is read as a byte where the table doc gives `u16`; it is at most 13 in all 357 rows, `.txt` = `.bin`, so nothing turns on the high byte. [I] Case 12's byte is the `Drain` cell of the difficulty. In case 13, `nearO` adds 20 and sets `x` together; if any of its four tests fails, the record falls to the `dsq` tests with `x` still `t`. Case 7 with an owner calls the position getters five times on `O` and `t` and `UnitGetSubY(O)` once, keeping no result and drawing nothing there; with none, a position call follows each `Range(40)`. No result reaches a store: `x` stays 0.

- R106i. [C] As data: kind 2, `init`, no `alt`; 1 records (418 shadowmaster); reach S; `aip` set 1,2,3,8; `aidel` 15/15/15; skills Fists of Fire, Blade Fury, Blades of Ice, Dragon Claw, Dragon Flight, Claws of Thunder, Attack.
- R106l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R107. Row 107 `Raven`

**`aip`:** 1 and 2 the far and near edge of the circling band (`mid ← (aip(2) + aip(1)) ÷ 2`); 3 the attack cooldown in tens of frames; 4 chance to act; 5 the target's distance limit.

```
init:                                                         [C]
  v14 ← −1;  v18 ← aip(3) + 1;  v1C ← bit 0 of one seed step's low word    ; one inline step, no mod

think:                                                                     [I]
1. if O = 0 or M = 0: Idle(10); return
2. if v14 = −1:
     v14 ← 3
     if Skill1 ≥ 0: v14 ← SkillParam5ByLevel(Skill1, SkillLevel(O, SKILLS_GetUnitSkill(O, Skill1), 1))
   else if v14 = 0: UnitKilled(G, U, U, 1); return                ; hits used up; U its own killer
3. r ← Dist(U, O)
   if r > 50: PetMove(O; U, 3, 0, 0, 0); return
4. s ← the run speed term, as row 67's
   if r > 28: PetMove(O; U, 0, 0, s, 0); return
5. FindTarget(ctl, &e, &m');  mid ← (aip(2) + aip(1)) ÷ 2
6. if t ≠ 0 and v18 < T and Range(100) < aip(4) and dist < aip(5):        ; draw#1
     if melee: SetModeAtUnit(4, t);  v14 ← v14 − 1;  v18 ← T + 10·aip(3); return
     Walk(t, 0); return
7. if aip(1) ≥ r and r ≥ aip(2):
     AiRavenCircle(O, 4, v1C ≠ 0 ? 5 : 6), or flip v1C and circle again   ; each returns on a command
8. if not WalkAround(ctl, O, mid): PetMove(O; U, 1, 0, 0, 0)
```

- R107d. [I] The kill passes `U` as the killer too (`push edi`).
- R107e. [I] **`AiRavenCircle(O, byte, type)`:** `Ovr(type, 0, byte)`, then `MonCmdInit(U, 2, c)`, `PathSetStopDist(U.path, 1)`, `c+0x08 ← O`, and it returns `MonSetMode(G, c, 1)`. Mode 2, no draw of its own. So step 7 is a walk around the owner by path type 5 or 6, and a non-zero return ends the think.
- R107a. [I] `v14` is the raven's hit count, read from `Skill1` (`Raven`) at **the owner's** level in it, and the raven dies when it reaches 0. Every attack is `SetModeAtUnit(4, t)` through `MonSetMode`, whose `MonAttackStats` adds the owner pair (`SkillDamage` = `Raven`, the owner's level in it).
- R107b. [C] The 2 218 `MonAttackStats` calls of class 419 take the owner pair at level 20, for that one level and the sessions' one player, who cast them; which unit is the owner and the terms that level does not separate stay `[I]`.
- R107c. [C] The init, its stores and one seed step, with `v18` = `aip(3)` (i16) + 1 by difficulty; the think's entry call `MonsterOwner` only: families `ravinit` (240 cases, all drawing; the Normal-column control fails the 153 it separates) and `raven` (240 cases; no control separates it).

- R107i. [C] As data: kind 2, `init`, no `alt`; 1 records (419 druidhawk); reach S; `aip` set 1,2,3,4,5; `aidel` 15/15/15; skills Raven.
- R107l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R108. Row 108 `DruidWolf`

**`aip`:** 1 the delay after A1; 2 chance to wander, with no target; 3 the wolf: the edge distance past which it follows by the owner's mode; Fenris: `Range(100) ≥ aip(3)` with a target and `v14` = 0 skips the corpse (14/25, as data); 4 the distance limit, Fenris's follow distance too, and his corpse limit at half (20/24, as data); 5 the edge distance past which it moves at speed 100.

The row's think is a class dispatch: class 420 (`spiritwolf`, `cmp [edx+4],0x1a4; jne`) jumps to `AiSpiritWolf`, any other class to `AiFenris`.

- R108a. [I] Fenris draws twice at most, the wolf once. The block, its chain included, is read from the code: the wolf's second target is kept when `AiApproachPointTest` returns 0, Fenris's and row 112's when it does not.
- R108b. [C] The class dispatch only, met at classes 419, 420 and 421, each path calling `MonsterOwner` first: family `dwolf`, 240 cases, 91 and 149; no control moves that test.

- R108i. [C] As data: kind 0, no `init`, no `alt`; 2 records (420-421 spiritwolf..fenris); reach S; `aip` set 1,2,3,4,5; `aidel` 15/15/15; skills Teleport 2, fenris rage.
- R108l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R109. Row 109 `Totem`

**`aip`:** 1 chance to step away from a near hostile; 2 chance to drop the target; 3 the edge distance past which it teleports; 4 the edge distance past which it follows.

```
1. if O = 0: Idle(10); return                                              [I]
2. h ← OwnerNearHostile(ctl, &d, &m, 24)
3. if m ≠ 0 and h ≠ 0 and D100() < aip(1) and StepAway(h, 6, 1): return   ; draw#1, only when m and h are set
4. if D100() < aip(2): h ← 0;  m ← 0                          ; draw#1 or #2
5. e ← EdgeDist(U, O)
6. if e > aip(3) and UnitTeleport(room(O), O.x, O.y, 0, 0): Idle(25); return
7. if e > aip(4):
     owner mode 2 or 6: PetMove(kind 0)
     mode 3: PetMove(kind 0, speed 60)                        ; each returns on a command
8. if not AiPetGuard(h, O, m, ctx, 0, 6): Idle(25)
```

- R109a. [I] One or two inline steps.
- R109b. [C] The entry call `MonsterOwner` only: family `totem`, 240 cases; no control separates it.

- R109i. [C] As data: kind 0, no `init`, no `alt`; 3 records (422-424 spiritofbarbs..oaksage); reach S; `aip` set 1,2,3,4; `aidel` 15/15/15; skills —.
- R109l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R110. Row 110 `Vines`

**`aip`:** 1 the frames between hits; 2 the hostile's distance limit; 3 the idle; 4 the step away's length; 5 the edge distance from the owner at which it moves.

```
init:  v14 ← 0                                                  [C]

1. O ← MonsterOwner(U);  if O = 0: Idle(25); return                        [I]
2. if UnitEdgeDistance(U, O) ≥ aip(5) and PetMove(O; U, 3, 0, 0, 6): return
3. in town: if not AiPetGuard(0, O, 0, ctx, 0, 6): Idle(aip(3))
            return
4. h ← the FindHostile target, with e and m;  if e ≥ aip(2): h ← 0         ; m kept
5. if AiPetGuard(h, O, m, ctx, 0, 6): return
6. if h = 0: Idle(aip(3)); return
7. if h is in state 2 or has stat 45 = 100: StepAway(h, (u8) aip(4), 0)
   else if not m: Walk(h, 7)
   else if Skill1 ≥ 0 and T > aip(1) + v18: UseSkill1(h);  v18 ← T
   else: Idle(aip(3))
```

- R110a. [I] No draw. The block, step 2's `≥` and steps 3 to 7's returns included, is read from the code.
- R110b. [C] The init's store and the think's first call `MonsterOwner` only: families `vinit`, `vines`, 240 cases each; no control separates them.

- R110i. [C] As data: kind 2, `init`, no `alt`; 1 records (425 plaguepoppy); reach S; `aip` set 1,2,3,4,5; `aidel` 15/15/15; skills Vine Attack.
- R110l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R111. Row 111 `CycleOfLife`

**`aip`:** 1 the frames between casts; 2 the corpse's edge distance limit; 3 the idle; 4 the step away's length; 5 the edge distance from the owner at which it moves.

- R111a. [I] The block is read from the code, steps 2, 3 and 5, step 6's classes (426 life, 427 mana) and the `aip(5)` read included.
- R111b. [C] The init's store and the think's first call `MonsterOwner` only: families `vinit`, `cycle`, 240 cases each; no control separates them.

- R111i. [C] As data: kind 2, `init`, no `alt`; 2 records (426-427 cycleoflife..vinecreature); reach S; `aip` set 1,2,3,4,5; `aidel` 15/15/15; skills CorpseCycler, VineCycler.
- R111l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R112. Row 112 `DruidBear`

**`aip`:** 1 the delay after A1; 2 out of melee range: chance of the override; 3 in melee range: chance of `BearSmite`.

- R112b. [C] The entry call `MonsterOwner` only: family `bear`, 240 cases; no control separates it.

- R112i. [C] As data: kind 0, no `init`, no `alt`; 1 records (428 druidbear); reach S; `aip` set 1,2,3; `aidel` 15/15/15; skills BearSmite.
- R112l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R143. Row 143 `ShadowMasterNoInit`

The think is row 106's, the same word. No MonStats record names this row. Its own init differs:

```
init:                                                         [C]
  v1C ← 1;  O ← MonsterOwner(U)
init, after that call:                                                     [I]
  if O is a player (O+0x00 = 0): v1C ← the owner's level in aip8[n]
  add the skill-0 entry at level 1 when missing;  set the left and right skills to 0
```

- R143a. [I] Unlike row 106's init it stores no `v14` or `v18` and does not copy the class's skills.
- R143b. [C] Family `sm2init`, 240 cases; no control separates it.

- R143i. [C] As data: kind 2, `init`, no `alt`; 0 records; reach none; `aip` set —; `aidel` —; skills —.
- R143l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### S7. State row 7

Tier: the think is row 67's, the same word, [machinery § T67](../machinery/). [C] in both tables

- S7i. [C] As data: kind 0, no `init`, no `alt`.

### Batch 6: hirelings

#### R61. Row 61 `Hireable`

Tier AI: [machinery § T61](../machinery/), not repeated here.

#### S4. State row 4

Tier: the think and the alt are row 61's, the same words, [machinery § T61](../machinery/). [C] in both tables

- S4i. [C] As data: kind 0, no `init`, `alt`.

#### S5. State row 5

No `aip` read: the bounds are constants. `Skill1` is read for class 271 only. Also the think of row 60.

```
1. if U = 0 or U.mode ≠ 1: Idle(5); return                                 [I]
2. if not InTown(U):
     h ← FindHostile(&e, &m)
     if h ≠ 0 and e < 20:                       ; signed jge
       if Range(100) < 30:                      ; draw#1
         if U.class = 271: UseSkill1(h)
         else: SetModeAtUnit(4, h)
         return
       if Range(100) < 30: T56(h, 4, 0); return ; draw#2
       Idle(10); return
3. if D100() < 20: Ring(5); return              ; inline step
4. Idle(10)
```

- S5a. [I] The state is set by row 61's own `MonAiInit(ctl, 5)`, for the unowned hireling, through the alt's one-event bridge. A `rogue2`, row 60's one record, runs the same code with class ≠ 271, hence A1 in place of the skill.
- S5b. [C] The map to `RoomIsTown` only.

- S5i. [C] As data: kind 0, no `init`, no `alt`.

#### S6. State row 6

No `aip` read.

```
1. if U = 0 or U.mode ≠ 1: Idle(5); return                                 [I]
2. if not InTown(U):
     h ← FindTarget(ctl, &e, &m)
     if h ≠ 0:
       r ← Range(100)                           ; draw#1
       if m = 0:
         if r < 30: Walk(h, 7)
         else: Idle(10)
       else:
         if r < 80: SetModeAtUnit(4, h)
         else: Idle(10)
       return
3. if D100() < 20: Ring(5); return              ; inline step
4. Idle(10)
```

- S6a. [I] Set by row 61's `MonAiInit(ctl, 6)`, as state 5.
- S6b. [C] The map to `RoomIsTown` only.

- S6i. [C] As data: kind 0, no `init`, no `alt`.

### Batch 7: bosses-A

#### R34. Row 34 `Andariel`

Tier AI: [machinery § T34](../machinery/), not repeated here.

#### R44. Row 44 `Duriel`

**`aip`:** 1 the level of the aura `Skill4` (5/5/6, as data); 2 melee: chance of `Skill3` (33, as data); 3 melee: chance of `Skill2` (50, as data); 4 melee: chance of A2 (0, as data); 5 out of melee range: chance of `Skill1` (0, as data).

```
1. if Skill4 ≥ 0 and UNIT_GetRightSkill(U) = 0:                            [I]
     UnitSkillAdd(U, Skill4, aip(1), 1);  PlayerSetSkill(U, 0, Skill4, −1)  ; the aura, Holy Freeze
2. if not melee:                                                           [I]
     if Skill1 ≥ 0 and D100() < aip(5): UseSkill1(t); return     ; draw#1
     Ovr(13, 0, 0);  Walk(t, 7); return
3. if Skill3 ≥ 0 and D100() < aip(2): UseSkill3(t); return       ; draw#1, Smite
4. if Skill2 ≥ 0 and D100() < aip(3): UseSkill2(t); return       ; draw#2, Jab
5. if D100() < aip(4): SetModeAtUnit(5, t); return               ; draw#3
6. SetModeAtUnit(4, t)
```

- R44a. [C] With stock data the A2 and `Charge` arms are never taken (`draw < 0`), though each still makes its draw. So in melee range the code gives `Smite` 33 %, `Jab` 33.5 %, A1 33.5 %: against the community page's 33 : 50 : 17, settled in the README's Open questions. Records 211 and 708 have `aip4` and `aip5` 0 in all three difficulties, `aip2` 33 and `aip3` 50, `.txt` = `.bin`.
- R44b. [C] The map with `Skill4` < 0, to each first callee, and the `GetRightSkill` call with `Skill4` ≥ 0: family `duriel`, 240 cases, 149 with a draw, 7 outcomes; the `≤` and Normal-column controls fail the 27 and 44 that separate them, and each draw is met at equality. Past `GetRightSkill`, the logged paths are R44p's.
- R44p. [C] **Logged paths of the block** (the S1c model): 309 decisions, all fork-free, 0 mismatches. Step 1: `Skill4` 114 ≥ 0 and `GetRightSkill(U)` non-zero in all 309, so no grant; each test reversed alone fails 309. Step 2 on its one decision out of melee range: `Skill1` ≥ 0, one draw against `aip(5)` 0 missed (the exit seed), `Ovr(13, 0, 0)`, `Walk(t, 7)`; the melee test reversed fails 309, the draw's test 1 of 1. Past `GetRightSkill`, 310 calls past the first, every branch failing alone (with R44m's draws). [I] The grant and its words, the `Skill4 < 0` side (R44b has it to its first callee), step 2's `UseSkill1(t)`, the `<` of its draw, `Skill1 < 0`, the A2 and `Charge` true sides.

- R44i. [C] As data: kind 1, no `init`, no `alt`; 2 records (211 duriel, 708 uberduriel); reach ·; `aip` set 1,2,3; `aidel` 15/15/15; skills Charge, Jab, Smite, Holy Freeze.
- R44l. [C] First boundary: 309 decisions compared (309), 0 mismatches, 1 first-call outcome.
- R44r. [C] Under sentence H1: 309 decisions, 310 calls past the first, 3 of 3 two-way sites failing alone; Normal, record 211, owner-played.
- R44m. [C] The three draws of steps 3 to 5 give the arm and the number of steps from the logged seed in all 308 melee decisions; the third draw is told only by the seed (90 decisions), since `aip4` is 0. The next decision's seed is 0 to 11 steps past the last exit seed in all 307 pairs; those steps are not attributed.
- R44n. [I] Not reached: step 1's grant (`UNIT_GetRightSkill` non-zero in all 309), A2 and `Charge`'s true sides. Step 2's walk is one decision. Smite and Jab both command mode 14, so a command's mode does not tell them; the skill word does. Nightmare, Hell and record 708 are not logged.

#### R50. Row 50 `Mephisto`

**`aip`:** 1 melee: `D100() ≤ aip(1)` gives state 2, else 3; 2 the pick: chance of the weakest (`+0x5C`); 3 the pick's second chance (`+0x62`), never reached from this row.

`L ← max(0, (100 − UnitLifePct(U)) ÷ 5)` (`imul 0x66666667; sar 1`, signed), and `life` is that percent. `v1C` is the stored state, `v14` the burst's remaining casts, `v18` the cast counter. `st` is the dispatch state.

```
1. L, life as above;  st ← v1C                                             [I]
2. if melee:
     if D100() > aip(1): st ← 3                        ; draw#1
     else: st ← 2;  v14 ← (step low mod 3) + 3         ; draw#2 (0xAAAAAAAB, shr 1)
   else if dist > 20: st ← 4
   else if v1C > 4: goto move                          ; unsigned
   else if v1C = 0:
     if life ≤ 20 and dist < 5 and D100() < 40: st ← 1 ; draw#1
     else if D100() < L + 50:                          ; draw
       st ← 2;  v14 ← (step low mod 3) + 3
     else:
     move:
       if D100() ≥ 65: v1C ← 0;  Idle(10); return
       if D100() ≥ 65 and dist ≤ 5: Ovr(0, 0, 4);  Walk(t, 7)
       else: T56(t, 4, 0)
       v1C ← 0; return
3. switch st:                                          ; g_AiMephistoStateJumps
   0: Idle(5);  v1C ← 4; return                        ; no path above dispatches 0
   1: Ovr(0, 50, 0)
      if StepAway(t, 8, 1): v1C ← 0; return
      if melee: UseSkill3(t);  v1C ← 0; return
      ; else fall into case 2 with st 0
   2: v14 ← v14 − 1;  if v14 = 0: st ← 0
      if v18 = 0:
        v18 ← 2
        if not T56(t, 3, 1): Ring(12)
        v1C ← st; return
      v18 ← v18 + 1
      t2 ← AiMephistoPickTarget(M, t)
      n ← the count of leading Skill1..8 ≥ 0
      if n ≤ 0: Ring(6)
      else:
        q ← 100 ÷ n;  r ← D100()
        if d > 0 and ((t2 ≠ 0 and UnitLineBlocked(U, t2, 4)) or dist > 30): UseSkill6(t2)
        else if dist < 15 and r < q and d > 0: UseSkill5(t2)
        else if r < 2·q: UseSkill4(t2)
        else if r < 3·q: UseSkill2(t2)
        else: UseSkill1(t2)
      if D100() < 50 − L: v18 ← 0
      v1C ← st; return
   3: st ← 0
      if Range(100) < L + 80:
        if Range(100) < 80 − L: SetModeAtUnit(4, t)
        else: UseSkill3(t)
      else:
        Ovr(0, 50, 0)
        if not T56(t, 3, 1): Ring(12)
      v1C ← 0; return
   4: st ← 0;  Ovr(0, 50, 0)
      if not WanderNear(t, 6):
        UNIT_CancelEvents(G, U, 2, 0)
        if not Toward(t, 12, 6): Ring(12)
      v1C ← 0; return
```

- R50a. [I] **The dispatch.** `jmp [eax*4 + g_AiMephistoStateJumps]` over five words. No path above dispatches 0: melee gives 2 or 3, `dist > 20` 4, a stored `v1C` of 1–4 itself, and a stored 0 takes the `v1C = 0` arm, so case 0 is not reached from this function.
- R50b. [I] **The casting burst.** `v18` counts casts and is cleared on `D100() < 50 − L`: the lower Mephisto's life, the longer the burst. The difficulty tests are `cmp byte [G+0x6D],0; jbe`: in Normal only `Skill4`, `Skill2` and `Skill1` are cast. Stock: six skills, so `n` = 6 and `q` = 16: in Normal `r < 32` `MephistoMissile`, `r < 48` `PrimeBolt`, else `PrimeLightning`. `Skill3` is cast only from cases 1 and 3, on `t`.
- R50c. [C] **The pick** `(game, unit, M, t)` runs `AiUnitSearch(G, U, &blk, AiMephistoPickCb, 1)` with a ten-word block `{0, 0x7FFFFFFF, 0, 0, 0x7FFFFFFF, 0, 0x7FFFFFFF, 0, 0, 0}` at `EBP − 0x28`. The callback takes a living candidate other than the searcher with `Unit+0xC4` bit `0x4` that is hostile to it and within `UnitDistSq ≤ 1024`: `blk[7]++`, `blk[2]++` within 225, `blk[0..1]` the nearest, `blk[3..4]` the lowest `hitpoints >> 8` (stat 6, `sar`), and `blk[5..6]` the nearest only when the searcher's `Unit+0x00` is 0. The pick draws `D100() < aip(2)` only when `blk[3]` ≠ 0 and returns `blk[3]` on it; else, when `blk[5]` is set, a second draw `< aip(3)` returns `blk[3]` too; else `t`. With no find and `blk[5]` 0 there is no draw at all. The pick and its callback run whole, 240 emulated cases each, 0 mismatches, 22 and 16 controls failing. Its one caller is this row's think (in `AiMephisto`; no jump or dword), a monster, so `blk[5]` stays 0 and the second draw never happens.
- R50d. [C] The entry call `UnitLifePct(U)` and the pick's search call with its block only: families `mephisto`, `mpick`, 240 cases each; no control separates them. Its states stay `[I]`.

- R50i. [C] As data: kind 1, no `init`, no `alt`; 1 records (242 mephisto); reach ·; `aip` set 1,2,3; `aidel` 15/10/6; skills PrimeLightning, PrimeBolt, PrimePoisonNova, MephistoMissile, MephFrostNova, Blizzard.
- R50l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R53. Row 53 `Summoner`

**`aip`:** 1 chance to cast at all (85/93/98, as data); 2 chance of `Skill5` first (5, as data); 3 `D100() > aip(3)` flips the element (63, as data); 4 the nova's cooldown (40, as data); 5 `Skill4`'s cooldown (120/100/80, as data); 6 within 5: chance to step away (33/20/10, as data); 7 the nova's range (5/8/11, as data); 8 the bolt's range (40, as data).

`x, y` are always `t`'s, also when `t2` is the skill's target. `UseSkillK(a)` here is `MonAiUseSkill(SkKmode, SkillK, a, x, y)`.

```
1. if v14 = 0: A2Q5_BossSeen(G, U);  v14 ← 1                               [I]
2. if dist < 5 and D100() < aip(6): StepAway(t, 6, 0)      ; draw#1, result not read
3. cold ← STATS_GetUnitStat(t, 43, 0) ≤ STATS_GetUnitStat(t, 39, 0)  ; coldresist ≤ fireresist
4. if D100() < aip(1):                                     ; draw#2
     if Skill5 ≥ 0 and D100() < aip(2): UseSkill5(t); return  ; Weaken; draw#3
     t2 ← FindHostile(&e, 0)
     if D100() > aip(3): cold ← not cold
     if cold:
       if Skill2 ≥ 0 and v18 < T and dist < aip(7): goto nova
       if Skill1 ≥ 0 and t2 ≠ 0 and dist < aip(8): UseSkill1(t2); return
     if Skill4 ≥ 0 and v1C < T: v1C ← T + aip(5);  UseSkill4(t); return
     if Skill3 ≥ 0 and t2 ≠ 0 and dist < aip(8): UseSkill3(t2); return
     if not cold and Skill2 ≥ 0 and v18 < T and dist < aip(7):
     nova:
       v18 ← T + aip(4);  UseSkill2(t); return
     if Skill5 ≥ 0: UseSkill5(t); return
5. Ring(4)
```

- R53a. [I] The step away does not end the event. The timers compare signed with `T`. Stock: `Skill1` `Glacial Spike`, `Skill2` `Frost Nova`, `Skill3` `Fire Ball`, `Skill4` `VampireFirewall`, `Skill5` `Weaken`.
- R53b. [C] The map up to the first `STATS_GetUnitStat(t, 43, 0)` only: family `summoner`, 240 cases, 93 with a draw, 3 outcomes; the `≤`, Normal-column and compare controls fail the 8, 16 and 36 that separate them.

- R53i. [C] As data: kind 1, no `init`, no `alt`; 1 records (250 summoner); reach U; `aip` set 1,2,3,4,5,6,7,8; `aidel` 15/13/10; skills Glacial Spike, Frost Nova, Fire Ball, VampireFirewall, Weaken.
- R53l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R55. Row 55 `Izual`

**`aip`:** 1 melee: chance to attack (45/50/50, as data); 2 out of melee range: chance to walk (50, as data); 3 within 10: chance of the cast (66, as data); 4 melee: chance of the cast (0/75/100, as data, so in Normal the melee cast never happens); 5 the idle after a cast (20/5/0, as data); 6 the plain events after a cast (3/4/4, as data).

```
1. if v14 = 0: v14 ← 1;  A4Q1_IzualSeen(G)                                 [I]
2. if v18 ≠ 0: Idle(v18);  v18 ← 0; return
3. if melee:
     if v1C < 1 and not (D100() < aip(1)):            ; inline
       v1C ← 0
       if Skill1 < 0 or not (Range(100) < aip(4)): Idle(aidel); return
     cast:
       MonAiUseSkill(Sk1mode, Skill1, t, x, y);  v18 ← aip(5);  v1C ← aip(6); return
     if v1C > 0: v1C ← v1C − 1
     SetModeAtUnit(4, t); return
4. if Skill1 ≥ 0 and dist < 10:
     if v1C > 0: Walk(t, 7); return
     if Range(100) < aip(3): goto cast
5. if v1C < 1 and not (D100() < aip(2)):              ; inline
     if dist < 11: Idle(aidel)
     else: Toward(t, 6, 9)
     return
6. Walk(t, 7)
```

- R55a. [I] `A4Q1_IzualSeen(G)`: `QUESTS_FindById(G, 22)`; a record with `+0x09` non-zero and `+0x0B < 2` (unsigned) gets `+0x14 = 0` and `QUESTS_SetState(rec, 0, A4Q1_StepBits, 1)`. After a cast `v1C` = 3–4 melee events or walks follow with no draw.
- R55b. [C] The map with `v14` ≠ 0, and the quest call at `v14` = 0 with `v14` already 1 at it: family `izual`, 240 cases, 78 with a draw, 8 outcomes; the controls fail the 10, 40 and 51 that separate them. `Range(100) < aip(4)` is met at equality in no case, so its strictness is not tested.

- R55i. [C] As data: kind 1, no `init`, no `alt`; 1 records (256 izual); reach ·; `aip` set 1,2,3,4,5,6; `aidel` 15/12/8; skills Frost Nova.
- R55l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R59. Row 59 `BloodRaven`

No `aip` set. `Skill1` `Nest`, `Skill2` `Quick Strike`, as data.

```
init:  v1C ← 0                                                [C]

1. h ← AiParamsFind(U, 10, 0)                                              [I]
   if h = 0:
     Push({kind 10, U's own x, y});  h ← AiParamsFind(U, 10, 0)            ; the home point
2. hd ← 0
   if h ≠ 0:
     hd ← DistToPointSized(t, home)                                        ; the target's, ECX = t
     if dist > 45: Idle(5); return
     if hd > 49 or DistToPointSized(U, home) > 50:                         ; second compare unsigned (jbe)
       v1C ← 1;  Ovr(7, 100, 0)
       if RunToPoint(h.x, h.y): return
       UNIT_CancelEvents(G, U, 2, 0)
     if v1C ≠ 0 and DistToPointSized(U, home) > 5:                         ; jbe
       Ovr(7, 100, 0)
       if RunToPoint(h.x, h.y): return
       UNIT_CancelEvents(G, U, 2, 0)
     v1C ← 0
3. if dist > 20 and hd < 50:
     dist ← max(12, dist >> 1);  Ovr(7, 100, 0)                            ; the local copy of dist
     if RunNearUnit(t, dist): return
     UNIT_CancelEvents(G, U, 2, 0)
4. v14 ← v14 + 3
5. if Skill1 ≥ 0 and not melee and v18 < 2·d + 8 and Range(100) < v14:     ; draw#1
     a ← Range(15) + 5                                                     ; draw#2
     if Pow2(2) = 0: dx ← RangeB(a);  dy ← a                               ; draw#3, #4
     else: dx ← a;  dy ← RangeB(a)
     if Pow2(2) ≠ 0: dx ← −dx                                              ; draw#5
     if Pow2(2) ≠ 0: dy ← −dy                                              ; draw#6
     MonAiUseSkill(Sk1mode, Skill1, 0, subX(t) + dx, subY(t) + dy)     ; around the target
     v18 ← v18 + 1;  v14 ← 0; return
6. if dist > 5:
     if D100() < 5 and hd < 50: Ovr(7, 100, 0);  RunNearUnit(t, 12); return
     h2 ← FindHostile(&e, &hd)
     if h2 ≠ 0 and not St3or19 and Range(100) < 80:
       if Skill2 ≥ 0 and Range(100) < (d + 4)·10: UseSkill2(h2); return
       SetModeAtUnit(4, h2); return
     Ovr(0, 50, 0)
     if T56(t, 4, 1): return
7. if D100() < 30 and dist < 12:
     Ovr(7, 100, 0)
     if StepAwayXY(t, 12 − dist, 0): return
     UNIT_CancelEvents(G, U, 2, 0)
8. SetModeAtUnit(4, t)
```

- R59a. [I] The home point is parameter record kind 10, pushed with the unit's own static or dynamic path point when missing; its leash compares are signed except the two named. `hd` is **the target's** distance from home, so a target past 49 starts the run home and blocks the run near it; the two later compares are the raven's own. The raise's point is around the target too. The raise skill is cast at most `2d + 8` times (`lea ecx,[ecx+ecx*1+0x8]`: 8/10/12 by difficulty), with a chance `v14` that grows by 3 per event and resets on a cast. The `dist` of the later tests is the local copy, halved (at least 12) after a failed run near the target. The `hd` slot is reused: `FindHostile`'s melee pointer writes it.
- R59b. [C] The init's map and the think's entry call `AiParamsFind` only: families `brinit`, `braven`, 240 cases each; no control separates them.

- R59i. [C] As data: kind 1, `init`, no `alt`; 1 records (267 bloodraven); reach ·; `aip` set —; `aidel` 15/13/10; skills Nest, Quick Strike.
- R59l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R90. Row 90 `Griswold`

No `aip` set: the bounds are constants.

```
1. if melee:                                                               [C]
     if D100() < 80: SetModeAtUnit(4, t); return   ; draw#1
   else if D100() < 50: Walk(t, 7); return         ; draw#1
2. Idle(10)
```

- R90a. [C] Family `griswold`, 240 cases, all with a draw, 3 outcomes; the `≤` control fails the 11 it separates, and each draw is met at equality.

- R90i. [C] As data: kind 1, no `init`, no `alt`; 1 records (365 griswold); reach U; `aip` set —; `aidel` 15/13/10; skills —.
- R90l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R144. Row 144 `UberIzual`

**`aip`:** as row 55, with the same stock values.

```
1. if Skill2 valid and (st ← Skills[Skill2].aurastate) ≥ 0 and not UNIT_HasState(U, st):   [I]
     MonAiUseSkill(Sk2mode, Skill2, 0, 0, 0); return     ; Chilling Armor
2. if UnitLineBlocked(U, t, 6): MonAiUseSkill(Sk3mode, Skill3, 0, x, y); return  ; MonTeleport
3. if v18 ≠ 0: Idle(v18);  v18 ← 0; return
4. if melee:
     if v1C < 1 and not (Range(100) < aip(1)):
       v1C ← 0
       if Skill1 < 0 or not (Range(100) < aip(4)): Idle(aidel); return
     cast:
       MonAiUseSkill(Sk1mode, Skill1, t, x, y);  v18 ← aip(5);  v1C ← aip(6); return
     if v1C > 0: v1C ← v1C − 1
     SetModeAtUnit(4, t); return
5. if Skill1 ≥ 0 and dist < 10:
     if v1C > 0: Walk(t, 7); return
     if Range(100) < aip(3): goto cast
6. if v1C < 1 and not (Range(100) < aip(2)):
     if dist < 11: Idle(aidel)
     else: Toward(t, 6, 9)
     return
7. Walk(t, 7)
```

- R144a. [I] Row 55 with steps 1 and 2 added, the quest call gone, and all four rolls through `Range`, where Izual draws two inline. Its `v14` is unused here.
- R144b. [C] Up to its `UNIT_HasState` or `UnitLineBlocked` call only: family `uizual`, 240 cases, no draw; the compare control fails the 30 it separates.

- R144i. [C] As data: kind 1, no `init`, no `alt`; 1 records (706 uberizual); reach ·; `aip` set 1,2,3,4,5,6; `aidel` 15/12/8; skills Frost Nova, Chilling Armor, MonTeleport.
- R144l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R146. Row 146 `UberMephisto`

Stub: the think is `ret 4`. A kind-1 event with a target commands nothing from the think; without a target `MonAiTargetOrIdle` idles. What moves and casts Uber Mephisto is under Open questions; with a target the boss sight pause fires once, then this event queues no next one. [C] The return, `v14`, `v18`, `v1C` unchanged: family `umeph`, 240 cases.

- R146i. [C] As data: kind 1, no `init`, no `alt`; 1 records (704 ubermephisto); reach ·; `aip` set 1,2,3; `aidel` 15/10/6; skills PrimeLightning, PrimeBolt, PrimePoisonNova, MephistoMissile, MephFrostNova, Blizzard.
- R146l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

### Batch 8: pool-E (towers, turrets, javelins and blowguns, Venom Lords, the siege)

#### R82. Row 82 `InvisoSpawner`

**`aip`:** 1 the stock (4, as data); 2 the distance (5, as data); 3 the frames between spawns (125, as data).

```
1. if v14 = 0: v18 ← aip(1)                  ; the stock, while no spawn has happened   [I]
2. if dist ≤ aip(2):
     if v18 ≤ 0: MonAiSetMode(0, 0, 0); return   ; stock spent: death
     if v14 ≤ T:
       c ← LevelClassVariant(UnitGetRoom(U), count > 96 ? 96 : −1)
       if SpawnPosPick(G, room, 0, c, &x, &y, 0) and SpawnAtPos(G, room, x, y, c, 1, 2, 0x42):
         v18 ← v18 − 1;  v14 ← T + aip(3)
3. Idle(15)
```

- R82a. [I] No draw. `v18` is reloaded whenever `v14` is 0, so only until the first spawn sets the timer. The class guard is `setg; sub 1; and; add`.
- R82b. [C] The map up to `SetMode(0, 0, 0)`, `LevelClassVariant` or `Idle(15)`, with `v18`'s reload before them: family `spawner`, 240 cases, 3 boundaries; the Normal-column and compare controls fail the 103 and 80 that separate them.

- R82i. [C] As data: kind 1, no `init`, no `alt`; 1 records (332 invisospawner); reach ·; `aip` set 1,2,3; `aidel` 15/15/15; skills —.
- R82l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R83. Row 83 `MosquitoNest`

**`aip`:** 1 the use count (16/17/21 up to 16/20/24, as data); 2 the distance; 3 the frames between uses (200/180/175, as data).

```
1. if dist ≤ aip(2):                                                       [I]
     if v18 > aip(1):
       U+0xC4 ← U+0xC4 | 0x20000;  MonAiSetMode(0, 0, 0); return
     if Skill1 ≥ 0 and T > v14 and SpawnClassCellTest(count > 334 ? 334 : −1, UnitGetRoom(U), U.x, U.y, 0):
       v18 ← v18 + 1;  v14 ← T + aip(3)
       UseSkill1(t); return                  ; Nest
2. Idle(25)
```

- R83a. [I] No draw. Class 334 is `suckernest1`'s own row. The row is kind 0, so the think runs with whatever target and distance the event's context holds: Open questions.
- R83b. [C] The map up to `SetMode(0, 0, 0)` with `+0xC4`'s bit, `SpawnClassCellTest` (`ECX` the class, `EDX` the room, stack `U.x, U.y, 0`) or `Idle(25)`: family `nest`, 240 cases, 3 boundaries; the Normal-column, compare and unsigned-`Skill` controls fail the 59, 51 and 27 that separate them.

- R83i. [C] As data: kind 0, no `init`, no `alt`; 4 records (334-337 suckernest1..suckernest4); reach ·; `aip` set 1,2,3; `aidel` 15/15/15; skills Nest.
- R83l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R85. Row 85 `HighPriest`

**`aip`:** 1 first pass, melee: chance of A1; 2 chance of the heal search; 3 the shared cooldown after a heal; 4 chance of `Skill1`; 5 chance of S1; 6 second pass: chance to break off; 7 second pass: chance of S1; 8 the distance of `Skill1` and of the first pass's choice of walk. Values per council member, as data.

```
1. if v14 = 0:                                                             [I]
     if melee:
       if chance(1): v14 ← 1;  SetModeAtUnit(4, t); return     ; draw#1
       StepAway(t, 6, 1); return
     if Skill2 ≥ 0 and T > v18 and rchance(2):                 ; draw#1
       blk ← {0, 75, 2500};  AiUnitSearch(G, U, &blk, AiPriestHealCb, 1)
       if blk.unit ≠ 0:
         v18 ← T + aip(3);  UseSkill2(blk.unit); return        ; ZakarumHeal
     if Skill1 ≥ 0 and T > v18 and dist < aip(8) and rchance(4):  ; draw#1..#2
       k ← Pow2(4)                                             ; draw#2..#3, low & 3
       MonAiUseSkill(Sk1mode, Skill1, t, t.x + CORNER[k].x, t.y + CORNER[k].y)   ; Hydra
       v18 ← T + 100; return
     if aip(5) > 0 and MissS1 > 0 and (m ← MissileRec(MissS1)) ≠ 0 and dist < m.Range − 2 and rchance(5):
       SetModeAtUnit(8, t); return                             ; S1, highpriestlightning
     if D100() < 80:
       if dist ≤ aip(8): T56(t, 3, 0)
       else: WalkStop(t, 6)
       return
2. v14 ← 1
3. if melee:
     if chance(7): SetModeAtUnit(8, t); return
     if chance(6): StepAway(t, 6, 1);  v14 ← 0; return
     if Range(100) < 90: SetModeAtUnit(4, t); return
     Idle(10); return
4. if dist < 6 and chance(7): SetModeAtUnit(8, t); return
5. if chance(6): v14 ← 0;  Idle(10); return
6. if D100() < 70: Walk(t, 7); return
7. Ring(12)
```

- R85b. [C] **`AiPriestHealCb`** takes a monster, not in a death mode, `AlignSame02(U, cand)`, of alignment 0, within `UnitDistSq ≤ blk[2]`, with `UnitLifePct(cand) ≤ 75` and below `blk[1]`, keeping the lowest; it returns 0. No test excludes the priest itself: it was taken once in the 240 emulated cases. No draw. (0 mismatches, 11 controls failing) [I] The block's 2 500 (50 subtiles) and 75 are the think's initial words.
- R85c. [C] The map up to its fourteen boundary sites, with the block `{0, 0x4B, 0x9C4}` and the corner read from the image (all four met): family `priest`, 240 cases, 233 with a draw; the `≤`, Normal-column, compare and unsigned-`Skill` controls fail the 18, 83, 27 and 59 that separate them. The heal past the search and the S1 past `MissileRec` are not covered; the draws at the constants 80 and 70 and `rchance(2)` were met at equality in no case.

- R85i. [C] As data: kind 1, no `init`, no `alt`; 4 records (345-347 councilmember1..councilmember3, 557 baalhighpriest); reach U; `aip` set 1,2,3,4,5,6,7,8; `aidel` 15/13,14/12,13; skills Hydra, ZakarumHeal.
- R85l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R89. Row 89 `Megademon`

Tier AI: [machinery § T89](../machinery/), not repeated here.

#### R93. Row 93 `ArcaneTower`

**`aip`:** 1 the `Skill1` uses per phase (1, as data); 2 the frames between them (150/125/75, as data); 3 the pause after (33/25/15, as data); 4 the A1 uses per phase (4, as data); 5 the pause after (150/125/75, as data); 6 the frames between A1s (50/33/25, as data).

```
1. if v18 = 0: v18 ← aip(1)                                                [I]
2. if T < v1C: Idle(10); return
3. if Skill1 ≥ 0 and v14 = 0:
     UseSkill1(t)
     v18 ← v18 − 1
     if v18 < 1: v14 ← 1;  v18 ← aip(4);  v1C ← T + aip(3)
     else: v1C ← T + aip(2)
     return
4. SetModeAtUnit(4, t)
5. v18 ← v18 − 1
   if v18 < 1: v14 ← 0;  v18 ← aip(1);  v1C ← T + aip(5)
   else: v1C ← T + aip(6)
```

- R93a. [C] The map up to `Idle(10)`, `UseSkill` or `SetModeAtUnit(4, t)`, with `v18`'s reload before them: family `arcane`, 240 cases, no draw, 3 boundaries; the controls fail the 42, 40 and 39 that separate them. The counter updates after the two commands are not covered.

- R93i. [C] As data: kind 1, no `init`, no `alt`; 1 records (371 lightningspire); reach ·; `aip` set 1,2,3,4,5,6; `aidel` 15/15/15; skills ArcaneTower, Lightning.
- R93l. [C] First boundary: 24 decisions compared (24), 0 mismatches, 3 first-call outcomes.

#### R94. Row 94 `DesertTurret`

**`aip`:** 1 the frames between shots (10/7/3, as data); 2 the shots per burst (5–9, as data); 3 the rest (120/100/80, as data); 4 the range (30, as data); 5 the steps from itself (5, as data).

```
1. if Skill1 ≥ 0 and v14 = 0:                                              [I]
     MonAiUseSkill(Sk1mode, Skill1, 0, 0, 0);  v1C ← 0;  v14 ← T; return   ; the turret's start
2. if T < v14: Idle(10); return
3. if dist > aip(4):
     if v18 > 0: v18 ← v18 − 1
     Idle(15); return
4. dir ← Dir64To8(UnitDirToPoint(U, t.x, t.y))
5. v1C ← SWEEP[(v1C mod 8) + 8·(dir & 7)]             ; signed mod; i32 entries
6. x ← U.x + STEP[v1C].x·aip(5);  y ← U.y + STEP[v1C].y·aip(5)
7. UnitSetPathTargetUnit(U, t)
8. if Skill1 ≥ 0 and MonSkillTargetOk(G, U, Skill1, t, x, y) and MonSkillTargetOk(G, U, Skill1, t, t.x, t.y):
     MonAiUseSkill(Sk1mode, Skill1, 0, x, y);  PathSetTargetPoint(U.path, x, y)
     v18 ← v18 + 1
     if v18 > aip(2): v14 ← T + aip(3);  v18 ← 0
     else: v14 ← T + aip(1)
     return
9. if v18 > 0: v18 ← v18 − 1
10. Idle(10)
```

- R94a. [I] No draw. `SWEEP` is listed below and `STEP` is given by a rule below; each value of `SWEEP` is 0 to 7, so `STEP`'s index stays in range from `v1C`'s first 0. The target's position comes from the inline getter shape: types 2, 4, 5 read the path's `+0x0C/+0x10`, others `PathGetX/Y`, 0 for no path.

`SWEEP`, 64 i32, read, by the current index `v` (`v1C mod 8`) and the wanted direction, written `d` in this table only (`dir`):

| `d` \ `v` | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 0 | 1 | 2 | 5 | 6 | 7 | 0 |
| 1 | 1 | 1 | 1 | 2 | 3 | 6 | 7 | 0 |
| 2 | 1 | 2 | 2 | 2 | 3 | 4 | 7 | 0 |
| 3 | 1 | 2 | 3 | 3 | 3 | 4 | 5 | 6 |
| 4 | 1 | 2 | 3 | 4 | 4 | 4 | 5 | 6 |
| 5 | 7 | 2 | 3 | 4 | 5 | 5 | 5 | 6 |
| 6 | 7 | 0 | 3 | 4 | 5 | 6 | 6 | 6 |
| 7 | 7 | 0 | 1 | 4 | 5 | 6 | 7 | 7 |

[C] As an equality on the image's 64 elements, and no claim of how it was made; it is listed because a description by cases needs one patched cell, which that ADR excludes as a rule.

```
STEP[i].x = clamp(2 − min(j, 8 − j))
STEP[i].y = clamp(2 − min(k, 8 − k))
```

[C] As an equality on its 16 elements, and no claim of how it was made.

- R94b. [C] The map up to `UseSkill(…, 0, 0, 0)`, `Idle(10)`, `Idle(15)` (with `v18`'s decrement) or `UnitDirToPoint`: family `turret`, 240 cases, no draw, 4 boundaries; the controls fail the 40, 58 and 71 that separate them.

- R94i. [C] As data: kind 1, no `init`, no `alt`; 4 records (348-350 turret1..turret3, 372 firetower); reach ·; `aip` set 1,2,3,4,5; `aidel` 15/15/15; skills DesertTurret.
- R94l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R95. Row 95 `PantherJavelin`

**`aip`:** 1 chance to close in (70 in 1–6, 90 in 7–9, as data); 2 chance of A1; 3 the squared distance past which it rejoins (9–12, as data); 4 inside 8: chance to step away; 5 the idle; 6 the throw's range (20–28, as data).

```
1. d ← dist;  h ← FindHostile(&d, 0)             ; d is the frame word EBP+8  [I]
2. if d < 8 and chance(4): StepAway(t, 16, 1); return
3. if d > aip(6) − 6 and chance(1): WanderNear(t, 4); return
4. if h ≠ 0 and d < aip(6):
     if chance(2): SetModeAtUnit(4, h)
     else: Idle(aip(5))
     return
5. blk ← {0, 0x7FFFFFFF};  AiUnitSearch(G, U, &blk, AiSameBaseNearCb, 1)
6. if blk.unit ≠ 0 and blk.d2 > aip(3): Walk(blk.unit, 7); return
7. Idle(aip(5))
```

- R95p. [C] **Logged paths of the block** (the S1b model): 43 decisions, all fork-free, 0 mismatches, 48 calls past the first. Steps 1 to 7 on their taken arms. [I] Step 2's `StepAway(t, 16, 1)`, step 6's walk.

- R95i. [C] As data: kind 1, no `init`, no `alt`; 9 records (373-376 slinger1..slinger4, 394-395 slinger5..slinger6, 610-612 slinger7..slinger9); reach P; `aip` set 1,2,3,4,5,6; `aidel` 15/13,14/12,13; skills —.
- R95l. [C] First boundary: 58 decisions compared (15 + 43), 0 mismatches, 1 first-call outcome.
- R95r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 192 decisions of its own think in the 84 logs, all resumed, all fork-free, 219 calls past the first in 192 of them, 9 of 9 two-way sites failing alone.

#### R96. Row 96 `FetishBlowgun`

**`aip`:** 1 the distance past which it closes in (20, as data); 2 chance of the retreat state (30, as data).

`v14`: 0 shooting, 1 walking in, 2 retreating. Row 96's records name `SkeletonRaise` as `Skill1`, which the think does not read.

```
clear ≝ v14 ← 0;  v18 ← 0                                                  [I]

1. p ← Head
   if p ≠ 0:
     if p.kind = 1 and (u ← GameFindUnit(G, p+0x10, p+0x0C)) ≠ 0:
       clear;  SetModeAtUnit(4, u);  Pop; return
     if p.kind = 14 and (u ← GameFindUnit(G, p+0x10, p+0x0C)) ≠ 0:
       clear;  Ovr(13, 50, 0);  Walk(u, 0);  Pop; return
     Pop
2. if not melee:
     if dist > aip(1): Ovr(0, 50, 0);  WanderNear(t, 6); return
     if dist ≥ 6: goto hunt
3. if chance(2): v14 ← 2                         ; draw#1
hunt:
4. h ← FindHostile(&d, 0)
5. switch v14:
     0: v18 ← v18 + 1
        if (step low mod 3) + 3 < v18: v14 ← 1;  v18 ← 0
        if h ≠ 0: SetModeAtUnit(4, h)
        else: T56(t, 4, 0)
     1: clear;  Ovr(0, 50, 0)
        if not T56(t, 6, 1): Idle(10)
     2: if dist < 13:
          Ovr(2, 50, 0)
          if not StepAway(t, 14, 1): SetModeAtUnit(4, h);  clear
          return
        if Range(100) < 20 and T56(t, 4, 1): return
        clear;  Idle(10)
     else: Idle(10)
```

- R96a. [C] The record's type is at `+0x10` and the guid at `+0x0C` (`GameFindUnit`'s `EDX` and stack word, 10 decisions). [I] That is the word order row 65 writes; which poster's records reach a blowgun is not read. State 2's `SetModeAtUnit(4, h)` does not test `h`. At most two draws.
- R96b. [C] The map up to `GameFindUnit` for kind 1 and kind 14, `Pop` for any other kind, `Ovr(0, 50, 0)` beyond `aip(1)` or `FindHostile` with `v14` = 2 on the draw: family `blowgun`, 240 cases, 73 with a draw, 5 boundaries; the controls fail the 6, 33 and 11 that separate them. The switch after `FindHostile` is not covered.
- R96p. [C] **Logged paths of the block** (the S1b model): 118 decisions, 117 fork-free (1 stop), 0 mismatches, 264 calls past the first. Steps 1 to 5 on their taken arms (the kind-14 record, the three states). [I] The kind-1 record, a record not found, other kinds, state 1's idle, state 2 at 13 or more, other states.

- R96i. [C] As data: kind 1, no `init`, no `alt`; 8 records (396-400 fetishblow1..fetishblow5, 659-661 fetishblow6..fetishblow8); reach P; `aip` set 1,2; `aidel` 15/14/13; skills SkeletonRaise.
- R96l. [C] First boundary: 179 decisions (61 + 61 + 57) compared at `ParamsHead(U)`, 0 mismatches, one outcome, hand map (the S1b model's first call); the site control fails 179.
- R96r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 117 of 118 decisions resumed (1 stopped), all fork-free, 264 calls past the first, 10 of 10 two-way sites failing alone.

#### R97. Row 97 `Spirit`

No `aip`, no draw.

```
1. if v14 ≠ 0: Idle(50); return                                            [C]
2. if melee: v14 ← 1;  SetModeAtUnit(4, t); return
3. Idle(10)
```

- R97a. [I] One A1 at a target in melee, then `Idle(50)` on every later event: no code of the function clears `v14`.
- R97b. [C] Family `spirit`, 240 cases, 3 boundaries, no draw and no compare with a control.

- R97i. [C] As data: kind 1, no `init`, no `alt`; 1 records (401 mephistospirit); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R97l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R98. Row 98 `Smith`

No `aip`, no draw.

```
1. if melee: SetModeAtUnit(4, t); return                                   [I]
2. L ← clamp(UnitLifePct(U), 0, 100)
3. Ovr(0, (100 − L) >> 1, 0);  Walk(t, 7)       ; sar 1 of a value in 0..100
```

- R98a. [C] The map up to `SetModeAtUnit(4, t)` or `UnitLifePct(U)` only: family `smith`, 240 cases, 2 boundaries.

- R98i. [C] As data: kind 1, no `init`, no `alt`; 2 records (402 smith, 409 hephasto); reach U; `aip` set —; `aidel` 15/13/12; skills —.
- R98l. [C] First boundary: 4 decisions compared (4), 0 mismatches, 2 first-call outcomes.

#### R113. Row 113 `SiegeTower`

**`aip`:** 1 the idle.

```
1. o ← UnitGetOwner(G, U)                                                  [I]
2. if (o = 0 or UnitIsDead(o)) and t ≠ 0:
     blk ← {400, 0}
     imp ← AiUnitSearch(G, U, &blk, AiImpNearCb, 1)
     if imp ≠ 0: AiImpSetHost(imp, U);  Idle(aip(1))
3. Idle(aip(1))
```

- R113a. [I] **The tower calls `Idle(aip(1))` twice** when the search finds one: the found branch has no return before the common idle (then). No draw.
- R113c. [I] **`AiImpSetHost(imp, host)`:** with `c` the imp's AI control, a host of 0 sets `c+0x14` = −1; else, when `GameFindUnit(UnitGetGame(imp), 1, c+0x14)` finds the old host and `UnitDistSq(imp, host) > UnitDistSq(imp, old)`, nothing changes, otherwise `c+0x14` = the host's guid. So the imp keeps the nearer host; row 122 reads it.
- R113d. [C] The entry call `UnitGetOwner(G, U)` only, before any test: family `stower`, 240 cases; no control separates it.

- R113i. [C] As data: kind 1, no `init`, no `alt`; 1 records (435 barricadetower); reach ·; `aip` set 1; `aidel` 15/15/15; skills —.
- R113l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R114. Row 114 `ReanimatedHorde`

**`aip`:** 1 melee: chance of A1; 2 the melee idle (70 in `reanimatedhorde6`, else 20/15/12, as data); 3 the charge's range (10–18, as data); 4 chance of the charge; 5 chance to walk; 6 chance to walk toward; 7 the idle. `aip(8)` is not read.

```
1. U+0xC4 ← U+0xC4 | 0xE                                                   [I]
2. if melee:
     if chance(1): SetModeAtUnit(4, t)
     else: Idle(aip(2))
     return
3. if Skill2 ≥ 0 and AiApproachPointTest(U, t) and dist < aip(3) and dist > 5 and rchance(4):
     UseSkill2(t); return                       ; Charge
4. if chance(5): Walk(t, 0); return
5. if chance(6): Toward(t, 4, 0); return
6. Idle(aip(7))
```

- R114b. [C] The map up to `SetModeAtUnit`, `Idle(aip(2))`, `AiApproachPointTest`, `Walk`, `Toward` or `Idle(aip(7))`, with `+0xC4 |= 0xE` before each: family `horde`, 240 cases, 168 with a draw, 6 boundaries; the `≤`, Normal-column and unsigned-`Skill` controls fail the 20, 90 and 52 that separate them.
- R114p. [C] **Logged paths of the block** (the S1b model): 31 decisions, all fork-free, 0 mismatches, 28 calls past the first. Steps 2 to 6 on their taken arms. [I] The melee A1, the charge, `Skill2 < 0`.

- R114i. [C] As data: kind 1, no `init`, no `alt`; 6 records (436-440 reanimatedhorde1..reanimatedhorde5, 698 reanimatedhorde6); reach PU; `aip` set 1,2,3,4,5,6,7,8; `aidel` 15/14/13; skills Self-resurrect, Charge.
- R114l. [C] First boundary: 43 decisions compared (12 + 31), 0 mismatches, 2 first-call outcomes.
- R114r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 243 decisions of its own think in the 84 logs, all resumed, all fork-free, 221 calls past the first in 221 of them, 8 of 8 two-way sites failing alone.

#### R115. Row 115 `SiegeBeast`

**`aip`:** 1 the squared search distance's root (625 squared, as data); 2 melee: chance of A1; 3 melee: chance of the stomp; 4 the melee idle; 5 inside the skill's `Param5`: chance of the stomp; 6 chance of the override; 7 the override, clamped (100, as data).

```
1. o ← UnitGetOwner(G, U)                                                  [I]
2. if MonIsDeathMode(U): return                  ; no command
3. if o = 0 and UnitAlignGet(U) = 0:
     blk ← {aip(1)·aip(1)}
     imp ← AiUnitSearch(G, U, &blk, AiImpNearCb, 1)
     if imp ≠ 0: AiImpSetHost(imp, U)
4. if melee:
     if Skill1 ≥ 0 and chance(3): MonAiUseSkill(Sk1mode, Skill1, 0, 0, 0); return   ; the stomp
     if chance(2): SetModeAtUnit(4, t)
     else: Idle(aip(4))
     return
5. if Skill1 ≥ 0 and dist < SkillGetParam5(Skill1) and rchance(5):
     MonAiUseSkill(Sk1mode, Skill1, 0, 0, 0); return
6. if AiApproachPointTest(U, t) and chance(6):
     Ovr(0, clamp(aip(7), 0, 127), 0);  Toward(t, 12, 0); return
7. Toward(t, 12, 0)
```

- R115a. [I] The callback and the host are row 113's.
- R115b. [C] The entry call `UnitGetOwner(G, U)` only, before any test: family `sbeast`, 240 cases; no control separates it.

- R115i. [C] As data: kind 1, no `init`, no `alt`; 5 records (441-445 siegebeast1..siegebeast5); reach PU; `aip` set 1,2,3,4,5,6,7; `aidel` 15/14/13; skills Siege Beast Stomp, Charge.
- R115l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

### Batch 9: pool-F (act V minions)

#### R116. Row 116 `Minion`

**`aip`:** 1 melee: chance to attack; 2 chance of A2, and the melee idle; 3 at range: chance to walk; 4 the idle at range. `aip(5)` is not read. Alike in all 11 records for those read, as data.

```
1. f ← 0                                                                   [I]
2. p ← Head
   if p ≠ 0:
     if p.kind = 1 and p+0x14 > T and (u ← GameFindUnit(G, p+0x0C, p+0x10)) ≠ 0 and not UnitIsDead(u):
       f ← 1
       if u ≠ t:
         t ← u;  UnitEdgeDistance(U, u);  melee ← InMeleeRange(U, u, 0)
     else: AiParamsPop(G, U)
3. if melee:
     if f = 0 and not chance(1): Idle(aip(2)); return    ; draw#1
     if chance(2): SetModeAtUnit(5, t)                   ; draw#1..#2
     else: SetModeAtUnit(4, t)
     return
4. if f = 0 and not chance(3): Idle(aip(4)); return      ; draw#1
5. Walk(t, 0)
```

- R116a. [I] A kind-1 record that has not expired (`+0x14` above the frame, signed) and whose unit is found alive makes that unit the target and skips the idle draws; a found record is not popped here. The lookup reads the type at `+0x0C` and the guid at `+0x10`, row 14's order. At most two draws. Who posts such records is Open questions.
- R116b. [C] The map up to `AiParamsPop`, `UnitEdgeDistance`, `Idle(aip(2))`, the two A commands, `Idle(aip(4))` or `Walk(t, 0)`, the lookups run on the image: family `minion`, 240 cases, 85 with a draw, 7 boundaries; the `≤`, Normal-column and compare controls fail the 12, 44 and 4 that separate them.
- R116p. [C] **Logged paths of the block** (the logged-path model): 739 decisions, 739 fork-free, 0 mismatches. Both arms met, each failing alone: `3.chance(1)`, `3.chance(2)`, `3.melee`, `4.chance(3)`; one arm met, failing alone: `3.f=0`, `4.f=0` true. [I] The untaken arm of each one-arm branch; `2.p` (separates nothing); `<` against `≤` but at the equal pairs met (`4.chance(3)`); what the model does not compare.

- R116i. [C] As data: kind 1, no `init`, no `alt`; 11 records (453-460 minion1..minion8, 682-684 minion9..minion11); reach PU; `aip` set 1,2,3,4,5; `aidel` 15/14/13; skills —.
- R116l. [C] First boundary: 739 decisions of the 84 logs, 739 fork-free, compared at the first call, 0 mismatches, 0 stops there.

#### R117. Row 117 `SuicideMinion`

**`aip`:** 2 the idle (5, as data); 3 chance to walk (50/60/70, as data); 5 the timer after the first melee event (0 in every stock record, as data). `aip(1)` and `aip(4)` are not read. Also the think of state 15.

```
1. if v14 ≠ 0:                                                             [I]
     if T > v14: SetModeAtUnit(0, t)
     else: Idle(aip(2))
     return
2. if melee: v14 ← T + aip(5);  Idle(aip(2)); return
3. if chance(3): Walk(t, 0)                     ; draw#1
   else: Idle(aip(2))
```

- R117a. [C] The minion dies by its own command, mode 0, when `v14 ≠ 0` and `v14 < T` (`1.v14!=0` both ways, `1.v14<T` true only). [I] Whatever the distance then (no output splits the 10 death decisions by distance). What the death does is outside this function. At most one draw.
- R117b. [C] The map up to `SetModeAtUnit(0, t)`, `Idle(aip(2))` (with `v14` written before it on the melee arm) or `Walk(t, 0)`: family `suicide`, 240 cases, 44 with a draw, 3 boundaries; the controls fail the 6, 83 and 21 that separate them.
- R117p. [C] **Logged paths of the block** (the logged-path model): 164 decisions, 164 fork-free, 0 mismatches. Both arms met, each failing alone: `1.v14!=0`, `2.melee`, `3.chance(3)`; one arm met, failing alone: `1.v14<T` true; stores failing alone: `set v14=T + aip(5)`. [I] The untaken arm of each one-arm branch; `<` against `≤` but at the equal pairs met (none); what the model does not compare.

- R117i. [C] As data: kind 1, no `init`, no `alt`; 8 records (461-468 suicideminion1..suicideminion8); reach P; `aip` set 1,2,3,4; `aidel` 15/14/13; skills —.
- R117l. [C] First boundary: 164 decisions of the 84 logs, 164 fork-free, compared at the first call, 0 mismatches, 0 stops there.

#### R118. Row 118 `Succubus`

**`aip`:** 1 melee: chance of A1 (90–95, as data); 2 at range: chance to walk; 3 chance to curse; 4 the curse's range (15–25, as data); 5 the melee idle; 6 the idle at range; 7 the target's life percent at or above which `Skill1` goes; 8 the own life percent at or below which `Skill2` goes, and the bolt's chance (0 in Normal, as data, so never there).

```
1. if not StatListFindFlag(t, 0x20) and dist < aip(4) and chance(3):       ; draw#1     [I]
     if Skill1 > 0 and UnitLifePct(t) ≥ aip(7): UseSkill1(t); return
     if Skill2 > 0 and UnitLifePct(U) ≤ aip(8): UseSkill2(t); return
     if Skill3 > 0 and (UnitGetMaxHp(t) > UNIT_GetMaxMana(t) or t = 0 or t.type ≠ 0): UseSkill3(t); return
     if Skill4 > 0 and t ≠ 0 and t.type = 0: UseSkill4(t); return
2. if melee:
     if chance(1): SetModeAtUnit(4, t)                                     ; draw
     else: Idle(aip(5))
     return
3. if Skill5 > 0 and aip(8) > 0 and (h ← FindHostile(&dist, 0)) ≠ 0 and Range(100) < aip(8):
     UseSkill5(h); return                                                  ; SuccubusBolt
4. if chance(2): Walk(t, 0)                                                ; draw
   else: Idle(aip(6))
```

- R118a. [I] The curses go to a target without the stat-list flag `0x20`; the skill tests are `> 0` (signed word, `cmp word, 0; jle`), so a skill id 0 is never used. With the stock slots, `Skill3` (Defense Curse) goes to a monster or to a player whose maximum life exceeds its maximum mana, `Skill4` (Blood Mana) to any other player. `t` is dereferenced by `StatListFindFlag` before the later null tests. At most three draws.
- R118b. [C] The map up to `UnitLifePct(t)`, `UnitLifePct(U)`, `UnitGetMaxHp(t)`, `UseSkill4`, `SetModeAtUnit(4, t)`, `Idle(aip(5))`, `FindHostile`, `Walk(t, 0)` or `Idle(aip(6))`: family `succubus`, 240 cases, 218 with a draw, 9 boundaries; the controls fail the 26, 125, 22 and 69 that separate them.

- R118i. [C] As data: kind 1, no `init`, no `alt`; 8 records (469-473 succubus1..succubus5, 634-635 succubus6..succubus7, 719 succubus8); reach PU; `aip` set 1,2,3,4,5,6,7,8; `aidel` 15/14/13; skills Defense Curse, Blood Mana, SuccubusBolt.
- R118l. [I] Logged, not compared: 108 decisions (52 + 46 + 10) in a row with no model, so the first boundary of this row is not raised.
- R118r. [I] Past the first boundary, a consistency check only: 56 of its own think's decisions in the rev 4 and rev 6 logs, 56 resumed, 0 mismatches, 0 stopped, 12 later calls matched, an unknown value deciding 0 of 12 later steps. The row is not under sentence H1.

#### R119. Row 119 `SuccubusWitch`

**`aip`:** 1 melee: chance of A1; 2 chance to walk; 3 the curse chance and the step-away chance (0/0/0 in `succubuswitch1`, 0/25/35 in 2, 0/30/40 in 3, 0/30/50 in 4–9, as data: so `succubuswitch1` never does either by it, and no witch in Normal); 4 the curse's range, and its low byte the step's length; 5 chance of the bolt's first test, and of S2 without a bolt; 6 the idle; 7, 8 as row 118.

```
1. if t ≠ 0 and not StatListFindFlag(t, 0x20) and dist < aip(4) and chance(3):   ; draw#1   [I]
     if Skill1 > 0 and UnitLifePct(t) ≥ aip(7): UseSkill1(t); return
     if Skill2 > 0 and UnitLifePct(U) ≤ aip(8): UseSkill2(t); return
     if Skill3 > 0 and (UnitGetMaxHp(t) > UNIT_GetMaxMana(t) or t.type ≠ 0): UseSkill3(t); return    ; "Skill3 without the !t test"
     if Skill4 > 0 and t.type = 0: UseSkill4(t); return
2. if melee:
     if chance(3) and StepAway(t, aip(4) & 0xFF, 1): return                      ; draw
     if chance(1): SetModeAtUnit(4, t)                                           ; draw
     else: Idle(aip(6))
     return
3. if Skill5 ≥ 0 and aip(8) > 0 and chance(5) and (h ← FindHostile(&dist, 0)) ≠ 0 and Range(100) < aip(8):
     UseSkill5(h); return
4. if dist < aip(4) and chance(3) and StepAway(t, aip(4) & 0xFF, 1): return      ; dist: the slot FindHostile wrote
5. if Skill5 < 0 and (h ← FindHostile(&dist, 0)) ≠ 0 and chance(5): SetModeAtUnit(9, h); return
6. if chance(2): Walk(t, 0); return
7. if D100() < 50 and T56(t, 6, 1): return
8. Idle(aip(6))
```

- R119a. [I] The finding states step 1's four curses as "the four curses of row 118, Skill3 without the `!t` test" and groups no clause beyond that; step 1's Skill3 line keeps that wording. The step's length is `movzx eax, byte [edi+eax*2+0x68]`. The bolt's sign test is `≥ 0` (`jl`) where the succubus has `> 0`. The distance compared after the first search is the frame word `FindHostile` was given. At most six draws.
- R119b. [C] The map up to its thirteen boundary sites, null targets included: family `witch`, 240 cases, 223 with a draw; the controls fail the 40, 135, 20 and 64 that separate them. The bolt after the first search and the S2 after the second are not covered.

- R119i. [C] As data: kind 1, no `init`, no `alt`; 9 records (9 records, as the index lists them); reach PU; `aip` set 1,2,3,4,5,6,7,8; `aidel` 15/14/13; skills Amplify Damage, Weaken, Defense Curse, Blood Mana, SuccubusBolt.
- R119l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R120. Row 120 `Overseer`

**`aip`:** 1 `Skill1`'s cooldown (250, as data); 2 chance of `Skill2` (50–70, as data); 3 chance of `Skill3`; 4 the distance it keeps; 5 the band around it (`aip(4) ∓ aip(5)` 10 and 24, as data); 6 melee: chance to attack; 7 chance of A2 (Nightmare and Hell 30–55, as data). `aip(8)` is not read.

- R120a. [I] `AiStoredHostile`: `UnitStoredUnit9C` when `U+0xC8` has bit `0x20000`; a player not in mode 0 or 17, or a monster not in mode 0 or 12 that `UnitsHostile(G, U, w)` gives, else 0. `Skill3` is tested `≠ 0` (`je`), not by sign. The step's byte is `sub dl, cl`. At most four draws.
- R120b. [C] **`AiOverseerMinionCb`:** a candidate that is not the searcher, a monster, of `MonBaseId` 453 (`minion1`), not in a death mode, not `UnitsHostile(G, searcher, cand)`, not in state 141 (`bloodlust`, the state Overseer Whip applies) is counted (`blk[5] += 1`); the first with `UnitDistSq ≤ blk[0]` and `UnitLifePct < blk[2]` becomes `blk[3]`, the first with `UnitDistSq ≤ blk[1]` and not unique (`MonTypeFlag(cand, 8)` 0) `blk[4]`; it returns 0. No draw. 240 emulated cases, 0 mismatches, 18 controls failing. Row 128 pushes the same callback (in `AiNihlathak`; also, `AiOverseer`), and States row 141 is `bloodlust`.
- R120c. [C] The map up to `UnitsHostile` (inside `AiStoredHostile`), `UseSkill1` (a stored living player), the A commands or the search with the block `{0x240, 0x190, 0x32, 0, 0, 0}`, on an image with no quest list, so the hook's other branches are not covered: family `overseer`, 240 cases, 132 with a draw, 5 boundaries; the controls fail the 13, 31 and 7 that separate them. Everything after the search is not covered.

- R120i. [C] As data: kind 1, no `init`, no `alt`; 6 records (479-483 overseer1..overseer5, 724 overseer6); reach PU; `aip` set 1,2,3,4,5,6,7; `aidel` 15/14/13; skills Cry Help, Healing Vortex, Overseer Whip, Smite.
- R120l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R121. Row 121 `MinionSpawner`

**`aip`:** 1 the uses in all (100, as data); 2 the most minions counted, and the idle (25, as data); 3 the frames between uses (100, as data); 4 the range (20/22/25, as data). `aip(5)` is not read.

```
init:  v14 ← T;  v18 ← 0                                        [I]

1. if v18 ≥ aip(1): return                       ; spent: no command        [I]
2. if dist > aip(4) or T < v14: Idle(aip(2)); return
3. n ← 0;  AiUnitSearch(G, U, &n, AiMinionCountCb, 1)
4. if Skill1 ≥ 0 and n < aip(2):
     v14 ← T + aip(3);  v18 ← v18 + 1;  UseSkill1(t); return    ; MinionSpawner
5. Idle(aip(2))
```

- R121a. [C] **`AiMinionCountCb`** counts (`*blk += 1`) a candidate that is not the searcher, a monster not in a death mode, of `MonBaseId` 453 or 461 (`minion1`, `suicideminion1`; `sub 0x1C5; je; sub 8; jne`), of alignment 0; it has no distance test and returns 0. No draw. 240 emulated cases, 0 mismatches, 6 controls failing (453 counted 62, 461 45).
- R121b. [C] The map up to the return (no call; `v14`, `v18` unchanged), `Idle(aip(2))` or the search with the block `{0}`: family `spawner`, 240 cases, no draw, 4 boundaries; the Normal-column and compare controls fail the 120 and 107 that separate them. The use after the search is not covered.

- R121i. [C] As data: kind 1, `init`, no `alt`; 9 records (484-491 minionspawner1..minionspawner8, 710 demonspawner); reach ·; `aip` set 1,2,3,4,5; `aidel` 15/15/15; skills MinionSpawner.
- R121l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R122. Row 122 `Imp`

**`aip`:** none of its own. Every slot is read from fixed records, whatever the imp's own: `R1..R4` are MonStats records 492..495 (`imp1..imp4`). `R1.aip(1)` the life percent of the hurt teleport (25); `R1.aip(2)` its radius (14); `R1.aip(3)` the chance of it (10); `R2.aip(1)` the host's distance (5, squared 25); `R3.aip(1)` the step's distance (10); `R3.aip(2)` the step's chance (40); `R3.aip(3)` the missile's near band (22); `R3.aip(4)` its chance (25/30/35); `R4.aip(3)` the far band (13); `R4.aip(4)` its chance (60/65/70), as data. `Skill1` and `Skill4` are the imp's own record's.

```
init:  v14 ← −1                         ; no host                [C]

1. if v14 ≠ −1 and UnitAlignGet(U) = 0:                                     [I]
     h ← GameFindUnit(G, 1, v14)
     if h ≠ 0 and not UnitIsDead(h) and UnitGetOwner(G, h) = 0 and UnitAlignGet(h) = 0:
       if UnitDistSq(U, h) > R2.aip(1)·R2.aip(1): Walk(h, 0); return
       if Skill1 ≥ 0: UseSkill1(h); return          ; Imp Teleport onto the host
     else: v14 ← −1
2. if melee:
     if Skill1 ≥ 0 and LifePct(U) < R1.aip(1):
       AiUseSkillNearSelf(U, R1.aip(2), Skill1, (i8) Sk1mode); return
     if D100() < R3.aip(2) and StepAway(t, 5, 1): return
3. if Skill1 ≥ 0 and D100() < R1.aip(3):
     AiUseSkillNearSelf(U, R1.aip(2), Skill1, (i8) Sk1mode); return
4. if dist < R3.aip(1) and D100() < R3.aip(2): StepAway(t, 5, 0); return
5. if Skill4 ≥ 0 and (h ← FindHostile(&dist, 0)) ≠ 0:
     if dist < R3.aip(3):
       if Range(100) < R3.aip(4): UseSkill4(h); return
     else if dist < R4.aip(3) and Range(100) < R4.aip(4): UseSkill4(h); return
6. if D100() < 33: WalkStop(t, 4); return
7. if D100() < 20: Ring(8); return
8. Idle(10)
```

`AiUseSkillNearSelf(unit, r, skill, mode)`, [I]:

```
n: i32 ← 2·r                                         ; add edi, edi; cannot wrap for an i16 r
ox ← n > 0 ? one inline step: low & (n−1) when n is a power of two, else low mod n : 0     ; signed jg
oy ← the same, a second step
MonAiUseSkill(game of unit, unit, mode, skill, 0, X + ox − r, Y + oy − r)                  ; X, Y the unit's own position
```

- R122a. [I] A host found but with `Skill1 < 0` goes on with `v14` kept. Do 129's attach then sets state 16. The far band is smaller than the near one, so the second missile test can hold only when `R4.aip(3) > R3.aip(3)`, which no stock difficulty has. The helper's mode is the record byte sign-extended (`movsx edx, byte [eax+0x180]`) where `UseSkill` callers elsewhere zero-extend. At most six draws.
- R122b. [C] The map up to `UnitAlignGet(U)`, `AiLifePct`, `StepAway(t, 5, 1)`, the helper's `UseSkill` (both jitter draws, `n` a power of two, another value and `≤ 0` all met), `StepAway(t, 5, 0)`, `FindHostile`, `WalkStop`, `Ring(8)` or `Idle(10)`, with the slots read from the records 492–495: families `impi` and `imp`, 240 cases each, `imp` 152 with a draw, 9 boundaries; the controls fail the 14, 69, 6 and 52 that separate them, and the "own record" control the 119 it separates. The host branch past `UnitAlignGet` and the missile past `FindHostile` are not covered.
- R122p. [C] **Logged paths of the block** (the logged-path model): 320 decisions, 320 fork-free, 0 mismatches. Both arms met, each failing alone: `1.R2a1^2<dsq`, `1.dead`, `1.owner=0`, `1.v14!=-1`, `2.D100<R3a2`, `2.melee`, `3.D100<R1a3`, `4.D100<R3a2`, `4.dist<R3a1`, `5.Range<R3a4`, `5.dist<R3a3`, `5.h`, `6.D100<33`, `7.D100<20`; one arm met, failing alone: `1.Skill1>=0`, `1.align=0`, `1.h`, `1.halign=0`, `2.Skill1>=0`, `2.stepped`, `3.Skill1>=0`, `5.Skill4>=0` true; `2.life<R1a1`, `5.dist<R4a3` false; stores failing alone: `set v14=-1`. [I] The untaken arm of each one-arm branch; `<` against `≤` but at the equal pairs met (`1.R2a1^2<dsq`, `3.D100<R1a3`, `4.dist<R3a1`, `5.Range<R3a4`, `5.dist<R3a3`, `6.D100<33`, `7.D100<20`); what the model does not compare.

- R122i. [C] As data: kind 1, `init`, no `alt`; 8 records (492-496 imp1..imp5, 688-689 imp6..imp7, 714 imp8); reach PU; `aip` set 1,2,3,4; `aidel` 15/14/13; skills Imp Teleport, ImpBolt, Imp Fireball, Imp Fire Missile, Imp Inferno, Imp Fire Missile Ex.
- R122l. [C] First boundary: 320 decisions of the 84 logs, 320 fork-free, compared at the first call, 0 mismatches, 0 stops there.

#### R123. Row 123 `Catapult`

**`aip`:** 1 chance of A1 (20/22/25, as data).

```
if chance(1): SetModeAtUnit(4, 0)               ; draw#1, a null target (push ebx, ebx = 0)   [I]
else: Idle(15)
```

- R123a. [I] It reads neither its target nor its distance.
- R123b. [C] The map up to `SetModeAtUnit(4, 0)` or `Idle(15)`: family `catapult`, 240 cases, all with a draw; the controls fail the 22 and 54 that separate them.

- R123i. [C] As data: kind 1, no `init`, no `alt`; 4 records (497-500 catapult1..catapult4); reach ·; `aip` set 1; `aidel` 15/15/15; skills —.
- R123l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R124. Row 124 `FrozenHorror`

**`aip`:** 1 melee: chance of A1; 2 at range: chance to walk; 3 chance of the blast; 4 the idle.

```
1. lv ← 0                                                                   [I]
   if Skill1 ≥ 0:
     s ← SKILLS_GetUnitSkill(U, Skill1)
     if s ≠ 0: lv ← SKILLS_GetSkillLevel(U, s, 1)
2. if Skill1 ≥ 0 and dist < max(lv, 0) and chance(3) and not HasState(U, 12):
     UseSkill1(t); return                       ; Horror Arctic Blast
3. if HasState(U, 12): State(12, 0)
4. if melee:
     if chance(1): SetModeAtUnit(4, t)
     else: Idle(aip(4))
     return
5. if chance(2): WalkZ(t)
   else: Idle(aip(4))
```

- R124a. [C] The level from `GetUnitSkill` as the distance (4; 8 decisions within, 40 not). [I] The skill's level as a distance, `Sk1lvl` 4–6, as row 89's test with `SKILLS_GetUnitSkill` in place of `SkillFindByOwner`, a default of 0 instead of 1 and the level clamped at 0 (`setl; sub 1; and`). At most two draws.
- R124b. [C] The skill-sign test up to `SKILLS_GetUnitSkill` or, for `Skill1 < 0`, `HasState(U, 12)`, and nothing after: family `horror`, 240 cases; the unsigned-`Skill` control fails the 96 it separates.
- R124p. [C] **Logged paths of the block** (the S1b model): 48 decisions, all fork-free, 0 mismatches, 144 calls past the first. Steps 1 to 5 on their taken arms (level 4 as the distance). [I] `Skill1 < 0`, no skill, state 12 set.

- R124i. [C] As data: kind 1, no `init`, no `alt`; 5 records (501-505 frozenhorror1..frozenhorror5); reach PU; `aip` set 1,2,3,4; `aidel` 15/14/13; skills Horror Arctic Blast.
- R124l. [C] First boundary: 143 decisions compared (95 + 40 + 8), 0 mismatches, 1 first-call outcome.
- R124r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 135 decisions of its own think in the 84 logs, all resumed, all fork-free, 406 calls past the first in 135 of them, 6 of 6 two-way sites failing alone.

#### R125. Row 125 `BloodLord`

Tier AI: [machinery § T125](../machinery/), not repeated here.

#### S15. State row 15

Alias of row 117: the same think word. [C] in both tables

- S15a. [I] **Who sets it.** Do 131 (Overseer Whip) on a live monster target of base 453 draws `RNG_Range(caster, 100)`; at or above calc1 and with the target not in state 141 it calls `WhipChangeClass`, which changes the target's class along its chain to the skill's `summon` (461, `suicideminion1`), calls `MonAiInit(G, target, ctl, 15)` and sets state 142; below calc1 it applies state 141. So a whipped minion turned suicide minion runs row 117's think.

- S15i. [C] As data: kind 1, no `init`, no `alt`.

#### S16. State row 16

**`aip`:** of fixed records, not its own: `R1.aip(2)` the teleport radius (14), `R2.aip(2)` the near distance (25), `R2.aip(3)` the cast's chance (45/55/65), `R2.aip(4)` the discarded draws' range, as data. `R1` and `R2` as row 122.

```
init:                                                          [C]
  k ← low bit of one inline step
  for i in 0 ..< 2:
    k ← (k + 1) mod 2
    slot ← SLOTS[k].slot                         ; {2, 0}, {4, 0}
    if SkillFindByOwner(U, M.Skill[slot + 1], −1):
      v18 ← slot;  v1C ← SLOTS[k].word; return
  v18 ← 0;  v1C ← 0

think:                                                                      [I]
1. o ← UnitGetOwner(G, U)
2. if not HasState(U, 143) or o = 0:
     MonAiInit(G, U, ctl, 0);  Idle(1); return
3. if dist > 24 or UnitIsDead(o) or UnitAlignGet(o) ≠ 0 or v18 = 0:
     AiUseSkillNearSelf(U, R1.aip(2), R1.Skill1, (i8) R1.Sk1mode)     ; teleport off
     v14 ← −1; return
4. if dist < R2.aip(2) and Range(100) < R2.aip(3):
     UnitGetSubX(t);  UnitGetSubY(t)             ; results unused
     if v1C ≠ 0: Range(2·R2.aip(4));  Range(2·R2.aip(4))        ; results unused
     s ← R1.Skill[v18 + 1]
     if s ≥ 0: MonAiUseSkill(R1.Sk[v18 + 1]mode, s, t, 0, 0)
     else: Idle(20)
     return
5. if Range(100) < 50: SetModeAtUnit(8, t)
   else: Idle(20)
```

- S16a. [I] **Who sets it.** `ImpAttach` (do 129's attach): an imp of base 492 and a host of base 435 or 441 get state 143, each the other's owner (twice), two link calls, the imp's `+0xC4 &= ~0xE`, then `MonAiInit(G, imp, ctl, 16)`.
- S16b. [I] **The init** picks the first of the two slots, starting from the one the step's low bit selects, whose skill in the imp's **own** record the imp has: slot 2 (`Skill3`, Imp Fireball) or 4 (`Skill5`, Imp Inferno). The think casts `imp1`'s skill at the slot, not its own (`[ebx + v18·2 + 0x170]`, `ebx` the record 492). Teleporting off, do 129 detaches it; on a non-monster `U` the store goes through a null control. The init writes `v1C` = 0 on both rows, so the two draws of step 4 happen only if another writer sets it. At most three draws.
- S16c. [C] The init's map to its return: family `imp16i`, 240 cases, all with the step. The think's entry call `HasState(U, 143)` after `UnitGetOwner` only, nothing after it: family `imp16`, 240 cases; no control separates it.

- S16i. [C] As data: kind 1, `init`, no `alt`.

### Batch 10: pool-G (act V rest, the Ancients, Baal's minions)

#### R126. Row 126 `CatapultSpotter`

**`aip`:** 1 chance to strike; 2 the frames between strikes, and the idle; 4 the strike's radius; 5 how many more strikes keep one skill index (10, as data).

```
1. if v1C = 0 or D100() < 3:                         ; the step only when v1C ≠ 0     [I]
     if SpotterCatapultDead(U): SetModeAtUnit(0, t); return
2. if v1C = 0: v1C ← 1
3. if aip(2) − T + v1C > 0: Idle(aip(2)); return     ; s32
4. if t = 0 or not chance(1): Idle(aip(2)); return   ; draw only with a target
5. if v18 > 0: k ← v14;  v18 ← v18 − 1
   else: k ← Range(5);  v14 ← k;  v18 ← aip(5)       ; draw
6. x ← Range(2·aip(4)) − aip(4) + t's x              ; draw, none when 2·aip(4) ≤ 0
   y ← Range(2·aip(4)) − aip(4) + t's y              ; draw, the same
7. if FreeNearStep(UnitGetRoom(U), &(x, y), 2, 0x805, 3) = 0: Idle(15); return
8. MonAiUseSkill(4, g_AiSpotterSkills[k], 0, x, y);  v1C ← T
```

- R126b. [C] The map up to its first observed callee, 3 boundaries: family `spotter`, 240 cases, 200 with a draw; controls `le`, `d0`, `cmp` and `self` (the strike point from the spotter's position) fail the 5, 123, 27 and 53 they separate. Equality met at `aip(2) − T + v1C > 0` 18 times, `v18 > 0` 17.

- R126i. [C] As data: kind 1, no `init`, no `alt`; 4 records (516-519 catapultspotter1..catapultspotter4); reach ·; `aip` set 1,2,3,4,5; `aidel` 15/15/15; skills Catapult Charged Ball, Catapult Spike Ball, CatapultBlizzard, CatapultPlague, CatapultMeteor.
- R126l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R127. Row 127 `NpcBarb`

**`aip`:** 1 the delay after A1; 2 chance to run at a target; 3 the distance limit of that run.

```
init: ret 4                                                    [C]

1. if U+0xD0 = 11: TargetListAdd(0, 8)                 ; the event goes on  [I]
2. if t ≠ 0:
     if melee: SetModeAtUnit(4, t);  Delay(aip(1)); return
     if dist < aip(3) and chance(2): Ovr(0, 100, 0);  RunToUnit(t); return
3. a ← step();  b ← step()                              ; two inline steps, u32 low words
   if WalkPt(X + a mod 20 − 40, Y + b mod 20 − 10): return
4. a ← step();  b ← step();  c ← step()                 ; three more
   s ← 1 when a's low bit is set, else −1
   if WalkPt(X + b mod 20 − 10, Y + c mod 20 − 10 − 30·s): return
5. a ← step();  b ← step()                              ; two more
   if WalkPt(X + a mod 20 − 10, Y + b mod 20 − 10 + 30·s): return
6. Idle(15)
```

- R127a. [I] `U+0xD0` = 11 is no target list; the first walk point lies 21–40 subtiles towards −x.
- R127b. [C] The init's return; the think up to the first walk: families `barbi` and `barb`, 240 cases each, `barb` 4 boundaries, 115 with a draw; controls `le`, `d0`, `cmp` fail the 4, 31, 15 they separate. Equality met at `dist < aip(3)` 15 times. The retries follow a boundary and stay `[I]`.

- R127i. [C] As data: kind 2, `init`, no `alt`; 2 records (522-523 act5barb1..act5barb2); reach ·; `aip` set 1,2,3; `aidel` 15/15/15; skills —.
- R127l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R129. Row 129 `GenericSpawner`

**`aip`:** 1 the frames between casts (80, as data); 3 how many casts (15, as data).

- R129a. [I] The cell test is for the hut's own class 528 (`evilhut`), not the picked class; where the picked class goes (Nest's function) is not read here.
- R129b. [C] The init's return state; the think's map to its first callee, 4 boundaries: families `genspi`, `genspawn`, 240 cases each; controls `d0`, `cmp`, `abs` (without the absolute value) fail the 45, 54, 26 they separate. No case reaches the pick's draw.

- R129i. [C] As data: kind 1, `init`, no `alt`; 1 records (528 evilhut); reach ·; `aip` set 1,3; `aidel` 15/15/15; skills Nest.
- R129l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R130. Row 130 `DeathMauler`

**`aip`:** 1 in melee range: chance of A1; 2 chance to walk; 3 Death Maul's range (15–21, as data); 4 its chance (50–90, as data).

```
1. if melee:                                                              [I]
     if chance(1): SetModeAtUnit(4, t)
     else: Idle(15)
     return
2. if Skill1 ≥ 0 and dist < aip(3) and chance(4): MonAiUseSkill(Sk1mode, Skill1, t, 0, 0); return
3. if chance(2): Walk(t, 0); return
4. Idle(15)
```

- R130a. [C] The whole map to its 4 boundaries: family `mauler`, 240 cases, all drawing; controls `le`, `d0`, `cmp`, `u16` fail the 33, 81, 34, 11 they separate. Equality met at `dist < aip(3)` 34 times, on draws `aip(4)` 16, `aip(2)` 10, `aip(1)` 8.
- R130p. [C] **Logged paths of the block** (the S1b model): 34 decisions, 33 fork-free (1 stop), 0 mismatches; every arm but one. [I] Within `aip(3)` with `chance(4)` missed, `Skill1 < 0`.

- R130i. [C] As data: kind 1, no `init`, no `alt`; 6 records (529-533 deathmauler1..deathmauler5, 604 deathmauler6); reach PU; `aip` set 1,2,3,4; `aidel` 15/15/15; skills DeathMaul.
- R130r. [I] Past the first boundary, a consistency check only: 34 of its own think's decisions in the rev 4 and rev 6 logs, 33 resumed, 0 mismatches, 1 stopped, 0 later calls matched, an unknown value deciding 0 of 0 later steps. The row is not under sentence H1.

#### R131. Row 131 `Wussie`

No `aip` slot read.

- R131a. [I] The block is read from the code.
- R131b. [C] The entry call only: family `wussie`, 240 cases, 1 boundary; no control separates it.

- R131i. [C] As data: kind 2, no `init`, no `alt`; 1 records (534 act5pow); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R131l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R132. Row 132 `AncientStatue`

No `aip` slot read.

```
if Quest35 is present with q+0x11 ≠ 0 and q+0x0C = 0 and U lacks state 146:     [I]
  RoomPinSet(UnitGetRoom(U), 0);  MonAiUseSkill(4, 302, 0, X, Y)
else: Idle(25)
```

- R132a. [C] The two quest tests and the `HasState` call, 2 boundaries: family `statue`, 240 cases; no control separates it.

- R132i. [C] As data: kind 0, no `init`, no `alt`; 3 records (537-539 ancientstatue1..ancientstatue3); reach ·; `aip` set —; `aidel` 15/15/15; skills MinionSpawner.
- R132l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R133. Row 133 `Ancient`

**`aip`:** per class below; the class jump (`ancientbarb1`, 2, 3 are classes 540, 541, 542), any other class or no unit returning at once.

```
pick: AiPickPlayerTarget(&score, &n, 0, AiSameLevelCb)      [I]
  each of the eight player lists G+0x10F8 + 4i: each player cb admits is scored (AiPlayerThreatScore); the best kept
  the ninth list's units with the searcher's byte +0x18 are scored too
  if the tenth list's best lies within 5 of U and the best player is not in melee range:
    a type-2 path plan to that player;  on no point the tenth list's unit is taken
  AiSameLevelCb(a, b): RoomGetLevelId(a's room) = RoomGetLevelId(b's room); fatal on a null

ancientbarb1 (class 540): 1 the whirl's edge limit; 2 its chance; 3 A1/A2's chance; 4 how far past the target:   [I]
1. if state 54: Idle(25); return
2. t ← t, or the pick when none;  none: Idle(25); return
3. m ← InMeleeRange(U, t);  e ← UnitEdgeDistance(U, t)
4. if Skill1 > 0 and MonHasSkill and e < aip(1) and Range(100) < aip(2):
     dx ← X(t) − X(U);  dy ← Y(t) − Y(U);  r ← UnitDistance(U, X(t), Y(t)), 1 when 0
     point ← (X(t) + aip(4)·dx ÷ r, Y(t) + aip(4)·dy ÷ r)
     MonCmdInit(U, (i8) Sk1mode);  UNIT_SetUsedSkill(Skill1);  PathSetStopDist(1);  MonSetMode to point, byte 100
     return
5. if not m: WalkZ(t);  Delay(10); return
6. if Range(100) < aip(3): SetModeAtUnit(Range(2) ≠ 0 ? 4 : 5, t); return    ; second draw
7. Idle(25)

ancientbarb2 (class 541): 1 the edge limit; 2 A1's chance; 3 the self skill's chance; 4 the step away's chance; 5 its length:   [I]
1. the pick;  none: Idle(25); return
2. m, e as above
3. if m and chance(4) and StepAway(t, (u8) aip(5), 1): Delay(25); return
4. if 0 < Skill1 < the Skills count and it has a record:           ; a ← aurastate, b ← auratargetstate
     if not (0 < a ≤ States count and U has a) and not (0 < b ≤ States count and t has b)
        and chance(3) and MonAiUseSkill(Sk1mode, Skill1, 0, 0, 0): return
5. if e < aip(1) and chance(2) and SetModeAtUnit(4, t): return
6. if e ≥ aip(1) and WalkStop(t, (u8)(e − aip(1))): return
7. Idle(10)

ancientbarb3 (class 542): 1 the edge limit; 2 the skill's chance; 3 A1/A2's chance:   [I]
1. the pick;  none: Idle(25); return
2. if Skill1 > 0 and e < aip(1) and Range(100) < aip(2) and MonHasSkill: UseSeq(Skill1, t, 0, 0); return
3. if not m: WalkZ(t);  Delay(10); return
4. if D100() < aip(3): SetModeAtUnit(Range(2) ≠ 0 ? 4 : 5, t); return
5. Idle(25)
```

- R133b. [C] The class jump, classes 540 (62 cases), 541 (61), 542 (39) and 78 others, each jump up to `HasState(U, 54)` or the pick's call, 7 boundaries: family `ancient`, 240 cases; no control separates it.

- R133i. [C] As data: kind 2, no `init`, no `alt`; 3 records (540-542 ancientbarb1..ancientbarb3); reach PU; `aip` set 1,2,3,4,5; `aidel` 15/13/11; skills Whirlwind, Shout, Leap Attack.
- R133l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R134. Row 134 `BaalThrone`

**`aip`:** 1 the skill's chance.

- R134a. [I] The block is read from the code; its bit test is the mask 1. Each wave is an announce (285, 250 frames), then the spawn (286, 100 frames), then a wait for the room to clear; after the fifth spawn one more announce runs, with no message, and at the next clear room the throne becomes `baalcrabstairs`. returns the u16 at `DataTables+0xAE0 + 2k` for `k < 66`, else −1; the five codes are 61–65, the SuperUniques `hcIdx` of `Baal Subject 1..5`.
- R134b. [C] The init's return; steps 1 to 4 up to the search and its block, 3 boundaries: families `thronei`, `throne`, 240 cases each; control `cmp` fails the 19 it separates, at `T < v1C`.

- R134i. [C] As data: kind 2, `init`, no `alt`; 1 records (543 baalthrone); reach ·; `aip` set 1; `aidel` 15/15/15; skills Decrepify, Baal Corpse Explode, Defense Curse, Blood Mana.
- R134l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R136. Row 136 `BaalTaunt`

**`aip`:** 1 the walk's distance limit; 2 the count of still events before the taunt; 3 the teleport's distance limit.

```
1. if t = 0: Idle(25); return                                             [I]
2. still ← t's type is 0 or 1 and t's mode = 1
   fire ← false
   if still: v14 ← v14 + 1;  fire ← v14 > aip(2)
   if fire or not still: v14 ← 0
3. if fire: MonAiUseSkill(4, 284, t, 0, 0); return
4. if dist > aip(3) and UnitTeleport(UnitGetRoom(t), X(t), Y(t), 0, 0): Idle(25); return
5. if dist > aip(1): WalkZ(t); return
6. Idle(25)
```

- R136a. [I] The taunt fires on the `aip(2) + 1`-th event in a row (11th, as data) on which the target stands in mode 1. [C] No draw on the logged paths: the exit seed equal in all 151 decisions. [I] The taunt never fired.
- R136b. [C] The whole map to its 4 boundaries: family `taunt`, 240 cases; controls `d0`, `cmp` fail the 72, 55 they separate. Equality met at `dist > aip(3)` 26, `dist > aip(1)` 18, `v14 > aip(2)` 17 times.
- R136p. [C] **Logged paths of the block** (the logged-path model): 151 decisions, 151 fork-free, 0 mismatches. Both arms met, each failing alone: `2.still`, `4.aip(3)<dist`, `5.aip(1)<dist`; one arm met, failing alone: `1.t`, `4.teleported` true; `2.aip(2)<v14` false; stores failing alone: `set v14+=1`, `set v14=0`. [I] The untaken arm of each one-arm branch; `<` against `≤` but at the equal pairs met (`4.aip(3)<dist`, `5.aip(1)<dist`); what the model does not compare.

- R136i. [C] As data: kind 1, no `init`, no `alt`; 1 records (545 baaltaunt); reach P; `aip` set 1,2,3; `aidel` 15/15/15; skills Baal Taunt.
- R136l. [C] First boundary: 151 decisions of the 84 logs, 151 fork-free, compared at the first call, 0 mismatches, 0 stops there.

#### R137. Row 137 `PutridDefiler`

**`aip`:** 1 the distance under which it keeps away; 2 the step away's length.

```
1. if t ≠ 0 and melee: SetModeAtUnit(4, t); return                        [I]
2. u ← AiUnitSearch(blk{0, 25} at EBP − 0x30, AiDefilerTargetCb, 1)
3. if u ≠ 0:
     if InMeleeRange(U, u, 0): MonAiUseSkill(8, 300, u, 0, 0)             ; Impregnate, S1
     else: WalkZ(u)
     return
4. if dist < aip(1): StepAway(t, (u8) aip(2), 0)
   else: Idle(25)

AiDefilerTargetCb (a, b; u), ret 8:
  returns u when ImpregnateTest(b, u) and AiDistUnits(b, u) ≤ 25, else 0
```

- R137a. [C] No draw on the logged paths: the exit seed equal in all 81 decisions. [I] Draws on untaken arms, read from the code.
- R137b. [C] Step 1 and the search up to its call, 2 boundaries: family `defiler`, 240 cases; no control separates it.
- R137p. [C] **Logged paths of the block** (the logged-path model): 81 decisions, 81 fork-free, 0 mismatches. Both arms met, each failing alone: `1.melee`, `3.inmelee`, `3.u`, `4.dist<aip(1)`; one arm met, failing alone: `1.t` true. [I] The untaken arm of each one-arm branch; `<` against `≤` but at the equal pairs met (`4.dist<aip(1)`); what the model does not compare.

- R137i. [C] As data: kind 1, no `init`, no `alt`; 5 records (546-550 putriddefiler1..putriddefiler5); reach P; `aip` set 1,2; `aidel` 15/15/15; skills Impregnate.
- R137l. [C] First boundary: 81 decisions of the 84 logs, 81 fork-free, compared at the first call, 0 mismatches, 0 stops there.

#### R139. Row 139 `BaalTentacle`

**`aip`:** 1 chance of A1; 2 the idle; 3 half the life's length, in units of 25 frames (10, as data).

```
1. o ← UnitGetOwner(U)                     ; U+0xC8 bit 0x400, GameFindUnit(U+0x94, U+0x98)     [I]
2. if o = 0 or UnitIsDead(o): UnitKilled(0, 1); return
3. if v1C = 0: v1C ← T + 25·(Range(aip(3)) + aip(3))   ; draw, none when aip(3) ≤ 0; imul, 32-bit
4. if T > v1C: UnitKilled(0, 1); return
5. if melee and Range(100) < aip(1): SetModeAtUnit(4, t); return           ; draw
6. Idle(aip(2))
```

- R139a. [I] At stock `v1C − T₀` is 250, 275, … 475. An `aip(3)` ≤ 0 takes no draw: the tentacle dies at once for a negative value, at its next event for 0. `T + 25·(…)` fits in an i32 for every `T` ≤ 2 145 845 322.
- R139b. [C] The whole map to its 3 boundaries: family `tentacle`, 240 cases, 129 with a draw, the living owner 154 times; controls `le`, `d0`, `cmp` fail the 7, 99, 17 they separate. Equality met at `T > v1C` 17, the draw 7 times.

- R139i. [C] As data: kind 1, no `init`, no `alt`; 5 records (562-566 baaltentacle1..baaltentacle5); reach ·; `aip` set 1,2,3; `aidel` 15/15/15; skills —.
- R139l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R141. Row 141 `BaalMinion`

**`aip`:** 1 in melee range: chance to act; 2 out of it: chance to walk; 3 the skill's chance, and the idle; 4 the delay after every command.

```
1. if t ≠ 0 and melee:                                                    [I]
     if chance(1):
       if Skill1 ≥ 0 and Range(100) < aip(3): MonAiUseSkill(Sk1mode, Skill1, t, 0, 0)
       else: SetModeAtUnit(4, t)
     else: Idle(aip(3))
   else if chance(2): WalkZ(t)
2. Delay(aip(4))                           ; always
```

- R141a. [C] The map to its 5 boundaries: family `bminion`, 240 cases, all drawing; controls `le`, `d0`, `u16` fail the 41, 135, 4 they separate. The `Range(100) < aip(3)` compare has no case at equality, so no control moves it; `Delay` is the first boundary only when `chance(2)` fails.

- R141i. [C] As data: kind 1, no `init`, no `alt`; 3 records (571-573 baalminion1..baalminion3); reach U; `aip` set 1,2,3,4; `aidel` 15/14/13; skills Smite.
- R141l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

### Batch 11: bosses-B (Diablo, Nihlathak, the Baal rows, Uber Diablo and Baal)

#### R51. Row 51 `Diablo`

No `aip` slot read: the skills are fixed by slot, and the machinery's target only gates the event (kind 1); the think reads neither `t`, `dist` nor `melee`.

| Table | Start (non-zero) | Edits, in order |
|---|---|---|
| melee (`m`) | w2 40, w3 70, w5 40, w6 24, w7 40, w8 15 | life(t) < 20: w2 = 50; `cold`(t): w7 = w8 = 0; f > l: w6 −10, f < l: w6 +10; `!lc`: w5 = w6 = 0; P: w15 = 10 |
| ranged (`lc`) | w5 25, w6 25, w8 15, w9 20, w10 10, w12 20 | `AiDistUnits(U, t)` > 25: w8 −5, w10 = 20, w5 = 0; f > l: w6 −10, w8 −10, f < l: +10 each; n < 2: w6 −10; n > 3: w6 +5; score > 60: w9 +10; n < 2 and the difficulty < 2: w9 = 0; L and not far: w6 +10, w10 = 30, w13 = 15; far: w1 = 0, w12 = 10, w10 = 0, w13 = 15, w9 = 10 if 0; vfar: w9 = 20, w14 = 60; P: w15 = 15 |
| blocked | w4 5, w6 25, w8 25, w9 40, w12 25 | n < 2: w8 −5, w6 = 0, w1 = 25, w9 = 0; L and not far: w13 = 15; far: w1 = 0, w12 = 15, w13 = 25, w9 = 20 if 0, then −5 if n < 2; vfar: w14 = 60; P: w15 = 20 |

```
pick(w, n), one step when the sum is above 0:                              [C] (240 emulated cases; the four inline copies)
  sum ← the sum of the n > 0 words
  r ← sum > 0 ? step's low word mod sum : 0, with no step ; a power of two takes the mask
  the first k whose running sum exceeds r (signed);  none: the fallback

AiPlayerThreatScore(c), with home, and Baal's AiBaalThreatScore:   [I]
  m ← InMeleeRange(U, c, 0)
  H ← home ≠ 0 and AiDistToPointSized(U, home) > 85 and AiDistToPointSized(c, home) < 85 ? 100 : 0      ; Baal: 75
  R ← (C43 + 4·(s36 + 2·s37) + s41 + s39) ÷ 15       ; C43 ← m ? s43 : 0; Baal: s43 always
  D ← ((s58 >> 8) + s55 + s53 + s51 + s49 + s22) ÷ 2
  K ← (lvl(left)·rank(left) + lvl(right)·rank(right)) ÷ 4     ; rank = attackrank, u8
  A ← m ? 100 : AiLineClear(U, c) ? 75 : 0
  if c is a monster and (class out of range or MonStats threat ≤ 1): return 0
  T ← 3·(life(c) < 20 ? 100 : 0) + R + 5·(H + A) + 2·(K + 2·(cold(c) ? 100 : 0) + D)
  return T ÷ 22, or 1 when that is 0
```

- R51b. [C] The maps to their first callee, and no more: `dalt` and `balt` to `HasState(U, 12)`; `diablo` to `AiParamsPush` or the pick; `ddec`: `v14 ≠ 0` returned, the collision test, `PlayerPortalGet(t)` or `UNIT_GetLeftSkill(t)`; `dcb`, `bcb` the callbacks whole, `wpick` the pick whole: twenty families in the batch, 240 cases each.

- R51i. [C] As data: kind 1, no `init`, `alt`; 2 records (243 diablo, 333 diabloclone); reach ·; `aip` set —; `aidel` 15/13/12; skills DiabLight, DiabCold, DiabFire, DiabWall, DiabRun, PrimeFirewall, DiabPrison, Diablogeddon.
- R51l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R128. Row 128 `Nihlathak`

**`aip`:** 1 in melee: chance of the teleport; 2 the teleport's range; 3 chance of the corpse explosion; 4 chance of the whip branch; 5 the distance under which it may step away.

```
init: ret 4                                                     [C]

think, six inline steps at most, each D100():                              [I]
1. A5Q4_NihlathakSeen                ; quest 34: a record with +0x09 ≠ 0, +0x0B < 3 (u8) gets +0x14 ← 0, QUESTS_SetState(rec; 0, A5Q4_StepBits, 1)
2. if state 12: State(12, 0)
3. s1 ← SKILLS_GetUnitSkill(U, Skill1)
4. if t = 0:
     if s1 ≠ 0 and St3or19: AiUseSkillNearSelf(aip(2); id(s1), s1's +0x08 word); return
     Idle(25); return
5. if s1 ≠ 0 and melee and D100() < aip(1): AiUseSkillNearSelf(aip(2); id(s1), s1's +0x08 word); return     ; Imp Teleport
6. if dist < aip(5) and D100() < 40 and StepAway(t, 5, 1): return
7. if Skill3 > 0 and U has it and D100() < aip(3):
     c ← CorpsePickNear(t; Skill3, its level)
     if c ≠ 0 and MonAiUseSkill(Sk3mode, Skill3, c, 0, 0): return                ; corpse explosion
8. if Skill4 > 0 and U has it and D100() < 60 and dist < 14: MonAiUseSkill(Sk4mode, Skill4, t, 0, 0); return
9. if Skill2 > 0 and D100() < aip(4) and MonHasSkill(Skill2):
     blk ← {0, 625, 50, 0, 0, 0};  AiUnitSearch(blk, AiOverseerMinionCb, 1)
     if blk[4] ≠ 0: MonAiUseSkill(Sk2mode, Skill2, blk[4], 0, 0); return          ; Overseer Whip
     if Skill5 > 0 and SpawnClassCellTest(528 or −1, U's room; X, Y, 0):
       v3C ← LevelClassVariant(U's room, 453 or −1);  MonAiUseSkill(Sk5mode, Skill5, t, 0, 0); return    ; MinionSpawner
     Ring(6); return
10. if Skill4 > 0 and U has it and dist < 14: MonAiUseSkill(Sk4mode, Skill4, t, 0, 0); return             ; no draw this time
11. if D100() < 60: WalkZ(t)
12. Idle(5)                                         ; after the walk too
```

- R128a. [I] Draw order: `aip(1)`, 40, `aip(3)`, 60, `aip(4)`, 60, each at most once per event, each compared `jge` signed; with stock slots at most five fall in one event. Each draw's reach is the steps' `and` order above, so a step whose earlier test fails takes none. The search block admits no weak minion (`blk[0] = 0`) and keeps a non-unique one within squared distance 625.
- R128b. [C] The init's return and the think through the quest step: to `QUESTS_SetState` with the node's `+0x14` = 0, or past it to `HasState(U, 12)` with the byte unchanged: families `nihli`, `nihl`, 240 cases each; control `cmp` fails the 25 it separates, at `+0x0B < 3`.

- R128i. [C] As data: kind 2, `init`, `alt`; 1 records (526 nihlathakboss); reach U; `aip` set 1,2,3,4,5; `aidel` 15/15/15; skills Imp Teleport, Overseer Whip, NihlathakCorpseExplosion, Horror Arctic Blast, MinionSpawner.
- R128l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R135. Row 135 `BaalCrab`

No `aip` slot read: the skills are fixed by id or slot. Row 135 is kind 0 (no search), and acts with no target too.

```
think:                                                                     [I]
1. t ← AiBaalPickTarget(&score, &n, 0, AiBaalPickCb)                       ; R133's walk, its own score; no home bonus
2. h ← the kind-10 record, pushed from U's own point when missing
3. k ← AiBaalDecide(ctl, t, score, n, h)
4. AiBaalAct(ctl, t, k, h)
5. Delay(25)

AiBaalDecide:                                                              [I]
1. if v14 ≠ 0: return v14                                ; no writer
2. if t = 0:
     if COLL_PatternTestBool(U's room, X, Y, 2, 0x40): return 4
     return D100() < 8 ? 9 : 1
3. p ← the unit of PlayerPortalGet(t), when t is a player
   P ← p ≠ 0 and p's level = 132 and (h = 0 or UnitDistance(p, h.x, h.y) < 75)
   far ← h ≠ 0 and AiDistToPointSized(t, h) > 75;  vfar ← the same > 100
   m ← InMeleeRange(U, t, 0);  lc ← AiLineClear(U, t)
4. return pick(w, 16), or 1      ; R51's pick; w from melee if m, else ranged if lc, else blocked
```

| Table (`B` = (Normal ? `b₀` : `b₁`) + 100 − life(U)) | Start (non-zero) | Edits, in order |
|---|---|---|
| melee | w1 `B` (75/50), w8 20, w9 30, w10 150, w11 10, w12 10, w13 70 (Normal 45), w14 40 | life(t) < 33: w10 = 200; `cold`(t): w8 = w13 = w11 = 0; `!lc`: w11 = w13 = w12 = 0 |
| ranged | w1 `B` (125/100), w2 5, w3 5, w4 5, w6 5, w8 40, w9 40, w11 70, w12 80, w13 60 (Normal 40), w14 20, w15 max(0, 10·(2 − v18)) | `AiDistUnits(U, t)` > 35: w6 = 15, w13 = 0; > 25: w14 = 30, w11 = 0; n < 2: w11 −10; n > 3: w13 +25; score > 60: w8 = 70; n < 2 and the difficulty < 2: w8 = 0; S(t) and not far: w6 +30, w11 +10, w14 +15; far: w6 +25, w14 +35, w2 = 0, w3 = 25; vfar: w5 = 60; P: w7 = 0 |
| blocked | w1 `B` (125/100), w2 20 (45 if n < 2), w3 20, w4 20, w6 20, w8 80, w9 70, w10 0 (25 if n < 2) | S(t) and not far: w13 = w14 = 50; far: w2 = w6 = 0, w3 = 35, w11 = 25, w13 = 25; vfar: w5 = 60 |

- R135b. [C] Row 135's map to the pick; `AiBaalDecide`'s to its first callee, and each table at its first call with its start words, the blocked table's `n < 2` edits and the ranged table's clone weight included; `AiBaalAct`'s for every `k` (1–15, 0, 16, 100, `0xFFFFFFFF`), each action's first callee, and no more, so the curse choice, the teleport point and the clone stay `[I]`: families `bcrab`, `bdec`, `bmelee`, `bblock`, `branged`, `bact`, 240 cases each.

- R135i. [C] As data: kind 0, no `init`, `alt`; 1 records (544 baalcrab); reach ·; `aip` set —; `aidel` 15/13/12; skills Baal Nova, Baal Inferno, Baal Tentacle, Baal Cold Missiles, Baal Teleport, Defense Curse, Blood Mana.
- R135l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R138. Row 138 `BaalToStairs`

**`aip`:** 1 the edge distance under which it leaves (4, as data).

- R138a. [I] Object 563 is `baals portal`. No draw, and the think ignores the context's target.
- R138b. [C] The think's map to its search (block `{0, 25}`) and the callback's to its distance call or its 0 return: families `stairs`, `pcb`, 240 cases each; no control separates them.

- R138i. [C] As data: kind 1, no `init`, no `alt`; 1 records (559 baalcrabstairs); reach ·; `aip` set 1; `aidel` 15/15/15; skills —.
- R138l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R140. Row 140 `BaalCrabClone`

No `aip` slot read.

```
1. o ← MonsterOwner(U);  if o ≠ 0 and UnitIsDead(o): UnitKilled(0, 1); return    [I]
2. w ← UnitGetOwner(U);  if w = 0 or UnitIsDead(w): UnitKilled(0, 1); return
3. t ← the pick, as row 135's
4. h ← home, pushed from X, Y
5. k ← AiBaalDecide(…);  if k is 7, 9, 14 or 15: k ← 2
6. if t = 0: Idle(15); return
7. AiBaalAct(ctl, t, k, h);  Delay(25)
```

- R140a. [I] `AiBaalDecide` and `AiBaalAct` are row 135's. `MonsterOwner` reads `AiCtl+0x28/+0x2C/+0x30`; `UnitGetOwner` the unit's `+0xC8` bit `0x400` and `+0x94/+0x98`.
- R140b. [C] The map to `UnitKilled(0, 1)` or the pick, with both owner lookups and `UnitIsDead` run on the image: family `bclone`, 240 cases; no control separates it.

- R140i. [C] As data: kind 0, no `init`, `alt`; 1 records (570 baalclone); reach ·; `aip` set —; `aidel` 15/14/12; skills Baal Nova, Baal Inferno, Baal Tentacle, Baal Cold Missiles, Baal Clone Teleport, Defense Curse, Blood Mana.
- R140l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R145. Row 145 `UberBaal`

`ret 4`, as row 146: a kind-1 event with a target commands nothing from the think. Its `alt` is Baal's, row 51's block. [C] The think is `c2 04 00` and its `alt` is rows 135 and 140's.

- R145a. [I] What drives the event, and its limits, is [monsters/special](../../spec-monsters/special/): with a target the boss sight pause fires once, then this event queues no next one.

- R145i. [C] As data: kind 1, no `init`, `alt`; 1 records (709 uberbaal); reach ·; `aip` set —; `aidel` 15/13/12; skills Baal Nova, Baal Inferno, Baal Tentacle, Baal Cold Missiles, Baal Teleport, Defense Curse, Blood Mana, Chilling Armor.
- R145l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R147. Row 147 `UberDiablo`

`ret 4`, as row 146: a kind-1 event with a target commands nothing from the think. Its `alt` is Diablo's, row 51's block. [C] The think is `c2 04 00` and its `alt` is row 51's.

- R147a. [I] What drives the event, and its limits, is [monsters/special](../../spec-monsters/special/): with a target the boss sight pause fires once, then this event queues no next one.

- R147i. [C] As data: kind 1, no `init`, `alt`; 1 records (705 uberdiablo); reach ·; `aip` set —; `aidel` 15/13/12; skills DiabLight, DiabCold, DiabFire, DiabWall, DiabRun, PrimeFirewall, DiabPrison, Diablogeddon.
- R147l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

### Batch 12: towns, NPCs and the state rows

#### R31. Row 31 `NpcOutOfTown`

No `aip` slot read. `R3` is `AiCtlParamGet(3)`; each quest call below is a pair of functions: class 527 calls the second, the other classes the first.

```
AiNpcOutOfTownInit, called first on every event:              [I]
  if R3's two words are 0:
    (R3.x, R3.y) ← (X + 3, Y + 3)
    if the first test = 0: call its partner;  UnitSetStat(U, 6, 0, 0);  SetMode(12, X, Y)
    R3+0x14 ← 1;  R3+0x18 ← 0;  Idle(1);  returns 1
  returns 0

think:                                                                     [I]
1. if the init returned 1: return
2. class 527: its own call
3. if NpcInteractAny(L): Idle(40); return          ; L when U is a monster with its data
4. if U's mode is 12: return
5. AiNpcNearPlayer                                 ; its result is not read
6. if no R3: the init again;  Idle(40); return
7. if R3+0x14 ≥ 2:
     R3+0x14 ← R3+0x14 + 1
     p ← the point call;  if none: Idle(20); return
     if R3+0x14 < 8 and AiPathDistToPoint(U, p) > 0: WalkPt(p); return
     the partner, UnitSetStat(U, 6, 0, 0), SetMode(12, X, Y); return
8. if AiPathDistToPoint(U, R3) > 1 (signed) and R3+0x18 ≤ 5:
     R3+0x18 ← R3+0x18 + 1
     if class 527 and its test ≠ 0: Idle(20);  R3+0x18 ← 0; return
     WalkPt(R3); return
9. if R3+0x14 = 1:
     if the second test = 0: R3+0x14 ← 1;  R3+0x18 ← 1;  Idle(20); return
     R3+0x14 ← 2
10. Idle(20)
```

- R31a. [I] No draw. `UnitSetStat(U, 6, 0, 0)` is `hitpoints`. The block is read from the code.
- R31b. [C] The think to its first boundary, 6 reached, and the init, 4: families `oot`, `h77a0`, 240 cases each; no control separates them.

- R31i. [C] As data: kind 0, no `init`, no `alt`; 2 records (146 cain1, 527 drehyaiced); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R31l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R32. Row 32 `Npc`

No `aip` slot read: the town chain's words are the parameter records. `home` is `AiCtlParamGet(10)`, `R4`, `R5`, `R7` the kind-4, 5, 7 records, `L` the unit's interact list.

- R32a. [I] The blocks of `AiNpcNearPlayer`, `AiNpcScriptStep`, `AiNpcPathPick` are read from the code. `WalkPtCmd` is `MonAiWalkToPointCmd`. The `home` chain's quest words: reads quest 11's bytes `+0x0F` and `+0x10`, quest 18's first byte, quest 17's `+0x06`, its point at `+0x10`. Stock path actions are 1–5.
- R32b. [C] Each function's map to its first command or boundary, and no further: `npc` 7 boundaries; `h6800`, `h6860`, `h6ae0` 13 (`cmp` 75, `arg` 69), `h7080` 5 (`le` 45, `arg` 226), `act1`–`act5`, `hp`, `hcb` (`cmp` 23), 240 cases each. `AiNearestPlayerCb` tests **the searcher's** class record: a reading from the candidate's separates all 32 cases that reach.
- R32c. [I] Row 32 has a fork in all 199 decisions of the rev 4 logs, so it does not count for the catalogue sample.

- R32i. [C] As data: kind 0, no `init`, no `alt`; 35 records (35 records, as the index lists them); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R32l. [I] Logged, not compared: 1167 decisions (416 + 279 + 472) in a row with no model, so the first boundary of this row is not raised.
- R32r. [I] Past the first boundary, a consistency check only: 751 of its own think's decisions in the rev 4 and rev 6 logs, 591 resumed, 0 mismatches, 160 stopped, 1987 later calls matched, an unknown value deciding 766 of 2147 later steps. The row is not under sentence H1.

#### R41. Row 41 `Towner`

`AiNpcSaveHome`, `AiNpcScriptStep`, `AiNpcPathPick`, each ending the event on true, then `Idle(12)`: row 32's chain with no `AiNpcNearPlayer`. No `aip` read. [I]

- R41a. [C] The chain to its first command: family `towner`, 240 cases, 17 boundaries, 72 with a draw; controls `le`, `cmp` fail the 15, 83 they separate.

- R41i. [C] As data: kind 0, no `init`, no `alt`; 6 records (195-197 act2male..act2child, 203 act2guard1, 294 act3male, 296 act3female); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R41l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R42. Row 42 `Vendor`

```
if D100() < 20: SetMode(8, 0, 0)                                           [I]
else: Idle(30)
```

No `aip` read. [C] The whole map: family `vendor`, 240 cases, all drawing; control `le` fails the 62 it separates.

- R42i. [C] As data: kind 0, no `init`, no `alt`; 2 records (204-205 act2vendor1..act2vendor2); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R42l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R54. Row 54 `NpcStationary`

No `aip` slot read.

```
1. p ← AiNearestPlayer(&f)                                                 [I]
2. if p ≠ 0 and p ≠ U:
     n ← AiDistUnits(U, p)
     if p is a player and PlayerIsBusy(p) = 1: Idle(10); return
     if NpcInteractAny(L): Idle(10); return                ; L when U is a monster with its data
     if n < 24:
       if v18 = 0: v18 ← 60;  a player p: UnitSetEvent(U, 18, p)
       else: v18 ← v18 − 1
     else:
       if v18 ≤ 0: v18 ← 60
       v18 ← v18 − 1
     Idle(20); return
3. class 251: if its quest test ≠ 0 and AiNpcMode0IfFree = 1: SetMode(0, 0, 0);  its quest call; return
   class 406: if its quest test ≠ 0 and AiNpcMode0IfFree = 1: SetMode(0, 0, 0);  its quest call; return
4. Idle(20)
```

- R54a. [C] No draw on the logged path: the exit seed equal in all 316 fork-free decisions. [I] The block is read from the code. `AiNpcMode0IfFree` does its own `SetMode(0, 0, 0)`. Its first call cannot fail: 0 of 3 sites, so the row does not count for the catalogue sample.
- R54b. [C] The map to its first call, `nstat`, 4 boundaries, and `AiNpcMode0IfFree`'s, `h7350`, 240 cases each; no control separates them.

- R54i. [C] As data: kind 0, no `init`, no `alt`; 4 records (251 tyrael1, 367 tyrael2, 406 izualghost, 521 tyrael3); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R54l. [C] First boundary: 618 decisions of the 84 logs, 316 fork-free, compared at the first call, 0 mismatches, 0 stops there.
- R54r. [I] Past the first boundary, a consistency check only: 302 of its own think's decisions in the rev 4 and rev 6 logs, 302 resumed, 0 mismatches, 0 stopped, 0 later calls matched, an unknown value deciding 0 of 0 later steps. The row is not under sentence H1.

#### R58. Row 58 `Navi`

No `aip` slot read.

```
1. if NpcInteractAny(L): Idle(10); return                                  [I]
2. p ← AiNearestPlayer(&f)
3. if p ≠ 0, p is a player, not busy, Range(3) ≠ 0 and f ≠ 0:              ; draw only past the first three
     if v18 = 0: v18 ← 60;  UnitSetEvent(U, 18, p)
     else if v18 < 0: v18 ← 0
     else if v18 > 0: v18 ← v18 − 1
     Idle(20); return
4. u ← FindHostile(&dist, &melee)
5. if u ≠ 0 and dist < 25: SetModeAtUnit(4, u); return
6. Idle(50)
```

- R58a. [I] The block is read from the code.
- R58b. [C] The map to its first boundary, 3 reached: family `navi`, 240 cases; no control separates it.

- R58i. [C] As data: kind 0, no `init`, no `alt`; 1 records (266 navi); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R58l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R60. Row 60 `GoodNpcRanged`

Alias of state row 5: the same think word. No `aip`; `rogue2` is its one record. [C] in both tables; one record, 270 `rogue2` (`.txt` = `.bin`); no `*aip` description in `monai.txt`

- R60i. [C] As data: kind 0, no `init`, no `alt`; 1 records (270 rogue2); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R60l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R62. Row 62 `TownRogue`

No `aip` slot read.

```
u ← FindHostile(&dist, &melee)             ; seeded with the context's words     [I]
if u ≠ 0 and dist < 25 (signed): SetModeAtUnit(4, u)
else: Idle(50)
```

No draw. State 8 has the same 91 bytes but the low bytes of three call displacements. [C] The entry's first call only: family `trogue`, 240 cases.

- R62i. [C] As data: kind 1, no `init`, no `alt`; 1 records (272 rogue3); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R62l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R81. Row 81 `JarJar`

No `aip` slot read.

- R81a. [I] The block is read from the code. At step 7 past `Idle(20)`, step 8 draws too, and both idles are queued.
- R81b. [C] The map to its first boundary, 2 reached: family `jarjar`, 240 cases; no control separates it.

- R81i. [C] As data: kind 0, no `init`, no `alt`; 1 records (331 act2guard2); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R81l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R88. Row 88 `7TIllusion`

No `aip` slot read.

```
if v18 = 1: U+0xC4 ← U+0xC4 | 0x20000;  SetMode(0, 0, 0)                   [I]
else: SetMode(4, X − 10, Y);  v18 ← 1
```

No draw. [C] Both boundaries: family `illus`, 240 cases; no control separates it.

- R88i. [C] As data: kind 1, no `init`, no `alt`; 1 records (355 seventombs); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R88l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R91. Row 91 `DarkWanderer`

No `aip` slot read.

```
1. if A3Q7_WalkTarget(&p) = 0: Idle(10); return                            [I]
2. if v14 = 0: v14 ← 1;  v18 ← 0;  v1C ← 0
3. if t = 0: Idle(10); return
4. if dist ≥ 20: Idle(40); return
5. v14 = 1: WalkPt(p);  v14 ← 2; return
6. v14 = 2:
     if AiPathDistToPoint(U, p) < 2 (unsigned) or v18 ≥ 3:
       U+0xC4 ← U+0xC4 | 0x20000;  SetMode(0, 0, 0);  A3Q7_TimerStart; return
     v18 ← v18 + 1;  Ovr(1, 0, 0);  WalkPt(p); return
7. other v14: Idle(40)
```

- R91a. [I] No draw. The block is read from the code.
- R91b. [C] The first call only: family `dark`, 240 cases.

- R91i. [C] As data: kind 1, no `init`, no `alt`; 1 records (368 darkwanderer); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R91l. [I] Not logged: no decision of this row in any of the three kept batches. Everything above is the code reading of its finding.

#### R99. Row 99 `TrappedSoul`

No `aip` slot read.

```
1. U+0xC4 ← U+0xC4 | 0x20000                       ; every event             [I]
2. if t = 0 or dist ≥ 5:
     if v14 ≠ 0: SetModeAtUnit(8, t)               ; t may be null
     else: Idle(15)
     return
3. if v14 = 0: v14 ← 1;  v18 ← T;  SetModeAtUnit(9, t); return
4. if not melee or T ≤ v18: SetModeAtUnit(8, t); return
5. by position, unsigned (UnitGetPos):
     Ux ≥ Tx and Uy ≤ Ty: SetModeAtUnit(4, t);  v18 ← T + 35
     else Ux > Tx or Uy < Ty: SetModeAtUnit(8, t);  v18 ← T + 5
     else: SetModeAtUnit(5, t);  v18 ← T + 35
```

- R99a. [C] No draw on the two logged paths (the exit seed, 225 decisions). [I] The other paths, read from the code.
- R99b. [C] The map to its first boundary, 7 reached: family `soul`, 240 cases; control `cmp` fails the 26 it separates, `dist < 5` met at equality 20 times. No call past the first in its logs, so the row does not count for the catalogue sample.
- R99p. [C] **Logged paths of the block** (the S1b model): 225 decisions, all fork-free, 0 mismatches. Step 1's store (19 decisions tell it), step 2's idle with `v14` 0 (219), step 3 (6). [I] `v14 ≠ 0`, steps 4 and 5.

- R99i. [C] As data: kind 1, no `init`, no `alt`; 2 records (403-404 trappedsoul1..trappedsoul2); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R99r. [I] Past the first boundary, a consistency check only: 225 of its own think's decisions in the rev 4 and rev 6 logs, 225 resumed, 0 mismatches, 0 stopped, 0 later calls matched, an unknown value deciding 0 of 0 later steps. The row is not under sentence H1.

#### R100. Row 100 `Buffy`

```
if U has a room: Idle(200)                                                 [I]
```

Stub: no draw, no `aip`; with no room, a return. [C] Both boundaries: family `buffy`, 240 cases. 4 resumed decisions do not count for the catalogue sample.

- R100i. [C] As data: kind 0, no `init`, no `alt`; 1 records (408 malachai); reach ·; `aip` set —; `aidel` 15/15/15; skills —.
- R100l. [C] First boundary: 16 decisions (12 + 4) compared at `UnitGetRoom(U)`, 0 mismatches, one outcome, hand map (the S1b model's first call); the site control fails 16.
- R100r. [I] Past the first boundary, a consistency check only: 4 of its own think's decisions in the rev 4 and rev 6 logs, 4 resumed, 0 mismatches, 0 stopped, 4 later calls matched, an unknown value deciding 0 of 4 later steps. The row is not under sentence H1.

#### S2. State row 2

No setter passes 2: S17's note. Both draws are the low byte of a step, not mod 100.

```
1. if St3or19 or dist < 4: MonAiInit(ctl, 0);  Idle(10); return            [I]
2. if dist > 10 and v14 = 0: v14 ← 1;  WanderNearUnit(t, 12); return
3. if step's low byte < 0x4D: Ring(4); return                              ; unsigned
4. if a second step's low byte < 0x1A: v14 ← 0
5. Idle(10)
```

- S2a. [C] The map to its 4 boundaries: family `st2`, 240 cases, 73 drawing; controls `le`, `cmp`, `lo8` fail the 13, 16, 47 they separate.

- S2i. [C] As data: kind 1, no `init`, no `alt`.

#### S3. State row 3

No setter passes 3: S17's note. Kind 8 is the head record's `+0x08`.

- S3a. [I] The block is read from the code.
- S3b. [C] The init's map, 98 drawing, and the think's to its first boundary: families `st3i`, `st3`, `h5710`, 240 cases each; no control separates them.

- S3i. [C] As data: kind 1, `init`, no `alt`.

#### S8. State row 8

Row 62's code, 91 bytes equal but the low bytes of three call displacements: `FindHostile`, a unit under 25: `SetModeAtUnit(4, u)`, else `Idle(50)`. No setter passes 8: S17's note. [I] [C] The first call only: family `st8`, 240 cases.

- S8i. [C] As data: kind 1, no `init`, no `alt`.

#### S9. State row 9

No setter passes 9: S17's note.

No draw. [C] The map to its first boundary, 2 reached: family `st9`, 240 cases.

- S9i. [C] As data: kind 1, no `init`, no `alt`.

#### S10. State row 10

The think of states 10 and 17, which differ by search kind only (1 and 2). Setters: `CloakAreaCb`, and `CurseSetAiState` for `auratargetstate` 23.

```
1. if melee and not (U's class in range with interact set) and MonModeAllowed(class, 4):   [I]
     SetModeAtUnit(4, t); return
2. if D100() < 20: Ring(3)
   else: Idle(10)
```

- S10a. [C] The map to its 3 boundaries: family `st10`, 240 cases, 152 drawing; control `le` fails the 41 it separates.
- S10p. [C] **Logged paths of the block** (the S1b model): 632 decisions, 621 fork-free, 0 mismatches. Step 2 (9 equal pairs). [I] Step 1: its 11 melee decisions fork on the class and mode tests.
- S10r. [I] Own decisions at the think, in the rows of classes that entered it, a consistency check only: 632 in the rev 4 and rev 6 logs, 632 resumed, 0 mismatches, 0 stopped, 632 calls matched, none past the first. The logs do not split 10 from 17; state control saw state 10 live and 17 not. Not under sentence H1.

- S10i. [C] As data: kind 1, no `init`, no `alt`.

#### S11. State row 11

Setters: `MonFleeFrom`, and `CurseSetAiState` for `auratargetstate` 56. No draw in the function.

```
init:                                                         [I]
  g ← UNIT_GetTargetUnit(U)
  g of type 0, 1 or 3: MonForcedTargetSet(U, kind 1, 2 or 4, g's id)

think:                                                                     [I]
1. if U lacks state 56:
     MonAiInit(ctl, 0);  CancelEvents(2, 0);  UnitQueueEvent(U, 2, T + 1, 0, 0)
2. if dist > (v14 ≠ 0 ? v14 : 30): Idle(10); return
3. p: i32 ← 0
   if Velocity > 0 (i16): q ← Run·100 ÷ Velocity (i32, truncating);  if q ≥ 100: p ← min(q − 100, 120)
4. if v1C = 0:
     v1C ← 1;  MonForcedTargetClear;  CancelEvents(2, 0);  Ovr(2, p, 0)
     MonModeAllowed(class, 15) ? MonAiStepAwayXY(t, 30, 0) : MonAiStepAway(t, 30, 0); return
5. if melee and not MONSTATS_FlagTest(class, 9) and mode 4 allowed: SetModeAtUnit(4, t); return
6. Ovr(2, p, 0)
   the same step away with flag 1;  on 0: Ring(6)
```

- S11a. [I] `Velocity` is loaded u16 but tested as i16, and `Run·100` cannot wrap. Stock `Velocity` 0..15 and `Run` 0..20 tell no widths apart.
- S11b. [C] The init's map and the think's first call only: families `st11i`, `st11`, 240 cases each.
- S11p. [C] **Logged paths of the block** (the S1b model, the think): 134 decisions, 66 fork-free, 0 mismatches. Step 1's state-56 arm and step 2's idle at the limit 30. [I] The limit from `v14`, step 1's other arm, steps 3 to 6 (68 decisions fork on `MonModeAllowed`).
- S11r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary), the 66 fork-free decisions of 134 (rows 12 and 64): 0 mismatches, 66 calls past the first, the one two-way site of the subset failing alone. [I] The other 68, which branch on the words `+0x32`/`+0x34` read: a consistency check only, 394 calls matched in all.

- S11i. [C] As data: kind 1, `init`, no `alt`.

#### S12. State row 12

Setter: `CurseSetAiState` for `auratargetstate` 27.

```
1. t' ← UNIT_GetTargetUnit(U)                                              [I]
2. if t' = 0 or its room is a town:
     MonAiInit(ctl, 0);  CancelEvents(2, 0);  UnitQueueEvent(U, 2, T + 1, 0, 0); return
3. if v14 = 0: v14 ← 1;  MonAiWalkToUnitType13(t', 7); return
4. if InMeleeRange(U, t', 0): SetModeAtUnit(4, t'); return
5. u ← MonAiTargetOrIdle(ctl, &d, &m)
   if u ≠ 0 and m: v14 ← 0;  SetModeAtUnit(4, u); return
6. v14 ← 1;  UnitSetPathTargetUnit(U, t');  MonAiWalkToUnitType13(t', 7)
```

- S12a. [C] No draw on the logged paths (56 decisions). [I] The other paths, read from the code.
- S12b. [C] The first call only: family `st12`, 240 cases.
- S12p. [C] **Logged paths of the block** (the S1b model): 56 decisions, all fork-free, 0 mismatches, 230 calls past the first. Steps 1 to 6 on their taken arms. [I] The town arm, `m` set, `u` = 0.
- S12r. [C] Under [sentence H1](../overview/#h-past-the-first-boundary): 56 decisions (rev 4: row 37 52, row 64 4), all fork-free, 230 calls past the first, 3 of 3 two-way sites failing alone.

- S12i. [C] As data: kind 0, no `init`, no `alt`.

#### S13. State row 13

The Countess's state: set by `SuperUniqueSpawn` for SuperUniques `+0x08` 6. `aip`: 1 the run's chance out of melee; 2 the idle; 3 with 10 added, the chance of A1.

```
AiPathSkillStep, `Skill1` at the next DS1 path point:         [I]
  if the list exists and v14 < count:
    if the class is out of range, no record, or Skill1 is outside 0 .. Skills count − 1: return 0
    MonAiUseSkill(4, Skill1, 0, x[v14], y[v14])      ; the mode pushed 4, not Sk1mode
    v14 ← v14 + 1;  v18 ← T;  return 1
  if |T − v18| > 700: v14 ← 0
  return 0

think:                                                                     [I]
RunHome: AiPathOverrideSet(pathctl, 1, 0, 0);  if MonAiRunToPoint(home): end the event;  else CancelEvents(2, 0); a refused run does not return: the next step runs   [I]
1. if M = 0 or no room: return
2. home: absent, pushed from X, Y;  a zero word: refilled from X or Y
3. if LogicRegionIdAt(home) ≠ LogicRegionIdAt(U): RunHome
4. if LogicRegionIdAt(t) ≠ LogicRegionIdAt(home):
     if U stands exactly at home:
       if dist < 25 and AiPathSkillStep: return
       Idle(10); return
     RunHome
5. if AiPathDistToPoint(U, home) > 40 (unsigned): RunHome
6. if AiPathSkillStep: return
7. r ← Range(100)
8. if melee:
     if r < aip(3) + 10: SetModeAtUnit(4, t)
     else: Idle(aip(2))
   else:
     if r < aip(1): Ovr(0, 100, 0);  MonAiRunToUnit(t)
     else: Idle(aip(2))
```

- S13a. [I] The block is read from the code, and on the arms S13f names it stays that reading.
- S13b. [C] The map to its first boundary, 3 reached, and `AiPathSkillStep`'s, 2: families `st13`, `h5b70`, 240 cases each; `h5b70`'s controls `cmp`, `u16` fail the 45, 7 they separate.
- S13c. [C] State 13 is held by one class 45 unit per process, in two processes of one seed, the only one of its class with a home record; 7 others of the class in those processes hold state 0, and no unit in the five logs holds two states. So no 0 → 13 is logged; how she came to hold it lies before each attach.
- S13p. [C] **Logged paths of the block** (the S1c model, beyond S13d): every branch and store of the think fails alone reversed but step 2's two (the record found, its words non-zero), whose flips stop at the unmodelled push and refill in 160 of 160; `AiPathSkillStep` from step 6 in 159 decisions, fire 21 (`MonAiUseSkill(4, Skill1, 0, …)`, `v14 + 1`, `v18 ← T`, each store seen at the next decision), reset 5, fall-through 133, every branch and store failing alone, `v14 < count` against the given count only (README H1b); RunHome accepted in its one logged decision: `AiPathOverrideSet` with `EDX` 1, (0, 0), `MonAiRunToPoint(home)` non-zero, the event ending (the run-ok test fails it reversed). [I] As S13f lists, and the refused run, its `CancelEvents(2, 0)` and fall-through, RunHome from steps 3 and 5, the path control word.
- S13r. [C] Under sentence H1 with [H1b's three given words](../overview/#h-past-the-first-boundary): 160 decisions, 988 calls past the first, 7 of 7 two-way sites failing alone; Normal, owner-played. The stock census has 1 of 160.
- S13d. [C] The block on the arms the logs reach: 160 decisions, 0 mismatches, every boundary call, the seed at each and at the exit, `v14`, `v18`, also across 158 consecutive pairs. Fire 21, reset 5, melee A1 97, melee idle 8, far run 28, far idle 5, step 4's RunHome 1. Normal, the player as target.
- S13e. [C] `CountessFirewall` fires at the four points of `cryptcountess1.ds1`'s one path, in file order, one per decision, at the offset (12500, 11000), which equals Levels id 25's `OffsetX`, `OffsetY` times 5. The path's anchor in that file is MonPreset's act 1 row 40, The Countess. It is `File1` of her preset's two, one seed; `File2`'s path matches none of the four. It starts again at a decision whose gap since the last fire is over the limit: restarts are logged at gaps 704 to 730 and none at gaps up to 699.
- S13f. [I] Read, not reached: steps 1, 2's push and refill, 3, 4 at home, 5 (home distances reach 29, so 30 to 40 is not separated), every refused RunHome, `AiPathSkillStep`'s early returns and its `neg` for a `T` below `v18`, the mode as the pushed 4 (class 45's `Sk1mode` is also 4), the limit's exact 700 and `>`, and Nightmare and Hell. The setter too: first logged decisions already have `v14` 3 and 4.

- S13i. [C] As data: kind 1, no `init`, no `alt`.

#### S14. State row 14

No setter passes 14: S17's note.

```
if melee:                                                                  [I]
  if D100() < 95: step();  SetModeAtUnit(5, t); return                     ; the second step's value unused
else:
  if D100() < 89: MonAiWalkToUnit(t, 0); return
Idle(10)
```

[C] The map to its 3 boundaries: family `st14`, 240 cases, all drawing; control `le` fails the 29 it separates.

- S14i. [C] As data: kind 1, no `init`, no `alt`.

#### S17. State row 17

The same think as state 10, on search kind 2. [I]

- S17r. [I] Own decisions: the 632 of S10r, not split by state, none of which state control tied to state 17.

- S17i. [C] As data: kind 2, no `init`, no `alt`.

## Outputs

Per decision: the commands, mode changes and path requests the entry's block names, on the unit, and the seed advanced by its draws.

## Worked example

None written out here. Outside the tier's, the recorded seed-to-decision cases are those of R44m, S13d and R10r, in the kept logs. [Machinery § Worked example](../machinery/#worked-example) and [README § Worked example](../overview/#worked-example) hold the tier's.

## Reimplementation notes

- [C] **A refused move can queue nothing.** After a refused command (`MSM1` 0), flags 0 (`Walk(t, 0)` 44, `Ring` 59, `StepAway` with flag 0 16) and flags 4 (`StepAway` with its flag set, 255) return 0 with no seed step and no further command; flags 7 (`Walk(t, 7)`, 143) return 1 after 1 step, then 4 more and the ring's own command exactly when that step's low word mod 100 < 70 (96 of 143). [I] `Walk(t, 1)`, and "no idle"; flag 1 sets `AiCtl` flag `0x40`, which forces the next search's line test on; which of bits 1 and 2 brings the draw, with no case of one alone.
- [C] **A slot may be read twice.** Row 7's second `aip(3)` draw is a new draw on the same slot (met in 2 decisions, the seed compared). [I] Each `chance` is one step.
- [C] **One life reader.** `AiLifePct` is `push ecx; call UnitLifePct; ret`: one map with two calling conventions, the same value on 240 of 240 emulated images. Rows 4, 8, 15 and 122 call it through `AiLifePct` (is row 122's); `UnitLifePct` has 38 direct calls, row 11's among them.

## Evidence

- MonAI, MonStats.

To check the count: every row has one heading `#### R<n>. Row <n> ` and every state row one heading `#### S<n>. State row <n> `; counting this page's headings that start with each form gives 148 and 18.
