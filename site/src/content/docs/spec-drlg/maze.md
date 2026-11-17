---
title: "Maze generator: room growth, `Def`s, special rooms and themes"
sidebar:
  order: 4
---

## Purpose

A `DrlgType` 1 level is built from **maze rooms**. They are DRLG rooms of one `LvlMaze` size, laid edge to edge on
the level's tile grid. Each gets a `LvlPrest` `Def` from its exits, and some a forced file index. This spec covers
the generator from the first room to the room list that
[drlg/overview](../overview/) step 9a then converts into preset instances. It replaces the maze oracle that the overview
used to have. It gives the growth loop, the extra links (`Merge`), the special rooms (stairs, waypoint, quest rooms)
that replace dead ends, the fixed shapes of some level types, the placement on the level rectangle (and the two levels
placed against a neighbour level), and the theme pass. Every draw is listed with its seed, in order. The draws come
from the level seed and from the maze rooms' own seeds. Primitives (`Step`, `Range`, `Init`) are those of
rng. The level and room seeds are those of rng/seeds steps 4–5. Which warp
each special room carries, and the level links, are in [warps.md](../warps/).

## Entry points

| When | Function | Tag |
|---|---|---|
| Maze level record created (the `LvlMaze` row by level id); no draw (in all 1378 logged maze-level creations the level seed after the create dispatch is `Init(base + id)`) | — | [C] |
| Maze level built, from `LevelInit` after the re-seed | — | [C] |
| Conversion of each maze room into a preset instance (boundary of this spec) | [drlg/overview](../overview/) step 9a | [C] |

- [I] With no matching row `LvlMazeByLevel` stops the game with a fatal error. Stock data has no such case: no maze level
  lacks a row.

## Inputs

### Tables

| Anchor | Used for |
|---|---|
| `LvlMaze.txt:Level` | row key (`+0x00`), first match |
| `LvlMaze.txt:Rooms` | `Rooms`, `Rooms(N)`, `Rooms(H)` at `+0x04 + 4·difficulty`: the target of random growth (§ C) |
| `LvlMaze.txt:SizeX`, `LvlMaze.txt:SizeY` | `+0x10`/`+0x14`: the size of every maze room of the level |
| `LvlMaze.txt:Merge` | `+0x18`: per-mille chance of an extra link to an edge-sharing room (§ B6) |
| `Levels.txt:LevelType` | the level type (level `+0x1C0`): selects the chain (§ F), the `Def` base (Constants) and the theme pass |
| `LvlPrest.txt:Def` | the record blocks the `Def`s name; see LvlPrest § Maze presets |

### Runtime state

