import React from "react";

interface EnvironmentProps extends React.SVGProps<SVGSVGElement> {
    type: "bush" | "lightpost" | "fire_hydrant" | "trash_can" | "bench" | "grate" | "barrier";
}

const EnvironmentSVG: React.FC<EnvironmentProps> = ({ type, className = "", style, ...props }) => {

    if (type === "bush") {
        return (
            <svg
                viewBox="0 0 100 100"
                className={`w-full h-full ${className}`}
                style={{
                    filter: "drop-shadow(0px 8px 6px rgba(0,0,0,0.3))",
                    overflow: "visible",
                    ...style
                }}
                {...props}
            >
                {/* Base Shadow */}
                <ellipse cx="50" cy="85" rx="40" ry="10" fill="#0F212E" opacity="0.6" />

                {/* Back/Darker Bush Layer */}
                <path d="M 25 70 C 15 70, 10 55, 25 50 C 20 40, 35 30, 45 40 C 50 20, 70 25, 65 45 C 80 40, 85 55, 75 65 C 90 70, 85 85, 65 85 C 65 85, 30 85, 25 85 Z" fill="#1A2C38" />

                {/* Mid Bush Layer */}
                <path d="M 30 75 C 20 70, 25 55, 35 55 C 35 45, 50 40, 60 45 C 70 40, 80 50, 75 65 C 85 70, 75 80, 65 82 C 65 82, 35 82, 30 75 Z" fill="#213743" />

                {/* Highlights */}
                <path d="M 40 50 C 45 45, 50 45, 55 50" stroke="#2F4553" strokeWidth="4" strokeLinecap="round" fill="none" />
                <path d="M 65 60 C 68 57, 72 57, 75 60" stroke="#2F4553" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 28 65 C 32 62, 36 62, 38 65" stroke="#2F4553" strokeWidth="3" strokeLinecap="round" fill="none" />
            </svg>
        );
    }

    if (type === "lightpost") {
        return (
            <svg
                viewBox="0 0 100 200"
                className={`w-full h-full ${className}`}
                style={{
                    filter: "drop-shadow(0px 8px 6px rgba(0,0,0,0.4))",
                    overflow: "visible",
                    ...style
                }}
                {...props}
            >
                {/* Base Shadow */}
                <ellipse cx="50" cy="190" rx="20" ry="6" fill="#0F212E" opacity="0.8" />
                {/* Base */}
                <path d="M 35 190 L 65 190 L 60 170 L 40 170 Z" fill="#213743" />
                {/* Post */}
                <rect x="44" y="50" width="12" height="120" fill="#2F4553" />
                {/* Lamp Housing */}
                <path d="M 20 50 L 80 50 L 70 20 L 30 20 Z" fill="#213743" />
                <rect x="15" y="47" width="70" height="6" fill="#1A2C38" />
                {/* Glow / Lamp */}
                <circle cx="50" cy="50" r="15" fill="#FFB018" filter="blur(8px)" opacity="0.6" />
                <circle cx="50" cy="45" r="10" fill="#FFD166" />
                <circle cx="48" cy="42" r="4" fill="#FFFFFF" opacity="0.8" />
            </svg>
        );
    }

    if (type === "fire_hydrant") {
        return (
            <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} style={{ filter: "drop-shadow(0px 8px 6px rgba(0,0,0,0.4))", overflow: "visible", ...style }} {...props}>
                <ellipse cx="50" cy="85" rx="15" ry="5" fill="#0F212E" opacity="0.6" />
                <rect x="40" y="30" width="20" height="50" fill="#EF4444" rx="3" />
                <path d="M 35 30 L 65 30 L 60 20 L 40 20 Z" fill="#DC2626" />
                <circle cx="50" cy="20" r="10" fill="#EF4444" />
                <rect x="30" y="45" width="15" height="10" fill="#B91C1C" rx="2" />
                <rect x="55" y="45" width="15" height="10" fill="#B91C1C" rx="2" />
                <rect x="44" y="55" width="12" height="2" fill="#7F1D1D" opacity="0.5" />
                <rect x="44" y="65" width="12" height="2" fill="#7F1D1D" opacity="0.5" />
            </svg>
        );
    }

    if (type === "trash_can") {
        return (
            <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} style={{ filter: "drop-shadow(0px 8px 6px rgba(0,0,0,0.4))", overflow: "visible", ...style }} {...props}>
                <ellipse cx="50" cy="85" rx="18" ry="6" fill="#0F212E" opacity="0.6" />
                <rect x="35" y="30" width="30" height="50" fill="#4B5563" rx="2" />
                <rect x="32" y="25" width="36" height="8" fill="#374151" rx="2" />
                <path d="M 38 25 L 62 25 L 58 15 L 42 15 Z" fill="#9CA3AF" />
                {/* Ribs */}
                <rect x="40" y="35" width="2" height="40" fill="#374151" opacity="0.7" />
                <rect x="49" y="35" width="2" height="40" fill="#374151" opacity="0.7" />
                <rect x="58" y="35" width="2" height="40" fill="#374151" opacity="0.7" />
            </svg>
        );
    }

    if (type === "bench") {
        return (
            <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} style={{ filter: "drop-shadow(0px 8px 6px rgba(0,0,0,0.5))", overflow: "visible", ...style }} {...props}>
                {/* Legs Shadow */}
                <ellipse cx="30" cy="85" rx="8" ry="3" fill="#0F212E" opacity="0.6" />
                <ellipse cx="70" cy="85" rx="8" ry="3" fill="#0F212E" opacity="0.6" />

                {/* Legs */}
                <rect x="26" y="50" width="8" height="35" fill="#111827" />
                <rect x="66" y="50" width="8" height="35" fill="#111827" />

                {/* Seat Planks */}
                <rect x="15" y="45" width="70" height="8" fill="#B45309" rx="2" />
                <rect x="18" y="55" width="64" height="8" fill="#92400E" rx="2" />

                {/* Back Planks */}
                <rect x="15" y="20" width="70" height="8" fill="#D97706" rx="2" />
                <rect x="15" y="32" width="70" height="8" fill="#B45309" rx="2" />

                {/* Back Supports */}
                <rect x="26" y="20" width="8" height="30" fill="#111827" />
                <rect x="66" y="20" width="8" height="30" fill="#111827" />
            </svg>
        );
    }

    if (type === "grate") {
        return (
            <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} style={{ ...style }} {...props}>
                {/* Outer frame */}
                <rect x="20" y="20" width="60" height="60" fill="#374151" rx="4" />
                <rect x="25" y="25" width="50" height="50" fill="#111827" rx="2" />

                {/* Inner Bars */}
                {[...Array(6)].map((_, i) => (
                    <rect key={i} x={30 + (i * 8)} y="25" width="4" height="50" fill="#4B5563" />
                ))}
            </svg>
        );
    }

    if (type === "barrier") {
        return (
            <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} style={{ filter: "drop-shadow(0px 8px 6px rgba(0,0,0,0.5))", overflow: "visible", ...style }} {...props}>
                {/* Shadow */}
                <ellipse cx="50" cy="80" rx="45" ry="10" fill="#0F212E" opacity="0.6" />

                {/* Base Concrete */}
                <path d="M 10 75 L 90 75 L 85 35 L 15 35 Z" fill="#9CA3AF" />

                {/* Top concrete ridge */}
                <rect x="15" y="30" width="70" height="5" fill="#D4D4D8" rx="1" />

                {/* Red/White Stripes */}
                <g opacity="0.9">
                    <polygon points="15,75 25,75 21,35 15,35" fill="#EF4444" />
                    <polygon points="25,75 40,75 36,35 21,35" fill="#FFFFFF" />
                    <polygon points="40,75 55,75 51,35 36,35" fill="#EF4444" />
                    <polygon points="55,75 70,75 66,35 51,35" fill="#FFFFFF" />
                    <polygon points="70,75 85,75 81,35 66,35" fill="#EF4444" />
                    <polygon points="85,75 90,75 85,35 81,35" fill="#FFFFFF" />
                </g>

                {/* Indentations / Detail lines */}
                <line x1="12" y1="70" x2="88" y2="70" stroke="#6B7280" strokeWidth="1" opacity="0.5" />
                <line x1="14" y1="50" x2="86" y2="50" stroke="#6B7280" strokeWidth="1" opacity="0.5" />
            </svg>
        );
    }

    return null;
};

export default EnvironmentSVG;
