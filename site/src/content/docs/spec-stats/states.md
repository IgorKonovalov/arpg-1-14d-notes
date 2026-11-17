---
title: "States: the timed apply, expiry, the group clear, the regeneration tick, auras, shrines and wells"
sidebar:
  order: 3
---

## Purpose

A state on a unit is a bit in the unit's state set and, usually, a stat list under the unit carrying the state id.
This spec gives the common timed apply (`STATE_ApplyTimed`: the curse rules, refresh, refusal and replacement), the
end of a timed state in frames, the other removals, the `group` clear, the player's per-frame regeneration tick (life
by stat 74, stamina by mode, mana), the aura runs on their `perdelay` grid with their target states, and the shrine
and well operates that apply a state or refill. The stats a state's list carries reach the unit's full values by
[stats/aggregate](../aggregate/); what a skill does when it is used is phase (3). Overview and boundary:
[stats](../overview/).

```mermaid
stateDiagram-v2
  [*] --> Applied: STATE_ApplyTimed (bit set, list linked, event 12 at frame + duration)
  Applied --> Applied: same state, skill and level (end frame moved, stats kept)
  Applied --> Applied: lower level of the same skill (refused, nothing changes)
  Applied --> Replaced: other skill, higher level, or another curse
  Replaced --> Applied
  Applied --> Removed: event 12 with end frame at or before the frame
  Applied --> Removed: group clear, death purge, mode drop, aura skill switch, explicit remover
  Removed --> [*]: list unlinked (its stats leave the cache), remove callback clears the bit unless it stays on death
```

## Entry points

| When | Function | Tag |
|---|---|---|
| A timed state is applied (skills, auras, shrines, open wounds, prevent-heal) | `STATE_ApplyTimed` | [C] (3 643 calls) |
| A timed list's end frame is reached (unit event 12) | `EVENT_TimedListExpire` → `UNIT_ExpireTimedLists` | [C] (2 749 runs) |
| States of one `group` are cleared | `STATE_GroupClear` | [C] (450 calls; 43 different-state clears; 24 in group 3) |
| A player's regeneration tick (player event 3, every frame) | — | [C] (54 719 ticks) |
| An aura runs (unit events 8 and 9) | `EVENT_SelectedAuraTick`, `EVENT_ItemAuraTick` | [C] (3 629 runs) |
| A shrine is operated (OperateFn 2) | `OBJOP_Shrine` | [I] (16 operates over) |
| A well is used (OperateFn 22) | — | [I] (5 uses) |
| A unit dies, or changes mode | — | [I] |

## Inputs

### Tables

| Anchor | Used for |
|---|---|
| `States.txt:curse` | the curse branch of the apply (§ B) |
| `States.txt:group` | the group clear (§ D) |
| `States.txt:plrstaydeath`, `monstaydeath` | the remove callback and the death purge (§ C) |
| `States.txt:aura`, `exp` | list flags `0x8`, `0x800` |
| `States.txt:life` | the monster tick |
| `Skills.txt:perdelay` | the aura grid (§ F) |
| `Skills.txt:aurastate`, `auratargetstate`, `aurastat1..6`, `aurastatcalc1..6`, `aurarangecalc`, `aurafilter`, `passivestate` | an aura run (§ F) |
| `ItemStatCost.txt:direct`, `maxstat` | the aura heal (§ F) |
| `CharStats.txt:ManaRegen` | the mana tick (§ E) |
| `Shrines.txt:Code`, `Arg0`, `Arg1`, `Duration in frames`, `reset` | a shrine (§ G) |
| `Objects.txt:Parm0`, `Parm1`, `Parm3` | a well (§ G) |

### Runtime state

| State | Type | Source |
|---|---|---|
| frame | i32, `game +0xA8` | every end frame and grid |
| state bit-sets | two sets of `ceil(nStates / 32)` dwords at the unit list's `+0x58`: on, and changed (for the client) | `UNIT_SetStateBit` |
| a state's list | `StatList` with the state at `+0x14`, end frame `+0x18`, skill `+0x1C`, level `+0x20`, remove callback `+0x38` | `StatList+0x18` |
| the apply request | `{source, target, skill, level, duration, stat, value, state (+0x1C), remove callback, …}` | `TimedStateReq+0x1C` |
| unit seed | `Unit+0x20` | rng/seeds; in the run drawn only by a damaging aura's run, once per drawing run; Holy Freeze's step of each unit hit is read only (§ H) |

### Inputs and oracles

