"use client";

import React from "react";
import SlotsEngine from "./SlotsEngine";
import { lootTumbleGame } from "./lootTumbleConfig";

const LootTumble: React.FC = () => {
    return <SlotsEngine game={lootTumbleGame} />;
};

export default LootTumble;
