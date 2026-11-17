---
title: "Overview"
sidebar:
  order: 1
---

This site describes how Diablo II: Lord of Destruction, version 1.14d for the PC, works inside: how it builds its
levels, which monsters it places in them, how it decides what an item drop is, and how the running game moves,
fights and saves. It is written for people who want to understand the game closely enough to rebuild its logic,
with the same random draws in the same order and the same arithmetic.

It is an unofficial preservation project. It holds no game files, art, text dumps or code: every page describes
behaviour in our own words. See [About](about/).

## What is here

The topic pages and a glossary, in plain prose with small worked numbers, tables and diagrams. Each page says in
words how sure we are of what it states; [How to read the tags](reading-the-tags/) explains the wording.

Some pages mention the project's detailed specifications. Those are not part of this site yet, so the mentions are
plain text without a link. This site is also a simplified edition: where a passage could not be published as written,
it was left out. [About](about/) says what that means, and how the diagrams and animations are drawn.

## Where to start

Read [Randomness](foundations/randomness/) first: nearly every other page depends on it. Then follow the groups in
order, or jump to the topic you need. The [Glossary](reference/glossary/) explains the terms.

### Foundations

- [Randomness: one seed per thing](foundations/randomness/)
- [Game data, tables, strings and formulas](foundations/game-data/)

### Building the world

- [How a level is built](world/levels/)
- [Monsters](world/monsters/)
- [Objects: shrines, chests, barrels and the rest](world/objects/)

### Items

- [How an item drops](items/items/)
- [Items that do not come from a monster drop](items/items-other-paths/)
- [Prices, repair, gold and wear](items/economy/)
- [Using items, and the inventory](items/inventory/)

### Characters and combat

- [Characters and hirelings](characters/characters/)
- [Combat](characters/combat/)
- [Stats and states](characters/stats-and-states/)
- [Skills and missiles](characters/skills/)
- [Saves: what a `.d2s` file holds](characters/saves/)

### The running game

- [Quests and travel: how a character moves through the acts](running/quests/)
- [Seed to world: how a game is built](running/seed-to-world/)
- [Animation and timing](running/animation/)
- [Pathing](running/pathing/)
- [Monster AI](running/monster-ai/)
- [The server frame](running/server-frame/)

### Reference

- [Quirks: the traps a faithful rebuild must keep](reference/quirks/)
- [Glossary](reference/glossary/)
