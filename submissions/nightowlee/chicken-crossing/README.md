# Chicken Crossing

Chicken Crossing is a lane-based risk game built on the Ape Church game template.
Players advance one lane at a time to increase multiplier, then cash out before crashing.

## Overview

- Game Type: Arcade / Risk progression
- Template Base: `ape-church-game-template`
- Supports Rewatch: Yes (local deterministic rewatch of last round)
- Supports State Advance: Yes (`Jump`, trap-click, and `Auto Jump`)

## Core Gameplay

- Place a bet and choose difficulty (`Easy`, `Medium`, `Hard`, `Expert`)
- Jump lane-by-lane to increase multiplier
- Cash out at any time before crashing
- Crash outcomes use two visual presentations:
  - vehicle hit
  - sewer trap fall

## Features

- Deterministic round outcome generation from seeded game id
- Difficulty-calibrated multiplier ladders
- Rewatch of the previous round without placing a new bet
- Separate audio controls for `Music` and `SFX`
- Optional `Auto Jump` toggle
- Mobile and desktop responsive layout

## Controls

- `Place Your Bet`
- `Jump`
- `Cashout`
- Click next lane trap/manhole to advance
- `Auto Jump` toggle
- `Music` and `SFX` toggles

## Assets

- Game assets: `public/submissions/chicken-crossing/`
- Audio assets: `public/submissions/chicken-crossing/audio/`
- Required listing assets included:
  - `card.png`
  - `banner.png`

## Notes for Review

- Built as a game-specific implementation under `components/games/chicken-crossing/`
- Shared template engine components were kept as the base
- Repo-wide lint may include template/example file warnings; chicken-game path lint passes

## Submitter Contact

- Author: `Nightowlee`
- Telegram: `@Nightowlee`
