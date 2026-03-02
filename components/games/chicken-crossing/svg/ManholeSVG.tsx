import React from "react";

interface ManholeSVGProps extends React.SVGProps<SVGSVGElement> {
    isOpen?: boolean;
    danger?: boolean;
}

const ManholeSVG: React.FC<ManholeSVGProps> = ({
    isOpen = false,
    danger = false,
    className = "",
    style,
    ...props
}) => {
    return (
        <svg
            viewBox="0 0 160 100"
            className={`w-full h-full ${className}`}
            style={{ overflow: "visible", ...style }}
            {...props}
        >
            <defs>
                <radialGradient id="manholeGlow" cx="50%" cy="55%" r="60%">
                    <stop offset="0%" stopColor={danger ? "#F97316" : "#0F172A"} stopOpacity={danger ? 0.55 : 0.35} />
                    <stop offset="100%" stopColor="#020617" stopOpacity={0} />
                </radialGradient>
                <linearGradient id="rimGrad" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#71717A" />
                    <stop offset="50%" stopColor="#A1A1AA" />
                    <stop offset="100%" stopColor="#52525B" />
                </linearGradient>
                <linearGradient id="coverGrad" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#6B7280" />
                    <stop offset="50%" stopColor="#9CA3AF" />
                    <stop offset="100%" stopColor="#4B5563" />
                </linearGradient>
            </defs>

            <ellipse cx="80" cy="72" rx="62" ry="16" fill="url(#manholeGlow)" />
            <ellipse cx="80" cy="70" rx="54" ry="12" fill="#111827" opacity={isOpen ? 0.95 : 0.7} />
            <ellipse cx="80" cy="70" rx="56" ry="14" fill="none" stroke="url(#rimGrad)" strokeWidth="6" />

            {isOpen && (
                <>
                    <ellipse cx="80" cy="73" rx="48" ry="10" fill="#020617" opacity="0.9" />
                    <g opacity="0.45" stroke="#475569" strokeWidth="3" strokeLinecap="round">
                        <line x1="70" y1="62" x2="70" y2="82" />
                        <line x1="80" y1="61" x2="80" y2="83" />
                        <line x1="90" y1="62" x2="90" y2="82" />
                    </g>
                </>
            )}

            {!isOpen && (
                <g>
                    <ellipse cx="80" cy="68" rx="46" ry="10" fill="url(#coverGrad)" />
                    <ellipse cx="80" cy="68" rx="46" ry="10" fill="none" stroke="#E4E4E7" strokeOpacity="0.18" strokeWidth="2" />
                    <circle cx="80" cy="68" r="4" fill="#374151" />
                    <g stroke="#4B5563" strokeWidth="2" opacity="0.75">
                        <line x1="46" y1="68" x2="114" y2="68" />
                        <line x1="80" y1="58" x2="80" y2="78" />
                        <path d="M 56 61 Q 80 70 104 61" fill="none" />
                        <path d="M 56 75 Q 80 66 104 75" fill="none" />
                    </g>
                </g>
            )}

            {isOpen && (
                <>
                    <g
                        style={{
                            transformOrigin: "60px 66px",
                            transform: "translate(-16px, -12px) rotate(-22deg)",
                        }}
                    >
                        <ellipse cx="60" cy="66" rx="22" ry="7" fill="url(#coverGrad)" />
                        <ellipse cx="60" cy="66" rx="22" ry="7" fill="none" stroke="#D4D4D8" strokeOpacity="0.2" strokeWidth="1.5" />
                    </g>
                    <g
                        style={{
                            transformOrigin: "104px 74px",
                            transform: "translate(18px, 18px) rotate(20deg)",
                        }}
                    >
                        <ellipse cx="104" cy="74" rx="22" ry="7" fill="url(#coverGrad)" opacity="0.85" />
                        <ellipse cx="104" cy="74" rx="22" ry="7" fill="none" stroke="#D4D4D8" strokeOpacity="0.15" strokeWidth="1.5" />
                    </g>
                </>
            )}
        </svg>
    );
};

export default ManholeSVG;
