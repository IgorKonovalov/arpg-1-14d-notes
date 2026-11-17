---
title: "How an item drops"
sidebar:
  order: 1
---

A monster dies and something falls on the ground. This page follows that drop from start to finish. The game
picks a [treasure class](../../reference/glossary/) (TC), walks it to decide how many items fall and which ones, rolls each
item's quality with your [magic find](../../reference/glossary/), picks a unique or set row or a set of affixes, rolls the
property values,
and finally decides whether the item is ethereal, socketed, or gets an extra affix from the `AutoMagic` table. It is based on five
reviewed specs: [treasure classes](../../spec-items/tc/#purpose), [the quality roll](../../spec-items/quality/#purpose),
[uniques and sets](../../spec-items/uniques-sets/#purpose), [affixes](../../spec-items/affixes/#purpose) and
[base stats and properties](../../spec-items/properties/#purpose). Chests use the same treasure-class walk. Other
ways to get an item, such as vendors or the cube, are on [their own page](../items-other-paths/).

## The big picture

A drop uses four different random [seeds](../../reference/glossary/), and each [draw](../../reference/glossary/) of the drop happens on
one of them. Keeping them apart is the key to the whole chain:

| Seed | Belongs to | Decides |
|---|---|---|
| source seed | the dying monster or the opened chest (the [source unit](../../reference/glossary/)) | every TC pick and every quality roll |
| [game seed](../../reference/glossary/) | the game | gives each new item its two seeds below |
| unit seed | the new item as a world object | its [base stats](../../reference/glossary/): durability, defense, quantity, picture |
| [item seed](../../reference/glossary/) | the new item's item data | unique or set row, affixes, property values, [ethereal](../../reference/glossary/), sockets, [automagic](../../reference/glossary/) |

```mermaid
flowchart TD
  death["monster dies"] --> choose["choose the TC<br/>by kind and difficulty"]
  choose --> up["level upgrade<br/>Nightmare and Hell, expansion"]
  up --> pick["one pick: NoDrop, item or sub-TC"]
  pick -->|"sub-TC"| pick
  pick -->|"item"| qual["quality roll<br/>source seed, magic find"]
  qual --> create["create the item<br/>two game-seed draws"]
  create --> base["base stats<br/>unit seed"]
  base --> sw{"quality"}
  sw -->|"unique or set"| us["unique or set row<br/>item seed"]
  sw -->|"rare, magic"| aff["affix picks"]
  sw -->|"superior, low, normal"| oth["quality row or nothing"]
  us -->|"no row fits"| fb["fallback: rare or magic"]
  fb --> aff
  us --> props["property values"]
  aff --> props
  oth --> props
  props --> sm["staff mods"]
  sm --> eth["ethereal roll<br/>expansion"]
  eth --> sock["socket roll<br/>normal and superior"]
  sock --> auto["automagic affix<br/>expansion, not set or unique"]
  auto --> next["back to the next pick"]
  next --> pick
```

The TC walk and the quality roll interleave on the source seed: every pick and every quality test draws from it in
turn, so one extra or missing draw changes every later item of the same drop. Creating the item does not touch the
source seed at all; everything from the unique pick to the automagic affix happens on the new item's own seeds.

![Animation: items-tc-andariel-hell](/illustrations/items-tc-andariel-hell/tc.gif)

[Step through items-tc-andariel-hell](../../illustrations/items-tc-andariel-hell/index.html)

Andariel's drop in an expansion Hell game, one player alone, magic find 200, walked pick by pick. Each pick of a TC with positive Picks draws on the source seed over the TC's total weight plus NoDrop (a TC with negative Picks takes its entries in order with no draw), and a picked sub-TC is walked to the end before the parent's next pick (TC § D, § E, § G); a monster drop stops at six items (§ H). A picked item that is not a unique or set entry then runs the quality tests its type allows in order, unique, set, rare, magic, superior, normal, until one wins (losing the normal test gives low quality); a test draws on the same source seed against its chance unless the chance is already below one, which wins with no draw (TC § H, quality § Test order, § D, § E). Every value shown is computed by our models, not observed in the game, and the seed is an illustrative input, not a seed a game derives. Not modelled and not shown: the quest drop, gold amounts, base stats, the ethereal and socket rolls, automagic, and the properties' values. Seed: illustrative, an input of our own. Every value shown is computed by our model, not observed in the game.

## Which treasure class

A monster has four TC columns per difficulty in MonStats: `TreasureClass1` for normal monsters and
[minions](../../reference/glossary/), `TreasureClass2` for champions, `TreasureClass3` for uniques, and `TreasureClass4`, the
[quest TC](../../reference/glossary/). A [superunique](../../reference/glossary/) uses its own row's TC. The game tests the kinds in the order
superunique, champion, unique, normal. The order matters because a live monster carries several kind flags at once:
champions also carry the unique flag, and they still get the champion column. Champion-before-unique is confirmed by
a recorded Nightmare game, and the recorded games of the item runs show champions taking their column in Normal,
Nightmare and Hell and in classic games, over 35 monster classes; Hell uses its own columns the same way.
Superunique-before-champion is read from the code only, since no monster seen in a run carried both flags.

The quest TC then replaces whichever TC was chosen when the monster has one, the killer is (or belongs to) a player,
and that player's quest bits for the boss are clear. Because the drop runs before the boss's quest script sets those
bits, a first kill always gets the quest TC. This is confirmed for single player, including a kill by a hireling and
one by a pet, each counted for its player; a kill through an `exp` state and a party were not run.

Some monsters carry a "no death drop" flag and skip the drop entirely, as does a monster whose death spot fails a
collision test; both skips are confirmed in a recorded game. The code sets the flag in 30 places: 20 plain
writes of the flag, and 10 more that set it together with other flags. Read from the code, these monsters get it:

- town NPCs, critters, hirelings and player summons (every class whose `Align` is 1) when made by the normal spawn
  code;
- the bone prisons, and the Travincal compelling orb (when it is created and again when it dies);
- monsters that remove themselves through their own behaviour: nests and other spawners once they have spawned
  enough, traps, the Seven Tombs illusion, the Dark Wanderer and the trapped souls;
- monsters spawned by another unit or by a spawner skill (including Baal's tentacles and his clone), and monsters
  brought back to life by a resurrect or revive skill or by the `reanimate` item property;
- hirelings (at the hire and at resurrection), and a monster restored from an inactive room that had the flag.

An earlier reading had counted 21 plain writes (one of them sets a different flag) and split the unread ones into
"three in quest drops" and "twelve in skill code"; the closer reading shows the three are the compelling orb's two
places and a mosquito nest's behaviour, and the twelve are the self-removing monsters above. A flag word copied in
whole from somewhere else would not show up in this count, so the list is a lower bound.

**`MonItemPercent` plays no part.** The game loads this small table (a treasure-class percentage, and heart,
body-part and component percentages) at every start, which is confirmed, but no code reads it: read from the code, no
drop chooses a row from it, draws on it or skips because of it. A run that watches the table's memory during kills
would settle the last doubt, an address built at run time.

**Level upgrade.** In an expansion game on Nightmare or Hell, a monster's top TC can move up its group (for example
`Act 1 (N) H2H A` to `H2H B`). The game walks forward through the group while the monster's level
 is at least the next TC's `level`. The walk only moves forward, so a base TC whose own level is
above the monster's is kept, never replaced by a lower one. Monsters flagged `boss` or `noRatio` do not upgrade, nor
do sub-TCs or chests. The walk is confirmed on Nightmare and Hell kills of normal, minion, champion, unique and
superunique monsters, and the classic and `boss` gates on the recorded classic games and five boss kills. Only the
`noRatio` gate is read from the code: no stock `noRatio` monster has a TC.

## Walking the treasure class

A TC is a weighted list of up to ten entries, each an item, an item-type TC such as `weap3`, or another TC. Its
[Picks](../../reference/glossary/) column says how many times to pick:

- **Positive Picks**: each pick draws once on the source seed over the total weight plus the [NoDrop](../../reference/glossary/)
  weight. A roll inside the NoDrop part drops nothing; otherwise the entry whose weight range holds the roll is taken.
  A TC whose only entry has weight 1 still spends a draw on every pick.
- **Negative Picks** (as on the unique and superunique TCs of the recorded games): no draw at all. Pick 0, 1, 2 …
  simply takes entry *i* as many times as its weight, in order. So `Act 1 Unique A` with `Picks = −3` always gives
  one pick of `Act 1 Uitem A` and two of `Act 1 Cpot A`.
- A pick that lands on another TC opens that TC and walks it fully before the parent's next pick (depth first). Sub-TCs
  never get the level upgrade.
- Each TC carries [ratio](../../reference/glossary/) words (`Magic`, `Rare`, `Set`, `Unique`) that improve the quality odds.
  Down a chain of sub-TCs each word takes the larger of parent and child, so a good parent's ratios reach the item
  even through plain sub-TCs. Confirmed in a recorded game.
- A monster drop stops at six items in total across the whole walk; the sixth item ends it at once. Confirmed in
  recorded games. Only the five act bosses' rows have `Picks` 7, and
  the stop is logged ending Duriel's drops with picks left; that it does the same for the other four is read from the code.

The item-type TCs (`weapN`, `armoN`, `bowN`, `meleN`, `abowN`; for example `bow3`) are built by the game at load:
for each item type that has one, a TC for every N = 3, 6, … 96, holding every spawnable, non-quest base of that type
whose base `level` lies above N − 3 and at most N, each weighted by the `Rarity` of the base's own type. Confirmed by
the recorded drops that land in them.
"Of that type" is the game's item-type test: a base counts when its own type or its second type is the TC's type or
descends from it through the types' parent columns, so every sword and axe is a `weap`. By the code, the game works this out once,
at load, as a table of every type against every other, and reads the table at each test. That the TC build uses this
test is read from the code; the same test, applied to item units, reproduces every recorded affix choice.

When a pick lands on an item, the game asks for a quality (next section) unless the TC entry itself names a unique or
set row, in which case the quality is fixed to unique or set with no roll. In stock data the only such entries are
`Annihilus` in `ROP (N)` and `ROP (H)`, and no run reached them, so that path is read from the code. For gold, a `mul=` value in the cell scales the amount and
the killer's (and its owner's) gold find adds a percentage; both are confirmed in a recorded game, and the sixth item
of a full drop gets no gold find.

Chests use the same walk with no level upgrade. Their TC is an `Act N Chest A/B/C` of their [act](../../reference/glossary/) and
difficulty, the tier set by where the chest's level falls in thirds of the act's level span; the tier rule and the
walk are confirmed on recorded chest drops. The tier (0, 1 or 2) is also passed as the item level of the quality roll,
so a chest's quality roll runs at item level 0 to 2 (confirmed; [quality](../../spec-items/quality/#c-shared-terms-and-magic-find)). A chest can also force a
quality on its drop; when the entry is gold or a potion, that item skips the quality roll and is then built as normal
quality anyway, because the always-normal rule of item creation overrides it (read from the code; elixirs are the
exception and keep the forced quality). The
chest side is on the [objects](../../world/objects/) page.

**Classic games differ.** In a classic game the walk uses only the classic weights, skips expansion-only entries,
and when it picks a throwable item (javelins, throwing potions and the like) it gives the pick back and picks again,
up to ten times per drop; from the eleventh throwable on, the pick becomes a Long Sword. The classic weights, the scan
and the throwable refund are confirmed in recorded classic games, and the bound of ten and the Long Sword in a run whose
treasure class was edited to name throwables only. That the test reads an item's first type, not its second, is read
from the code: no stock item tells the two apart. Skipping an expansion-only entry that comes before the chosen one
changes nothing with the stock tables (the same entry is chosen either way), and the rejection of expansion bases is
never reached with them; both are read from the code.

## More players, fewer empty picks

NoDrop shrinks as more players count for the kill. The game computes an effective player count:

- *party* is the killer plus the members of its party who are alive and anywhere **in the same
  [level](../../reference/glossary/)**, up to 8.
  There is no distance test: in a recorded two-player game a partied player counted at any distance in the killer's
  level, and not at all from another level. The project's notes record that community guides for 1.10/1.11 describe a
  "two screens" range; 1.14d does not use one.
- *n* = party + (all players in the game − party) ÷ 2, so players outside the party count half. For a monster, *n* is
  also capped by the monster's own [player-count](../../reference/glossary/) stat (`monster_playercount`).
- The `/players N` command raises the counted players to N if there are fewer; it does not add to them. A lone player
  with `/players 8` gets *n* = 1 + (8 − 1) ÷ 2 = 4.

When *n* is above 1, the new NoDrop is computed in floating point from the old one and the TC's total weight: with
r = NoDrop ÷ (NoDrop + total), p = rⁿ and q = 1 − p, the new NoDrop is (1 − q) × total ÷ q, truncated. It is
recomputed on every pick, from the unscaled NoDrop and the current TC's total.

Confirmed for a party of one (alone or with `/players 8`) and a party of two in a two-client game. A second two-client
run also confirmed that a dead party member is not counted, that a mercenary's kill counts its owner's party, and that
`/players` works on the host of a network game (the joiner's setting changes nothing), also for a host alone. The
monster's player-count cap applies only to monster drops, not to chests (confirmed); in the recorded games it never
lowered *n*. Read from the code only: three or more players, the cap at 8, and the chat parser taking `/players` only in
four client modes.

![Animation: items-tc-andariel-hell-8players](/illustrations/items-tc-andariel-hell-8players/tc.gif)

[Step through items-tc-andariel-hell-8players](../../illustrations/items-tc-andariel-hell-8players/index.html)

The same monster, difficulty, magic find and seed as the one-player drop, with a lone player and the game set to eight players. The counted players are n = 1 + (8 − 1) ÷ 2 = 4, so each pick of a TC with NoDrop is scaled before it is drawn: the stack row shows the table's NoDrop and the scaled one as ND 19->0 for Andariel's own TC, computed in floating point from the TC's NoDrop and total weight (TC § F). With NoDrop 0 the draw's range is the total alone, so no pick of that TC can be a NoDrop: in this walk two picks are NoDrop with one player and none with eight, and this drop reaches the monster drop's limit of six items (TC § D, § E, § H). Not modelled and not shown: the quest drop, gold amounts, base stats, the ethereal and socket rolls, automagic, and the properties' values. Seed: illustrative, an input of our own. Every value shown is computed by our model, not observed in the game.

## The quality roll and magic find

For an ordinary item the quality roll returns a [quality code](../../reference/glossary/): 1 low, 2 normal, 3 superior, 4 magic,
5 set, 6 rare, 7 unique. It draws 0 to 6 times on the source seed.

```mermaid
flowchart TD
  start["item picked"] --> nt{"type is always normal?<br/>gold, potions, gems, runes"}
  nt -->|"yes"| n2(("normal, no draw"))
  nt -->|"no"| u{"unique test"}
  u -->|"win"| u7(("unique"))
  u -->|"lose"| s{"set test"}
  s -->|"win"| s5(("set"))
  s -->|"lose"| r{"rare test, if the type allows rare"}
  r -->|"win"| r6(("rare"))
  r -->|"lose"| m{"always-magic type?<br/>rings, amulets, charms, jewels"}
  m -->|"yes"| m4(("magic"))
  m -->|"no"| mt{"magic test"}
  mt -->|"win"| m4
  mt -->|"lose"| hi{"superior test"}
  hi -->|"win"| h3(("superior"))
  hi -->|"lose"| no{"normal test"}
  no -->|"win"| n2b(("normal"))
  no -->|"lose"| l1(("low"))
```

**Which row.** The chances come from one `ItemRatio` row, chosen by two keys: whether the base is class-specific (its own
item type names a character class; a type with no class does not count) and whether it is an exceptional or elite
("uber") base. Both expansion and classic drops use the version-1 rows. The
project's notes record that the community description of 1.10 says classic games use the version-0 rows; in a recorded
classic game the version-1 rows reproduce every roll and the version-0 rows do not. Difficulty does not pick the row;
that is read from the code.

**One test.** With *d* = the item level minus the base's quality level, each of the unique,
set, rare and magic tests computes a number *c*:

1. *c* = (row value − *d* ÷ divisor) × 128. A higher item level relative to the base lowers *c*, which is better.
2. Magic find divides it: *c* = *c* × 100 ÷ factor.
3. *c* is raised to the row's minimum if it fell below it. This comes after magic find and before the ratio word, and
   recorded games confirm both the clamp and its place: the chance fell to the minimum in rare, set and magic tests, and
   the clamp decided the result of 138 rolls. No roll reached the unique test's minimum.
4. The TC's ratio word takes off its share: *c* = *c* − ratio × *c* ÷ 1024. A ratio of 1024 makes *c* zero.
5. If *c* is below 1 the test wins with no draw; otherwise one draw from 0 to *c* − 1 wins if it is below 128.

So a test wins with a chance of about 128 in *c*. The superior and the normal tests work the same way but with no
magic find, no minimum and no ratio word. Losing the normal test is the only way to get a low-quality item. Always-magic types still run the unique and set
tests, and the rare test if their type allows rare, with their draws, before they become magic.

![Animation: items-quality-lsd-mf200](/illustrations/items-quality-lsd-mf200/quality.gif)

[Step through items-quality-lsd-mf200](../../illustrations/items-quality-lsd-mf200/index.html)

The quality roll of one base item, code lsd, at item level 28 for a killer with magic find 200, with all four ratio words 0. The tests run in order, unique, set, rare, magic, and the first win ends the roll. Each test has a chance c: a base term from the item's ItemRatio row, (row value − d ÷ divisor) × 128, where d is the item level minus the base's quality level; magic find divides it, c × 100 ÷ F, where above magic find 10 F is diminished for the unique, set and rare tests (constants 250, 500 and 600) and is plain magic find + 100 for the magic test; then the row's minimum raises a lower c to it, and the ratio word takes off its share (§ C, § D). One draw from 0 to c − 1 wins below 128, and a c below 1 wins with no draw. Here the unique, set and rare draws are lost and the magic draw, 15, wins, so the superior and normal tests, which use the base term alone (§ E), are not reached; the resolver's next draw continues on the same seed. Not shown: the early returns, and the ItemRatio row's choice beyond its number. Seed: illustrative, an input of our own. Every value shown is computed by our model, not observed in the game.

**[Magic find](../../reference/glossary/) (MF)** is the killer's MF plus its owner's: a summon's kill counts the summoner's MF,
and a [mercenary](../../reference/glossary/)'s kill counts its own plus its player's, as does a Hydra's. These are confirmed in
recorded games.
Monsters can have owners too. Read from the code: the minions of a unique or superunique boss, and the MonStats
party minions of a leader whose `MonStats` row has `SetBoss`, have their leader as owner, so a minion's kill adds the
leader's MF while the leader is still in the game; a boss placed by the special-monster placement (a superunique, for
example) is its own owner, so when it is the killer its own MF counts twice. Also read from the code, these
monsters have an owner whose MF their kills add: a boss's escorts (the boss), tentacles (their spawner), formation
members (their leader; a leader owns itself), Baal's clone (Baal), Bone Wall and Bone Prison pieces, revived
monsters and monsters a missile spawns (the caster or the missile's owner), monsters raised by the `reanimate` item
property (the player the killer belongs to), and a monster restored from an inactive room (its saved owner).

That property (stock: the unique Tomb Reaver and the runeword Faith) is not a skill: on the kill of a monster that is
neither a champion nor a unique, it draws once on the killer's own seed against its value (10 % on both stock items)
and, when the draw passes, raises the dead monster for the player at the top of the killer's owner chain, so a pet or
a hireling that has it raises monsters for its player. Read from the code only. Whether any stock monster has MF at all is not checked. The factor is:

| Test | Factor with MF ≤ 10 | Factor with MF above 10 | At MF 100 |
|---|---|---|---|
| unique | 100 + MF | 100 + MF × 250 ÷ (MF + 250) | 171 |
| set | 100 + MF | 100 + MF × 500 ÷ (MF + 500) | 183 |
| rare | 100 + MF | 100 + MF × 600 ÷ (MF + 600) | 185 |
| magic | 100 + MF | 100 + MF | 200 |

The linear part up to MF 10 is what 1.14d does: the project's notes record that the 1.10/1.11 community formula has
no such branch, and the recorded games show the linear form. Negative MF, including the case at −100 or below that
skips straight to the superior test, was not exercised.

## Creating the item: seeds and base stats

The item is created with two draws from the game seed: one seeds the item as a world object (its unit seed), the
other gives the item seed its starting value, written as `{start, 666}`. The `start` number is kept; it comes back for
the socket count and every fallback.
That a drop's two seeds come from the game seed is confirmed on the drops of a recorded game, which logged the game
seed around each creation; that the item seed starts
at `{start, 666}` when the quality work begins is confirmed in every logged creation.

Before any quality work, the **base stats** are rolled on the unit seed:

- **Durability**: with base durability *d*, the current value is ⌊*d*/2⌋ plus a draw below ⌊*d*/2⌋, so it never equals
  *d*; the maximum is *d*. Bows and throwing potions draw too: the `nodurability` column is not tested here.
- **Defense** (armour): drawn from `minac` to `maxac` inclusive, after durability.
- **Quantity** (stackables): from `minstack` up to one below the top, so never the top value. Misc items like keys use
  `spawnstack` as the top (keys come with 1 to 5); quivers ignore it.
- **Gold**: ilvl plus a draw below 5 × ilvl.
- **Picture**: a draw for the types that have several pictures (`VarInvGfx`).

A rule that would set the quantity to 1 for magic and better items never fires on a drop, because the quality is
not yet set when these stats are rolled: a rare throwing weapon keeps its drawn quantity. Confirmed: the quality is 0
at that point in every logged creation, and five magic and rare throwing weapons of stock games kept their quantities.

## Uniques and sets

Item creation first applies four override rules (an always-magic type becomes at least magic, a type that cannot be
rare turns rare into magic, a base flagged unique becomes unique, an always-normal type becomes normal). For a drop
through the quality roll they never change anything, because the roll already respects them; a TC entry that forces
unique or set on an always-normal base would end normal. A survey of the stock bases shows which ones the rules
touch: seven bases are always magic (rings, amulets, jewels, the three charms, and the Viper Amulet, a quest base that the
unique rule then makes unique), and no quiver is,
since the two quiver types that are flagged always-magic have no base of their own; 153 bases of 30 types (potions,
gems, runes, scrolls, books, keys, gold, quivers, body parts, charms, quest items) cannot be rare; 18 bases (17 quest
items and the Standard of Heroes) are flagged unique; 121 bases of 24 types are always normal.
That the rules change nothing on a drop is confirmed, over every logged drop creation and, from the tables, for every
stock base a TC can hold. That they change only the item's quality, not the creation record's, is confirmed by two
quest items the unique rule made unique. Their order is read from the code: no creation had two rules writing.

**Unique.** The game lists every `UniqueItems` row that:

1. is not expansion-only in a classic game,
2. is enabled,
3. is for this exact base,
4. passes the ladder test,
5. has `lvl` at or below the item level.

It then makes **one weighted draw** on the item seed, each row weighted by its `rarity` (at least 1). Even a single
candidate costs that draw. The weights apply in classic games too; the project's notes record a community note saying
otherwise, which 1.14d does not follow.

Only after the pick does the game check the [made-uniques set](../../reference/glossary/): if the drawn row was already built in
this game, the whole build fails, with no re-pick. Every stock unique is marked when built, so in 1.14d each unique
can be built once per game. No stock row is exempt, and nothing on the drop path clears a mark: the set is cleared
only when a game is created, and the one other code that clears a mark is the cube's (both checked against the data
and every place in the code that touches the set; one routine that copies the whole set between two records is not
read yet). Ladder-only uniques drop in single player
and in a TCP/IP game, because the ladder test only excludes them when two game values are both 0, and which game type
(if any) has that is not known. The builder clears the identified flag of every unique (confirmed). Read from the
code, a quest unique is identified again right after, when its base stats are set; every stock quest base that can
be unique qualifies, which is checked against the data. `nolimit` plays no part in this; it only exempts a row from the
made-uniques set. Every way of building a unique goes through the one marking step, so a unique shown in a gamble
window is marked too.

**Set.** Set items are picked the same way from `SetItems`: the base must match, `lvl` must be at or below the item
level, and in a classic game expansion-only rows are skipped. Weight 0 counts as 1, which running the pick in an
emulator confirms. Also confirmed: a set item
takes its version from its set, so a classic game sees only the members of the 16 classic sets; there is no enabled,
ladder or once-per-game test for sets, so a set item can drop any number of times in a game (seen in a session with
edited quality odds); and the Cow King's set is never a candidate for a drop that does not come from a Hell Bovine.
That a Hell Bovine's drop can be a Cow King's item was not seen.

## When a unique or set cannot be made

A build fails when no row fits the base or when the drawn unique was already made. Then:

```mermaid
flowchart LR
  fu["failed unique"] --> d3["durability x3, cap 255"]
  fs["failed set"] --> d2["durability x2, cap 255"]
  d3 --> rare["rare"]
  rare -->|"fails"| magic["magic"]
  d2 --> magic
  magic -->|"fails"| sup["superior"]
  sup -->|"fails"| norm["normal"]
```

The durability step only touches bases that have durability. Before each fallback the item seed is reset to
`{start, 666}`, so the draw the failed builder made is thrown away and the fallback starts exactly where the unique or
set pick started. All of this is confirmed in recorded games: 39 failed uniques became rare and 47 failed sets became
magic, and a failed item keeps no unique or set row. No fallback rare or magic build of a failed unique or set ever
failed in a run. The steps further down use the same reset, which was seen on another path: cube outputs whose rare
build failed went to magic, failed again, and became superior, each step starting again from `{start, 666}`. A
superior step that fails, and so the last step to normal, is read from the code only. This is the [failed unique / failed
set](../../reference/glossary/) of the
glossary.

## Magic and rare items: affixes

Every affix pick compares rows with the item's **[alvl](../../reference/glossary/)** (affix level), not its item level. With *i* = the larger of ilvl and the base's quality
level *q*:

- bases with a `magic lvl` (staves, wands, orbs, circlets): alvl = *i* + `magic lvl`;
- all others: alvl = *i* − ⌊*q*/2⌋, or 2*i* − 99 once *i* reaches 99 − ⌊*q*/2⌋;
- then clamped to 1..99.

The project's notes record that the community rule "quality level up to ilvl + 2, uniform" describes only the
version-0 code path, which no drop reaches.

**One affix pick** always
starts with a coin draw: if its lowest bit is 0 and the pick is not forced to roll, the slot stays empty. Otherwise the
game keeps each row of the prefix or suffix table that is spawnable, allowed by version, has `level` ≤ alvl and
`maxlevel` ≥ alvl (0 = no limit), is allowed on a rare if the item is rare, fits the item type (none of its excluded
types, one of its included types), has a non-zero `frequency`, does not clash with the item type's class, and whose
`group` is not already on the item. Then one draw picks a row weighted by `frequency` (times `level` on `magic lvl`
bases). The draw runs over the total weight **plus one**, so the last candidate in table order gets one extra unit of
weight. A class-specific row is not kept off classless items by its class column; only its type list does that.

**Magic**: a prefix pick, then a suffix
pick that must roll when no prefix was set. When both tables have candidates the shares are a quarter both, a quarter
prefix only, a half suffix only. Each pick rolls its own property values before the next pick.

**Rare**:

1. The two [rare name](../../reference/glossary/) words come first, one uniform draw each over the `RarePrefix` and `RareSuffix`
   rows that fit the item type. They do not depend on the affixes.
2. The affix count: 3, 4, 5 or 6 with chances 1/8, 2/8, 3/8, 2/8. Rares have 3 to 6 affixes, not 2 to 6. Jewels get
   3 or 4 (confirmed on 21 rare jewels rebuilt by the cube).
3. For each slot, a coin picks prefix or suffix while both sides are open; a side closes after three affixes or when
   a pick finds no row, and the slot is then retried on the other side.
4. Only after all picks are the property values rolled, in the order prefix 1, suffix 1, prefix 2, suffix 2 and so on.

**Superior** picks a `QualityItems` row that fits the item type, redrawing rows it has already tried; throwables and
bases without durability use only the first four rows, which hold no durability bonus.
**Low quality** draws a `LowQualityItems` row (confirmed). It then cuts a weapon's damage to 75 % and sets the
maximum durability to 33 % of the base value (confirmed on one recorded item, in a session whose only edit was to the
quality odds), and an item that is neither weapon nor armour fails over to normal (confirmed once, in the cube). The
current durability is drawn off the item seed (confirmed); that it uses the unit seed, and the armour and throw-damage
cuts, are read from the code only. **Normal**
draws nothing for most bases.

**[Staff mods](../../reference/glossary/)**: every builder ends by giving an item whose type names a class in `StaffMods` up to three class skill bonuses. Where these draws sit in the order is confirmed, and the draws themselves are now reproduced on 105 recorded rolls; the bonus that some creation records add, and whether each threshold is "above" or "at least", are read from the code only. Each bonus gets up to 6 tries. A drawn skill is refused if the skill names an item type and the item is not of it, or if it repeats one of the skills already stored; a skill index out of range or without a record skips the type test and goes straight to the repeat test. If all 6 tries fail, the last skill drawn is written anyway but is not stored for later repeat tests; that fallback was never reached.

A magic build fails only if neither slot gets an affix, and a rare one if no name or no affix fits; both then fall back
one step with the seed reset. In a classic game, throwing weapons get no affix and no rare name at all: nine of them
rebuilt as rares by the cube failed for want of a name, and each magic fallback failed with no affix, as confirmed. A
rare failing for want of an affix happens with no stock item and is read from the code only.

## Property values

Once a row is chosen (a unique, a set item, an affix, a superior row), its property blocks are turned into stats on
the item seed. Each
[property block](../../reference/glossary/) names a `Properties` row and a `min` and `max`:

- `min` = `max` draws nothing. Most unique blocks are fixed, so they leave the seed alone.
- Otherwise one draw gives a value from `min` to `max` inclusive.
- A value of 0 writes nothing.
- Properties that set several stats at once (all resistances, all stats, elemental damage) draw once and reuse the
  value for each stat.
- **Enhanced defense** (`ac%`) also raises the base defense to `maxac` + 1 (and `maxac` + 2 after a second such block).
- **Superior is not "max".** The superior bonuses (attack rating, durability) roll like any other; the project's notes
  record that a later-era description says otherwise.
- **Charges** always draw once. For the magic suffixes the charge count grows with the skill level, which comes from
  the item level.
- Per-level properties store their raw value; the per-level value is not computed at creation.
- A set item's extra bonus blocks (`aprop`) are rolled at creation like the others.

The random-skill property (*Ormus' Robes*) puts the drawn number in the skill slot and the block's fixed value in the
level, and the ethereal property makes a not-yet-ethereal item with durability ethereal, with no draw; both are
confirmed on drops from a treasure class edited to name those uniques. The ethereal property's two skips (an item
already ethereal, or one without durability), the random class skill, and two more kinds were not reached in any run
and are read from the code only. The damage-percent property's fallback (+1 maximum damage when the percentage of a
small weapon rounds to 0) is confirmed on drops of runs with edited quality odds.

## Ethereal, sockets and automagic

After the builder, three more steps run on the item seed, in this order:

1. **[Ethereal](../../reference/glossary/)** (expansion games only): a weapon or armour with durability, not low quality, not a set
   item and not a quest item, draws 0..99 and becomes ethereal below 5. Damage or defense goes ×3/2 and maximum
   durability becomes ⌊max/2⌋ + 1. Uniques can be ethereal; set items never are, but a failed set (now magic) can be.
2. **Sockets** (normal and superior quality only; a low-quality item fails the first test): the base must allow
   sockets (`hasinv`) and not stack. A draw 0..99 below 33 makes the item socketed. The number of sockets is **not**
   drawn: it is `start` mod cap + 1, where `start` is the item seed's starting value and cap is the smallest of the
   base's `gemsockets`, the type's maximum for the item level (`MaxSock1` up to ilvl 25, `MaxSock25` up to 40,
   `MaxSock40` above) and 3, 4 or 6 for Normal, Nightmare or Hell. All 29 socketed drops of the runs had that count.
   Classic body armour makes no socket draw at all, as ten recorded classic drops confirm.
3. **[Automagic](../../reference/glossary/)** (expansion games only, not set or unique): a base whose `auto prefix` names a group
   (class items such as orbs) gets one affix from `AutoMagic`, picked like any affix with the same alvl. It always
   spends its coin draw. That set items skip it was seen once, in a session with edited quality odds; that unique items
   skip it, and that it does not check `spawnable`, are read from the code; every stock automagic row is spawnable, so
   the last point cannot show in a normal game.

A TC can also hand the item two flags that force the outcome of the first two steps: one makes the ethereal roll
succeed, the other replaces the socket draw by 0 so that sockets are always added. These flags come only from TC
modifiers that exist in classic games (where the ethereal roll does not run, so the ethereal one has no effect at all)
or from a field the stock tables leave at zero, so no stock drop uses them. All of this is read from the code.

An item with an `ethereal` property can in principle be made ethereal a second time by the roll (a second ×3/2 and
halved durability); this was not reached in a run.

## Worked examples

All numbers below are copied from the specs' worked examples, which were checked against recorded games.

**A treasure-class walk**. An expansion Normal game,
a plain monster, item level 1, a lone player, so NoDrop stays 100:

| TC | Picks, NoDrop, total | Draw | Result |
|---|---|---|---|
| `Act 1 H2H A` | 1, 100, 60 | 128 of 160 | 128 − 100 = 28 → `Act 1 Equip A` |
| `Act 1 Equip A` | 1, 0, 14 | 0 of 14 | `weap3` |
| `weap3` | 1, 0, 27 | 9 of 27 | `ssd` |

The quality roll returned 1 (low), and one item was created. Three other calls of the same recorded game rolled below
100 and dropped nothing. In TC worked example 2, the same game's unique monster walks `Act 1 Unique A` (`Picks = −3`)
with no draws for its three picks, and drops five items: a magic `ssd` (its ratio words `1024,800,800,800` reached the
quality roll through two plain sub-TCs) and four potions.

**NoDrop with `/players 8`**: for NoDrop 100 and total 60
at *n* = 4, r = 0.625, rⁿ = 0.152587890625, and NoDrop becomes **10**; every pick then draws over 70 instead of 160.

**Magic find 100**. Expansion Nightmare,
a `pil` (quality level 10) at item level 49, so *d* = 39:

| Test | *c* before MF | Factor | *c* | Draw | Outcome |
|---|---|---|---|---|---|
| unique | 46208 | 171 | 27022 | 11932 | lose |
| set | 18048 | 183 | 9862 | 817 | lose |
| rare | 10368 | 185 | 5604 | 4306 | lose |
| magic | 2688 | 200 | 1344 | 1185 | lose |
| superior | 1024 | — | 1024 | 550 | lose |
| normal | −2176 | — | −2176 | none | normal, no draw |

With a plain linear factor of 200 the unique chance would have been 23104, the first draw 12, and the game would have
made a unique it did not make: one of the rolls that settle the diminishing-returns formula.

**A unique already made**.
A classic Nightmare `brs` at item level 52, in a test run with edited quality odds, has one candidate, row 86
`Venomsward`, which was already built earlier in the game. The pick still draws (and gets row 86), the made test fails,
durability goes ×3 (34 and 50 become 102 and 150), the item seed is reset to its starting value, and the item is built
as a rare instead.

**One orb, from affixes to automagic**. Expansion Normal, a sorceress orb `ob1` (quality
level 1, `magic lvl` 1, `auto prefix` 303), item level 1, magic:

| Step | Draws | Result |
|---|---|---|
| alvl | — | max(1, 1) + 1 = 2 |
| prefix coin | 1 | lowest bit 1: roll a prefix |
| prefix pick | 1 | 7 candidates, total weight 20, draw 5 of 21 → *Lizard's* |
| suffix coin | 1 | lowest bit 1: roll a suffix |
| suffix pick | 1 | 2 candidates (both *of Energy*), weight 8, draw 4 of 9 → the second one |
| staff mods | taken from the recording in that check; the model now predicts it | class 1 |
| ethereal roll | (logged) | magic gets no socket roll |
| automagic coin | 1 | ignored |
| automagic pick | 1 | one candidate, *of the Jackal*, weight 6, draw 5 of 7 → chosen |

The prefix walk shows the weights: *Glimmering* 1 (5 → 4), *Septic* 3 (4 → 1), *Lizard's* 4 (1 → −3, chosen). The two
*of Energy* rows share a group, so they can both be candidates until one of them is on the item.

**A socketed normal weapon**.
Expansion Hell, `flb`, item level 81, normal quality: durability 50 gives a current value of 25 + 21 = 46; the normal
builder draws nothing; the ethereal draw is 23 (not below 5); the socket cap is 5 and the socket draw is 24 (below 33),
so it is socketed with `start` mod 5 + 1 = **1** socket.

## Other ways to get an item

Vendors, gambling, the Horadric Cube and quest rewards reach the same builders by other paths; they, socketing and
[runewords](../../reference/glossary/) are explained on [Other ways to make an item](../items-other-paths/).

## What is not known yet

The main flow above is confirmed in recorded games. These parts are not, or are still open:

- **Treasure classes**: parties of three or more and the
  cap at 8; the superunique-before-champion order and `Picks = 0` (no stock case); the classic ratio raises and a TC
  entry naming a unique (`Annihilus`), which only edited tables reach; the floating-point precision under other game
  types or renderers; game type 1; the quest TC for a kill through an `exp` state or by a party member, and for
  Mephisto, Diablo and Baal after their quest is done; and whether any monster skips the death
  drop beyond the lower bound above. The two "upgrade" bits a TC can set turned out, by the code, to force the item
  ethereal and force sockets; no stock data
  sets them.
- **Quality**: Hell, negative magic find,
  games of three or more players (with two, the magic find is the killer's alone), a monster killer with no player owner, an object or missile killer, and the unique-only base and quest-item early returns.
- **Uniques and sets**: the fallback
  chain past its first step when it starts from a failed unique or set, and a failing superior step; a unique-only
  base with no row; a quest base skipping the made test; the Cow King's set
  from a Hell Bovine; which game type, if any, excludes ladder uniques.
- **Affixes**: the socket test on affixes, a rare
  with names but no affix, charms reaching the normal builder, the low-quality armour and throw-damage cuts, automagic on unique items
  (set items skip it, seen once with edited quality odds), and a forced affix that fails a test other than the level
  window (no stock recipe has one). Which text a rare name id is shown as is answered on the
  [game data](../../foundations/game-data/) page, with the name line.
- **Properties**: several property kinds
  never reached (among them the one *Tomb Reaver* carries, which needs a Hellforge drop in Hell), the type-11 setup,
  the second ethereal, and the exact
  rounding of a superior ethereal item with a durability bonus, where the code and a community page disagree (for
  maximum 38 and 15 %: 23 by the code, 22 by the page). No recorded item has settled it.

## Where to read more

- The specs: [treasure classes](../../spec-items/tc/#purpose), [quality](../../spec-items/quality/#purpose),
  [uniques and sets](../../spec-items/uniques-sets/#purpose), [affixes](../../spec-items/affixes/#purpose),
  [base stats and properties](../../spec-items/properties/#purpose).
- The [glossary](../../reference/glossary/) for every D2 term used here.
- Related pages: [randomness](../../foundations/randomness/) for the seeds, [monsters](../../world/monsters/) for monster kinds and levels,
  [objects](../../world/objects/) for chests, [other ways to make an item](../items-other-paths/), [using items and the inventory](../inventory/) for what happens to an item after it is made, [saves](../../characters/saves/) for how an
  item is stored, and [how we know](../../reading-the-tags/) for what "confirmed" means here.
