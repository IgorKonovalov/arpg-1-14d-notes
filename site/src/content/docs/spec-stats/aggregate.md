---
title: "Stat aggregation: the list tree, the cache, the `op` terms, the maxima, items and set bonuses"
sidebar:
  order: 2
---

## Purpose

A unit's full stats are not summed when they are read. Every unit owns one **extended** stat list whose `+0x48`
array caches the full value of each stat; every write to any list of the unit's tree, and every link, unlink or
toggle of a list, passes its change up the parent chain and updates that cache, re-evaluating the stats an
`ItemStatCost` `op` connects. This spec gives the tree, the propagation, the evaluation with `op` 1–13, the reads,
the maxima and the rescale of the current values, which items count (requirements, ethereal, broken, dual wield,
the periodic refresh), set bonuses and passive stat lists. The states that hang lists in this tree, and the ticks
that write life, mana and stamina, are [stats/states](../states/). Overview and boundary: [stats](../overview/).

```mermaid
flowchart TD
  w["write: AddStat / SetStatEx on any list"] --> pr["Propagate(list, key, delta)"]
  l["link / unlink / toggle a list"] -->|"each active entry, ± value"| pr
  pr --> q{"stat has an op link? (+0x51 or +0x52)"}
  q -->|no| ca["CacheAdd(list, key, delta)"]
  q -->|yes| rc["StatRecompute(list, key)"]
  rc --> ev["StatEvaluate: own + children, then op terms"]
  rc --> tg["recompute and write each op target"]
  rc --> dp["write the source, walk its +0x5E dependents (unless a target took or v = 0)"]
  ca --> cb["stat callback (fCallback): rescale 6/8/10, skills, item aura, state"]
  rc --> cb
  ca --> up{"stop? list 0x2000, or damagerelated under 0x40000000"}
  rc --> up
  up -->|no| pr2["parent list: repeat"]
```

## Entry points

| When | Function | Tag |
|---|---|---|
| A list is linked under a unit | `STATLIST_LinkToUnit` | [C] |
| A list is unlinked | `STATLIST_Unlink` | [C] |
| A state's list moves between the counting and the off chain | `UNIT_ToggleStatListByState` | [C] (19 525 toggles) |
| An entry is added or set | `STATLIST_AddStat`, `STATLIST_SetStatEx` | [C] |
| The change goes up the tree | `STATLIST_Propagate` → `STATLIST_CacheAdd` | [C] |
| A full value is read | — | [C] |
| The maxima are read | `UNIT_GetMaxMana`, `UNIT_GetMaxStamina` | [C] the getters' bodies (1 500 cases) |
| An item is equipped or unequipped | `ITEMS_AttachToOwner`, `ITEMS_DetachFromOwner`; the body-to-cursor pickup: → `UNIT_UnlinkItemStatList` | [C] 5 973 item links through the attach and 5 695 unlinks through the detach; the pickup unlinks with no detach (260 of 278 unlinks). [C] (static) the other paths' direct callers: `StatListLinkOwner` 44 rel32 sites in 14 functions, `KeyConsume` 2. [I] which caller each logged link and unlink took |
| The requirement refresh | — | [C] (972 refreshes) |
| A set item is equipped or unequipped | `SETS_UpdateOnEquip` | [C] |
| A passive's list is refreshed | `SKILLS_RefreshPassive` | [C] (8 832 refreshes) |

## Inputs

### Tables

| Anchor | Used for |
|---|---|
| `ItemStatCost.txt:op`, `op param`, `op base`, `op stat1..3` | the op graph (§ E) and the terms (§ D) |
| `ItemStatCost.txt:ValShift` | the shift of an `op base` value and of the `fMin` floor |
| `ItemStatCost.txt:keepzero` | a cache entry kept at 0 (`mana`, `stamina`) |
| `ItemStatCost.txt:fMin`, `MinAccr` | the read-time floor (§ F) |
| `ItemStatCost.txt:damagerelated` | skipped under a list linked without damage (§ B, § C) |
| `ItemStatCost.txt:fCallback` | the stat callback (§ G) |
| `ItemStatCost.txt:Stat` | stat 91 `item_req_percent`, 70 `quantity`, 71 `value` (§ H, § J) |
| `CharStats.txt:LifePerVitality`, `StaminaPerVitality`, `ManaPerMagic` | op 9 and op 8 (quarter points) |
| `SetItems.txt:add` func, `aprop1a..5b` | a set item's own bonus lists (§ J) |
| `Sets.txt:PCode2a`, `FCode1` (and the other partial and full blocks) | the wearer's set list (§ J) |
| `Skills.txt:passivestate`, `passivestat1`, `passiveitype`, `aurastate` | passive lists (§ K) |

### Runtime state

| State | Type | Source |
|---|---|---|
| a unit's extended list | `StatList`, flag `0x80000000`, at the unit | — |
| own entries | `{key, value}` sorted by key at `+0x24` (`StatList+0x10` holds the flags) | every list |
| full cache | `{key, value}` at `StatList+0x48` | extended lists only |
| counting children, off children | chains at `+0x3C` and `+0x40` | extended lists only |
| parent list, linked unit | `+0x34`, `+0x04` | [C] (`StatList+0x34`: `+0x34` the parent at 13 563 unlinks and 110 new state lists, `+0x04` the parent's unit at 3 408 tree nodes) |
| the ISC run-time tail | `+0x51`, `+0x52`, `+0x53` flags, `+0x58` targets, `+0x5E` dependents, `+0x0DE` op inputs | `ItemStatCostOps+0x5E`, `ItemStatCostOps+0xDE` |
| frame | `game +0xA8` | for the time of day of op 6/7 only |

### Constants: list flags

| Flag | Meaning | Tag |
|---|---|---|
| `0x2` | on a plain list: timed (an end frame at `+0x18`); on the unit list: it has a flag-`0x4` child (B1 sets it, `StatListsDropOnMode` tests and clears it) | [C] (`STATE_ApplyTimed`: on 110 new lists with a duration and every tree list with an end frame); [I] for 2 lists never dumped again |
| `0x4` | dropped on a mode change | [C] |
| `0x8` | the state's `aura` bit | [C] (`STATE_ApplyTimed`: on the 58 new lists of `aura` states, none of the 52 others; the apply's `or ebx, 8` reads States `+0x10` & 2) |
| `0x20` | a curse | [I] |
| `0x40` | an item's property list | [C] (`STATLIST_Alloc`: every non-extended child of an item list, 418 nodes, never elsewhere) |
| `0x800` | the state's `exp` bit | [I] |
| `0x2000` | on the off chain: kept, counts nothing | [C] |
| `0x4000` | an item marked as failing its requirements | [C] |
| `0x20000000` | the list holds an op-4/5 source | [C] |
| `0x40000000` | linked without damage | [C] |
| `0x80000000` | extended (cache and child chains) | [C] |