| State | Type | Owner offset | Source |
|---|---|---|---|
| level seed `L.seed` | `Seed` | level `+0x1C4` | re-seeded by `LevelInit` ([drlg/overview](../overview/) step 2) |
| level id, level type | `u32` | level `+0x1D0`, `+0x1C0` | leveldefs |
| level rectangle `L.rect` (tiles) | `{x, y, w, h}` `i32` | level `+0x1C`–`+0x28` | [warps.md § C](../warps/#c-level-rectangles-and-the-links-after-the-layout) |
| level room list, count | list, prepended (next at room `+0x24`); `i32` | level `+0x10`, `+0x08` | this spec |
| maze room seed `R.seed` | `Seed` | DRLG room `+0x14` | `DRLG_RoomCreate` (rng/seeds step 5) |
| maze room rect | `{x, y, w, h}` `i32` | DRLG room `+0x34` | this spec |
| maze room adjacency | list of `{room, dir}`, prepended | DRLG room `+0x00` (`RoomAdj+0x04` is `dir`) | this spec |
| maze room `Def`, forced index, lock | `i32`, `i32`, bit 1 | `MazeRoomData+0x00`, `MazeRoomData+0x04`, `MazeRoomData+0x0C` | this spec |
| difficulty | `u32` 0..2 | act `+0x450` | game |
| act index (0-based) | `u32` | act `+0x480` | game |
| the two Act II tombs | `u32` level ids | act `+0x094` (the true tomb), `+0x484` | rng/seeds step 3c |
| level 27's preset file index, level 27's rect (level 28 only) | `i32`; rect | level 27 | [warps.md](../warps/) (the link builder's level-6 draw on Black Marsh sides 1 and 3, else level 27's create-time index) |
| level 108's rect (level 107 only) | rect | level 108 | [warps.md § C](../warps/#c-level-rectangles-and-the-links-after-the-layout) |

### Constants

| Name | Value | Anchor | Tag |
|---|---|---|---|
| direction codes | 0 W, 1 N, 2 E, 3 S; 4 NW, 5 NE, 6 SE, 7 SW (diagonals only in `MazeFillAround`) | — | [C] |
| exit mask bits | W 1, E 2, S 4, N 8 | — | [C] |
| `Def` base by level type (`DefFromExits`) | 3 `0x34`, 4 `0x6C`, 7 `0xA7`, 8 `0xCD`, 10 `0x101`, 13 `0x12D`, 17 `0x19D`, 18 `0x1E1`, 19 `0x1FD`, 22 `0x2F1`, 24 `0x298`, 25 `0x2C0`, 28 `0x344`, 34 `0x422` | — | [C] |
| type 33 (Ice) | `Def = mask` when `Rooms[diff] = 1`, else `0x3EA + mask` | — | [C] |
| corner tables (types 14, 15, 23, 32) | by mask: 14 Harem SW 356, SE 355, NW 357, NE 354; 15 Basement SW 360, SE 359, NW 361, NE 358; 23 Spider SW 659, SE 660, NW 661, NE 662; 32 Temple SW 1045, SE 1044, NW 1043, NE 1042; every other mask 0 | — | [C] |
| type 35 (Act V lava) mask table | N 1053, S 1054, E 1055, W 1056, EW 1057, NS 1058; every other mask 0 | — | [C] |
| theme types and bases | 3 `0x34`, 4 `0x6C`, 7 `0xA7`, 8 `0xCD`, 10 `0x101`, 13 `0x12D`, 17 `0x19D`, 22 `0x2F1`, 24 `0x298`, 25 `0x2C0` | — | [C] |
| tee Prev records | type 17: 447, 444, 446, 445; type 34: 1075, 1077, 1076, 1074 (index 0..3) | — | [C] |
| Act V hell start entries | 4 × `{Def, dir, idx} ×2` (§ E5) | — | [C] |
| filler record | 836 `Act 4 - Lava X` | — | [C] |

- [C] The base table of `DefFromExits` is the rotation base of `MazePresetFile` ([drlg/overview](../overview/)
  Constants), with 0x1FD (Arcane) added here. The values 0x3EA and 0x41C are used only by `MazePresetFile`.

- [C] No expansion or classic flag enters the maze code. One model with no mode input reproduces 46 classic windows
  (levels 9, 56, 65, 84, 86, 92, 100, 107) and the expansion windows of the same levels.


## Algorithm

```mermaid
flowchart TD
  r0["R0 = DRLG_RoomCreate: 1 level draw (before the window)"] --> start["start shape (§ E): none, ring, tee, catacombs, arcane, hell, single room"]
  start --> grow["random growth to Rooms[diff] (§ C)"]
  grow --> fin["finisher (§ F): r = draw, specials Prev / Next / Down / Waypoint / quest (§ D)"]
  fin --> place{"level id?"}
  place -->|"28"| bar["MazeBarracksPlace against level 27 (§ G2)"]
  place -->|"107"| rof["MazeRiverOfFlame against level 108 (§ G3)"]
  place -->|"other"| def["MazeLevelPlace: shift to the level origin (§ G1)"]
  bar & rof & def --> th["MazeThemes: lock some rooms as Def + 15 (§ H)"]
  th --> conv["MazeLevelRooms per room, newest first (drlg/overview 9a)"]
```

Notation: `L` the level, `L.seed` its seed, `L.rooms` its room list (newest first), `L.count` its length. `R.seed` is a
maze room's own seed. `Step(s)` advances seed `s` once and returns its new low word (`u32`). `Range(s, n)` is the
guarded range of rng: `n < 1` gives 0 with no draw, otherwise one `Step`, then `lo & (n − 1)` for a
power of two or `lo mod n` (unsigned). A **level draw** is a `Step` of `L.seed`; a **room draw** is a `Step` of a maze
room's seed. Rects are in tiles. `÷` truncates toward zero.

### A. The window

```
A1. MazeLevelBuild(L):                                               [C]
      R0 ← RoomCreate(L)                                             ; B1: one level draw, before the window
      R0.x ← L.x + (L.w − R0.w) ÷ 2;  R0.y ← L.y + (L.h − R0.h) ÷ 2   ; centred
      LevelRoomLink(L, R0)                                           ; prepend
      ── window start (seed after R0's draw) ──
      chain of L's level type (§ F): start shape, growth, finisher
      if L.id = 28: MazeBarracksPlace(L)                             ; § G2
      else if L.id = 107: MazeRiverOfFlame(L)                        ; § G3
      else: MazeLevelPlace(L)                                        ; § G1
      MazeThemes(L)                                                  ; § H
      ── window end ──
      for M in L.rooms (newest first): MazeLevelRooms(L, M)          ; drlg/overview 9a
```

- [C] The run checked, per window, every level draw against a hardware watchpoint on the level seed (12388 draws), the
  room list in list order with absolute rects, `Def`s and forced indices, and the seed after the window: 230 windows,
  41 maze levels, all 20 maze level types, 0 mismatches.
- [C] R0's centred position cancels out: every placement path of § G translates all rooms by an offset computed from
  the rooms' own positions. So only the relative layout and the level rect decide the final rects. The 230 windows were
  replayed with R0 moved off the centre by (37, −53), (−1000, 999) and (4096, 4096): every absolute rect, `Def`, index and
  level-seed step still match (moving the second room by one tile instead gives 3019 mismatches).


### B. Primitives

```
B1. RoomCreate(L) → R:                                               [C]
      Step(L.seed)                                                   ; level draw
      R.seed ← Init(L.seed.low);  Step(R.seed);  R[+0x04] ← R.seed.low ; rng/seeds step 5
      R.w, R.h ← LvlMaze.SizeX, LvlMaze.SizeY
      R.def ← 0;  R.idx ← −1;  R.locked ← false;  R.adj ← empty

B2. Gap(A, B) → (gx, gy): i32                                        [C]
      gx ← (A.x < B.x) ? B.x − A.w − A.x : A.x − B.w − B.x;  gy likewise on y, h
      overlap(A, B) ⇔ gx < 0 and gy < 0                              ; rooms that only touch do not overlap

B3. Place(R, P, d) → bool:                                           [C]
      (R.x, R.y) ← d = 0: (P.x − P.w, P.y)        1: (P.x, P.y − P.h)
                   d = 2: (P.x + P.w, P.y)        3: (P.x, P.y + P.h)
                   d = 4: (P.x − P.w, P.y − P.h)  5: (P.x + P.w, P.y − P.h)
                   d = 6: (P.x + P.w, P.y + P.h)  7: (P.x − P.w, P.y + P.h)
      if overlap(R, Q) for any Q in P.adj: return false
      if overlap(R, Q) for any Q in L.rooms with Q ≠ R, Q ≠ P: return false
      return true                                                    ; no test against L.rect

B4. AdjLink(A, B, d):                                                [C]
      prepend {B, d} to A.adj unless B is already in A.adj
      prepend {A, (d − 2) & 3} to B.adj unless A is already in B.adj

B5. DefFromExits(R):                                                 [C]
      mask: u32 ← OR over R.adj of {0: 1, 1: 8, 2: 2, 3: 4}[dir]     ; diagonal links add nothing
      idx: i32 ← −1
      by L's level type:
        based types: def ← base + mask                               ; mask 0 gives base itself
        33: def ← (Rooms[diff] = 1) ? mask : 0x3EA + mask
        14, 15, 23, 32: def ← corner table[mask];  35: def ← lava table[mask]
        15 extra: L.id = 52 and def = 361 → idx ← 2;  L.id = 54 and def ∈ {361, 359} → idx ← 3
        23 extra: L.id = 84 and def = 662 → def ← 664;  L.id = 85 and def = 661 → def ← 663
        any other type: fatal
      if def ≠ 0: R.def ← def;  R.idx ← idx;  R.locked ← false        ; def 0 leaves the room unchanged

B6. Merge(R):                     ; R is new and not yet in L.rooms  [C]
      if R.locked: return
      for P in L.rooms (newest first), P not locked:
        (gx, gy) ← Gap(R, P)
        if gx < 1 and gy < 1 and gx ≠ gy and P not in R.adj:         ; shares an edge, not a corner
          v: u32 ← Step(P.seed) mod 1000                             ; room draw on P, unsigned mod
          if (i32) v < LvlMaze.Merge:                                ; signed compare
            d ← RectAdjDir(P, R)                                     ; side of P that R touches, or −1
            if d ≠ −1: AdjLink(P, R, d);  DefFromExits(P)

B7. Grow(P, d, merge = true) → R | none:                             [C]
      R ← RoomCreate(L)                                              ; level draw, spent even on failure
      if not Place(R, P, d): RoomFree(R); return none
      AdjLink(P, R, d)
      if merge: Merge(R)
      LevelRoomLink(L, R)                                            ; prepend
      DefFromExits(P);  DefFromExits(R)
      return R

B8. AddFixed(P, d, def, idx, recalcParent) → R | none:               [C]
      R ← RoomCreate(L);  if not Place(R, P, d): RoomFree(R); return none
      AdjLink(P, R, d);  LevelRoomLink(L, R)                         ; no merge
      if recalcParent: DefFromExits(P)
      R.locked ← true;  R.def ← def;  R.idx ← idx

B9. Probe(R, d) → bool:          ; "can R grow in d"                 [C]
      if R.locked or R.adj has a link with dir d: return false       ; no draw
      T ← RoomCreate(L)                                              ; a real room: one level draw
      if not Place(T, R, d): RoomFree(T); return false
      AdjLink(R, T, d);  LevelRoomLink(L, T);  DefFromExits(T)
      RoomFree(T)                                                    ; unlinked from R and from L
      return true

B10. Find(d) → room | none:       ; FindWest/North/East/South         [C]
      key ← d = 0: x (lowest);  1: y (lowest);  2: −x (highest x);  3: −y (highest y)
      best ← none
      for R in L.rooms (newest first):
        if best = none or key(R) < key(best):                        ; strictly better only
          if Probe(R, d): best ← R
      return best
```

Step notes:

- B3. [C] The parent's own `w`/`h` set the offset. Every maze room has the `LvlMaze` size, the fixed `Def`s of levels 28
  and 107 included.
- B5. [C] `DefFromExits` is called with "unlock" at every call site, so it also **clears the lock** and resets the forced
  index (except for the two Basement levels). Basement 1 (52) takes `File3` of `Basement NW` (361). Basement 3 (54)
  takes `File4` of `Basement NW`/`Basement SE`. The two Spider substitutions give Spider Cavern (84) and Arachnid Lair
  (85) their `Spider Chest` rooms. (52, 54,
  84, 85)
- B6. [C] **The merge draw is made whatever `Merge` is.** With `Merge` 1000 every edge-sharing pair links, and with
  `Merge` 0 none does, but each candidate's seed is still stepped. That step changes the next growth direction drawn
  from that room (§ C).
- B6. [C] A merge seen from R skips rooms already in `R.adj`, so R's parent is never drawn on. `RectAdjDir(P, R)` returns
  0 when R is west of P and touches it (`P.x = R.x + R.w`), 2 when R is east of P (`R.x = P.x + P.w`), else 1 when R is
  north (`P.y = R.y + R.h`), else 3 when R is south (`R.y = P.y + P.h`), else −1.

- B9. [C] A probe spends a level draw whenever it gets past the lock and link test. Because the finders probe only a
  room that beats the current best, **the number of probe draws depends on the list order**.

- B10. [C] `MazeFindWest` is the mirror of `FindEast`: lowest `x`, a room probed only when strictly better. Its one
  caller is the Barracks, through `g_BarracksFinders[2]`: the file holds one pointer to it (the slot) and
  no call. With level 27's index 2 (map seed 58, two level-28 windows) its probes, their level draws and the room it
  returns match.
- B1–B9. [C] The maze rooms are freed after the conversion, so their room draws leave no trace outside the window. Only
  the level seed matters to later steps.

### C. Random growth

```mermaid
flowchart TD
  t["target = Rooms[diff], ×3 true tomb, ×2 second tomb"] --> c{"L.count < target?"}
  c -->|"no"| done["growth ends"]
  c -->|"yes"| k["k = Range(L.seed, L.count)<br/>P = k-th room, newest first"]
  k --> d["d = Step(P.seed) & 3"]
  d --> lk{"P locked?"}
  lk -->|"yes: both draws spent"| c
  lk -->|"no"| cr["R = RoomCreate: level draw"]
  cr --> pl{"Place(R, P, d)?"}
  pl -->|"overlap"| fr["RoomFree(R)"]
  fr --> c
  pl -->|"ok"| ln["AdjLink(P, R, d)<br/>Merge(R): a room draw per edge-sharing candidate"]
  ln --> ins["prepend R; DefFromExits(P), DefFromExits(R)"]
  ins --> c
```

```
C1. MazeGrow(L):                                                     [C]
      target: i32 ← LvlMaze.Rooms[act.difficulty]
      if L.id = act[+0x094]: target ← target × 3                     ; [C] level 70 grew to 18 rooms
      if L.id = act[+0x484]: target ← target × 2                     ; [C] level 71 grew to 12 rooms
      while L.count < target:
        k: u32 ← Range(L.seed, L.count)                              ; level draw
        P ← the k-th room of L.rooms (0 = newest)
        d: u32 ← Step(P.seed) & 3                                    ; room draw on the PICKED room
        if not P.locked: Grow(P, d)                                  ; B7
```

- C1. [C] The count is read per difficulty: 22 levels were built on all three difficulties, and the nightmare and hell
  counts were reproduced (99 windows).
- C1. [C] The tomb multipliers: map seed 1557 drew level 70 as the true tomb and 71 as Kaa's (act `+0x094`, `+0x484`,
  logged and equal to the act model's draws). `Rooms` is 6 for every tomb 66–72; level 70 ends its growth at 18 rooms,
  71 at 12, and the plain tombs 66 and 68 at 6 (67 at 7: its special attach adds one).
- C1. [I] No tomb takes both multipliers: `DRLG_ActCreate` draws the two fields as `66 + r mod 7` and redraws while they
  are equal.
- C1. [C] A locked pick, or a placement that overlaps, adds no room, but its draws are spent. The loop then picks again,
  so the number of level draws per growth step is not fixed: 1 (locked) or 2 (create) per iteration, plus the room
  draws.
- C1. [C] The growth target counts R0 and the start shape's rooms. Specials attached later, the level 28/107 extras
  and the hell fillers come on top of it. The fixed-shape types (14, 15, 23, 32, 19, 35, the single-room Ice levels)
  never run growth.

### D. Special rooms

A **special** is one `MazeSpecial` entry `{matchDef, def, idx, dir}` taken from a 4-entry table at the current
rotation `r`.

```
D1. SpecialPlace(entry, rotate: bool):                               [C] (§ 6)
      R ← first room in L.rooms (newest first) with not R.locked and R.def = entry.matchDef
      if R: R.locked ← true;  R.def ← entry.def;  R.idx ← entry.idx  ; replaces a dead end, no draw
      else: Attach(entry)                                            ; D2
      if rotate: r ← (r + 1) & 3

D2. Attach(entry):                                                   [C] but the no-room end (§ 6)
      for P in L.rooms (newest first), P not locked:
        R ← RoomCreate(L)                                            ; level draw per candidate tried
        if Place(R, P, entry.dir):
          AdjLink(P, R, entry.dir);  LevelRoomLink(L, R);  DefFromExits(P)
          R.locked ← true;  R.def ← entry.def;  R.idx ← entry.idx
          return
      ; no room could take it: nothing placed
```

- D1. [C] Each finisher draws `r` once and then places its specials in order, each from the entry `r` of its own table,
  with `r ← (r + 1) & 3` after each one. Consecutive specials therefore face different directions. The attach that
  succeeds on the first candidate tried is reproduced (Den of Evil, Cave Level 1, § Worked example).

- D2. [C] A candidate whose placement fails spends its level draw and the walk goes on: of the 337 logged attaches, 154
  placed the special only after one or more candidates failed, 313 failed candidates in all, each `RoomCreate` draw
  checked one by one.
- D2. [I] When no room can take the special, nothing is placed. No logged attach reached that case (0 of 337).

- [C] **The table layout.** 47 of the 50 four-entry tables follow one rule, which gives every entry of those 47 tables
  as read from the data. With `m` the block's `DefFromExits` base and `b` the special's first record, entry `r` matches the
  dead end whose only exit is N, E, S, W for `r` = 0, 1, 2, 3 (`matchDef` = `m` + 8, 2, 4, 1) and attaches in the opposite
  direction (`dir` 3, 0, 1, 2), so the new room's single exit faces its parent. Its `def` is `b` + 3, 1, 2, 0 (so a block
  reads W, E, S, N) and its `idx` −1.
