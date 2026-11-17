---
title: "Player: new character, experience and level-up"
sidebar:
  order: 1
---

## Purpose

This subsystem specifies what a single-player character starts with and how it grows: the stub a new character
begins as, the attributes, skills and items the server gives it (with every game-seed step), the experience table, the
experience a kill is worth, and the level-up. This page is the map; the claims, with their tags, are in the file below.

## Files

| File | Covers |
|---|---|
| [creation.md](../creation/) | the stub and its checks, `NewCharFromStub` in order, starting values per class, starting skills, starting items (creation record, draws, belt / equip / inventory placement), the experience table, the credit and `XP_Compute` (§ G), `PLAYER_AddExperience`, `PLAYER_LevelUp`, the `-act` grant, party share (§ J4: the distance is to the killed monster), death loss, attribute spending |
| [party.md](../party/) | who is credited and who shares a kill, how much each gets, and every player-count reader with its input (the monster's frozen stat 100 or the current count), each rule restated with its tag and a link |

## Upstream and downstream

- Upstream: [rng](../../spec-rng/overview/) and [rng/seeds](../../spec-rng/seeds/) (the game seed and unit seeds), the item model
 for each starting item, [monsters/stats](../../spec-monsters/stats/) for a monster's
  experience; the experience arithmetic of a kill is [creation § G](../creation/#g-kill-experience--xp_compute), and a
  party's share of it [creation § J](../creation/#j-other-level-and-experience-changes), composed in [party.md](../party/).
- Downstream: [save/d2s](../../spec-save/d2s/) writes the first save of a new character.
