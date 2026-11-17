---
title: "Combat: queue, delivery, on-hit effects and the life change"
sidebar:
  order: 5
---

## Purpose

A built and reduced packet is queued on the attacker and delivered to the defender: the on-hit stat events of the
attacker (crushing blow, open wounds, freeze), leech, the absorbed life, **the life change**, the mana and stamina
loss, then stun, cold, freeze, poison and burn. Crushing blow, open wounds and leech draw on the **attacker's** seed;
cold draws on the **defender's**. A melee attack queues and delivers in the same call at its hit frame; a missile
delivers directly. The kill hands off to the death path, and get-hit, knockback and durability are named here as the
boundary of the model.

```mermaid
flowchart TD
  q["ResolveAndQueue: build, reductions, kill pre-test, queue"] --> fin["PrgFinisher (A3): a player's charged state, or a finishing move's hit (A2); entries draw, 38 delivers first"]
  fin --> dq["DeliverQueued: range check"]
  dq --> ad["ApplyDamage"]
  ad --> ev["events 5 then 1 (melee) or 6 then 2 (missile): crushing blow, open wounds, freeze"]
  ev --> cap["phys = min(phys, HP)"]
  cap --> le["Leech: Range(2) on the attacker if life and mana"]
  le --> ab["absorbed life healed"]
  ab --> hp["HP = HP - total, 0 below 256"]
  hp --> fx["mana, stamina loss; stun, cold (defender draw), freeze, poison, burn"]
  fx --> k{"HP 0?"}
  k -->|yes| kill["events 10, 9; COMBAT_GetHit → UnitKilled"]
  k -->|no| reg["regeneration event rescheduled"]
  dq --> extra["durability, events 7 and 3, knockback, get-hit: boundary"]
```

## Entry points

| When | Function | Tag |
|---|---|---|
| A melee hit is reduced and queued on the attacker | `COMBAT_ResolveAndQueue` → `COMBAT_QueueHit` | [C] |
| The queued hit is delivered | `COMBAT_DeliverQueued` | [C] |
| The packet is applied (melee and missile) | `COMBAT_ApplyDamage` | [C] |
| Leech | `COMBAT_Leech` | [C] for players, the mercenary and monsters |
| Crushing blow, open wounds, freeze (stat events 16, 15, 14) | `STATEVENT_CrushingBlow`, `STATEVENT_OpenWounds`, `STATEVENT_Freeze` | [C] for the first two; [C] for freeze on a melee hit; [C] for each one's branches, emulated |
| A monster's life tick (poison, open wounds) | — | [C] |
| A player's life tick | — | [C] (54 719 ticks, 1 082 under poison) |
| A finishing move (do 42, 46, 50, 52) hands its queued hit to the finisher | `COMBAT_PrgFinisher` (A2) | [C] for the six call sites (`static.txt`); [C] for the calls of do 42, 46 and 50 as boundaries, do 46's on the path where its hit helper returns for a bad skill id |
| The kill | `COMBAT_GetHit` → | [C] |

## Inputs

### Tables

| Anchor | Used for |
|---|---|
| `DifficultyLevels.txt:LifeStealDivisor`, `ManaStealDivisor` | a player attacker's leech (§ C) |
| `DifficultyLevels.txt:MonsterColdDivisor`, `MonsterFreezeDivisor` | cold and freeze length on a monster (§ D) |
| `MonStats.txt:Drain` | the leech factor `D` of a monster defender, per difficulty (§ C) |
| — | chill strength and whether a monster can be chilled or frozen (§ D) |
| `MonStats.txt:killable`, `boss` | delivery refusal; crushing blow divisor, stun, freeze |
| `ItemStatCost.txt:itemeventfunc1` | stats 134, 135, 136 register handlers 14, 15, 16 on events 5 and 6 |
| `Skills.txt:ItemTarget`, `ItemTgtDo`, `ItemEffect`, `ItemCheckStart`, `srvmissilea` | an item cast from handlers 20, 21, 30: its aim, its caster, the effect entry, the start test (§ E5) |

### Runtime state