- [C] The three exceptions keep `matchDef`, `dir` and `idx` and give `def` = `b` + 0, 2, 1, 3: Baal Next (1078–1081), Baal Waypoint (1082–1085) and Ice Waypoint (1034–1037). The Temple tables
  (below) and the single entries of Lair 64 and River of Flame (§ F, § G3) are outside the rule.
  (data)
- [C] Every stock entry of the tables has `idx` −1. Forced indices come only from `AddFixed`, `DefFromExits` and the start
  shapes.
- [C] The special tables by block (level type in parentheses, `m` in brackets), each at the address its finisher adds to `16·r`:

  | Block | Specials (table address: records) |
  |---|---|
| Cave (3) [52] | Prev: 83–86, Den of Evil: 95–98, Down: 91–94, Coldcrow: 99–102, Next: 87–90 |
| Crypt (4) [108] | Prev: 139–142, Bonebreak: 147–150, Chest: 151–154, Next: 143–146 (Portal: 155–158, no reference in the finisher) |
| Barracks (7) [167] | Next: 198–201, Forge: 202–205 |
| Jail (8) [205] | Prev: 236–239, Cath: 244–247, Next: 240–243, Waypoint: 248–251, Pitspawn: 252–255 |
| Catacombs (10) [257] | Next: 291–294, Waypoint: 295–298 |
| Sewer A2 (13) [301] | Prev: 332–335, Next: 337–340, Waypoint: 345–348, Radament: 341–344, Chest: 349–352 |
| Tomb (17) [413] | Next: 448–451, Waypoint: 476–479, Chest: 472–475, Leatherarm: 464–467, Cube: 456–459, Treasure: 452–455, Tal Rasha: 460–463, Kaa: 468–471 |
| Lair (18) [481] | Prev: 497–500, Next: 501–504, Treasure: 505–508 (read only through its entry 3, § F), Tight Spot: 509 (one entry) |
| Arcane (19) [509] | Summoner: 525–528 |
| Dungeon (24) [664] | Prev: 695–698, Next: 699–702 |
| Sewer A3 (25) [704] | Drain: 739–742, Chest: 743–746 |
| Durance (22) [753] | Prev: 784–787, Waypoint: 792–795, Next: 788–791 |
| Temple (32) | Down: 1046–1048, Waypoint: 1049–1052 |
| Baal (34) [1058] | Next: 1078–1081, Waypoint: 1082–1085 (exceptions) |
| Ice (33) [1002] | Prev: 1018–1021, Next: 1022–1025, Down: 1026–1029, Theme: 1030–1033, Waypoint: 1034–1037 (exception) |