## Algorithm

### A. The list tree

```mermaid
flowchart TD
  U["unit list (extended, +0x48 cache)"] -->|"+0x3C: counts"| P["item list (extended)"]
  U -->|"+0x3C"| S["state lists: curse, aura, potion, shrine, passive"]
  U -->|"+0x3C"| B["set bonus list (state 165..170, stat 71 = set id)"]
  U -->|"+0x40: kept, counts nothing"| X["lists with flag 0x2000"]
  P -->|"+0x3C"| PP["property list (state 0, flag 0x40)"]
  P -->|"+0x3C"| G["socketed child's list"]
  P -->|"+0x40"| A["aprop lists 165..169 (0x2040) until switched on"]
```

- A1. [C] A unit owns one extended list (flag `0x80000000`), made with the stat callback for players and
  monsters and none for items and objects. Item property lists, set lists, state lists and the wearer's item lists
  hang under a unit list: on the `+0x3C` chain they count, on the `+0x40` chain (list flag `0x2000`) they are kept
  but count for nothing.
- A2. [C] A plain list (`STATLIST_Alloc`: 0x3C bytes, zeroed) holds the unit it is linked to (`+0x04`), the type and
  guid of the unit that made it (`+0x08`, `+0x0C`: the allocator's fourth and fifth arguments; the set code passes the
  unit's type and guid), flags (`+0x10`), state (`+0x14`), end frame (`+0x18`), skill and skill level (`+0x1C`,
  `+0x20`), its own entries (`+0x24`) and the parent list (`+0x34`) (the logged fields at 5 054 apply returns, `+0x08`
  equal to the source type). Its remove callback (`+0x38`) is written by
  `STATLIST_SetRemoveCallback` (39 rel32 callers) and called by `STATLIST_Unlink` when it is non-zero, with `EDX` the
  list's state and the list pushed. An extended list (`UnitStatListCreate`: 0x64 bytes, flag
  bit 31, stored at the unit's `+0x5C`) holds its unit at `+0x44` and at `+0x58` one block of
  8 × ((DataTables `+0xC4` + 31) >> 5) bytes, the two state bit-sets.
  [I] The siblings, the two child chains, the cache's place among the extended fields, the changed keys for the client
  and the stat callback field are one tool's reading, and so are the other writers of `+0x38` and the fifth argument
  at the other 70 `STATLIST_Alloc` callers.
- A3. [C] Entries are `{key, value}`, `key = stat << 16` plus the param's low 16 bits, sorted ascending (a signed
  binary search): 1 898 own and 314 cache arrays strictly ascending in the logs. `AddStat` adds to a found entry and
  removes it when the sum is 0 (the later entries move down, the count drops by 1, and when the spare room then
  exceeds 8 the array shrinks by 4 entries through the pool); a missing key is inserted. `SetStatEx` replaces an entry
  and removes it when the new value is 0 (198 entries emptied, absent from the next tree; no zero own entry).
  (`STATLIST_FindIndex`, `STATLIST_AddStat`, `STATLIST_RemoveEntry`,
  `STATLIST_SetStatEx`; `AddStat` emulated, 2 500 cases)
  [I] Both propagate the difference (§ C): `AddStat`'s parent propagation was not run under emulation. On a player's
  own list a changed key is recorded for the client when the stat has ISC `+0x05` bit 4 (`Saved`) and is not 6, 8,
  10, 13 or 14 (presentation, not modelled here).
- A4. [C] An extended list's **active array** is its cache (`+0x48`); a plain list's is its own entries (`+0x24`).
  An item's active array therefore holds its own entries, its property list, its sockets and its counting set lists:
  6 044 extended links and unlinks with cache ≠ own each propagated the cache.

### B. Link, unlink, toggle

```
B1. STATLIST_LinkToUnit(unit, list, withDamage):                       [C] (STATLIST_LinkToUnit, all of B1)
      STATLIST_Unlink(list)
      if list is already in the unit list's parent chain: return
      if list.flags & 0x4: unitList.flags |= 0x2
      if list.flags & 0x2000:
        push list on unitList.off (+0x40); list.parent ← unitList; list.unit ← unit; return
      push list on unitList.children (+0x3C); list.parent ← unitList; list.unit ← unit
      if list is extended and list.flags & 0x20000000:
        for each key in list.cache whose stat has ISC +0x53: StatRecompute(list, key)     ; op-4/5 sources, new wearer
      if withDamage: list.flags &= ~0x40000000
                     for each (key, v) in active(list): Propagate(list, key, +v)
      else:          list.flags |= 0x40000000
                     for each (key, v) in active(list), stat not damagerelated: Propagate(list, key, +v)
B2. STATLIST_Unlink(list):                                             [C] (STATLIST_Unlink, all of B2)
      if list is extended and list.flags & 0x20000000: re-evaluate its +0x53 keys as in B1
      for each (key, v) in active(list), skipping damagerelated stats when list.flags & 0x40000000:
        Propagate(list.parent, key, −v)
      detach; if the list was linked to a unit: call its remove callback (+0x38)
B3. UNIT_ToggleStatListByState(unit, state, off):                      [C]
      list ← the unit's list of that state
      if (list.flags & 0x2000 ≠ 0) ≠ off: Unlink(list); flip 0x2000; LinkToUnit(unit, list, withDamage = true)
```

- B1. [C] `StatListLinkOwner(unit, item, withDamage)`: a null unit, item or item list returns; an item in
  locations 11 and 12 (item data `+0x44`) is only unlinked; an item whose list is already linked to the unit only
  switches damage, and only across the flag: `withDamage` calls `STATLIST_EnableDamageStats` when the list has
  `0x40000000`, no damage calls `STATLIST_DisableDamageStats` when it has not (each propagates the list's
  damage-related entries), and the other two combinations return; otherwise it is linked as B1 and `+0x04` ← the unit.

- B1, B2. [C] Linking without damage (the dual-wield second weapon, 32 links) and the `0x20000000` re-evaluation on
  link and unlink were among the predicted events.

### C. Propagation and the cache

