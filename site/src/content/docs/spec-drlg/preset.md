---
title: "Preset units: the DS1 unit list, the keep/drop rolls and the LvlPrest columns"
sidebar:
  order: 3
---

## Purpose

A preset instance (a placed `LvlPrest` record, step 4) carries the units its DS1 names: objects, monsters, NPCs and their paths. This spec says which of them a DRLG room ends up with: the act rewrites that turn some monsters into objects, the **keep/drop rolls** that remove ten unit ids by chance (one draw each, on the level seed or on a room seed), the units the game adds itself, and how the instance's list is split into room lists. It also gives the effect of each `LvlPrest` column that the tile build does not use, and level 27's file index. Primitives (`Step`, `Init`) are those of [rng](../../spec-rng/overview/); the level and room seeds are those of [rng/seeds](../../spec-rng/seeds/).

## Entry points

| When | Function | Tag |
|---|---|---|
| DS1 parsed (unit list built, act rewrites) | `DS1_Parse` | [C] |
| Preset rooms created, `Scan` or `Pops` non-zero: DS1 load and the rolls on the level seed | `DRLG_PresetMapScan` | [C] |
| Preset room activated or prepared: DS1 load and the rolls on the room seed, the added units | `DRLG_PresetRoomLoadDs1` | [C] |
| Keep/drop rolls | `DRLG_PresetUnitDropRolls` | [C] |
| Instance list → room list (type-2 grid prepare) | `DRLG_PresetUnitsToRoom` | [C] |
| Server handover (boundary) | — | [C] |
| Level 27's file index, while the act's links are built | — | [C] |

## Inputs

### Tables

| Anchor | Used for |
|---|---|
| `ds1`#objects-v--2 | the DS1 unit entries: `type`, `id`, `x`, `y` (subtiles), `flags` |
| `ds1`#npc-paths-v--14 | the paths and their points (`action`, `x`, `y`) |
| `ds1`#header | `act` (clamped to ≤ 4), which picks the per-act id tables and the act rewrites |
| `MonPreset.txt:Place` | the per-act list a type-1 `id` indexes |
| `g_Ds1ObjectIds` | the 5 × 150 per-act table a type-2 `id < 150` indexes |
| `MonStats.txt:hcIdx`, `MonPlace.txt:code` | names of the ids the rolls and rewrites test (names only) |
| `LvlPrest.txt:Scan`, `LvlPrest.txt:Pops` | which caller rolls (`+0x34`, `+0x38`) |
| `LvlPrest.txt:Def` | the client river objects and the Blood Moor centre monster are chosen by `Def` (`+0x00`) |
| `LvlPrest.txt:Populate`, `LvlPrest.txt:Logicals`, `LvlPrest.txt:Outdoors`, `LvlPrest.txt:Animate`, `LvlPrest.txt:AutoMap`, `LvlPrest.txt:PopPad` | § LvlPrest columns |

### Runtime state

| State | Type | Owner offset | Source |
|---|---|---|---|
| preset instance | `PresetInstance`, 0x58 bytes | level `+0x1B0` list | — |
| instance origin, size | 4 × `i32`, tiles | `PresetInstance+0x10` (x, y), `+0x18` (w, h) | — |
| instance DS1 | pointer, 0 until the first load | `PresetInstance+0x0C` | step 2 |
| instance unit list | `PresetUnit` list, head first | `PresetInstance+0x38` | step 3 |
| pending flag | `i32`, 1 at create | `PresetInstance+0x3C` | step 4 |
| preset unit | `PresetUnit`, 0x20 bytes: `mode`, `id`, `x`, `y` (subtiles), `type`, `flags`, path | — | step 1 |
| level seed | `Seed` | level `+0x1C4` | — |
| DRLG room seed | `Seed` | room `+0x14` | [rng/seeds](../../spec-rng/seeds/) step 5 |
| room rect | 4 × `i32`, tiles | room `+0x34`..`+0x40` | — |
| room flags | `u32`: `0x40000` client copy, `0x80000` outdoors, no random population, `0x2000000` DS1 loaded | room `+0x28` | step 2, § LvlPrest columns |
| room unit list | `PresetUnit` list, head first | room `+0x5C` | step 5 |
| act seed | `Seed` (a copy, in the link builder) | act | [rng/seeds](../../spec-rng/seeds/) step 3d, `drlg/warps` |
| `nMonStats`, `nSuperUniques` | `i32`: 734, 66 in the pinned data | — | MonStats, MonPreset |

### Constants

| Name | Value | Anchor | Tag |
|---|---|---|---|
| subtiles per tile | 5 | — | [C] |
| drawing ids | MonStats 204, 205, 371, 372; MonPlace 33, 34, 35; objects 196, 261, 581 | `DRLG_PresetUnitDropRolls` | [C] |
| act rewrites | act index 2: MonStats 297 → object 382, 366 → object 404; act index 4: 514 → object 461, 537..539 → object `1013 − id` | `DS1_Parse` | [C] |
| client river object `Def`s | 1, 3, 26, 27, 28, 300 | `DRLG_PresetRoomLoadDs1` | [C] |
| row-skip floor mains | bits 20–25 = 4 with bits 8–15 ∈ {0, 4, 8, 16, 29, 39} (switch table) | `DRLG_PresetClientUnitsB` | [C] |
| centre monster | MonStats 266 (`navi`), `Def` 4–7, level 2, file index 3 | — | [C] |
| town levels | 1, 40, 75, 103, 109 (the byte table, decoded over every id; its callers `DRLG_RoomNoPopNearTown` and `OBJ_PopulateGate` agree) | `DRLG_RoomNoPopNearTown` | [C] |