- [C] Down reads `r` 0..2 only (the draw is `mod 3`), so the word after its third entry, which
  is Waypoint's entry 0, is never read as Down's entry 3. `MazeSpecialPlace` reads one entry and then sets
  `r ← (r + 1) mod 4`, so Waypoint is read at `r` 1..3, and its entry 0 is never read either.
  Every logged Temple build is reproduced with the reads counted: Down entries 0 and 2 (6 each), Waypoint entry 1 (6).


### E. Start shapes

```
E1. Ring(n):                                                         [C]
      cur ← R0
      repeat n − 1: cur ← Grow(cur, 1)                               ; north
      repeat n − 1: cur ← Grow(cur, 0)                               ; west
      repeat n − 1: cur ← Grow(cur, 3)                               ; south
      repeat n − 2: cur ← Grow(cur, 2)                               ; east
      AdjLink(cur, R0, 2);  DefFromExits(cur);  DefFromExits(R0)     ; close the ring

E2. Tee (types 17, 34):                                              [C]
      r: u32 ← Step(L.seed) & 3                                      ; level draw
      repeat 3: Grow(R0, r);  r ← (r + 1) & 3
      R0.def ← tee Prev record[r];  R0.locked ← true;  R0.idx ← −1    ; r is now (r₀ + 3) & 3

E3. CatacombsStart (type 10):                                        [C]
      if L.id = 34: Grow(R0, d) for d = 1, 2, 3, 0;  R0.def ← 290     ; Catacombs Prev NSEW
      else:
        b: u32 ← Step(L.seed) & 1                                    ; level draw (35, 36)
        if b = 0: Grow(R0, 1);  Grow(R0, 3);  R0.def ← 289            ; Prev NS
        else:     Grow(R0, 0);  Grow(R0, 2);  R0.def ← 288            ; Prev EW
      R0.locked ← true;  R0.idx ← −1

E4. Arcane (type 19, level 74):                                      [C] (8 windows)
      r: u32 ← Step(L.seed) & 3                                      ; level draw
      for a in 0 ..< 4:                                              ; one arm per direction, d = a
        A1, A2, A3 ← (a + 1) & 3, (a + 2) & 3, (a + 3) & 3
        cur ← R0;  s ← []
        for dd in a, a, A3, a, a, a, a, A1: cur ← Grow(cur, dd); append cur to s   ; s0..s7
        Grow(cur, a)                                                 ; a dead end, not recorded
        cur ← Grow(cur, A1); append                                  ; s9 (from s7)
        for dd in A2, A2: cur ← Grow(cur, dd); append                ; s10, s11
        Grow(cur, A3)                                                ; a dead end, not recorded
        cur ← Grow(cur, A2); append;  cur ← Grow(cur, A2); append     ; s13, s14
        arm[a] ← s
      for a in 0 ..< 4: for R in arm[a]: R.idx ← (a + r) & 3
      R0.idx ← 4

E5. HellStart (type 35):                                             [C] (level 125)
      e: u32 ← (Step(R0.seed) & 3) × 2                               ; ROOM draw on R0, not the level seed
      for each of the entries e, e + 1:
        AddFixed(R0, entry.dir, entry.def, entry.idx, recalcParent: true)
      FillAround(836, exclude: none)                                 ; E6

E6. FillAround(def, exclude):                                        [C]
      for P in L.rooms as they are now (newest first), P ≠ exclude:  ; fillers made here are not walked
        for d in 0 ..< 8:
          R ← RoomCreate(L)                                          ; level draw, 8 per walked room
          if Place(R, P, d): AdjLink(P, R, d);  LevelRoomLink(L, R);  R.locked ← true;  R.def ← def;  R.idx ← −1
          else: RoomFree(R)
      ; no DefFromExits
```