```
C1. Propagate(list, key, delta):                                       [C] (STATLIST_Propagate, all of C1)
      if list.flags & 0x2000: return
      if list is not extended: list ← list.parent
      while list:
        s ← key >> 16
        if not ISC[s].+0x51 and not ISC[s].+0x52: CacheAdd(list, key, delta)
        else:                                     StatRecompute(list, key)
        stop ← list.flags & 0x2000 or (ISC[s].damagerelated and list.flags & 0x40000000)
        list ← list.parent
        if stop: return
C2. CacheAdd(list, key, delta):                                        [C]
      old ← cache[key] (0 if absent);  new: i32 ← old + delta
      if new = 0 and not ISC[s].keepzero: remove the entry  else: cache[key] ← new
      if ISC[s].+0x53: list.flags |= 0x20000000                       ; an op-4/5 source
      if ISC[s].fCallback: callback(arg, key, old, new)                ; § G
C3. CacheWrite(list, key, v):                                          [C]
      as C2 with new ← v; the callback runs only when the value changed
```

```
C4. StatRecompute(list, key) → i32:                                    [C] (all of C4)
      s ← key >> 16
      v: i32 ← StatEvaluate(list, key)                                 ; § D
      if not ISC[s].+0x51: CacheWrite(list, key, v); return v           ; no targets, no dependents
      if v = 0: CacheWrite(list, key, 0)                               ; early write
      taken ← false
      for k in 0 ..< 3 while ISC[s].target[k] ≠ none:                   ; op stat1..3
        t ← ISC[s].target[k]
        tv ← StatRecompute(list, t << 16)
        CacheWrite(list, t << 16, tv)
        if tv ≠ 0 and Takes(list, s, k): taken ← true
      if not taken and v ≠ 0:
        CacheWrite(list, key, v)
        for each d in ISC[s].dependents (+0x5E):                       ; the rows whose op base is s
          dv ← StatRecompute(list, d << 16); CacheWrite(list, d << 16, dv)
      return v
C5. Takes(list, s, k) by ISC[s].op (class table):          [C] (all of C5)
      op 1, 12      → true
      op 2, 3       → list.ownerType (+0x08) is a player or a monster, w ≠ 0xFFFF and list.active[w] > 0   ; no F2 floor
      op 4, 5       → list's linked unit (+0x04) is a player or a monster, w ≠ 0xFFFF
                      and STATS_GetUnitStat(linked unit, w) > 0                                            ; with the F2 floor
      op 6, 7       → list.ownerType (+0x08) is a player or a monster
      op 13         → list.ownerType (+0x08) is an item
      op 8, 9, 10, 11, 0 → false
      op above 13   → true                                             ; the ja; see the step note
      where w: u16 ← the word at ISC[s] +0x0DE + 6k                    ; the quirk, step note C5
```

Step notes:

- C1. [C] There is no other cache and no lazy recompute: the full value read at any frame is the result of the last
  propagation. Every list write, link, unlink and toggle is a recompute trigger. The run predicted 207 017
  Propagate calls (96 342 from links and unlinks, list, key and delta) and every write inside each, 137 242 CacheAdd
  and 94 800 CacheWrite, in order, with the old value each found; the tree after every top-level event equalled the
  model (5 143 snapshots).
- C2. [C] The stat callback fires exactly for the writes of `fCallback` stats that change the value: 14 522 calls,
  key, old and new predicted.
- C4. [C] **The order of the writes**, from the instructions: `StatEvaluate`; without `+0x51` one
  `CacheWrite` and return; `v = 0` written at once; per target in `+0x58` order (at most
  three words, `0xFFFF` ends), `StatRecompute` of the target, then `CacheWrite` of its result, then the take test only when that result is non-zero by the **source** row's `op` byte
  `+0x54`; after the loop, when no target took and `v ≠ 0`, the source's
  `CacheWrite` and each `+0x5E` dependent, at most 64 words, recomputed and written. The run predicted every one of these writes in order (C1).
- C4. [C] **A source keeps its old cache value while a target takes.** When a target took (C5), the source's own
  cache entry is not written, so it keeps its previous value (0 on first use) and its dependents are not walked:
  24 279 cache entries of sources whose target took kept their old value.
- C4. [C] **The zero-source early write.** A source that evaluates to 0 is written 0 at once, before its targets,
  and its `+0x5E` dependents are never walked: 1 239 such recomputes. No stock `op base` row (all are `level`)
  reaches 0.
- C5. [C] **The take-test quirk (`StatRecompute`).** For ops 2–5 the stat tested is not the source row's `op base`
  (`+0x56`) but the word at the source row's own `+0x0DE + 6k`, the `op base` of the row's own *k*-th op input. The
  loader fills only `+0x5E..+0xDD` with `0xFFFF`, so on a row that is not itself an op target that word is the
  record's initial 0: stat 0, `strength`. The run's dump of the loaded table shows the word is 0 on every row that is
  not a target, and no stock op-2–5 source (rows 214–250) is a target. So on a player (strength > 0) every per-level
  source takes and its own cached value stays hidden; a monster's strength is usually 0. (`ItemStatCost.txt:op` base)
- C5. [C] **The take test as a map**: 3 000 emulated cases over every class and both outcomes (taken / not:
  class 1 63 / 622, 2 88 / 669, 3 258 / 238, 4 55 / 211, 5 396 / 0, 0 0 / 630; an op byte above 13 taken 121), 12
  controls each separating. [I] An op byte above 13 does not reach the test on loaded data: E1 zeroes
  such an `op`.
- C5. [C] The take test as far as stock rows reach it: op 1 took 156 times, op 2 280, op 4 2 568 and did not take
  3 467 (the item unlinked: no linked unit), op 5 took 26 and did not 70; ops 8 and 9 never took (615). The classes of
  ops 3, 6, 7, 12 and 13 were not reached in the run by a source whose target took; the emulation above runs them.

- C4. [C] **Level-up.** `level` is the `op base` of the 37 per-level rows, so it has dependents: a change of stat 12
  re-evaluates `level` (no targets, so it is always written) and walks every per-level row and their targets
  (9 level changes, their dependent writes predicted). (`ITEMSTATCOST_Load`, `ItemStatCost.txt:op` base)

### D. The evaluation: `op` 1–13