## Algorithm

`ps` is a preset instance, `L` its level, `R` a DRLG room of `ps`. Positions are in **subtiles** (5 per tile)
unless they say tiles. Lists are written head first; "prepend" puts a unit at the head.

```mermaid
flowchart LR
  ds1["DS1 entries (file order)"] --> parse["1. DS1_Parse: map ids, act rewrites; list head = last entry"]
  parse --> who{"2. Scan or Pops?"}
  who -->|"yes, at room creation"| rl["3. DropRolls on L.seed"]
  who -->|"no, first room loaded"| rr["3. DropRolls on R.seed (before the re-seed)"]
  rl --> inst["instance list +0x38, file order, + origin x5"]
  rr --> inst
  inst --> add["4. PresetRoomLoadDs1: centre monster, client river objects"]
  add --> room["5. PresetUnitsToRoom: units in R's rect move to R +0x5C"]
  room --> srv["6. boundary: RoomPresetUnits (server spawners)"]
```

### 1. The DS1 unit list

```
1. ParseUnits(ds1) → list:                                                 [C]
     act: i32 ← min(ds1.act, 4)
     list ← empty
     for each object entry e of the DS1, in file order:
       u ← {type: e.type, id: MapId(e, act), mode, x: e.x, y: e.y, flags: e.flags, path: none}
       if u.id = −1, or e.type = 1 and ds1.version < 5: skip e            [I] no stock case (ds1#objects-v--2, step note 6)
       ActRewrite(u, act)                                                  ; step 1b
       prepend u to list                                                   ; head = last entry in the file
     for each path p of the DS1: attach p to the first unit of list       [C] (ds1#npc-paths-v--14, step note 6)
       (= the last in file order) whose (x, y) equals p's; no such unit → p is dropped   ; [I] the drop: no stock case

1a. MapId(e, act) → i32:                                                   [C] the branches stock DS1s take (ds1#objects-v--2, MONPRESET_GetActList, g_Ds1ObjectIds, step note 6)
     type 1: entry e.id of the act's MonPreset list:
             a MonStats class → class; a SuperUnique row → nMonStats + row;
             a MonPlace row → nMonStats + nSuperUniques + row; other kind → −1   ; [I] other kind: no stock case
     type 2: version ≥ 6 and id < 150 → g_Ds1ObjectIds[act][id]; version ≥ 6 → id − 150; else id   ; [I] the last two: no stock case

1b. ActRewrite(u, act):                                                    [C]
     if act = 2 and u.id < nMonStats:
       u.id = 297 (natalya)       → u.id ← 382, u.type ← 2, u.mode ← 0
       u.id = 366 (compellingorb) → u.id ← 404, u.type ← 2, u.mode ← 0
     if act = 4 and 0 ≤ u.id < nMonStats:
       u.id = 514 (nihlathak)     → u.id ← 461, u.type ← 2, u.mode ← 0
       536 < u.id ≤ 539           → u.id ← 1013 − u.id, u.type ← 2, u.mode ← 0
```

Step notes:

1. The list built here is in **reverse file order**: the head is the last unit in the file. The rolls (step 3)
   walk it from the head. [C]
2. The act rewrites compare the id **after** the MonPreset mapping, so only an entry that maps into the MonStats
   range can match; a SuperUnique or MonPlace id is never rewritten. Both rewrite branches first test
   `id < nMonStats`, and SuperUnique and MonPlace ids are mapped to `nMonStats + k`
; the logged instance lists keep such units unchanged and are reproduced. [C]
 The act-2 comparisons go through `MONSTATS_ValidId`, which returns `id` when
   `0 ≤ id < nMonStats` and −1 otherwise, both compares signed; it is a range check, not an id table. Under emulation
 2 000 calls with the count and `id` across their edges (0, 1, 733, 734, −1, `INT32_MIN`, `0x7FFFFFFF`)
   gave exactly that. [C]
4. A unit's `mode` is 1 for a monster and 0 for an object (3 for an item, which no shipped preset DS1 holds): all
   48 916 type-1 units of the logged instance lists have mode 1, and all 128 951 type-2 units mode 0. [C]

5. Path points are 12 bytes, `(action, x, y)`: the 4736 points logged as 12-byte records (actions 1–5) are in the
   instance lists the preset runs reproduce. [C] `action` is 1 for every point of a DS1 below version 15; stock data has no
   such point (of 2272 shipped DS1s, the 17 with path points are all version 15 or later). [I]
 What `action` does is not read (Open questions).
6. **The branches the shipped DS1s take.** The 3394 reproduced room lists (492 files) use type 1 through the act's
   MonPreset list with kind 1, a MonStats class (262), kind 2, a SuperUnique (16), and kind 0, a MonPlace (379), and
   type 2 at version ≥ 6 with id < 150 through `g_Ds1ObjectIds` (2362); 105 paths are attached. Over all 2043 DS1 files
   that `lvlprest.bin` names these are the only branches taken: 117 paths attached and none dropped, no type-1 entry
   in a DS1 below version 5, no type-2 entry below version 6, at id ≥ 150 or mapping to −1. [C] for the branches taken,
   [I] for the skip, the drop and the other `MapId` branches, which have no stock case.

### 2. Which seed rolls, and when

Each instance rolls exactly once, on one of two seeds.