| Input | Kind | Tag |
|---|---|---|
| the combat appliers (poison, cold, freeze, open wounds) and a monster's skills | inputs: they call the apply or make the same list shape; [combat/delivery](../../spec-combat/delivery/) | [C] |
| a skill's calc results that read the unit (the aura and passive calcs that do) | value oracles | [C] |
| the shrine to-hit and damage values (`SHRINE_StatValue` 19 and 21) | value oracles | [I] |
| a damaging aura's hit (its damage, its kill) | phase (3); only its draws are counted here (§ H) | [C] |

## Algorithm

### A. The state bit and its list

- A1. [C] A state is a bit in the unit list's state set (`UNIT_HasState`) and, usually, a stat list under the unit
  carrying the state id at `+0x14`. `STATE_Set` writes the bit and the "changed" bit; most removers free the list and
  clear the bit together.
- A2. [C] `UNIT_HasState` answers only for unit types 0, 1 and 3 (players, monsters, missiles) and 0 for any other
  type, so an object answers 0; `UNIT_TestStateBit` has no type test. `UNIT_SetStateBit` sets unit flag `+0xC8` bit 3
  when the States record's `+0x12` bit 0 (`disguise`) is set, and clears it only when no state with that bit is left.
  The States flag columns are read through the loader's 40 bit-sets, bits 0..39 once each (`curse` bit 11,
  `plrstaydeath` 13, `monstaydeath` 14, `exp` 30, `life` 32).


### B. The timed apply

```mermaid
flowchart TD
  r["request: target, state, skill, level, duration, stat"] --> m{"monster refused by its MonStats bits?"}
  m -->|yes| no["return 0"]
  m -->|no| c{"state is a curse?"}
  c -->|yes| cr{"curse_resistance r >= 100, or target in attract?"}
  cr -->|yes| no
  cr -->|no| cut["duration -= MulDiv(duration, r, 100)"]
  cut --> old1["old = any curse list (flag 0x20)"]
  c -->|no| old2["old = the target's list of this state"]
  old1 --> o{"old with the same state and skill?"}
  old2 --> o
  o -->|"same level"| rf["refresh: end frame = frame + duration, new event 12"]
  o -->|"lower new level"| no
  o -->|"otherwise, or old of another state or skill"| fr["free old"]
  o -->|"no old"| nw["new list"]
  fr --> nw
  nw --> lk["set bit, flags, end frame, skill, level, one stat; link; remove callback"]
```

```
B1. STATE_ApplyTimed(req) → list or 0:                                 [C] (STATE_ApplyTimed, all of B1 but the lines marked [I])
      if req.state is out of range: return 0
      if target is a monster refused by its MonStats/MonStats2 bits: return 0          [C]
      curse: bool ← States[req.state].curse
      if curse:
        r: i32 ← STATS_GetUnitStat(target, 109 curse_resistance)
        if r > 99: return 0                                                            [I]
        if r ≠ 0: req.duration ← req.duration − MulDiv(req.duration, r, 100)   ; signed: r < 0 lengthens
                                                                                       [C] the cut on a player target, 1 ≤ r ≤ 99; [I] MulDiv's rounding and r < 0
        if UNIT_HasState(target, 57 attract): return 0                                [C] on a monster target; [I] on a player
      old ← curse ? the target's first list with flag 0x20 : the target's list of req.state
      if old:
        if old.state = req.state and old.skill = req.skill:
          if old.level = req.level:                                    ; refresh
            if req.duration ≠ 0:
              f: i32 ← frame + req.duration
              old.endFrame ← f; old.flags |= 0x2; queue unit event 12 at f
            return old                                                 ; the request's stat is not written
          if req.level < old.level: return 0                           ; refused
        unlink old; free it (its remove callback runs, § C)
      STATE_Set(target, req.state, on)
      flags ← curse ? 0x20 : 0;  end: i32 ← 0
      if req.duration ≠ 0: end ← frame + req.duration; flags |= 0x2; queue unit event 12 at end
      if States[req.state].exp: flags |= 0x800
      if States[req.state].aura: flags |= 0x8
      list ← STATLIST_Alloc(flags, end, source type (6 if none), source guid (−1 if none))
      list.state ← req.state; list.skill ← req.skill; list.level ← req.level
      if req.stat ≠ −1: SetStat(list, req.stat, req.value)
      STATLIST_LinkToUnit(target, list, withDamage = true)             ; stats/aggregate § B
      list.remove ← req.remove or STATE_DefaultRemoveCB
      return list
```

Step notes:

- B1. [C] 3 643 calls on the player, each predicted as refused, refreshed, replaced or new, with the list made (flags
  `0x2`, `0x20`, `0x8`, `0x800`, state, end frame = frame + duration, skill, level, the one stat) or the end frame
  moved: refreshed 2 608, refused 1 013, replaced 2, new 20. A same skill and level refreshes (the list kept, its
  stats not rewritten); the same skill at a lower level is refused (the player's and the mercenary's Prayer, at
  different levels: 1 013); a higher level frees the old list and makes a new one.
- B1. [I] **One curse at a time.** A curse looks up any list with flag `0x20`, so a different curse frees the old one.

- B1. [C] **A curse on a monster in `attract` is refused.** A Necromancer's own Attract, then Amplify Damage on the
  same monster: 71 requests on monsters with state 57 set, all refused (no list), and 151 on monsters without it, all
  made, in the same session; the 239 monster requests left both seeds unchanged. The refusal on a player target was
  not staged.
- B1. [C] **The curse resistance cut on a player target** (stat 109, `r` between 1 and 99): under Fade
  (`curse_resistance` 84, its one stock writer, an `aurastat`), 54 curse requests on the player made or refreshed a
  list whose duration is `len − MulDiv(len, 84, 100)`, each expiry as predicted: 52 `defense_curse` from the
  Crystalline Passage's succubi (275 frames asked, 44 given) and two shrine curses (3 600 → 576, 2 400 → 384). Three
  lengths cut by the same `r` to the frame rule out a reading without the cut.
- B1. [I] **The cut's rounding** is `MulDiv`'s, read from the code: `len · 84` is a multiple of 100 for the three
  lengths of the run (231, 3 024 and 2 016 exactly), so no case separates it from a truncating division. The refusal
  at `r` ≥ 100 and a negative `r` (a longer curse) are read from the code too: no stock source gives the player 100 or
  less than 0.
- B1. [C] The duration is in frames and is not rounded: end frame = frame + duration at 5 054 applies, 4 826 of them
  not a multiple of 25. The monster gate refuses every timed state on a monster (type 1) whose MonStats `+0x0D` bit 0
  is set or whose MonStats2 `+0x05` bit 1 is clear (columns not named; the raw bytes agreeing at six
  sites). The range is the States bounds test.
- B2. [C] **Callers.** `STATE_ApplyTimed` has 25 call sites in 25 functions and no abs32 reference: open wounds
  (state 62, 200 frames), prevent-heal, the aura target callback (§ F), the shrines (§ G) and B1 itself once
 among them, and 19 more functions, two of which are not skill functions (`UModElemDamage`,
  `MonFleeFrom`). Poison, burn, cold and freeze use their own appliers
 with the same list shape: each makes one plain list,
  `STATLIST_Alloc(pool, 2, a length-derived end, the attacker's type, its guid)` (6 and −1 without an attacker), sets
  its state (2, 115, 11, 1), a remove callback, and links it with damage; the 17 logged poison lists are plain, with
  `0x2`, an end frame and `+0x08` 1. The remove
  callbacks differ: poison and burn set `STATE_DefaultRemoveCB`, cold `ColdEndCb` and
  freeze a callback of its own; what the last two do at expiry was not read.
- B2. [C] **Prevent heal (state 52)** is applied by B1 for 120 000 frames with stat 31 = 0 to the defender in 86 of 918
  calls of the to-hit hook, exactly those with the player attacker's stat 117 non-zero, and the hook draws on neither
  seed. **Open wounds** applies state 62 for
  200 frames when its roll passes (82 of 120 fires).
- B2. [I] The hook's type and class tests (a monster defender outside 704–709) are not separated: every call had a
  player attacker and a monster defender outside that range.