```
D1. StatEvaluate(list, key) → i32:                                     [C] for ops 1, 2, 4, 5, 8, 9, 11, 13
      t ← key >> 16;  owner ← list's unit (+0x44)
      v: i32 ← list.own[key] + Σ over counting children c: active(c)[key]
                 ; a child with 0x40000000 is skipped when t is damagerelated
      if not ISC[t].+0x52: return v
      b0: i32 ← v;  acc: i32 ← v
      for k in 0 ..< 16 while ISC[t].opIn[k].op ≠ 0:                    ; source-row order (§ E)
        e ← ISC[t].opIn[k];  src ← e.source << 16                       ; param 0
        Eval(x) means StatEvaluate(list, x), on the same list
        switch e.op:
        1:  if owner: (if owner is an item: b0 ← BaseStat(owner, t))
                      if b0 ≠ 0 and (p ← Eval(src)) ≠ 0: acc ← acc + MulDiv(b0, p, 100)
        2:  if list.ownerType (+0x08) ∈ {player, monster} and e.opBase ≠ 0xFFFF:
              b ← list.active[e.opBase] >> ValShift(e.opBase)
              if b > 0 and (p ← Eval(src)) ≠ 0: acc ← acc + ((p × b) >> e.opParam)       ; i32 imul, arithmetic shift
        3:  as 2, but acc ← acc + MulDiv(b0, (p × b) >> e.opParam, 100)
        4:  as 2 with b ← STATS_GetUnitStat(list.unit (+0x04), e.opBase) >> ValShift, that unit a player or a monster
        5:  as 3 with the b of 4
        6:  if owner and owner+0x1C and (p ← Eval(src)) ≠ 0: acc ← acc + ByTime(p)
        7:  if owner and owner+0x1C and (p ← Eval(src)) ≠ 0: acc ← acc + MulDiv(acc, ByTime(p), 100)
        8:  if owner is a player: d ← Eval(src) − list.own[src]
              if d ≠ 0: acc ← acc + CharStats[owner].ManaPerMagic × d × 64
        9:  as 8 with LifePerVitality, or StaminaPerVitality when t = 11
        11: if b0 ≠ 0 and owner is a player or a monster and (p ← Eval(src)) ≠ 0: acc ← acc + MulDiv(b0, p, 100)
        13: if owner is an item: b0 ← BaseStat(owner, t)
              if b0 ≠ 0 and (p ← Eval(src)) ≠ 0: acc ← acc + MulDiv(b0, p, 100)
        10, 12: nothing
      return acc
```

Step notes:

- D1. [C] The ops a stock row reached in a predicted write: op 1 348, op 2 1 490, op 4 2 568, op 5 26, op 8 919,
  op 9 3 784, op 11 92, op 13 136, each at least 20; every other cached entry of every extended list evaluated to its
  cache (646 835 evaluations at the snapshots), except the stale sources of C4 and the item op-4/5 values of § H.