```mermaid
sequenceDiagram
  participant PRC as PresetRoomsCreate
  participant MS as PresetMapScan
  participant LS as L.seed
  participant LD as PresetRoomLoadDs1
  participant RS as R.seed (+0x14)
  PRC->>MS: before the first DRLG_RoomCreate of ps
  alt Scan or Pops non-zero
    MS->>MS: load File(idx + 1) into ps +0x0C
    MS->>LS: DropRolls, one Step per drawing unit
  end
  Note over PRC: rooms created, one level draw each
  LD->>LD: first room of ps loaded (activation or prepare)
  alt ps +0x0C still empty
    LD->>LD: load the DS1
    LD->>RS: DropRolls, one Step per drawing unit
  end
  Note over RS: then the room re-seed Init(R +0x04) (room-tiles)
```

```
2. Rolls for ps:                                                           [C]
   2a. PresetMapScan(L, ps), at room creation (README step 5a):            [C]
         if ps.rec.Scan = 0 and ps.rec.Pops = 0: return                    ; no load, no roll here
         ps.ds1 ← DS1_LoadCached(ps.rec.File(ps.idx + 1))
         DropRolls(seed: L.seed, ps)                                       ; step 3, level draws
   2b. PresetRoomLoadDs1(R), R of ps (room-tiles step 1):                  [C]
         if ps.ds1 = 0:
           ps.ds1 ← DS1_LoadCached(ps.rec.File(ps.idx + 1))
           DropRolls(seed: R.seed, ps)                                     ; step 3, R +0x14
         if ps.pending = 1: ps.pending ← 0; AddedUnits(ps, R)              ; step 4
         R.flags ← R.flags | 0x2000000                                    ; [C] (DRLG_PresetRoomLoadDs1: after all 5568 calls)
```

Step notes:

1. **The level-seed roll sits between the instance's file draw and its first room.** `PresetMapScan` runs inside
   `PresetRoomsCreate` before any room of the instance is created, so its draws come before the rooms' level
   draws (step 5). [C]
2. **The room-seed roll uses the creation seed.** `R.seed` at that point is still the value `DRLG_RoomCreate`
   left, `Step(Init(level seed low))`, whose low word is also `R +0x04`: the roll comes before the re-seed
   `Init(R.seed, R +0x04)` of [room-tiles.md](../room-tiles/) step 1, so the roll's draws change no later draw of
   that room. [C] (`DRLG_RoomCreate`: the room seed into all 571 room-seed rolls)
3. **One roll fixes every room of the instance.** The room that loads first rolls for the whole instance, so
   which room that is (an activation order input) decides only which seed is used, and that seed's draws are
   thrown away by its re-seed. [C]
4. Server and client copies each roll for their own instance, on their own level or room seed. [C]
   (client 1416 and server 794 preset rooms reproduced) With the room-seed caller the
   seed is that of whichever room of the copy loads first, so the two copies agree only when the same room loads
   first in both: in 888 server/client pairs the same room loaded first and the roll seeds and kept lists are equal;
   in 4 pairs different rooms loaded first and the roll seeds differ. [C]

### 3. The keep/drop rolls

```mermaid
flowchart TD
  U["next unit u, from the head"] --> T{"u.type"}
  T -->|"1, id < nMonStats"| M{"id in 204, 205, 371, 372?"}
  M -->|yes| D3["draw; keep iff r mod 3 = 0"]
  M -->|no| K["keep, no draw"]
  T -->|"1, SuperUnique"| K
  T -->|"1, MonPlace p"| P{"p"}
  P -->|33| D4a["draw; keep iff r and 3 ≠ 0"]
  P -->|34| D2a["draw; keep iff r and 1 ≠ 0"]
  P -->|35| D4b["draw; keep iff r and 3 = 0"]
  P -->|other| K
  T -->|2| O{"id"}
  O -->|"196, 261"| D2b["draw; keep iff r and 1 = 0"]
  O -->|581| D4c["draw; keep iff r and 3 ≠ 0"]
  O -->|other| K
  T -->|other| K
  D3 & D4a & D2a & D4b & D2b & D4c & K --> C["kept: copy + origin x5, prepend to ps +0x38"]
```

```
3. DropRolls(seed: Seed, ps):                                              [C]
     ox: i32 ← ps.x × 5;  oy: i32 ← ps.y × 5
     ps.units ← empty
     for u in ps.ds1 list, from the head:                                  ; reverse file order
       test ← KeepTest(u)                                                  ; step 3a
       if test ≠ none:
         Step(seed);  r: u32 ← seed.low                                    ; draw#n, one per drawing unit
         if not test(r): continue                                          ; dropped
       c ← copy of u: mode, id, type, flags, x + ox, y + oy,
           path with every point's (x, y) + (ox, oy)                       ; DRLG_PresetUnitCopy
       prepend c to ps.units                                               ; the kept list is in file order

3a. KeepTest(u):
     type 1, id < nMonStats, id ∈ {204, 205}       → keep iff r mod 3 = 0  ; [C] unsigned mod
     type 1, id < nMonStats, id ∈ {371, 372}       → keep iff r mod 3 = 0  ; [C]
     type 1, id − nMonStats ≥ nSuperUniques, p = id − nMonStats − nSuperUniques:
       p = 33                                      → keep iff r & 3 ≠ 0    ; [C]
       p = 34                                      → keep iff r & 1 ≠ 0    ; [C]
       p = 35                                      → keep iff r & 3 = 0    ; [C]
     type 2, id ∈ {196, 261}                       → keep iff r & 1 = 0    ; [C]
     type 2, id = 581                              → keep iff r & 3 ≠ 0    ; [C]
     anything else (SuperUniques included)         → none: kept, no draw   ; [C]
```