- E1. [C] `Ring(2)` is a 2 × 2 square of four rooms (R0, north, north-west, west) in which every room has exactly two
  exits. Every `Grow` of a ring merges.
- E1, E4. [C] **A failed placement crashes the straight-line shapes.** In `MazeRing`, the catacombs chains and Arcane's
  arms, the next room's parent is the room just made. A failed placement leaves a null parent. No stock level fails
  there, because these shapes start from a lone room.
- E4. [C] So `File1..4` of the Arcane records are the four arm styles, and `File5` is the centre. The two dead ends of
  each arm keep index −1. Arcane's `Merge` is 1000, so every edge-sharing pair links.

- E5. [C] The entries are, by `e ÷ 2`: 0: 1054 north (idx 0), 1053 south (idx 1); 1: the same with idx 1, 0; 2: 1055 west
  (idx 1), 1056 east (idx 0); 3: the same with idx 0, 1. Each `AddFixed` recomputes R0's `Def`, so R0 ends as NS 1058 or
  EW 1057.
- E6. [C] Diagonal links (directions 4–7) occur only here, and no `Def` is recomputed, so the fillers never change their
  neighbours' `Def`s.

### F. The chain per level type

| Type | Levels | Start | Growth | Finisher (`r` = `Step(L.seed) & 3` unless stated; specials in order) | Tag |
|---|---|---|---|---|---|
| 3 caves | 8–12 | — | yes | `r`; Prev; 8: Den of Evil, else Down; 9: + Coldcrow; 10: + Next | [C] |
| 4 crypts | 18–24, 133 | — | yes | `r`; Prev; 18: Bonebreak; 19, 133: Chest; 21–24: Next | [C] 18–24 / [I] 133, no stock build |
| 7 Barracks | 28 | `Ring(2)` | yes | none; the level 28 placement (§ G2) places its specials | [C] |
| 8 Jail | 29–31 | `Ring(2)` | yes | `r`; Prev; 29: Waypoint; 30: Pitspawn; 31: Cath, else Next | [C] |
| 10 Catacombs | 34–36 | E3 | yes | `r`; Next; 35: Waypoint | [C] |
| 13 Sewers A2 | 47–49, 65 | `Ring(2)` | yes | `a`, then `r` (F2); 47: the dock path; 48: Prev, Waypoint, Next; 49: Prev, Radament; 65: Prev, Chest | [C] |
| 14 Harem, 15 Basement, 23 Spider | 51–54, 84, 85 | `Ring(2)` | no | none | [C] |
| 17 Tomb | 55–61, 66–72 | tee; 61: R0 locked as 480 `Tomb Tainted Sun X` | yes (not 61) | F3; 61 has none | [C] 55–61, 66–68, 70, 71 / [I] 69, 72, F3 note |
| 18 Lair | 62–64 | `Ring(2)` | yes | `r`; 64: Tight Spot (fixed entry), then `r ← 3`, Treasure (fixed entry, `r` → 0), Prev; else Next, Prev | [C] (§ 6 *Lair 64*) |
| 19 Arcane | 74 | E4 | no | `r`; Summoner | [C] |
| 22 Durance | 100, 101 | `Ring(2)` | yes | `r`; Prev; 101: Waypoint, Next; 100: Next | [C] |
| 24 Dungeon | 86–89 | `Ring(2)` | yes | `r`; Prev, Next | [C] |
| 25 Sewers A3 | 92 | `Ring(5)`, then F4 | yes | `r`; Drain, Chest | [C] |
| 28 Act IV lava | 107 | — | yes | none; the level 107 placement (§ G3) | [C] |
| 32 Temple | 122, 123 | `Ring(2)` | no | `r ← Step(L.seed) mod 3`; not 124: Down; 123: Waypoint | [C] |
| 33 Ice | 113, 115, 118 | `Ring(2)` | yes | `r`; Prev, Next, Down; 115: Theme; 113, 115, 118: Waypoint | [C] |
| 33 Ice | 114, 116, 119 | R0 locked: 114 `Range(L.seed, 2)` = 1 → 1038, 0 → 1039; 116 → 1040; 119 → 1041 | no | none | [C] |
| 34 Baal | 128–130 | tee | yes | `r`; Next; 129: Waypoint | [C] |
| 35 Act V lava | 125–127, 135 | E5 | no | none | [C] 125–127 / [I] 135, no stock build |

