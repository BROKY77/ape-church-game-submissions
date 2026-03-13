# Loot Tumble

Loot Tumble is a treasure-themed cluster-pays slot built on the Ape Church game template flow and adapted for the submissions repository layout.

## Overview

- Game Type: Slots / Cluster-pays
- Team: `nightowlee`
- Supports Rewatch: Yes
- Supports Bonus Round: Yes
- Supports Turbo / Auto Spin: Yes

## Core Gameplay

- Match `5+` touching regular symbols to score wins
- Winning symbols collapse and cascade new symbols into the grid
- `3` touching scatter symbols trigger the bonus round
- Bonus round awards free spins and allows scatter retriggers
- Bonus-only multiplier symbols add together and apply to the final symbol win of that spin

## Features

- Cluster-based payouts with cascading chain reactions
- Bonus stage transition with dedicated bonus board visuals
- Bonus retrigger popups and premium bonus symbol effects
- Rewatch of the finished session using recorded spin outcomes
- Separate `Music` and `SFX` mute controls from the submission shell
- Hidden angry-bird easter egg on rapid parrot taps

## Controls

- `Place Your Bet`
- `Spin`
- `Auto`
- `Turbo`
- `Rewatch`
- `Music` and `SFX` mute buttons
- In-game `Info` button

## Submission Layout

- Game components: `components/games/loot-tumble/`
- Assets: `public/submissions/loot-tumble/`
- Metadata: `submissions/nightowlee/loot-tumble/metadata.json`

## Review Notes

- Main entry component for the submissions app is `LootTumble.tsx`
- Game config is in `lootTumbleConfig.ts`
- Assets use MP3/WebP/PNG only; no WAV files are included

## Submitter Contact

- Author: `Nightowlee`
- Telegram: `@nightowlee`
