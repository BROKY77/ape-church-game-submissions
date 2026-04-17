import { Game } from "@/lib/games";

export const foxyShooterGame: Game = {
    title: "Foxy Shooter",
    description: "Can you score against Foxy the goalkeeper? Roll the dice and try to find the gap in the defense!",
    gameAddress: "0x1234567890123456789012345678901234567890",
    gameBackground: "/submissions/foxy-shooter/background.png",
    card: "/submissions/foxy-shooter/card.png",
    banner: "/submissions/foxy-shooter/banner.png",
    themeColorBackground: "#4AADE8",
    song: "/submissions/foxy-shooter/audio/song.mp3",
    // Payouts structure: key[die1-1][die2-1][0] = multiplier * 10000
    // We encode multipliers for each dice combination based on their sum
    // Sum 2 (1+1): 5.0x, Sum 3: 3.0x, Sum 4: 2.5x, Sum 5: 2.0x, Sum 6: 1.8x, Sum 7: 1.2x
    // Sum 8: 1.8x, Sum 9: 2.0x, Sum 10: 2.5x, Sum 11: 3.0x, Sum 12 (6+6): 5.0x
    payouts: {
        0: {
            0: { 0: 50000 }, // 1+1=2, 5.0x
            1: { 0: 30000 }, // 1+2=3, 3.0x
            2: { 0: 25000 }, // 1+3=4, 2.5x
            3: { 0: 20000 }, // 1+4=5, 2.0x
            4: { 0: 18000 }, // 1+5=6, 1.8x
            5: { 0: 12000 }, // 1+6=7, 1.2x
        },
        1: {
            0: { 0: 30000 }, // 2+1=3, 3.0x
            1: { 0: 25000 }, // 2+2=4, 2.5x
            2: { 0: 20000 }, // 2+3=5, 2.0x
            3: { 0: 18000 }, // 2+4=6, 1.8x
            4: { 0: 12000 }, // 2+5=7, 1.2x
            5: { 0: 18000 }, // 2+6=8, 1.8x
        },
        2: {
            0: { 0: 25000 }, // 3+1=4, 2.5x
            1: { 0: 20000 }, // 3+2=5, 2.0x
            2: { 0: 18000 }, // 3+3=6, 1.8x
            3: { 0: 12000 }, // 3+4=7, 1.2x
            4: { 0: 18000 }, // 3+5=8, 1.8x
            5: { 0: 20000 }, // 3+6=9, 2.0x
        },
        3: {
            0: { 0: 20000 }, // 4+1=5, 2.0x
            1: { 0: 18000 }, // 4+2=6, 1.8x
            2: { 0: 12000 }, // 4+3=7, 1.2x
            3: { 0: 18000 }, // 4+4=8, 1.8x
            4: { 0: 20000 }, // 4+5=9, 2.0x
            5: { 0: 25000 }, // 4+6=10, 2.5x
        },
        4: {
            0: { 0: 18000 }, // 5+1=6, 1.8x
            1: { 0: 12000 }, // 5+2=7, 1.2x
            2: { 0: 18000 }, // 5+3=8, 1.8x
            3: { 0: 20000 }, // 5+4=9, 2.0x
            4: { 0: 25000 }, // 5+5=10, 2.5x
            5: { 0: 30000 }, // 5+6=11, 3.0x
        },
        5: {
            0: { 0: 12000 }, // 6+1=7, 1.2x
            1: { 0: 18000 }, // 6+2=8, 1.8x
            2: { 0: 20000 }, // 6+3=9, 2.0x
            3: { 0: 25000 }, // 6+4=10, 2.5x
            4: { 0: 30000 }, // 6+5=11, 3.0x
            5: { 0: 50000 }, // 6+6=12, 5.0x
        },
    },
};
