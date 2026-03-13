import React from 'react';
import { X } from 'lucide-react';
import { SYMBOLS } from '@/components/games/loot-tumble/config/symbols';
import { SYMBOL_IMAGES } from '@/components/games/loot-tumble/config/symbol-icons';
import { GAME_CONFIG } from '@/components/games/loot-tumble/config/game-config';

interface GameInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GameInfoModal: React.FC<GameInfoModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const regularSymbols = SYMBOLS.filter(symbol => symbol.kind === 'regular');
    const getPayout = (tier: number, sizePayout: number) => {
        const tierMultiplier = 9 - tier;
        return (1 * sizePayout * tierMultiplier).toFixed(2);
    };

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm cursor-pointer" onClick={onClose}>
            <div
                className="w-full max-w-2xl max-h-full flex flex-col bg-[#E6D5B8] text-[#4A3219] rounded-xl shadow-2xl overflow-hidden cursor-default relative border-4 border-[#8B5E34]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b-2 border-[#8B5E34]/30 bg-[#D4B384]">
                    <h2 className="text-2xl font-black shrink-0 font-roboto uppercase tracking-wider">Game Information</h2>
                    <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar font-roboto space-y-6">
                    <div>
                        <h3 className="text-lg font-bold mb-2">Cluster Pays</h3>
                        <p className="text-sm leading-relaxed mb-2">
                            Match <strong>5 or more identical regular symbols</strong> anywhere on the grid by touching up, down, left, or right.
                        </p>
                        <p className="text-sm leading-relaxed">
                            Winning symbols tumble away, new symbols fall in, and chain reactions can keep paying on the same spin.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold mb-3">Paytable (Based on 1 APE Bet)</h3>
                        <div className="bg-[#D4B384]/40 rounded-lg border-2 border-[#8B5E34]/20 overflow-hidden">
                            <div className="grid grid-cols-5 text-xs md:text-sm font-bold p-3 border-b-2 border-[#8B5E34]/20 bg-[#D4B384]/60">
                                <div className="col-span-1">Symbol</div>
                                <div className="col-span-1 text-center">5+</div>
                                <div className="col-span-1 text-center">8+</div>
                                <div className="col-span-1 text-center">12+</div>
                                <div className="col-span-1 text-center">15+</div>
                            </div>

                            {regularSymbols.map((symbol, index) => (
                                <div
                                    key={symbol.id}
                                    className={`grid grid-cols-5 items-center p-2 md:p-3 text-xs md:text-sm font-medium ${index !== regularSymbols.length - 1 ? 'border-b border-[#8B5E34]/10' : ''}`}
                                >
                                    <div className="col-span-1 flex items-center justify-center md:justify-start">
                                        <img src={SYMBOL_IMAGES[symbol.id]} alt={symbol.name} className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-md" />
                                    </div>
                                    <div className="col-span-1 text-center">{getPayout(symbol.tier ?? 8, 2)} APE</div>
                                    <div className="col-span-1 text-center">{getPayout(symbol.tier ?? 8, 8)} APE</div>
                                    <div className="col-span-1 text-center">{getPayout(symbol.tier ?? 8, 30)} APE</div>
                                    <div className="col-span-1 text-center font-bold text-[#b45309]">{getPayout(symbol.tier ?? 8, 100)} APE</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold">Scatter Symbol - Bonus Trigger</h3>
                        <div className="bg-[#D4B384]/30 rounded-lg border-2 border-[#8B5E34]/20 p-4 flex gap-4 items-center">
                            <div className="shrink-0">
                                <img src={SYMBOL_IMAGES.scatter} alt="Scatter Symbol" className="w-16 h-16 object-contain drop-shadow-md" />
                            </div>
                            <div>
                                <p className="text-sm leading-relaxed">
                                    Land <strong>{GAME_CONFIG.bonus.triggerScatterCount} touching Scatter symbols</strong> on the settled grid to trigger the Bonus Round with <strong>{GAME_CONFIG.bonus.entryFreeSpins} Free Spins</strong>.
                                </p>
                                <p className="text-sm leading-relaxed mt-2">
                                    Scatters can appear during tumbles to trigger the bonus. During the Bonus Round, another group of {GAME_CONFIG.bonus.triggerScatterCount} touching scatters awards <strong>{GAME_CONFIG.bonus.retriggerFreeSpins} extra free spins</strong>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold">Multiplier Symbol - Bonus Exclusive</h3>
                        <div className="bg-[#D4B384]/30 rounded-lg border-2 border-[#8B5E34]/20 p-4 flex gap-4 items-center">
                            <div className="shrink-0">
                                <img src={SYMBOL_IMAGES.multiplier} alt="Multiplier Symbol" className="w-16 h-16 object-contain drop-shadow-md" />
                            </div>
                            <div>
                                <p className="text-sm leading-relaxed">
                                    Multiplier symbols only appear during the Bonus Round and can display <strong>{GAME_CONFIG.bonus.multiplierValues.map(value => `${value}x`).join(', ')}</strong>.
                                </p>
                                <p className="text-sm leading-relaxed mt-2">
                                    At the end of each bonus spin, all multiplier values on the settled grid are added together and applied to that spin&apos;s symbol win.
                                </p>
                                <p className="text-sm leading-relaxed mt-2">
                                    Multipliers do not pay by themselves. If the spin has no regular symbol win, the multiplier total does not award anything on its own.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t-2 border-[#8B5E34]/30 bg-[#D4B384]">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-[#8B5E34] hover:bg-[#6c4827] text-white font-bold rounded-lg transition-colors text-lg shadow-md hover:shadow-lg active:scale-[0.98]"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

