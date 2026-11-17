---
title: "The function catalogue: every numbered skill and missile function"
sidebar:
  order: 4
---

## Purpose

A Skills row names its start function (`srvstfunc`), its do function (`srvdofunc`, or `srvprgfunc1..3` for a progressive row, `ItemEffect` for an item cast, States `srvactivefunc` for a periodic state), and a Missiles row its server do, hit and damage functions. The machinery that calls them, and the 40 tier-A entries, are [skills/dispatch](../dispatch/) and [skills/missiles](../missiles/). This spec gives every other entry a stock row uses: what it tests, what it writes, which missiles, units, states and packets it makes, and **every draw it makes, in order, with its seed**. It is the catalogue: 310 entries, 304 read by its batches and the six `general` tier-A entries, which § A links and does not restate.

```mermaid
flowchart LR
  req["skill request<br/>dispatch § B–§ D"] --> st["start table<br/>srvstfunc: § G–§ Q"]
  st --> do["do table<br/>srvdofunc, srvprgfunc, ItemEffect,<br/>srvactivefunc: § G–§ Q"]
  do --> mc["MissileCreate<br/>missiles § B"]
  do --> sp["SpawnOwnedMonster, SpawnAtPos<br/>dispatch § L"]
  do --> pk["the skill packet<br/>dispatch § I"]
  do --> stt["timed states<br/>stats/states"]
  mc --> mdo["missile do<br/>§ C"]
  mdo --> mh["missile hit<br/>§ E, § F"]
  mh --> md["missile damage<br/>§ D"]
  it["item and shrine callers<br/>§ N"] --> do
```

## Entry points

| When | Function | Tag |
|---|---|---|
| A skill mode starts | `g_SkillStartFuncs[srvstfunc]` from `SKILLS_SrvStart` | [C] (`g_SkillStartFuncs`, static scan of every batch) |
| A skill's action frame | `g_SkillDoFuncs[n]` from `SKILLS_SrvDo` | [C] (`g_SkillDoFuncs`, static scan of every batch) |
| A missile's frame | `g_MissileSrvDoFuncs[pSrvDoFunc]` | [C] the frame's do entry is the class's `pSrvDoFunc` in all 33 041 windowed frames, do 1, 3, 5 and 23; [I] the other do entries, whose rows no windowed missile had |
| A missile hits a unit, or ends | `g_MissileSrvHitFuncs[pSrvHitFunc]` | [C] (`g_MissileSrvHitFuncs`, the 9d table scan) |
| A missile's damage packet is built | `g_MissileSrvDmgFuncs[pSrvDmgFunc]` | [C] damage function 3 runs between the build and `MISSILE_ApplyDamage`, the missile's seed stepping once there in 13 486 of 13 486 hits, and rows without a damage function step none (4 118); [I] the other damage functions |
| An item stat, a charge or a shrine casts | the callers of § N | [C] up to their boundaries |

## Inputs

### Tables

| Anchor | Used for |
|---|---|
| `Skills.txt:srvstfunc`, `Skills.txt:srvdofunc` | the entry numbers; the rows per number are Skills § Function index |
| `Skills.txt:srvmissilea`, `Skills.txt:summon`, `Skills.txt:pettype` | the missile, the summoned class and the pet type each entry passes on |
| `Skills.txt:aurastate`, `Skills.txt:auratargetstate`, `Skills.txt:auralencalc`, `Skills.txt:aurarangecalc` | the states, lengths and radii |
| `Skills.txt:calc1`, `Skills.txt:Param1` | the calcs (`calc1..4`) and `Param1..8` an entry reads |
| `Missiles.txt:pSrvDoFunc`, `Missiles.txt:pSrvHitFunc`, `Missiles.txt:pSrvDmgFunc` | the missile entry numbers; rows per number in Missiles § Function index |
| `Missiles.txt:Param1`, `Missiles.txt:SubMissile1`, `Missiles.txt:HitSubMissile1` | a missile entry's parameters and sub-missiles |
| `MonStats.txt:BaseId`, `MonStats.txt:spawn` | the bases monster entries test; the class a spawner entry makes |

### Runtime state

