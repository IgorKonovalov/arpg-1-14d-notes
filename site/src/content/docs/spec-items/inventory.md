---
title: "Inventory: grids, placement, belts, stacks, pickup, the ground drop and a ground item's life"
sidebar:
  order: 13
---

## Purpose

Where an item can go and how it gets there, on the server. Which grid a unit and page use, in which order the placement
search walks it, the belt's boxes, stacks and merges, the cursor, the stash, pickup with its reach and its refusals, the
cell a dropped item lands on, and how long the item then lives. The scope is the server's outcomes in game frames; the cube's grid is a page here and its transmute is [items/cube](../cube/); the trade
between players is [items/trade](../trade/). Using an item, the request gate and the drain's order are [items/use](../use/).

```mermaid
flowchart LR
  ground["on the ground<br/>mode 3"] -->|"0x16, 0x13"| pickup["PickupToInv,<br/>PickupToCursor"]
  pickup --> inv["page: inventory, cube, stash<br/>mode 0"]
  pickup --> belt["belt box<br/>mode 2"]
  pickup --> body["body location<br/>mode 1"]
  pickup --> cursor["cursor<br/>mode 4"]
  cursor -->|0x18| inv
  inv -->|0x19| cursor
  cursor -->|0x23| belt
  belt -->|0x24| cursor
  cursor -->|0x17| drop["CursorDrop:<br/>GroundDropCell"]
  drop --> ground
  ground -->|"the sweep"| freed["freed"]
```

## Entry points

| When | Function | Tag |
|---|---|---|
| Client packets `0x13`, `0x16`: interact with a unit, an item on the ground among them | `Pkt16UnitAction`, → `UnitInteract` | [C] both handlers end at `UnitInteract` (family `act`, 1 200 cases) |
| Client packets `0x17`..`0x1F`, `0x21`..`0x25`, `0x63`: the moves (§ D) | `g_SrvPacketTable` | [C] |
| A monster or chest drops | `DropCreateItem` | [C] 28 ground drops at creation, each after a `GDI` returning into `DropCreateItem`; the log does not tell a monster's drop from a chest's |
| Other callers of the ground drop (§ J4) | `GroundDropCell` | [C] 20 rel32 call sites in 18 functions, no abs32 (the raw scan) |
| Every 1 500 frames: the sweep of active rooms | `ActExpiredItemsFree`, K3 | [C] |

## Inputs

### Tables

| Anchor | Used for |
|---|---|
| `Inventory.txt:gridX`, `Inventory.txt:gridY` | a page's width and height, as bytes |
| `Belts.txt:numboxes` | a worn belt's box count |
| `Armor.txt:belt` | the worn belt's `belts` row, Items `+0x130` |
| `Misc.txt:invwidth`, `Misc.txt:invheight` | the item's size, Items `+0x10F`, `+0x110` |
| `Misc.txt:autobelt`, `ItemTypes.txt:Beltable` | the belt search |
| `Misc.txt:stackable`, `ItemTypes.txt:AutoStack` | stacks; Items `+0xE8` is the row's maximum |
| `ItemTypes.txt:Quiver`, `ItemTypes.txt:Shoots`, `ItemTypes.txt:BodyLoc1`, `ItemTypes.txt:BodyLoc2`, `ItemTypes.txt:Body` | auto-equip |
| `expfield`#header | the walk's direction field, file `expfield.d2` |

### Runtime state

| State | Type | Source |
|---|---|---|
| inventory | `0x40` bytes, magic 16 909 060 (the bytes 04 03 02 01 in memory): `+0x08` owner, `+0x0C`/`+0x10` the item list, `+0x14` the pages, `+0x18` their count, `+0x20` the cursor item, `+0x28` the item count | `INV_Create` |
| page table | index `page + 2`, entries of 16 bytes: `+8` width, `+9` height, `+0xC` the cells, u32 unit pointers at `row × width + col` | `InvPageGet` |
| item data `+0x24` | i32, the ground expiry | `ItemPlaceOnGround` |
| game frame | i32, `Game+0xA8` | a drop handled while it is `N` uses `N`; the sweep tests at the frame's own `N` |

### Constants

