---
title: "Monster stats: hit points, defence, experience, resistances, MonProp and the mod effects"
sidebar:
  order: 5
---

## Purpose

Every server monster gets its stats once, when it is created. The level comes from [monsters/pool § E](../pool/#e-the-monster-level-monstatsinit).
`MonStatsInit` then sets the hit points (one draw on the unit seed), defence, experience, resistances, block and a few
constant stats, from `MonStats` scaled by the `MonLvl` row of the level. It adds the player-count bonus, the classic
nightmare/hell factors, the class's `MonProp` row and its skills. Later in the creation, the special-mod handlers of
[monsters/special](../special/) change these stats for champions, uniques, superuniques and their minions. This spec gives
each stat as an ordered integer computation, the draws on the unit seed in order, the unit's stat-change callback that
rescales current HP and regeneration when max HP changes, and the per-mod effects. To-hit and damage are not creation
stats. They are computed at attack time and are given here for reference only (§ H). Primitives (`Step`, `Range`, `Init`) are those of
rng; `RangeB` in our symbol names is the second compile of `Range` and behaves the same.

```mermaid
flowchart TD
  cr["SUnitCreate: unit seed (spawn J)"] --> lst["UnitStatListCreate<br/>callback MonStatCallback"]
  lst --> app["appearance pick<br/>unit seed (B)"]
  app --> pb["MonPlayerBonus<br/>n, HP %, XP % (C)"]
  pb --> lvl["level, L, d (pool E)"]
  lvl --> base["resistances, block, constants (B)"]
  base --> mls["MonLvlStats mask 7 (A)"]
  mls --> hp["HP draw on unit seed,<br/>player bonus, cap (B)"]
  hp --> acxp["AC, XP, hpregen (B)"]
  acxp --> cls["classic nightmare/hell (D)<br/>via the stat callback (E)"]
  cls --> sk["skills (B)"]
  sk --> mp["MonProp (F)"]
  mp --> me["MonEquip (B12)"]
  me --> sp["special-mod handlers (G)<br/>monsters/special"]
```

## Entry points

| When | Function | Tag |
|---|---|---|
| Server monster created: base stats | — | [C] |
| MonLvl × MonStats per mask | — | [C] |
| Player count, its HP and XP percentages, `MonsterSkillBonus` | — | [C] |
| Classic nightmare and hell factors | — | [C] |
| Any later change of max HP (stat 7) | — | [C] |
| Special-mod handlers (stat writes) | → the handlers of § G | [C] for the handlers met |
| Attack: to-hit and damage (reference only; the attack is [combat](../../spec-combat/overview/)) | — | [C] for its draws and for stats 21, 22 and 19 from the mode's MonLvl cells; [I] for the other terms |

## Inputs

### Tables

All tables are the compiled `.bin` records, indexed by record position. `d` is the stats
difficulty and `L` the MonLvl column set (§ Runtime state).

| Anchor | Used for |
|---|---|
| `MonStats.txt:Level` | the level triple (via [pool § E](../pool/#e-the-monster-level-monstatsinit)); `Level` (normal) for the classic level rewrite |
| `MonStats.txt:minHP`, `MonStats.txt:MaxHP`(N) | `minHP[d]`/`maxHP[d]`, s16 at `+0x0B0 + 2d` / `+0x0B6 + 2d` |
| `MonStats.txt:AC`, `MonStats.txt:Exp` | s16 at `+0x0BC + 2d` / `+0x0D4 + 2d` |
| `MonStats.txt:ResFi` (and `ResDm`, `ResMa`, `ResLi`, `ResCo`, `ResPo`) | s16 at `+0x144 + 6k + 2d`, stats 36, 37, 39, 41, 43, 45 |
| `MonStats.txt:ToBlock` | u8 at `+0x0A3 + d`, stat 20 |
| `MonStats.txt:DamageRegen` | u32 `+0x1A0`, stat 74 |
| `MonStats.txt:Align` | `+0x4C`: 0 enemy (player bonus), 1 skips the bonus and the classic factors |
| `MonStats.txt:noRatio` | `+0x0C` bit 2: MonStats cells taken raw, no MonLvl scaling |
| `MonStats.txt:Velocity` | u16 `+0x32`: the velocity bonus of `champion`, `fanatic` and `fast` |
| `MonStats.txt:Skill1`, `MonStats.txt:Sk1lvl` | 8 skills (s16 `+0x170 + 2k`) and levels (s8 `+0x198 + k`) |
| `MonStats.txt:MonProp` | `+0x1A`: the class's MonProp row |
| `MonLvl.txt:HP`, `MonLvl.txt:AC`, `MonLvl.txt:XP` | row `min(level, 110)`, column `+0x18·g + 0xC·L + 4·d` (u32) |
| `MonLvl.txt:L`-HP(H) | the `L-` set, which single player reads |
| `MonLvl.txt:DM` | the enchant base of § G (and attack-time damage, § H) |
| `MonProp.txt:prop1`, `MonProp.txt:par1`, `MonProp.txt:min1`, `MonProp.txt:max1` | slot `k` of difficulty `d` at `+0x04 + 0x60·d + 0x10·(k−1)` |
| `MonProp.txt:chance1` | u8 at `+0x124 + 6·d + (k−1)` |
| `DifficultyLevels.txt:MonsterSkillBonus` | `+0x10`: added to every skill level |
| `DifficultyLevels.txt:ChampionDamageBonus` | `+0x34`, `CDB`: scales the champion, berserk and strong bonuses |
| `MonUMod.txt:constants` | `c[i]`, rows 1–33: the mod percentages of § G |

### Runtime state

| State | Type | Source |
|---|---|---|
| unit seed | `Seed` at unit `+0x20` | after `SUnitCreate`; see § B, step note B1 |
| `d` | u32: `min(game+0x6D, 2)`, 0 for a hireling | [pool § E](../pool/#e-the-monster-level-monstatsinit) |
| `L` | bool: `game+0x6A ≠ 0 or game+0x74 ≠ 0` (1 in every logged single-player game) | the MonLvl column set |
| expansion flag | game `+0x70` | game creation |
| player count | `PlayerCount(game)`: alive players raised to the `/players` setting in game types 1–3 | — |
| monster level | i32 | [pool § E](../pool/#e-the-monster-level-monstatsinit) |
| mod list, flags | `MonsterData+0x1C`, `MonsterData+0x16` | [monsters/special](../special/#runtime-state) |

Stats are `ItemStatCost` rows: 6 `hitpoints` and 7 `maxhp` (both
`ValShift` 8, so HP × 256), 12 `level`, 13 `experience`, 16 `item_armor_percent`, 20 `toblock`, 25 `damagepercent`, 31
`armorclass`, 36 `damageresist`, 37 `magicresist`, 39/41/43/45 fire/lightning/cold/poison resist, 48–63 the elemental damage
and length stats, 67 `velocitypercent`, 68 `attackrate`, 69 `other_animrate`, 74 `hpregen`, 100 `monster_playercount`,
119 `item_tohit_percent`, 352 `last_sent_hp_pct`. `SetStat` replaces a base value; `AddStat` adds to it and does nothing for
0: 464 `leveladd` writes over a non-zero level and experience, 1 194 non-zero `AddStat` calls, and 44 `AddStat(k, 0)` on a
stat not in the list, after which no logged base list holds an entry of value 0 (234 244 entries). [C]


### Constants

| Name | Value | Anchor | Tag |
|---|---|---|---|
| `g_PlayerHpPct[n]`, `g_PlayerXpPct[n]`, `n` = 0..8 | `0, 0, 50, 100, 150, 200, 250, 300, 350` (both) | `g_PlayerHpPct`, `g_PlayerXpPct` | [C] |
| HP % for `n` ≥ 9 / XP % for `n` ≥ 9 | `(n − 2)·50` / `10n + 260` | — | [I] |
| constant stats at creation | 67 = 75, 68 = 100, 69 = 100, 352 = 128 | — | [C] |
| `g_ClassicDiffAdjust` rows `{stat, nmMul, nmDiv, hellMul, hellDiv}` | `{7, 1, 2, 1, 2}`, `{31, 10, 12, 10, 12}`, `{13, 10, 17, 10, 26}` | `g_ClassicDiffAdjust` | [C] |
| classic level | MonStats `Level` (normal) + 25·d | — | [C] |
| `MonsterSkillBonus` by difficulty | 0 / 3 / 7 (data) | — | [C] |
| `CDB` by difficulty | 90 / 75 / 66 (data) | `DifficultyLevels.txt:ChampionDamageBonus` | [C] |
| MonUMod `c[1..3]` minion HP % | 100 / 75 / 50 | `MonUMod.txt:constants` | [C] |
| `c[4..6]` champion HP %, `c[7..9]` unique HP % | 200 / 150 / 100; 300 / 200 / 100 | `MonUMod.txt:constants` | [C] |
| `c[10]`, `c[11]` champion to-hit %, damage % | 75, 100 | `MonUMod.txt:constants` | [C] |
| `c[12]`, `c[13]` strong to-hit % minion, unique | 50, 100 | `MonUMod.txt:constants` | [C] |
| `c[14]`, `c[15]` strong damage % minion, unique | 75, 150 | `MonUMod.txt:constants` | [C] |
| `c[16..18]`, `c[19..21]` minion enchant min %, max % | 0 / 33 / 33; 0 / 50 / 50 | `MonUMod.txt:constants` | [C] |
| `c[22..24]`, `c[25..27]` champion (ghostly) cold min %, max % | 33 / 33 / 33; 50 / 50 / 50 | `MonUMod.txt:constants` | [C] |
| `c[28..30]`, `c[31..33]` unique enchant min %, max % | 66 / 66 / 66; 100 / 100 / 100 | `MonUMod.txt:constants` | [C] |

The `c[i]` descriptions are the table's `*constant desc` text; the readers above are what fixes their use. `c[i]` is 0
for `i` ≥ the row count. [I]

### Inputs and oracles

It predicts the unit-seed draws of `MonStatsInit`, the base stats after the classic adjustment, after MonProp and at the exit, and the stats after every handler call with flag 1 and flag 0. [C] A forced-path run (MonUMod edited so that `berserk` is the only champion mod with a weight) adds the `berserk` handler: 33 berserkers in 33 packs, `monstats: 30863 checks, 0 mismatches`. It backs the handler and the berserker level only, no frequency and no champion chance. [C]

| Input | Kind | What this spec needs | Owner | Tag |
|---|---|---|---|---|
| unit seed at `MonStatsInit` entry | seed input | `Init(step(game).low)` (rng/seeds 7a); 22 creations of the run start from another seed, which the model takes from the log: the region append's `MonVariantRoll` on the unit seed, which the chain predicts ([chain § Algorithm](../../spec-chain/overview/#algorithm) E2) | rng/seeds, spawn § J | [C] |
| monster level | value input | stat 12 before this spec's writes | [pool § E](../pool/#e-the-monster-level-monstatsinit) | [C] |
| mod lists and flags | value input | which handlers run, with which flag, in which order | [monsters/special](../special/#c-mod-handlers) | [C] |
| re-created monster's stats 7, 12, 13 | specified elsewhere | the restore writes 13 and 7 from the inactive record; 12 is this spec's `MonsterInit` level plus the re-applied mods | [drlg/lifecycle § H](../../spec-drlg/lifecycle/#h-the-restore) | [C] |

Out of scope: to-hit, damage and elemental damage (attack time, § H), skills, the AI and what an aura does in combat. [I]

## Algorithm

### A. `MulDiv` and `MonLvlStats`

```
A1. MulDiv(a: i32, b: i32, c: i32) → i32:                        [C]
      if c = 0: return 0
      if a > 0x100000:
        if c ≤ a >> 4: return (a ÷ c) × b                         ; arithmetic shift, signed compare; truncates before multiplying, product wraps
        else: return low32((i64) a × b ÷ c)                       ; CRT_alldiv, truncates toward zero; a quotient outside i32 wraps
      if b > 0x10000:
        if c ≤ b >> 4: return (b ÷ c) × a
        else: return low32((i64) a × b ÷ c)
      return (a × b) ÷ c                                          ; 32-bit imul (wraps) / idiv, the creation branch

A2. MonLvlStats(class, L: bool, d: u32, level: i32, mask) → out: [C]
      if level < 0: return, out untouched                         ; [I]
      row ← MonLvl[min(level, nMonLvl − 1)]                       ; nMonLvl − 1 = 110
      d ← (d < 1) ? 0 : min(d, 2)
      ms ← MonStats[class];  ratio: bool ← not ms.noRatio
      if mask & 1:
        out.minHp: i32 ← ratio ? MulDiv(row.HP(L, d), ms.minHP[d], 100) : ms.minHP[d]
        out.maxHp: i32 ← ratio ? MulDiv(row.HP(L, d), ms.maxHP[d], 100) : ms.maxHP[d]
      if mask & 2: out.ac: i32  ← ratio ? MulDiv(row.AC(L, d), ms.AC[d], 100)  : ms.AC[d]
      if mask & 4: out.exp: i32 ← ratio ? MulDiv(row.XP(L, d), ms.Exp[d], 100) : ms.Exp[d]
```

Step notes:

A1. `MulDiv` is signed and truncates toward zero in every branch. The 32-bit branch is the one every `MonLvlStats` call at
creation takes on stock data (largest products: MonLvl HP 10 000 × `maxHP` 9 981; MonLvl XP 160 000 × `Exp` ≤ 6 600, both
below 2³¹), and it is reproduced bit-exactly. [C] The other
branches are as A1 gives them: under emulation 4 000 synthetic triples (the branch edges, negative values, `c` = 0, random
words) return the model's value, and an exact-quotient control differs in 1 948. A 64-bit quotient outside the 32-bit range
is returned wrapped (its low 32 bits; EDX holds the high half), not saturated. A negative `c` always satisfies
`c ≤ a >> 4` (resp. `b >> 4`) inside the two large-argument branches, so it takes the truncate-first form there; with `a` and
`b` both at or below their thresholds it takes the 32-bit branch. [C]
The emulation leaves out the one input that faults, a 32-bit product wrapping to `INT32_MIN` with `c` = −1 (`idiv`
overflow traps on the processor). [I]

A2. MonStats cells are read as s16 (`movsx`), MonLvl cells as dwords. Masks 8 to `0x100` (to-hit, damage, elemental damage) are attack-time (§ H); creation uses mask 7 only. [I] Single player reads the `L-` set: in 3 954 nightmare and hell creations of the run where the two sets give different values, every one matches `L-`. This contradicts, which reserves `L-` for ladder games. [C] With stock data the sets differ only in `AC(N)`, `AC(H)` and `HP(H)`. [C] (`MonLvl.txt:AC`(N), `MonLvl.txt:HP`(H))

### B. `MonStatsInit` in order

```mermaid
flowchart TD
  b1["B1 new stat list with callback"] --> b2["B2 appearance: 1 draw or 1 per component"]
  b2 --> b3{"class 311 or 312?"}
  b3 -->|yes| b3y["B3 Range(4)"]
  b3 -->|no| b4
  b3y --> b4["B4 MonPlayerBonus"]
  b4 --> b5["B5 level, stats 12, 100, resistances, block, constants"]
  b5 --> b6["B6 MonLvlStats mask 7"]
  b6 --> b7["B7 HP draw RangeB(hi - lo + 1)"]
  b7 --> b8["B8 hp, cap, stats 7, 6, 31, 13, 74"]
  b8 --> b9["B9 classic adjustment (D)"]
  b9 --> b10["B10 skills"]
  b10 --> b11["B11 MonProp (F)"]
  b11 --> b12["B12 MonEquip"]
```

Step notes:

B1. The callback is what rescales stat 6 and recomputes stat 74 whenever max HP changes later (§ E). The first
`SetStat(7)` of B8 has `old` = 0 and triggers nothing. [C]

B2. The run made the variant-set pick in 4 255 creations and the per-component draws in 316, all predicted. The
per-component fallback draws for every count ≥ 1, unlike `MonVariantRoll` of [pool § D](../pool/#d-appearance-sets-monvariantroll),
which skips counts < 2. [C] The appearance pick and the HP draw are the two unit-seed steps that
spawn § J1 sees on most creations. [C]

B3. The `doomknight` draw comes right after the appearance pick, on the unit seed. Class 311 (`doomknight2`) stores it in `MonsterData +0x0E` (appearance byte 10): all 99 creations of a nightmare *River of Flame* (107) session. Class 312 (`doomknight3`) writes one `Range(4)` to both `+0x0E` and `+0x0F` (bytes 10 and 11): 63 creations in a nightmare *Chaos Sanctuary* (108) session, the two bytes equal in every one and all four values met.

B5. Blank MonStats cells are used as the value 0; there is no "none" test. No hell adjustment is applied to the
resistances at creation. [C] Stat 100 is
the creation player count and stays fixed (§ C). [C]

B7. `RangeB(seed, n)` steps once and returns `low mod n` for `n` ≥ 1, and returns 0 with no step for `n` < 1 (signed), as in rng. So `maxHp = minHp` still steps (`n` = 1), and a reversed range (`maxHp < minHp`) makes no step and gives `minHp`. [C] for the draw. The reversed range is `[C]` by composition: is straight-line code (the `n` computation, the call, the add of `minHp`), `MonLvlStats` scales `minHp` and `maxHp` each on its own and never compares them, and `RNG_RangeB`'s `n` ≤ 0 branch is `[C]` in rng. Two stock rows are reversed in Normal: `mephistospirit` (401, placed by `mephcomp.ds1` in level 102) and `minionspawner1` (484, in no pool or DS1). No logged creation met one. [C]

B8. The hpregen formula is evaluated on the HP before the classic adjustment; § E recomputes it with a different
rounding when max HP changes. Stat 13 has no cap. [C]

B8. A monster with few hit points has no regeneration: `((hp << 8) × r) >> 12` is 0 while `hp × r < 16`. [I] (`MonStats.txt:DamageRegen`, row 14)

B10. `MonsterSkillBonus` comes from the DifficultyLevels record of `game+0x6D`, and the step makes no draw for a monster. After the loop the unit's skill list is exactly `{(Skill[k], Sk_lvl[k] + bonus) : Skill[k] ≥ 0, Sk_lvl[k] > 0}`: 2 678 creations, 2 102 skills, bonus 0 in normal (2 153 creations), 3 in nightmare (249) and 7 in hell (276), with the unit seed checked across the loop in every creation. The call right after it, is an empty function (`ret 8`). [C] A `Sk<k>mode` ≥ 0 also sets the skill's mode, and `UnitSkillAdd` reaches RNG only through its player branch; the mode was not logged. [I]

B12. `MonEquipInit` runs only for a class with a `monequip` row whose `oninit` byte is set, on a unit with an inventory. From the first row of the class whose level ≤ the monster level, for each following row of the class, it counts `k` leading item slots with a location 1..10 (≤ 3). If `k` > 0, one unit-seed step picks one (`low & (k − 1)` or `low mod k`), and the item is created when that location is free. Item creation draws on the game seed and on its own seeds. [I] The `oninit` byte is at row `+0x04` and the level the row is compared with is the s16 at `+0x02`; a class's first row is the first record whose `monster` is the class (MonStats `+0x2A`, written at load). The code tests `row[+4]`, and a check of `monequip.bin` against `monequip.txt` agrees on all 45 rows; the stock table has two `oninit` classes, 234 (`flyingscimitar`) and 267 (`bloodraven`), each its class's first row. [C] The path those two rows take is reproduced: one row of level 0 with one location, so `k` = 1, the masked step, and one item at a free location with its two game-seed steps. creates class 267 three times and class 234 once, with the unit seed after `MonEquipInit` predicted and each item made by the item chain, and the control that leaves out the location draw fails each case. one creation of each class reproduces the unit seed after `MonEquipInit` with its one item (two items in all), and a control with no `MonEquipInit` walk fails both. So the call is made and its draws are the model's on the stock rows; the seed after it is no longer an oracle. [C] The level skip, a second row, `k` of 2 or 3 and an occupied location are unreachable with the stock table and stay `[I]` (*Open questions*). [I] 

### C. The player count (`MonPlayerBonus`)

```
C1. MonPlayerBonus(game, room, unit) → pb:                       [C]
      pb ← {hpPct: 0, xpPct: 0, players: 0, skillBonus: 0, difficulty: 0}
      if unit is a monster with a MonStats record:
        if MonStats.Align = 0:
          n: i32 ← max(1, PlayerCount(game))
          pb.hpPct ← (n < 9) ? g_PlayerHpPct[n] : (n − 2) × 50
          pb.xpPct ← (n < 9) ? g_PlayerXpPct[n] : 10 × n + 260
          pb.players ← n
        else: pb.players ← 1
        rec ← DifficultyRec(game.difficulty)
        if game.difficulty ≥ 3: game.difficulty ← 2              ; [I] writes the game byte
        pb.skillBonus ← rec.MonsterSkillBonus;  pb.difficulty ← game.difficulty
```

Step notes:

C1. The bonus is **+50 % per player beyond the first**, for hit points and experience alike, so at `/players 8` both
gain 350 %. [C] `Align` 1 (town
NPCs, critters, hirelings, player summons) and 2 (`cow`, `camel`) get no bonus and `players` 1: `Align` 1 at `/players` 8
for 16 classes (Lut Gholein's NPCs and the `roguehire` hireling) and `Align` 2 (`cow`) at 8, each record reproduced;
`camel` was not met (the test reads `Align` only). [C]

C1.

C2. **The count is applied once, at creation. A live monster is never rescaled.** `PlayerCount` has two callers, this
function and the TC drop code, and stat 100 keeps the creation count. The run changed `/players` 13 times in nine games
and compared stats 7, 12, 13 and 100 of 302 live monsters at each change: all equal their creation values. [C]
 Monsters created after a change get the new count.
[C] The re-creation of a monster from an inactive room
is a separate case.

C3. `MonPlayerBonus` is also called by four attack and skill functions, which write no HP. Later readers of stat 100 (crushing blow, with `PlayerHpPct`) use the creation count. [I] Those four read only the block's `difficulty` word, so these calls take no player count from it. [I]

### D. Classic nightmare and hell (`MonClassicDiffAdjust`)

```
D1. MonClassicDiffAdjust(unit, expansion, d: game byte):         [C]
      if expansion ≠ 0 or d = 0 or MonStats.Align = 1: return
      for row in g_ClassicDiffAdjust[0 ..< 3]:                   ; stats 7, 31, 13 in that order
        v: i32 ← GetStat(unit, row.stat)
        SetStat(row.stat, (d = 1) ? MulDiv(v, row.nmMul, row.nmDiv) : MulDiv(v, row.hellMul, row.hellDiv))
      SetStat(12, MonStats.Level[0] + 25 × d)                    ; Level (normal), +0x0AA
```

Step notes:

D1. Max HP × 1/2, AC × 10/12, experience × 10/17 (nightmare) or × 10/26 (hell). The halving of stat 7 runs the stat
callback (§ E), which halves the current HP (stat 6) with it and recomputes stat 74. The run's 354 classic nightmare
and hell creations are all reproduced, and in all 354 `Level + 25·d` differs from `Level(d)`. [C]


D2. The MonLvl row of § A was chosen by MonStats `Level(N)`/`Level(H)`.
Only the level **stat** becomes `Level + 25·d`, and every later reader of stat 12 sees that value: the mod handlers (the
enchant base `ℓ` of § G, `leveladd`, `aura`) and the attack code. [C]

D3. **The classic aura level.** `UModAura` reads stat 12 after `leveladd`, so in a classic nightmare or hell game it reads
`Level + 25·d + 3`. In classic hell the run logged five aura uniques of class 48 (`Level` 18, `Level(H)` 78) drawing their
aura with level 71 = 18 + 50 + 3, not `Level(H)` + 3 = 81. [C] The draw itself is in
[special § C3](../special/#c-mod-handlers).

D4. A class with `Align` 1 is skipped: the 8 classic nightmare and hell creations of `Align` 1 classes keep their level
and stats, while the 354 of `Align` 0 are adjusted. [C] `d` here is the game byte, not the hireling's forced 0; the two differ
only for a hireling, which has `Align` 1 and is skipped anyway, so no creation separates them. [I]


### E. The stat callback (`MonStatCallback`), stat 7

```mermaid
flowchart TD
  s["SetStat 7: old to new"] --> t1{"new = old or old ≤ 0?"}
  t1 -->|yes| n["nothing"]
  t1 -->|no| t2{"cur = stat 6 ≤ 0?"}
  t2 -->|yes| n
  t2 -->|no| sc["stat 6 = clamp(trunc(float32(new / max(old, 256) × cur)), 1, new)"]
  sc --> t3{"monster with DamageRegen r ≠ 0?"}
  t3 -->|yes| rg["stat 74 = ((new >> 8) × r) >> 4"]
  t3 -->|no| n2["stat 74 unchanged"]
```

```
E1. on SetStat(unit, 7, new), old = the previous value:          [C]
      if new = old or old ≤ 0: return
      cur: i32 ← GetStat(unit, 6);  if cur ≤ 0: return
      if old ≤ 0x100: old ← 0x100
      x ← (float) new ÷ (float) old × cur                        ; fild / fidiv / fimul
      v: i32 ← trunc(float32(x))                                 ; fstp to a float32, then truncated
      SetStat(unit, 6, clamp(v, 1, new))
      r: u32 ← unit is a monster ? MonStats.DamageRegen : 0
      if r ≠ 0: SetStat(unit, 74, ((new >> 8) × r) >> 4)
```

Step notes:

E1. The quotient and product are computed in floating point, the result is stored as a float32, and the float32 is
truncated to an integer. The model computes the product in double precision and rounds it to float32. That reproduces
every classic nightmare/hell creation and every `hpmultiply` call of the run. [C] The x87 control word in force is the one the CRT start-up sets, and no game code changes its
precision or rounding control persistently. It rounds to nearest and its precision is not 24 bits: round-toward-zero would
change 282 of the run's 825 logged stat-6 rescales, and 24-bit precision four. [C] The precision is 53 bits (`_PC_53`, written once at start-up); the run does not separate 53 from
64 bits, so the width rests on the code. [I] A
double-precision product rounded to nearest float32 is that configuration. The final conversion truncates toward zero
whatever the rounding control is. [I]

E2. Who triggers it: the classic halving (§ D) and every `MonHpAddPct` (§ G). `MonHpAddPct` writes stat 6 itself right
after stat 7, so there the callback's stat 6 is overwritten and only its stat 74 matters. `hpmultiply` with flag 1 then
sets stat 74 to 0; with flag 0 (group members) and in `possessed` and `berserk` the callback's stat 74 stays. [C]
 The
`berserk` part is shown by the 33 berserkers of a forced-path run, every stat write predicted. [C]


E3. The callback's other cases (stats 9, 11, 83, 97, 98, 107, 126, 127, 151, 188, 204) are not reached by a creation
stat. They are specified in [stats/aggregate § G](../../spec-stats/aggregate/#g-the-maxima-the-rescale-and-the-stat-callback): stats 9 and 11 rescale current mana and stamina by the rule of E1 (a player's 5 752 rescales of
stats 7, 9 and 11 reproduced). [C] The skill,
item-aura and state cases are read from the code. [I]

### F. MonProp at creation

```
F1. rec ← MonPropRec(class)                                      [C] except the lines tagged [I]
    if rec ≠ 0: for k in 0 ..< 6:
      slot ← rec.slot[d][k];  if slot.prop < 0: break
      c: u8 ← rec.chance[d][k]
      if c = 0: apply ← true                                     ; no draw
      else: Step(unit.seed); apply ← (low mod 100 < c)           ; [I] draw, unsigned mod
      if apply: PROP_ApplyBlock(mode 0, unit, slot, flags 0x40)  ; value roll on the unit seed when min ≠ max
```

Step notes:

F1. `d` is the stats difficulty (0 for a hireling). Every monster of the class gets the row, special or not. The
applied stats go to a stat list of flags `0x40` attached to the unit's list. `par`, `min` and `max` mean what they mean
for the property's `func` in [items/properties § D–E](../../spec-items/properties/#d-the-value-roll-and-the-stat-writer).
`PROP_RollValue` draws on the **unit seed**, not an item seed. [C]

F2. Stock `chance` is 0 in every slot, so every set slot applies with no `chance` draw, and the `chance` > 0 branch is not
reached on stock data. On stock data only `thorns` has `min ≠ max` (`quillrat6..8`, nightmare 15..20, hell 30..40). The run
reproduced `thorns` 15..20 with its unit-seed roll (`quillrat8`, nightmare, 242 creations) and `crush` 15 (nightmare) and 25
(hell) of `blunderbore1` in classic. [C]

F3. `MonPropRec` is the only reader of `g_pMonProp`: the one `DataTables + 0xC30` operand in `.text` is its own, and the address appears only in the loader and the unloader. Of the three MonProp rows with a normal slot, two are unreachable on stock data: `baboon6` is only in `nmon` of level 124 (no normal pool), and no MonStats record names the `irongolem` row. [C] The third, `druidhawk`, **is** reachable: it is the summon of the Druid skill Raven (221), `MonStatsInit` takes `d` = 0 only for the five hireling classes, and `MonPropRec` runs for every monster, so a Druid's Raven in a normal game reads the normal row (`stupidity`, −1). The summon's creation path into `MonsterInit` is not read and the MonProp list of such a creation was not logged (*Open questions*). [I]

F3.

### G. The mod handlers' stat effects

The handlers run in `SpecialModsApply`'s order: mods 1, 2, 3, 4, then the mod
list. After each one the same handler runs with flag 0 on every group member. Flag 1 is the special itself and flag 0
a member of its group. A champion-pack member runs its own pass with flag 1. No flag-0 call follows a champion, so a
champion leader's pass reaches no pack member. Flag-0 calls go to the minions of uniques and superuniques, and to the
MonStats minions of a champion-pack member whose class is `SetBoss`: `MinionsSpawn` gives it minions (it is created
without flag `0x40`), and its own pass walks them with flag 0 (64 walks, classes 59, 397 and 645, the minions' stats
reproduced). [C] No handler draws on any seed. [C]


Notation: `lvl` is stat 12 when the handler is called, `x` is stat 13 then. `÷ 100` is signed 32-bit division
truncating toward zero. `CDB` is DifficultyLevels `ChampionDamageBonus` of `game+0x6D`. "champion part" is the flag-1
body of `champion` without its velocity, given in the `champion` row: 71 `champion` calls in nightmare (CDB 75) and hell
(66), and the champion part inside 11 `ghostly`, 3 `fanatic` and 7 `possessed` calls, every stat write reproduced. [C]


| Mod (row) | Flag 1 (the special) | Flag 0 (group member) | Tag |
| --- | --- | --- | --- |
| 2 `hpmultiply` | `MonHpAddPct(c[4+d])` if the champion flag (`MonsterData+0x16` & 4) is set, else `MonHpAddPct(c[7+d])`; then SetStat(74, 0) | `MonHpAddPct(c[1+d])` | [C] (198 / 266 calls) |
| 4 `leveladd` | SetStat(12, lvl + 3); SetStat(13, x × 5) | the same | [C] (198 / 266) |
| 16 `champion` | SetStat(12, lvl − 1); SetStat(13, x − 2·(x ÷ 5)) (unsigned); AddStat(25, CDB·c[11] ÷ 100); AddStat(119, CDB·c[10] ÷ 100); AddStat(67, 20) if `Velocity` > 0 | nothing | [C] (71 / 8) |
| 36 `ghostly` | flag `0x40`; SetStat(36, 80); champion part (no velocity); AddStat(54, c[22+d]·DM ÷ 100); AddStat(55, c[25+d]·DM ÷ 100); AddStat(56, 150) | nothing | [C] flag 1 (11 / 0); [I] flag 0 |
| 37 `fanatic` | SetStat(16, −70); champion part; AddStat(67, clamp(2048 ÷ Velocity − 128, 10, 100)) if `Velocity` > 0 | nothing | [C] flag 1 (3 / 0); [I] flag 0 |
| 38 `possessed` | flag `0x20`; `MonHpAddPct(100)`; champion part; AddStat(67, 20) if `Velocity` > 0 | nothing | [C] flag 1 (7 / 0); [I] flag 0 |
| 39 `berserk` | `MonHpAddPct(−75)`; AddStat(25, CDB·300 ÷ 100); AddStat(119, CDB·300 ÷ 100); **no champion part** | nothing | [C] flag 1 (33 / 0); [I] flag 0 |
| 5 `strong` | AddStat(25, CDB·c[15] ÷ 100); AddStat(119, CDB·c[13] ÷ 100) | AddStat(25, CDB·c[14] ÷ 100); AddStat(119, CDB·c[12] ÷ 100) | [C] (12 / 45) |
| 6 `fast` | AddStat(67, clamp(2048 ÷ Velocity − 128, 10, 100)) if `Velocity` > 0 | the same | [C] (16 / 57) |
| 9 `fire` | AddStat(48, c[28+d]·DM ÷ 100); AddStat(49, c[31+d]·DM ÷ 100); then the `resist` part | stats 48, 49 with `c[16+d]`, `c[19+d]`; no `resist` part | [C] (12 / 35) |
| 17 `lightning` | the same into 50, 51; `resist` part | 50, 51 | [C] (26 / 60) |
| 18 `cold` | the same into 54, 55, and AddStat(56, 5·ℓ + 100); `resist` part | 54, 55, 56 | [C] (30 / 71) |
| 23 `poisonhit` | the same into 57, 58, and AddStat(59, (5·ℓ + 150)·2); `resist` part | 57, 58, 59 | [I] (not met) |
| 25 `manahit` | the same into 62, 63, each value × 256; `resist` part | 62, 63 (× 256) | [C] (30 / 62) |
| 8 `resist`, 27 `spectralhit`, 28 `stoneskin` | § G4 | nothing | [C] (37 / 85, 17 / 39, 28 / 31) |
| 30 `aura` | aura skill and level from `lvl` ([special § C3](../special/#c-mod-handlers); classic level § D3) | nothing | [C] (30 / 75) |
| 26 `teleport` | adds a skill at level 1 and sets its mode; no stat | nothing | [C] (21 / 49) |
| 1 `rndname` | the name seed; no stat | nothing | [C] (198 / 266) |
| 41 `always_run_ai` | AI event 7 at frame `game+0xA8` + 75; no stat | the same | [I] (not met) |

Every other row has no server handler. The counts are the run's handler calls with flag 1 / flag 0. [C] The × 256 of `manahit` is on top of the build's own shift, so such a boss takes `256·v` mana: [combat/delivery B4](../../spec-combat/delivery/#b-delivery-combat_applydamage). [I] (row 13)

```
G1. MonHpAddPct(unit, pct: i32):                                 [C]
      h: i32 ← GetMaxHp(unit)                                    ; stat 7, HP × 256
      if h > 0x100000:                     q ← (h ÷ 100) × pct   ; truncates before multiplying
      else if pct > 0x10000 and pct ≥ 1600: q ← (pct ÷ 100) × h  ; [I] not reached
      else if pct > 0x10000:               q ← (i64) h × pct ÷ 100   ; [I] not reached
      else:                                q ← (h × pct) ÷ 100
      SetStat(7, h + q)                                          ; runs the stat callback (§ E)
      SetStat(6, h + q)

G2. Enchant base:                                                [C]
      ℓ: i32 ← clamp(lvl, 1, nMonLvl − 1)                        ; lvl < 2 → 1
      DM: i32 ← MonLvl[ℓ].DM(L, d)                               ; d = min(game+0x6D, 2)

G3. Champion velocity, by the mod id (only when Velocity > 0):   [C]
      36 ghostly: nothing;  37 fanatic: clamp(2048 ÷ Velocity − 128, 10, 100);  16, 38: + 20
```

Step notes:

G1. A monster whose HP exceeds 4 096 (`h` > `0x100000`) takes the first branch, which truncates `h` to a multiple of
100 before multiplying. The worked examples below take this branch. The handlers stack: a `possessed` champion gets
`c[4+d]` from `hpmultiply`, then + 100 % of the result. [C]
`hpmultiply` tests the champion flag through `MonTypeFlag(unit, 4)`: 92 flag-1 calls on champions take
`c[4+d]` and 106 on uniques and superuniques `c[7+d]`. [C] It does nothing when
`game+0x6D` ≥ 3, which single player never holds (`MonPlayerBonus` writes 2 over a larger value first). [I]


G2. Every enchant handler also uses this `ℓ` for the cold and poison lengths. In a classic nightmare or hell game `lvl`
is the rewritten `Level + 25·d` (+ 3 after `leveladd`), not the level that chose the stats row (§ D2). [C]


G3.

G4. **`resist`, `spectralhit`, `stoneskin` and the enchant `resist` part** (`UModResist`, the mod id in
`EDX`, flag 1 only):

```
G4. UModResist(unit, mod):                                       [C]
      if mod = 28: SetStat(31, stat31 × 2)                       ; stoneskin, before the immunity count
      k: i32 ← number of stats 39, 41, 43, 45, 36, 37 that are ≥ 100
      if k ≥ 2: return
      case mod:
        8 resist:        for s in (43 cold, 39 fire, 41 lightning):
                           if stat s < 100: stat s ← stat s + 40; if stat s ≥ 100: k ← k + 1
                           if k = 2: stop
        9 / 18 / 17 / 23: stat 39 / 43 / 41 / 45 ← + 75          ; fire / cold / lightning / poison, no cap
        25 manahit:      stat 37 ← + 20
        27 spectralhit:  for s in (43 cold, 39 fire, 41 lightning):
                           if stat s < 75: stat s ← stat s + 20, with the same k rule
        28 stoneskin:    stat 36 ← + 50
```

Every write is a `SetStat` of `old + delta`. [C] Spectral Hit adds **20**, not the 40. The run's 17 `spectralhit` uniques show it, for example class 58 going from 40/165/40 to 60/165/60 cold/fire/lightning. [C] The `poisonhit` row (23) is [I] (not met).

G5. **`willowisp1` halving.** For a class whose base class is 118 (`willowisp1`: Gloams, Burning Souls, Black Souls) the damage-% bonus (stat 25) of `champion`, `berserk` and `strong` is halved. It was not met. [I] The halving is a signed `q ÷ 2`, truncating toward zero, of the stat-25 value already divided by 100 (`q = CDB·c ÷ 100`), not `q >> 1`. Stat 119 (to-hit) is not halved. With stock values `q` ≥ 0, where the two forms agree. [I] (champion, berserk, strong)

G6. **The berserker level is + 3.** made 12 champion-mod picks in the expansion and none drew `berserk`; a forced-path run (MonUMod edited) met 33 berserkers in 33 packs. The run backs no frequency (the edit makes `berserk` the only weighted champion mod and sets the champion chance to 100).

G7. **`UniqueDamageBonus` is never read.** A full trace of every `DifficultyRec` call site and every reference to
`g_pDifficultyLevels` finds no read of `+0x30`. The unique `strong` bonus reads `ChampionDamageBonus`. The two
damage-bonus columns are equal in stock data, so play cannot tell them apart. [I]


**`HireableBossDamagePercent` (`+0x38`) has a reader**, outside monster creation: `COMBAT_DamagePercent` reads it from the difficulty record its caller keeps, and when the attacker is a hireling and the defender a boss it is the percentage the hit's damage is scaled by ([combat/reductions § A](../../spec-combat/reductions/#a-combat_applyreductions); correction). The mercenary hitting Andariel reproduced 50 in Normal and 35 in Nightmare. [C] Hell's 25 reproduced in 33 events, which tells this column from `MonsterCEDamagePercent` (20 in Hell). [C]

### H. To-hit and damage at attack time (reference only)

```
H1. MonAttackStats(unit, mode), at each attack:                  [I]
      lvl ← stat 12 now
      out ← MonLvlStats(class, L, d, lvl, mask 0x10 (mode 5) | 0x20 (modes 7, 8) | 0x08 (others))   ; MonLvl TH, DM × A1/A2/S1 cells ÷ 100
      add the skill-damage pair
      if classic and d > 0 and Align ≠ 1: damage × 10/12, to-hit × 10/15
      if expansion: b ← (d = 0 or n < 2) ? 0 : (n < 9 ? 8·(n − 1) : 8n − 16), n = stat 100; each value += value·b ÷ 128
      clear the list, then write stats 21, 22, 19 to it
      for each El<e> whose mode matches: apply if El<e>Pct ≥ 100 or Range(unit.seed, 100) < El<e>Pct   ; draw; type 10 also Range(unit.seed, 5)
        ; MonLvlStats mask 0x40 + e: El2 and El3 take El1's minimum, maximum and length
```

H1. To-hit, damage and elemental damage are not creation stats. They are out of the creation model; the expansion
damage bonus is + 6.25 % per player beyond the first, in nightmare and hell only. [I]

H1. A summon's full list adds its other lists to the same stats: the offset at its first call holds over its 5 693 later calls. [C]

H1. The rest of H1 is the code reading: the `L` columns (the plain ones gave the same values in every call), the classic factors and the expansion bonus (`b` = 0 in every call: normal and nightmare, one player), type 10's redraw; the list cleared before the writes, so a stat the call does not write reads 0 afterwards; and `El2`/`El3` taking `El1`'s bounds through the mask `0x40 + e` (no logged call applied one). [I]

H1. **The skill-damage pair, for class 419 at one level.** The 2 218 calls of the Raven class 419 that have a stat list
carry the pair of skill 221 at level 20, the logged level of the sessions' one player, who cast them: the block is
(21, 23, 385). Of 101 units' first calls with a list, 101 match: no stat 21 or 22 before, afterwards 21 = 21, 22 = 23,
and 19 raised by exactly 385 from the 1 123 the other lists hold. Level 19, level 21, the summon's level 104, level 0
and no pair each fail all 101. The other 2 117 calls leave the full stats unchanged and show only that the write
repeats. The seed does not step in any of the class's 2 320 calls. [C]

H1. **What those calls do not separate** stays the code reading: that the unit read is the owner (one player in the
sessions), the clamp in `SkillLevelClamped`, the bands (all 1 in this row), the `sar 8` (`HitShift` 8 cancels it with no
remainder), the pair's place before the classic and player-count adjustments (`d` and `b` are 0 here, and the MonLvl
terms 0), the modes (0, 1, 2, 4, whose columns give 0 here), the Kick, SrcDam, DmgSymPerCalc and ToHitCalc branches, and the other three `SkillDamage` classes 420, 421
and 428. [I] The statement itself is [skills/dispatch § M](../../spec-skills/dispatch/#m-monster-skill-use).

H1.

H1. **`noRatio` elemental damage is 0 at attack time.** For a `noRatio` class `MonLvlStats` writes the raw
`El<e>MinD/MaxD` to its output `+0x24`/`+0x28`, but `MonAttackStats` reads the elemental min and max at `+0x2C`/`+0x30`,
which only ratio classes fill; such a monster's `El` attack sets min = max = 0 and only the duration. [I]


H1. The attack that uses these stats (to-hit, the damage build, the defender's reductions and delivery) is specified
in [combat](../../spec-combat/overview/); a reimplementation takes the stats of H1 as that spec's inputs. [I]


### Draw order on the unit seed

```mermaid
sequenceDiagram
  participant G as game seed
  participant U as unit seed
  participant S as MonStatsInit
  participant M as SpecialModsApply
  G->>U: SUnitCreate: Init(step(game).low)
  S->>U: appearance: 1 RangeB, or 1 step per component
  S->>U: doomknight Range(4) (311, 312)
  S->>U: HP RangeB(hi - lo + 1)
  S->>U: MonProp: chance step if c > 0, value roll if min ≠ max
  S->>U: MonEquip: 1 step per row with a location
  M->>U: champion roll, picks, minions, rndname (monsters/special)
```

[C] All of `MonStatsInit`'s unit-seed draws come before the special-mod draws of [monsters/special](../special/)
(champion roll, picks, minion count, `rndname`). In order: the appearance pick, `Range(4)` for classes 311/312, the HP draw,
the MonProp draws per slot (the `chance` step, then the value roll), then the MonEquip steps. Phase 2 predicts each of
them and compares the unit seed after each. The stat handlers of § G make no draw. [C]


## Outputs

- The base stat list of the monster at the end of creation: 6, 7, 12, 13, 20, 31, 36, 37, 39, 41, 43, 45, 67, 68,
  69, 74, 100, 352 (those with a non-zero value), then the mod handlers' changes to 6, 7, 12, 13, 16, 25, 31, 36–45,
  48–63, 67, 74, 119. [C]
- The MonProp stat list (flags `0x40`) attached to the unit's list. [C]
- The skills set at creation with their levels (B10). [C]
- The unit seed, advanced by exactly the draws of § B and § F (and MonEquip's, B12). [C]
- Downstream: [items/tc](../../spec-items/tc/) reads stat 12 (the level) when the monster drops, and the TC player-count model
  reads the player count separately. `hirelings` reuses MonStats rows through Hireling.txt.

## Worked example

Every value is from the logs, expansion hell at `/players 8`, single player (`L` = 1). The HP draws were re-derived from the logged seeds with the rng step and match the log. Seeds are `low:high` in hex. Table cells are those of the hell columns (`(H)`), quoted only as needed.

### Example 1: a normal monster (`skeleton6`, class 648, Glacial Trail)

| Step | Computation | Result |
|---|---|---|
| entry | unit seed `7a3698cc:0000029a`; region entry with 3 variant sets | — |
| B2 | `RangeB(3)`: one step | seed `67be5796:32f9669b` |
| B4 | `n` = 8: hpPct 350, xpPct 350, skillBonus 7 | stat 100 = 8 |
| B5 | level 83; `ResDm..ResPo` 33, 70, 50, 100, 25, 105; `ToBlock` 30 | stats 36, 37, 39, 41, 43, 45, 20 |
| B6 | MonLvl row 83 `L-HP(H)` 5952, `L-AC(H)` 1616, `L-XP(H)` 48477; MonStats `MinHP(H)` 70, `MaxHP(H)` 100, `AC(H)` 100, `Exp(H)` 85 | lo = 5952·70 ÷ 100 = **4166**, hi = **5952**, ac **1616**, exp 48477·85 ÷ 100 = **41205** |
| B7 | `RangeB(1787)`: step → `f3bb2d09:2b454826`, `0xF3BB2D09 mod 1787` = 694 | base = 4166 + 694 = **4860** |
| B8 | hp = 4860 + 4860·350 ÷ 100 = 4860 + 17010 | **21870**; stats 7, 6 = 21870 << 8 = **5598720** |
| B8 | exp = 41205 + 41205·350 ÷ 100 = 41205 + 144217 | stat 13 = **185422** |
| B8 | `DamageRegen` 2: (5598720 × 2) >> 12 | stat 74 = **2733** |
| B9–B12 | expansion: no classic adjustment; no MonProp, no MonEquip | unit seed at exit `f3bb2d09:2b454826` (2 steps) |

With the plain MonLvl columns (`L` = 0) the same class would get lo/hi/ac 3124/4464/1374, so this creation tells the two
sets apart. [C]

### Example 2: a champion (`sk_archer7`, class 576, Frozen Tundra), mod `possessed`

Creation (level 81, the area's `MonLvl3Ex`):

| Step | Computation | Result |
|---|---|---|
| entry, B2 | `ec285a98:0000029a`; `RangeB(3)` | `6f933992:627fe245` |
| B6 | MonLvl row 81 `L-HP(H)` 5722, `L-AC(H)` 1581, `L-XP(H)` 45759; MonStats 70, 100, 100, 95 | lo 4005, hi 5722, ac 1581, exp 43471 |
| B7 | `RangeB(1718)`: step → `0a194f9f:2e8980ce`, result 65 | base 4070 |
| B8 | hp = 4070 + 14245 = 18315; exp = 43471 + 152148 | stats 7, 6 = **4688640**; 13 = **195619**; 74 = (4688640·2) >> 12 = **2289** |

Its champion roll and the champion pick (mod 38) are [monsters/special § A](../special/#a-champion-or-unique); flags `0x0D`
(champion). Then the handler pass, with flag 1 only (a champion gets no flag-0 calls):

| Handler | Computation | Stats after |
|---|---|---|
| 1 `rndname` | name seed only | unchanged |
| 2 `hpmultiply`, champion, hell: `c[6]` = 100 | h = 4688640 > `0x100000`: q = (4688640 ÷ 100)·100 = 4688600 | 7, 6 = **9377240**; the callback recomputed 74, then SetStat(74, 0) |
| 4 `leveladd` | 81 + 3; 195619 × 5 | 12 = **84**; 13 = **978095** |
| 38 `possessed` | `MonHpAddPct(100)`: q = (9377240 ÷ 100)·100 = 9377200 | 7, 6 = **18754440** |
| | callback: ((18754440 >> 8)·2) >> 4 = (73259·2) >> 4 | 74 = **9157** |
| | champion part: 84 − 1; 978095 − 2·(978095 ÷ 5) = 978095 − 391238 | 12 = **83**; 13 = **586857** |
| | AddStat(25, 66·100 ÷ 100); AddStat(119, 66·75 ÷ 100); velocity + 20 | 25 = **66**; 119 = **49**; 67 = 75 + 20 = **95**; flags `0x2D` |

[C]

### Example 3: a unique (`slinger9`, class 612, Arreat Plateau) and one minion, mods `stoneskin`, `manahit`, `fast`

Creation of the boss (level 81):

| Step | Computation | Result |
|---|---|---|
| entry, B2 | `b5734b1d:0000029a`; `RangeB(3)` | `96671feb:4bae7ae2` |
| B5 | `ResDm` 25, `ResMa` blank (0), `ResFi`/`ResLi`/`ResCo` 50, `ResPo` 100; `ToBlock` 19 | stat 37 is 0 and not in the list |
| B6 | MonLvl row 81 (as above); MonStats `MinHP(H)` 55, `MaxHP(H)` 85, `AC(H)` 95, `Exp(H)` 80 | lo 3147, hi 4863, ac 1501, exp 36607 |
| B7 | `RangeB(1717)`: step → `08c03ab9:3ebb5c08`, result 154 | base 3301 |
| B8 | hp = 3301 + 11553 = 14854; exp = 36607 + 128124 | 7, 6 = **3802624**; 13 = **164731**; 74 = **1856** |

Handlers on the boss (flag 1, flags `0x09`):

| Handler | Computation | Stats after |
|---|---|---|
| 2 `hpmultiply`, unique, hell: `c[9]` = 100 | q = (3802624 ÷ 100)·100 = 3802600 | 7, 6 = **7605224**; 74 removed (0) |
| 4 `leveladd` | 81 + 3; 164731 × 5 | 12 = **84**; 13 = **823655** |
| 28 `stoneskin` | stat 31 × 2; `k` = 1 (poison 100) < 2, so damage resist + 50 | 31 = **3002**; 36 = 25 + 50 = **75** |
| 25 `manahit` | ℓ = 84, `DM` = MonLvl row 84 `L-DM(H)` 94; min `c[30]` = 66: 66·94 ÷ 100 = 62; max `c[33]` = 100: 94; × 256 | 62 = **15872**; 63 = **24064** |
| | `resist` part: `k` = 1, magic + 20 | 37 = **20** |
| 6 `fast` | `Velocity` 12: 2048 ÷ 12 − 128 = 170 − 128 = 42, inside 10..100 | 67 = 75 + 42 = **117** |

One of its three minions, the same class created with `RangeB(1717)` = 411: base 3558, hp 16011, stats 7, 6 = 4098816,
74 = 2001. The flag-0 calls on it:

| Handler | Computation | Stats after |
|---|---|---|
| 2 `hpmultiply`, minion, hell: `c[3]` = 50 | q = (4098816 ÷ 100)·50 = 2049400 | 7, 6 = **6148216**; callback: 74 = ((6148216 >> 8)·2) >> 4 = **3002**, kept |
| 4 `leveladd` | the same as flag 1 | 12 = 84; 13 = 823655 |
| 28 `stoneskin` | nothing with flag 0 | unchanged (31 = 1501, 36 = 25) |
| 25 `manahit` | `c[18]` = 33: 33·94 ÷ 100 = 31; `c[21]` = 50: 47; × 256; no `resist` part | 62 = **7936**; 63 = **12032**; 37 stays 0 |
| 6 `fast` | the same as flag 1 | 67 = **117** |

[C]

## Reimplementation notes

- **Draw the HP range with `RangeB(hi − lo + 1)`, also when `hi = lo`.** That is one step with result 0. Only a reversed
  range makes no step. [C] for the draw and, by composition, for the reversed range (step
  note B7). [C]
- **Single player reads the `L-` MonLvl columns.** Do not "correct" this to the plain columns: 3 954 creations of the run
  show it. [C]
- **The player count is frozen at creation.** Changing `/players` changes nothing on live monsters, and stat 100 keeps the
  creation count for later readers. [C]
- **`MonHpAddPct` truncates before it multiplies** once max HP × 256 exceeds `0x100000` (HP > 4 096), which is every hell
  special of the examples. [C]
- **Two hpregen formulas.** Creation uses `((hp << 8)·r) >> 12`; the stat callback uses `((new >> 8)·r) >> 4`, which
  truncates the HP first. They can differ by one, and a group member keeps the callback's value. [C]

- **Stat 6 follows stat 7 through the callback**, also in the classic halving, where no code writes stat 6 directly. [C]
- **Classic nightmare and hell use two levels.** The MonLvl row of the base stats comes from `Level(N)`/`Level(H)`; the level
  stat, and with it the enchant `DM` row, `leveladd` and the aura level, comes from `Level + 25·d`. [C]

- **Mod order matters.** The `resist` count `k` is taken when each handler runs, so an earlier enchant's + 75 can block a
  later one. `stoneskin` doubles defence before it tests `k`. [C]
- **Spectral Hit is + 20**, and a unique's `strong` uses `ChampionDamageBonus`. 1.14d differs here from the community
  pages; keep the code's values. [C] for Spectral Hit; [I] for the unread `UniqueDamageBonus`

- **`MonPlayerBonus` writes the game's difficulty byte** to 2 when it is ≥ 3. [I]
- **A champion-pack member is not a group member** of its leader: it runs its own flag-1 pass and gets the champion HP
  %, not the minion one. [C]

## Evidence

- The *Out of scope* line under *Inputs and oracles* is the architect's ruling.
- Tables: MonStats,
  MonLvl, MonProp,
  DifficultyLevels, MonUMod,
  ItemStatCost.
- Upstream: rng, rng/seeds, [monsters/pool](../pool/), monsters/spawn,
  [monsters/special](../special/), [items/properties](../../spec-items/properties/).