- D1. [C] Ops 3, 6, 7, 10 and 12 were not reached by a stock row in the run; their lines run under emulation. Op 3 has
  op 2's gates and adds `MulDiv(b0, (p × b) >> opParam, 100)` (1 347 terms); ops 10 and 12 (and any op above 13) go
  to the next entry (670, 643); no stock row has op 3, 10 or 12 (the 359 rows' `op` cells). Ops 6 and 7 as code are
  emulated in a run of their own. [C] Ops 6 and 7 appear only on the unspawnable *of Dawn* and *of Sunlight*: the 36
  `…/time` property codes, the 36 stats with op 6 or 7, are named in every property-code column of the affix, unique,
  set, runeword, gem and cube tables by those two `magicsuffix` rows only (`ac/time`, `spawnable` 0).

- D1. [C] `b0` starts as the own-plus-children sum and only ops 1 and 13 on an item replace it with the item's base
  stat, so on a player op 11 (`item_maxhp_percent`, `item_maxmana_percent`) is a percentage of the **flat sum**, not
  of the running total: a running-total control mispredicts 86 of 5 952 checked writes, the stock model none. Op 7 alone uses the running total `acc`: the control on the flat sum fails 1 103 of
  3 000 emulated cases. The products of ops 2 and 3 are signed 32-bit, then an
  arithmetic shift. [I] `BaseStat` reads the owner's
  own `+0x24` entry with the floor of § F, and ops 4 and 5 shift as ops 2 and 3; `MulDiv` is
  [monsters/stats § A](../../spec-monsters/stats/#a-muldiv-and-monlvlstats).
- D1. [C] **op 8/9 add only `full − own` of the source** on the list being evaluated: a full-value control
  mispredicts all 5 952 checked writes. On a player's list `own` is the base attribute,
  so only vitality and energy from items, states and sets pass through op 9/8; the points a player spends are added
  to the base maxima by the stat-point code: `PLAYER_SpendStatPoint` needs stat 4 above 0; energy adds
  `ManaPerMagic × n << 6` to mana (when n > 0) and max mana and clamps mana to it, vitality adds
  `LifePerVitality × n << 6` to max life and (n > 0) life, clamps, then `StaminaPerVitality` the same for stamina,
  with n = 1.
- D1. [C] **`ByTime(p)` (op 6/7).** The source is `Encode` 4: bits 0–1 a period `q`, bits 2–11 `lo + 256`, bits
  12–21 `hi + 256`. With the phase `x` from `ActTimeOfDay`: `a ← |x − 90q|`, rounded to a multiple of 15
  (`(a + 7) ÷ 15 × 15`, 0 below 1), then `a ≥ 359 → 360 − 359`, `a ≥ 180 → 360 − a`; value `hi − (hi − lo)·a ÷ 180`.
  1.14d's server computes ops 6 and 7 (Open questions). The formula and `ActTimeOfDay`'s map (the phase
  `e[+0x08] / e[+0x28]` from `owner +0x1C → +0x04`) run under emulation. [I] That phase as a time of day: who
  writes the act's `+0x04` → `+0x08`, `+0x28` is not read.

### E. The op graph the loader builds

- E1. [C] `ITEMSTATCOST_Load` walks the rows in id order and appends each row to the `opIn` table (`+0x0DE`,
  `{op base, source, op, op param}`, up to 16) of every `op stat1..3` target, so a target evaluates its sources in
  source-row order: `armorclass` 16 (op 13), 214 (op 4), 215 (op 5), 268 (op 6), 269 (op 7); `maxhp` 3 (op 9),
  76 (op 11), 216 (op 2), 270 (op 6). An `op` outside 1..13 is zeroed. It sets `+0x51` on each source with a target
  and on each `op base` row (appending the source to that row's `+0x5E` dependents), `+0x52` on each target and
  `+0x53` on the op-4/5 sources. The run's dump of the loaded tail equals these rules on all 359 rows (103 392
  fields). (`ITEMSTATCOST_Load`, `ItemStatCost.txt:op` stat1)
- E2. [C] The `op stat` cells are honoured as written, with no check against the row's name: 273
  `item_maxdamage_percent_bytime` feeds `maxdamage`, `secondary_mindamage` and `item_throw_mindamage`; 237 and 291
  feed `item_absorbmagic`. The 97 loaded `opIn` edges of all 28 dumps equal the cells as written.
  (`ITEMSTATCOST_Load`, `ItemStatCost.txt:op` stat1)
- E3. [C] Two targets are themselves sources, so a derivation chains: `energy` (targets of 222 and 276, itself op 8 →
  `maxmana`) and `vitality` (targets of 223 and 277, op 9 → `maxhp`, `maxstamina`). (`ItemStatCost.txt:op` stat1)

### F. Reads

- F1. [C] Every full read is a cache read: `UnitGetStat` and `STATS_GetUnitStat` read the unit list's
  `+0x48` entry, `STATS_GetUnitBaseStat` its own `+0x24` entry; nothing is summed at read time. 891 844 reads of the
  player's list in the 50-frame windows after each list change, of 120 stat ids, each equalled the model's cache
  entry.
- F2. [C] **The read-time floor.** Both readers (`StatListGetValue` and `StatListGetBaseValue`) replace a present
  value `v` only when the record argument is not NULL, the stat has `fMin`, the list is extended (`+0x10` bit 31, for
  the base reader too) and its unit (`+0x44`) is a player or a monster (rows 0–3, 7 with `MinAccr` 1; 9 and 11 with
  0); then `v < MinAccr` (signed, `MinAccr` unshifted) returns `MinAccr << (ValShift & 31)`, 32-bit. So a value at or
  above `MinAccr` and below `MinAccr << ValShift` is returned as it is: `maxhp` (`MinAccr` 1, `ValShift` 8) keeps
  1..255 and gives 256 for 0 or less. An absent entry returns 0, unfloored; the stored entries are not clamped. The
  ops' base reads and the take test of ops 2/3 pass a NULL record, so they read unfloored. 4 000 emulated cases, 211
  floored; the threshold `MinAccr << ValShift` as a control fails 79. No read of the stats run reached the
  floor.
- F3. [C] `itemspecific` does not stop the propagation: the player's cache holds the sum of the equipped items' 72
  and 73 in every snapshot.

### G. The maxima, the rescale and the stat callback

```
G1. maxhp ← full stat 7, maxmana ← full 9, maxstamina ← full 11 with the F2 floor      [C]
      full 7 = own 7 + Σ flat 7 of the counting lists + op 9 (vitality from items, states, sets)
             + op 11 (item_maxhp_percent of the flat sum) + op 2 (item_hp_perlevel) + op 6
G2. stat callback, stats 7 / 9 / 11 → current 6 / 8 / 10:             [C]
      if new = old or old ≤ 0: return
      cur: i32 ← current;  if cur ≤ 0: return
      r: i32 ← trunc(float32((float) new ÷ (float) max(old, 256) × cur))
      current ← min(max(r, 1), new)
```

Step notes:

- G1. [C] The maxima are the cached full stats 7, 9 and 11; item and state life reach them through the cache, item
  vitality and energy through op 9 and op 8 with the class's quarter-point factors, and op 11 is a percentage of the
  flat sum (92 predicted op-11 writes). (`UNIT_GetMaxMana`, `UNIT_GetMaxStamina`,
  `CharStats.txt:LifePerVitality` for the op-9 factor) The getters' own bodies: [C] each
  returns 0 for a NULL unit or list or a DataTables count at or below the stat, else `StatListGetValue(unit +0x5C,
  stat << 16, the stat's record)`, the cached stat with the F2 floor; they read no CharStats cell. 1 500 emulated
  cases.
- G2. [C] 5 752 changes of stats 7, 9 and 11 with a positive current value; the current value after each equals G2
  (stat 7: falls 1 797, rises 1 810, capped 57; stat 9: falls 432, rises 446, capped 702; stat 11: rises 5,
  capped 503). The float arithmetic is that of [monsters/stats § E](../../spec-monsters/stats/#e-the-stat-callback-monstatcallback-stat-7).

- G2. [I] For a monster with a MonStats `DamageRegen` factor the callback also sets stat 74 from the new maximum.

- G3. [C] The callback's other cases: keys 7..204 map through the index bytes to 11 cases: 7, 9, 11,
  83, {97, 107}, 98, {126, 127}, 151, 188, 204, the other keys to the return; so 107 runs 97's code and 126 runs
  127's (only the unit is passed). Zero-crossing writes in the logs: 98 `state` sets or clears that state
  with the group clear ([states § D](../states/#d-the-group-clear); 360), 83, 97, 127 and 188 refresh the passives
  (`SKILLS_RefreshPassive`, 4 158), a write of 204 links and unlinks (4).
  [C] Before the switch the callback registers a stat's item events: with ItemStatCost `itemevent1` (`+0x48`, s16)
  above 0 and its fourth argument non-zero it calls `AddStatEvent` with `itemevent1`/`itemeventfunc1` (`+0x4C`) and,
  when `itemevent2` (`+0x4A`) is above 0, with `itemevent2`/`itemeventfunc2` (`+0x4E`), unless finds a node
  (the first of the unit's `+0x90` list with kind, stat and `+0x0C` equal); with a fourth argument of 0 it calls
, which marks a matching node in use (word `+0x02` bit 0) with bit 1 and unlinks and frees the first one
  not in use. `AddStatEvent` returns 0 for a `func` above 0x31 or a null `g_StatEventFuncs` entry.
  (`g_StatEventFuncs`, the three helpers emulated, 3 000 cases)
  [I] What the fourth argument means (the callback is entered with it, not with a crossing of 0, so "registers when
  the value goes to or from 0" is a reading); 107 acts only for a player whose class is the skill row's `+0xC`; the registration's node is keyed by kind 2 and the stat twice, so a found node blocks both events and
  a 0 frees every such node not in use; the item aura that 151 starts or stops; and
  what the cases of 83, 97, 107, 126, 127, 188 and 204 do beyond the logged passive refreshes and links.

- G3. [C] The event registration reads `itemevent1/2` as `s16` and registers only an id `> 0`: a blank cell (−1) and
  id 0 (`hitbymissile`) register nothing. Which ids are ever dispatched is
  [skills/dispatch § K](../../spec-skills/dispatch/#k-stat-event-handlers).
- G4. [I] `UNIT_ClampVitals` (when `ITEMS_DetachFromOwner` is asked to clamp): stamina, mana and life, in that order,
  are lowered to their maxima when above. The run took the clamp's writes as inputs.

### H. Items: equip, requirements, the refresh, broken, per-level values

```
H1. ITEMS_AttachToOwner(owner, item):                                  [I] (ITEMS_AttachToOwner, all of H1 but the set call and the damage choice: step note H1, H2)
      if owner is a player in state 7 playerbody: refuse
      a gem, rune or jewel gets its gems mods (items/sockets-runewords § C)
      if item is a set item: SETS_UpdateOnEquip(owner, item, 0, 0)       ; § J
      if owner can dual-wield and item is a weapon other than the primary one: link without damage
      else: link with damage                                           ; a broken item only when forced
H2. ITEMS_DetachFromOwner(owner, force, clamp):                         [I] (ITEMS_DetachFromOwner, all of H2 but the set call: step note H1, H2)
      refuse for a player in state 7; a set item: SETS_UpdateOnEquip(owner, item, 1, 0)
      unlink (unless broken and not forced); a dual-wielder's remaining primary weapon is re-linked with damage
      if clamp: UNIT_ClampVitals(owner)                                ; G4
H3. ItemReqCheck(item, unit) → bool:                                   [C] for strength, dexterity, identified and ethereal
      str: i32 ← reqstr + MulDiv(reqstr, stat 91 item_req_percent, 100)    ; record +0x10A
      dex: i32 ← reqdex + MulDiv(reqdex, stat 91, 100)                     ; record +0x10C
      if item is ethereal: str ← str − 10; dex ← dex − 10
      pass iff full strength ≥ 1 and ≥ str, full dexterity ≥ 1 and ≥ dex,
               unit level ≥ the item's level requirement, item identified (0x10),
               a type-18 base has stat 70 > 0, and the class matches
H4. EquipReqRefresh(unit):                                             [C] (all of H4)
      (1) each inventory charm (type 13) that is usable and not linked: link it
      (2) body slots 1..10, once: an item that is linked or not marked and fails H3: mark 0x4000, unlink with the clamp
      (3) repeat over slots 1..10 until nothing changes:
            an unbroken item that is marked or unlinked and passes H3: unmark, link
      (4) every equipped, unbroken, unmarked set item: detach and re-attach (H2, H1)
```

Step notes:

- H1, H2. [C] A set item's `SETS_UpdateOnEquip` runs in mode 0 before each of its 5 749 links and in mode 1 before
  each of 5 593 unlinks; a link without damage was only the Barbarian's second hand (`bl` 5, 32 links). The
  body-to-cursor pickup does not go through H2: it unlinks through `InvItemRemove` →
  `UNIT_UnlinkItemStatList` with no `SETS_UpdateOnEquip` (260 of 278 unlinks). [I] The
  `playerbody` refusal, the gem mods, a forced broken item, the dual-wield re-link and the clamp were not met.
- H3. [C] 17 634 checks predicted from the base record, stat 91, the ethereal −10 and the model's unit stats (passed
  15 610 plain, 814 with stat 91, 428 ethereal; failed 428 by strength, 24 ethereal by strength, 240 by dexterity,
  90 unidentified). **The ethereal −10 decided 30 checks**: strength 115..124 against the ethereal War Boots' 125,
  passing only with the −10.
- H3. [I] The `item_req_percent` term changed no outcome in its 814 checks (a reading without it predicts the same),
  and the level test, the class test (item class 7 any class, a player its own class, a monster only class-4 items
  when `MonClassCheck` gives 560 or 561) and the type-18 test decided none. The required level and the
  strength and dexterity values the check reads (called only with a non-zero third argument)
  were value oracles of the run.
- H3. [C] Under emulation, on the path `ItemAutoEquipSlot` takes (a third argument of 0, so neither nor
is called) and the level requirement's quality-default path, each of these tests decided cases:
  the stat-91 percent term (read at param 0 only), the ethereal −10, each stat above 0, the level test
  `max(0, Items +0x13F + the item's stat 92)`, the type-18 test, the class test (class 7, or a class byte of 7 or
  more, passes any user) and the monster's 560/561 test. 6 000 cases. The level requirement's
  quality arms 4..8, socket loop and skill loops were not run.
- H4. [C] Every refresh (972) re-attached every equipped, usable set item (`SETS_UpdateOnEquip` mode 1 then 0, each
  item's list unlinked and linked).
- H4. [I] Step (2) runs once, so an unlink that breaks another item's requirement (strength from another item) is
  caught at the next refresh, not in this one. The refresh runs after equip, place, break, repair and identify.
  (`ITEMS_IsActiveCharm`; the placement that attaches a charm: [items/inventory § C](../../spec-items/inventory/#c-placing-on-a-page))
- H4. [C] **The refresh also runs with no player action, from the act clock.** `ActsClockPass` walks
  the five act slots and, for a slot whose `ActClockTick` returns non-zero, calls
  `PlayerEquipRefresh(…, 1)` for each client's player, which calls `EquipReqRefresh` with 0. The commonest gap between two
  refreshes is 136 frames in 22 of the 28 kept logs; in six s1017 logs it is 1 (bursts after actions). [I] That the idle 136 is
  act index 3's bucket period (`17 × 128 / 16`): all 28 logs start in level 103, and no log has an act-clock line to
  pair.
- H5. [I] **Broken.** `ItemBreak` sets `0x100`, unlinks an equipped item, sets durability (72) to 0 and
  updates its set with the item excluded; `ItemRepairBroken` clears it and re-runs H4. No broken item
  was reached.
- H7. [C] **An item's per-level (op 4/5) value is not refreshed when the wearer levels up.** After the Paladin's
  level-ups, the item lists with an op-4 source (`item_armor_perlevel` on Stormshield) kept the value of their last
  link (94 entries), equal to the evaluation at the wearer's previous level: nothing propagates a stat of the linked
  unit into an item list, and only B1 and B2 re-evaluate the `+0x53` keys. The wearer's own per-level rows are
  re-evaluated by the level write (C4).
- H7. [C] So the item's value catches up at its next link: for a set item at the next refresh's step (4), for any
  other item at its next unequip and equip: 2 361 changed op-4/5 writes inside a refresh, 337 outside one.


### I. Dual wield and the weapon switch

- I1. [C] For a Barbarian holding two weapons, the weapon that is not the primary one is linked **without damage**
  (flag `0x40000000`): its damage-related stats stay out of the wearer's cache (32 such links).
- I2. [I] `UNIT_CanDualWield` answers yes for player classes 4 and 6 (Barbarian, Assassin) and monster classes 417
  and 418; an Assassin's second weapon was not reached.
- I3. [C] The weapon switch (`PlayerSwapWeapons`, whose one caller is `SwapWeaponsReq`) detaches each occupied hand through H2 (each behind its own test) and attaches
  the other side's through H1, and over 76 logged swaps the detaches and
  attaches touch `bl` 4 and 5 only (4+5 → 4+5 24, 4+5 → 4 26, 4 → 4+5 26).

### J. Set bonuses

```mermaid
flowchart TD
  E["set item attached or detached"] --> M["mask = worn members: page 3, quality 5, not 0x100, not 0x4000; bit = member index"]
  M --> T["SETS_ToggleItemAProps: this item's aprop lists on or off by add func"]
  M --> O["SETS_UpdateOwnerBonusList: the set's list on the wearer"]
  O --> P["n = popcount(mask): partial blocks 0 .. 2*min(n, members-1) - 3"]
  O --> F["n >= members: full blocks until the first blank"]
```

```
J1. mask: u8 ← SETS_WornMemberMask(owner, set)                        [C] but for 0x100
      bit i set iff an item of member index i is in node page 3, quality 5, not broken (0x100),
      not marked (0x4000), of this set                                 ; a duplicate member sets the same bit
J2. SETS_ToggleItemAProps(item, mask):                                 [C]
      own ← the item's member index
      add func 1: for each other member index k (0..5, skipping own):
                    slot ← k if k < own else k − 1
                    toggle state 165 + slot on iff bit k of mask
      add func 2: c ← popcount(mask) − 1                               ; other members worn
                    states 165 .. 165 + c − 1 on, the others off
      ; each toggle is B3 on the item's aprop list of that state
J3. SETS_UpdateOwnerBonusList(owner, item, mode):                      [C]
      list ← the owner's list with a state in 165..170 whose own stat 71 = the set id
      mode 1 (unequip): unlink and free it                             ; H4 step (4) rebuilds it
      mode 0 (equip): clear it, or allocate it in the first free state of 165..170,
                      link with damage, set the state, add stat 71 = set id, then SetBonusApply
J4. SetBonusApply(list, set, mask):                                    [C]
      n ← popcount(mask)                                               ; the item itself counted
      for b in 0 ... 2·min(n, members − 1) − 3: if partial block b has a code ≥ 0: apply it   ; PROP_ApplyBlockByVersion mode 4
                                                     ; block b = PCode(2 + b ÷ 2) a (b even) or b (b odd)
      if n ≥ members: for each of the 8 full blocks until the first code < 0: apply it
```

Step notes:

- J1–J4. [C] 11 343 worn masks predicted from the inventory (a requirement-failing Soul Cage never counted; two
  Angelic Halo set one bit); 5 749 aprop toggle sequences (`add func` 0: 1 844, 1: 819, 2: 3 086) with 19 525
  toggles; 5 749 wearer set lists, all equal to the Sets blocks for `n = popcount(mask)` (Angelical Raiment n = 1;
  Civerb's n = 1, 2, 3; Immortal King n = 1, 2, 3; Trang-Oul's n = 4 and n = 5): 5 569 at the run, the 180 full
  Trang-Oul's lists since the 2026-10-20 re-check.
- J4. [C] **Block *b* is the *b*-th partial quad of the record.** `SetBonusApply` takes `m = min(n, members − 1)`, walks `b = 0 .. 2m − 3` over the 16-byte quads from record `+0x010`
  and the full quads from `+0x090`; the compiled record holds the partial quads in `.txt`
  order `PCode2a`, `PCode2b`, `PCode3a` … at `+0x010 + 16j`, as the layout diff of
  Sets § Bonus blocks shows. The 5 749 predicted lists are the third
  leg.
- J4. [C] **The full Trang-Oul's Avatar** (n = 5, 180 lists): a full block with a `state` or an `oskill` property is
  built like the others. Its full blocks carry a `state` (`monsterset`) and an `oskill` (Fire Mastery) property; each
  of the 180 lists equals the Sets blocks for n = 5 when every value is stored `<< ValShift` (`mana` 100 → 25 600),
  the `state` block (property func 24) writes stat 98 with the compiled param 176 (`monsterset`, a state) and the
  value 1, and the `oskill` block gives the skill's id and level. A reading without the shift, or with param 0, would
  mismatch every one of the 180. The lists were taken as logged at the run and are predicted by the kept checker
  since the 2026-10-20 re-check (0 mismatches over the 18 logs).
- J4. [I] A set whose last member is broken (flag `0x100`) was not reached, so its full blocks are read from the code
  only.
- J2. [C] The aprop lists are the item's own lists of states 165..169 (flags `0x2040`, made at creation,
  [items/properties § G](../../spec-items/properties/#g-stat-storage)): pair *k* counts when its member is worn
  (`add func` 1) or when *k* other members are worn (`add func` 2): a control swapping funcs 1 and 2 mispredicts 2 039
  of 3 905 calls, the stock none. `add func` 0 (blank) puts the aprop in the main list at
  creation, where it always counts: `ItemApplyProps` builds such an `aprop` block with state 0 and flags 0x40, as a
  `prop` block. (`g_SetBonusStates`,
  `SETITEMS_GetMemberIndex`, `SetItems.txt:add` func)
- J3. [C] **Stat 71 sums.** The marker stat 71 (`value`) is an ordinary entry, so the wearer's full stat 71 is the
  sum of the active sets' ids (set id 0 adds nothing) plus any other stat-71 entry under it: the sum of the set lists'
  71 in all 4 996 trees, 2 850 with two or more sets. The lookup reads stat 71 of each
  set list itself, not the cache, so the sum does not disturb it: for each of the six `g_SetBonusStates` it takes the
  unit's list of that state and compares `StatListGetBaseStat(list, 71, 0)` (the own entries) with the set id.
- J4. [C] The ten stock named Sets param cells: 4 are first found in the skills table (Trang-Oul's), 6 in the states
  table, none in two tables (a full-table check). [I] A param naming a skill, a montype
  or a state is compiled to the first hit in the skills, then montype, then states tables, whatever the block's
  property; a name that is both a skill and a state stores the skill row: no stock cell is in two tables.


### K. Passive stat lists

- K1. [C] A passive's list is the skill's `passivestate` list holding `passivestat1..5` = `passivecalc1..5` at the
  level it records in stat 351, each with param `passiveitype` (0 when none), plus 350 = the skill: 8 832 refreshes
  (Sword Mastery 127, Increased Stamina 141, Iron Skin 145, Natural Resistance 153, and Fire Mastery 61 from the full
  Trang-Oul's `oskill`).
- K2. [C] The list is rebuilt only when 351 differs from the skill's current level (with bonuses), and freed while
  the skill's `aurastate` is on the unit or the unit lacks the skill; the remove callback of a state list rebuilds the
  passives in that state. 7 900 calls on the equal branch changed
  nothing and 988 rebuilt with a new 351.

- K3. [C] The skills' `aura` bit has 9 readers, the `+0x04` tests of mask byte: `EVENT_SelectedAuraTick`, `AuraSelect`, `PlayerSetSkill` twice, `MissileCreate`, `ITEMAURA_Start`,
  `ITEMAURA_Stop`, `SummonInitStats`, `MERCAI_PickSkill`. [C] No stock row hands skills 127–129 to a
  hireling (`Skill1`..`Skill6`), a monster or summon (MonStats' skill columns) or an item through an `aura` property:
  the only two cells naming them are the `skill` properties (func 22) of the uniques *Bloodtree Stump* (`par6` 129) and
  *Bloodletter* (`par7` 127). [I] The masteries 127–129 carry the bit with no
  `aurastate`; no reader gives it an effect for them: the item-aura, summon and hireling readers meet no stock row
  naming them (reading the two cells as skill ids is the table doc's inference), and the player's selection readers
  and `MissileCreate` need a reason in the code, not read.

### Draw order

- [C] Linking, unlinking, own writes (every recompute they make) and toggles draw nothing: the game seed and the
  acting unit's seed were unchanged across 12 868 links, 12 853 unlinks, 101 995 own writes and 19 525 toggles.

- [C] The requirement refresh, the set activation and the passive refresh run inside those events. No seed moved in
  972 logged refresh windows, and the direct-call closures of `SetBonusApply` (433 functions) and
  `SKILLS_RefreshPassive` (480) reach no drawing function. `EquipReqRefresh`'s closure
  reaches 122 drawing functions through `PlayerSkillReselect` → `PlayerSetSkill` → `AuraSelect` → `SKILLS_SrvDo` →
  `PlayerModeCmd` → `PlayerModeAllowed`: past its three early returns (a null unit, a non-player without `+0xC4`
  bit 9, no inventory) it calls `PlayerSkillReselect`, which calls `PlayerSetSkill` for a side whose
  wanted skill is set, found, not the current one, and not given 2 or 7 by `SKILLS_CanUse`.
- [I] Whether a stock refresh reaches that draw (it needs a refresh that restores a wanted skill; the path crosses the
  allocator, so it was not emulated).

## Outputs

The unit list's `+0x48` cache, one i32 per key, which every full read returns (with the F2 floor); the current
life, mana and stamina rescaled by G2; the `0x4000` marks and the link state of each equipped item; the wearer's set
lists and each set item's aprop toggles; the passive lists.

## Worked example

**1. The ethereal −10 deciding a requirement** (`StatsBarD`, sessions `bard-town1` and `bard-town2`). [C] A Barbarian with strength 85 and his belt and gloves off has a full strength in 115..124. The ethereal War Boots need 125 strength; H3 makes it 115, so the boots pass and stay linked; without the −10 every one of these 30 checks would fail.

**2. Set blocks by count**. [C] Civerb's Vestments has 3 members: with 2 worn, J4 applies
partial blocks 0 .. 2·min(2, 2) − 3 = 0..1 (`PCode2a`, `PCode2b`; only `2a` is used); with all 3 worn, partial blocks
0..1 again and the full blocks. Immortal King (6 members) with 3 worn applies partial blocks 0..3 (`2a` to `3b`); with
1 worn, none.

**3. Item vitality through op 9** (arithmetic of D1, illustrative). [C] A Barbarian (`LifePerVitality` 16 quarter
points) whose items add 10 vitality: `full − own` of vitality is 10, so op 9 adds `16 × 10 × 64` = 10 240 to `maxhp`,
40 life.

**4. A rescale** (arithmetic of G2, illustrative). [C] Max life rises from 25 600 to 30 720 with current life
12 800: `r = trunc(float32(30 720 ÷ 25 600 × 12 800))` = 15 360, between 1 and 30 720, so current life becomes 15 360.


## Reimplementation notes

- **Don't sum at read time.** A reimplementation that sums the lists when a stat is read gets the wrong value
  wherever the cache is stale by design: the source entries of C4 that keep their old value while a target takes,
  and the item op-4/5 values of H7 after a level-up. Model the cache and the propagation order exactly. [C]

- **The take test reads strength.** For ops 2–5 the stat tested is the source row's `+0x0DE + 6k` word, which is 0
  (`strength`) on every stock source; do not "fix" it to `op base`. [C]
- **op 11 is a percentage of the flat sum**, and op 8/9 count only the non-base part of energy and vitality. [C]

- **A target is written twice when its source recomputes it** (once inside its own recompute, then by the source,
  C4). The second write finds the value the first left, so it changes nothing and fires no callback, unless the
  target is itself a source whose own target took: then its own recompute did not write it, and the source's write
  does. No stock target is such a source (`energy` and `vitality` feed op 8 and 9, which never take; E3). [C]

- **The rescale truncates a float32**, and current life never drops below 1 by it. [C]

- **Requirements are checked once per refresh in step (2)**; the refresh also runs on its own from the act clock
  pass (H4). [C] The
  idle gap is 136 frames in 22 of the 28 kept logs, not in every one; that 136 is act index 3's period is [I].


## Evidence

- § 1–8 (the code reading), § 9 (the run), *Leads used*
  (12 verdicts, one contradicted), *Phase 0 surprises* (b), (e).
- Tables: ItemStatCost § Aggregation,
  CharStats, Sets § Bonus blocks,
  SetItems § Bonus blocks,
  Skills § Passive and aura columns.
- Upstream: [items/properties § G](../../spec-items/properties/#g-stat-storage), [items/uniques-sets](../../spec-items/uniques-sets/),
  [player/creation](../../spec-player/creation/), [monsters/stats § E](../../spec-monsters/stats/#e-the-stat-callback-monstatcallback-stat-7),
  [data/calc](../../spec-data/calc/). Downstream: [stats/states](../states/), [combat](../../spec-combat/overview/).