Step notes:

1. `Step` here is the inlined LCG step of [rng](../../spec-rng/overview/) step 1 (`seed ← low × 0x6AC690C5 + high`, 64
   bits), and `r` is the **new** low word. `mod 3` is unsigned (`mul 0xAAAAAAAB`, `shr 1`). [C]
2. The ids and their keep chances, for orientation (each test is one draw):

| Unit | Kept when | Keep chance | Tag |
| --- | --- | --- | --- |
| MonStats 204 `act2vendor1`, 205 `act2vendor2` | `r mod 3 = 0` | 1/3 | [C] |
| MonStats 371 `lightningspire`, 372 `firetower` | `r mod 3 = 0` | 1/3 | [C] |
| MonPlace 33 `place_group25` | `r & 3 ≠ 0` | 3/4 | [C] |
| MonPlace 34 `place_group50` | `r & 1 ≠ 0` | 1/2 | [C] |
| MonPlace 35 `place_group75` | `r & 3 = 0` | 1/4 | [C] |
| objects 196, 261 (floor traps) | `r & 1 = 0` | 1/2 | [C] |
| object 581 (above the objects table) | `r & 3 ≠ 0` | 3/4 | [C] |

Every row is reached in both outcomes.: MonStats 204 kept 10 / dropped 10, 205 kept 6 / dropped 14, MonPlace 34 kept 6 / dropped 4, object 581 kept 8 / dropped 4, MonPlace 35 kept 2. [C] each outcome counted once per copy that rolls: MonStats 371 kept 2 / dropped 6 (Arcane Sanctuary), 372 kept 6 / dropped 6 (Far Oasis, Lost City), MonPlace 33 kept 2 / dropped 2 (`Cott4A.ds1`, on the level seed), MonPlace 35 kept 12 / dropped 26 (Durance Level 2, Jail Level 1), object 196 kept 20 / dropped 28 (Arcane Sanctuary), 261 kept 2 / dropped 6 (Halls of the Dead Level 2). [C] The names are the tables': MonStats `Id` of rows 204, 205, 371 and 372 and MonPlace `code` of rows 33–35. [C]
3. **`place_group25/50/75` run against their names.** `place_group25` is kept with chance 3/4 and
   `place_group75` with 1/4. This is the code (`sub ecx,0x21` → `test al,3` / `je` drop),
   and the outcomes of all three match it. [C]
4. **A SuperUnique never draws**, and neither does a MonPlace row other than 33–35 or a MonStats class other than
   the four. [C]
5. The copy keeps `mode`, `id`, `type`, `flags` and the path, and adds `(ox, oy)` to `x`, `y` and every path point.
   Because the walk goes from the head of a reverse-ordered list and prepends, the kept units are back in **file
   order**. [C]
6. No difficulty, expansion or player-count test is involved: Nightmare and Hell games gave the same model. [C]


### 4. Units the game adds

```
4. AddedUnits(ps, R), once per instance (ps.pending was 1):                [C]
     if 4 ≤ ps.def ≤ 7:
       if L.id = 2 and ps.idx = 3: CentreMonster(ps)                       ; step 4a
     else if ps.def ∈ {1, 3, 26, 27, 28, 300} and R.flags & 0x40000:       ; client copy only
       ClientRiverObjects(ps)                                              ; step 4b

4a. CentreMonster(ps):                                                     [C]
     prepend {type 1, id: (nMonStats > 266) ? 266 : −1, mode 1, flags 0, path none,
              x: (ps.x + ps.w ÷ 2) × 5, y: (ps.y + ps.h ÷ 2) × 5} to ps.units  ; no draw

4b. ClientRiverObjects(ps):                                                [C]
     every unit below: type 2, mode 0, flags 1, path none; prepend each in creation order
     Column(xt, yt):  for ys ← yt × 5; ys < (yt + ds1.size_y) × 5; ys ← ys + 40:  object 65 at (xt × 5, ys)
     Rows(c):  j: i32 ← 0
       while j < ps.h:
         for k in 0 ..< 5: object (40, 41, 41, 41, 42)[k] at ((ps.x + c) × 5 − 5 + 5k, (ps.y + j) × 5)
         cell: u32 ← ds1.floor0[j × (ps.w + 1) + max(c, 0)]
         if (cell >> 20) & 0x3F = 4 and (cell >> 8) & 0xFF ∈ {0, 4, 8, 16, 29, 39}: j ← j + 3
         j ← j + 1
     if ps.def = 27:  Column(ps.x, ps.y);  Rows(−1)
     else:
       c: i32 ← 0
       while c < ps.w:                                                     ; the DS1's first row of floor layer 0
         cell ← ds1.floor0[c]
         if (cell >> 20) & 0x3F = 2 and (cell >> 8) & 0xFF = 24:
           Column(ps.x + c + 1, ps.y);  Rows(c);  c ← c + 4
         c ← c + 1
```

Step notes:

1. **The centre monster** (MonStats 266, `navi`) is added only in the Blood Moor (level 2) for an instance of `Def`
   4–7 with file index 3. `÷ 2` is signed and the sizes are positive. It goes to the instance list after the rolls,
   with no draw: 4 instance lists after `PresetRoomLoadDs1` (map seed 45, `Def` 7, and map seed 9, `Def` 5, both
   copies each) equal the model's, and the room seeds around them are unchanged. [C]

