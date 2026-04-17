import { Game } from "@/lib/games";

export const myGame: Game = {
    title: "Crash or Cash Out",
    description: "Watch the multiplier climb! Cash out before the rocket crashes to win. The longer you wait, the higher the multiplier - but one wrong moment and you lose everything!",
    gameAddress: "0x1234567890123456789012345678901234567890",
    gameBackground: "/submissions/crash-or-cash-out/background.svg",
    card: "/submissions/crash-or-cash-out/card.png",
    banner: "/submissions/crash-or-cash-out/banner.png",
    advanceToNextStateAsset: "/submissions/crash-or-cash-out/advance-button.png",
    themeColorBackground: "#dc2626",
    song: "/submissions/crash-or-cash-out/audio/song.mp3",
    payouts: {
        0: { 0: { 0: 0 } },
    },
};