- B3. [C] **Use kinds 6 and 9 only** (`ItemUseTimedState`: `yps`, `wms`, `vps`, `hrb`) run the group clear
  (§ D) before they apply. Healing and mana potions do not: they are kind 3, `ItemUsePotion`, with no call
  of it. Of `STATE_GroupClear`'s nine call sites only one lies in the use entries (in the range..).
  (`STATE_GroupClear`; the nine sites and no abs32
  reference (a second tool); the use kinds:
  [items/use § E](../../spec-items/use/#e-the-kinds), a potion's amount and rate [§ F](../../spec-items/use/#f-kinds-3-and-4-the-amount-and-the-two-draws))

### C. Expiry and removal

```
C1. EVENT_TimedListExpire(unit) (unit event 12):                       [C]
      for each counting child list c of the unit list (+0x3C):
        if c.flags & 0x2 and c.endFrame ≤ frame and c is not extended: free c   ; unlink, remove callback
C2. STATE_DefaultRemoveCB(unit, state):                                [C] (STATE_DefaultRemoveCB, the calls in this order, all of C2 but the line marked [I])
      the stat-event remove                                            ; aggregate § G3
      if unit is dead and the state stays on death (plrstaydeath for players, monstaydeath otherwise): keep the bit   [I]
      else: STATE_Set(unit, state, off)
      UNIT_AnimSetRate(unit); SKILLS_RefreshPassivesInState(unit, state)
      if unit is a player (type 0): PetLimitRefresh(unit)                 ; § H
```

Step notes:

- C1. [C] **One event per request.** Every apply and refresh with a duration queues its own event 12 at its end
  frame; an earlier event of a refreshed list still fires and frees nothing. 2 749 runs on the player freed exactly the
  children with flag 2 and end frame ≤ the frame: 123 lists, each on its own end frame (lateness 0), and 2 630 runs
  freed nothing.
- C1. [C] **The end in frames.** A list applied at frame `f` with duration `d` is freed by the event at `f + d`; its
  stats leave the full cache by the unlink's propagation, and a maximum that drops rescales the current value.
- C1. [C] **The 300 expiries are met: 449 lists freed over three runs**, each on its own end frame (lateness 0) and
  each event run's free set as predicted. The stats run freed 123 (potion states 178–180 79, state 21 18,
  state 113 11, poison 7, 86 5, shrines 130/131 2, Conviction 1), the first shortfalls run 30 (the Druid's shapes 24,
  the Sorceress armours 3, `palc-wells1` 3) and the second shortfalls run 296 in its 1 401 event-12 runs (the potion
  states 100, 106 and 178–180 153, `poison` 49, `skilldelay` 48, `defense_curse` 42, the shrine states 133 and 134 4).

- C2. [C] The calls run in C2's order, and the freed state's bit
  was off at the next states line in 147 of 148 logged frees. [I] The dead-unit branch, and the one free whose bit stayed on,
  were not met.
- C1. [I] The client copy calls the same function with frame 0, which counts `+0x18` down by one per call
  (presentation).
- C3. [I] **Death and mode.** Death frees every counting child that is not from an item (`+0x08` ≠ 4), has none of
  flags `0x1`, `0x80`, `0x100`, and whose state does not stay on death. A mode change frees every flag-4 list and
  clears its state. No death was in the run.

### D. The group clear

```
D1. STATE_GroupClear(unit, s, self):                                   [C] for the cases below
      g ← States[s].group;  if g = 0: return                           ; nothing cleared
      for each state s' on the unit with States[s'].group = g:
        if s' ≠ s or self: free the unit's list of s' and clear its bit
D2. stat 98 (state) in the stat callback, param s:                     [C]
      when the full value becomes non-zero and the unit is not in s: STATE_GroupClear(unit, s, self = 0); STATE_Set(unit, s, on)
      when it goes to 0 and the unit is in s:                  STATE_GroupClear(unit, s, self = 1); STATE_Set(unit, s, off)
```

Step notes:

- D1. [C] The `group` exclusion is done by this function, not by the apply (B1 has no group test). 450 calls on the
  player: the potions of the run (antidote, thawing, stamina: states 178–180) have no `group`, so the call cleared
  nothing (90). The full Trang-Oul's Avatar sets stat 98 with param `monsterset` (176) through its full block: on the
  set's completion the call with `self` 0 found no other group-3 state (180); when the set broke the call with `self`
  1 cleared state 176 itself (180 effective clears; a reading that clears only the other states keeps the bit).

- D1. [C] **A different state of the same group is cleared**, for groups 1 and 2: 43 calls cleared another state of
  the applied state's group, each exit line (`GRX`) as predicted: group 1 (the Sorceress armours `frozenarmor` 10,
  `chillingarmor` 20, `shiverarmor` 88) 20, group 2 (`fade` 159, `quickness` 157) 23.