(the tags cite and, for caves 10–12, crypts 21–24, Jail 31, tombs 55, 56, 59, 60, 66–68, 70, 71, Lair 63, 64, Dungeon 87, 89, Baal 128, 130 and lava 126, 127, every window matched room for room with its draws; level 10 in the kept logs, re-run at the H5e review; Jail 31 and lava 126, 127 on the server copy only, as a window carries every draw. Levels 133 and 135 have no stock build: stock play does not reach 133–136 on the portal reading and the absence of a code path found ([outdoor.md § Entry points](../outdoor/#entry-points)))

- F1. [C] The table order is the call order: start shape, then growth, then the finisher draw `r`, then the specials.
  The single-room Ice levels and level 61 break out of the chain after their fixed room, with no growth and no
  finisher. Placement (§ G) and themes (§ H) follow for every type.

```
F2. Sewers A2 finisher (type 13):                                    [C]
      a: u32 ← (Step(L.seed) & 1) × 2 | 1                            ; 1 or 3; drawn on every type-13 level
      r: u32 ← Step(L.seed) & 3
      if L.id = 47:                                                  ; the dock path
        P ← Find(1);  R1 ← Grow(P, 1);  R2 ← Grow(R1, 1)
        AddFixed(R2, 0, 333, idx 0, recalcParent: true)              ; Sewer Prev E
        P ← Find(2);  R1 ← Grow(P, 2);  R2 ← Grow(R1, 2)
        dock ← AddFixed(R2, a, 336, idx 0, recalcParent: true)       ; Sewer Prev NS, the dock
        R ← RoomCreate(L)
        if Place(R, dock, a): AdjLink(dock, R, a);  LevelRoomLink(L, R);  DefFromExits(R)   ; no merge
        else: RoomFree(R)
        SpecialPlace(Next[r], rotate)
      else: the specials of the table row, each SpecialPlace(table[r], rotate)

F3. Tomb finisher (type 17):                                         [C] (57, 58)
      P ← first room in L.rooms (newest first) with P.def > 428       ; the tee's Prev record
      r ← {444: 3, 445: 1, 446: 0, 447: 2}[P.def];  fatal for any other Def      ; no draw
      55–58: Next;  57: Waypoint
      59 or 61: Chest
      66–72 and L.id ≠ act[+0x094]: Chest;  59: Leatherarm
      60: Cube;  59 or 61: Treasure
      L.id = act[+0x094]: Tal Rasha                                  ; [C] level 70, map seed 1557
      L.id = act[+0x484]: Kaa                                        ; [C] level 71, map seed 1557

F4. Level 92 corners:                                                [C] (2 windows)
      after Ring(5): for (want, new) in (0x2C5, 735), (0x2C6, 736), (0x2C9, 737), (0x2CA, 738):
        R ← first unlocked room with R.def = want;  R.locked ← true;  R.def ← new;  R.idx ← −1
```

- F2. [C] On levels 48, 49 and 65 the `a` draw is still made and its value is unused.

- F3. [C] The Tomb finisher makes no draw of its own: its rotation comes from the tee's draw. Level 61 never reaches it.

- F3. [I] Tombs 69 and 72 have no path of their own. The finisher tests a tomb level only by the range 66–72
and against the act's true tomb (`+0x094`) and Kaa's tomb
  (`+0x484`); nothing else compares the id with 69 or 72. So a tomb's path is its role's, and all three
  roles were built: 70 true, 71 Kaa, 66–68 plain.
- [C] **Lair 64's entries**, as read from the data: Tight Spot is the single entry, `{485 → 509, idx −1,
  dir 1}`; the fixed Treasure address is entry 3 of the Treasure table, `{482 → 505, −1, dir 2}` (a W dead
  end); the Prev entry 0 that follows is `{489 → 500, −1, dir 3}`. (data)

### G. Placement

```
G1. MazeLevelPlace(L):                                               [C]
      (x0, y0, x1, y1) ← bounding box of L.rooms
      if L.w < x1 − x0 or L.h < y1 − y0: fatal                       ; [I] no stock case found, G1 note
      every room: (x, y) ← (x + L.x − x0, y + L.y − y0)

G2. MazeBarracksPlace(L)  (level 28):                                [C] (8 windows, k 1; k 0 4 windows, k 2 2 windows)
      ensure level 27; k: i32 ← level 27's preset file index           ; left by the act link builder: drawn on Black Marsh sides 1 and 3, else the create-time index (warps.md)
      P ← Find({0: 2, 1: 3, 2: 0}[k])                                 ; East, South or West: g_BarracksFinders[k]
      C ← AddFixed(P, {0: 2, 1: 3, 2: 0}[k], 167, idx k, recalcParent: true)   ; Barracks Court Connect
      LevelAdjAdd(L → 27, dir {0: 2, 1: 3, 2: 0}[k])                  ; no draw
      (sx, sy) ← LvlMaze.SizeX, SizeY;  Q ← level 27's rect
      (dx, dy) ← k = 0: (Q.x − C.x − sx,       Q.y + Q.h ÷ 2 − C.y)
                 k = 1: (Q.x + Q.w ÷ 2 − C.x − 6, Q.y − C.y − sy)
                 k = 2: (Q.x + Q.w − C.x,      Q.y + Q.h ÷ 2 − C.y + 1)
      r ← k
      b: u32 ← Step(L.seed)                                          ; level draw
      if b & 1: SpecialPlace(Next[r], rotate); SpecialPlace(Forge[r], rotate)
      else:     SpecialPlace(Forge[r], rotate); SpecialPlace(Next[r], rotate)
      every room: (x, y) ← (x + dx, y + dy)
      L.rect ← bounding box of L.rooms

G3. MazeRiverOfFlame(L)  (level 107):                                [C] (8 windows)
      if act index = 4: return                                       ; [I] no placement at all then
      ensure level 108
      P ← Find(3);  AddFixed(P, 3, 852, idx −1, recalcParent: true)  ; Lava Warp N
      P ← Find(1);  B ← AddFixed(P, 1, 855, idx −1, recalcParent: true)   ; Bridge 1
      repeat 2:                                                      ; Bridge 2, no merge, no Def update
        R ← RoomCreate(L);  if not Place(R, B, 1): fatal (null parent)
        AdjLink(B, R, 1);  LevelRoomLink(L, R);  R.locked ← true;  R.def ← 856;  R.idx ← −1;  B ← R
      LevelAdjAdd(L → 108, dir 1)                                    ; no draw
      r: u32 ← Step(L.seed) & 1                                      ; level draw
      SpecialPlace(g_RiverForgeSpecials[r], no rotation)             ; r 0: {837 → 853, dir 2} Forge W; r 1: {838 → 854, dir 0} Forge E
      FillAround(836, exclude: B)                                    ; E6, every room but the last bridge
      Q ← level 108's rect
      every room: (x, y) ← (x + Q.x + 2·B.w − B.x, y + Q.y + Q.h − B.y)
      L.rect ← bounding box of L.rooms
```

- G2. [C] The finder is taken from `g_BarracksFinders`, three function pointers: `k` 0 `MazeFindEast`, 1 `MazeFindSouth`,
  2 `MazeFindWest` (read).
- G1. [C] No test against the level rectangle is made during growth. The rooms grow freely around R0, and this shift puts
  the bounding box at the level origin.
- G1. [I] No sampled stock seed reaches the fatal error. An offline sweep of the maze model over every `DrlgType` 1 level
  with an `LvlMaze` row but 28 and 107 (68 levels), all three difficulties, 2000 level seeds each (408 000 builds), raised
  it only 7 times, all with both tomb fields equal to the level, which the act draw excludes (C1 note); the least room
  left in a multi-room level was 8 tiles (the tombs) and 20 in Arcane Sanctuary, and the one-room levels fit exactly. A
  sample is not a proof.
- G2. [C] `k` 0 takes `FindEast`, attaches 167 with dir 2 and forced index 0, and translates by
  `(Q.x − C.x − sx, Q.y + Q.h ÷ 2 − C.y)`: four windows, map seed 52 (index drawn on Black Marsh side 3) and map seed 2
  (the create-time index). `k` 2 takes `FindWest`, dir 0, forced index 2, `(Q.x + Q.w − C.x, Q.y + Q.h ÷ 2 − C.y + 1)`:
  two windows, map seed 58. Rooms, draws, the seed after and the bounding-box rect all match.

- G2. [C] `k` is level 27's preset index as the act link builder left it: the level-6 draw when Black Marsh ends on side 1
  or 3, otherwise the create-time index (`RangeB` over `Files` 3 on level 27's create seed), which nothing overwrites.
  Index 2 reached the Barracks that way (map seed 58), and index 0 too (map seed 2). The side-1 draw itself never gives 2
  on stock data.

- G2, G3. [C] These two levels **set their own level rectangle** to the rooms' bounding box. Every other maze level keeps
  the rect that `LevelSetPosition` gave it.

- G2, G3. [C] The level-adjacency node to level 27 or 108 is what joins them without a warp: these are the `Vis` pairs
  27↔28 and 107↔108 whose `Warp` is −1 in all four directions. No act
  link list overrides them (32 logs), none of the 431 logged warp pairings joins them, and the 8 Barracks and 28 River of
  Flame windows place against the neighbour through its rect and an adjacency node.


### H. Themes

```
H1. MazeThemes(L):                                                   [C]
      if L's type has no theme base, or L.id = 8: return             ; no draw
      base ← theme base of L's type
      s: u32 ← Step(L.seed) mod 15                                   ; level draw, unsigned
      want: i32 ← max(2, L.count ÷ 5 + 1);  tries: i32 ← 2 · L.count
      perm ← [0, 1, …, 14]
      repeat 15:
        a ← Step(L.seed) mod 15;  b ← Step(L.seed) mod 15            ; two level draws
        swap perm[a], perm[b]
      while want > 0 and tries > 0:
        v ← base + perm[s]
        R ← first room in L.rooms (newest first) with not R.locked and R.def = v
        if R: R.locked ← true;  R.def ← v + 15;  R.idx ← −1;  want ← want − 1
        tries ← tries − 1;  s ← (s + 1) mod 15
```

- H1. [C] The pass always makes **31 level draws** on the theme types, whatever it then finds. `perm[k] = 0` names `base`
  itself, and mask 15 (`NSEW`) is never themed. The `+ 15` records are the `… Theme …` records of each block, for example
  53 `Cave W` → 68 `Cave Theme W`. The specials are placed before the theme pass, so a dead end is themed only if no
  special took it.

### I. Draw order

```mermaid
sequenceDiagram
  participant B as MazeLevelBuild
  participant LS as L.seed
  participant RS as maze room seeds
  B->>LS: R0 RoomCreate (before the window)
  Note over B: start shape, tee, catacombs, arcane draw r or b on L.seed, hell draws on R0.seed
  loop growth, while count below target
    B->>LS: Range(count) picks P
    B->>RS: Step(P.seed) & 3, the direction
    B->>LS: RoomCreate, unless P is locked
    B->>RS: Merge, a Step per edge-sharing candidate
  end
  B->>LS: finisher r (Sewers A2: a, then r)
  B->>LS: probes, attaches, fillers, one RoomCreate each
  B->>LS: level 28 draws b, level 107 draws r
  B->>LS: themes, 31 draws on theme types
```

- [C] Every level draw of the window is one of: a `RoomCreate` (growth, probes, attaches, fixed rooms, fillers, start
  shapes), a growth pick `Range(L.count)`, a finisher or start-shape draw (`r`, `a`, `b`, level 114's `Range(2)`), or a
  theme draw. Room draws are the growth directions, the merges, and the hell start's `Step(R0.seed)`.
  (12388 level draws matched one by one)

## Outputs

The level's room list (newest first): per maze room its rect (absolute tiles, after § G), `Def` and forced index
(−1 for none). Also the level seed at the window end. For levels 28 and 107, the level rect too. [C]
 The conversion into preset instances, the file
rotation and the preset rooms are [drlg/overview](../overview/) steps 9a–9b. The warps each special's DS1 holds, and the
level's warp points, are [warps.md](../warps/). [C]

## Worked example

Seeds are `low:high`, hex. Directions: 0 W, 1 N, 2 E, 3 S.

**1. Den of Evil (level 8), map seed 12345, normal**. `LvlMaze`: `Rooms` 1/1/1, 24 × 24, `Merge` 500. Level rect `(1500, 1000, 200, 200)`.

| # | Draw | Seed after | Value | Effect |
|---|---|---|---|---|
| — | growth | — | — | `L.count` 1 = `Rooms`: no iteration, no draw |
| 1 | finisher `r = Step(L.seed) & 3` | `C20781F3:5E130228` | 3 | |
| 2 | Prev, entry 3 `{53 → 83, dir 2}` | `06E4B227:50ED9B57` | — | no room has `Def` 53 (R0 has `Def` 0): `Attach` creates room 2 east of R0; R0 → 54; `r` → 0 |
| 3 | Den of Evil, entry 0 `{60 → 98, dir 3}` | `334AA35A:02E00A8C` | — | R0 is 54, not 60: `Attach` creates room 3 south of R0; R0 → 58; `r` → 1 |
| — | `MazeLevelPlace` | — | — | box from R0's centre `(1588, 1088)` and its neighbours: shift `(−88, −88)` |
| — | themes | — | — | level 8: skipped, no draw |

Result, list order: def 98 at `(1500, 1024)`, def 83 at `(1524, 1000)`, def 58 at `(1500, 1000)`, all 24 × 24, forced index
−1. The seed at the window end, `334AA35A:02E00A8C`, is the one the overview's conversion starts from. [C]


**2. Cave Level 1 (level 9), map seed 2027, normal** (all 44 level draws of the window checked one by one against the watchpoint log). `Rooms` 4, 24 × 24, `Merge` 500. Level rect `(1500, 1300, 200, 200)`, so R0 starts at `(1588, 1388)`. The window starts at `F0A5F27C:2FA59211`. Rooms are numbered in creation order; positions below are before the shift.

| # | Draw (level draws numbered) | Value | Effect |
|---|---|---|---|
| 1 | `Range(L.seed, 1)` | 0 | P = R0 (room 1) |
| — | `Step(R1.seed) & 3` | 1 | N |
| 2 | `RoomCreate` | — | room 2 at `(1588, 1364)`, linked; merge: no edge-sharing candidate; R1 → 60, R2 → 56 |
| 3 | `Range(L.seed, 2)` | 1 | list `[2, 1]`: P = room 1 |
| — | `Step(R1.seed) & 3` | 0 | W |
| 4 | `RoomCreate` | — | room 3 at `(1564, 1388)`; R1 → 61, R3 → 54 |
| 5 | `Range(L.seed, 3)` | 0 | P = room 3 |
| — | `Step(R3.seed) & 3` | 2 | E |
| 6 | `RoomCreate` | — | room 4 at R1's place: overlap, freed |
| 7 | `Range(L.seed, 3)` | 0 | P = room 3 |
| — | `Step(R3.seed) & 3` | 2 | E |
| 8 | `RoomCreate` | — | room 5: overlap, freed |
| 9 | `Range(L.seed, 3)` | 1 | P = room 2 |
| — | `Step(R2.seed) & 3` | 2 | E |
| 10 | `RoomCreate` | — | room 6 at `(1612, 1364)`; R2 → 58, R6 → 53. Count 4: growth ends |
| 11 | finisher `r` | 3 | |
| — | Prev, entry 3 `{53 → 83, dir 2}` | — | room 6 is 53: it becomes 83, no draw; `r` → 0 |
| 12 | Down, entry 0 `{60 → 94, dir 3}` | — | no 60: `Attach`; room 6 is locked, room 3 takes room 7 to its south; R3 → 58; `r` → 1 |
| 13 | Coldcrow, entry 1 `{54 → 100, dir 0}` | — | no 54: `Attach` on room 3 again, room 8 to its west; R3 → 59; `r` → 2 |
| — | `MazeLevelPlace` | — | box from `(1540, 1364)`: shift `(−40, −64)` |
| 14 | themes `s = Step mod 15` | 0 | `want` 2, `tries` 12 |
| 15–44 | 15 swaps `(a, b)` | (5,7) (4,13) (13,12) (10,11) (10,5) (10,9) (14,10) (12,14) (5,0) (4,10) (7,11) (3,9) (10,14) (8,2) (10,7) | `perm` = 11, 1, 8, 7, 14, 0, 6, … |
| — | walk | — | s 0: 63 none; 1: 53 none; 2: 60 none; 3: 59 → room 3 becomes 74; 4: 66 none; 5: 52 none; 6: 58 → room 2 becomes 73 |

Result, list order (absolute, after the shift): 100 at `(1500, 1324)`, 94 at `(1524, 1348)`, 83 at `(1572, 1300)`, 74 at
`(1524, 1324)`, 73 at `(1548, 1300)`, 61 at `(1548, 1324)`, all 24 × 24, forced index −1. The seed at the window end is
`DA8E82CF:13CC9FB4`. The conversion then loads `CaveECrow.ds1` for the Coldcrow room. [C]
 The warp points this level ends with are the example of [warps.md](../warps/#worked-example).

## Reimplementation notes

- **The growth direction comes from the picked room's own seed**, not the level seed. The first guess (the level seed)
  fails on every logged window. [C]
- **A failed or locked growth step still spends its draws**: the level-seed pick, the room-seed direction and, for an
  unlocked parent, the `RoomCreate`. [C]
- **Probes create real rooms.** `Find*` looks like a search, but each probe that passes the cheap tests spends a level
  draw. The draw count depends on the list order. [C]
- **`Merge` draws even when it cannot link** (`Merge` 0) **and when it always links** (`Merge` 1000). Skip the draw and the
  candidate room's next growth direction is wrong. [C]
- **`DefFromExits` unlocks.** A locked parent that a later fixed room recomputes becomes unlocked again (the catacombs
  and tee starts relock R0 after their growth for this reason). [C]
- **Mask 0 gives `base`**, not "no change", for the based types. Only a zero table value (quadrant, lava, single-room Ice)
  leaves the `Def` as it was. [C]
- **The hell start draws on R0's seed**, not the level seed. [C]
- **Unused draws:** the Sewers A2 `a` on levels other than 47, and the 31 theme draws when nothing is themed. [C]

- **The Temple rotation is `mod 3`**, and the Tomb rotation comes from the Prev record, not from a draw. [C]

- **Lists are newest first.** The growth pick indexes the list, the specials, merges and themes walk it, and the conversion
  walks it, all from the head. [C]

## Evidence

- Reference model: replays the windows of both runs (the worked examples included). It is a
  check of this spec, not a source: every statement above cites the code, the data or a run.
- [drlg/overview](../overview/), [warps.md](../warps/), rng/seeds, rng.
