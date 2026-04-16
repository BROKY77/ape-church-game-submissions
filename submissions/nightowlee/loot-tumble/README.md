# Loot Tumble

Loot Tumble is a treasure-themed cluster-pays slot adapted from the Ape Church game template for the current submissions flow.

## Overview

- Game Type: Slots / Cluster-pays
- Team: `nightowlee`
- Supports Rewatch: Yes
- Supports Bonus Round: Yes
- Supports Turbo / Auto Spin: Yes

## Core Gameplay

- Match `5+` touching regular symbols anywhere on the grid
- Winning clusters tumble away and can chain into additional cascades
- `3` touching scatter symbols trigger a free-spin bonus round
- Bonus spins can retrigger and can add multiplier symbols to the resolved win
- Finished sessions can be replayed from recorded spin outcomes

## Submission Layout

- Game components: `components/games/loot-tumble/`
- Assets: `public/submissions/loot-tumble/`
- Metadata: `submissions/nightowlee/loot-tumble/metadata.json`

## Review Notes

- Main entry component: `LootTumble.tsx`
- Submission config: `lootTumbleConfig.ts`
- Assets use MP3, PNG, and WebP only
- Loading and rules screens are handled inside `SlotsEngineWindow.tsx`