| Name | Value | Tag |
| --- | --- | --- |
| body page | index 0, 13 × 1, in the image | [C] (r2 bytes 13, 1; the `invrec` family agrees) |
| belt page | index 1, 16 × 1, in the image | [C] (r2 bytes 16, 1; the `invrec` family agrees) |
| page bytes | 0 inventory, 1 and 2 trade, 3 cube, 4 stash; `0xFF` while on the cursor or the belt | [I] |
| item modes | 0 on a page, 1 on the body, 2 in the belt, 3 on the ground, 4 on the cursor | [C] (modes 0 to 4 over the four kept logs, 0 other:) |
| start offset | `(x + 2, y + 3)` | [C] |
| walk mask | `0x801` | [C] |
| radius, step | 50, 1 | [C] |
| pickup reach | `d < 5`; at `d ≥ 51` a return of 1 with nothing done | [C] (family `pick`, 2 500 cases) |
| pickup line mask | `0x804` | [C] (`COLL_LineTest`'s mask argument and the unmark test, 294 each) |

The cell mask's constant is J1's note: its value is `[I]` in two bits.

## Algorithm

### How to read the tags

- **`[C]`**, the inventory emulation, the ground emulation: the named function to its return over declared scratch
  memory, the code's map from the bytes it reads. **`[C]`**: the same up to a named callee's entry; the callee and all code after it are not covered, "after, `[I]`".
  None of these is a run of the game, and none says what the game stores at those offsets or when the code runs. [C]
- **`[C]` **, family `drop`: § J only, with its stated hole.
- **`[C]` live**: the first inventory run (one fresh process) and the second inventory run (a fresh process per session, no forced state), seed 6001. Their
  ground differs by claim (check): the **expiry deltas** rest on the a-priori table committed before the kept sessions; the **ground searches and their controls** on a model older than the logs, evaluated per case on the logged collision window; the **restore's write and the save's word** on a predictor written before the kept sessions, on those lines' inputs; the **restored copy's sweep** on a predictor written after a development log. All but the first check the code against its reading on inputs the log gives, and say nothing of which inputs occur. [C]
- **A forced request stays `[I]`.** Two outcomes in § E and § F rest on a packet field written at the handler's entry in the first inventory run. [I]
- **`[I]`**: a code reading no case reaches, with the addresses read.

### A. Pages and rows

```mermaid
flowchart TD
  u{"unit"} -->|player| p{"page"}
  p -->|1| r6["row 6"]
  p -->|2| r7["row 7"]
  p -->|3| r9["row 9"]
  p -->|4| e{"expansion?"}
  e -->|yes| r12["row 12, 6 × 8"]
  e -->|no| r8["row 8, 6 × 4"]
  p -->|other| rc["class row"]
  u -->|"type 1"| r5["row 5"]
  u -->|"type 2, class 0x152"| r10["row 10"]
  u -->|"type 2, class 0x153"| r11["row 11"]
  u -->|other| rm["−1"]
```

```
A1. InvRowForUnit(unit, page: i32, expansion: i32) → i32:            [C] (family rowfor)
      player: page 1 → 6;  2 → 7;  3 → 9;  4 → 12 if expansion ≠ 0 else 8;  any other page → the class row (0..4, 14, 15)
      type 1 (a monster, so a hireling too): 5
      type 2, class 0x152: 10;  class 0x153: 11
      otherwise: −1

A2. InvRecordGrid(row, set, out):                                    [C] (family invrec)
      copies 24 bytes, gridX to gridBoxHeight, from base + (16 × set + row) × 0xF0 + 0x10
      an index above the count reaches the error routine;  the count itself (32) is accepted and past the table
A3. BeltsRecord(row, set, out):                                      [C] (family beltrec)
      copies 264 bytes from base + (7 × set + row) × 0x108, no upper bound on the row
A4. InvPageGet(inv, page, row):                                      [C] a later request with another size, and the returns with no row (family `pageget`, 1 000 cases); [I] the first use
      the page index is compared signed, shifted by 4 with wrap: 0x80000000 names page 0
      a page is made on first use from the row given then           ; the allocator, left to a live run
      a later request with another size returns 0, so nothing is placed
      with no row: the page if made, else 0
      an index at or above the count, with a row: the reallocation
```

- A1. [C] **The stash is 6 × 8 in an expansion game and 6 × 4 in a classic one**, by that row (control `stashsmall` fails 20 of 400).
- A1. [C] Each server caller of the page's row that was read passes `game+0x70` as `expansion` where the page can be 4: the third push is loaded from `[reg + 0x70]`, `reg` the function's first argument (the game), at the three sites; `InvRowForUnit`'s other 36 call sites were not followed.
- A1. [C] Rows 13 and 29 (Hireling) are never returned: family `rowfor`, 5 952 cases over every page byte, player classes 0..7 and two others with both expansion words, and types 1..6 and two others over 13 classes, returns −1, 0..12, 14 and 15 only; the class table is named by three loads and no store. [I] Types `0x152`, `0x153` are object classes, and no code path that creates either was read (the class sources of the non-literal type-2 `SUnitCreate` callers, the `OBJPOP_*` lists past the window below). [C] As Objects rows 338 (`Guild Vault`) and 339 (`Trophy Case`) they are placed by no stock DS1 preset (0 units in all 2 274 DS1 files) and no `ObjGroup` row, and neither id is an s32 in the 8 KB of data from the `OBJPOP_*` lists' start, a window the check chose.
- A2. [C] **`gridX` and `gridY` are read as bytes**: with `+0x12`, `+0x13` declared `0x7F`, a wider reading fails 2 465 of 4 000 `search` cases. [C] So does the bound test, 397 of 800 `put` cases.
- A4. [I] In a save moved between game types this would be the stash's refusal; no run reaches it.

### B. The placement search

```mermaid
flowchart TD
  s["(w, h) from the item;<br/>a zero refuses"] --> o{"owner is a player?"}
  o -->|yes| h{"h = 1?"}
  o -->|"no, or null"| h2{"h = 1?"}
  h -->|yes| b1["BEST: columns from the right,<br/>each from the bottom"]
  h -->|no| b2["BEST: rows from the top,<br/>each from the left"]
  h2 -->|yes| f1["FIRST: columns from the right,<br/>each from the top"]
  h2 -->|no| f2["FIRST: columns from the left,<br/>each from the top"]
```

```
B1. InvSpotFindBySize(inv, item, invrow, &col, &row, page) → bool:   [C] (all of B1–B4)
      (w: u8, h: u8) ← Items[+0x10F], Items[+0x110];  a zero refuses
      grid ← page(page + 2);  W: u8 ← gridX;  H: u8 ← gridY
      player: bool ← inv.owner ≠ null and inv.owner.type = 0
      if h = 1:
        player: BEST(columns W−1 … 0, in each rows H−1 … 0)
        else:   FIRST(columns W−1 … 0, in each rows 0 … H−1)
      else:
        player: BEST(rows 0 … H−1, in each columns 0 … W−1)
        else:   FIRST(columns 0 … W−1, in each rows 0 … H−1)
B2. BEST(order): best: i32 ← 0
      for each spot in order that fits:
        s: i32 ← Score(spot)
        if s > best: keep the spot;  best ← s                        ; a tie keeps the earlier
        if s = 255: return true
      return best ≠ 0
    FIRST(order): the first spot that fits
B3. Fits(col, row): cell(col, row) = 0 and col + w ≤ W and row + h ≤ H and every cell of the rectangle is 0
B4. Score(col, row) → i32:
      n: i32 ← 0
      left:    n ← n + (h if col < 1 else the occupied cells in column col − 1, rows of the rectangle)
      right:   n ← n + (h if col + w ≥ W else the occupied cells in column col + w, rows of the rectangle)
      top:     n ← n + (w if row < 1 else the occupied cells in row row − 1, columns of the rectangle)
      bottom:  n ← n + (w if row + h ≥ H else the occupied cells in row row + h, columns of the rectangle)
      return 255 if n ≥ 2 × (w + h) else n

B5. InvGridPut(col, row, index, invrow):                             [C] to InvItemRemove (family put; the ItemData test)
      an item with no ItemData refuses, before the size test
      a zero size refuses
      index 0 or 1: the size is forced to 1 × 1, no bound test
      index ≥ 2: refuse col < 0, col + w > gridX, row < 0, row + h > gridY
      refuse an occupied cell
      ends at InvItemRemove
    After:                                                           [I]
      the page fill, the page byte, the location byte +0x69: body (col > 10) + 3, belt 2, a page 1
```

**What the run separates** (each control fails that many of `search`'s 4 000 cases, of `place`'s 500 where named; 112 distinct outcomes):

| Control | Wrong reading | Fails |
|---|---|---|
| `geq` | a later spot wins a tie | 707 (`place` 113) |
| `noedge` | outside sides do not count | 898 |
| `h1general` | one cell high takes the general order | 723 |
| `colright` | the general order, columns from the right | 362 |
| `rowfirst` | one cell high, rows as the outer loop | 74 |
| `firstall` | a player gets the first fit | 543 (`place` 76) |
| `bestall` | every owner gets the score | 575 (`place` 47) |
| `no255` | no early stop | 0: not separable (below) |

- B1. [C] On an empty page, one cell high for a player lands at `(W − 1, H − 1)`, taller at `(0, 0)`; for any other owner one cell high lands at `(W − 1, 0)`, taller at `(0, 0)`.
- B1. [C] The branches for `h = 3` and `w ≤ 2`, for 2 × 2 and for the rest call three bodies equal byte for byte with their call displacements masked, so the size only tells the height-1 case from the others.
- B2. [C] The stop at 255 is not separable from no stop: 255 is the highest score and only a strictly higher one replaces, control `no255` fails 0 of 4 000, and a reimplementation may leave it out.
- B2. [C] A player's search fails only where no spot fits: a best of 0 needs a free rectangle touching nothing and no slide to one that touches, and sliding finds a higher score. Family `search` of the later inventory emulation, 3 000 cases on full, near-full and one-hole pages: of the 1 747 player cases, the 779 with a free rectangle of the item's size all return 1 (191 at a spot scoring below 255) and the 968 without one all return 0; `noedge` separates 91, `firstall` 96.
- B5. [C] `InvGridFree` tests no bound itself: it tests cell `row × gridX + column` for every cell of the rectangle, signed, so a rectangle past the right edge reads the next row's cells (288 of 879 outside rectangles returned 1; EAX the page, ECX the row, DL the width, then column and height). [C] `InvPlaceItem`'s direct branch clamps a negative `x`, `y` to 0 as signed values and relies on `InvGridPut`, whose refusals are the bounds (family `place`, 2 500 cases).
- B. [C] `place` to `InvGridPut`, 500 cases with 275 distinct outcomes: the search as the caller uses it. After, `[I]`.

### C. Placing on a page

```
C1. InvPlaceItem(…, x, y, 0, 1, 0):                                  [C] ItemSkillQtyAdd calls ItemSkillQtyAdjust(1) for a player only, another unit type returning at once (family `qty`); [I] the rest: the put, the page-4 skip and the charm follow InvItemRemove's owner recompute reaches the allocator (→ … →), left to a live run
      place at the cell by InvGridPut, or by the search
      a failed put returns 0, the handler 3
      page ≠ 4: ItemSkillQtyAdd, for a player ItemSkillQtyAdjust(1)       ; a scroll's or tome's skill quantity
      an active charm then attaches                                  ; ITEMS_IsActiveCharm
C2. ItemSkillQtyAdjust(add):                            [C] to the message builder (family `qty`, 2 500 cases); [I] the send, the left and right resets, the grant and the 1
      skill ← Books[+8] for type 22 (a type-22 item that is also type 18 too), Books[+0xC] for type 18, else −1, which returns 0
      a tome with stat 70 = 0 returns 0 before the skill is looked up
      q ← stat 70 when non-zero, as it is (a negative value too);  1 for a non-tome with stat 70 = 0
      add ≠ 0: the skill's quantity + q;  a missing skill: UnitAddStat(unit, 5, q, 0), then the grant, PLAYER_SpendSkillPoint
      add = 0: less, floored at 0;  a missing skill reaches the error routine (line 0x230);  an empty left or right skill choice is reset
      sends the quantity to the client
```

- C1. [C] holds no test of a page or a stash: it gives the same outcome on page 4 as on any page (`page4_nothing` separates 341), so it is not a stash-open test. [I] So a scroll or tome placed in the stash adds nothing to the skill: `InvPlaceItem`'s page-4 skip comes after the put's `InvItemRemove`. When a charm counts is [stats/aggregate § H](../../spec-stats/aggregate/#h-items-equip-requirements-the-refresh-broken-per-level-values).

### D. The requests

A handler's "refuse" is a return of 3 or 2, discarded at the drain. Every row passed the gate first.

| Packet | Handler | Body | Tag and anchor |
|---|---|---|---|
| `0x13`, `0x16` | — | `UnitInteract(type ≤ 5, guid, action)`, ECX the player, EDX the type; `0x13`'s action is 0 (§ I); a type of 6 up returns 2; `0x16` with type 0 and the player's own guid returns 3 | [C] (family `act`; `UnitInteract`) |
| `0x17` | — | a cursor item; when `PlayerIsBusy` is non-zero, `InteractIsPlayer` non-zero returns 3 (it reads no argument); `CursorDrop` | [C] 90 logged `0x17` pairs reach `CursorDrop`'s search and place; [C] the refusal (family `mv`) |
| `0x18` | — | § E; `ItemSetPage(item, page)`, then `InvPlaceItem(…, x, y, 0, 1, 0)` | [C] to `InvPlaceItem`, the page byte written first |
| `0x19` | — | an owned item in mode 0, else 1; page byte 1, else 3; a non-empty cursor ends at `NoManaMsg`; trade test, whose 0 returns 0 with nothing moved; `InvItemToCursor` | [C] 91 logged pairs; [C] the refusals (family `mv`) |
| `0x1A`..`0x1E` |  | equip and swap with a body location: each takes the slot with `s − 1 ≤ 9` unsigned, else 2; `0x1C`, `0x1D`, `0x1E` call `InvMoveInteractTest` (0 returns 0); `0x1D` and `0x1E` need an item at the slot, else 1; `0x1D` at slot 8 first needs `TradeBeltLock` (0 returns 0); `0x1E` takes slots 4 and 5 only, else 3; `0x1A` passes the slot as a dword whose bits 8..31 are the frame's old bytes (take the byte) | [C] (family `body`, 3 000 cases; `ItemEquip`, `EquipCursorAtSlot`, `BodyToCursor`, `BodySwapCursor`, `BodySwapCursor2`) |
| `0x1F` | — | `PktIsCursorItem` on `+1`, `PktInvItemBad` on `+5` (mode 0, owned); that item on page 1 or 2 returns 3; `InvMoveInteractTest`; `PageSwapCursor(+1, +5, x +9, y +0xD)` | [C] (family `req`; `PageSwapCursor`) |
| `0x21` | — | two owned items (`PktOwnedItemBad` on `+1`, then `+5`), unequal guids, else 3; `StackRequest` (§ G) | [C] (family `req`; `StackRequest`) |
| `0x22` | — | an owned item; the stub (§ G) | [C] |
| `0x23` | — | a cursor item; `ItemToBelt(guid, box, 0)`, the box as `u32` | [C] (family `req`; `ItemToBelt`) |
| `0x24` | — | a belt item (`PktBeltItemBad`); the trade test, `InvMoveInteractTest` with an item of 0; a full cursor returns 2; `BeltToCursor` | [C] (family `req`; `BeltToCursor`) |
| `0x25` | — | a cursor item and a belt item; `BeltSwapCursor` | [C] (family `req`; `BeltSwapCursor`) |
| `0x63` | — | an item passing `PktInvItemBad` (mode 0, owned); a full cursor calls `NoManaMsg` and returns 2; beltable (ItemTypes `+0x19`), else 2; a page byte ≠ 0 returns 3; `BeltFreeSlot(inventory, item, &slot)`, then to that box | [C] |

- D. [C] **Lengths, tested first by each handler:** 3 bytes `0x1C` (a `u16` slot at `+1`, no guid); 5 bytes `0x17`, `0x19`, `0x22`, `0x24`, `0x63`; 9 bytes `0x1A`, `0x1B`, `0x1D`, `0x1E`, `0x21`, `0x23`, `0x25`; 17 bytes `0x18`, `0x1F`; any other length returns 3. Fields, as `u32`: `0x18` guid `+1`, x `+5`, y `+9`, page `+0xD`; `0x23` guid `+1`, box `+5`.

### E. Pages and the stash: `0x18`, `0x19`

```
E1. Packet 0x18 for a player, in order:                              [C] to InvPlaceItem's call
      the cursor test
      not busy and page ≠ 0: return 2                                ; the item is on the cursor, so PlayerIsBusy is 1
      page 4: a room in town (LevelIsTown: levels 1, 40, 75, 103, 109), else 3
      page 2: InteractIsPlayer, else 3                               ; it reads no argument
      page 3, 0: nothing further
      any other page, 1 and 5 up among them: return 2                ; a player cannot place on page 1 by this request
      ItemSetPage(item, page)                                        ; BEFORE the placement; the page byte is the dword's low byte
      InvPlaceItem                                                   ; ECX, EDX 0xBF6
    A non-player user has only a test of page ≥ 5, unsigned.

E2. Packet 0x19: InvItemToCursor(…, 1, 0, 0, 0):                     [C] to the remove (family `tocur`, 1 500 cases); [I] what follows the remove: `InvItemRemove`'s owner recompute reaches the allocator (→ … →), left to a live run
      out ← 0
      the cursor empty, unless the force argument (+0x1C) is set;  a full cursor returns 0 with out 0
      a missing item: out 1
      a player (type 0 only) not busy (no interaction, empty cursor, PlayerData +0x4C 0) refuses any page but 0: out 1
      the item in mode 0, else out 1
      clear the item's +0xC4 bit 1;  InvTakeItem(inventory, item)
      remove;  the page byte saved;  page 0xFF;  the cursor word;  mode 4;  event flag 4
```

- E1. [C] **A placed item needs no open stash.** The packet's item is on the cursor, so `PlayerIsBusy` is 1 and the "page ≠ 0 needs busy" test always passes. Page 4 needs a town room, page 2 an interaction with a player, page 3 nothing: `PlayerIsBusy` is 1 in every player case past the cursor test.
- E1. [I] **Forced, one case: `0x18` to page 4 with no stash open, in town (level 103), was accepted**: handler return 0, the item on page 4 at the cell sent. The page dword was written in the packet at the handler's entry (a breakpoint wrote game memory; the client UI cannot send it). A result resting on a write stays `[I]`, and the stock route is open.
- E1. [C] A refused item keeps the new page byte on the cursor, since the page is set first: the byte is written before `InvPlaceItem`'s call, and every refusal before `InvItemRemove` leaves it (1 956 of family `place`; `page_reset` separates 2 290). [I] A refusal after `InvItemRemove` (`InvPlaceSocketed` returning 0): `InvItemRemove`'s owner recompute reaches the allocator (…).
- E2. [C] Taking an item off a non-zero page, with an empty cursor, does need an interaction: a player's item is refused unless `PlayerIsBusy` (an interaction, or PlayerData `+0x4C` ≠ 0); a non-player user (type 1) is not tested.
- E2. [C] **Live: `0x19` moves neither the player's nor the game's seed**, 80 of 80 request pairs, and `0x17` likewise (§ J5). Scope: those two seeds around the handler. By § D it takes an item off a page to the cursor; no ground pickup's seed was logged.

### F. Belts

```mermaid
flowchart TD
  a{"beltable and 1 × 1?"} -->|no| z["0"]
  a -->|yes| n["numboxes ← belts row of the worn belt,<br/>or row 2 with none"]
  n --> col["for each bottom box 0..3 holding the same class or list:<br/>the first free box up that column"]
  col -->|found| ok["that box"]
  col -->|none| auto{"autobelt?"}
  auto -->|no| z
  auto -->|yes| low["the first free box of 0..3"]
  low -->|found| ok
  low -->|none| z
```

```
F1. BeltFreeSlot(player, item) → box or 0:                           [C] (family belt)
      only a beltable 1 × 1 item
      numboxes: u32 ← BeltsRecord(the worn belt's Items[+0x130], or 2 with no belt worn; set 0)[+0x004]
      for b in 0 ..< 4, when box b holds an item of the same class or the same list (hp1..5, mp1..5, rvl/rvs):
        for box in b, b + 4, b + 8, … while box < numboxes:
          if box is free: return box
      if the item's row has autobelt:
        the first free box of 0..3
      return 0
F2. BeltPlace(item):                                                 [C] to InvGridPut (family beltplace)
      BeltFreeSlot; no box returns 0;  ends at InvGridPut(box, 0, 1, 0)
F3. ItemAutoBeltTest(item) → 1:                                      [C] for an item the test accepts (families `autobelt`, `holds`)
      an autobelt row returns 1;  any other compares BeltHoldsSameGroup (0 or 1) with −1
      a null item, a non-item or a row past the Items table ends at the error routine
    BeltHoldsSameGroup: 0 for isc/tsc, a bad signature, a non-item, or a belt page made at another size than 16 × 1;
      else 1 when one of boxes 0..3 holds the same class or potion list
F4. ItemToBelt(guid, box, 0) (packet 0x23):                          [C] BeltPutItem to InvItemRemove (family `beltput`, 1 500 cases)
      BeltPutItem: an item, 1 × 1, beltable, box < 16 unsigned (−1 refuses), a belt page made at 16 × 1;  InvGridPut refuses an occupied box
      numboxes is not tested
F5. Packet 0x24: BeltToCursor;  the box's column shifts down (BeltColumnShift)   [I]
    Packet 0x25: BeltSwapCursor, in place, no shift                  [I]
    Packet 0x63: page 0 and an empty cursor;  returns 0 with no room [I]
F6. BeltOverflow(new belt or null):                                  [I]
      numboxes ← BeltsRecord(the new belt's +0x130, or row 2)        ; set 0
      for box in 0 ..< 16:
        each item at or above numboxes: removed, page 0, placed by the search
        if that fails: dropped by the ground search (§ J)
      ; its 4 direct calls: the body moves' belt-type branches (3), and a corpse's move of a worn belt (1, null)
```

- F6. [I] **At a corpse's making:** `PLAYER_CorpseCreate`'s loop over the slots and `CorpseOverflowDrop` both move a slot's item through the function, which calls `BeltOverflow(null)` when the item's base type is 19 (`belt`), so row 2's `numboxes` 4 applies: boxes 4 and up go to page 0 by the search, then to the ground. Unrun.
- F1. [C] Each of 2 000 cases to its return; boxes reached 0..12 and 15. Control `walk1` (a column walk by 1) fails 192, `nogroup` 126, `noauto` 337, `defaultbelt` 160, `secondset` 237.
- F1. [C] A row with `autobelt` 0 (stock `isc`, `tsc`, `yps`, `vps`, `wms` among them) is in no list, so it joins only a column whose bottom box holds its own class. Misc has 22 beltable rows, 8 with `autobelt` 0 (`mpo`, `mpf`, `vps`, `yps`, `wms`, `tsc`, `isc`, `hrb`), none of `hp1..5`, `mp1..5`, `rvl`, `rvs`; the `belt` family's `noauto` control fails 337.
- F3. [C] So the pickup's belt branch always calls `BeltPlace`, and the column search in it decides: `ItemAutoBeltTest` returned 1 for each of the 1 173 type-4 items with an Items row in family `autobelt`, `autobelt` set or not, and ends at the error routine otherwise; the code holds the call, `test eax, eax`, a `je` and the `BeltPlace` call (je).
- F4. [I] **Forced, one case: `0x23` with box 12 on a 12-box belt (a Heavy Belt) stays in box 12**. The box dword was written at the handler's entry; the client UI cannot send it. A result resting on a write stays `[I]`, and the stock route, and whether a smaller belt's overflow later takes the item, were not run.
- F1. [C] The starting kits' placement ran this search: [player/creation E6](../../spec-player/creation/).

### G. Stacks

```
G1. ItemsCanStack(a, b) → bool:                                      [C] (family stackok)
      all of:
        class equal, quality equal, file index equal
        the row is stackable (+0x132)
        ethereal status equal
        quality is not 0 and not 4..9
        stats 21, 22, 23, 24, 159, 160 equal
        the low byte of stat 194 is 0 on both

G2. ITEMS_GetMaxStack(item) → i32:                                   [C] (family merge, ITEMS_GetMaxStack)
      m: i32 ← Items[+0xE8] + stat 254;  if m > 510: m ← 511

G3. StackMerge(source, target):                                      [C] to the first UnitSetStat (family merge)
      sum: i32 ← source.qty + target.qty
      if sum > max: ends at UnitSetStat(target, 70, max, 0)
      else if the source is durable and below the target's stat 72: first lowers the target's stat 72
      else: the target takes the sum
    After the first set:                                             [I]
      sum > max: the source keeps sum − max and stays on the cursor;  the target gets flag 8;
        a tome adds max − target to the skill's quantity
      otherwise: stat 70 is the sum;  a tome adds the source's quantity;  the cursor is cleared and the source freed

G4. StackRequest (packet 0x21):                                      [C] to StackMerge (family `stackreq`, 2 000 cases)
      out ← 0;  InvClearUseMarks
      equal guids, a missing unit or a target (the second item) on page 2: the refuse flag; the handler returns 3
      the first item's page is not tested
      a unit found that is not of type 4, or an unstackable pair: return 0 with the flag clear; the handler returns 0 with nothing done
      else StackMerge(game, first), ESI the second
```

- G1. [C] 660 cases hold each test broken alone, with both returns met. Quality 3 and 10 stack, 0, 4 and 9 do not; stat 194 of `0x100` on both passes.
- G3. [C] 500 cases: 246 above the maximum, 87 exactly at it (the sum, not the over-branch), 167 below; 40 lower stat 72.
- G4. [I] The class compare after `ItemsCanStack`, which returns 1 with nothing merged, follows `ItemsCanStack`'s own compare of the same two words, so no case reaches its unequal branch: a reading.
- G3. [I] A negative source, target or maximum ends at the fatal path. The sum is `i32`: two stacks at the 511 ceiling give 1 022; past `2³¹ − 1` the add wraps negative, the `jle` takes the not-above branch, and its `≥ 0` test ends at the fatal path too, so no wrapped value is stored.
- G. [C] **There is no split on the server.** Packet `0x22` reaches `UnstackStub`, `xor eax, eax; ret 8`, and the handler has no other path to a split. The handler returns 3 for an owned item, since the stub leaves the `&len` out word at 5 and the test fails, and `PktOwnedItemBad`'s non-zero otherwise; the drain discards it, so no outcome changes (*corrected 2026-11-16, S4c: this said the handler returns 0*). Scope: the handler and the 12 request rows of § D only; the rest of the packet table was not read for a request that divides a stack (gold's withdraw and drop, for one, are other requests).

### H. The cursor to the ground

```
H1. CursorDrop(user):                                                [C] the item placed: 90 logged 0x17 pairs, one search, one place at the found cell; [I] the rest: the cursor clear, InvSetCursor(inventory, 0) after the search's and the placement's pool allocations, left to a live run
      InvClearUseMarks;  the item, mode 4
      room ← GroundDropCell(user's room, user's position, &out, 1, fallback 1)     ; § J
      room = null: nothing moves; the item stays on the cursor
      ItemPlaceOnGround(…, room, out)                                ; § K
      the cursor cleared;  flag 1 for an item holding items;  flag 0x4000 cleared
      CubeDropEmptied(item)
H2. CubeDropEmptied(item):                                           [I]
      for code box: each item on page 3 moves to the cursor word, to page 0 and into the search
      if none fits: it takes the ground search and ItemPlaceOnGround
```

- H1. [I] With `fallback` 1 a full surround does not give null: the item lands on the blocked start cell (J2). Null needs a moved base that cannot see the start, or a null first room.

### I. Pickup

```mermaid
flowchart TD
  a["UnitInteract: an item, mode 3"] --> d{"d ≥ 51?"}
  d -->|yes| n["nothing"]
  d -->|no| r{"d < 5 and<br/>a clear line?"}
  r -->|no| w["walk there: the pickup runs<br/>in a later frame's mode pass"]
  r -->|"yes, action 0"| inv["PickupToInv"]
  r -->|"yes, other action"| cur["PickupToCursor"]
  inv --> g["gold"]
  inv --> s["auto-stack"]
  s --> e["auto-equip"]
  e -->|"a location, BodyLocTest ≠ 1"| fl["refuse flag: nothing moved"]
  e -->|"no location"| b["belt"]
  b --> p["inventory page 0"]
  p --> no["refusal 0x17: nothing moved"]
```

```
I1. UnitInteract, the item case:                                     [C] to the pickups, the walk and the line test (family `pick`, 2 500 cases); [I] the walk after a blocked line and the re-test at its end
      a missing item, or the unit's mode not 3: return 1
      d: i32 ← UnitInteractDistance(user, item)
      if d ≥ 51: return 1
      if d < 5 and UnitsLineBlocked(user, item, 0x804) = 0:
        action 0: PickupToInv;  else: PickupToCursor
      else: InteractWalkTo, pushed −2 for a non-zero action, −1 for 0, EDI 4: the walk   ; it then starts PLAYER_ModeCmdUnit; the reach and line tests run again at its end, in PlrModeMoveFrame

I2. UnitInteractDistance(a, b) → i32:                                [C] (family dist, to the return)
      dx, dy ← |dx|, |dy|;  sa, sb ← the units' sizes
      if dx < 8 and dy < 8 and sa < 4 and sb < 4:
        v: i32 ← table[dx + 8 × dy]
        if v < 0: return 0
        if sa = 3 or sb = 3: v ← max(v − 1, 0)                       ; a size of 3 takes 1 off, floored at 0
        return v + 1 if sa < 2 or sb < 2 else v
      dx ← max(dx − ((sb >> 1) + (sa >> 1)), 0);  dy likewise
      return 2 × max(dx, dy) + min(dx, dy)

I3. UnitsLineBlocked(a, b, mask) → i32:                              [C] to COLL_LineTest or UNIT_CollUnmark (family los)
      both units' masks are tested against mask;  a unit overlapping it ends at UNIT_CollUnmark     ; after it: marked again after the test, a reading
      touching (|dx| + |dy| < min(sa, 2) + min(sb, 2)): return 0
      else ends at COLL_LineTest(first unit's room, a', b', mask)    ; each end moved toward the other by its unit's clamped size

I4. PickupToInv, in order:                                           [I] (all of I4)
      a. cursor empty and not busy, else return 0
      b. the unit's mode 3, else the refuse flag
      c. InvClearUseMarks;  ItemQuestGate;  a refusal calls PickupRefused(0x13)
      d. UnitSetEvent
      e. gold → GoldPickup
      f. PickupAutoStack (I5)
      g. ItemAutoEquipSlot (I6) names a location:
           BodyLocTest(user, loc, item, 0) = 1 → the body
           else the refuse flag, return 0                            ; no belt, no inventory, no PickupRefused
      h. no location: beltable and BeltPlace
      i. InvAutoPlace on page 0
      j. PickupRefused(0x17)                                         ; back to mode 3, event; nothing moved

I5. PickupAutoStack:                                                 [I]
      type 22: into the first tome of its kind with room             ; type 18, the same ITEMS_GetSuffix, quantity below the maximum
      type 18: the same finder and a merge
      a stackable row whose item type's byte +0x13 is set: PickupStackMerge
      otherwise 0, and I4 goes on
    PickupStackMerge: while the source's stat 70 > 0:
      the next stack with room, after the last target                ; a quiver type looks at the body first
      none: return 0
      sum > max: the target takes the maximum, the source the rest, a tome's skill adjusts;  loop
      else: the source is unlinked and freed;  return 1

I6. ItemAutoEquipSlot(user, item, &loc, skipReq):                    [C] (families `auto`, 6 000 cases, and `req`, 6 000, ItemReqCheck's quality-default level path)
      skipReq = 0: ItemReqCheck(item, user, 0, 0, 0, 0); its 0 gives 0, &loc untouched
      needs ItemTypeBodyByte ≠ 0, flag 0x10, not disabled (flags 0x100, 0x4000), not type 38
      Quiver of the item's type set (+0xE): a hand (locations 4, then 5) must hold a weapon whose Shoots (+0xC) the item is, else 0
      BodyLoc1 = BodyLoc2 (+0xA, +0xB): that location if empty      ; a location above 12 reads as empty and is returned
      BodyLoc1 ≠ BodyLoc2:
        both empty: BodyLoc1
        one empty: it, when EquipPairCompatible(item, the other)   ; a location of 0 is a slot like any other
        else 0
    EquipPairCompatible, by ItemTypes.txt rows:
      bow and bow quiver, crossbow and crossbow quiver (types 27, 5 and 35, 6)
      a one-handed weapon and a shield (45 without the two-handed test, 51)
      two one-handed weapons when both have flag 7 (a class-4 user, or class 6 and type 67)
      two of type 10

I7. PickupToCursor:                                                  [I]
      I4's a, b, c;  gold
      else: remove from the room;  the cursor word;  mode 4;  page 0xFF;  event flag 0x40;
            clear flag bit 25;  QUESTS_RaiseItemPlaced;  UnitSetEvent last
```

The distance table (row `|dy|`, column `|dx|`), 64 `i32`, indexed `× 4`, as family `dist`'s kept output prints it.

```
 -1 -1 -1  0  2  4  6  8
 -1 -1  0  1  2  4  6  8
 -1  0  0  2  3  5  7  8
  0  1  2  2  4  5  7  8
  2  2  3  4  5  6  7  9
  4  4  5  5  6  7  8  9
  6  6  7  7  7  8 10 10
  8  8  8  8  9  9 10 11
```

- I2. [C] 1 500 cases, 145 distinct outcomes: `plainmanh` fails 1 419, `sizeless` 682. Player to item, `d < 5` reaches 22 of the 64 `|dx|, |dy|` pairs under 8: `|dx|` 0 to 2 with `|dy|` 0 to 4, `|dx|` 3 with `|dy|` 0 to 3, `|dx|` 4 with `|dy|` 0 to 2; among them `(4, 2)`, and not `(3, 4)` or `(5, 0)`. Sizes: `UNIT_GetSizeX` is 2 for a player, 1 for an item, the record's `+0xD0` for an object; a monster and a missile were not run.
- I3. [C] `swapsizes` fails 129, `noshorten` 262 of 600. `COLL_LineTest`'s own result is [drlg/collision](../../spec-drlg/collision/)'s `[I]`, not this run's. Pickup's mask `0x804` does not overlap an item's `0x200`; a player's mask at `path+0x4C` was declared, not read from a game.
- I1. [I] **The one item request that leaves the drain**: `d ≥ 5`, or `d < 5` and a blocked line, with `d ≤ 50`, starts the walk. A later request in the same drain sees the item still on the ground.
- I4. [C] **`nopickup` is not read in the two pickups**: `g_NoPickup` has 4 abs32 references, all client (`ClientMonCreate`, `ChatInputParse`), none in the two pickups or their 36 direct callees. [I] **Ownership (who dropped it) is not among any test read there.** Scope: these two functions and their direct callees' first level, not the gate's whole body, which [items/quest-drops](../quest-drops/) holds.
- I4. [I] Gold and the party share are [items/economy G](../economy/#g-gold-payment-caps-piles-and-the-death-loss).
- I6. [I] The ninth flag word of `EquipPairFlags` is never read by `EquipPairCompatible`.
- I6. [I] **Body locations are BodyLocs row indices.** ItemTypes `BodyLoc1`/`BodyLoc2` (u8, `+0xA`, `+0xB`) hold the
  row index of BodyLocs (0 `None` .. 10
  `Gloves`) and go straight into the inventory's body-location calls; `BodyLocs.bin` loads only under `-txt`
  ([data/excel](../../spec-data/excel/#b-loading-one-table) B1), so nothing translates them through a code.
- I5. [I] **A pickup-merge's remainder** stays the same item, its quantity reduced, and goes on down I4 (equip, belt, inventory). With no room there, `PickupRefused(0x17)` puts it back in mode 3 on the ground with its reduced count, and the merged stacks keep what they took. The fatal line after the loop (`0x606`) needs a source reaching 0 outside the return, which no branch read does.

### J. The ground drop's cell

```mermaid
flowchart TD
  p["position (x, y)"] --> o{"room or its near list<br/>holds (x + 2, y + 3)?"}
  o -->|yes| s1["start ← (x + 2, y + 3)"]
  o -->|no| s2["start ← (x, y)"]
  s1 --> t{"start free?"}
  s2 --> t
  t -->|yes| ok["return its room"]
  t -->|no| rr["rings 1..49: side columns,<br/>then end rows"]
  rr -->|"a ring holds a free cell"| b["its lowest |dx| + |dy|,<br/>the earliest of equals"]
  rr -->|none| f{"fallback?"}
  f -->|1| blk["the start cell, blocked or not"]
  f -->|0| nl["null; out keeps the start"]
```

**What this section's `[C]` is.** Every `drop` `[C]` below is a `[C]` by emulated reproduction **given that the allocation returned a writable block**, at size 1 and step 1: the code's map on declared rooms and one declared pool page. It is not a live run, and not how often a game's rooms make a statement matter; the rows the evidence table's *Live raise* column marks raised are live as well, in the scope it gives. [C]

```
J1. GroundDropCell(room, pos, out, size: i32 = 1, fallback: i32) → room:    [C] (family drop, 4 000 cases, to the return, given the block; all of J1–J2 but the cell mask's bits 0x1 and 0x800; COLL_FindFreeNear)
      start ← (pos.x + 2, pos.y + 3) if RoomAt(room, that) ≠ none else pos
      out ← start
      return FreeNear(room, out, origin: pos, A: 0x3E01, B: 0x801, fallback)

J2. FreeNear(base, out, origin, A, B, fallback) → room:
      (sx, sy) ← out
      r ← RoomAt(base, out);  base ← r                               ; kept even when null
      if r and Cell(r, out, A) = 0 and Walk(r, out, origin, B) = 0: return r
      for ring: i32 in 1 ..< 50:                                     ; ring 50 is never looked at
        best ← none
        for y in sy − ring ... sy + ring:  Try(sx − ring, y);  Try(sx + ring, y)      ; side columns
        for x in sx − ring + 1 ... sx + ring − 1:  Try(x, sy − ring);  Try(x, sy + ring)   ; end rows
        if best: out ← best's cell;  return RoomAt(base, out)
      return RoomAt(base, out) if fallback ≠ 0 else null             ; out keeps the start

    Try(x, y):
      r ← RoomAt(base, x, y);  if r = none: skip
      base ← r                                                       ; moved before the tests
      if Cell(r, (x, y), A) ≠ 0 or Walk(r, (x, y), origin, B) ≠ 0: skip
      d: i32 ← |x − sx| + |y − sy|
      if no best or d < best.d: best ← (x, y), d                     ; the earliest of equals stays

    RoomAt(base, x, y): null base: null;  base holds it: base;
                        else the first of base's near list, in list order, that holds it;  else null
    Cell(base, (x, y), mask): r ← RoomAt(base, x, y);  no r, no map or no cells: 0x27;  else r's cell & mask

J3. Walk(r, (x, y), origin, mask) → 0 or 1:                          [C] (family line, 800 cases, to the return; COLL_CellTestAt)
      loop:
        if Cell(r, (x, y), mask) ≠ 0: return 1                       ; a step with no room, map or cells: 0x27, blocked
        d: u8 ← field[row 128 + y − origin.y, column 128 + x − origin.x]
        (x, y) ← (x + dx[d], y + dy[d])
        if the new cell's byte is 8: return 0                        ; the origin is tested only when the walk starts on it
```

**Each line's evidence.** The emulated column is `drop`'s 4 000 cases, 0 mismatches, 55 distinct outcomes; "fails" is the count a wrong reading fails. The live column is 118 searches over the three kept logs (37, 41 and 40), 0 mismatches. **They are not 118 independent cases:** a player's drops are chains in place, each drop's mark an input of the next, at six spots (6 and 4 in the first run; 24 at the start, 12 at the parapet, 4 in the City, 40 at the crowd spot in the second), and the other 28 are `DropCreateItem` drops at 24 positions. The *Live raise* column is the raise with these logs as the second source beside the emulation: a spot is one chain or one drop position (30 in all), and a row counts the spots where a wrong reading fails. Where it says raised, the row's `[C]` is live as well as emulated, in the scope it gives; elsewhere the row's `[C]` is the emulated one. [C]

| Statement | Emulated | Live | Live raise |
|---|---|---|---|
| The start `(x + 2, y + 3)` when the room or its near list holds it | `nooffset` 2 474, `offset32` 2 232 | `nooffset` 37, 38, 39; `offset32` 37, 32, 33 of 37, 41, 40 | **raised**: both fail at all 6 chain spots and all 24 drop positions |
| The start `pos` otherwise | 617 accepted and 24 by the fallback | not reached | emulated only |
| The item bit `0x200` in the cell mask | `noitembit` 647 | `noitembit` 12, 37, 39 | **raised**: 6 chain spots and 2 drop positions, each failing at ring 3 or below |
| `0x200` not in the walk mask | the walk mask's 16 bits each decided (J1) | no control of its own: `linecellmask` adds `0x3C00` with it | emulated only |
| The walk's mask is `0x801`, not the cell mask | `linecellmask` 1 041 | `linecellmask` 4, 15, 24 (2 undecided, read past the window) | **raised**: 4 chain spots and 2 drop positions |
| The walk is tested at all | `noline` 567 | `noline` 0 of 37, 0 of 41, **31 of 40** | **in part**: one chain spot (the crowd's 40 drops), raised for that spot only |
| A ring's lowest distance, the earliest of equals | `first` 717, `leq` 559 | `first` 13, 28, 30; `leq` 11, 24, 31 | **raised through ring 3**: `first` at 6 chain spots and 4 drop positions, `leq` at 5 and 3; rings 4 and beyond (7 searches, one chain spot) emulated only |
| Side columns before end rows | `capsfirst` 476 | `capsfirst` 8, 12, 13 | **raised through ring 3**: 5 chain spots and 3 drop positions; rings 4 and beyond emulated only |
| Rings reached | ring 1: 981 cases; 2..5: 376; 6..20: 58; 21..46: 1; 47..49: 18 | start 27, ring 1 31, ring 2 32, ring 3 21, ring 4 or beyond 7 | — |
| Ring 49 is the last | `r48` 6, `r50` 6, on 36 far cases with one free cell at ring 47 to 51 or none | not reached | emulated only |
| The walk's path and room | `linediag` 220, `lineorigin` 296, `lineroom0` 43 | not separated | emulated only |
| The base room moves | `fixedbase` 95 | **`fixedbase` 0 of 37, 0 of 81** | emulated only |
| `fallback` 1 on the blocked start; `fallback` 0's null | 119 on the blocked start; `alwaysfallback` 47 | not reached | emulated only |
| A null return with `fallback` 1, a moved or null base | 374 | not reached | emulated only |

Step notes:

- J1. [I] **The cell mask's bits `0x1` and `0x800` are not decided.** Removing either fails 0, since the cell test is followed at once by the walk, whose first test is the same cell in the same room with those two bits, so no output separates them at this caller. No output changes here, since either test refuses the cell; a reimplementation must not carry the cell test's two bits to a caller with another walk mask. The value `0x3E01` is the immediate.
- J1. [C] The cell mask's bits `0x200`, `0x400`, `0x1000`, `0x2000` and its ten absent bits are each decided, and all 16 of the walk mask: one bit changed, 99 to 647 cases fail. So a cell holding another ground item (bit `0x200`) is refused and does not stop a walk over it.
- J1. [I] The bits' names are [drlg/collision](../../spec-drlg/collision/)'s: `0x3E01` has bits 0, 9, 10, 11, 12, 13; `0x801` bits 0 and 11.
- J2. [C] **Rings**: ring 50 is never looked at. The pair form pushes radius 50 and step 1, and after ring `r` the loop goes on only while `r + 1 < 50`.
- J2. [C] **The base room moves.** The lookup that finds a candidate's room starts from the last non-null room a lookup returned, not from `room`, and the first lookup's result is kept even when null. A cell is reachable only through that room's near list, and the walk is tested from the candidate's room. The result's lookup uses the moved base too, so with no free cell and `fallback` 1 the return can be null though the start cell lies in the first room, and a found cell's return can be null too when the last room tried does not list it. **By emulation only: no live search has separated it** (`fixedbase` fails 95 of 4 000 cases on declared rooms, 0 of 81 live).
- J2. [C] **No free cell:** `fallback` 1 takes the start cell, blocked or not, in the room the last lookup gives; `fallback` 0 returns null and `out` keeps the start.
- J2. [C] **The search makes no draw:** it is given no seed, and the 567 functions of its closure (463 bodies, 104 external) hold no step and no `RNG_` call; 54 indirect calls unfollowed. The live pairs of J5 bound only the player's and the game's seeds around `0x17`. (`GroundDropCell`, `rcg-summary.txt`)
- J2. [I] A refused allocation is the fatal line `0x730`, and gives no output.
- J3. [C] `line`: `linediag` 69, `lineorigin` 18, `lineall` 281 of 800. The field is `expfield.d2`: row `128 + y − oy`, column `128 + x − ox` of the 256 × 256 bytes after the file's 10-byte header; byte `d` steps `dx[d]`, `dy[d]`, with `dx` = 0, 1, 1, 1, 0, −1, −1, −1, 0 and `dy` = −1, −1, 0, 1, 1, 1, 0, −1, 0; 8 is the centre. Over the whole file every one of the 65 536 cells walks to the one byte 8 at `(128, 128)`, longest in 128 steps, none leaving the table, each walk as long as the Chebyshev distance.
- J3. [C] The 128 is declared to the run; the loader stores half the file's 256 rows and columns: `FieldLoad` stores width `+2` and height `+6` each `>> 1`, and `expfield.d2`'s header is 256 × 256. The candidates stay within 52 of the origin, inside the ±127 the table covers.

**Imports and what is not evidenced**. `drop` runs with two lock slots holding a pop-only stand-, bytes `C2 04 00`, `ret 4`: `KERNEL32!EnterCriticalSection` and `KERNEL32!LeaveCriticalSection`, rule (a); nothing is patched. The kept scan: 24 functions the 4 000 cases execute, 8 lock calls, 6 executed, 0 read `EAX`, `ECX` or `EDX` before writing them, the flags too. **Not evidenced:** what the locks do (mutual exclusion, another thread's order, a wait, a fault), a lock guarding memory the search reads, the allocator's code on any state but the declared pool page, the block's address. The block only holds the origin's two words, and the walks read them back; the checker compares no address the allocator chose. [C]

#### J4. Who drops, and with what

- [C] Direct calls: 20 of the search, all with `size` 1 and `fallback` 1, in 18 functions. Its callers: monster and chest drops through `DropCreateItem` and `DropItemAtUnit`, `CursorDrop`, the belt overflow, the cube's contents, the corpse overflow, NPC menus, shrines, `DropRolledAtPos`, `DropEar`, `NpcDropCreate`, `PLAYER_CorpseCreate`, `ObjDropCreate`, `ObjDropCreate2`, `DropItemCodeAt`, `TargetBeltItemToGround`, `MissDo18ChestSpawner`.
- [C] Of the pair form's 7 direct calls (no abs32): the search; four item-drop bodies that inline the same start and masks with `size` 1 and `fallback` 1 (`DropGoldPile`'s); `DropGoldAmount`'s with `fallback` 0, so its pile with no free cell is not dropped; `PortalObjectCreate`'s with `size` 3, masks `0x3E01`, `0xC01`, `fallback` 0.
- [C] `ItemPlaceOnGround`'s null-room branch returns having written nothing, the flag set or not (family `ground`, 35 cases; `null_raises` separates 30). [I] **A null room from the search:** `CursorDrop` and `DropCreateItem` test it and do nothing (the item stays on the cursor; no item); both tests lie past the search's pool allocation. `NPC_MenuAction` and `CorpseOverflowDrop` pass it to `ItemPlaceOnGround`.
- [C] **Draws beside the search.** `MissDo18ChestSpawner` draws twice on its unit's seed for an offset (`RNG_RangeB(2n + 1) − n`, x then y) and then calls the search from there. `SHRINE_Exploding` and `SHRINE_Poison` step a unit's seed for a range before it, unread further. `TargetBeltItemToGround` (a target player's belt item, not a monster's drop) steps its unit's seed once, inline, and returns unless `low mod 100 ≥ 30` before anything else. An inline step search of the 20 callers' bodies finds these and no other; the chest spawner's two draws before the search are read from the code. The calls to the `RNG_` functions in them, now scanned, add the chest spawner's two and one `RNG_RangeB` in `NPC_MenuAction`, whose order to the search was not read.

#### J5. Seeds around a cursor drop

- [C] **Live: a cursor drop (`0x17`) moves neither the player's nor the game's seed**, 80 of 80 request pairs, beside `0x19`'s 80 (§ E). Scope: those two seeds around the handler, not the whole drain or other units' seeds.
- [I] **A monster's drop inside a death:** a seed trace through the drain was not built. The item creation's draws are items.

### K. A ground item's life

```mermaid
stateDiagram-v2
  [*] --> zero: ItemCreate, +0x24 = 0
  [*] --> timed: ItemPlaceOnGround, +0x24 = ItemGroundExpiry
  zero --> record: the room deactivates
  timed --> record: the room deactivates
  timed --> freed: the sweep, +0x24 ≤ frame
  record --> restored: the room comes back, +0x24 = max(saved, frame + 15000)
  restored --> freed: the sweep, +0x24 ≤ frame
  restored --> record: the room deactivates
```

```
K1. ItemPlaceOnGround(game, flag, item, room, x, y):                 [C] (family ground, to the return, the room's flag 4 declared; UNIT_CollMarkRect)
      room = null: writes nothing
      the path's room and cell;  cell |= 0x200
      unit +0xC4 |= bits 1, 12 and 25, and bit 0 by UNIT_SetMode(3), so it ends | bits 0, 1, 12 and 25
      mode 3 from mode 3 or 4;  page 0xFF
      item data +0x24 ← ItemGroundExpiry(item, frame)
      if flag ≠ 0: QUESTS_RaiseItemDropped, last                     [C] to its entry, after every write; the flag is EDX, any non-zero value; only the pops and ret 0x10 follow (family `ground`, 400 cases, QUESTS_RaiseItemDropped)

K2. ItemGroundExpiry(item, frame: i32) → i32:                        [C] (family expiry, to the return)
      a quest base:                    0
      quality 4:                       frame + 30000
      qualities 5..9:                  frame + 45000
      base type 4 (gold):              frame + 45000 if stat 14 > 10000 else frame + 15000
      a socket filler:                 frame + 30000
      otherwise:                       frame + 15000

K3. Every frame with frame mod 1500 = 0, for acts 0..4: ActExpiredItemsFree, then the records' expiry    [C] (the sweep's period and order: family sweep, to the first unit reached or record freed)
    ActExpiredItemsFree(game, act):                                  [C] to UnitGetRoom, in room order and each room's list order, up to the first reached (family sweep)
      for each type-4 unit with +0x24 ≠ 0 and (i32) +0x24 ≤ (i32) frame:
        ends at UnitGetRoom
    After:                                                           [C] unlinked: 26 frees, each id listed at its sweep and in no later one; [I] sent to every player (one player per session)
        unlink;  sent to every player;  freed
```

**Three lives.** [I] holds for each row until its own note lifts part of it.

| How it got to the ground | Item data `+0x24` | In a room that stays active |
|---|---|---|
| `ItemCreate`: a monster's or chest's drop, `DropGoldPile` | 0 (zeroed, no writer on the path) | never swept |
| `ItemPlaceOnGround`: a player's drop, an overflow, `DropGoldAmount`, NPC menus, the cube's | `ItemGroundExpiry` | freed at the first multiple of 1 500 at or past it |
| Restored from a record: `saved` is `ItemGroundExpiry` at the save's frame, not the old `+0x24`, for any of the above | `max(saved, frame + 15000)`, 0 stays 0 | as above |

Step notes:

- K1. [C] **Live: `ItemPlaceOnGround`'s expiry by quality and base, 80 of 80 drops, 21 (base, quality) groups, each delta in the a-priori table**: `+15000` for qualities 1, 2, 3 (potions, rings), `+30000` for quality 4 and for the filler (gems, runes, a jewel), `+45000` for qualities 5, 6, 7, 8. The first inventory run's 10 of 10 quality-2 `+15000` agree. Qualities 1, 3, 8 and the jewel and runes are built states of the recipe, each drop a real click. **Not run:** gold, a quest item, quality 9, a socketed item.
- K2. [C] Family `expiry`, 600 cases, 4 distinct outcomes: `goldgeq` fails 6, `q4eq45` 50, `fillerplain` 67. Gold's two branches and the quest base's 0 rest here. [drlg/lifecycle G1](../../spec-drlg/lifecycle/#g-the-records) counts the logged branches.
- K2. [C] The add wraps as `i32`: for `+45000`, frame 2 147 438 647 still fits and 2 147 438 648 wraps negative, and a negative expiry is `≤ frame` at the next sweep. No game reaches that frame: about 2.7 years at 25 frames a second.
- K2. [C] **Quality 9** is in the code's `5..9`: it adds 45 000 (family `expiry`, 800 cases with quality 9 weighted; `q9plain` separates 166, `q9as4` 190). [C] No enabled stock CubeMain row gives an output of quality 9: the token `tmp` is in rows 142–145 only, all with `enabled` blank. [I] No stock path makes one (the cube's tempered rows are disabled, [items/cube](../cube/)); the code path that can is `RecipeOutputCreate`, which sets quality 9 when the recipe output's byte `+0x06` is 9; the creation request's `+0x30` writers and any direct store to the item's quality byte were not read.
- K3. [C] `sweep`, 600 cases with 9 distinct outcomes: `ltframe` (`<`) fails 92, `zerofrees` (0 expires) 69.
- K3. [C] **Live: a player's drop of quality 2 is swept at the first multiple of 1 500 at or past `frame + 15000`**: 4 of 4 (frames 3 659..3 863, `+0x24` 18 659..18 863), freed at the sweep of frame 19 500, with the control, five monster drops lying beside them, still there at 21 000 and 22 500. Scope: quality 2, one sweep, an active room; no message or seed was logged. Six more predictions, for drops whose room had gone inactive, are excluded on the player's logged level at every later sweep, and the room's own activity was not logged.
- K3. [C] So 15 000 frames is 10 minutes at 25 a second, and the free falls up to 1 499 frames later: 35 logged sweeps all at multiples of 1 500, 26 frees with lags 0..1 322, every due listed item freed. [I] A held item keeps its old `+0x24`, unread: only a room's list is swept, and a new drop overwrites it.
- Row 1. [C] **Live: a drop made through `DropCreateItem` has `+0x24 = 0` at creation, 27 of 27**, after `ItemCreate`, and five of them (ids 58, 64, 65, 66, 67, frames 2 698..5 013) were listed in every sweep dump from the first after their creation to the last (frame 22 500), 12 to 14 dumps each, `+0x24 = 0` every time, none freed: 79 sightings. Scope: this path, the 27 creations and the 5 items followed. The log does not tell a monster's drop from a chest's, and the session's source was kills.
- Row 1. [I] **"Never swept" stays the reading**: a longer life than that session, `DropGoldPile`, and any writer the scan's form misses (`ItemCopy`, a block copy; `ItemCreate`'s deeper chains) were not followed. `ItemCreate` goes through `SUnitCreate`, whose item data is zeroed, and neither calls `ItemGroundExpiry`.
- Row 2. [C] The placement and the expiry's write, K1. Its callers: 12 rel32 call sites, no other, no abs32, by the raw scan. [C] (`ItemPlaceOnGround`, `static.txt`)
- Row 3. [C] **Live: the restore's write, 40 of 40**: the item's `+0x24` is `frame + 15000` in 26 (qualities 1, 2, 3: `saved` below the limit) and the saved word in 14 (the items of `+30000` or `+45000`). Scope: restores in the town (36 at frame 4 678) and the City of the Damned (4 at frame 4 131).
- Row 3. [I] **Not observed: a saved word of 0 ("0 stays 0") and `saved` equal to the limit.** No quest base or zero-expiry item was saved.
- Row 3. [C] **Live: `InactiveItemSave`'s saved word is `ItemGroundExpiry(item, frame)` computed afresh, 45 of 45**, not the old `+0x24`: monster drops with `+0x24` 0 (a City monster drop, 1 case) and player drops with `+0x24` set (44) alike. So a player's drop is lengthened too.
- Row 3. [C] **Live: a restored copy is swept at the first multiple of 1 500 at or past its restored `+0x24`, 22 of 22 resolved.** 14 more restored copies have their expiry past the session's last dump (frame 24 000) and are unresolved; 4 were saved again before their predicted sweep and are excluded on that game call's logged line, as are the 40 town drops of that session. The 40 `crowd` sweeps are unresolved.
- Row 3. [C] **Met in the first inventory run, not predicted:** three monster drops whose room went inactive came back at the same class and cell with `+0x24 = 17 766`. The reading `max(saved, frame + 15000)` is `[I]` for that run, which did not log its inputs; the second inventory run logged them.

### L. Draws per seed

| Path | Draws | Tag |
|---|---|---|
| The search, `InvGridFree`, the score, `InvRowForUnit`, the table readers, `BeltFreeSlot`, `ItemsCanStack`, each to its return | 0: no traced access to a unit's seed (`unit+0x20`) | [C] |
| `GroundDropCell`, `FieldWalkBlocked`, `ItemGroundExpiry`, the distance | no seed is given; closures of 567, 551, 556, 551 functions, 0 with a step, 54 indirect unfollowed each | [C] (`GroundDropCell`, `rcg-summary.txt`; the same second walk) |
| `ItemPlaceOnGround`: closure 711 functions, 1 with a step: `RNG_RangeB` on `unit+0x20`, in `UNIT_AnimInit`'s type-2 branch; family `ground` takes the item branch | 0 for an item | [C] |
| `0x17`, `0x19`: the player's and the game's seeds around the handler | unchanged, 160 of 160 | [C] |
| The moves: 2 096..2 122 functions, 118 with a step, 112 indirect | not bounded | [I] (`rcg-summary.txt`) |

- [C] No move's own body holds a draw: the 13 move bodies hold no step and no `RNG_` call. A whole move's bound past the two logged requests is open. (`rcg-summary.txt`)

## Outputs

An item's page, cell, mode and location byte; a belt box; a body location; the cursor word; a stack's quantity; a ground cell with its `0x200` mark, room and `+0x24`.

## Worked example

**A chain of drops in place**, session `crowd` of the second inventory run: a player standing at `(5032, 5027)` drops item after item in the Act IV town, each with its logged cell, frame and search (`GDI`, `GDO`, `IPX`; the cells from the first six `ground` rows). The start is `(5034, 5030)`; each drop blocks its cell for the next by bit `0x200`, so the rule gives ring 1's distance-1 cells in try order, then its corners. [C]

| Drop | Frame | Cell | Offset from the start | Why |
|---|---|---|---|---|
| 1 | 264 | `(5034, 5030)` | 0, 0 | the start, free; `+0x24` 15 264 |
| 2 | 327 | `(5033, 5030)` | −1, 0 | ring 1, side column, row `sy`, `d` 1, the earliest of equals |
| 3 | 391 | `(5035, 5030)` | +1, 0 | ring 1, side column, row `sy`, `d` 1 |
| 4 | 454 | `(5034, 5029)` | 0, −1 | ring 1, end row, `d` 1 |
| 5 | 517 | `(5034, 5031)` | 0, +1 | ring 1, end row, `d` 1 |
| 6 | 580 | `(5033, 5029)` | −1, −1 | ring 1, `d` 2: the earliest corner in try order |

**The placement search on an empty 10 × 4 page, for a player** (`spot_find`, a model of the emulated search; the sequences are not logged in a game, § 10 cases 1 and 2). [C] Family `seq` emulates both sequences, each case's page the previous placements, with these outcomes

- Five 1 × 1 items in turn: `(9, 3)`, `(9, 2)`, `(9, 1)`, `(9, 0)`, `(8, 3)`.
- 2 × 3, then 1 × 4, then 2 × 2, then 1 × 1: `(0, 0)`, `(9, 0)`, `(2, 0)`, `(0, 3)`.

## Reimplementation notes

- **The drop's base room moves between lookups.** A fixed-room search agrees with all 118 live searches and still fails on declared rooms, so a test on open ground cannot catch it. [C]
- **A monster's drop has `+0x24` 0 and a player's does not**, so "items last 10 minutes" holds for one of them only, on the path run. [C]
- **The save recomputes the expiry**, so leaving a room can lengthen any item's life, a player's drop too. [C]
- **A player's search and any other owner's differ** in score against first fit and in the one-cell-high order. [C]
- **`0x18` sets the page before the placement**: a refused item carries the new page byte. [C] for every refusal before `InvItemRemove`; [I] for a refusal after it (E1)
- **`DropGoldAmount` passes `fallback` 0**; every other direct drop passes 1. [C]
- **Store `gridX`, `gridY` as bytes**: the Hireling second-set rows hold 255 from blank cells. [C] (data)
- **Trading is specified in [items/trade](../trade/)** (*2026-11-10, *): pages 1 and 2, the trade test and what it does to a trading player's moves are there. [I]
