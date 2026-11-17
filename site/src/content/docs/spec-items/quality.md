---
title: "The drop quality roll: from a picked item to a quality code"
sidebar:
  order: 2
---

## Purpose

When the treasure-class resolver lands on an item that is not a unique or set entry and has no forced
quality, it calls the drop quality roll. The roll reads the item's base record and type, one `itemratio`
row, the item level the resolver passes, four ratio words of the TC frame and the killer's magic find, and
returns a quality code from 1 (low) to 7 (unique). It draws 0 to 6 times on the **source unit's seed**,
interleaved with the TC picks of [items/tc](../tc/). What item creation then does with the code (building
the unique, set, rare or magic item, or falling back when it cannot) is not part of this spec. Primitives
are those of rng.

```mermaid
flowchart LR
  R["TC_ResolveDrops<br/>item pick, items/tc H4"] -->|"item, ilvl, ratio words, killer"| Q["ITEMS_DropRollQuality"]
  Q -->|"0 to 6 draws"| S["src.seed"]
  Q --> MF["ITEMS_DropMagicFind<br/>killer + owner stat 80"]
  Q --> IR["ITEMRATIO_Select<br/>version 100"]
  Q -->|"quality code 1 to 7"| C["DropCreateItem<br/>item creation, out of scope"]
```

## Entry points