2. **The client river objects are presentation** (ambient river objects 40, 41, 42, 65). They exist only in the
   client copy's lists, which is why a reimplementation of the client copy's room lists needs them. Every one has
   `flags` bit 0, so the server skips such a unit (step 6). No draw. The runs reproduced them for `Def` 1, 26 and 27,
   and for the other three on the client copy: `Def` 3 (Town Transition S, map seed 9) 1
   list, `Def` 28 (the bridge, Blood Moor and Black Marsh) 4, `Def` 300 (Tristram) 1. [C]
 What they look like or do on the client is outside this project.
3. **The row skip** (`j ← j + 3` in `Rows`) fired 5 times, each logged and
   equal to the modelled one: Act I town, `Def` 1 file index 1 (`TownE1.ds1`), DS1 row 15, floor main 16. [C]
 In the shipped DS1s only
   `TownE1.ds1` and the three `Bridge*.ds1` of `Def` 28 hold such a cell in a placed column, so the other five mains
   rest on the switch table. [I]
4. `ps.pending` is 1 from `PresetInstanceCreate` and cleared here, so the added units are made once per instance
   whichever room loads first. [C] (`DRLG_PresetRoomLoadDs1`: 3334
   instance lists checked after `PresetRoomLoadDs1`) The `0x2000000` room flag is set on every call: none of the
   141 130 logged type-2 rooms has it at creation, and it is set after every one of the 5568 calls. [C]


### 5. From the instance to the room

```
5. PresetUnitsToRoom(R, ps), in the type-2 grid prepare:                   [C]
     (rx, ry, rw, rh): i32 ← R.rect × 5                                    ; subtiles
     for u in ps.units, from the head:
       if rx ≤ u.x < rx + rw and ry ≤ u.y < ry + rh:                       ; half-open
         unlink u from ps.units
         u.x ← u.x − rx;  u.y ← u.y − ry                                   ; path points are not moved
         prepend u to R.units                                              ; R +0x5C
```

Step notes:

1. The test is half-open (`RectContains`): a unit on a room's right or bottom edge belongs to the
   next room. [C]
2. **Path points keep instance coordinates** (absolute subtiles), while the unit's own `x`, `y` become
   room-relative. [C]
3. Moving prepends, so a room's units are in **reverse** instance order: for a room that takes all of an
   instance's units, reverse file order. [C]
4. **A re-prepared room keeps its list.** The prepare runs again when a room is built again (108 rooms in the run,
   in both copies). The room list still holds the room's previous list, and the instance list has already lost
   those units, so the second pass moves nothing. In 34 of those rooms other code had prepended 1 or 3 units in
   between (step 6, note 2). [C]
   In 19 monster units the path pointer had become null between the two prepares. [C]
   On the server copy the detach is `PresetUnitSpawn`'s: it moves the unit's path (`+0x10`) into the new monster's AI
   control with `PtrMove`, which zeroes the source (49 moves logged). [C]
   The client copy's detach is not found (*Open questions*).

### 6. Handover to the server spawners (boundary)

This spec's output ends at the room list. The rest of this section names what the next rows receive.

- [C] `RoomPresetUnits` walks the room list twice: first every unit that is not a monster, then the
  monsters (all 373 walks with spawns).
- [I] It skips a unit whose `flags` bit 0 is set. That covers the client river objects
  (step 4b) and the DS1 units with `flags = 1` (`wstone01.ds1` `worldstoneeffect`), which therefore never spawn on
  the server. No flagged unit reached a server walk in the run: the river objects exist only in the client copy.