- D1. [C] **Group 3** (the Druid's `wolf`, `bear`, `maul`, `feralrage`, `delerium` share it with `monsterset`): 24
  calls for `bear` (140) cleared `wolf` (139), each holding a nested `STATE_GroupClear` call for 139 (depth 2) before
  it returns, both exits' bits as predicted. Groups 1–3 give 67 different-state clears over the two runs (43 + 24).

- D1. [I] **The call is re-entered**: the nested call for 139 runs inside the outer call for 140; which function
  makes it is not followed (the return addresses are not logged).

### E. The regeneration tick

```mermaid
sequenceDiagram
  participant Q as unit event queue
  participant R as RegenEvent (player event 3)
  participant L as LifeRegenTick
  participant S as StaminaRegenTick
  participant M as ManaRegenTick
  Q->>R: every frame
  R->>Q: requeue at frame + 1
  R->>L: if alive: life by stat 74
  R->>S: then stamina by mode
  R->>M: then mana
```

```
E1. RegenEvent(player):                                                [C]
      requeue event 3 at frame + 1
      if alive: LifeTick; StaminaTick; ManaTick                        ; in this order
E2. LifeTick:                                                          [C]
      r: i32 ← full stat 74 (hpregen)
      if r = 0: no change
      hp: i32 ← stat 6 + r
      if hp > full stat 7: hp ← stat 7; free the healthpot (100) list
      if hp < 256: hp ← 256                                            [I]
      SetStat 6 ← hp
E3. StaminaTick:                                                       [C] (PLAYER_StaminaRegenTick, all of E3 but the line marked [I])
      s: i32 ← stat 10;  b: i32 ← full stat 28 (staminarecoverybonus);  max ← full stat 11
      shift by the unit's mode (jump table): 1, 5 → 8;  3, 4 and any mode outside 1..6 → none while b < 1000
        6 → 9;  2 → 9, but none while s < 256;  3, 4 and any mode outside 1..6 with b ≥ 1000 → 8       [C] for mode 3 (E3's step note); [I] for mode 4 and the others
      if a shift applies and s < max:
        d: i32 ← max >> shift
        if b ≠ 0: d ← d + (d × b) ÷ 100                                ; signed, truncating
        stat 10 ← min(s + d, max)
E4. ManaTick:                                                          [C]
      if HasState(85 nomanaregen): d: i32 ← 0
      else: k ← CharStats.ManaRegen × 25 (7500 when ManaRegen is 0)
            d ← max(full stat 9 ÷ k, 1)
            d ← MulDiv(d, full stat 27 (manarecoverybonus) + 100, 100)
      d ← d + full stat 26 (manarecovery)
      if mana = max and d > 0: free the manapot (106) list
      d ← clamp(d, −mana, max − mana);  mana ← mana + d
```

Step notes:

- E1–E4. [C] 54 719 player ticks: the life, stamina and mana written equal E2–E4 from the model's stats, the unit's
  mode and state 85 (life: +74 1 424, capped 10 657, −74 1 082, no 74 41 556; mana: regenerated 48 433, under state 85
  6 286; stamina in modes 1, 3, 4, 5, 7, 9 and 19, with and without `staminarecoverybonus`).
- E2. [C] **The sign of stat 74.** The tick adds stat 74 whatever its sign: a positive value (potions) heals up to
  the maximum, and a negative one (poison: 1 082 ticks on `StatsPalC`, Act III and Act II fields) bleeds the player,
  `hp + stat 74`.
- E2. [I] **The floor at 256** (one life point): a poisoned or wounded player's tick never takes life below 256, so
  poison and open wounds cannot kill a player. No poisoned tick reached it: 0 floored in 1 431 poisoned ticks of
  the second shortfalls run (none), and open wounds never hit the player. The count is
  final: on the staged route (a 30-life character kept alive in Normal by flat damage reduction) the
  stock items that give it also regenerate life or resist and shorten poison; a character with more life drained to
  the floor by poison alone was not tried, so this is no stock-data limit, and that route is out of the plan.
  When their list ends (§ C) the stat leaves the cache and the tick stops changing life.
- E3. [C] **The `b ≥ 1000` exception in mode 3.** All stamina ticks of the two runs equal E3 (54 719, 27 192), and with `staminarecoverybonus` at 1000 or more (the
  stamina shrine's bonus, § G, operated twice) a player in mode 3 gained stamina in 4 326
  ticks where a reading without the exception writes nothing.
- E3. [I] Modes 2 and 6 (walking) were not among the run's modes, and mode 4 with the bonus was not met, so they stay
  a code reading. (jump table)
- E5. [I] A monster's tick is `MonRegenEvent`;
  the life-orb byte stat 352 the player's life tick updates is presentation.

### F. Auras

```
F1. NextPeriodicFrame(frame, skill) → i32:                             [C]
      p: i32 ← perdelay calc of the skill;  if p < 6: p ← 5
      return ((frame − 1 + p) ÷ p) × p + 1
F2. scheduling:                                                        [C]
      event 8: the unit's selected right skill, when it has the aura bit: run it, requeue at F1
      event 9: an item aura (stat 151, param s, set by ITEMAURA_Start at F1): while stat 151 > 0 and the unit lives,
               run s and requeue at F1; at 0, cancel
F3. a paladin aura run (PalAuraDo):                       [I]
      values ← aurastatcalc1..6 at the skill level, up to the first blank aurastat
      apply the caster's aurastate
      if the mana check passes and the skill has no passivestate: write the passivestat values on that list
      for each unit in range (SKILLS_ForUnitsInRange, aurarangecalc, aurafilter):
        AURA_ApplyToTarget(unit, auratargetstate, duration ← NextPeriodicFrame + 1 − frame)
      player caster with a positive mana cost: state 85 on while the run wrote a stat on a target, else off
F4. AURA_ApplyToTarget:                                                [C] for the apply
      STATE_ApplyTimed(target state, skill, level, duration)           ; § B: equal level refreshes, higher replaces, lower refused
      for each of the six values ≠ 0:                                  [I]
        stat 110 → the Cleansing function (not read)
        a stat without direct: set on the state list; 67–68 floored at the target's cold-effect value, 68 copied to 69
        a direct stat (hitpoints): added to the current value, capped at its maxstat
      stat 350 ← skill, 351 ← level; remove the state the request names at +0x48
```

Step notes:

- F1–F2. [C] **The grid.** 3 629 runs of events 8 and 9 (the player's selected Prayer 1 709, the player's item
  Sanctuary from *Azurewrath* 899, the mercenary's selected Prayer 1 021 through the monster table) fell on frames
  `≡ 1 (mod 50)`, 50 apart, the grid of F1 with Prayer's and Sanctuary's `perdelay` 50. A hireling's aura runs the same
  way (entries 8 and 9 of the monster event table).
- F3. [C] **The target's duration** is `perdelay + 1` = 51 frames in all 6 207 aura applies (Conviction's included),
  so a target keeps the state one frame past the next run.
- F4. [C] **Two auras of one state** from two casters follow § B: at equal level the second refreshes, a lower level
  is refused (the player's and the mercenary's Prayer), a higher level replaces.
- F4. [C] **An aura state ends when the aura is switched off.** A Paladin switching Might, Defiance and Prayer by key
  made 61 aura state lists and ended 59, each unlinked by `PlayerSetSkill` (through
  `UNIT_UnlinkStatList`) when the next aura key changed the right skill, before the list's timed end; each unlink's
  writes checked, and no aura list was freed by event 12 in those sessions. This is a second end path beside the timed
  expiry of § C, which ended the one aura state of the stats run (9 on and off events there). The plan's 50 aura
  on and off events are met: 120.
- F3. [I] **Range and filter.** A unit counts when its squared distance to the caster (subtiles) is ≤ `range²` in the
  caster's near rooms and it passes `aurafilter` (`0x583` when 0); a monster with a MonStats flag can be excluded.

- F3. [I] **The filter on a player target** (`SkillUnitFilter`, called with the caster and the target):
  bit `0x1` must be set; `0x10000` needs the two to share a party (both with a party of the same id) or be the same
  unit, a monster standing for its owner; `0x8000` needs the caster's pair entry for the target to carry the
  hostility bit; `0x2000` skips the caster's near rooms that are town rooms.

- F3. [C] **`0x10000` passes a player only in the caster's party.** In the two-client run a Paladin's Might
  (`aurafilter` `0x12003`) passed the filter for the other player 16 times while the two shared a party, and was refused
  17 times with neither partied and 28 times with the two hostile. Scope: one aura of the `0x12003` group, outside town;
  the offensive auras (`0x8000`) were not run.
- F3. [C] In the Skills table no row has an `aurastat` after a blank one (79 rows with one); the six stats with no
  calc are the `progressive_*` skills', the one calc with no stat is Holy Shield's (a full-table check).
 [I] A run stops at the first blank `aurastat`, and a 0 value is never written, so an
  `aurastatcalc` with no stat and an `aurastat` with no calc (a blank calc evaluates to 0) write nothing; Holy Shield
  and the progressive skills use other skill functions (phase 3).
- F2. [C] `ITEMAURA_Start` (stat 151 gains a level for a skill with `aura` and an `aurastate`) cancels the item's
  event 9 and queues it at F1: in 5 item-aura restarts the first tick came at `NextPeriodicFrame(restart)`, not
  `restart + p`, and no frame held two item ticks.

### G. Shrines and wells

§ G is inferred but for the effect table G2, the stamina shrine's stat 28 and remove callback, and the shrine lists' curse flag, which the step notes confirm: the stats run operated 7 shrines and 5 wells, the first shortfalls run 3 shrines (codes 14 twice, 6 once) and no well, and the second shortfalls run 6 shrines (codes 11 once, 12 three times, two recharges on a full player) and no well, every one predicted: 21 against the plan's 50 operates and the 20 that the draw-freedom check asks per kind. The count is final as a slot-time ruling, not a stock-data limit: one explore-and-operate session (`sor-shrines2`) listed one shrine, about one operate in 12 minutes, and `palc-wells2` was not run, so a well's cure was not tried in that phase (review, 2026-10-21).

Step notes:

- G2. [C] **The effect table.** `g_ShrineEffects` gives codes 6..15 as G2, and no other code a state.

- G2. [C] **Shrine states are curses.** States 128–137 carry the `curse` bit, so a shrine's list has flag `0x20`: the
  6 logged shrine lists (states 128, 130, 131, 136) have flags `0x22` and their rows `curse` = 1; the 3 timed shrines
  of the stats run (codes 10 once, 8 twice) made lists with the duration `Duration in frames` and the table's
  stat with value `Arg0`. (`States.txt:curse`, `Shrines.txt:Duration` in frames) [I] So a shrine's list is "the" curse of B1: it replaces a monster's curse, and a
  curse replaces it (B1's one-curse rule).
- G2. [C] The state is not always the States row's `stat`: shrine 6 writes 171 with state 128 although row 128
  (`shrine_armor`) names `armorclass`. [I] The skill shrine's +2 skills come from a reader of state 134, not from a stat (open
  question).
- G4. [C] **The stamina shrine's state.** Both logged stamina-shrine applies set remove callback and stat
  28 = 1 000; at its first dump the list held stat 28 alone.
- G5. [I] The 4 recharge shrines of the run (codes 2 and 3) were all on a full player, so each changed nothing, as
  predicted: they decide none of G5.
- G6. [I] The 5 wells matched G6: `Parm1 · max >> 8` = 128/256 of each maximum, capped (raised life and mana 2, mana
  1, mana and stamina 1; one on a full player returned 0 and changed nothing). Poison and freeze cured by a well, the
  combat shrine and the re-arm were not reached in the three runs (the stamina shrine, code 14, was operated twice, G4's timed state as predicted).

### H. Draws per event kind

| Event kind | Draws | Tag |
|---|---|---|
| apply (B1) | none (6 232 events on the player, seeds unchanged; 239 requests on monsters) | [C] |
| expire (C1) | none (2 749 runs, and 1 401) | [C] |
| tick (E1–E4) | none (54 719) | [C] |
| aura run (F) | none, except one `RNG_RangeB` on the caster's unit seed per drawing run of a damaging aura (2 763 runs unchanged, 865 drawing, 865 steps) | [C] |
| aura run (F), units per run | one draw per run whatever the number of units hit: the roll precedes the target pass and its packet is copied to each unit | [I] |
| group clear (D), death purge, mode drop | none: their direct-call closures (463, 447 and 457 functions) hold no drawing function | [C] |
| remove callback (C2) | none in 149 logged freeing expiries; but on a player it calls `PetLimitRefresh`, whose closure reaches 122 drawing functions through a pet's release (`PetLimit` → `PetRemove` → `PetUnitRelease` → `UnitKilled`, `MonSetMode`) | [C] the call on every player expiry, the chain and the 149 seeds; [I] whether a stock expiry releases a pet (unrun) |
| shrine codes 0–15 (G1–G5), well (G6) | none found in the code; 16 and 5 events with the seeds unchanged over the three runs, under the floor of 20 | [I] |

Step notes:

- H. [C] **The damaging aura's draw.** Sanctuary's run calls `AuraHitDo`, which calls
  `SKILLS_RollElemDamage`, which draws `RNG_RangeB` on the caster's seed once in each
  run that draws (865 runs, 865 steps; the run did not count the units each run hit). The checker asserted each of the 865 drawing runs' exit seed against its entry advanced by its logged draws, and
  746 of the next runs of the same caster entered on that exit: chained pairs (the checker's
  `aura_chained_pairs`, keyed by the caster unit, since the 2026-10-20 re-check; 115 next runs entered elsewhere and
  4 drawing runs had no next run in their log). The game seed
  moved in one aura run, when a kill dropped an item; a kill also steps the dead monster's own seeds. The draw is the
  hit's damage (phase 3), outside this spec's state code.
- H. [I] **Once per run, not once per unit.** Do 66 makes its one `SKILLS_RollElemDamage` call before
  its target pass (`SKILLS_ForUnitsInRange`), and the pass's callback copies the packet that call filled to every unit
  hit (`rep movs`), so a run that hits several units still draws once. A run with two or more units in
  range would raise this reading.
- H. [I] **Holy Freeze steps each unit's own seed.** Do 81 makes the same one roll per run on the caster's seed, and
  its target callback, for each unit it does not refuse, steps that unit's own seed once inline (`× 0x6AC690C5`, with
  carry) and sets state 107 when the new low word, unsigned, `% 100` is below 20, else clears it. The stats run met
  no Holy Freeze.
- H. [I] Shrine codes 18, 21 and 22 (missile and monster shrines, phase 3 and monsters/special) do draw; they are out
  of this spec.

## Outputs

The state bits and the state lists of each unit (made, refreshed, freed), with their end frames and the unit
events 12 queued for them; stats 6, 8 and 10 written by the tick, the aura heal, the shrines and the wells; the
object's mode, charges and re-arm event.

## Worked example

**1. Prayer's grid and duration** (the frame numbers are illustrative, on the logged grid). [C] Prayer's `perdelay` is 50, so F1 gives `p` = 50 and every run falls on a frame `50·m + 1`. A run at frame 5 001 queues the next at 5 051 and applies the target state with duration `5 051 + 1 − 5 001` = 51: the state's end frame 5 052 is one frame after the next run, which refreshes it at 5 051 (same skill and level) to 5 102.

**2. Two Prayers at different levels** (`StatsPal`). [C] The player's Prayer and the Act II mercenary's Prayer apply the same target state 34 to the player at different levels: the lower one's every run is refused (1 013 refusals) while the higher one refreshes. When the mercenary's level is the higher (`StatsPalB`, Prayer 1 against the mercenary's), its first run replaces the player's list.

**3. A mana tick** (arithmetic of E4, illustrative). [C] A class with `ManaRegen` 120, 900 maximum mana (230 400 in 1/256) and
`manarecoverybonus` 258: `d = 230 400 ÷ 3 000 = 76`, `MulDiv(76, 358, 100) = 272` per frame on the 1/256 scale,
with `manarecovery` 0 and no state 85.

**4. A poison tick** (`palc-spider`). [C] A poisoned Paladin's poison list carries a negative stat 74; each frame E2 writes `stat 6 + stat 74` (1 082 such ticks), until the list's end frame frees it and stat 74 leaves the cache.

## Reimplementation notes

- **A refresh does not rewrite the stats.** A refreshed list keeps the values it was made with; only its end frame
  moves. A new value needs a different skill or a higher level (replace). [C]
- **Queue one end event per apply and per refresh**, and let a stale one fire: it frees only lists whose end frame
  has passed. [C]
- **A lower level is refused, not queued**: a weaker aura of the same state from another caster does nothing while
  the stronger one holds. [C]
- **The group test is not in the apply.** Only the callers that run `STATE_GroupClear` (use kinds 6 and 9, not healing or
  mana potions (B3); stat 98, two sites in `MonStatCallback`; five skill functions) exclude a group: its nine call sites,
  and `STATE_ApplyTimed`'s closure does not hold it. [C]
- **Shrines share the curse slot.** Taking a shrine removes the player's curse, and the next curse removes the
  shrine's state. [I]
- **The tick's floor is 256, not 0**, for players; a monster's tick can kill.
  [I]
- **A damaging aura's run draws on the caster's seed**: a reimplementation that runs Sanctuary must consume one draw on the
  caster in each run that draws, even when the state code itself draws nothing. [C] **Draw once per run, not once per unit hit**: the one roll's packet is copied to every unit the
  run hits. [I]

## Evidence

- § 1–7 (the code reading), § 8 (the run), *Leads used* (3 verdicts),
  *Phase 0 surprise (f)* (the setters of the 56 unnamed States rows).
- Tables: States, Skills § Passive and aura columns,
  Shrines § Effects, Objects,
  CharStats, ItemStatCost.
- Upstream: [stats/aggregate](../aggregate/), rng, [data/calc](../../spec-data/calc/),
  [combat/delivery](../../spec-combat/delivery/) (the appliers). Downstream: objects (the operates),
  [combat](../../spec-combat/overview/) (the stats states carry).