| State | Type | Source |
|---|---|---|
| attacker and defender seeds | `Seed` at `Unit+0x20` | the draws of § C, § D, § E |
| hit queue | list at `Unit+0xAC` of the attacker | `COMBAT_QueueHit` |
| frame | `Game+0xA8` | the end frame of timed states |
| life, mana, stamina | stats 6–11, 1/256 units | value inputs at the event's entry |
| player count of a monster | stat 100, set at creation | [monsters/stats § C](../../spec-monsters/stats/#c-the-player-count-monplayerbonus) |
| unit type flags | `0x02` superunique, `0x04` champion, `0x08` special (set on every champion, unique and superunique) | [monsters/special](../../spec-monsters/special/), monsters/spawn § G |

### Constants

| Name | Value | Tag |
| --- | --- | --- |
| one life | 256 (life below it is set to 0) | [C] |
| crushing blow divisors | player 10, hireling 10, monster 4, boss or superunique 8 | [C] for 4 and 8, 4 on champions, 10 for a player and a hireling |
| open wounds band steps | 9, 18, 27, 36, 45 per level; + 40 | [C] |
| open wounds length | 200 frames | [C] |
| shatter chance | 20 | [I] |
| stun caps | hireling 13, others 250 frames | [I] |

## Algorithm

### A. Queue and delivery

```
A1. ResolveAndQueue(att, def, pkt, srcdam):                          [C] (COMBAT_ResolveAndQueue, all of A1)
      if (pkt.result & 0x1) and not (pkt.result & 0x8380):          ; hit, not blocked, dodged, avoided, weapon-blocked
        if not (pkt.flags & 0x2): BuildDamage(att, def, pkt, 0, srcdam)       ; combat/damage
        ApplyReductions(att, def, pkt)                                         ; combat/reductions
        total: i32 ← pkt.phys + pkt.fire + pkt.light + pkt.magic + pkt.cold + pkt.poison
                     + (att is a monster ? pkt.lifeSteal : 0)
        if (total & ~0xFF) > (stat(def, 6) & ~0xFF): pkt.result |= 0x2        ; kill pre-test
      QueueHit(att, def, pkt)                                                  ; always; copied onto att's list

A2. DeliverQueued(att, def):                                          [C] (COMBAT_DeliverQueued, all of A2 except as tagged)
      e ← the queued entry for def;  if none: return                  ; [I] the queue lookup and the removal below, not logged
      if def is in melee range and (e.pkt.result & 0x1) and att is alive:
        e.pkt.flags ← 0x20
        ApplyDamage(att, def, e.pkt, doReductions: false)                     ; § B
        put overlay pkt+0x6C;  pick the hit class (a global counter, no draw)
        DurabilityLoss(att, def)                                              ; boundary oracle, § F
      DispatchEvent(7 domeleeattack, att);  DispatchEvent(3 attackedinmelee, def)      ; handlers § E5
      if hit: Knockback(att, def)                                             ; boundary oracle, § F
      GetHit(att, def, e.pkt)                                                 ; boundary oracle, § F
      remove e
```

- A1. The player's packet was already built by `SKILL_AttackDo` (flag `0x2`), so `ResolveAndQueue` only reduces it;
  a monster's is built here, and only on a hit. [C]
- A1. The kill pre-test compares whole life points (`& ~0xFF`). [C]
- A2. **The order of a delivery** in the kept logs: the delivery, the leech, the durability, the knockback and the
  get-hit, in 9 159 melee events (and variants in 519), and the delivery, leech and get-hit then the missile's exit in
  11 128 missile events. [C]
- A2. A delivery can happen on a later frame than the hit test when a skill do-function queues it: 789 such events in
  the kept logs, queued by `SkillSt32Hit` (788) and `SkillSt42FireHit` (1), delivered 6 (787) or 9 (2) frames after
  the hit test and resynchronised; the attacker's AI may draw in between. [C]
- A2. Before delivery, `SKILL_AttackDo` calls the progressive-charge finisher (A3); an attacker under a `meleeonly`
  state (wolf, bear) skips it: `UNIT_HasStateFlag(att, 38)` sends it to `AttackDeliverMeleeOnly` and `ret 8`, and
  only States 139 `wolf` and 140 `bear` set `meleeonly`. [C] The run met no
  charged state, so the finisher's work under one rests on A3. [I]
- A2. **The finisher has six direct calls in five functions**: `SKILL_AttackDo` and five sites in the assassin
  finishing moves' do functions, do 42 Dragon Talon, do 46 Dragon Claw (one per parity path), do 50 Dragon Tail and do 52 Dragon Flight; start 25 calls it
  nowhere (it only tests for a target). [C] (`static.txt`, a scan of every `call` operand)
- A2. **What the finishing moves pass.** Do 42, do 46 and do 50 reach the finisher with `QueuedHitFind(caster,
  target)`'s result as its one stack argument (the game in `ECX`, the caster in `EDX`): do 42 with **no null test**, so
  it also calls it with 0; do 46 only when `QueuedHitFind` gives a hit, and with no hit it calls `DeliverQueued(caster,
  target)` instead; do 50 only with a hit, returning 0 before it otherwise, after copying the 0x70-byte packet to its
  frame. The run reached do 46's two calls only where returns for a bad skill id; on a valid id the same
  instructions follow its hit test, after that boundary. [C] (up to `PrgFinisher` or `DeliverQueued`
`hit_ass`)
- A2. Do 52 passes `QueuedHitFind`'s result with no null test, as do 42. The finisher returns at once, with no write,
  for a null hit (149 emulated cases) or one whose result lacks bit `0x1` (298), so a null argument runs nothing; with
  the bit its first call is `UNIT_GetTargetUnit`. [C] (two
  tools on do 52's call)
- A2. **After the finisher, each finishing move delivers.** Do 46 runs the finisher only on a hit, then one
  `DeliverQueued(caster, target)` on either path (the jump / skips only the finisher), and
  sets or clears bit 6 by the parity bit; do 42, do 50 and do 52 call `DeliverQueued` after the finisher. Do 42 then
  delivers once more; at its last kick (the count at 0) it first makes one `RNG_Range(caster, 100)` against a value
  `k` (100, or a calc chosen by the target's kind; no draw when `k` ≤ 0); do 50 then makes a fire area hit of `calc1 + stat 329` percent of the kick's
  physical damage for a living caster. [I]

**A3. The progressive finisher and its `srvprgfunc` entries.**

- A3. **The finisher's own step is a peek**: it saves the seed's two words (`Copy64Out`), calls
  `RNG_Step` on the attacker's own seed (`ECX` = attacker + 0x20), keeps the result and writes the saved
  words back (`Copy64In`), so the seed leaves as it entered. The kept value is read once,
  into the client message `0xA3`. [C] (`RNG_Step`, two tools)
- A3. **The entries step the attacker's seed at entry.** 37, 39, 41 and 143 step the attacker's seed once inline,
  before the record test, so the step happens even when the entry then creates nothing; up to its boundary (the first
  creation; 38's `DeliverQueued` or `SkillRollPhys`) no entry of 36–41 and 143 draws on the attacker's or the target's
  seed otherwise, and the draws before the first creation are on the local seed (37 and 143: one step; 39: two
  `Range(local, 2r)` per try; 41: two steps). The run's calcs were constant programs, so a calc function's own draws
  are not covered. [C]
  (`prg_ass`)
- A3. **Entry 38 draws on the attacker's seed** after its delivery: `RangeB` twice (physical and elemental) and a
  third time, an `RNG_Step`, for `EType` 10; its area units draw their defence rolls on their own seeds. 36 and 40 draw
  nothing of their own. Every missile an entry creates adds the creation's draws. [I]
- A3. **Entry 38 delivers the queued hit itself** when the attacker has a target, before its own rolls, so the
  attack's delivery (§ B, on both seeds) comes before 38's `RangeB`. [C] (up to `DeliverQueued` `prg_ass`) `SKILL_AttackDo`'s later `DeliverQueued` then finds no entry for the defender.
  [I]
- A3. **A ring's step count is not tested.** `n` is used as found up to the first creation. [C] (`prg_ass`) After it, `n` is not tested either: the ring makes `⌈64 / n⌉` missiles for
  `0 < n < 2²⁹`; for `n = 0` the index does not move and the loop never ends, a creation per pass. [I]

- A3. **A negative ring count does not loop forever.** For `n < 0` the ring reads its direction pair below the two
  64-entry tables on every pass, ever further below its frame, and the signed index ends the loop only by wrapping past
  −2³¹ to a value ≥ 0x100, after about 2³¹ / |4n| passes. Not run. [I] Whether stock data
  gives a ring 0 or a negative count is an open question.
- A3. **The rings' `MissileData+0x28` write is Royal Strike's.** Both rings store `SkillGetParam2(280) + 1` (the
  immediate `0x118`, row 280 Royal Strike) whatever row runs them; ring 37 for every missile with no null test, ring
  143 only for a non-null missile of class 568 (`royalstrikechainlightning`). [I]
- A3. **Entry 36 is also an item effect.** `ItemEffect` 36 on rows 44 Frost Nova and 48 Nova makes an item cast of
  those skills with the effect flag run entry 36: a nova of the row's `srvmissilea` (119 `frostnova`, 90 `nova`)
  centred on the cast's target unit, and nothing without one. The flag is 1 only from a skill-on-attack, -kill or -hit
  stat without `ItemTgtDo` (E5); any other item cast of those rows runs their `srvdofunc`. [C] Over Skills.txt
  `ItemEffect` is other than blank or 1 only on 44, 48 (36) and 53 (151), and the effect word is 1 only.

- A3. **Stock use**: Fists of Fire 143/38/39 and Blades of Ice −/38/39 and Claws of Thunder −/36/37 with `prgstack`
  (an entry number 0 runs nothing), Royal Strike 40/143/41 without (only the current count's entry runs). A Fists of
  Fire finisher at three charges therefore steps the attacker's seed once (143), delivers and draws two or three
  times (38), and steps it once more (39). [C] for the stock rows: `srvprgfunc1`–`3` are set on these four rows only
  (`Skills.txt:prgstack`, full table). [I] for the draws past each entry's first
  boundary

### B. Delivery (`COMBAT_ApplyDamage`)

```mermaid
sequenceDiagram
  participant A as attacker seed
  participant D as defender seed
  Note over A,D: COMBAT_ApplyDamage, in order
  A->>A: event handlers newest first: open wounds Range(100), crushing blow Range(100) if chance > 0, freeze Range(100) if stat 134 > 0
  A->>A: leech overlay Range(2) if life and mana gains both run
  A->>A: stun Range(100) if the defender is special (flag 0x08) and stun length > 0
  D->>D: cold shatter Range(100) if cold length > 0 and coldeffect ≠ 0
```

```
B1. ApplyDamage(att, def, pkt, doReductions: bool):                  [C]
      if (not hostile(att, def) and not (pkt.flags & 0x1000)) or def has no room: pkt.result &= ~0x3; return   ; the prologue to `def is dead`
      if def is in town and not (att is a monster with the town-capable MonStats bit): pkt.result &= ~0x2; return
      if def is a monster and not MonStats.killable: return
      if def is dead: return
B2.   if doReductions: ApplyReductions(att, def, pkt)                  ; missiles
B3.   if (pkt.result & 0x1) and not (pkt.result & 0x20):               ; [I] for the order of 5 and 1 and for event 6
        if not doReductions:
          DispatchEvent(5 domeleedamage, unit: att, other: def, pkt)   ; § E
          DispatchEvent(1 damagedinmelee, unit: def, other: att, pkt)
        else:
          if not (pkt.flags & 0x80): DispatchEvent(6 domissiledamage, unit: att, other: def, pkt)
          if pkt.flags & 0x20:       DispatchEvent(2 damagedbymissile, unit: def, other: att, pkt)
B4.   pkt.phys ← min(pkt.phys, stat(def, 6))
      Leech(att, def, pkt)                                             ; § C
      if att is a monster and pkt.result & 0x1: MonOnHitSkill(att, def)          , boundary oracle
      if pkt.absorbHeal > 0 and def is alive and not HasState(def, 92): AddLifeCapped(def, pkt.absorbHeal)
      if pkt.total > 0:                                                ; [C] for the test, see note
        hp: i32 ← stat(def, 6) − pkt.total
        stat(def, 6) ← (hp < 256) ? 0 : hp
      stat(def, 8)  ← stat(def, 8)  − pkt.manaSteal,  0 when below 256  ; (462 deliveries)
      stat(def, 10) ← stat(def, 10) − pkt.stamSteal,  0 when below 256  ; [I] no stamina steal logged
      ApplyStun; ApplyCold; ApplyFreeze; ApplyPoison; ApplyBurn         ; § D
B5.   if stat(def, 6) ≤ 0: pkt.result |= 0x2
      else: pkt.result &= ~0x2;  if def is a monster and pkt.total ≠ 0 and stat(def, 74) ≠ 0: reschedule its life tick
      if (pkt.result & 0x2) and not (pkt.result & 0x20):
        DispatchEvent(10 killed, unit: def);  DispatchEvent(9 kill, unit: att)   ; [I]; handlers § E5
```

Step notes:

- B1. **The prologue**, emulated: the hostility test (the same unit or both null: not hostile; two players: the
  attacker's relation entry for the defender; otherwise hostile unless both align alike) and a defender with no room
  both clear `0x3` and return; a town level (1, 40, 75, 103, 109) clears `0x2` and returns unless the attacker is a
  monster with MonStats `+0x0D` bit `0x04`; a monster without `+0x0D` bit `0x80` (`killable`) and a dead defender
  return unchanged (216 cases past it, each test separated). [C] The owner redirect through `GameFindUnit` and
  a missile attacker's `+0xC8` bit 10 were not run. [I]
- B3. The event numbers: 5 the attacker's and 1 the defender's on a melee hit, 2 the defender's on a missile hit, in
  the kept logs' handler lines. [C] No delivery held both 5 and 1,
  and none had event 6: the pseudocode's marked line.
- B3. The handlers of one event run **newest first**: `UNIT_AddEvent` links the new record at the head (`unit+0x90`)
  and `UNIT_DispatchEvent` walks from the head by `+0x1C`. In the run the open-wounds handler of the logged characters
  ran before the crushing-blow handler; a reimplementation keeps the unit's own registration order. [C]

- B3. The stat events see the defender's life **before** this hit's damage: crushing blow takes its share of the
  current life, then the packet's total is subtracted from what is left. [C]
- B4. `phys = min(phys, HP)` is taken after the stat events, so the leech of a killing blow is computed on the life
  that was left. [C]
- B4. **The life change**: `HP − total`, and 0 when the result is below 256 (one life point). [C] The absorbed life is healed only when positive (`UNIT_AddLifeCapped` returns at once for
  an amount ≤ 0); 32 percent-absorb heals of the player reproduced, and 186 negative absorbed amounts healed
  nothing. [C]
- B4. For a player attacker the defender's mana and stamina losses read the steal fields after `Leech` scaled them
  (`<< 6` and the divisor), so a monster defender with mana loses `manaSteal·64/divisor` in 1/256 units: 236 monster
  defenders' mana at the end of the delivery is the entry mana less the scaled field. [C]
- B4. **A `manahit` boss takes `256·v` mana** where the same value `v` through an `El` column takes `v`. The mod writes
  stats 62 and 63 × 256 and
  `MonAttackStats`' type 7 writes the plain value; the build's roll shifts by 8 either way, scaled by `srcdam ÷ 128`; `Leech`
  shifts the field up by 6 and, for a monster attacker, back (§ C); the subtraction above is in 1/256 units, with 0
  below 256, so the loss stops at the mana held. `v << 22` passes through `Leech`: 511 still fits in i32, 512 reaches 2³¹
  and wraps, and whether a wrapped value reaches a use is not read. [C] for the mod's `256·v`: in 226 of 226 logged
  hits on the player by monsters with stat 62 ≥ 256 the mana lost is the packet's field, 0 below 256, where `v` would
  have left mana in 138. [I] for the `El` type-7 half (no logged `El` 7)
  and the `v << 22` wrap (`v` ≤ 91 in the logs)
- B5. A dead monster goes to `COMBAT_GetHit` and `UnitKilled`, the hand-off to the death and drop path: `COMBAT_GetHit` calls `UnitKilled` when the result has `0x2`, and `MONSTER_DropItems`'
  two callers are `MonDeathDrop`, called only from `MonDeathEvent`, and `MonDropNoNoDrop`. [C]
 The step from `UnitKilled`
  to `MonDeathEvent` is an event through the table, whose dispatcher is not read. [I]

### C. Leech (`COMBAT_Leech`)

```
C1. Leech(att, def, pkt):                                            [C] (COMBAT_Leech, all of C1)
      if pkt.lifeSteal = 0 and pkt.manaSteal = 0: return
      D: i32 ← def is a monster ? MonStats[def.class].Drain[difficulty] : 100
      if D = 0: return                                                ; a blank Drain: no leech
      life: i32 ← pkt.lifeSteal << 6;  mana: i32 ← pkt.manaSteal << 6
      if att is a player:
        if LifeStealDivisor ≠ 0: life ← life ÷ LifeStealDivisor       ; 1, 2, 3
        if ManaStealDivisor ≠ 0: mana ← mana ÷ ManaStealDivisor
      pkt.lifeSteal ← life;  pkt.manaSteal ← mana
      if att is a player or a hireling:
        if pkt.phys ≤ 0: return
        if mana ≠ 0:
          m: i32 ← MulDiv(pkt.phys, mana, 100);  if D ≠ 100: m ← MulDiv(m, D, 100)
          m ← m ÷ 64;  att mana ← (m > 0) ? min(att mana + m, att max mana) : att mana + m
        if life ≠ 0:
          l: i32 ← MulDiv(pkt.phys, life, 100);  if D ≠ 100: l ← MulDiv(l, D, 100)
          l ← l ÷ 64;  att life ← (l > 0) ? min(att life + l, att max life) : att life + l
          if mana ≠ 0: r ← Range(att.seed, 2)                         ; draw: picks overlay 151 (r = 0) or 152
      else:                                                           ; a monster attacker, [C]
        fields back >> 6;  gain ← min(life, pkt.phys) + min(mana, def mana) + min(stam, def stamina)
        if D ≠ 100: gain ← MulDiv(gain, D, 100);  heal att by gain up to its max life;  overlay 151
```

- C1. **Leech is computed on the physical damage after reductions** (and after `min(phys, HP)`), in 1/256 units: the
  steal percent is `<< 6` and the gain `÷ 64`. The difficulty divisors apply to **player** attackers only; leech was
  logged 364, 681 and 455 times in Normal, Nightmare and Hell, with 1 500 `Range(2)` overlay draws. [C]

- C1. Mana is computed and added before life; the `Range(2)` draw happens only when both gains ran, after the life
  gain. [C]
- C1. A hireling attacker uses the player formula without the divisors: 519 Hell mercenary leeches, where the
  divisors are 3. [C]
- C1. The monster branch (taken when reports an owner type) reproduced with 0 mismatches in 80 events
  (Nightmare 7, Hell 73): the fields shifted back `>> 6`, the gain capped by the defender's damage, mana and stamina. [C]

- C1. `Drain` 0 or blank means no leech from that monster at all; the stock `Drain` cuts leech further in Nightmare
  and Hell for many classes (`fallen2`: 100 / 85 / 75). [C]
- C1. **The leech starts from the attacker's life after the defender's handlers.** B3's event 5/1 (or 6/2) handlers
  run before B4's `Leech`, so a draining monster that a player's lightning thorns (`StatEv10ThornsLightning`,
  in the defender's event 1) has just hurt adds its gain to the life the handler left, not to its life at the
  event's entry. One event separates the two readings (`abs-nm-marsh`, 25 life: a checker that took the entry life
  mismatched there, and checks it once corrected); the other events where the handler changed the attacker's life
  have no leech after it, or do not separate them. [I]

### D. Stun, cold, freeze, poison, burn

```
D1. ApplyStun(att, def, len = pkt.stunLen):                          [I] (COMBAT_ApplyStun, all of D1)
      if len ≤ 0: return
      if def is a monster with type flag 0x08 (special: a champion, unique or superunique):
        if Range(att.seed, 100) < 90: return                         ; draw (attacker), inlined; [C] (34)
      if def is a boss: return
      if MonStats[def.class].Velocity = 0: return
      len ← def is a hireling ? min(len, 13) : min(len, 250)
      state 21 (stunned) until frame + len

D2. ApplyCold(att, def, len = pkt.coldLen):                          [C] for the draw
      if len ≤ 0: return
      ce: i8 ← def is a monster ? MonStats[def.class].coldeffect[difficulty] : −50
      if ce = 0: return                                              ; no chill, no draw
      if def is a monster and ce < 0: len ← len ÷ MonsterColdDivisor
      len ← max(len, 1)
      state 11 (cold) until frame + len, stats 67, 68, 69 ← ce        ; a longer chill extends, a shorter one does not shorten
      r ← Range(def.seed, 100)                                       ; draw (DEFENDER), inlined
      if r < 20 and def is a monster without the MonStats2 flag: state 107 (shatter) on, else off

D3. ApplyFreeze(att, def, len = pkt.freezeLen):                      [I] (COMBAT_ApplyFreeze, all of D3)
      if def is a player, a boss, a unique or a hireling: ApplyCold(att, def, len); return
      if def has state 54: return
      if coldeffect[difficulty] ≥ 0: return
      len ← len ÷ MonsterFreezeDivisor;  state 1 (freeze) until frame + len;  mode change;  timer at frame + 1 + len

D4. ApplyPoison(att, def, dmg = pkt.poison, len = pkt.poisonLen):    [I] (COMBAT_ApplyPoison, all of D4)
      if dmg ≤ 0 or len ≤ 0: return
      if def has a poison state with damage > dmg: return            ; replaced only when dmg ≥ the old one
      state 2 (poison) with stat 74 (hpregen) ← −dmg until frame + len
    ApplyBurn: the same with state 115 and (pkt.burn, pkt.burnLen)    ; a plain attack has burnLen 0: no state
```

- D2. **The cold draw is on the defender's seed**, after the chill is applied, whatever the outcome. It reproduced in
  every logged event with a cold length (the defender's exit seed asserted). [C]
  The chill strength and the shatter flag were not asserted. [I]
- D2. `coldeffect` 0 means the monster is not chilled and no draw happens; a player is chilled at −50. The
  `MonsterColdDivisor` (1, 2, 4) shortens a monster's chill only. [I]
- D1. The stun draw on a unique reproduced with 0 mismatches in 34 events; the stun goes on only when `r ≥ 90`. [C]


### E. The stat events: crushing blow, open wounds, freeze

Stats 134, 135 and 136 register `itemeventfunc` 14, 15 and 16 on events 5 (`domeleedamage`) and 6
(`domissiledamage`); each handler gets the attacker, the defender, the packet and `stat id << 16 | layer`. [C]
Over ItemStatCost, and the registrar's and `UNIT_AddEvent`'s stores read with a second tool.


```
E1. CrushingBlow(att, def, pkt, event):                              [C] (STATEVENT_CrushingBlow, all of E1)
      c: i32 ← stat(att, 136)
      if c ≤ 0: return                                               ; no draw
      r ← Range(att.seed, 100)                                       ; draw (attacker), inlined
      if r ≥ c: return
      if def is a player or a hireling: k: i32 ← 10
      else if def is a monster:
        k ← (MonStats[def.class].boss or def has type flag 0x02) ? 8 : 4         ; 8: MONSTATS_IsBoss; 4 on champions
        n: i32 ← max(stat(def, 100), 1)
        k ← k + MulDiv(k, PlayerHpPct(n), 100)                       ; + 50 % per player beyond the first
      else: k ← 4                                                    ; a unit of type 2 or more: no player-count term
      if event = 6: k ← k × 2                                        ; missile
      cb: i32 ← stat(def, 6) ÷ k
      if stat(def, 36) > 0: cb ← cb − MulDiv(cb, min(stat(def, 36), 100), 100)    ; at 100: 0 while cb ≤ 0x100000, above it cb mod 100 (MulDiv divides first)
      stat(def, 6) ← max(stat(def, 6) − cb, 0);  if 0: pkt.result |= 0x2
      if cb > 0: overlay 147

E2. OpenWounds(att, def, pkt, event):                                [C] (STATEVENT_OpenWounds, all of E2)
      c: i32 ← stat(att, 135)
      if c ≤ 0: return                                               ; no draw
      r ← Range(att.seed, 100)                                       ; draw (attacker), inlined
      if r ≥ c: return
      L: i32 ← max(stat(att, 12), 1)
      dmg: i32 ← Band(L) + 40
      if def is a player: dmg ← dmg ÷ 4;  if event = 6: dmg ← dmg ÷ 2
      else if def has type flags 0x0C (champion or unique): dmg ← dmg ÷ 2     ; the special bit 0x08:, 383; 0x04 alone
      state 62 (openwounds) for 200 frames with stat 74 ← −dmg       ; STATE_ApplyTimed; a new wound restarts it

    Band(L): L < 2 → 0;  L ≤ 15 → (L − 1)·9;  L ≤ 30 → 126 + (L − 15)·18;  L ≤ 45 → 396 + (L − 30)·27;
             L ≤ 60 → 801 + (L − 45)·36;  else 1341 + (L − 60)·45

E3. Freeze(att, def, pkt, event):                                    [C] (STATEVENT_Freeze, all of E3)
      s: i32 ← stat(att, 134);  if s ≤ 0: return                    ; no draw
      x: i32 ← max(s − 1, 0)
      c: i32 ← (x·4 − dlvl + 10 + alvl [− 6 for a missile])·5 [÷ 3 for a missile, signed];  c ← clamp(c, 0, 100)
      r ← Range(att.seed, 100)                                       ; draw (attacker), also when c = 0
      if r < c: len ← clamp((c − r)·2 + 25, 25, 250);  ApplyDamage(att, def, fresh packet with freezeLen = len, doReductions: true)
```

- E1. **Crushing blow takes a share of the current life**, 1/4 for normal monsters (247 events) **and uniques** (63),
  raised by the player-count percent of [monsters/stats § C](../../spec-monsters/stats/#c-the-player-count-monplayerbonus)
  (at `/players` 2, 3 and 8: 5, 40 and 124 events), then lowered by positive physical resistance. Two community pages
  give 1/8 for champions and uniques and one says the player count does not matter; for uniques and the player count
  1.14d does neither. [C]
  **Champions take 1/4 as well**, raised by the player count: 52 crushing blows on defenders with type flags `0x0C`
  (40 in Nightmare at `/players` 8), every life value asserted. [C]
- E1. **A champion carries the special flag `0x08` as well as `0x04`**: `MonMarkSpecial` sets `0x08` on every
  champion-pack member before the champion roll sets `0x04`,
  and of 7 474 monsters first seen in 74 combat logs 164 have both and none has `0x04` alone. `STATEVENT_CrushingBlow`
  reads neither flag, so the community's 1/8 does not apply to champions either. Re-labelled
  holds 72 such events among the 163 it counted as uniques (`0x08`). [C]
- E1. There is **no difficulty and no classic branch** in crushing blow: 3 102 calls in Normal, 1 502 and 160 classic
  in Nightmare, 549 and 126 classic in Hell, every life result by a model with neither term. [C]

- E1. **The hireling and the other kinds**, emulated: `k` is 10 for a player and for a hireling defender (221 and 114
  cases at the life write), 4 with no player-count term for a defender of type 2 or more, and doubles for event 6.
  [C]
  10) and leaves `cb − MulDiv(cb, 100, 100)`, which is 0 while `cb` ≤ 0x100000; above it `MulDiv` divides first,
  `(cb ÷ 100) × 100`, so the blow keeps `cb mod 100`, below one life point (59 cases). [C] (row 15)
- E1. `k = 8` for MonStats `boss` (act bosses) and superuniques reproduced with 0 mismatches on an act boss (34
  events, Andariel, Normal, `/players` 8) and on superuniques (55), with the same draw, player-count scaling and
  physical-resistance step as `k = 4`. [C]
- E2. `Band(L) + 40` equals the community's per-frame bands; at level 85 it is `1341 + 25·45 + 40` = 2506 per frame,
  logged as stat 74 = −2506 (`solo-h3`, frame 266, a normal monster). Open wounds reproduced 246 times; in all 11 logged windows the bleed ended at the
  application frame + 200. [C]
- E2. **The halving tests the type flags `0x0C`.** All 383 wounds on monsters with the special flag `0x08` were
  halved, Andariel's 63 included (her unit carries `0x08`: stat 74 = −1 275 = −(2 551 ÷ 2) at attacker level 86), and
  all 1 497 on monsters without `0x0C` took the full `Band(L) + 40`. [C]
  The test never reads MonStats `boss`, so an act boss without `0x08` takes the full amount and a monster with the
  champion flag `0x04` alone is halved; neither was met in a run (Andariel carries `0x08`, and since a champion also
  carries `0x08` (E1), no stock spawn separates a `0x04`-only defender). Emulated, `MonTypeFlag(def, 0x0C)` halves
  a defender with `0x04` alone (55 cases) and a MonStats `boss` defender without `0x0C` takes the full amount (42).
  [C]
- E3. **Freeze on a melee hit reproduced**: 81 rolls of stat 134 (*Frostwind*, stat 134 = 4) on the attacker's seed,
  each with its draw and a length from 26 to 249 frames, up to the nested delivery; that check did not compare the
  chance. [C] E3's chance is the emulated map, with `x·4`
  where the earlier text had `(x − 1)·4` (85 separating cases), and the missile terms (`− 6`, `÷ 3`), not met in a
  run, emulated in 199 event-6 cases. [C]

**E4. The life tick.** Poison and open wounds bleed through the unit's regeneration event, once per frame.

```
E4. MonLifeTick(game, unit):                                          [C] (all of E4)
      s: i32 ← stat(unit, 74)
      if unit has a state with the `life` flag (poison, preventheal, openwounds): s ← s − base stat 74 of the unit
      if HasState(unit, 52) and s ≥ 0: return
      requeue at frame + 1;  if s = 0: end the event
      hp: i32 ← stat(unit, 6) + s
      if hp > stat(unit, 7): hp ← stat(unit, 7); end the event
      if hp < 1: hp ← 0
      stat(unit, 6) ← hp;  if hp = 0: the unit dies with the poisoner or the wounder as killer
```

- E4. **Bleed and poison kill monsters**; under a `life` state a monster's natural regeneration is suspended (the base
  list's stat 74 is subtracted). 6 181 ticks reproduced. [C]

**E5. The other stat-event handlers.** `UNIT_DispatchEvent` runs a unit's handler records for the event, newest
first; a handler draws on the seed of **its own unit**, the unit that owns the event (the attacker for the `do…`
and `kill` events, the defender for `attacked…`, `damaged…` and `killed`). The handlers registered on stock data
that draw:

| # | Handler | Registered by | Events | Seed | Draw |
|---|---|---|---|---|---|
| 1 | missile at the source | Chilling Armor (60) | `hitbymissile` | defender | none of its own; the missile's creation |
| 3 | shiver armour | Shiver Armor (50) | `attackedinmelee` | defender | `SKILLS_RollElemDamage`: one `RangeB`, one more `RNG_Step` for `EType` 10 |
| 7 | knockback | stat 81 | `domeleedamage`, `domissiledamage` | attacker | one inline step; `low & 0x7F < c` sets result `0x8`, `c` 64, or 32 or 128 by MonStats2 flags |
| 8 | howl | stat 112 | as 7 | attacker | `RangePow2(seed, 128) < stat`: the monster flees |
| 9 | stupidity | stat 113 | as 7 | attacker | `Range(seed, 100)` against `clamp(((alvl + 4·stat − dlvl) + 6)·5 [÷ 3 for a missile], 1, 99)` |
| 14–16 | freeze, open wounds, crushing blow | stats 134–136 | as 7 | attacker | E1–E3 |
| 20 | skill on attack, kill or hit | stats 195, 196, 198 | the attack, kill and hit events | attacker | with no packet or packet flag `0x20`: one inline step, `low mod 100 < stat` casts the item skill |
| 21 | skill on get-hit | stat 201 | `damagedinmelee`, `damagedbymissile` | defender | only with stat 201 > 0 and a packet whose result has bit `0x4` (tested before the draw): `RangeB(seed, 100) < stat` casts |
| 30 | skill on death or level-up | stats 197, 199 | `killed`, `levelup` | the dying or levelling unit | one inline step, `low mod 100 < stat` casts |
| 31 | reanimate | stat 155 | `kill` | attacker | one `RangeB` |

- E5. As above. [C] for the seed and the count of 7, 8 and 20 on the attacker, 9 on a monster attacker and 21 on the
  player defender: one step of their unit's seed per call in the skills runs.
  [I] for 3, 30 and 31, which never fired
- E5. **The other registered handlers draw nothing**: 2, 4, 5, 6, 10, 13, 17, 18, 19 and 22–29; 11 and 12 are named
  by no stock row. Among them the `kill` handler 28 (stat 86, heal after kill) adds `stat · 256` to the
  attacker's life, capped at its maximum, with no draw. [C] 5, 6, 13, 17, 19, 22, 28 and 29 stepped no seed in the
  skills runs; with a second tool, handler 28's body and its 541-function closure, and 15 of the 17 listed handlers up
  to `COMBAT_ApplyDamage` and `COMBAT_GetHit`, hold no draw. [I] for the closures' 3 to 6 unresolved game-code indirect calls each, and for 19 (slow) and
  27 (clay golem), whose closures reach draws through `STATE_ApplyTimed`'s queue path

- E5. **The item-skill handlers' draws, up to their casts.** Each reads its chance as `UnitGetStat(unit, stat,
  layer)` of the record's `stat << 16 | layer`, the skill as `layer >> [DataTables+0xC6C]` and the level as `layer &
  [DataTables+0xC70]`. All three return 0 with no draw for no unit or a chance ≤ 0. Handler 20 also returns 0 with no
  draw for a packet whose `+0x00` lacks bit 5; else (no packet, or bit 5 set) it steps its unit's seed once inline and
  goes on when `low mod 100` (unsigned) is below the chance (signed). Handler 21 also returns 0 with no draw with no
  packet or a packet whose `+0x04` lacks bit 2; else it goes on when `RNG_RangeB(unit+0x20, 100)` is below the chance.
  Handler 30 steps its unit's seed once inline whatever the packet and goes on when `low mod 100` is below the chance.
  Each then returns 0 with no cast when the skill has no Skills record (handler 30: the skill outside `[0, Skills
  count)` as well), else casts as below. [C] (ends at `ItemCastAtUnit` or
  `ItemCastAtXY`; `event_item`)
- E5. **Who casts, at what, with which effect flag.** Handler 20 without `ItemTgtDo` (Skills `+0x07` bit 5) casts as
  its own unit: `ItemCastAtUnit(ECX unit, EDX skill; level, other, 1)`, or with no other unit `ItemCastAtXY(ECX unit,
  EDX skill; level, the unit's path point, 1)`. With `ItemTgtDo` the other unit is both the caster and the target,
  `ItemCastAtUnit(ECX other, EDX skill; level, other, 0)`, and with no other unit the handler returns 1 with no cast.
  Handlers 21 and 30 cast as their own unit at the other unit or at the point, effect 0. `ItemCastAtUnit` (`ECX` the
  caster, `EDX` the skill, the level the first stack word) refuses no target, a caster with no game (`+0x80`) and a
  caster in state 54, else calls `ITEMSKILL_Cast(game, caster; skill, level, target, 0, 0, &type, &guid, &ox, &oy,
  effect)`; `ItemCastAtXY` makes the game and state tests and passes the aim 0 and the point. [C] (ends at the cast's
  boundaries below,
  `Skills.txt:ItemTgtDo`, `event_item`, `cast_item`;
  the argument order as corrected)
- E5. **`ITEMSKILL_Cast`** refuses id 0 and a row whose `ItemEffect` is 0 with no write; aims the caster's path at
  the given unit or point; then by the **low byte** of `ItemTarget`: 1 aims at the caster, 2–4 call the target
  helpers below, which may refuse, and any other value skips the switch. It ends at `SKILLS_SrvStart(id, lvl, 1)` with
  `ItemCheckStart` (Skills `+0x08` bit 1), else at `SKILLS_SrvDo(id, lvl, 0, 1, effect)`, `ECX` the game and `EDX` the
  caster. For `ItemTarget` blank, 1, 3 or 4 no seed is stepped before these boundaries (helper 3 up to its corpse pick
; helper 4 whole). When helper 2 refuses for want of a room, the cast restores the saved target unit, or
  the saved point, and bit 6 of the caster's `+0xC4`, and returns 0. [C] (ends at `SKILLS_SrvStart` or `SKILLS_SrvDo`
; `ITEMSKILL_Cast`, `Skills.txt:ItemTarget`, `Skills.txt:ItemCheckStart`,
`cast_item`)
- E5. **`ItemTarget` 2 draws on the cast's caster.** `ITEMSKILL_Cast` gives the helper **its own
  caster** (`EDX = ESI`, the call). The helper takes the caster's room; with none it
  returns 0 with no draw and the cast is refused. Else, on its first try, it steps **the caster's seed** twice inline
  (the second step from the first's full state) and tests `COLL_PatternTest(room, x + low₁ mod 40 − 20, y + low₂ mod 40 −
  20, …)` at the caster's position, the remainders unsigned, for a caster of type 0, 1 or 3 (the run's casters, whose
  position is their dynamic path's). [C] (ends at `COLL_PatternTest`,
  the first try; `cast_item`)
- E5. After the first test: a result of 0 sets the path's target point to the tried point and the helper returns 1;
  any other result makes another try, at most 10, so 2 to 20 steps; all 10 failing return 0 and the cast is refused
  (no `SKILLS_SrvDo`). An item Teleport, the one stock `ItemTarget` 2 row, therefore moves its caster to a free point
  offset by −20 to +19 on each axis from its position. A caster of type 2, 4 or 5 takes that position from its static
  path's dwords. [I]
- E5. **Whose seed an item Teleport steps.** Joining the handlers' casters to the helper's: the handler's own unit for
  handlers 21 and 30, and for handler 20 without `ItemTgtDo`; **the other unit** for handler 20 with `ItemTgtDo`,
  which Teleport has. So on a skill-on-attack, -kill or -hit stat the struck unit is moved and its seed stepped, and
  on skill-on-get-hit, -death or -level-up the stat's owner. No case runs from a handler through to the helper: the
  join composes the handler family's casts with the cast family's runs, so it stays inferred. [I] (log, review, ruling 1)
- E5. **The item effect flag is 1 only from handler 20 without `ItemTgtDo`.** Handlers 21 and 30 and handler 20 with
  `ItemTgtDo` pass 0; the two item-use entries pass 0; charges do not go through
  `ITEMSKILL_Cast`; `SKILLS_SrvDo`'s seven other direct calls pass 0 as its fifth word, and no dword of the image holds
  the address of `SKILLS_SrvDo`, `ITEMSKILL_Cast` or its two callers. So `ItemEffect` 36 (Frost Nova, Nova, A3) and 151
  (Chain Lightning) replace the do function only for skill-on-attack, -kill or -hit stats; any other item cast of
  those rows runs their `srvdofunc`. [C] (`SKILLS_SrvDo`, `ITEMSKILL_Cast`, `Skills.txt:ItemEffect`, a raw scan and r2)
- E5. **Do 151, the item Chain Lightning**, takes `srvmissilea` (`+0x48`, signed) and returns 0 with nothing written
  outside `[0, Missiles count)`; else it sets bit 6 of the caster's `+0xC4`, evaluates `calc1`, and calls
  `SkillMissileCreate(ECX game, EDX srvmissilea; caster, id, lvl, dx, dy, 0, 0, 0)` with `(dx, dy)` the target's
  position minus the caster's, `(0, 0)` without a target. It steps no seed before that call. [C] (ends at
  `SkillMissileCreate` `use_item`)
- E5. After that call: no missile returns 0; else the missile's `MissileData+0x28` word gets the `calc1` value and do
  151 returns 1. With the reading of `SkillMissileCreate` (start at the caster's position plus `(dx, dy)`), the item
  Chain Lightning starts at the target unit. [I]
- E5. **Order on a kill**: the defender's `killed` handlers (30) run before the attacker's `kill` handlers (28, 31,
  and 20 for stat 196), all inside `COMBAT_ApplyDamage` (B5). [I]

### F. The boundary at delivery

Durability loss (`COMBAT_DurabilityLoss`: the attacker's weapon one draw, the defender's armour a slot pick `RangeB(7)`, a weighted `RangeB` and one draw, on the owners' seeds through `ITEMS_DurabilityLossRoll`), the knockback, the get-hit decision (`GetHitRoll`, up to two `RangePow2` on the defender) and the monster's on-hit skill were boundary oracles in the run: their entry seeds were asserted and their exit seeds taken. [C] A draw model checked against those seeds since: the durability steps, one for a player attacker, three for a player defender, none for a monster or hireling (9 680 pairs but one), and a player defender's get-hit draws are `GetHitRoll`'s (25 669 of 25 669). [I] The roll values, the knockback, the monster's on-hit skill and a monster or hireling defender's get-hit stay boundary oracles. Hit recovery, the get-hit decision and knockback timing are specified in [anim/timing § M](../../spec-anim/timing/#m-hit-recovery-the-block-the-get-hit-roll-the-mode-tests-stun-and-the-hit-class) and [anim/movement § E](../../spec-anim/movement/#e-knockback) (phase (4)). The durability loss itself is specified in [items/economy § H](../../spec-items/economy/#h-wear-durability-quantity-charges-replenish).

## Outputs

- The defender's life (stat 6), mana and stamina after the hit, the attacker's life and mana after leech, the
  defender's timed states (stun 21, cold 11, shatter 107, freeze 1, poison 2, open wounds 62, burning 115). [C] for
  life, leech, the open-wounds state; [I] for the other states
  and for freeze's state inside the nested delivery
- The result word with `0x2` on a kill; the hand-off to `COMBAT_GetHit`. [C]
- The attacker's seed advanced by the stat-event, leech and stun draws; the defender's by the cold draw. [C] for
  crushing blow, open wounds, leech and cold and for freeze

## Worked example

**Crushing blow and leech in Hell** — the delivery of combat/overview § Example 1
(`solo-h3`, frame 357; the `CombatSolo` Sorceress, open wounds 10, crushing blow 20, life steal 5, mana steal 7,
against a `fallen2` at life 74776 with physical resistance 15). Reduced packet: physical 78365, magic 22020, cold
6268, poison 153, total 106806. [C]

| Step | Computation | Attacker seed `9fdf9862:101f40ba` → | Result |
|---|---|---|---|
| kill pre-test | `106752 > 74752` | — | result `0x7` |
| open wounds (10) | `Range(100)` = 44 ≥ 10 | `4cb2a424:42ae9671` | no wound |
| crushing blow (20) | `Range(100)` = 13 < 20; `k` = 4 (`/players` 1, `PlayerHpPct(1)` = 0); `cb = 74776 ÷ 4` = 18694; `18694 − MulDiv(18694, 15, 100)` = 15890 | `a0532625:1ffd7581` | life 74776 → 58886 |
| `phys = min(phys, HP)` | `min(78365, 58886)` | — | 58886 |
| leech | Hell divisors 3: life `320 ÷ 3` = 106, mana `448 ÷ 3` = 149; `Drain(H)` of `fallen2` = 75; life `MulDiv(MulDiv(58886, 106, 100), 75, 100) ÷ 64` = 731; mana capped at the maximum | `Range(2)` = 0 → `180c9ffa:42dec8c5` | attacker life 1540389 → 1541120 |
| life change | `58886 − 106806` < 256 | — | 0, killed |
| cold | length 60 > 0, `coldeffect(H)` −33 | defender `c5ef0176:3c8fe7bd` → `Range(100)` = 79 → `fb92678b:528e7d64` | no shatter |

**Crushing blow at `/players 8`** (`solo-nm-p8`, Nightmare, frame 426): a `corruptrogue1` created at 8 players (stat
100 = 8), life 138409, no physical resistance. `k = 4 + MulDiv(4, 350, 100)` = 18, `cb = 138409 ÷ 18` = 7689, life
→ 130720. The Nightmare leech fields are `320 ÷ 2` = 160 and `448 ÷ 2` = 224. [C]

## Reimplementation notes

- **Crushing blow is a share of the defender's current life, before this hit's damage**, and it is 1/4 on uniques
  and champions. [C]
- **The player count raises the crushing-blow divisor** through the monster's stat 100 (its creation count). [C]

- **Leech uses the reduced, life-capped physical damage**; elemental damage never leeches. [C]

- **The leech overlay draw** (`Range(2)` on the attacker) happens only when both life and mana gains ran; a
  reimplementation without overlays must still take it. [C]
- **The cold draw is on the defender's seed**, every time a chill is applied. [C]
- **Life below 256 is 0.** A hit that leaves less than one life point kills. [C]
- **Absorb heals from both percent and flat absorb**, and only a positive amount. [C] for the percent
 and for the flat (794 heals on the player, flat fire 372,
  lightning 51, cold 1)
- **The finisher's `RNG_Step` is a peek, not a draw.** It saves the attacker's seed words, steps the seed and writes
  the words back, so advancing the seed there shifts every later attacker draw (A3). [C] (`COMBAT_PrgFinisher`, two tools)
- **Its entries draw, even when they create nothing.** Entries 37, 39, 41 and 143 step the attacker's seed once at
  entry, before their record test (A3). [C] Entry 38
  draws two or three times on it after delivering the queued hit. [I]
- **The finisher is not only the normal attack's.** The assassin finishing moves (do 42, 46, 50, 52) call it with
  their own queued hit and then deliver (A2); do 46 runs it only on a hit but delivers on both paths. [C] for the call
  sites and the calls of do 42, 46 (on its bad-id path) and 50 up to them; [I]
  for do 46's calls on a valid id and the deliveries
  after them
- **A ring's step count is used untested.** A ring given 0 never ends: neither ring tests its count, loaded into
  `edi` and added four times over until the index reaches `0x100`. [C] (static)
  A negative count reads below the direction tables until the index wraps (A3). A reimplementation that guards these
  changes behaviour only for data that makes them happen. [I]
- **A handler draws on its own unit's seed**: shiver armour (3) and skill on get-hit (21) on the defender's, skill on
  death (30) on the dying unit's, knockback, howl, stupidity, skill on attack or hit, and reanimate on the attacker's (E5).
  [C] for 7, 8, 9, 20 and 21; [I] for 3, 30 and 31, never fired

- **The item effect is not every item cast's.** An item Nova, Frost Nova or Chain Lightning runs its `ItemEffect` (36,
  151) only from a skill-on-attack, -kill or -hit stat without `ItemTgtDo`; from get-hit, death, level-up or the
  item-use entries it runs the row's `srvdofunc` (E5). [C]
- **Burning never applies from a plain attack**: the builder leaves `burn = 2` with `burnLen = 0`: `burnLen` was 0
  at the builder's return in all 10 951 logged builds. [C]

## Evidence

- §§ 6 (resolve, queue, deliver), 8 (delivery), 9 (leech, stun,
  cold, freeze, poison, burn), 10 (stat events), 14 (the finisher and its dated 2026-10-20 correction, the ticks), 15 (the confirmed raises and the
  below-the-floor bullet), 13 (*Leads used*: crushing blow, open wounds, absorb, leech).
- §§ 10 (item-event casts and the `ItemTarget` 2 helper's draws,
  the dated Phase 1b note), 12 (the finisher's seed save and restore; its callers, as corrected by the dated 2026-10-21 note).
- §§ 1 (the finisher's six calls, `ItemEffect` 36), 4 (the
  finishing moves' calls of the finisher and `DeliverQueued`), 5 (entries 36–41 and 143 up to their first creation and
  the rings' step count), with its review in the  log

  (8 700 cases, 0 mismatches).
- §§ 4 (do 151), 5 (`ITEMSKILL_Cast`, its `ItemTarget` helpers and
  its two callers), 6 (handlers 20, 21, 30 and the item effect flag), 7 (`SKILLS_PayCost`), with its review in the
   log (fixes 1, 2 and 6, ruling 1)
  (12 000 cases, 0 mismatches).
- §§ 1 (the `srvprgfunc` entries, the finisher's tail and stock
  use, the dated 2026-10-21 note), 2 (item casts, the dated 2026-10-21 notes), 3 (the stat-event handlers, their registrations and draws), 13 (draws per event), as fixed by
  the architect's P1.3 review (log).
- Tables: DifficultyLevels, MonStats,
  ItemStatCost, States.
- Upstream: rng, [monsters/stats § C](../../spec-monsters/stats/#c-the-player-count-monplayerbonus).
  Downstream: [items/tc](../../spec-items/tc/) (the drop at the kill).
