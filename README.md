# Ape Church Game Submissions

This repository is the **intake and preview platform** for games built by Ape Church partners. Submitted games are reviewed here and, once approved, manually integrated into the live platform.

You can browse all submitted games at **[submissions.ape.church](https://submissions.ape.church)** *(update with your Vercel URL)*.

---

## Before You Start

You will need:
- A GitHub account
- Your game built using the official game template
- All assets compressed and ready (WebP or PNG, MP3 or OGG — no WAV files)

Game template: **[ape-church-game-template](https://github.com/ape-church/ape-church-game-template)**

---

## Submission Flow

### Step 1 — Build your game using the template

Go to the game template repository and click **"Use this template"** → **"Create a new repository"**. This creates a clean copy in your GitHub account.

Build your game inside the template. The files you will submit are:

```
components/games/your-game-name/     ← your game components
public/submissions/your-game-name/   ← your game assets
```

Follow all lifecycle and structure requirements in the template README before submitting.

---

### Step 2 — Fork this repository

Fork `ape-church-game-submissions` into your GitHub account. Your PR will come from this fork.

---

### Step 3 — Add your game files

In your fork, add exactly these files — nothing else:

```
components/
  games/
    your-game-name/
      YourGame.tsx
      YourGameWindow.tsx
      YourGameSetupCard.tsx
      yourGameConfig.ts       ← optional, for game configuration constants
      ... (any other game components)

public/
  submissions/
    your-game-name/
      card.png          ← REQUIRED, 1:1 aspect ratio (e.g. 512x512)
      banner.png        ← REQUIRED, 2:1 aspect ratio (e.g. 1024x512)
      ... (other assets)

submissions/
  your-team-name/
    your-game-name/
      metadata.json   ← REQUIRED, see schema below
```

> **One game per PR.** Do not include files from multiple games in a single pull request.

---

### Step 4 — Fill out metadata.json

Every submission requires a `metadata.json` file. Copy this template and fill in every field:

```json
{
  "team": "your-team-name",
  "gameName": "your-game-name",
  "displayTitle": "Your Game Title",
  "description": "A short description of your game. Three sentences max.",
  "authors": [
    {
      "name": "Your Name",
      "telegram": "your_telegram_username"
    }
  ],
  "status": "pending",
  "category": "arcade",
  "tags": ["arcade", "example"],
  "thumbnail": "/your-game-name/card.png",
  "banner": "/your-game-name/banner.png",
  "mainComponent": "YourGame.tsx",
  "windowComponent": "YourGameWindow.tsx",
  "setupComponent": "YourGameSetupCard.tsx",
  "configFile": "yourGameConfig.ts",
  "version": "1.0.0",
  "submittedAt": "YYYY-MM-DD"
}
```

**Field notes:**
- `team` and `gameName` must be kebab-case and match your folder names exactly
- `category` must be one of: `arcade`, `card`, `puzzle`, `strategy`, `other`
- `thumbnail` must be `/your-game-name/card.png`
- `banner` must be `/your-game-name/banner.png`
- `status` must be `"pending"` on submission — do not change this
- `submittedAt` must be the date you open your PR in `YYYY-MM-DD` format
- Do **not** include `approvedAt` — this is set by maintainers upon approval

---

### Step 5 — Open a Pull Request

Open a PR from your fork to the `main` branch of this repository.

**PR title format:** `[Team Name] Game Name` — e.g. `[Balloons] Ape Strong`

When you open the PR, automated checks will run immediately. All checks must pass before your submission will be reviewed. If a check fails, the error message will tell you exactly what to fix.

---

## Review Process

1. Automated checks run on your PR — fix any failures before waiting for review
2. Our team reviews your code and leaves feedback directly on the PR
3. Make any requested changes in your fork — the PR updates automatically
4. Once approved, our team merges the PR and your game appears on the preview site
5. Approved games are manually integrated into the live platform

> Merging a PR does not guarantee production deployment. Approval and live launch are separate steps.

---

## Do Not Include

The following will cause your PR checks to fail:

- `package.json`, `package-lock.json`
- `next.config.ts` or `next.config.js`
- `tsconfig.json`
- Any files in `app/`, `lib/`, or `components/games/shared/`
- `.wav` audio files (use MP3 or OGG)

---

## Questions or Issues

If you have questions while building or run into submission issues:

- **Email:** [ministry@ape.church](mailto:ministry@ape.church)
- **Telegram:** [https://t.me/+wgoE4TSxxcM5Njdh](https://t.me/+wgoE4TSxxcM5Njdh)
- **Discord:** [https://discord.gg/3Jxeeqt59W](https://discord.gg/3Jxeeqt59W)

When reaching out, include your PR link and a description of the issue.