| When | Function | Tag |
|---|---|---|
| The resolver picks an item with no forced quality that is not a unique or set entry ([items/tc § H](../tc/#h-item-pick-and-hand-off), H4) | `TC_ResolveDrops` → `ITEMS_DropRollQuality` (call) | [C] |

- [C] The hand-off arguments are the item index, the resolver's `ilvl`, the source unit, the killer and the
  frame's ratio words; on every logged call the model consumed them as logged and returned the logged code
  and exit seed.
- [I] `TC_ResolveDrops` is the only call site of the drop roll. Item creation has a separate
  roll on the **item** seed, which returns a drop's code without drawing and is not specified here (see
  *Boundaries*).

## Inputs

### Tables

| Anchor | Used for |
|---|---|
| `ItemTypes.txt:Normal` (`+0x16`), `ItemTypes.txt:Magic` (`+0x14`), `ItemTypes.txt:Rare` (`+0x15`) of the item's own `type` | the early return to normal, the always-magic return, the rare-test gate |
| `ItemTypes.txt:Class` (`+0x21`, u8, the `playerclass` row index 0–6, blank stored as `0xFF`) | the class-specific row key (S1) |
| `Weapons.txt:level` (`+0xFD`, u8) | the item's `qlvl` |
| `Weapons.txt:unique` (`+0x129`), `Misc.txt:quest` (`+0x12A`) | the two early returns to unique |
| `Weapons.txt:type` (`+0x11E`, signed), `Weapons.txt:code` (`+0x80`), `Weapons.txt:ubercode` (`+0x88`), `Armor.txt:ultracode` (`+0x8C`) | the item's type and the uber row key (same offsets in Weapons, Armor, Misc) |
| `ItemRatio.txt:Unique` … `ItemRatio.txt:NormalDivisor` (sixteen u32 at `+0x00`–`+0x3C`), `ItemRatio.txt:Version` (`+0x40`, u16), `ItemRatio.txt:Uber` (`+0x42`, u8), `Class Specific` (`+0x43`, u8) | the six chance terms and the row key |
| `TreasureClassEx` `Magic`, `Rare`, `Set`, `Unique` (as the frame's ratio words) | the ratio reduction |

The items index is the concatenation of `weapons`, `armor` and `misc` records in that order, as in
[items/tc](../tc/). The six stock `itemratio` records, keyed (`Version`, `Uber`, `Class Specific`), with the
values the drop roll can reach (`*Min` columns: `UniqueMin` 6400, `RareMin` 3200, `SetMin` 5600,
`MagicMin` 192 in every row):

| Record | Key | `Unique`/div | `Set`/div | `Rare`/div | `Magic`/div | `HiQuality`/div | `Normal`/div |
|---|---|---|---|---|---|---|---|
| 0 | (0,0,0) | 400/2 | 125/6 | 160/3 | 30/16 | 12/16 | 4/8 |
| 1 | (0,1,0) | 240/2 | 96/6 | 96/3 | 3/100 | 4/16 | 1/8 |
| 2 | (1,0,0) | 400/1 | 160/2 | 100/2 | 34/3 | 12/8 | 2/2 |
| 3 | (1,1,0) | 400/1 | 160/2 | 100/2 | 34/3 | 12/8 | **1/1** |
| 4 | (1,0,1) | 240/3 | 120/3 | 80/3 | 17/6 | 9/8 | 2/2 |
| 5 | (1,1,1) | 240/3 | 120/3 | 80/3 | 17/6 | 9/8 | **1/1** |

- [C] The values are the decoded `.bin` records, which match the `.txt` cell for cell. (`ItemRatio.txt:Normal`,
  `ItemRatio.txt:UniqueMin`)
- [C] The drop roll reaches records 2–5 only, the `Version` 1 rows, in expansion and classic games alike:
  every logged row is one of them (records 2 ×324, 3 ×86, 4 ×32, 5 ×11 over the 453 rolls of the three runs
  that reach a test).


### Runtime state

| State | Type | Source |
|---|---|---|
| `item` | i32, index into the items index | EAX at entry |
| `ilvl` | i32, signed | ECX at entry: the resolver's item level |
| `src.seed` | `Seed` at `Unit+0x20` of the source unit; **every draw of the roll steps it** | stack argument `src` |
| `killer` | the unit credited with the kill, or none | stack argument |
| `ratio[0..3]` | u16 each: `[0]` Magic, `[1]` Rare, `[2]` Set, `[3]` Unique (the frame's first four words) | stack argument, a pointer into the TC frame |
| `game.difficulty` | u8 at `Game+0x6D` | passed to `ITEMRATIO_Select`, which does not read it |
| killer type | u32 at `Unit+0x00` (`0` player, `1` monster) |  |
| stat 80 (`item_magicbonus`), layer 0 | i32, the unit's stat value including equipped items | — |
| itemratio array | `g_pItemRatio`, `g_nItemRatio` records of 0x44 bytes | `g_pItemRatio`, `g_nItemRatio` |

### Constants

| Name | Value | Tag |
| --- | --- | --- |
| `RATIO_VERSION` | 100, pushed as a constant whatever the game's expansion flag | [C] |
| `WIN` | a draw `< 128` wins a test | [C] |
| `RATIO_SCALE` | 1024 (the ratio word is out of 1024) | [C] |
| `K_UNIQUE`, `K_SET`, `K_RARE` | 250, 500, 600 (magic-find diminishing factors) | [C] |
| `MF_LINEAR_MAX` | `mf + 100 ≤ 110`, i.e. `mf ≤ 10`, is applied linearly | [C] |
| `MF_BYPASS` | `mf ≤ −100` skips the unique, set, rare and magic tests | [I] |
| `ERR_NO_RATIO_ROW` | fatal error `0xE8D` when no `itemratio` row matches | [I] |
| `ERR_BAD_VERSION` | fatal error `0x61D` in `ITEMRATIO_Select` for a version argument other than 0 or 100 | [I] |
| `MAGIC_STAT` | stat 80, `item_magicbonus`, layer 0 | [C] |

## Algorithm

The roll is one function with three helpers. Section A is the early exit ladder, B the row, C the magic
find, D the four affix-quality tests, E the superior/normal/low split. All arithmetic is signed 32-bit
(`i32`, `imul`) unless a step says otherwise, `÷` truncates toward zero (`cdq; idiv`), and `<< 7` is the ×128.
[I]

### Test order

```mermaid
flowchart TD
  A0{"record or type missing"} -->|yes| R0(("0"))
  A0 -->|no| A1{"type Normal"}
  A1 -->|yes| N2(("2"))
  A1 -->|no| A2{"item unique flag,<br/>or Magic type and quest"}
  A2 -->|yes| U7(("7"))
  A2 -->|no| B["B: itemratio row"]
  B --> C1{"mf ≤ −100"}
  C1 -->|yes| SUP
  C1 -->|no| UT["D unique test"]
  UT -->|win| U7
  UT --> ST["D set test"]
  ST -->|win| S5(("5"))
  ST --> RG{"type Rare"}
  RG -->|yes| RT["D rare test"]
  RT -->|win| R6(("6"))
  RG -->|no| MG
  RT --> MG{"type Magic"}
  MG -->|yes| M4(("4"))
  MG -->|no| MT["D magic test"]
  MT -->|win| M4
  MT --> SUP["E superior test"]
  SUP -->|win| H3(("3"))
  SUP --> NT["E normal test"]
  NT -->|win| N2
  NT -->|lose| L1(("1"))
```

### A. Early returns (no draw, no row)

```
A1. rec ← Items[item]; if rec = none: return 0                              [I]
A2. t: i32 ← rec.type                                                       [I]
    if t < 0 or t ≥ nItemTypes: return 0
    ty ← ItemTypes[t]
A3. if ty.Normal ≠ 0: return 2                                              [C]
A4. if rec.unique ≠ 0: return 7                                             [I]
A5. if ty.Magic ≠ 0 and rec.quest ≠ 0: return 7                             [I]
```

Step notes:

- A2–A5. Each test reads the item's own `type` only: not `type2`, not the `Equiv` chain. [I]

- A3. 853 logged rolls of `Normal`-type items (gold, potions, gems, runes, keys, scrolls, books, quivers and
  others; 31 stock types) returned 2 with `src.seed` unchanged and no row selected. [C]
- A4–A5. With stock data, `unique` is set on 18 base items (quest items such as `hst`, `msf`, `bks`, `bkd`,
  `ass`, `std`), and the `Magic`-type-plus-`quest` rule hits only `vip` (an `amul`).
  Neither return was taken in any logged roll. [I]

### B. The itemratio row — `ITEMRATIO_Select`

```mermaid
flowchart LR
  it["item"] --> cls["cls = own type has Class < 7"]
  it --> ub["uber = weap or armo,<br/>ubercode or ultracode = code,<br/>not tpot, not quest"]
  cls --> sel["keep rows with ClassSpecific = cls,<br/>Uber = uber, Version ≤ 100"]
  ub --> sel
  sel --> best["highest Version,<br/>later row on a tie"]
  best --> row["records 2 to 5"]
```

```
B1. row ← ITEMRATIO_Select(item, game.difficulty, 100)                      [C]
B2. if row = none: fatal error 0xE8D                                        [I]

ITEMRATIO_Select(item, diff, version: u16):                                 [I] (ITEMRATIO_Select, all of S1–S4)
S1. cls: u8 ← 1 if ItemTypes[rec.type].Class < 7 else 0                     ; Class: u8 playerclass row index, blank 0xFF; rec.type: signed, bounds-checked, else 0
S2. uber: u8 ← 1 if (IsType(item, weap) or IsType(item, armo))
                   and (rec.ubercode = rec.code or rec.ultracode = rec.code)  ; 4-byte words
                   and rec.type ≠ tpot and rec.quest = 0
              else 0
S3. if version ∉ {0, 100}: fatal error 0x61D
    best ← none; bestVer: i32 ← −1
    for i in 0 ..< nItemRatio:
      r ← ItemRatio[i]
      if r.ClassSpecific = cls and r.Uber = uber and r.Version ≤ version and r.Version ≥ bestVer:
        best ← i; bestVer ← r.Version
S4. return best                                                              ; diff is never read
```

Step notes:

- B1. **Classic drops use the `Version` 1 rows too.** The roll pushes 100 with no read of the game's
  expansion flag, so a classic drop takes the same row as an expansion drop. In a classic Normal game every
  logged row was record 2 or 3, all 229 rolls reproduce with them, and the `Version` 0 rows break 29 of the 52
  rolls that reach a test. [C]
- B1. **Both keys decide rows.** Over 1113 rolls, forcing the uber key to 0 breaks 7 and to 1 breaks 13, and
  forcing the class key to 0 breaks 10. [C]
- S1. **The `Class` byte is the `playerclass` row index**: 0 `ama`, 1 `sor`, 2 `nec`, 3 `pal`, 4 `bar`, 5 `dru`,
  6 `ass`; the `Expansion` marker row of `PlayerClass.txt` takes no index. [C] It is the numbering
  of a player unit's class word, which the class-specific readers compare it with. [I]
- S1. **`Class` is an unsigned byte (u8), so a blank `Class` (stored `0xFF`) is not `< 7`** and gives `cls` 0; only the
  seven class values 0–6 give 1. "Signed, bounds-checked, else 0" is the test of `rec.type` (as in A2: a `type` < 0 or
  ≥ the number of itemtypes records gives 0), not of `Class`; the compare is `cmp byte [rec + 0x21], 7` then `sbb`/`neg`,
  a carry (unsigned below) test. [I] for the reading;
  [C] for the outcome: the model with this test reproduces the logged row of all 1607 rolls of the S2a set, records 2,
  3, 4 and 5 each in the three difficulties, where a blank `Class` read as a value below 7 would send every
  classless base to record 4 or 5. (quality 13)
- S2. `IsType` is the item-type test of [items/tc § K](../tc/#k-the-item-type-test--items_istype-and-items_unitistype)
  (`weap` is itemtypes record 45, `armo` 50, `tpot` 38): it walks the `Equiv1`/`Equiv2` closure of both the item's
  `type` and its `type2`, unlike A2–A5, which read the own `type` only, and S1, which reads the own type's `Class`. So
  "uber" means an exceptional or elite base. [I]
- S3. `≥` on the version makes the later row win a tie; stock data has one row per key and version, so no
  tie occurs. No match cannot happen with stock data: every (uber, class) pair has a `Version` 1 row. [I]

- S3. The `Version` 0 rows (records 0 and 1) are reachable only with the argument 0, which only the
  creation-side roll passes. [I]

### C. Shared terms and magic find

```
C1. d: i32 ← ilvl − rec.level                                               [C]
C2. mf: i32 ← DropMagicFind(killer)                                         [C]
C3. useMF: bool ← false
    if mf ≠ 0:
      if mf ≤ −100: go to E1                                                 [I]
      useMF ← true
    m100: i32 ← mf + 100

DropMagicFind(killer) → i32:
M1. if killer = none or (u32) killer.type > 1: return 0                     [I]
M2. mf ← GetStat(killer, 80, layer 0)                                       [C]
M3. owner ← MonsterOwner(killer)                                            [C]
    if owner ≠ none: mf ← mf + GetStat(owner, 80, layer 0)
M4. return mf

Diminish(m100: i32, k: i32) → i32:                                          [C]
K1. if m100 ≤ 110: return m100                                              ; mf ≤ 10: linear
K2. return (m100 − 100) × k ÷ (m100 − 100 + k) + 100                        ; i32 imul, cdq/idiv
```

Step notes:

- C1. `d` is signed and may be negative (an item whose `qlvl` is above `ilvl`). `rec.level` is a u8. [I]

- C1. So for every chest, urn, barrel or casket drop `d` is the tier minus the base's `level`: strongly negative for
  most bases, which makes the `− d ÷ div` term of D4 non-negative and every `c` at least as large (odds no better) as
  for a monster drop of the same base at the area's level. This follows from C1 and D4; no run compares the two. [I]

- M2. For a player killer, stat 80 is the sum of its equipped items' `item_magicbonus` (MF 100 from two items
, 10 from one item, 0 for the earlier characters), and
  nothing else is added for a player. Each session reproduces at its save's MF and at no other value of the
  scanned range (−150…400 and −20…100). [C]
- M3. **A summon kill counts its owner's magic find.** For 85 kills by Raise Skeleton skeletons (monster class
  363, stat 80 = 0) `MonsterOwner` returned the Necromancer and the roll used 0 + 10; dropping the owner's 10
  breaks 27 of them. [C]
- M3. **A mercenary's kill counts its own plus its owner's magic find.** `MERC_Init` sets a hired or loaded
  mercenary's owner to its player (`MonSetOwner`, the `monsterData+0x28` block `MonsterOwner` reads).
  Three kills by a mercenary read its stat 80 (0) and its owner's (40, the player's full stat list with an item's
  bonus): total 40. [C]

- M3. **A monster killer owned by a player adds that player's stat 80.** In 130 rolls the killer was a monster whose
  owner was the player, and the roll's magic find was the killer's plus the owner's in every one: Raise Skeleton
  skeletons (class 363, 85 rolls), a Rogue hireling (class 271, 39) and a Hydra (class 352, 6). [C]

- M3. For a player, `MonsterOwner` returns none. For a monster killer the owner is the unit that its AI block
  (`monsterData+0x28`) names by game, id and type (`+0x28`, `+0x2C`, `+0x30`); a block with no game, or a unit no
  longer in the game, gives none. A killer that is neither a player nor a monster (an object, a missile) gives 0. These
  cases, and plain or minion monster killers, are read from the code: in the 8 753 rolls of the check every killer is
  a player, a monster or none. [I]

- M3. **Monster minions have an owner: their leader.** `UniqueMinions` sets each minion's owner to its unique boss
  and adds it to the boss's member list; a superunique's minions take the same path (`SuperUniqueSpawn` →
  `SpecialModsApply` → `UniqueMinions`); MonStats party minions of a `SetBoss` leader are linked to it through the same
  pair (§ MonStats minions). `SpecialMonPlace` sets a
  placed boss as its own owner, and a monster spawned for another unit (`SpawnOwnedMonster`) gets that unit. So a
  minion's kill adds its leader's stat 80, and a placed boss's kill its own stat 80 a second time, while the leader is
  still in the game. Whether any stock monster carries stat 80 is not checked. [I]
- M3. **The other monster owners.** `MonSetOwner` has 26 call sites; of the other 17, fourteen give these kinds an owner, so a
  kill by one of them also adds its owner's stat 80 while the owner is in the game. [I]

  - a boss's escorts (the boss), and tentacles (the monster that spawns them);
  - formation members (their leader; a formation leader owns itself, as a placed boss does); `FormationSpawn`'s case 5
    would give its unit the unit passed to it, but no caller reaches it (M3 notes);
  - Baal's clone, class 570 (Baal);
  - the Bone Wall and Bone Prison pieces (the caster; the later prison pieces the first one), a monster revived with
    `Revive` (the caster) or raised by the item property `reanimate` (the killer's owning player, M3 notes), and a
    monster a missile spawns (the missile's owner);
  - a restored inactive monster (its saved owner).

  The remaining three of the 17 only clear the link (owner id −1): an old mercenary replaced at resurrection, and the members and
  the dying monster of a `partydead` group.
- M3. **The `reanimate` raise.** is `STATEVENT_Reanimate`, entry 31 of the item-stat event table that
  ItemStatCost `itemeventfunc` indexes; one row has 31, stat 155 `item_reanimate` with event `kill`, written by the
  property `reanimate` (stock: the unique Tomb Reaver and the runeword Faith, par 1, min = max = 10). On a kill it
  returns with no draw unless the victim is a monster that is neither champion nor unique and the killer's stat 155
  (at the property's `par` as its layer) is above 0. It then draws once on the **killer's** unit seed and raises only
  when `RangeB(killer.seed, 100) < value`; it walks the killer's owner chain up to the first player and queues event 13
  on the victim for that player with `SkillReviveDo`, which raises the monster with that player as its owner. A pet or
  hireling killer draws on its own seed and hands the raise to its owning player; with no player in the chain nothing
  is queued. Event 13's trigger is not read. [I]
- M3. **`FormationSpawn` case 5 is never reached.** The case tests its third stack argument before it spawns, and both
  callers pass 0: `FormationGroup` (reached only from `RoomPopulate`'s type-1 branch, dead code in 1.14d) and the
  `boneprison1` formation, whose descriptor has no kind-5 entry. So no unit takes its owner from case 5. [I]

- M3. **The missile that spawns a monster** is row 207 `bonewallmaker` (the one Missiles row with `pSrvDoFunc` 13, entry
  13 of the server do-function table), Bone Wall's `srvmissilea`: each server step spawns a wall piece with
  `SpawnOwnedMonster`, makes it owned by the unit the missile names, adds it to the group, appends mod 15 `partydead`
  and decrements the missile's counter. So Bone Wall builds pieces by its `srvdofunc` 60 and by this missile; which
  of the two makes the pieces a player sees is not separated. [I]
- K1–K2. At MF 100 the factors are 171 (unique), 183 (set) and 185 (rare); a linear factor of 200 in those three
  tests gets 34 of 847 rolls wrong. At MF 10 the factor is 110 in every test; the diminishing form there (109)
  breaks 24 of 574 rolls. [C]
- C3. Negative magic find from −99 to −1 makes the factor below 100, which raises every chance (worse odds).
  `mf = 0` skips the division (the same result as a factor of 100). [I]

### D. Unique, set, rare and magic tests

| Order | Test | `base`, `div`, `min` (row) | MF factor `F` | Ratio word | Win → code | Runs when |
|---|---|---|---|---|---|---|
| 1 | unique | `Unique`, `UniqueDivisor`, `UniqueMin` | `Diminish(m100, 250)` | `ratio[3]` | 7 | always |
| 2 | set | `Set`, `SetDivisor`, `SetMin` | `Diminish(m100, 500)` | `ratio[2]` | 5 | always |
| 3 | rare | `Rare`, `RareDivisor`, `RareMin` | `Diminish(m100, 600)` | `ratio[1]` | 6 | `ty.Rare ≠ 0` |
| 4 | magic | `Magic`, `MagicDivisor`, `MagicMin` | `m100` (no diminishing) | `ratio[0]` | 4 | `ty.Magic = 0` (else 4 with no test) |

- [C] The order, the columns, the factors and the ratio words above are those of every reproduced roll.

```
D1. for (test, base, div, min, F, w, code) in the table above, in order:   [C] (all of D1–D11 unless tagged)
D2.   if test = rare and ty.Rare = 0: skip this test                        [C]
D3.   if test = magic and ty.Magic ≠ 0: return 4                            [C]
D4.   c: i32 ← (row.base − d ÷ row.div) << 7
D5.   if useMF:
        f: i32 ← F
        if f ≠ 0: c ← c × 100 ÷ f                                           ; magic: no zero test (m100 ≥ 1 here)
D6.   if c ≤ row.min: c ← row.min                                           [C]
D7.   c ← c − ((i32)(u32) ratio[w] × c) ÷ 1024                              [C]
D8.   if c < 1: return code                                                  ; win, NO draw
D9.   x: u32 ← RNG.RangeB(seed: src.seed, n: c)                              ; draw#k
D10.  if x < 128: return code                                                ; unsigned compare
D11. go to E1
```

Step notes:

- D4–D7. The order is base term, magic find, minimum, ratio, then the draw: the minimum is applied **after**
  magic find and **before** the ratio, so a ratio word can still take `c` below the minimum. In the replay check of the
  clamp (7 199 rolls), moving D6 after D7 breaks 206 rolls and moving it before D5 breaks 138, while this order
  reproduces every one. [C]
- D5. `c × 100` and `÷ f` are i32 (`imul`, `cdq; idiv`), so the result truncates toward zero. [C]

- D6. The clamp is a signed compare, `c ← max(c, min)`, and it acts. In 667 replayed rolls the chance after magic
  find is at or below the row minimum (by test, rare 622, set 646 and magic 13, a roll counting once per test it clamps; the unique
  test's 6400 was reached in none), and in 138 of them the minimum decides the outcome: the model without D6 gets those 138 wrong, the model with
  it reproduces all 7 199 rolls of the check. The rolls come from the later item runs and the H2a sessions; in the first
  runs (MF 0, 10 and 100) no chance came near a minimum. [C]
- D7. The ratio word is zero-extended, the product is i32, and `÷ 1024` is a signed division done as
  `cdq; and 0x3FF; add; sar 10` (truncation toward zero). With `c ≥ min > 0` it is a floor. A ratio word of
  1024 makes `c = 0`: a win with no draw, observed on 61 rolls of magic and rare tests under
  `Act N Uitem`-style ratios in the first two runs. [C]
- D4, E1, E3. Every `d ÷ div` is a signed `cdq; idiv`: the divisor column is a u32 read as a signed i32, and
  `d` is signed, so the quotient truncates toward zero. A zero divisor faults (integer division by zero); no
  stock row has one. [I]
- D9. `RangeB` is `Range` of rng (one `Step`, then the new `low mod n`; the
  binary uses `low & (n − 1)` for a power of two, with the same result). Any `c ≤ 128` therefore wins with a
  draw. Every draw of the 1916 logged rolls reproduces. [C]
- D2. Three charm rolls (`scha`, `lcha`) skipped the rare test and went from the set test to the always-magic
  return with two draws. [C]
- D3. An always-magic type (`ring`, `amul`, `jewl`, charms and others) returns 4 after losing the unique, set
  and, if allowed, rare tests; it never reaches E. 14 + 7 + 2 logged rolls. [C]

### E. Superior, normal, low

```
E1. c: i32 ← (row.HiQuality − d ÷ row.HiQualityDivisor) << 7               [C] (all of E1–E4)
E2. if c < 1: return 3                                                      ; NO draw
    x ← RNG.RangeB(seed: src.seed, n: c)                                    ; draw#k
    if x < 128: return 3
E3. n: i32 ← (row.Normal − d ÷ row.NormalDivisor) << 7
    if n < 1: return 2                                                      ; NO draw
E4. x ← RNG.RangeB(seed: src.seed, n: n)                                    ; draw#k+1
    return 2 if x < 128 else 1
```

Step notes:

- E3. The `n < 1` win without a draw is observed on 70, 55 and 12 rolls of the three sessions. [C]
- E2. The superior `c < 1` win without a draw never happened in the runs (it needs `d ≥ 72` with records 4–5, `d ≥ 96` with 2–3). [I]

- E4. Code 1 (low) comes only from losing this draw (`cmp eax, 0x80; sbb; neg; add 1`); all logged 1s come
  through it. [C]
- E3–E4. With records 2 and 4 (`Normal` 2, `NormalDivisor` 2) low quality needs `d ≤ 1`: `d` 2–3 gives
  `n = 128` (one draw, always a win) and `d ≥ 4` gives `n ≤ 0` (normal with no draw). With records 3 and 5
  (`Normal` 1, `NormalDivisor` 1), an uber base needs `d ≤ −1` for low quality. [I]

### F. Boundaries (named only)

What item creation does with the code is owned by `items/uniques-sets`, and by `items/affixes`. The statements below fix only where this spec's output goes and what can still change it. They come.

- [I] **The creation-side quality roll runs on every drop but draws nothing there.**
  `ItemRollQualityCreate` is called first in `ItemCreateByQuality` and
  again at the start of every fallback step. On a drop the item version is non-zero and the creation record's
  quality (`rec+0x30`, this spec's code or a TC entry's 5 or 7) is set, so it returns that quality at once, with
  no draw and no row. Its drawing body (the **item** seed, `ITEMRATIO_Select` with version 0 or 100 by the item's
  version, a formula with no ×128, no magic find and no ratio words) runs only for an item of version 0 or a
  record of quality 0, which no drop produces; it belongs to the item-creation rows.

- [C] **Vendor stock and gambling never reach this roll.** Their builders choose the quality on the store seed
  (normal or superior stock, 4 for magic stock, 4–7 for a gamble slot) and pass it in the creation record; the
  creation-side roll above returns it with no draw. See vendors.md.

- [I] **Pre-switch overrides.** Before its switch, `ItemCreateByQuality` rewrites the item's
  quality by four rules, in this order, a later one overwriting an earlier: an `ItemTypes.Magic` type gets 7 for a
  quest base, else 4 unless the quality is already 4..9; an `ItemTypes.Rare` = 0 type turns 6 into 4; a base
  with the `unique` flag gets 7; an `ItemTypes.Normal` type (or a type with no record) gets 2. They apply to
  this spec's code and to a TC entry's 5 or 7 alike, and they do not write `rec+0x30`. So the code returned here
  is not always the quality the item is built with.

- [C] **Which stock bases the overrides change** (a survey of the 659 Weapons, Armor and Misc rows against ItemTypes;
  the tests read the base's own type record, with no `Equiv` walk): `Magic` = 1, 7 bases (`rin`, `amu`, `vip`, `jew`,
  `cm1`–`cm3`; `vip` is a quest base and gets 7); the `Magic` types `char`, `mboq` and `mxbq` have no base of their own,
  so no quiver is forced magic. `Rare` = 0: 153 bases of 30 types (potions, gems, runes, scrolls, books, keys, gold,
  quivers, body parts, charms, quest items). `unique` flag: 18 bases, 17 quest items and `std`. `Normal` = 1: 121 bases of
  24 types; no base has a type without a record. (`ItemTypes.txt:Magic`, `ItemTypes.txt:Rare`,
  `ItemTypes.txt:Normal`, `Weapons.txt:unique`, `Misc.txt:quest`, data survey;
  the overrides on drops are reproduced)
- [I] **Builders and fallbacks.** `ItemCreateByQuality` has one case per code (and 8, 9, which
  this roll never returns). A unique or set that cannot be built falls back 7 → 6 → 4 → 3 → 2 or 5 → 4 → 3 → 2,
  after a durability step (`ItemFallbackRare`, `ItemFallbackMagic`,
  `ItemFallbackSuperior`, `ItemFallbackNormal`). Each step writes its quality to the
  item and to `rec+0x30`, and restores the item seed to `{S, 666}`, S being the seed's low word saved just before
  the failed builder, so a failed builder's draws are discarded.


## Draw order on `src.seed`

```mermaid
sequenceDiagram
  participant R as TC_ResolveDrops
  participant Q as DropRollQuality
  participant S as src.seed
  R->>Q: item, ilvl, ratio, killer
  alt early return A1 to A5
    Note over Q: no draw, return 0, 2 or 7
  else tests
    loop unique, set, rare if allowed, magic if not always-magic
      alt c < 1
        Note over Q: win, no draw
      else
        Q->>S: RangeB(c), win on draw < 128
      end
    end
    opt all lost, or mf ≤ −100
      Q->>S: RangeB(superior c) unless c < 1
      Q->>S: RangeB(normal n) unless n < 1
    end
  end
  Q-->>R: code, src.seed advanced
```

- [C] One roll steps `src.seed` once for each test it reaches whose chance is at least 1, in the order of
  the table in D, then E: between 0 and 6 times. All seven counts appear in the logs, and the exit seed of every
  logged roll reproduces with no resync.
- [C] No other seed is touched by the roll, and the resolver's next draw continues on the same `src.seed`. reproduces whole
  resolver calls with the roll modelled and no oracle: 328 + 124 + 1269 + 944 expansion calls and 485 classic
  calls.

## Outputs

| Code | Quality | Produced by | Tag |
|---|---|---|---|
| 0 | none (no item record, or its type out of range) | A1–A2 | [I] |
| 1 | low quality | E4, lost | [C] |
| 2 | normal | A3, E3 (no draw), E4 won | [C] |
| 3 | superior | E2 | [C] |
| 4 | magic | D3, magic test won | [C] |
| 5 | set | set test won | [C] |
| 6 | rare | rare test won | [C] |
| 7 | unique | A4, A5, unique test won | [C] |

- [C] Codes 1–7 each appear in the logs (all three runs together: 1 ×24, 2 ×1660, 3 ×29, 4 ×144, 5 ×13,
  6 ×38, 7 ×8, rolled) and reproduce. Codes 5 and 7 from the tests are the same numbers the resolver passes for
  a set or unique TC entry.
- [I] The function returns no value outside 0–7; 0 and the two early 7s (A4, A5) are code-read only.

- [C] Side effect: `src.seed` advanced by the draws above, nothing else.

## Worked example

Seeds are `low:high` in hex; `x` is the draw. Each line was checked against the log's `QOUT`; the per-draw seeds were printed by stepping the same model.

**1. A classic unique on one draw** (QIN#91). Classic Normal game, player killer with MF 0. Item 350 `bsh` (qlvl 19), `ilvl` 22, ratio words `0,0,0,0`, `src.seed` on entry `98477aee:5019bac8`. [C]

| Step | Value |
|---|---|
| A3–A5 | type not `Normal`, no unique flag, no quest: no early return |
| B1 | not class-specific, not uber → record 2 (`Version` 1), logged `QROW row=2` |
| C1–C3 | `d = 22 − 19 = 3`; `mf = 0`, so no magic-find division |
| D unique | `c = (400 − 3 ÷ 1) << 7 = 50816`; above 6400; ratio 0 → `c = 50816` |
| draw#1 | `RangeB(50816)` → seed `545533ee:3f83b64d`, `x = 1414869998 mod 50816 = 110` |
| result | `110 < 128` → **7 (unique)**; exit seed `545533ee:3f83b64d` = the logged `QOUT` |

With record 0 (what a "classic games use the `Version` 0 rows" reading would take) the chance is
`(400 − 3 ÷ 2) << 7 = 51072`, the draw is 22382, the test is lost and the item ends normal: the run's
counterfactual that settles B1. [C]

**2. All six draws** (QIN#0, same run). Item 46 `bal` (qlvl 16), `ilvl` 19, `d = 3`, record 2, MF 0, `src.seed` on entry `53c85fa4:60bc0e4c`. [C]

| Draw | Test | `c` | `src.seed` after | `x` | Outcome |
|---|---|---|---|---|---|
| 1 | unique | `(400 − 3) << 7 = 50816` | `7091e780:22f1f3f5` | 33536 | lose |
| 2 | set | `(160 − 1) << 7 = 20352` | `e2711975:2ef3ba5c` | 16117 | lose |
| 3 | rare | `(100 − 1) << 7 = 12672` | `30cc2165:5e727812` | 9701 | lose |
| 4 | magic | `(34 − 1) << 7 = 4224` | `646efacb:145a5f4e` | 3147 | lose |
| 5 | superior | `(12 − 0) << 7 = 1536` | `d1d58d85:29e3da79` | 1413 | lose |
| 6 | normal | `(2 − 1) << 7 = 128` | `49b291d2:57852e6e` | 82 | win → **2 (normal)** |

The sixth draw cannot lose (`n = 128`) but is still made. `bal` is a throwable, so in this classic game the
resolver then refunds the pick ([items/tc § H](../tc/#h-item-pick-and-hand-off), H6): the six draws stay
consumed. [C]

**3. Magic find 100 with diminishing returns** (QIN#216). Expansion Nightmare, player killer with MF 100 (`m100 = 200`). Item 48 `pil` (qlvl 10), `ilvl` 49, `d = 39`, record 2, ratio words 0, `src.seed` on entry `3290d0cf:3bce9d01`. [C]

| Draw | Test | Base term | `F` | `c` | `src.seed` after | `x` | Outcome |
|---|---|---|---|---|---|---|---|
| 1 | unique | `(400 − 39) << 7 = 46208` | `100 + 100·250 ÷ 350 = 171` | 27022 | `d0cdbc4c:15172f0f` | 11932 | lose |
| 2 | set | `(160 − 19) << 7 = 18048` | `100 + 100·500 ÷ 600 = 183` | 9862 | `981bd58b:5717252b` | 817 | lose |
| 3 | rare | `(100 − 19) << 7 = 10368` | `100 + 100·600 ÷ 700 = 185` | 5604 | `c422a922:3f7181f7` | 4306 | lose |
| 4 | magic | `(34 − 13) << 7 = 2688` | `200` | 1344 | `918cc921:51ce7bc1` | 1185 | lose |
| 5 | superior | `(12 − 4) << 7 = 1024` | — | 1024 | `bdcdd226:3cb5307a` | 550 | lose |
| — | normal | `(2 − 19) << 7 = −2176` | — | −2176 | unchanged | none | `n < 1` → **2 (normal)** |

Exit seed `bdcdd226:3cb5307a`, as logged. With a linear factor of 200 in the unique test the chance is 23104,
the same first draw gives 12, and the roll would return a unique the game did not make: one of the 34 rolls
that tell the two models apart. [C]

## Reimplementation notes

- **Same seed as the TC walk.** Every draw is on the source unit's seed, interleaved with the picks; skipping
  or adding one draw shifts every later pick of the drop. [C]
- **A chance below 1 wins without a draw; a chance of 1 to 128 wins with one.** Both happen in practice
  (ratio word 1024 on the magic and rare tests; `n = 128` in the normal test). [C]
- **Magic find is linear up to 10.** 1.14d applies `F = mf + 100` for `mf ≤ 10` in all four tests and the
  `mf·k/(mf + k)` form only above that; the 1.10/1.11 community formula has no linear branch. Do not
  "correct" it. [C]
- **Classic drops use the `Version` 1 rows.** The community description of 1.10 says classic games use the
  two `Version` 0 rows; the 1.14d drop roll does not. Do not "correct" it. [C]
- **The uber key matters for drops**, through `Normal`/`NormalDivisor` only: records 3 and 5 differ from 2 and
  4 in those two columns and nowhere else. [C]
- **Superior and normal/low ignore magic find and the TC ratio words.** [C]
- **Always-magic types still run the unique, set and rare tests** (with their draws) before returning 4.
  [C]
- **Truncation, not floor, everywhere.** `d` can be negative, and `d ÷ div` then rounds toward zero (−3 ÷ 2 =
  −1). [I]
- **A zero divisor is fatal in the binary.** Every `*Divisor` is used in a signed `idiv` with no zero test, so
  a zero faults. A reimplementation must reject a zero divisor when it loads the data, or treat it as a fatal
  error at the roll; it must not substitute a value. [I]
- **The difficulty passed to `ITEMRATIO_Select` is unused.** Do not key rows by difficulty. [I]


## Evidence

- Tables: ItemRatio, ItemTypes,
  Weapons, Armor, Misc.
- Specs: rng (`Range`, `Step`), [items/tc](../tc/) (caller, ratio words, seed contract).