| State | Type | Source |
|---|---|---|
| the caster's seed | Seed (unit `+0x20`) | [rng/seeds](../../spec-rng/seeds/); most entries never touch it (§ B) |
| a missile's seed | Seed (missile `+0x20`) | [missiles § B](../missiles/#b-creation), re-seeded by the sites of § B |
| the used skill node | unit skill record; `+0x18`–`+0x24` words an entry keeps between start and do | [dispatch § D](../dispatch/#d-the-mode-start) |
| the action-done bit | `Unit+0xC4` bit 6 | [dispatch § Runtime state](../dispatch/#runtime-state) |
| `MissileData +0x28`, `+0x2C` | two s32 words a missile entry keeps | [missiles § B](../missiles/#b-creation) |

### Constants

| Name | Value | Tag |
| --- | --- | --- |
| start table | `g_SkillStartFuncs`; stock Skills names 64 distinct `srvstfunc` numbers | [C] (the batches' slot reads, `static.txt`) |
| do table | `g_SkillDoFuncs`; 138 distinct `srvdofunc` numbers, plus the progressive, `ItemEffect` and `srvactivefunc` entries | [C] (the batches' slot reads, `static.txt`) |
| missile hit table | 71 slots; 24 filled in 31–59, 30, 34, 41, 42, 46, 49 and 60–70 null | [C] |
| `g_Circle64X`, `g_Circle64Y` | 64 s32 each: point `i` is `(trunc(30 · cos), trunc(30 · sin))` of `i/64` turns, truncated toward zero, so the radius runs from 28.84 to 30; read once each, at index `i mod 64` | [C] 64 of 64 points (static) |

## Algorithm

### A. How an entry is written

Names: `st N` is start entry N, `do N` skill do entry N (a progressive `srvprgfunc`, an `ItemEffect` and a States
`srvactivefunc` are entries of the same table), `mdo N`, `mhit N` and `mdmg N` the missile do, hit and damage entries.
`Step(s)`, `Range(s, n)`, `RangeB(s, n)` and `Init(s, v)` are [rng](../../spec-rng/overview/)'s; `Init`'s high word is
`0x29A` (666). `caster` is the unit an entry runs for, `m` the missile, `lvl` the skill level, `calcN` the row's
`calcN` evaluated at `lvl`. Divisions are signed and truncate toward zero unless stated;
life and mana are in 1/256 points.

- A1. **Shapes.** Every skill start and do entry read by the class, item and monster batches is
  `(ECX game, EDX unit; skill id, level)` with `ret 8`.
  [C] (`g_SkillStartFuncs`, `g_SkillDoFuncs`, the static text dumps)

  A missile hit entry is `(ECX game, EDX m; unit)` with `ret 4` and returns the result word of
  [missiles § E](../missiles/#e-the-hit) (bit 0 end, bit 1 damage, bit 2 keep and return at once); a damage entry is
  `(ECX game, EDX m; unit, packet)` with `ret 8` and changes only the packet, the missile's seed and (mdmg 8) the
  unit's overlay. The 53 distinct hit entries all end in `ret 4` and the 14 damage entries in `ret 8`. [C]. [I] the write sets ("changes only
  the packet, …") and the result bits
- A2. **How far a `[C]` reaches.** Each entry was run under the emulator on its own code with synthetic and
  stock inputs and negative controls. An entry that returns is `[C]` as a whole map from the bytes it reads. An entry
  that ends at a callee is `[C]` **up to that call** (an observed boundary): its tests, the call's arguments,
  the bytes it wrote before the call and the seeds, nothing after it. The pseudocode marks the boundary with `→` and
  writes what follows under `after:` with its own tag. [C]
- A3. **"No draw" means before the boundary.** Each batch compared the caster's and the target's seed (and the
  missile's, for the missile batches) in every case; an entry with no draw line in § B steps no seed before its
  boundary or return. The cases' calcs are constant programs that call no calc function, so a calc's own draws are
  not covered. [C]
- A4. **Callees are not restated.** `MissileCreate`, `SkillMissileCreate`, `NovaAtUnit`,
  `SpawnOwnedMonster` and `SkillSummonClass`, `STATE_ApplyTimed` and the aura
  pass, `COMBAT_MeleeHitTest`, `COMBAT_DeliverQueued`, `SkillRollPhys`,
  `SKILLS_RollElemDamage` and
  `COMBAT_PrgFinisher` are those specs'. Their
  draws are theirs. [I]
- A5. **The six `general` tier-A entries** (st 1, 2, 65; do 1, 3, 5) and the other tier-A entries are
  [dispatch § O](../dispatch/#o-tier-a-the-start-and-do-functions) and [missiles § G](../missiles/#g-the-function-tables);
  this spec names them in their batch and links there. [I] (`SKILL_AttackDo`, review, ruling 2)

### B. Every draw, by seed

The index a reimplementer needs first: each entry that steps a seed, in its own order. Everything else in §§ C–Q
draws nothing before its boundary (A3).

```mermaid
flowchart TD
  subgraph caster["the caster's seed"]
    c1["do 21, 96, 123, 124, 131: one Range or RangeB"]
    c2["do 112, do 140, prg 37, 39, 41, 143: inline Step"]
    c3["ItemTarget 2 helper: two Steps"]
  end
  subgraph missile["the missile's seed"]
    m1["re-seed then draw:<br/>mdo 8, 10, 17, 25, 28, 34, 35; mhit 58"]
    m2["draw only: mdo 18; mhit 1, 7, 9, 13, 31, 43;<br/>mdmg 3, 5, 12, 13, 14"]
    m3["creation callbacks re-seed the new missile"]
  end
  subgraph other["other seeds"]
    o1["mdo 30: the target unit's"]
    o2["st 55, prg 37, 39, 41, 143: a local stack seed"]
    o3["handlers 20, 21, 30: the handler's unit"]
    o4["shrines 21, 22: the shrine object's"]
  end
```

| Entry | Seed | Draws, in order | Tag |
|---|---|---|---|
| mdo 8, 10, 17, 25 | the missile | `Init(m, SubX + elapsed)`; then `RangeB(m, 2(r − 1))` for x and for y, none when `r ≤ 1` | [C] up to `COLL_CellTestAt` |
| mdo 18 | the missile | per gold drop: `RangeB(m, 2·Param3 + 1)` twice, no re-seed | [C] up to the free spot |
| mdo 28 | the missile | `Init(m, MissileData+0x28)`; `Range(m, 2r + 1)` twice; `+0x28 ← m.low` | [C] up to `MissileCreate` |
| mdo 34 | the missile | each frame from `Param1` on: `Init(m, SubX)`, one `Step(m)` to pick the sub-missile | [C] up to its boundary |
| mdo 35 | the missile | `Init(m, MissileData+0x28)`; one `Step(m)` for the turn's sign | [C] up to its boundary |
| mdo 30 | **the target unit** (named by `+0x28/+0x2C`) | `Range(t, 2·Param2 + 1)` twice | [C] on the path-less cases |
| mhit 1, 9, 13, 31 | the missile | one `RangeB(m, …)` per element roll of `EType` whose two stats are ≥ 1 | [C] |
| mhit 43 | the missile | `RangeB(m, PhysMax − PhysMin)` | [C] |
| mhit 58 | the missile | `Init(m, x)`; `Range(m, 2r + 1)` for x, then for y | [C] up to its creation |
| mdmg 3 | the missile | one `Step(m)` | [C] |
| mdmg 5, 12, 13 | the missile | one `RangeB(m, …)` per element roll whose two stats are ≥ 1 | [C] |
| mdmg 14 | the missile | `Range(m, 100)` when the chance is above 0 | [C] |
| do 21 | the caster | `Range(caster, 100)` after the hostility and town tests | [C] |
| do 96 | the caster | `RangeB(caster, hi − lo)`, none when `hi = lo` | [C] |
| do 112 | the caster | one `Step(caster)` **before any test** | [C] |
| do 123 | the caster | `Range(caster, 0x100)` after the cell test | [C] |
| do 124 | the caster | `Range(caster, 0x10000)` after the used-skill tests | [C] |
| do 131 | the caster | `Range(caster, 100)`, only for a live monster target of base 453 | [C] |
| do 140 | the caster | one `Step` (the try count); Baal's arm: two or three `Range` (§ Q); two `Step` per try | [C] for the count and the tries; [I] the arm |
| prg 37, 143 | the caster, then a local seed | `Step(caster)` at entry, **before the record test**; `Init(local, caster.low)`; one `Step(local)` before the first creation | [C] |
| prg 39 | the caster, then a local seed | `Step(caster)` at entry; `Init(local, caster.low)`; `Range(local, 2r)` twice per try | [C] |
| prg 41 | the caster, then a local seed | `Step(caster)` at entry; `Init(local, caster.low)`; two `Step(local)` before the first creation | [C] |
| st 55 | a local seed from the target's and the caster's guids | `RangeB(local, calc2 − calc1)` | [C] |
| handler 20 | the handler's unit | one `Step(unit)` (a unit, chance > 0, and no packet or packet `+0x00` bit 5) | [C] |
| handler 21 | the handler's unit | `RangeB(unit, 100)` (a unit, chance > 0, packet `+0x04` bit 2) | [C] |
| handler 30 | the handler's unit | one `Step(unit)` for a unit with chance > 0, whatever the packet | [C] |
| `ItemTarget` 2 helper | the cast's caster | none without a room; else two `Step(caster)` before each collision test | [C] |
| shrines 21, 22 | the shrine object | `RangeB(shrine, Arg1 − Arg0)`, none for a range ≤ 0 | [C] |

- B1. **Creation callbacks re-seed the new missile.** The callback in the parameter block's `+0x54` runs inside
  `MissileCreate`: `MissCbReseedPathXPlusArg` (do 17, do 118, do 130) and
  `MissCbReseedPathX` (mhit 38; mhit 45 when `sHitPar2 ≠ 0`) are measured there, `[C]`; `MissCbReseedRoll` (do 102),
  `MissCbReseedFromArg` (prg 37) and `MissCbReseedZigzag` (prg 143) are emulated: each re-seeds the unit in `ECX` at its `+0x20` by
  `RNG_SeedInit` before any boundary, `MissCbReseedZigzag` to its return, the other two to `PathPlan`. [C] That `MissileCreate`
  runs them for prg 37, prg 143 and do 102, past `SUnitCreate`'s allocation, is the reading. [I]
- B2. **Draws after a boundary, from the reading.** These lie past the point the emulator stopped and are the
  reading's order: st 10's elemental `RangeB(caster, max − min)` after its hit test; do 55's and do 58's one
  `RangeB` on **the target's** seed; do 66's one `SKILLS_RollElemDamage` per aura run (the caster's seed); do 81's
  20 % roll per unit by a `Step` of **the unit's** seed; do 82's `Range(caster, 100)` per unit accepts;
  st 35's weapon roll by a `Step(caster)`; do 79's `Range(caster, 100)` against calc1;
  st 32's and st 39's elemental rolls (the caster's); do 69's `Range(caster, 100) < calc1` then the potion pick's
  `Step(caster)`; do 72's two `Range(caster, 100)`; entry 145's `SkillRollPhys` and
  `SKILLS_RollElemDamage`; entry 146's re-seed of the caster;
  do 33's knock roll by a `Step(caster)`, `low mod 100` against a calc by the target's kind; do 42's
  `Range(caster, 100)` at the last charge; do 107's three `RangeB(caster, max − min)`. [I]

### C. Missile do entries (mdo 1–36)

Batches 9a and 9b. An entry returns 1 to keep the
missile and 2 to free it.

```mermaid
flowchart LR
  f["frame: mdo N"] --> t{"record, owner,<br/>sub-missile?"}
  t -->|missing| r2["return 2"]
  t -->|present| w["the entry's own work:<br/>creations, re-seeds, path changes"]
  w --> d1["mdo 1: path step,<br/>range count, collision"]
  d1 --> ret["return mdo 1's result"]
```

- C0. **The shared tail.** Entry 1 of the table is a 5-byte `jmp MissileMoveCollide`, so mdo 1 is
  `MissileMoveCollide`. Every entry of 9a ends in mdo 1 and
  returns its result (mdo 18 after its cookie check); in 9b, mdo 20 and 30 return 1 after mdo 1, mdo 32 ends in
  mdo 7 and mdo 34 in mdo 3; a missing record, owner or sub-missile returns 2. In 9b, entries 19, 21–29, 31, 33, 35
  and 36 also end in mdo 1; do-table entry 37 (inside the Baal effect function's range) is non-null and
  no Missiles row names it. [C] entry 1 is the 5-byte `jmp MissileMoveCollide` and the tails as stated (static).
  [I] Which tests return 2 mdo 1, 3, 5
  and 23 are tier A: [missiles § G](../missiles/#g-the-function-tables). [I]

```
C1. mdo 2 (poisonjav):                                     [C] → MissileCreate
      on a frame with path +0x34 bit 3 (flag 8): MissSubAtSelf:
        SubMissile1 at the parent's position, velocity 0, source the parent,
        loops 2·lvl − 2, creation flag 8 only when SrvCalc1 > 0
      else: mdo 1
C2. mdo 6, 9, 12:                 [C] → MissileCreate, or mdo 1
      on each flag-8 frame: SubMissile1 at the missile's own sub-tile, with its skill and level
      mdo 6, 12: need an owner and SubMissile1 ≥ 0, else return 2 (mdo 6 also with no path; mdo 12 reads a null
        path as flag 0); mdo 9 tests neither
      after: mdo 1                                                       [C] mdo 6's call, its result returned (static, § 15)
C3. mdo 7 (Guided Arrow, Bone Spirit):                     [C] the gates → mdo 1
      no record, no owner, an owner UnitIsDead calls dead, or a missile in a town room: return 2
      with MissileData+0x28 bit 0 clear, or a missile target: mdo 1
      with bit 0 set and a live hostile target: re-plan the path to it   [I]
      bit 0 is written by do 10 (1 at a unit, 2 at none), one of its writers   [C] (static, § 16)
C4. mdo 8, 10, 17 (scatter around the missile):                        [C] → COLL_CellTestAt
      mdo 8:  r ← Param1 + max(lvl ÷ P3, 2); period ← max(Param2 − lvl ÷ P3, 3); P3 = max(Param3, 1)
      mdo 10: r ← calc1; period ← calc2 (Blizzard's)
      mdo 17: r ← Param3; period ← Param2; only while Param1 < left < Range − Param1
      once per period: MissSubNearReseed (§ B): Init(m, SubX + elapsed), dx ← RangeB(m, 2(r − 1)), dy ← RangeB(m, 2(r − 1)),
        each offset in [−(r − 1), r − 1); COLL_CellTestAt(room, x, y, 5)
      after: refused on a non-zero result, else SubMissile1 at the point; mdo 1   [I]
      mdo 17, when left ≤ Param5 + Param1 and +0x28 = 0: PermPortalAtUnit to level Param4 (38, Tristram)
                                                                         [C] → the portal call
C5. mdo 11 (fingermagespider):                             [C] → PathPlan, or mdo 1
      every Param1 frames, when the edge distance to its or its owner's target is ≤ Param2:
        step the path target max(Param3, 1) sub-tiles towards the target on each axis; PathPlan
C6. mdo 13 (Bone Wall):                                    [I]
      on each flag-8 frame while +0x2C (pieces left) ≠ 0: spawn the skill's summon class and pettype at the
        missile, owned by the first wall piece (+0x28, its guid), in that piece's group, mod 15, the summon
        stats, the caster as owner; +0x2C ← +0x2C − 1
C7. mdo 14 (grim wards):                                   [C] → CallDoFunc
      every Param1 frames, with a skill and a level above 0: CallDoFunc(Param2, skill, lvl)
      on the period, with a skill or level ≤ 0: return 2 without mdo 1 (off the period: mdo 1)   ; missiles § G2
C8. mdo 15 (Frozen Orb):                                   [C] → MissileCreate
      every Param1 frames (1 on stock data): k ← |w mod 64|, w = MissileData+0x28 (C remainder)
        SubMissile1 (frozenorbbolt) aimed at the orb + (g_Circle64X[k], g_Circle64Y[k])
        +0x28 ← (Param2 + k) mod 64                                      ; stock Param2 19
C9. mdo 16 (the orb nova):                                 [C] → PathPlan, or mdo 1
      on frames with elapsed < Param1 and elapsed mod max(Param2, 1) = 0:
        (a, b) ← (+0x28, +0x2C); path target ← (SubX + (a − b) ÷ 2, SubY + (a + b) ÷ 2)
          (32-bit sums, truncating division, u16 stores); PathPlan
      after: the +0x28/+0x2C stores                                      [I]
C10. mdo 18 (towerchestspawner):                           [C] → UnitSetEvent, the chest drop, the free spot
      at left = Range − Param1 (raw Range): the drop function on the chest whose guid is +0x28;
        +0x2C ← 1 when the chest is gone; after a found chest's drop the store follows the boundary   ; that store [I]
      then every 4·Param2 frames (8): two RangeB(m, 2·Param3 + 1) offsets in [−Param3, Param3] (±5);
        the free spot GroundDropCell
      after: the gold pile at that spot                                  [I]
      at left = 1: unit event 0x5C on the chest
C11. mdo 19 (radament death):                              [C] → the units-in-range call
      while 2 ≤ left ≤ 24: UnitsInRangeCall(ECX game, EDX 0x3002; SubX, SubY, m, 124, 1, RedemptionChanceCb);
        at left = 1 the same with RedemptionAlwaysCb; then mdo 1
      after: the callbacks are Redemption's corpse callback, RedemptionChanceCb with the chance roll and RedemptionAlwaysCb
        without it; the roll and the heal                                [I]
C12. mdo 20 (blade creeper):                               [C] → the re-target
      owner alive, with a path: re-target the path to the owner's position;
        without a path: left ← 10, then mdo 1
      else: end itself with an end-of-life hit
      after: on the path case left ← 10 and mdo 1; the return value, 1 after mdo 1 or 2 after the hit   [I]
C13. mdo 21 (distraction):                                 [C] → MissileCreateAt
      on a flag-8 frame: MissileCreateAt(SubMissile1); then mdo 20
C14. mdo 22 (lightning trailing javelins):                 [C] → the first MissileCreate
      while elapsed < 2: (+0x28, +0x2C) ← (−dy, dx), dx, dy from the missile to its path target
      on each flag-8 frame: SubMissile1 (flags 0xB, loops Param1) at the offset (+0x28, +0x2C)
      after: the second creation, at the negated offset                  [I]
C15. mdo 25:                                              [C] → COLL_CellTestAt
      mdo 10's scatter (r ← calc1, period ← calc2) through MissSubNearReseed, with cell mask 0x45 (mdo 10: 5)
C16. mdo 26 (vines):                                       [C] → MissileCreateAt
      every Param1 frames: MissileCreateAt(SubMissile1)
C17. mdo 27 (tornado):                                     [C] → MISSILE_BuildDamage
      every Param1 (or calc4) frames: build its damage packet
C18. mdo 28:                                              [C] → MissileCreate
      no owner: mdo 1
      when Param3 < elapsed < Param4 and elapsed mod (Param1 > 0 ? Param1 : max(calc4, 1)) = 0:
        r ← Param2 > 0 ? Param2 : max(aurarangecalc, 1)
        Init(m, +0x28); dx ← Range(m, 2r + 1) − r; dy ← Range(m, 2r + 1) − r; +0x28 ← m.low
        MissileCreate(flags 0x520, target (SubX + dx, SubY + dy), +0x24 Param5)
C19. mdo 29, 33 (the recycler delays):         [C] → UnitSetStat
      at elapsed = Param1, when value < max (both in whole points, >> 8): the owner's life (29) or mana (33)
        ← min(value + MulDiv(max, calc1, 100), max), stored << 8
C20. mdo 30 (rabies plague):                               [C] → the re-target, or MissileCreate
      re-target and end itself as mdo 20, without resetting left (it ends on left < 0);
      on the path-less cases: two Range(target, 2·Param2 + 1) on the infected unit's seed,
        then SubMissile1 spread from that unit
C21. mdo 31 (wake of destruction, baal cold maker):        [C] → the first MissileCreate
      two SubMissile1 at ±(+0x28, +0x2C); after: the second              [I]
C22. mdo 32 (tiger fury):                                  [C] → MissileCreate, or mdo 7
      one SubMissile1 per flag-8 frame, then mdo 7
C23. mdo 34:                                              [C] → its boundary
      each frame from Param1 on: Init(m, SubX); Step(m) picks the sub-missile; ends in mdo 3
C24. mdo 35:                                              [C] → its boundary
      Init(m, +0x28); Step(m) gives the turn's sign
C25. mdo 36 (baalfx control):                              [C] → QUESTS_IsActive
      when +0x28 = 0 and left ≤ 100: +0x28 ← 1; QUESTS_IsActive(quest 36)
      after: the tyrael3 spawn (class 521) and the room pin              [I]
```

- C26. **The sub-missile tests differ.** mdo 21, 22, 23, 25 and 26 test `SubMissile1 ≠ 0`, so a blank (−1) passes;
  the other creating entries test `≥ 0`. [C]
- C27. mdo 24 is mdo 23's function and no stock row names it; the unused numbers of 1–36 are in
  Missiles § Function index. [C] entries 23 and 24 are
  both; no row of the `.txt` or the `.bin` names do 24; the unused do numbers are 4, 24 and 37–52 (static)

### D. Missile damage entries (mdmg 1–14)

Batch 9b. They run inside
`MISSILE_BuildDamage`. mdmg 3 is tier A and
emulated here too; 6 is unused. Every entry below is reproduced on returning cases, mdmg 8's overlay call up to
its boundary.

```
D1. mdmg 1:  v ← min(DmgCalc1, 100) when > 0; v % of the physical damage moves to the
                          missile's EType field                                         [C]
D2. mdmg 12: mdmg 1's share, then a fresh roll of the EType element replaces the packet's
                          damage (the fields PacketClearDamage zeroes); one RangeB(m) per roll   [C]
D3. mdmg 2:  freeze length ← MulDiv(stat 56, max(dParam1, 0), 100); cold length ← 0   [C]
D4. mdmg 3 is tier A: missiles § G (one Step(m); low & 0x7F < dParam1 sets result 0x4000)
D5. mdmg 4:  freeze ← cold length; cold ← 0                                  [C]
D6. mdmg 10: freeze ← cold length                                            [C]
D7. mdmg 5:  the EType roll; plus dParam1 % of it against undead, dParam2 % against demons   [C]
D8. mdmg 13: against a monster only: the owner's stat 25 percent added to the physical
                          damage; then mdmg 5                                             [C]
D9. mdmg 7, 9: stun length ← dParam1, else Param1 + (lvl − 1)·Param2 (7)
                          or Param2 (9); hit class 0x60                                   [C]
D10. mdmg 11: poison length ← MissileData+0x28 − frame when in [10, ELen(owner)],
                          else poison 0                                                   [C]
D11. mdmg 14: when the chance c (from dParam1, dParam2 and the target's MonStats2 small/large)
                          is above 0: Range(m, 100) < c sets knockback (result |= 0x8, a 16-bit OR at +0x04)   [C]
D12. mdmg 8 (MissDmg08Overlay): with a record, the unit and ProgOverlay > 0 (s16): → UnitSetOverlayStat(unit, ProgOverlay, 0);
                          else return without a call                       [C]
      after: the overlay as stat 178 on the unit's flag-0x80 list         [I]
```

### E. Missile hit entries 1–29

Batch 9c: 25 entries (5, 6, 11, 23
are named by no row). mhit 2, 3, 14 and 17 are tier A; 3, 14 and
17 are emulated here too. No entry steps the owner's or the target's seed before its boundary (8 400 cases; a
control moving the missile's draws to the owner's seed fails on every case that drew). [C]

```
E1. mhit 1 (fireballs):                                    [C] → AreaHitAt
      with an owner: radius ← sHitPar1 > 0 ? sHitPar1 : max(calc1, 1)
      the EType roll on the hit unit (§ B); packet +0x00 |= HitFlags; +0x04 |= ResultFlags
      AreaHitAt(owner; x, y, radius, packet, 0); return 1               ; the return [I]
E2. mhit 13 (glacial spike, hell meteor):                  [C] → AreaHitAt
      radius ← sHitPar1 > 0 ? sHitPar1 : max(aurarangecalc, 1); len ← sHitPar2 > 0 ? sHitPar2 : auralencalc;
      when len > 0 it is the length field of the EType (cold 4 +0x30, poison 5 +0x2C,
        9 +0x44, 11 +0x18, freeze 12 +0x34); the EType roll as mhit 1
E3. mhit 24 (pantherpotorange), mhit 44 (fire potions, bomb):   [C] → MISSILE_BuildDamage
      mhit 24: MISSILE_BuildDamage(owner; m, unit, packet); mhit 44: MISSILE_BuildDamage(owner; m, 0, packet)
      mhit 44: any non-zero sHitPar1, negative included, is the radius; no owner test
      after: the OR's, AreaHitAt, return 1 (24) or 1 or 3 (44); the radius value at the boundary sits in a
        callee-saved register                                           [I]
E4. mhit 9 (immolation arrow):                             [C] → UnitSetStat
      with a record and a Skills row (else 1; no owner test):
      when HitSubMissile1 ≥ 0: UnitSetStat(m, 56, 0, 0) (the boundary)
      else: radius ← sHitPar2 > 0 ? sHitPar2 : max(calc2, 1); the EType roll as mhit 1, the OR's,
        → AreaHitAt(owner; x, y, radius, packet, 0)
      after (≥ 0 path): stat 134 ← 0, the disc MissSubDisc, the area hit, return 3   [I]
E5. mhit 7 (holy bolt):                                    [C]
      the unit is the owner's pet (TargetPet set; a monster whose owner reference is the owner player's guid):
        heal ← (calc1 << 8) + RangeB(m, (calc2 << 8) − (calc1 << 8))
        when heal ≤ 0: heal ← MissileElemRoll(m, 22, 21, −1) (stats 22/21; one more draw when both are ≥ 1)
        UnitSetStat(unit, 6, min(stat 6 + heal, max life))             ; the boundary
      else: SkillAllyTest (the boundary)
      sHitPar1 = 0, no owner, or a refused ally: return 3 against undead (demons when sHitPar2 = 2,
        any monster or player when sHitPar2 = 0), else 4               ; the refused-ally return [I]
E6. mhit 8 (blaze):                                        [C]
      return 0 for its owner in state 13 (blaze), else 2
E7. mhit 4 (exploding and freezing arrows, royal strike meteor):   [C] → the first MissileCreate
      each of HitSubMissile1..4 (the words at +0x24, stride 2) that is > 0, with {owner, source m, skill, lvl}
E8. mhit 15 (spider goo lay): HitSubMissile1 at the missile   [C] → MissileCreate
E9. mhit 25 (pantherpotgreen):                             [C] → the first MissileCreate
      8 directions (0,2) (2,2) (2,0) (2,−2) (0,−2) (−2,−2) (−2,0) (−2,2), in steps of sHitPar1, from the unit
        (or the missile); flags 0x1F; velocity Param1 << 7 of the sub-missile's row; loops lvl − 1
E10. mhit 26 (grim ward start):                            [C] → MissileCreate
      HitSubMissile1, flags 0x8001, range sHitPar1 > 0 ? sHitPar1 : max(calc1, 5)
E11. mhit 29 (frozen orb):                                 [C] → the first MissileCreate
      frames left ≠ 0: return 2, before the owner test
      at frames left 0: a ring over the 64 circle directions (radius 30) in steps of sHitPar1 (stock 4: 16 bolts)
      after: each bolt's +0x28/+0x2C ← its direction                    [I]
E12. mhit 12 (chain lightning):                            [C] → the search
      with MissileData+0x28 > 1: NearestUnitInRange(owner; x, y, radius, 0x88583, unit guid, 0), the nearest unit
      after: the next bolt and its count − 1                            [I]
E13. mhit 16, 19 (spider goo, vines; finger mage spider):   [C] → STATLIST_Alloc or SKILLS_ApplyAuraStats
      auratargetstate on the unit for max(calc4, 5) (16) or max(auralencalc, 5) (19) frames:
        a new timed list ending at frame + length, owned by the owner, or the unit's existing list of that state
E14. mhit 28 (grim ward scare):                            [C] → the flee call
      a monster closer than Param1 + (lvl − 1)·Param2 to the ward found by MissileData+0x28:
        MonFleeFrom(ward; unit, skill, Param5, Param6)
      (mhit 17, howl, is the tier-A flee: missiles § G)
E15. mhit 21 (battle cry):                                 [C] → the unit filter
      SkillUnitFilter(owner, unit; aurafilter ? 0xA783 : 0); a state index equal to the States count is accepted
E16. mhit 18 (shout, battle orders, battle command):       [C] → UnitsSameParty
E17. mhit 20 (lightning fury):                             [C] → SKILLS_ForUnitsInRange
      ForUnitsInRange(owner; x, y, radius, aurafilter or 0xA783, FuryChainCb, ctx, 1, …),
        ctx = {owner, m, skill, lvl, sHitPar2 > 0 ? sHitPar2 : max(calc1, 1), HitSubMissile1}
E18. mhit 22 (fist of the heavens delay):                             [C] → MISSILE_BuildDamage
      the unit MissileData+0x28/+0x2C names; none → return 0; else build its damage
E19. mhit 10 (guided arrow, bone spirit):                  [C]
      in town → 1; at the end of life → 1 when +0x28 bit 2 or the cell's collision bit 2 is set
      with a unit (+0x28 bit 0): 3 if it is the path's target, else 4
      with bit 1: 3 or 4 by bit 2 while frames are left; at 0 the re-target GuidedRetarget (the boundary)
E20. mhit 27: return 1                                     [C]
```

### F. Missile hit entries 31–59 and row 568

Batch 9d: 24 table entries are filled
in 31–59 (31–33, 35–40, 43–45, 47, 48, 50–59; mhit 44 is § E's); mhit 2 and 36 are tier A
 and emulated here too. No entry steps the owner's or the target's seed
before its boundary (8 400 cases; the owner-seed control fails 140 and 181 cases). [C]

```
F1. mhit 31 (firehead):                                    [C] → UnitSetStat
      the EType roll on the hit unit (§ B); the owner's life ← min(life + max(roll, 0), max life)
F2. mhit 43 (healing vortex):                              [C] → UnitSetStat or UnitSetOverlayStat
      any hit unit (no owner, ally or type test): heal ← PhysMin + RangeB(m, PhysMax − PhysMin)
      when the unit's life ≠ max life and ProgOverlay > 0 (s16): UnitSetOverlayStat(unit, ProgOverlay, 0) (the boundary)
      else: UnitSetStat(unit, 6, min(life + heal, max life))
      after the overlay: the life write; the return, 1 with CollideKill else 0   [I]
F3. mhit 55 (baal inferno):                                [C] → UnitSetStat
      a hit player loses max(MulDiv(mana, clamp(sHitPar1, 1, 100), 100), 1) mana (at most all of it); any other unit → 2
F4. mhit 37 (blade creeper): a unit → 2; the end of life → 0              [C]
F5. mhit 50 (plague vines trail): a unit → 2 while elapsed < range − sHitPar1, else 0;
      no record → 1                                                                  [C]
F6. mhit 2, 59 (plague javelin, gas potions; baal taunt poison):   [C] → the first MissileCreate
      MissSubRing16: first direction (0, 2), velocity Param1 << 7 of the sub-missile's row
      mhit 2 (tier A, missiles § G; the catalogue adds its 9d map): no record or HitSubMissile1 < 0 → 3; from the
        hit unit's position (the missile's at the end of life), flags 0x1F with sHitPar3 loops when sHitPar3 > 0,
        else 0x17
      mhit 59: with a record, HitSubMissile1 ≥ 0 and an owner (else 1): loops argument 0, so flags 0x17 at the
        missile's position
F7. mhit 36 (bomb in air) is tier A: missiles § G (HitSubMissile1 at the end of life only; a unit → 0)
F8. mhit 48: HitSubMissile1 from the missile, flags 0x21, target the path's position words (+0x10, +0x12)   [C] → MissileCreate
F9. mhit 51: HitSubMissile1                                             [C] → MissileCreate
      after: HitSubMissile2, then 3                                     [I]
F10. mhit 58 (row 654):                                    [C] → MissileCreate
      r ← max(sHitPar1, 1); Init(m, x); px ← x − r + Range(m, 2r + 1); py ← y − r + Range(m, 2r + 1)
F11. mhit 52 (blade fury):                                 [C] → MissileCreate
      tests HitSubMissile1 ≥ 0 but never writes the block's class word +0x10, which reaches MissileCreate as 0
      after: the loop over 8 directions of length 16 in steps of max(sHitPar1, 1); MissileCreate taking the
        word as the class, so the missiles are row 0 (arrow)            [I]
F12. mhit 38, 45 (catapult charged ball; lightning javelins):   [C] → MissileCreate or the fatal path
      n ← mhit 38: (lvl − 1)·sHitPar2 + sHitPar1, else max(calc4, 1); mhit 45: sHitPar1
      MissNovaCreate(n): for n ≥ 41 ((n − 1) ÷ 5 > 7) the fatal path (0xF0D pushed before the call);
        else the first creation: flags 3, target offsets (14, −14), creation callback MissCbReseedPathX
        (mhit 38 always; mhit 45 when sHitPar2 ≠ 0)
F13. mhit 40 (catapult spike ball):                        [C] → the scatter
      MissScatterAtTarget(n, n ÷ 4) with mhit 38's n
F14. mhit 47 (molten boulder):                             [C] → MISSILE_BuildDamage
      players and monsters that are not MonStats2 large → 2 (rolls on); a large monster, or the end of life: build damage
F15. mhit 56 (armageddon and diablogeddon control): build damage with no unit   [C] → MISSILE_BuildDamage
F16. mhit 53 (rabies contagion):                           [C] → RabiesApply
      passes the contagion on when 10 ≤ end − frame ≤ ElemLen
F17. mhit 32 (cairnstones): with a record, no unit and MissileData+0x28 = 0: a permanent portal with Param4 (38); else 0   [C] → the portal call
F18. mhit 33, 35 (towerchestspawner, orb mist):   [C] → the room pin or the mode call
      mhit 33: at the end of life, with a room, RoomPinSet(room, 1), else 0
      mhit 35: 0 for a unit; the room of the object +0x28 names, or else that object's mode ← 1 when its mode is 0
F19. mhit 39 (imp spawn): RoomSpawnLevelMon at the missile, on every call   [C] → the spawn
F20. mhit 54 (baal spawn): PresetMonSpawn with the +0x18 word of the owner's unit skill node   [C] → the spawn
F21. mhit 57 (baalfx control): once +0x28 ← 1; QUESTS_IsActive(game, 0x24)   [C] → QUESTS_IsActive
```

- F22. **Row 568** (`royalstrikechainlightning`, `pSrvHitFunc` 64 948): every read of the hit table (four sites) is
  behind a signed 16-bit `test ax, ax; jle` of the function word. [C] (`g_MissileSrvHitFuncs`, `static.txt`)
  The tested word is this row's `pSrvHitFunc`, so 64 948 (−588 as an s16) runs no server hit function: the five hit
  and damage tests and the do test are a `movzx` of the record word (`+0xE` hit, `+0x10` damage, `+0xC` do), then
  `test ax, ax; jle`, `movsx` and a compare with the count, by two decoders, and row 568 is the only row above 0x7FFF
  in any of the three columns. [C] (static, `g_MissileSrvHitFuncs`)

### G. Sorceress (st 11–14; do 17–29, 144)

18 entries; do 18, 20, 22, 27, 28 are tier A, 18, 20, 22 and 28 emulated here too, 27 not. One draw before the boundaries in the batch, do 21's; no case steps the target's seed (8 500 cases; moving the draw to the target fails 93). [C] 

```
G1. st 11 (Inferno, Arctic Blast):                         [C] → STATLIST_Alloc, inside
      refuse a caster outside state 12 whose stat 8 < startmana << 8 (signed); refuse srvmissilea outside the
        Missiles count; else InfernoStart(id, lvl, srvmissilea):
        a monster's used skill +0x18 ← frame + max(calc2, 1); then STATLIST_Alloc(game+0x1C, 2, frame + 0x14,
        type, guid) when the caster has no state-12 list, else RescheduleSkip(1)
G2. do 19:                                                [C] → MissileCreate, or UNIT_CancelEvents
      the same class test; InfernoCreate(id, lvl, srvmissilea): when the used skill's +0x18 ≠ 0,
        MissileCreate {flags 0x8020, owner and source the caster, class, target the skill's target point,
        skill, lvl, +0x4C ← max(calc1, 1)}; at 0: +0x18 ← 1 and RescheduleSkip(1), or for a monster
        +0x44 ← 0xB00 and InfernoEndMonster or UNIT_CancelEvents(1, 0)
G3. st 12 (Telekinesis, Dragon Flight):                    [C]
      with a target unit: refuse one with dx² + dy² > aurarangecalc² (32-bit, signed); accept a type > 1
        (unsigned); a player or monster needs UnitsHostile and neither unit in a town room
G4. do 21 (Telekinesis):                                   [C]
      a player caster not busy; a missile or a type > 4 → 1; an object → OBJ_OperateDispatch(2, guid);
        an item → its first ITEMS_UnitIsType(item, 0x16)
      a player or monster, after the hostility and town tests: r ← Range(caster, 100)          ; draw#1
        flag ← (r < Param2, signed); → SkillRollPhys(id, lvl) with a zeroed 0x70-byte packet
      after: the packet's result |= 9 (a stun) when the flag is set    [I]
G5. st 13 (Thunder Storm): node +0x18 ← −1; +0x1C ← 1      [C]
G6. do 29 (Thunder Storm):                                 [C] → STATE_ApplyTimed, NearestUnitInRange
      the caster has the state and node +0x1C = 0: → NearestUnitInRange(game, caster; 0, 0, Param7, 3, node+0x18, 0)
      otherwise: → STATE_ApplyTimed {caster, caster, id, lvl, auralencalc, −1, 0, aurastate, 0}
      after: on the state path, stats 350/351 ← id and level on the list, node +0x1C ← 0; on the search path,
        a srvmissilea at the unit found, MISSILE_HitUnit, node +0x18 ← its guid   [I]
G7. st 14 (Hydra): a target point whose room (RoomAtSubtile from the caster's room and its
      near rooms) exists and is not a town                              [C]
G8. do 144 (Hydra):                                        [C] → the first SpawnOwnedMonster
      tests the summon, pettype and the room; a hireling caster's owner is the owner;
      block {1, owner, summon, 0, summode (0..15, else 1), x − 1, y − 1, pettype, petmax (the owner's calc),
        frame + (lvl > 0 ? Param1 + (lvl − 1)·Param2 : 0)}
      after: the classes summon + 1 at (x, y) and summon + 2 at (x + 1, y − 1)   [I]
G9. do 17 (Charged Bolt):                                  [C] → MissileCreate
      calc1 > 0 and a target point (else 1): {flags 0x21, owner, the caster's position, class, the target point,
        skill, lvl, callback MissCbReseedPathXPlusArg, +0x58 index 0}
G10. do 22 (Nova, Frost Nova) is tier A: dispatch § O, its velocity and first block there
      do 17 and do 22 take srvmissileb/srvmissilec for a progressive row whose aurastate list holds aurastat1
        at 2 or 3+                                                       [C]
G11. do 24 (Fire Wall); do 28 (Meteor, tier A) alike:   [C] → COLL_WHTest
      COLL_WHTest(room, the target point, Size, Size, 5)
      after: the cell's meaning and do 24's three creations             [I]
G12. do 26 (Chain Lightning):                              [C] → SkillMissileCreate
      SkillMissileCreate(srvmissilea; caster, id, lvl, 0…), calc1 left in its second argument's slot
G13. do 18 (the armours) is tier A: dispatch § O, up to STATE_GroupClear(caster, aurastate; 1)
G14. do 23 (Blaze, Energy Shield), do 25 (Enchant):   [C] → STATE_ApplyTimed
      {caster, unit, id, lvl, auralencalc, −1, 0, aurastate, 0}, with aurastat1 ≥ −1 (signed 16-bit) and
        aurastate in range; do 25's unit is its target when UnitsSameParty says so, else the caster
```

### H. Amazon (st 4–10; do 6–8, 10–16)

17 entries, all emulated; no draw before the boundaries (8 300 cases). [C] do 9 is the barbarian's (§ K). st 4, st 5, do 7 and do 8 are tier A; the entries kept below add the batch's map.

```
H1. st 4 (18 bow, crossbow and javelin rows):              [C]
      no skill-record test; a non-player → 1; a player with no inventory (+0x60 = 0) →
        HandsRefresh(game, unit); with one → the inventory call inside UnitGetWeapon
H2. st 5 (Jab): whether UNIT_GetTargetUnit gives a unit; 0 without a record   [C]
H3. st 8 (Strafe), st 9 (Fend):                                        [C] → NearestUnitInRange or SKILLS_ForUnitsInRange
      the record, then UNIT_GetUsedSkill (none → 0)
      st 8: start 4's ammunition test; r ← aurarangecalc; F ← 3
      st 9: r ← UnitMeleeReach(unit) + 4 (a monster's MonStats2 MeleeRng; a player ends at the inventory call);
            F ← 0x20003
      no target unit: NearestUnitInRange(game, caster; 0, 0, r, F, −1, &n), n = 0
      a target unit: CountUnitsInRange → ForUnitsInRange(game, caster; 0, 0, r, F | 0xA783, CountUnitsCb, &n, 0, …)
      after: the count clamped by the calcs into node +0x18; the target's type and guid into +0x1C, +0x20;
        st 8 uses ammunition                                             [I]
H4. st 6 (Power Strike, Charged Strike), st 10 (Lightning Strike), st 7 (Impale), do 7 (Jab):
                                                                         [C] → COMBAT_MeleeHitTest
      a zeroed 0x70-byte packet; COMBAT_MeleeHitTest(game, caster; target, a, 0)
      a ← 0 (st 6, st 10 after the used-skill test); a ← SKILLS_GetToHit(caster, id, lvl) (st 7 after
        UnitsHostile; do 7): 0 for lvl ≤ 0, (lvl − 1)·LevToHit + ToHit (32-bit) when ToHitCalc is blank, else the calc
      do 7 is tier A (dispatch § O, its monster caster's MonAttackStats(caster, 8) first)
      after: a is the AR percent, so the ToHit columns of Power Strike, MonPowerStrike and MonIceSpear do not
        reach st 6's test; st 10's elemental RangeB(caster, max − min); the damage, the queue, the delivery
                                                                         [I]
H5. do 6 (Inner Sight, Slow Missiles):                     [C] → SKILLS_ForUnitsInRange
      auratargetstate (s16) in the States count and aurastat1 (s16) in the ItemStatCost count (−1 refused):
        block {id, lvl, auralencalc, auratargetstate, aurastat1, aurastatcalc1};
        ForUnitsInRange(game, caster; 0, 0, aurarangecalc, aurafilter, SkillDo06UnitCb, &block, 1, …)
      after: the callback SkillDo06UnitCb calls STATE_ApplyTimed (ECX → its frame block) with
        {game (ctx+4), unit, id, lvl, auralencalc, aurastat1, aurastatcalc1, auratargetstate, 0}: the state
        word after the stat pair                                         [C] (1 500 cases)
        that ForUnitsInRange hands it each unit, and what STATE_ApplyTimed does   [I]
H6. do 8 (Multiple Shot, Teeth, PrimePoisonball, Shock Wave; tier A): [C] → the first MissileCreate
      bit 6; needs a target point; n ← calc1; (sx, sy) perpendicular to the caster–point line (short vectors
        scaled up, then halved, truncating, until sx² + sy² ≤ 3); first creation's target point − (s·n) ÷ 2;
        +0x44 ← calc2; groups g1 = (n − c3) ÷ 2 (outer, flags 0x10820), c3 (calc3, or n when 0; centre, 0x820),
        n − g1 − c3 (outer); the first non-empty group's flags
      after: the other creations, group by group, stepped by (sx, sy)   [C] at (n, calc3) = (21, 2): 36 of 36 Multiple Shot do events, 21 creations each in groups of 9, 2 and 10, flags 0x10820, 0x820, 0x10820, the targets stepped by one (sx, sy)
H7. do 10 (Guided Arrow, Bone Spirit):                     [C] → MissileCreate
      bit 6; needs a target point; {flags 0x20 (0x420 without a target unit), +0x0C the target unit, the point,
        +0x54 callback MissCbAddStat25 when calc1 ≠ 0, +0x58 calc1}
      do 8 and do 10 take srvmissileb (when ≥ 0) for a caster with no inventory; with one → the inventory call
        inside SkillSrcDamWeapon                                                [C]
H8. do 11 (Charged Strike, bit 6), do 14 (Lightning Strike, no bit 6): [C] → COMBAT_DeliverQueued
      with a target unit: COMBAT_DeliverQueued(game, caster; target, 0); else 0
      after: the charged bolts and the lightning chain                  [I]
H9. do 12 (Strafe), do 13 (Fend, Zeal, Fury):              [C] → UnitSetPathTargetUnit, InMeleeRange, NearestUnitInRange
      do 12: node +0x18 (count) = 0 → 0
      the last target: GameFindUnit(+0x1C type, +0x20 guid); found: do 12 UnitSetPathTargetUnit(caster, target),
        do 13 InMeleeRange(caster, target, 0); not found: NearestUnitInRange(game, caster; 0, 0, r, F, guid, 0)
        with do 12's r = aurarangecalc, F = 3; do 13's r = UnitMeleeReach(caster) + 4, F = 0x20003
      after: one arrow or one hit per call, the count − 1, the next target recorded
                                                                         [I]
      do 13 returns 0 on every path                                      [C]
H10. do 15 (Dopplezon), do 16 (Valkyrie, a player caster only):   [C] → SpawnOwnedMonster
      summon and the mode from SkillSummonClass; bit 6; block {0, caster, summon, 0, mode, 0, 0,
        pettype (0 at or past the PetType count), petmax calc, w}
      w (+0x24) is the mode again (do 15) and the Skills record pointer (do 16): no store fills it as a block word
      after: what the spawn makes of +0x24, the life, level, events and owner   [I]
```

### I. Necromancer (st 15–21; do 30–32, 55–63)

19 entries, all emulated; no draw before the boundaries (6 100 cases). [C] st 15, do 30 and do 31 are tier A; the entries kept below add the batch's map.

```
I1. the target tests: each but st 18 refuses (0) without a target       [C]
      st 15 (SkillSt15CorpseTarget): MonCorpseTest(target, 0) for a target outside town
      st 17 (SkillSt17CorpseExpl): MonCorpseTestDead(target)
      st 19: the target's room is not a town room
      st 18: 1, no read
      st 21 (SkillSt21Revive): ReviveTargetTest → MonTestN(ECX target, EDX 7)
      st 20: an item target (type 4) in mode 3 whose record has +0xDC bit 1, whose data flags have
        0x10 and whose STATLIST_GetOwnerUnit is 0; an item class at or past the item count → the fatal path
      MonCorpseTest(u, f): a monster in mode 12 (or 0 when f ≠ 0), carrying no state of DataTables+0x150's
        bit-set, MonStats2 flag bit 7, MonStats +0x32 ≠ 0
      MonCorpseTestDead(u): a monster in mode 12, no such state, flag bit 7
      ReviveTargetTest(u): a monster, MonStats2 flag bit 8, UnitIsDead, MonCorpseTest(u, 0)
I2. st 16 (Poison Dagger):                                 [C] → COMBAT_MeleeHitTest
      refuse a target in town; SKILLS_GetToHit(caster, id, lvl) with a zeroed 0x70-byte packet
I3. do 32: bit 6; COMBAT_DeliverQueued(game, caster; target, 0)   [C] → COMBAT_DeliverQueued
I4. do 30 (the eight curses, Defense Curse, Blood Mana), do 61 (Confuse):
                                                                         [C] → SkillForUnitsNearTarget
      aurastat1 in [−1, ItemStatCost count) and auratargetstate in [0, States count); bit 6
      ForUnitsNearTarget(ECX game, EDX aurafilter; caster, aurarangecalc, callback, &block), a 0x68-byte block
        {game, caster, f, s, id, lvl, len, aurastat[6], aurastatcalc[6], auratargetstate, auraevent1..3,
        auraeventfunc1..3}
      do 30: len ← auralencalc, ÷ the difficulty record's +0x1C (idiv) when auratargetstate is 23 or 56 (f ← 1)
      do 61: len always divided; f ← 0; its stat list starts at aurastat2 (word 0 stays 0); event words 0
      s ← 1 when one listed stat's ItemStatCost byte +5 has bit 1
      after: the callbacks apply the state per unit                     [C] Amplify Damage's 61 do events apply state 9 at most once per unit, one length per event, the caster the applier
        which units in range the callback passes                         [I]
I5. do 31 (Raise Skeleton, Raise Skeletal Mage; tier A):               [C] → COMBAT_ApplyDamage
      MonCorpseTest(target, 0); then SkillClass3SelfHit: a player caster of class 3 → COMBAT_ApplyDamage(game, caster;
        caster, 0, &packet), {+0x00 0x1000, +0x04 4, +0x08 maxhp ÷ 8, +0x4C the same}
      otherwise: the record, SkillSummonClass, a signed pettype in [0, PetType count) →
        RoomUnitOp(room, type, guid) of the target, with the class, mode, position and pet type in its frame
I6. do 55 (Corpse Explosion), do 63 (Poison Explosion):   [C] → STATE_Set
      MonCorpseTestDead(target); STATE_Set(target, 0x68 (55) or 0x76 (63), 1)
      do 63 first: srvmissilea in [0, Missiles count), else return 1
      after: do 55's one RangeB on the target's seed (the corpse's damage roll) and its area hit   [I]
I7. do 58 (Revive), do 59 (Attract):           [C]
      do 58 inside ReviveTargetTest (EDX 7); do 59 inside AttractTargetTest (EDX 0x13, after an alignment of 0, UnitAlignGet)
      after: do 58's one RangeB on the target's seed                    [I]
I8. the summons: do 56 (Clay, Blood, Fire Golem), do 57 (IronGolem), do 60
      (Bone Wall), do 62 (Bone Prison through):
                                                                         [C] → the first SpawnOwnedMonster
      block {w0, caster, summon, 0, mode, x, y, pettype (0 at or past the PetType count), petmax calc, w24}
      do 56: w0 0, position 0, summon tested in [0, MonStats count), mode summode < 16 else 1, w24 the game pointer
      do 57: start 20's test again; w0 1, the target item's position, w24 the frame slot ebp−0x10, which
        do 57 does not write before the call
      do 60: w0 9, the target point inside a non-town room, w24 the game pointer
      do 62: w0 9, the target point plus the first of twelve offsets whose room is not
        a town room, w24 the mode again
      do 56, 57, 58, 60, 62 and 63 refuse id 0 (a test of the id, not of the record)
      after: the summons' levels and stats                              [I]
I9. a class-3 player caster of Raise Skeleton or Revive takes 1/8 of its maximum life as a get-hit
      (class 3 is the paladin in PlayerClass order)                     [I]
```

### J. Paladin (st 29, 31, 35–37; do 64–67, 73, 79–82, 150)

15 entries, all emulated; no draw before the boundaries (4 950 cases). [C] No paladin entry calls: it has two callers, do 31 (Raise Skeleton) and do 58 (Revive), by three tools, and the direct-call closure of the 15 entries (2 136 functions) does not reach it. [C] (static) Nothing in the batch tests the caster's class. [I] st 36, do 65 and do 66 are tier A; the entries kept below add the batch's map.

```
J1. the aura entries do 65 (Might; tier A), 66 (Holy Fire; tier A), 81, 82:   [C] → AURA_ApplyToTarget or SKILLS_ForUnitsInRange
      cost ← ((lvl − 1)·lvlmana + mana) << (manashift & 31)
      end ← SKILLS_NextPeriodicFrame + 1 − frame, p = the perdelay calc (5 when it gives 5 or less)
      a zeroed 0x50-byte block {+0x00 state, +0x04 id, +0x08 lvl, +0x0C end, +0x10 five or six stats,
        +0x28 their values, +0x48, +0x4C}; the values evaluated unless the caster is a player whose stat 8 < cost (signed)
      SkillCallOnSelf(ECX game, EDX caster; AURA_ApplyToTarget, &block) → AURA_ApplyToTarget(ECX &{game, caster, 0, &block}, EDX caster)
      do 65: aurastat1..6 up to the first below 0 with aurastatcalc1..6; +0x48 ← passivestate when > 0;
        +0x00 ← aurastate when in (0, States count); otherwise auratargetstate in [0, States count) and
        ForUnitsInRange(game, caster; 0, 0, aurarangecalc, aurafilter, AURA_ApplyToTarget, &block, 1, …); neither → 1
      do 66, 81, 82: an aurastate outside [0, States count) → 0; passivestat1..5 with passivecalc1..5
        (all five, no stop; do 82 skips the value of a stat below 0); do 81 puts at +0x4C
      after: the target pass and its per-unit draws (§ B2)              [C] Holy Fire's 35 do events: one elemental roll on the caster, its first draw after the do's entry, one fire value across the packets of the 17 events with 2 to 15 units
        § B2's other per-unit draws (the defenders' rolls)              [I]
J2. st 29 (Sacrifice), do 150 (Smite):         [C] → InMeleeRange(caster, target, 0)
J3. st 35 (Vengeance):                                     [C] → COMBAT_MeleeHitTest
      COMBAT_MeleeHitTest(target, SKILLS_GetToHit(caster, id, lvl), 0) with a zeroed 0x70-byte packet; no range test
J4. st 36 (SkillSt36NeedShield, Holy Shield): no inventory (+0x60) → 0; reads no skill record; else InvItemQuery(inventory, 0)
                                                                         [C]
J5. st 37 (Zeal, Fury, BloodLordFrenzy):                   [C] → NearestUnitInRange
      UnitMeleeReachPlus4; with a target: node +0x18 ← calc1, +0x1C the target's type, +0x20 its
        guid; return 1; else NearestUnitInRange(0, 0, reach + 4, 0x20003, −1, 0)
J6. do 64 (Sacrifice):                                     [C] → COMBAT_ApplyDamage
      the first node of the caster's +0xAC chain naming the caster and the target (QueuedHitFind;
        none → 1); COMBAT_ApplyDamage(game, caster; caster, 0, &packet),
        {+0x00 0x1000, +0x08 and +0x4C ← MulDiv(min(queued +0x08, target stat 6), calc2, 100)}
J7. do 79 (Conversion):                                    [C] → COMBAT_DeliverQueued
      bit 6; a target with its queued hit on a type-1 target with HirelingType and UnitAlignGet = 0 →
        MonTestN(ECX target, EDX 0xB) inside ConversionTest; otherwise COMBAT_DeliverQueued(game, caster; target, 0)
J8. st 31 (Charge, SerpentCharge):                         [C] → InMeleeRange, PathSetSpeed
      no used skill or no caster path → refuse; a target → InMeleeRange(caster, target, 0)
      none: node +0x18 ← 6, +0x1C ← 0, +0x24 ← 7; PathSetSpeed(path, MulDiv(base, max(stat 67, 50)
        + Param1, 100)), base = the CharStats byte +0x41 << 8 (0x100 without a record); a monster with a
        MonStats record → PathOp9050(path)
J9. do 67 (SkillDo67Charge, Charge): no used skill → refuse; → UnitAnimData(caster)   [C]
J10. do 73 (Blessed Hammer), do 80 (Fist of the Heavens):   [C] → MissileCreate
      SrvMissileByCharge; a class of 0 or less → refuse
      do 73: the target point; bit 6; {flags 0x20, owner and source the caster, class, +0x1C/+0x20 the point,
        id, lvl} (no start point)
      do 80: a target unit; no bit 6; {flags 1, owner, class, +0x14/+0x18 the target's position, id, lvl}
```

- J1. **Blessed Aim removes Penetrate.** Both rows name `penetrate` in `passivestate`, and Blessed Aim's `aurastate` is
  its own. Do 65 passes that `passivestate` at block `+0x48`, and `AURA_ApplyToTarget` frees that list and clears the state
  on the unit it applies to, so a running Blessed Aim removes Penetrate's list from its caster
  ([stats/states](../../spec-stats/states/) `+0x48`). The other direction, Penetrate's refresh against the aura, is not read.
  [I] (`AURA_ApplyToTarget`, `SKILLS_RefreshPassive`,
  `Skills.txt:passivestate`, `Skills.txt:aurastate`, row 19)
- J2. **A player's Smite draws its hit test, then forces the hit.** Past the boundary, the player branch of do 150 rolls the
  weapon damage, calls `COMBAT_MeleeHitTest(target, 0, 0)` and does `or ax, 1`: the test's
  draws run, and the hit bit is set whatever it returned. The defence bits it returned stay in the word; how
  `ResolveAndQueue` treats a word with both is not followed. [I]
- J2. **A monster's Smite uses its `A2` stats whatever mode it used.** The monster branch passes mode 5 to
  `MonAttackStats` (`edx = 5`), which tests mode 5 first (mask `0x10`), and mode
  5 selects `A2`; it
  stores the test's word with no `or ax, 1` (the player's `or` jumps past it).
  [C] (static, `MonAttackStats`, `SkillDo150Smite`, row 8)
- J2. **Smite sets no flag `0x40`.** Do 150 itself has no access to `Unit+0xC4`, where do 2 does `or [edi+0xC4], 0x40`;
  its direct-call closure (2 085 functions) reaches one of the 124 set sites, `SKILLS_SrvDo`'s, only
  through `COMBAT_DeliverQueued` → `COMBAT_DurabilityLoss` → … → `AuraSelect`, the durability path. [C] (static) Which unit that path sets the bit on, and the 622 indirect calls of the closure, are unfollowed. [I]
  (row 7)

### K. Barbarian (st 32–34, 38–41; do 2, 9, 68–72, 74–78)

19 entries, all emulated; no draw before the boundaries (6 800 cases). [C] st 32 and do 2 are tier A; the entries kept below add the batch's map.

```
K1. st 32 (SkillSt32Hit): the record, the target, the target's room (town → 0); → SkillAttackRateList(ECX caster, EDX calc3)
                                                                         [C]
K2. st 39: → COMBAT_MeleeHitTest(target, SKILLS_GetToHit(caster, id, lvl), 0), a zeroed 0x70-byte packet
                                                                         [C] → COMBAT_MeleeHitTest
      after: st 32's and st 39's elemental SKILLS_RollElemDamage on the caster's seed   [C] for st 32: 73 of 86 Bash starts hold one elemental roll on the caster, 13 none
        st 39, and what the 13 starts without a roll failed               [I]
K3. do 2:                                                 [C] → each call below
      with 0 < srvoverlay ≤ DataTables+0xBC0: a target (→ 0) and a QueuedHitFind node naming the caster and
        the target (none → 1, no delivery); UnitSetOverlayStat(target, srvoverlay, 0) when the
        packet's +0x04 bit 0 is set
      then, auratargetstate in [0, States count): the same two tests; on bit 0, end ← frame + max(auralencalc, 1),
        STATLIST_Alloc(game+0x1C, 2, end, target type, guid) for a target with no list of that state, else
        UnitQueueEvent(ECX game, EDX target; 0xC, end, 0, 0)
      then, aurastate in (0, States count): STATLIST_Alloc(game+0x1C, 4, 0, caster type, guid) or STATE_Set(caster, aurastate, 1)
      else: bit 6 and COMBAT_DeliverQueued(game, caster; target, 0) (no target → 0)
K4. do 9 (SkillDo09Frenzy, Frenzy), do 70 (SkillDo70DoubleSwing, Double Swing): bit 8 of the caster's +0x38 (sar 8, then the mask of bits 31 and 0)
                                                                         [C] → each call below
      do 9: DeliverQueued(target, 0) from two sites; bit 6 only when the bit is 1
      do 70, bit 1: bit 6; NearestUnitInRange(0, 0, reach + 4, 0x20003, target guid, 0)
      do 70, bit 0: st 32, and when it returns, DeliverQueued(target, 0)
K5. st 34 (SkillSt34CorpseTest): CorpseTest(target): a type-1 unit in mode 12 outside the DataTables+0x150 set with
      MonStats2 flag 7                                                   [C]
K6. st 33 (SkillSt33CorpseTest): CorpseTestF12(target) (the same, and MonStats2 flag 12 through MonStats2Flag12), or 0 when the
      target has state 118; neither st 33 nor st 34 reads a skill record [C]
K7. do 69, do 72: the record test and st 33's or st 34's test;
      → STATE_Set(target, 118, 1)                                        [C] → STATE_Set
      after: do 69's Range(caster, 100) < calc1 and the potion pick by a Step(caster); do 72's two
        Range(caster, 100), the second picking the quality by the Param1..4 bands (MonDropNoNoDrop)
                                                                         [I]
K8. do 75 (Grim Ward): → FreeNearFallback(RoomAtSubtile(target room, x; y),
      &{x, y}, 2, 0x1000, 1) at the target's position                    [C] → FreeNearFallback
K9. do 68 (the warcries):                                  [C] → NovaAtUnit's first MissileCreate
      bit 6 before the record test; SrvMissileByCharge; a class in [0, Missiles count) (class 0 admitted);
      {flags 3, owner the caster, class, +0x14/+0x18 the caster's position, +0x1C/+0x20 the first offset pair, id, lvl},
        velocity argument 0
      after: the 64 creations and UnitApplyAuraState       [I]
K10. do 71 (Taunt):                                        [C] → SKILLS_ForUnitsInRange
      auratargetstate in [0, States count); a type-1 target → MonTestN(ECX target, EDX 0xC) inside TauntTargetTest;
      any other or none → SKILLS_ForUnitsInRange(game, caster; 0, 0, 0x14, 0x8783, a filter callback,
        &{0, 2³¹ − 1, x, y, TauntTargetTest}, 0, a static table, 0x2B8) inside NearestByFilter
K11. st 38 (Whirlwind):                                    [C] → each call below
      SKILLS_GetUnitSkill(caster, id); no node, no target point → STATE_Set(caster, 0x12, 0) inside SkillState18Clear;
      state 12 → 0; a target → InMeleeRange(caster, target, 0); else path +0x50 ← 0xC01, PathSetType(path, 7),
        with 0x1C09 (a player) or 0x3C01 at ebp−0x14
K12. st 40:                            [C] → each call below
      the used skill; a monster with a target → MonSkillAttackDo(game); a monster without one:
        node +0x24 ← −1, FreeNearFallback(room, &point, UNIT_GetSizeX(caster), 0x3C01, 0)
      a player: the target point in a room it reaches (not a town room unless Skills +0x05 bit 0);
        d ← max(UnitDistance, 1); when d > range (aurarangecalc): x ← (x − ux)·range ÷ d + ux, y alike
        (32-bit, truncating); FreeNearFallback(RoomAtSubtile(…), &point, size, 0x1C09, 1) inside
K13. st 41:                                 [C] → each call below
      no record test; a target → InMeleeRange inside LeapAttackPoint
      none: (px, py) the path's target point, d ← UnitDistance; 0 → 0; else COLL_PatternTestBool(room,
        (px − ux)·2 ÷ d + px, (py − uy)·2 ÷ d + py, path +0x48, 0x1C09)
K14. do 74 (Double Throw): → UnitGetWeapon's inventory query; no inventory → 0
                                                                         [C] → the inventory query
K15. do 76 (Whirlwind):                                    [C] → each call below
      → WhirlwindEnd(node, id, +0x18, +0x1C) (a word 0, or +0x0C & 3 = 3); RescheduleAt(game, caster; 3) (a live
        player with bit 0); or UnitSetSeqPos(caster, 0) (another live caster)
K16. do 77: → UNIT_CancelEvents(game, caster; 1, 0)      [C] → UNIT_CancelEvents
K17. do 78 (SkillDo78LeapAttack): no record test; → LeapAttackLand (+0x0C bit 8), LeapAttackPath (bit 7), LeapAttackHit (bit 9),
      in that order; else +0x0C ← 0x1000, return 1                       [C]
```

- K14. **Do 74 adds the skill's to-hit to its missile.** Past the boundary, it adds `SKILLS_GetToHit` to the missile's
  stat 19 after creating the missile, the one exception read to
  [missiles B2](../missiles/#b-creation)'s "no to-hit for a player's skill missile". [I] (`SkillDo74DoubleThrow`, `SKILLS_GetToHit`, row 18)

### L. Druid (st 56–58; do 114–124; entries 145, 146)

16 entries, all emulated; two draws before the boundaries, both on the caster's seed (8 400 cases). [C] do 114 and 117 are tier A.

```
L1. do 114 (Raven), do 115, do 119:          [C] → SpawnOwnedMonster
      the record; SkillSummonClass(ECX caster, EDX 0; id, lvl, &mode, 0, 0) (Skills +0xBC; the mode
        +0xBF in [0, 16) else 1); a pettype byte that is negative (movsx) or at or past the PetType count → 0,
        bit 6 not set; bit 6; SpawnOwnedMonster(ECX game, EDX &block), block {0, caster, class, 0, w10, 0, 0,
        pettype, petmax, w24}
      do 114: w10 = w24 = mode; do 115: w10 = 8, w24 = mode
      do 119: SKILLS_GetTargetXY first (none → 0 with bit 6 set); w10 = mode, w24 = the target point's x, the y
        in the frame word after the block (ebp−0x14)
      after: SummonSetLevel, SummonInitStats; do 115 sets stat 12 ← max(calc2, 1) and state 150   [I]
L2. do 116:                                               [C] → STATE_GroupClear
      aurastate in [0, States count) (jl); bit 6; STATE_GroupClear(ECX caster, EDX aurastate; 1)
      after: its list (no max(…, 1) on its length) and the remove callback ShapeRemoveCb   [I]
L3. do 120, do 124:                          [C] → each call below
      aurastate in [0, States count); UNIT_GetUsedSkill and SkillNodeId(node) (its record's s16 +0x00) equal to
        the id, else 0; bit 6
      do 120: a target → COMBAT_DeliverQueued(game, caster; target, 0); node +0x18 = 0 → 1;
        else STATLIST_Alloc(game+0x1C, 2, frame + auralencalc, type, guid) (no list of the state) or
        StatListSetEnd(list, frame + auralencalc)
      do 124: r ← Range(caster, 0x10000), kept at ebp−0xC                        ; draw#1
        auralencalc raised to 1; the same two calls
      after, do 120: stat 169 ← min(old + 1, calc2), and SKILLS_ApplyAuraStats called with that count as the level
      after, do 124: its list, UNIT_CancelEvents(5, id), unit event 5 queued at frame + Param4 with (id, lvl),
        r stored at the used node's +0x18 (rng/seeds' Armageddon cast draw)   [I]
L4. entries 145, 146, the periodic states:   [C] → each call below
      a record outside the table, lvl ≤ 0, aurastate outside [0, States count), a caster without that state,
        entry 146's SrvMissileByCharge ≤ 0 or no unit skill, or aurarangecalc ≤ 0 →
        UNIT_CancelEvents(ECX game, EDX caster; 5, id) at the shared exit
      a caster in a town room with Skills +0x05 bit 0 clear → UNIT_UnlinkStatList(caster, list) (a list of the
        state) or STATE_Set(caster, aurastate, 0)
      otherwise → UNIT_CancelEvents(game, caster; 5, id) at the re-arm site; 145 has stored frame + Param4 in
        its first argument's slot
      after, 145: SkillRollPhys and SKILLS_RollElemDamage (the caster's seed) into AreaHitAt
      after, 146: Init(caster, node +0x18); node +0x18 ← Range(caster, 1 000 000); up to five pairs of
        Range(caster, 2r + 1) for a free point, x first                 [I]
L5. st 56: the used skill and a target; → COMBAT_MeleeHitTest(target, SKILLS_GetToHit(caster, id, lvl), 0),
      a zeroed 0x70-byte packet                                          [C] → COMBAT_MeleeHitTest
L6. st 57: st 56 plus the node's id test; aurastate in range needs the caster's state (none → 0);
      node +0x18 ← 0; the same call, no packet zeroed                    [C] → COMBAT_MeleeHitTest
L7. st 58 (SkillSt58FireClaws), do 122 (SkillDo122Hunger, after bit 6): SkillHitOrResultFlags(game, caster; target, rec, id, lvl, &packet, 0)
                                                                         [C] → each call below
      ResultFlags bit 0 set, no hit test: packet +0x04 ← ResultFlags, +0x00 ← 2 | HitFlags, +0x60 a non-zero
        HitClass, st 58's +0x0C ← calc1; → COMBAT_BuildDamage(game, caster; target, &packet, 0, SrcDam)
      bit 0 clear: → MeleeHitTest(target, GetToHit, 0) inside SkillHitOrResultFlags
L8. do 121:                                               [C] → MeleeHitTest inside
      the target, the node's id and a non-zero node +0x18; +0x18 ← 0
      sum ← the 32-bit total of SKILLS_GetToHit(caster, s, lvl) over the states of the list at DataTables+0x17C
        (count s16 +0x180) that the caster has and whose list's stat 350 names a skill s in range; the last such
        skill's non-zero SrcDam byte (0x80 by default) at ebp−0x8; MeleeHitTest(target, sum, 0)
      the list is STATES_Load's: the States rows with flag bit 16 (disguise), 63, 93, 119, 139, 140, 176 and 177,
        the wereforms among them, at DataTables +0x17C/+0x180     [C] (static, STATES_Load, States.txt:disguise)
L9. do 118; do 117 (Firestorm) is tier A, dispatch § O:  [C] → MissileCreate
      SrvMissileByCharge's class in [0, Missiles count); bit 6; calc1 > 0 (else 0)
      do 118: SkillMissileSeries(game, caster; calc1, class, id, lvl, 0): no target point → 1; else MissileCreate
        {flags 0x21, owner the caster, class, the caster's position, the target point, id, lvl, +0x54 MissCbReseedPathXPlusArg, +0x58 0}
      after: the further creations                                      [I]
L10. do 123 (Volcano):                                     [C] → MissileCreate or the fatal path
      a class > 0, no upper test; the target point; SkillTargetCellFree reaches the fatal path
        for a class at or past the Missiles count
      COLL_WHTest(room, x, y, Size, Size, 5): Size ≥ 2 → COLL_RectTest(room, &{x − Size ÷ 2, y − Size ÷ 2, …}; 5);
        Size 0 or 1 → the cell word & 5 through COLL_CellTestNb (0x27 without a room, map or word array);
        a busy cell → 0
      a free cell: bit 6; b ← Range(caster, 0x100), its low byte in the first argument's slot   ; draw#1
        MissileCreate {flags 1, owner the caster, class, x, y, id, lvl}
      after: MISSDATA_SetSeedLow(missile, b)                            [I]
```

### M. Assassin (st 22–28; do 33–35, 42–52, 54; progressive 36–41, 143)

29 entries, all emulated (8 700 cases; the stack seeds compared too). [C] st 23 and do 35 are tier A; the entries kept below add the batch's map.

```mermaid
sequenceDiagram
  participant C as caster seed
  participant L as local seed
  participant M as new missile
  Note over C: prg 37, 39, 41, 143 at entry
  C->>C: Step, before the record test
  C->>L: Init(local, caster.low)
  Note over L: 37 and 143: one Step, then the ring's first creation
  L->>M: callback MissCbReseedFromArg or MissCbReseedZigzag re-seeds from the local low word
  Note over L: 39: two Range(local, 2r) per try
  Note over L: 41: two Steps, then the first creation
```

```
M1. the starts:                                                        [C]
      st 22: 1 for a target out of town of type 0 or 1, the caster out of town; else 0
      st 25: whether there is a target (a 16-byte target test)
      st 23, st 24: → InMeleeRange(caster, target, 0); st 24 after the used node,
        writing 0 at its +0x18 and returning 0 without a target
      st 26: → StatListSetEnd(state 12's list, frame + 7); or after a startmana test against stat 8,
        → STATLIST_Alloc(game+0x1C, 2, frame + 21, type, guid)
      st 27 (SkillSt27DragonTail): → SkillAttackRateList(ECX caster, EDX Param4)
      st 28: the unit skill, the missile and auralencalc; → STATE_GroupClear(ECX caster, EDX aurastate; 0)
M2. the hits:                                                          [C] → each call below
      do 34: aurastate and aurastat1 range tests; → MeleeHitTest(target, GetToHit, 0)
      do 35 (tier A): → InvGetBodyLocItem(inventory, 4); no inventory: bit 6 set or cleared by bit 8 of +0x38, then do 34
      do 33 (SkillDo33PsychicHammer): st 22's test; → SkillRollPhys inside SkillRollPhysElem
      do 46 (SkillDo46DragonClaw): → MeleeHitTest(target, GetToHit + stat 325, 0) inside DragonClawHit
      do 52 (Dragon Flight): the record; no target → 0; bit 8 of +0x38 set → a zeroed packet and
        MeleeHitTest(target, GetToHit + stat 325, 0); clear → the caster's room (0 → 0), bit 6 cleared,
        SKILLS_GetTargetXY (0 → 0), the room's Levels record (0 → 0), its Teleport byte (+0x04): 0 → 0;
        2 → TeleportPointTest(caster, x, y, 0x804); any other → UnitTeleport(ECX game, EDX caster; 0, x, y, 0, 0)
      do 42, do 50, and do 46 on a bad id: → COMBAT_PrgFinisher(game, caster;
        QueuedHitFind(caster, target)); do 42 with no null test of the hit; do 50 after copying the 0x70-byte
        packet to its frame
      the finisher calls of do 42, do 46, do 50 and do 52
      after: do 33's knock roll by a Step(caster) and its kill flag; do 42's Range(caster, 100) at the last
        charge; the deliveries and the finisher                          [I]
M3. the progressive entries:                                           [C] → the first creation, or as below
      prg 36: SkillNovaAtUnit(game, caster; target, m, id, lvl, MissileSpeedAtLevel(m, lvl) + calc1),
        the nova centred on the target
      prg 37, prg 143:
        Step(caster)                                                   ; draw#1, before the record test
        Init(local, caster.low); Step(local)                           ; draw#2
        the ring's first MissileCreate: flags 3, the target point, the first direction (30, 0), callback
          MissCbReseedFromArg (37) or MissCbReseedZigzag (143) with the local low word; no test of the step count
      prg 38: → DeliverQueued(game, caster; target, 0); without a target SkillRollPhys with the range
        in its first argument slot
      prg 39:
        Step(caster); Init(local, caster.low)                          ; draw#1
        per try: dx ← Range(local, 2r); dy ← Range(local, 2r)          ; draws#2, #3 …
        the first in-circle point with a room → its boundary; after r² tries → 1
      prg 40: → MissileCreateAt(game, caster; id, lvl, m, x, y), no record test of its own
      prg 41:
        Step(caster); Init(local, caster.low)                          ; draw#1
        Step(local) twice: offsets (low₁ mod 40 − 20, low₂ mod 40 − 20), (0, 0) made (20, 0)   ; draws#2, #3
        the first MissileCreate (flags 3); a negative count → 1
      a refused record test returns with the caster's seed one step on (37, 39, 41, 143)
      after: the rings' remaining creations, an endless loop for a step count of 0   [I]
M4. traps, states, areas:                                              [C] → each call below
      do 44 (SkillDo44BladeSentinel), do 45 (SkillDo45Sentry): → SpawnOwnedMonster inside TrapSpawn, block {1, unit, class, 0, mode,
        x, y, pettype, petmax}; a bad pettype becomes 0 instead of refusing; a monster caster is replaced by its
        owner (MonsterOwner, none → 0); do 44's point the caster's position; the room and town tests on the unit
        it ends with
      do 49: bit 6 first; → SpawnOwnedMonster {0, caster, class, 0, mode, 0, 0, pettype (0 at or past
        the count, unsigned), petmax, mode}
      do 47: when the caster lacks the state, → STATE_ApplyTimed {caster, caster, id, lvl,
        auralencalc, passivestat1, passivecalc1, aurastate, STATE_DefaultRemoveCB}
      do 48: bit 6 cleared; while the unit skill's +0x18 is before the frame → MissileCreate (flags
        0x20); else under state 12 → RescheduleSkip(game, caster; 1); else 0
      do 43: → MissScatterAtTarget
      do 51 (SkillDo51MindBlast), do 54 (SkillDo54BladeShield) through BladeShieldArea: → SkillRollPhys with the range in an argument
        slot; do 54 in town → 1 without it
      after: the summons' set-up, do 44's teleport of the trap to the caster, the area callbacks   [I]
M5. ItemEffect 36 (rows 44 Frost Nova, 48 Nova): an item cast of those skills runs prg 36, a nova of the row's
      srvmissilea (119 frostnova, 90 nova) centred on the cast's target unit; nothing without one
        [C] with a kept target and lvl > 0, SkillNovaAtUnit(target, 119 or 90, id, lvl, 24);
        no target: 0, no call (735 and 688 calls, 587 refusals)
        that an item cast of these rows runs prg 36                        [I]
```

- M2. **The knockback's level difference is `slvl`.** Dragon Talon's do reads stat 12 of the target (`push edi`) twice,
  so its chance computes `level(target) + slvl − level(target)`: `edi` is `UNIT_GetTargetUnit`'s result, both reads push it with no `edi` write between, and the chance is `s1 + slvl − s2`. [C] (static,
  `SkillDo42DragonTalon`, row 1)
- M2. Psychic Hammer's do has the same form: both reads are `push ebx`, the target (`ebx` from `UNIT_GetTargetUnit`; the chance). [C] (static,
  `SkillDo33PsychicHammer`, row 2)

### N. Item, charge and shrine callers (st 3, do 4, 113, 151)

Four entries and ten callers, all emulated, five families, 12 000 cases, 0 mismatches.
[C] The cast path itself is
[dispatch § H](../dispatch/#h-item-granted-skills-and-item-event-casts) and the handler table
[dispatch § K](../dispatch/#k-stat-event-handlers).

```mermaid
flowchart TD
  h20["handler 20: attack, kill, hit<br/>chance > 0: Step(unit), low mod 100 vs stat"] --> cast["ITEMSKILL_Cast"]
  h21["handler 21: get-hit<br/>RangeB(unit, 100)"] --> cast
  h30["handler 30: death, level-up<br/>Step(unit)"] --> cast
  cast --> tg{"ItemTarget low byte"}
  tg -->|1| self["aim at the caster"]
  tg -->|2| rp["ItemTargetRandomPoint: no room, no draw;<br/>else two Steps of the caster per try"]
  tg -->|3| corpse["CorpsePickNear"]
  tg -->|4| kept["the stored unit, or none"]
  tg -->|other| sv
  self --> sv{"ItemCheckStart"}
  rp --> sv
  corpse --> sv
  kept --> sv
  sv -->|set| ss["SKILLS_SrvStart(id, lvl, 1)"]
  sv -->|clear| sd["SKILLS_SrvDo(id, lvl, 0, 1, effect)"]
```

```
N1. st 3 (Unsummon):                                       [C]
      1, with node +0x18 ← the target's guid, when the target is a monster whose MonsterOwner is the caster,
        the caster a player, the target's pet type (the caster's pet list holding its guid) has
        PetType's unsummon bit (+0x04 bit 3), and there is a used node; else 0
N2. do 4 (Unsummon): → PetRemove(ECX game, EDX caster; node+0x18, 1),
      the 1 the push left on the stack                                  [C] → PetRemove
N3. do 113 (rows 217–220, identify and town portal scrolls and books):   [C] → the use call
      walk the caster's inventory (+0x60, magic 16 909 060, +0x0C the first item, ItemData +0x64 the next);
      take the first item of type 18 (book) with Books BookSkill = the skill and stat 70 > 0, or (not a book)
        of type 22 (scro) with ScrollSkill = the skill, no quantity test
      by its ItemData +0x69 byte: 1 → PlayerUseInvItem(ECX game, EDX caster; guid, x, y, &arg1); 2 → PlayerUseBeltItem(…, 0);
        any other value → 0 without looking further
      after: both reach ItemUse                            [I]
N4. do 151 (row 53 Chain Lightning's ItemEffect):          [C] → SkillMissileCreate
      bit 6; SkillMissileCreate(ECX game, EDX srvmissilea; caster, id, lvl, dx, dy, 0, 0, 0), (dx, dy) the
        target's position minus the caster's (0 without a target)
      after: MISSDATA_SetSeedLow(missile, calc1)                        [I]
N5. ITEMSKILL_Cast:                                       [C] → SKILLS_SrvStart or SKILLS_SrvDo
      id 0 or ItemEffect 0 → refuse, no write; aim the caster's path at the unit or point; out type 6, guid −1,
        point (0, 0)
      ItemTarget (+0x120) low byte: 1 → aim at the caster (out type and guid the caster's)
        2 → ItemTargetRandomPoint with EDX the cast's caster (the call): the caster's room; none → refuse
            with no draw, the cast then restoring the target, the point and bit 6; else per try
            Step(caster), Step(caster)                                   ; draws #1, #2
            offsets low₁ mod 40 − 20, low₂ mod 40 − 20 (unsigned remainders)
            → COLL_PatternTest(room, x + off₁, y + off₂, path+0x48, path+0x4C)
        3 → CorpsePickNear(ECX caster, EDX target after the aim; id, lvl)
        4 → keep a target, else the stored unit (UnitStoredUnit9C; +0xC8 bit 17, +0x9C type, +0xA0 guid) or none;
            out type and guid (6 and −1 for none)
        any other low byte skips the switch (jump table, values 1–4)
      ItemCheckStart (+0x08 bit 1) → SKILLS_SrvStart(id, lvl, 1); else SKILLS_SrvDo(id, lvl, 0, 1, effect)
      helpers 3 and 4 make no draw before their boundaries, and their static closures hold none
        (586 and 554 functions; 56 and 54 indirect calls not followed)
      after: helper 2's further tries, helper 3's corpse pick, the restore on the other paths and the messages   [I]
N6. the handlers (dispatch K 20, 21, 30):                              [C] → the cast
      chance ← UnitGetStat(unit, stat, layer) of the record's stat << 16 | layer;
        skill ← layer >> DataTables+0xC6C; lvl ← layer & DataTables+0xC70
      all three: no unit → 0, and chance ≤ 0 → 0, with no draw; after the roll, a skill with no record → 0
        (handler 30 tests the skill in [0, Skills count) inline)
      handler 20: (no packet, or packet +0x00 bit 5) Step(unit); low mod 100 < chance casts:
        at the other unit (ItemCastAtUnit, effect 1) or at the unit's path point (ItemCastAtXY, effect 1);
        with ItemTgtDo (+0x07 bit 5) the other unit is the caster and the target (effect 0); no other unit → 1, no cast
      handler 21: packet +0x04 bit 2 → RangeB(unit, 100) < chance casts, effect 0
      handler 30: Step(unit) whatever the packet; low mod 100 < chance casts, effect 0
N7. SKILLS_PayCost:                                       [C] → UseCharge, BloodManaPay or UnitAddStat
      a non-player → 1; a player whose used node has the paid id and an owner item (node+0x34 ≠ −1) →
        UseCharge(EAX guid, ECX game, EDX node; caster)
      else cost ← (mana + lvlmana · max(lvl − 1, 0)) << (manashift & 31), floored by minmana << 8 (signed);
        state 114 → BloodManaPay; stat 8 ≥ cost → UnitAddStat(caster, 8, −cost, 0); less mana, a bad id, or
        mana and lvlmana both 0 → 0
N8. the shrine missiles:                                               [C] → each call below
      shrine 19 (SHRINE_Storm, Storm): the unit search RoomUnitSearchInit(pool, &iter, room, x, y, Arg1, its callback,  ; the callback
        &{0x583, …, +0x0C x, +0x10 y, +0x14 Arg1}) round the shrine
      shrines 21 (Exploding), 22 (Poison): n ← Arg0 + RangeB(shrine, Arg1 − Arg0)   ; draw#1
        n > 0 → ItemIndexByCode('opm ' / 'gpm '); else the first of six MissileCreate blocks
        (45 explosivepotion / 48 chokinggaspoition, flags 0x520, level clamp(clvl ÷ 5, 1, 8))
      after: shrine 19's life loss and sixteen fireballs; 21/22's potions and six missiles   [I]
```

- N9. **The effect flag.** It is 1 only from handler 20 without `ItemTgtDo`, so `ItemEffect` 36 and 151 (Nova, Frost
  Nova, Chain Lightning) replace the do entry only for the skill-on-attack, -kill and -hit stats, not for on-get-hit,
  on-death, on-level-up, the item-use entries or charges; no other call of `SKILLS_SrvDo` passes 1. [C] the effect
  argument is 0 at seven of `SKILLS_SrvDo`'s eight callers and `ITEMSKILL_Cast`'s own argument at the eighth; the
  chains of `ITEMSKILL_Cast`'s ten callers pass 1 only from handler 20 with `ItemTgtDo` clear, 0 with it
  set, from handlers 21 and 30 and from the item-use casts; handler 20 is ItemStatCost's `item_skillonattack`, `-kill`
  and `-hit`, 21 get-hit, 30 death and level-up (static). The do entry's replacement inside
  `SKILLS_SrvDo` is [dispatch § E](../dispatch/#e-the-do-frame-and-skills_srvdo)'s reading. [I]
- N10. **Whose seed helper 2 steps.** The unit the handler made the caster: the other unit for handler 20 with
  `ItemTgtDo` (54 Teleport, the one stock `ItemTarget` 2 row, has it), the stat's owner otherwise; composed from three
  `[C]` links. [I]
- N11. **Pets above a lowered `petmax`** are removed by `PetLimitRefresh`, which `STATE_DefaultRemoveCB`
  and the skill shrine's own remove callback run for a player when a timed state ends: it recomputes each pet type's
  maximum from the player's skills and calls `PetLimit`. [I]
- N12. **In the game.** Handler 20's item cast fired 166 times (event 7) in the Phase 2 run: 102 failed the roll with
  exactly one draw on the handler unit's seed, 64 passed it and cast Chain Lightning at level 5 (at least the roll's
  draw each); handler 21 fired 16 times with at least one draw each. [C]

### O. Monster skills, Skills rows 156–189 (st 42–53; do 83–98, 110, 111)

Thirty entries, all emulated: five families, 12 600 cases, 0 mismatches; only do 96 draws before its boundary.
[C] Which monster
uses which skill is the monster AI specs'.

```
O1. st 42 (Fire Hit, row 156 only):                        [C] → st 32's boundary or COMBAT_MeleeHitTest
      a player caster: st 32, its result; any other: a zeroed hit packet,
        COMBAT_MeleeHitTest(target, SKILLS_GetToHit(caster, id, lvl), 0)
O2. do 83, do 92: → COMBAT_DeliverQueued(target, 0)   [C] → COMBAT_DeliverQueued
    st 50: → COMBAT_ResolveAndQueue(target, &zeroed packet, 0x80)    [C] → COMBAT_ResolveAndQueue
      no target → 0 (do 92 and st 42 after their record test; do 83 and st 50 with none)
      after: do 83's QueuedHitRemove and SKILLS_SrvStart(id, lvl, 0)   [I]
O3. st 47 (Jump):                                          [C] → MeleeHitTest or COLL_PatternMark
      no used node, no path, or state 1 → refuse; the point 2·target − caster (with a target) or the path's
        target point (without, node +0x24 ← −1 first); no room from RoomAtSubtile of the caster's room → refuse
      → MeleeHitTest (target), or COLL_PatternMark(room, x, y, path+0x48, 0x100) (none)
O4. do 110:                                               [C] → the creation or the inventory query
      bit 6; a monster with stat 157 > 0 casts missile 27, with stat 158 > 0 missile 41, at the
        stat's value as the level (written into the level argument's slot); else srvmissilea by
        SkillMissileCreateLob (the Skills lob bit) or SkillMissileCreate; a player's weapon class → the inventory query
O5. the moves and marks:                                               [C] → each call below
      st 43 (SkillSt43MaggotEgg): +0xC4 bits 1–3 cleared; → UnitCorpseColl(caster, 1)
      st 44: → UnitTeleport(room, x, y, 0, 0), the caster's own room and position
      st 45: bits 1–3 cleared; → COLL_PatternUnmark(room, x, y, 5, 0x1000)
      st 46: node +0x18/+0x1C ← the target's position; 1
      st 48: asserts the caster's path inside UNIT_GetTargetUnit (Fatal); no target or node → refuse;
        path +0x90/+0x91 ← 5; → PathSetType(path, 2)
      st 49: SkillSummonClass(caster, 1) (its own MonStats spawn, spawnx/spawny, spawnmode); node
        +0x18–+0x24 ← class, x, y, mode; → COLL_PatternMark(RoomAtSubtile(room, x, y), x, y, 1, 0x100)
      st 51 clears and st 52 sets bits 1–3; 1
      do 89, do 91: their node (and path, do 89) tests; → UNIT_CancelEvents(1, 0)
      do 90 (SkillDo90SwarmMove): → UnitSetSeqPos(caster, calc2) with node +0x0C zeroed when that word has bit 1, else calc1
      do 94: +0x4E byte ← 0; +0x3C ← 0 when the frame word +0x44 >> 8 < 1; 1
      do 98: → UnitTeleport(room, x, y, 0, 0) at the path's target point and its room, or the
        monster owner's room when that point has none
      after: do 89's state-2 landing and path plan; do 91's spawn at the node's point with sumoverlay   [I]
O6. spawns, heals, revives:                                            [C] → each call below
      do 84 (MaggotEgg): +0x3C ← 0; calc1 > 0 → SpawnNearUnitNoBox(class, mode, −1, 0); else UnitKilled(caster, 1)
      do 86 (MagottDown): bit 6; +0x3C ← 0 when the frame word is not above 0; calc1 > 0 →
        UnitSetStat(caster, 6, min(s6 + MulDiv(s6, calc1, 100), UnitGetMaxHp), 0), s6 its stat 6
      do 87 (MagottLay): → SpawnAtPos(ECX game, EDX the caster's room; x, y, class, mode, −1, 0), one
        step from the caster towards the target (the direction's byte in the id's slot, the x offset in the level's)
      do 96 (ZakarumHeal, Bestow):
        hi ← clamp(calc2, 0, 100); lo ← min(max(calc1, 0), hi)
      (a bad id or no target → 0; bit 6 set first)
        r ← RangeB(caster, hi − lo)                                    ; draw#1; none for hi = lo
        pct ← lo + r; v ← MulDiv(UnitGetMaxHp(target), pct, 100) + the target's stat 6
        → UnitSetStat(target, 6, min(max(v, 1), max life), 0)
      do 97 (Resurrect): a target not a monster in mode 0 or 12, one with a state of the DataTables
        +0xD4 set, or one with no room → refuse; → COLL_PatternTestBool(room, x, y, path+0x48, 0x3C01)
      after: do 84's up to four more spawns (mode 8, up to 2n tries) and UnitKilled; do 97's path target and mode   [I]
O7. missiles and the infernos:                                         [C] → each call below
      do 85: srvmissilea + the caster's MonStats class-chain position (+0x4B); → SkillMissileCreate
      do 88: → MissileCreate, flags 0x20, owner and source the caster, the target point one or two
        table steps from the caster towards the node's point (or the target point when the node's is 0),
        the second step by the animation frame
      do 93: → MissileCreate, flags 3, the position a sixth of the way to a point four steps from
        the caster towards the target, that point's offsets as the target words
      do 95: → MissileCreate, flags 0x25, from the caster's position to the target point,
        +0x28 ← (VelLev·lvl) ÷ 8 + Vel; no target point → the CancelEvents(0, 0) of InfernoEnd
      st 53 (the infernos 178, 311, 317, 319, 323 and 193 DiabLight): a bad id or no
        used node → 0; node +0x18 ← frame + max(calc2, 1); the caster in state 12 → 1; else → STATE_Set(caster, 12, 1)
      do 111 (SkillDo111FetishAura): bit 6; → the allocation inside UnitListAround(Param4 + 2·lvl, target x, y)
      after: do 95's frame and repeat logic (calc3's re-queue); do 111's loop: allies of
        classes 141–145 or 396–400 passing a test get an unnamed call(id, lvl, 0x44, 0x19, 0)   [I]
O8. the data joins: Fire Hit has no srvmissilea, so do 83 makes no missile; rows 183 MissileSkill1 and 202
      HireableMissile have none (stats 157/158, or a hireling's weapon class), 336 RogueMissile names rogue1;
      MaggotEgg (159), MagottLay (163) and the nests (167, 320) take their class from the caster's MonStats
      spawn row (sandmaggot1..5 → maggotegg1..5, sandmaggot6 and 7 → maggotegg6, spawnmode S1)
        [C] the cells and the joins (Skills.txt:srvdofunc, MonStats.txt:spawn, the .txt and .bin agree)
        that the do functions take the class from the caster's row    [I]
```

### P. Monster skills, Skills rows 190–289 (st 54, 55, 59, 60, 64; do 99–109, 112, 125–127, 141, 152)

22 entries, all emulated: four families, 9 200 cases, 0 mismatches. [C]

```
P1. the missile casts:                                                 [C] → each call below
      do 99: → the first MissileCreate, flags 0x1F, +0x28 ← the missile's Param1 << 6, +0x34 ← calc1,
        target words (0, 2), the first of sixteen .rdata pairs
      do 101 (SkillDo101FingerMage): a target → PathFaceXY(path, Tx, Ty, 0); else MissileCreate (flags 3, the path point's
        offsets from the caster)
      do 102: → the first of calc1 MissileCreate calls, flags 0x21, the target point, +0x54 MissCbReseedRoll
      do 105: → the first of a row of calc1 missiles across the line to the target, flags 3, step
        (−2·sgn dy, 2·sgn dx), the row's start shifted back by calc1 ÷ 2 steps, the position's y the caster's y
        plus the x offset over 6
      do 106: → NovaAtUnit(caster, m, id, lvl, the missile's speed at the level)
      do 125: → MissileCreate, flags 2, SrvMissileByCharge's missile, the target point's offsets
      do 126: the target's point into the caster's path, → UnitSetPathTargetUnit; no target →
        MissileCreate (flags 0x25, the path point as the target, the speed)
      do 152 is do 95's code (147 instructions, none different)
      after: do 99's other fifteen creations and a second ring when calc2 > 1 (Param2 << 6); do 102's creations
        with +0x58 the index; do 105's further creations; do 126's inferno repeat (state 12, a
        re-queue at frame + 3 or an end at frame + 13)                  [I]
P2. the hits and queued hits:                                          [C] → each call below
      do 100: → SKILLS_RollElemDamage(ECX caster, EDX &packet; id, lvl), packet +0x00 ← HitFlags,
        +0x04 ← 1 | ResultFlags, +0x34 ← the elemental length, +0x60 ← HitClass; no target → 1
      do 103 (SkillDo103DiabRun): → UnitSetSeqPos(caster, Param2) with +0x48 ← Param1 << 8 (the node's bit 1); or
        PathSetSpeed(path, MulDiv(max(calc1 << 8, 0x100), stat 67, 100)) (frame = Param3); or
        UnitSetSeqPos(caster, Param6) with +0x48 ← Param5 << 8 (frame = Param4); or InMeleeRange(caster, the node's
        stored unit, 0) (the caster's +0x4E byte 1); else 1
      do 107: → InMeleeRange(caster, the node's stored unit, 0)
      do 108 (SkillDo108CorpseEat): → the room removal RoomUnitOp(room, 1, guid) of a dead (mode 12) non-hireling monster target
      do 109 (MonFrenzy 215, BloodLordFrenzy 328): → QueuedHitRemove(target)
      do 127: a queued hit without bit 0 → DeliverQueued(target, 0); else UnitSetStat(life unit, 6, …)
        adding MulDiv(min(hit damage, the target's life), calc1, 100), the life unit a monster caster's owner
        (else the caster; 0 for a player caster)
      st 60 (SkillSt60SuckBlood): SkillHitOrResultFlags's MeleeHitTest (ResultFlags bit 0 clear), or SkillHitRecord(target, id, lvl, &packet)
        with +0x00 ← 2 | HitFlags
      after: do 103's path type 1, PathPlan and the melee hit's rolls on the caster's seed; do 107's damage
        rolls (three RangeB(caster, max − min) from the physical range >> 8), its heal by calc3 and re-arm;
        do 108's unit free and the caster's heal by calc1 of the corpse's maximum life; do 109's restart and hit
                                         [I]
P3. node words, prison, corpses, curse:                                [C] → each call below
      st 54: node +0x18 ← the target's guid, +0x1C its type, +0x0C ← 0; the caster's path +0x10,
        +0x12 ← its point, +0x58 ← 0; 1
      st 55:
        local ← a seed made from the target's and the caster's guids (no unit keeps it)
        r ← RangeB(local, calc2 − calc1)                               ; draw#1
        node +0x18 ← max(calc1 + r, 1); +0x1C, +0x20 ← the target's guid and type; 1
      st 59: st 53 with calc1 for calc2 (one instruction differs); → STATE_Set(caster, 12, 1)
      st 64: whether there is a target
      do 104: SkillSummonClass's mode into the level argument's slot; →
        SpawnAtUnitClass(ECX game, EDX room; 0, 0, unit, class, 0) for the target, or the object whose guid the path's
        +0x10 holds when its +0x12 is 2, unless that unit has no room or a town room
      do 141: → SkillAreaBlock(ECX game, EDX &block), a 0x24-byte block (0x3002, the caster, skill 285
        whatever the id, its position, radius (lvl − 1)·Param6 + Param5, the level, the callback BaalCorpseCb)
      do 112 (MonCurseCast 212):
        Step(caster)                                                   ; draw#1, before any test
        k ← caster.low mod 5 picks the curse
        → SkillForUnitsNearTarget(ECX game, EDX 3; caster, radius, CurseApplyCb, &block), the drawn row's curse block
P4. the data joins:                                                    [C] the cells and rows below; [I] one time in five, the caster's level and row 91's Param7 use, which are code
      DiabLight (193) runs st 53 and do 152, the infernos' cast with diablight
      Baal Corpse Explode (285): Param5 40, Param6 0, a radius of 40 at every level
      MonCurseCast (212) casts Amplify Damage (66), Weaken (72), Life Tap (82), Decrepify (87) or Lower Resist (91),
        one time in five each, at the caster's level, with the curse row's own target state, length and radius
        calcs; for row 91 the code fills Decrepify-like stats (velocity and attack rate at row 91's Param7, 0 in
        the stock file; damage and resist −50), and its resist branch is unreachable, k ≤ 4
      DiabRun's (198) Param3 5 and Param4 13 are the two frames do 103 tests
```

### Q. Monster skills, Skills rows 290–338 (st 61–63; do 128–137, 139, 140, 147–149)

18 entries, all emulated: four families, 8 800 cases, 0 mismatches. [C]

```mermaid
flowchart TD
  e["do 140"] --> cnt["Step(caster): n = difficulty + low mod 3 + 2"]
  cnt --> arm{"SpawnClassByBase: the caster's base"}
  arm -->|"base 544 Baal"| sw{"stale EBP − 0x1C = 570?"}
  sw -->|no| a3["Range(caster, 2): class chain step, mode 4;<br/>Range(caster, 24) twice"]
  sw -->|yes| a2["Range(caster, 24) twice;<br/>class 570, mode 1"]
  arm -->|other bases| def["default arm: no draw,<br/>class 0, x 0, y 0, mode 1"]
  a3 --> tr["per try: two Steps, x and y in −9..8"]
  a2 --> tr
  def --> tr
  tr --> room{"RoomAtSubtile finds a room?"}
  room -->|yes| sp["SpawnAtPos(x, y, class, mode)"]
  room -->|"no, n tries"| r1["return 1"]
```

```
Q1. do 140 (Baal Tentacle; no id test):
      no caster → 0                                                    [C]
      Step(caster)                                                     ; draw#1
      n: i32 ← difficulty + (caster.low mod 3) + 2                     [C]
        ; difficulty the game's byte +0x6D; unsigned mod (the 0xAAAAAAAB multiply)
      SpawnClassByBase(caster, &class, &x, &y, &mode, difficulty, 0)
        default arm (every base but those below): no draw; class 0 (MonStats has rows), x 0, y 0, mode 1
                                                                         [C]
        Baal's arm (base 544, baalcrab, also Uber Baal's):  [I]
          c570 ← 570 when the MonStats count > 570 else −1; c562 ← 562 when the count > 562 else −1
          if the class out word ≠ c570:
            class ← MonClassChainStep(c562, Range(caster, 2) + difficulty) ; draw#2
            mode ← 4
          else: class left as it was (570); mode ← 1
          x ← SubX + Range(caster, 24) − 12; y ← SubY + Range(caster, 24) − 12   ; two more draws
          the class out word is do 140's EBP − 0x1C, never written before the call, so the branch
            turns on a word an earlier call left on the stack           [I]
      the base point (X, Y): the target's (types 2, 4, 5 the static path +0x0C/+0x10; others the path
        position, 0 without a path), else the caster's                  [C]
      for i in 0 ..< n:                                                 [C]
        Step(caster); x ← (caster.low mod 18) + X − 9                   ; unsigned mod (the 0x38E38E39 multiply): −9..8
        Step(caster); y ← (caster.low mod 18) + Y − 9                   ; 32-bit sums
        room ← RoomAtSubtile(UnitGetRoom(caster), x; y)
        if room: → SpawnAtPos(ECX game, EDX room; x, y, class, mode, −1, 0), n − i at EBP − 0x14
      no room in n tries → 1, the seed stepped 1 + 2n times
      after: the spawn's +0xC4 |= bits 17 and 26, MonAiDelay(…, 0xF), the caster as owner; the loop goes on
        through the remaining tries (more draws, several tentacles); 1   [I]
      the try offsets cannot wrap for a base up to 2³¹ − 9; from 2³¹ − 8 the offset +8 gives −2³¹ as s32,
        passed to RoomAtSubtile unchecked; a 16-bit path position cannot reach it, a static path's 32-bit
        word (target types 2, 4, 5) is not bounded by the code read   [C]
Q2. do 131 (Overseer Whip):                                [C] → STATE_ApplyTimed
      calc1 evaluated; only for a live monster target whose MonStats base is 453 (minion1):
        r ← Range(caster, 100)                                         ; draw#1
      through WhipApplyState: STATE_ApplyTimed {caster, target, id, lvl, auralencalc, −1, 0, auratargetstate, no
        callback}; or, for r ≥ calc1 (signed setl) and a target not yet in the state, the class-change
        helper WhipChangeClass
      after: the class change                                           [I]
Q3. the missile casts:                                                 [C] → each call below
      do 130: → the first of calc1 MissileCreate calls of VineCreateRow, flags 3, the target point,
        target words (0, 1) the first of four .rdata offsets, +0x54 MissCbReseedPathXPlusArg
      do 132: → SkillMissileCreate(srvmissilea + the caster's class chain position)
      do 136: → MissileCreateAt(caster; id, lvl, srvmissilea, 0, 0)
      do 139: → SkillMissileCreate(srvmissilea)
      do 148, do 149: → SkillMissileCreateLob (the lob bit) or SkillMissileCreate with
        srvmissilea plus the caster's monster-data byte +0x0E (148) or +0x0F (149); the bodies differ in that byte only
      st 63: a monster caster with an owner and a target not in state 118 → STATE_Set(target, 118, 1)
      after: do 130's further vines (index i & 3); do 136's range from calc1 and the distance; do 139's missile
        +0x2C/seed word from the offsets; st 63's missile and UnitMsgA3   [I]
Q4. hits, curses, states:                                              [C] → each call below
      do 128 (SkillDo128CryHelp, Cry Help): → MonHelpBlock(ECX game, EDX caster; &block), block words 1, the target's type
        and guid, game +0xA8 + max(calc1, 1)
      do 134 (Siege Beast Stomp): → SkillRollPhys(ECX caster, EDX &packet; id, lvl), +0x00 ← 1 | HitFlags,
        +0x04 ← ResultFlags, +0x60 ← HitClass
      do 137: a target that passes CorpseTestF12 → STATE_Set(target, 104, 1)
      do 133 (Impregnate): a live monster target of no base 546 or 551, not in state 110, alignment
        not 2 → STATE_ApplyTimed, state 110, length 0, the callback ImpregnateEndCb
      after: do 128's overlay; do 133's end callback (the painworm spawn from a dead unit); do 134's elemental
        roll and area hit; do 137's UnitMarkUpdated and an unnamed call   [I]
      do 137 after STATE_Set(target, 104, 1), run whole: state bit 104 set (when it was clear, its changed bit at word
        (states + 31) / 32 + 3, and with States record 104's +0x12 bit 0 the target's +0xC8 |= 8); UnitMarkUpdated
        links the target to its room's +0x1C list (its own UnitMarkUpdated call then changes nothing); then a further call
        with ECX game, EDX caster and (caster, aurastate, id, lvl)
                                                                         [C] (1 500 cases, 221 at the call)
Q5. moves, spawns, links:                                              [C] → each call below
      st 61 (SkillSt61SelfResurrect): a monster caster with a room → UnitSetStat(caster, 6, stat 7, 0) inside MonReviveInPlace; no
        room → +0xC4 bits 1–3 cleared, PATH_SetMarkMask(path, 0x100)
      st 62: SkillSummonClass(caster, 1)'s class, x, y, mode into node +0x18, +0x1C, +0x20, +0x24; 1
      do 135: from those four words, when RoomAtSubtile finds a room →
        SpawnAtPos(ECX game, EDX room; x, y, class, mode, −1, 0)
      do 129 (Imp Teleport): a caster with an owner → UnitTeleport(caster; 0, the target point, 0, 0);
        neither owner nor target → do 98 called directly (same arguments); a live ownerless target →
        UnitTeleport(caster; the target's room and position, 1, 0)
      entry 147 (StateDo147Attached, States srvactivefunc of state 143 attached): → PathFollowUnit(unit, its owner)
      after: do 129's attach (an imp, base 492, and a base-435 or 441 target, state 143 on, each the
        other's owner) and detach; do 135's second try (mode argument 4); start 61's revive   [I]
Q6. the data joins: Siege Beast Stomp (301) has srvmissilea −1, so do 134 returns 0 for the stock row before
      its packet; Imp Teleport (330) has aurastate 143 (attached), whose srvactivefunc is 147; Overseer Whip
      (295): auratargetstate 141 (bloodlust), calc1 par1 (65), summon 461 (suicideminion1), summode 8;
      Impregnate (300) summon 551 (painworm1)                          [C] (Skills.txt:srvmissilea, MonStats.txt:BaseId, the .txt and .bin agree)
```

- Q7. **Surprises kept as read.** do 148 and 149 differ in one byte; do 132 writes a slot; do 136 tests the point
  before bit 6; three entries have no id test; do 134 returns 0 before its packet for `srvmissilea` −1. They stand
  as code readings inside the map; what the game shows for them is under *Open questions*.
  [C] That the stock row 301 takes that exit is Q6's data join: its `srvmissilea` is blank
  in the `.txt` and 0xFFFF in the `.bin`. [C]

### R. In the game: the Phase 2 sample

One member of each family that has no tier-A member (8a, 8b, 8c, item) was recorded in the game, 12 sessions, and the skills model checks them with **0 mismatches**.

| Family | Member logged | Start events | Do events | Tag |
|---|---|---:|---:|---|
| 8a | 181 Resurrect (do 97) | 66 | 66 | [C] |
| 8a | 160 ShamanFire (do 85) | 39 | 37 | [C] |
| 8b | 282 Imp Inferno (st 59, do 126) | 33 | 1 004 | [C] |
| 8c | 299 Imp Fire Missile (do 132) | 213 | 198 | [C] |
| 8c | 330 Imp Teleport (do 129) | 354 | 347 | [C] |
| 8c | 295 Overseer Whip (do 131) | 61 | 61 | [C] |
| item | 53 Chain Lightning cast by *of Chain Lightning* items (`ItemEffect`, effect argument 1) | 0 | 64 | [C] |

- R1. **What the run checks.** Every creation of the 12 logs (44 773) and every hit end (13 576) is checked by the
  creation and hit-end rows of the checker, and the player rows' caster seeds at `SKILLS_SrvDo` and `SKILLS_SrvStart`
  (2 612 and 2 616 events). The monster rows' caster steps are reported, not checked (no monster row is in the
  checker's modelled list). [C]
- R2. **The `MissCbReseedPathX` re-seed, measured.** In 36 of 36 creations of a class-408 missile (`catapultchargedballbolt`)
  by a catapult spotter (class 516), whose parameter block's `+0x54` is `MissCbReseedPathX`, the new missile's seed at
  `MissileCreate`'s exit lies on the stream of `Init(path word +0x10)`, 10 steps past the `Init` in all 36 (the
  checker row `MC.cbseed2`). [C]
  The 10 steps are `PathPlan`'s random walk, and the `Init`'s low word is path word `+0x10`. [C]
  24 of the 36 lie inside an `end` 1 call of a class-407 missile with hit function 38 (mhit 38). [C]
 Which of the hit entries that pass the callback (mhit 38, mhit 45
) made the other 12, after the log's hit-line cap, is not logged. [I]

- R3. **`ReturnDamage` (stat-event handler 4, Iron Maiden) when its returned damage kills the cursed unit.** In one
  case the cursed monster's seed stepped once between the handler's entry and its return, its life going from 1 173
  to 0 inside the handler. The step is the death's processing or something else the handler calls after the
  damage; which draw is not read. The handler where the unit survives stays a no-draw check. [I]
 **This kill branch is a hole in
  the checker's handler-seed check (`EVH.seed`)**: the checker reports the steps of a `ReturnDamage` call that kills
  its unit and does not check them, so the no-draw `[C]` for handler 4 does not extend to a kill. [I]

- R4. **The monster rows' caster steps per do event**, now a check: do 131 steps the caster once in 61 of 61 do events,
  those with a monster target, as Q2's one draw for a minion target allows, with no nested logged span; do 132 once in
  198 of 198, inside its nested creation; do 129 once in 62 of 347, with no logged line holding it (its `UnitTeleport`
  boundary); do 109 once in 361, inside `COMBAT_MeleeHitTest`, and four times in 634 of 995 (the hit test one, the
  elemental roll one, two with no logged line); the `srvmissile` rows 339, 340, 342 and 345 (do 0) once in 92 of 92,
  inside their creation, where § P's chain places the critical roll; row 167 (do 91) nine times in 1 of 11, with no
  logged line inside; the 14 other logged monster rows none. [C]
 The sources of the unlogged steps (do 129's, do 109's two, row 167's nine) are not read. [I]


## Outputs

Per entry: the accept or result word it returns, the words it writes into the used skill node, the caster's or the
missile's `+0xC4`/`MissileData` words, and the boundary call it ends in with its arguments (a missile, a spawn, a
state, a packet, a delivery). The seeds it steps are § B's. Each boundary's own output is the callee's spec (A4).

## Worked example

do 140 on Hell (difficulty 2) for a caster whose seed is `(low 1, high 666)`, its default arm (no draws; the arm the emulated cases reach: stock Baal, the only stock user, takes Baal's arm, two or three more draws, Q1), base point `(100, 200)`, computed with [rng](../../spec-rng/overview/#algorithm)'s `Step` from Q1's steps. Both branches below are recorded cases: do 140 emulated on that seed and arm (MonStats base 0, no target) spawns at `(100, 199)` with the seed `(0x280687C4, 0x13ADFE65)` when a room holds try 1's point, and returns 1 with `(0xE778FC3B, 0x49422C1A)` when no room holds any of the four. [C] (cases W1, W2, among 1 200 do 140 cases with 0 mismatches)

| Step | Seed after (low, high) | Value |
|---|---|---|
| count `Step` | `0x6AC6935F`, `0x00000000` | `n = 2 + 0x6AC6935F mod 3 + 2 = 2 + 0 + 2 = 4` |
| try 1, x | `0x2F2ED81B`, `0x2C890AFD` | `x = 9 + 100 − 9 = 100` |
| try 1, y | `0x280687C4`, `0x13ADFE65` | `y = 8 + 200 − 9 = 199` |
| try 2, x | `0xB6AAB839`, `0x10B1BFE6` | `x = 5 + 100 − 9 = 96` |
| try 2, y | `0xBFC793C3`, `0x4C305F9E` | `y = 9 + 200 − 9 = 200` |

If try 1's point has a room, the spawn goes to `(100, 199)` with the seed three steps on (the loop then goes on
through tries 2–4, Q1's `after:`); with no room in all four tries the entry returns 1 with the seed nine steps on (`1 + 2n`).

## Reimplementation notes

- **Draws before tests.** do 112 and prg 37, 39, 41 and 143 step the caster's seed before their record test, so a
  refused cast still moves the seed by one. [C]
- **Not the caster's seed.** mdo 30 draws on the target unit's seed, do 55 and do 58 (after their boundaries) on the
  target's, do 81's per-unit roll on each unit's, the shrine entries on the shrine object's, st 55 on a local seed no
  unit keeps. [C] for mdo 30, st 55 and the shrines; [I] for do 55, 58, 81
- **Words read before anything writes them.** do 57's block word `+0x24` is the frame slot `ebp−0x10`, do 140's
  class out word is `EBP − 0x1C` (Q1), and mhit 52's class word `+0x10` is never written (so its missiles are row 0
  by the callee's reading). A reimplementation that wants the game's behaviour has to model the stale values, which
  only a logged case can give. [C] for the unwritten words; [I] for what follows
- **Fatal paths on reachable data.** `MissNovaCreate` with `n ≥ 41` (mhit 38, 45), do 123's class at or past the
  Missiles count, st 20's item class past the item count reach. [C]
- **Identical bodies.** do 152 is do 95's code; do 148 and 149 differ in one byte; st 59 is st 53 with calc1 for
  calc2. [C]
- **Return values that look wrong.** do 13 returns 0 on every path; mdo 14 with a skill or level ≤ 0 returns 2
  without mdo 1; do 63 returns 1 for a bad missile class. [C] for mdo 14 and do 63 and for do 13: its one `ret` follows `xor eax, eax` with no `EAX` write between and no
  branch lands past the `xor` (`SkillDo13Fend`, two independent readings)
- **Signed and unsigned tests.** A blank `SubMissile1` (−1) passes the `≠ 0` test of mdo 21, 22, 23, 25 and 26;
  class 0 passes do 68's test, and do 73 and 80 refuse it; do 31 tests `pettype` signed, do 49 unsigned, do 44 and
  45 turn a bad one into 0. [C]
- **An endless loop.** The rings of prg 37 and 143 do not test their step count; a count of 0 loops for ever. [C]
  both load the prg's calc into `edi`, scale it by 4 and loop `esi += edi` while
  `esi < 0x100`, and no `edi` operand is a test or compare (static). What a negative
  count does is [combat/delivery](../../spec-combat/delivery/#reimplementation-notes) note 11's reading. [I]


## Evidence

- Tables: Skills, Missiles, MonStats.
- Machinery: [skills/dispatch](../dispatch/), [skills/missiles](../missiles/), [rng/seeds](../../spec-rng/seeds/).