- [I] **A kept `place_group` unit places nothing in `PresetMonSpawn`.** The function's MonPlace switch returns 0 with
  no call for `place_group25` to `place_group100` (rows 33–36), as for the other rows listed in
  [monsters/special § H](../../spec-monsters/special/#h-monplace-presets), so the keep/drop roll of step 3 decides only
  whether the unit stays in the room list. The scope is `PresetMonSpawn` reached through `PresetUnitDispatch`, which
  returns its result with no fallback; both the first spawn and the inactive restore reach it that way. The four other
  callers of `PresetMonSpawn` and any other reader of the room's preset list are not followed.

- [I] Type 2 with `id = 573` goes to nothing; no logged unit has that id, and there is no stock case (the next two
  statements).
- [C] **No shipped DS1 gives a 573.** `g_Ds1ObjectIds` holds 573 only at Act IV (act index 3) ids 5, 6 and 7; a raw id
  of 150 or more would need a raw 723, and the act rewrites give only 382, 404, 461 and 474–476. Of the 2 276 DS1 files
  under `data/global/tiles`, 2 274 parse (all 2 043 that `LvlPrest` names among them); their 15 109 type-2 units end at
  no 573 (the largest ids are 580–582), and the Act IV ones never use raw ids 5–7. The two that do not parse (an `LvlSub`
  file of Act I and an unreferenced one) belong to acts whose table holds no 573, so only a raw id of 723 could give
  one there.
- [I] The other code that adds type-2 units to a room list adds none with id 573: of the 12 `PresetUnitCreate` call
  sites, the client presets use ids 40–42 and 65, the `Orient89Unit` rows reached hold ids up to 449, the warp and
  centre-monster sites make other types, the substitution copy is covered by the survey above, and the one other
  type-2 creator has no caller.
- [C] Levels 133–136 add filters to the walk, as the code's map up to the first `PresetUnitSpawn` of the walk. In the first pass (every unit that is not type 1 and has flags bit 0 clear): level 136 skips type-2 objects 26, 268 and 269; levels 133 and 135 skip object 397; level 134 skips object 402 and increments the per-game counter `game +0x1DE4` for any other type-2 object, skipping the one where the new value equals `game +0x7C mod 3 + 3`, unsigned. The second pass (type 1) does not run on level 136. Past the first spawn, the callee and reach are not covered.

Step notes:

1. **The record handed over** is the 0x20-byte `PresetUnit`: `type`, `id` (MonStats class, `nMonStats + row` for a
   SuperUnique, `nMonStats + nSuperUniques + row` for a MonPlace keyword, or an object row), `mode`, `x`/`y` in
   subtiles relative to the room, `flags`, and the path with absolute points. Every logged list is read from these
   fields, and all 3394 room lists and the instance lists are reproduced. [C]
2. **Units other code adds are an input of the walk, not output of this spec.** After `PresetUnitsToRoom`, other
   code prepends units to `R +0x5C`: objects 14–16, 23–25, 27, 64 and 449 and type-5 units, one of them from
   `Orient89Unit` (caller). In all 689 walks the list this spec produces was the exact
   **tail** of the walked list, and those units were the head. Their owners are `objects` and `drlg/warps`. [C]
 The room's list is dispatched only by
   `RoomPresetUnits`, which runs only while the active room's flags bit 0 is clear, and a re-activated room inherits
   that bit from the DRLG room's `+0x60`; so a re-activated room does not dispatch its list twice, and the added
   objects and type-5 units come back from the unit records. [I]

### 7. Level 27's file index

```
7. In LevelLinkBuild, while it handles linked level 6, with link value v:
     ps27 ← LevelEnsure(act, 27).presetData
     v = 3:  Step(actSeed);  r: u32 ← actSeed.low;  ps27.idx ← (~r) & 1     ; [C] one act draw
     v = 1:  Step(actSeed);  r: u32 ← actSeed.low;  ps27.idx ← 2 − (r & 1)  ; [C] one act draw, r & 1 = 1 → 1
                                                                          ; [I] r & 1 = 0 → 2: not reachable on stock data, step note 2
     other v: no draw, no write                                           ; [C]
```

Step notes:

1. Level 6 is Act 1 Wilderness 5 and level 27 is Courtyard 1 (by `Levels.txt` `Name`);
   `v` is the link value the `LinkPick` callbacks chose for level 6: the link builder model predicts it, 3 in 17
   logged builds, 1 in 4 and 0 in 6. [C]
3. **Where this draw falls in the act seed's sequence is `drlg/warps`'.** The draws before it are `LevelLinkBuild`'s,
   and the link builder model predicts the act seed before the draw from the map seed: all 394 logged `LevelLinkBuild`
   calls (seed in, seed out, rects) and the 40 index writes match. [C]
4. This write is one of the overrides that let a preset's index differ from its own `Range(Files)` draw
   (step note 6); the level's build then uses it. [C]

### LvlPrest columns

What each column does beyond the file choice and the tile build. **None of these readers draws.** [C] (no LCG constant; k is checked on all 5098 type-2 rooms the roomk model built, 1475 floods and 187 `Animate` rooms among them, and the level seed after every preset build:)

| Column (record offset) | Effect | Reader | Tag |
|---|---|---|---|
| `Populate` (`+0x08`) | 0 sets room flag, for which `RoomPopLevelId` returns 0: no **random** population. Preset units still spawn | — | [C] |
| `Logicals` (`+0x0C`) | selects the room's logic-region builder: 0 → `LogicBoxSingle` (logic flags bit 0), 1 → `LogicRegionsFromDs1` (flags bit 1). What the builders produce is `drlg/collision`'s | — | [C] |
| `Outdoors` (`+0x10`) | ORs `0x80000` into each room's flags (set at creation in exactly the 119 183 logged rooms with `Outdoors` 1, [C]); `RoomIsOutdoors` returns that bit for a preset room (1 for an out room), so it marks the room outdoors for that test, whose two callers are the client's room change and a server skill walk (note 8) | — | [I] |
| `Animate` (`+0x14`) | builds the animated-tile frame lists and sets room bit `0x8000000` (presentation): the bit is set in exactly the rooms whose `Animate` is 1 (104 with, 3540 without) | — | [C] |
| no column (`+0x024`) | the animation frame period, 0 meaning 80 (read only); 0 in all 1091 records | — | [C] value / [I] meaning |
| `KillEdge` (`+0x18`), `FillBlanks` (`+0x1C`) | tile build, [room-tiles.md](../room-tiles/): 3736 and 4911 rooms built with them set match, and ignoring either breaks the logs | — | [C] |
| `AutoMap` (`+0x30`) | gates the act callbacks `+0x454`/`+0x488`, which are null on the server and drive the client automap (presentation): client towns 40, 103, 109 call `+0x488` once, other `AutoMap` 1 levels `+0x454` per room, `AutoMap` 0 neither, the server neither | — | [C] |
| `Scan` (`+0x34`) | with `Pops`, selects the level-seed roll (step 2a) and the map scan | `DRLG_PresetMapScan` | [C] |
| `Pops` (`+0x38`) | with `Scan`, as above; also the capacity of the roof-pop tables (presentation) | `DRLG_PresetMapScan` | [C] |
| `PopPad` (`+0x3C`) | read only by the client's roof-pop update (presentation) | `DRLG_PresetPopsUpdate` | [C] |

Notes:

1. **`Populate` 0 is not "no units".** In Harrogath and the Pandemonium Fortress (`Populate` 0) `RoomPopLevelId`
   returned 0 on all 241 calls, and 48 preset monsters were created there. [C] The community guides say the opposite; they are wrong for 1.14d.
2. **`Populate` is not the only writer.** `DRLG_RoomNoPopNearTown` sets it on a room outside a
   town whose neighbour room is in a town level (levels 1, 40, 75, 103, 109): 22 flag sets in the
   run. [C]
3. `HiddenWarpTilesAdd` sets the bit too, on a room with hidden warp tiles: its calls
   match the model's hidden-warp cells room by room (25 rooms), and each of those rooms has at the tile
   build's exit, in 17 of them not set before. [C] The population that reads the flag is `monsters/spawn`'s.
4. **`Logicals`: this spec states the selection only.** The run checked the logic flag bit against `Logicals` on
   1540 preset rooms. [C] The region
   flood (`LogicRegionsFromDs1`, `LogicBoxesFromGrid`, `LogicWallBoxes`), the
   server's spawn boxes and the client's wall cut-away (`WallCutawayTest`) that read it are not
   specified here. The flood belongs to `drlg/collision`, which confirms it, and the spawn read to `monsters/spawn`
   (`LogicRegionIdAt`, predicted). [C] The cut-away is presentation. [I]

5. **`Scan`/`Pops` map scan, beyond the rolls.** The scan also turns wall cells of orientation 10/11 into warp-slot
   bits, collects the style 30–33 cells (warp markers) into level `+0x2C`, and sets the waypoint bits `0x30000` on the
   cells of objects whose record has `+0x167` bit `0x40` (the waypoint flag, step 6 note 3). All three are `drlg/warps`'
   inputs, and its reader predicts them ([warps.md § D](../warps/#d-room-flags-and-level-points-from-a-preset-instance),
   21728 rooms). [C]
7. **Type-2 rooms never read DS1 substitution data.** No code reads a preset instance's DS1 substitution layer or
   groups; the only group reader loads the DS1 an `LvlSub` record names. The groups in `LvlPrest` DS1s are dead
   data, and `LvlSub` with DS1 (e) belongs to `drlg/outdoor`. [I]
8. **Who reads `0x80000`.** `RoomIsOutdoors` returns 1 for an out room and `flags & 0x80000` for a preset room, and is
   reached through `DungeonRoomIsOutdoors`. The client's room change stores the result in a global no
   instruction reads by address (presentation); the server's caller is a walk in the skill code that an
   outdoors room ends (skills are out of scope). [I]
9. **Level 17's wall points are built and never read.** For a room of level 17 (a level test, not a
   `Def` test) `PresetRoomTilesBuild` calls `L17WallPointsRecord`, which records up to six points `(x·5 + 2, y·5 + 2)`
   (subtiles) of the wall-layer-0 cells with main index 10 and sub-index 23–27 at preset room data `+0xF0` (count
   `+0xF4`), with no draw. The only getter, `PresetRoomL17Points`, has one caller, `DungeonRoomL17Points`, which has no
   call, jump or pointer to it, so the list is freed unread. [I]

### Boundaries

| Boundary | What crosses it | Owner | Tag |
| --- | --- | --- | --- |
| `RoomPresetUnits` | room list `+0x5C` (this spec's output) → monster and object spawns | `monsters/spawn`, `monsters/special`, `objects` | [C] |
| `SUnitCreate` | object instantiation | `objects` | [C] |
| units prepended to `+0x5C` after step 5 | input of the server walk (step 6 note 2) | `objects`, `drlg/warps` | [C] |
| act seed before the level-27 draw | input of step 7 | `drlg/warps` | [C] |
| path detached between two prepares | a monster unit's path pointer | `monsters/spawn` | [C] |
| logic-region builders selected by `Logicals` | the room's regions and boxes | `drlg/collision` | [C] |
| map scan warp markers (level `+0x2C`), warp-slot bits, waypoint bits (objects record `+0x167` bit `0x40`) | style 30–33 cells, orientation 10/11 cells, waypoint objects | `drlg/warps` | [C] |

- [C] Each row tagged `[C]` above is one a run checked at that point: the walk's tail, the re-prepare tail, the
  logic flag bit; the act seed and the map scan's outputs through the link builder and
  `drlg/warps` § D; object instantiation through `objects`' confirmed dispatch.


## Outputs

- Per preset instance, the kept unit list (`+0x38`), in file order with absolute subtile positions, after the
  rolls and the added units; it is drained by step 5. [C]
- Per DRLG room of the instance, its unit list (`+0x5C`): the instance units inside its rectangle, room-relative,
  prepended (step 5). This is what `RoomPresetUnits` receives, after any units other code adds. [C]
  (`DRLG_PresetUnitsToRoom`: 2210 preset room lists, 1088 with units)
- The seed the rolls leave: the level seed (which the instance's room creations continue from) or the room seed
  (overwritten by the room's re-seed). [C]
- Level 27's file index (step 7). [C]
- Room flag for `Populate` 0 (§ LvlPrest columns). [C]
- Room flags `0x80000` for `Outdoors` and `0x2000000` once the DS1 is loaded (step 2b). [C]


## Worked example

| Item | Value |
|---|---|
| instance | `Def` 267, level 35 (Catacombs Level 2), file index 0 → `Act1\Catacomb\CatNE.ds1` (version 18, act 0, 12 × 12) |
| rect | (4536, 1348), 12 × 12 tiles: a single room (maze room ≤ 12 × 12, step 9) |
| `Scan`, `Pops` | both 0, so the first room to load rolls on its room seed (step 2b) |
| room seed at the roll | `653A205E:685C5276` (logged) = `Step(Init(FA35BAF4))`, `FA35BAF4` being the level seed's low word after `DRLG_RoomCreate`'s level draw (recomputed); `R +0x04 = 653A205E` |
| `nMonStats + nSuperUniques` | 734 + 66 = 800 |

DS1 in (file order) and the mapped units (step 1):

| File entry | `type` | DS1 `id` | Unit after step 1 | `x`, `y` (subtiles) |
|---|---|---|---|---|
| 1 | 2 | 28 | object 82 (`g_Ds1ObjectIds[0][28]`, "bubbling pool of blood") | 15, 28 |
| 2 | 2 | 20 | object 34 ("Candles2") | 9, 35 |
| 3 | 2 | 20 | object 34 | 9, 20 |
| 4 | 1 | 31 | MonPreset act 0 entry 31, MonPlace row 34 `place_group50` → id 834 (mode 1) | 16, 41 |

The rolls walk the list from its head, entry 4 first (step 3). `ox = 4536 × 5 = 22680`, `oy = 1348 × 5 = 6740`.

| Walk | Unit | Draw | Seed after | `r` | Test | Result |
|---|---|---|---|---|---|---|
| 1 | 834 (MonPlace 34) | #1 | `F5001ACC:2A38959A` | `F5001ACC` | `r & 1 ≠ 0`: `F5001ACC & 1 = 0` | dropped |
| 2 | object 34 at (9, 20) | — | | | | kept → (22689, 6760) |
| 3 | object 34 at (9, 35) | — | | | | kept → (22689, 6775) |
| 4 | object 82 at (15, 28) | — | | | | kept → (22695, 6768) |

Instance list out (head first, file order): object 82 (22695, 6768), object 34 (22689, 6775), object 34 (22689,
6760). `Def` 267 adds nothing (step 4). `PresetUnitsToRoom` moves all three into the one room, room-relative and
prepended, so the room list is (head first): object 34 (9, 20), object 34 (9, 35), object 82 (15, 28), all type 2,
mode 0, flags 0, no path. The room's later re-seed is `Init(653A205E)`, so the draw above changes nothing else.
The same instance was built twice in that game, in both copies, with the same seed, draw and lists. [C]


**Level-seed rolls in Lut Gholein (`Def` 301).** Two drawing units, walked in reverse file order, so the order of
the two draws depends on the file:

| Log | File | Level seed in | Draws (unit, `r`, `r mod 3`) | Kept |
|---|---|---|---|---|
| — | `Act2\Town\LutW.ds1` | `015B2E9F:0000029A` | 204 `3A5E52F5` 2; 205 `954E7521` 2 | neither |
| — | `Act2\Town\LutN.ds1` | `D58D244C:0000029A` | 205 `44CFB116` 0; 204 `3385BAE3` 0 | both |

The seed after the rolls is the second draw's (`954E7521:1858544F` and `3385BAE3:1CB35EE0`). [C]


## Reimplementation notes

- **Walk from the last file entry.** The rolls draw in reverse file order; walking the file forwards draws the same
  number of times but tests each `r` against the wrong unit when an instance has two drawing units. [C]

- **`place_group25` keeps 3/4 and `place_group75` keeps 1/4.** Don't "fix" them to match the names. [C]
 The roll still has to be made: a kept unit places nothing in
  `PresetMonSpawn` (§ 6), but the draw moves the seed. [I]
- **Roll once per instance, not per room.** A preset split into many rooms draws only on the first room that loads,
  and only when the map scan has not already rolled on the level seed. [C]
- **The level-seed roll shifts every later room of the level.** With `Scan` or `Pops` set, each drawing unit is
  one level draw before the instance's rooms are created, so their `+0x04` values depend on the DS1's content.
  [C]
- **The room-seed roll is invisible in the room's draws**, but its outcome still decides the units of every room of
  the instance. Use the creation-time room seed, not the re-seeded one. [C]
- **Keep path points absolute.** Only the unit's own position becomes room-relative. [C]

- **`Populate` 0 does not suppress preset units.** [C]
- **The client copy has more units.** The river objects are added only when the room has the client flag; a
  server-side reimplementation omits them, a client-side one adds them with `flags` bit 0. [C]

- **A re-prepared room is not emptied.** Don't clear the room list before step 5; the second pass adds nothing and
  the previous list stays. [C]
- **No shipped DS1 is cut two ways.** Every file named by two `LvlPrest` records is used by records of the same kind
  and size, so the shared DS1 buffer's `0x84` border marks are the same in every view (the [room-tiles.md](../room-tiles/)
  open question on shared-cache writes does not arise with the shipped data): `tri_town4` is a 43 × 48 preset level
  both times, `lake1` one 8 × 8 outdoor room, and the Maggot Lair files 10 × 10 maze rooms in levels whose `LvlMaze`
  size is 10 × 10, so the single-room test takes them whole. [C]

## Evidence

- Formats and tables: ds1, LvlPrest,
  MonPreset, MonStats, MonPlace.
- [room-tiles.md](../room-tiles/), [rng](../../spec-rng/overview/), [rng/seeds](../../spec-rng/seeds/).
