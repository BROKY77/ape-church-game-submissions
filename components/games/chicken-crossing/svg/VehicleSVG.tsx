import React from "react";

export type VehicleType =
    | "taxi"
    | "truck"
    | "sport"
    | "sedan"
    | "police"
    | "ambulance"
    | "luxury"
    | "cheap"
    | "bus"
    | "fire_engine";

interface VehicleSVGProps extends React.SVGProps<SVGSVGElement> {
    type: VehicleType;
}

const VehicleSVG: React.FC<VehicleSVGProps> = ({ type, className = "", style, ...props }) => {

    // Geometry logic per vehicle type
    const getGeometry = () => {
        let width = 50;
        let length = 160;
        let roofLength = 70;
        let roofY = 60;
        let hasLights = false;
        let isBoxy = false;
        let hasCross = false;
        let hasLadder = false;
        let isBeater = false;

        switch (type) {
            case "bus":
                length = 190; width = 56; roofLength = 170; roofY = 20; isBoxy = true;
                break;
            case "truck":
            case "ambulance":
                length = 170; width = 54; roofLength = 110; roofY = 50; isBoxy = true;
                if (type === "ambulance") hasCross = true;
                break;
            case "fire_engine":
                length = 180; width = 56; roofLength = 120; roofY = 50; isBoxy = true; hasLadder = true; hasLights = true;
                break;
            case "police":
                hasLights = true;
                break;
            case "sport":
            case "luxury":
                length = 150; width = 50; roofLength = 60; roofY = 65;
                break;
            case "cheap":
                length = 140; width = 48; roofLength = 60; roofY = 55; isBeater = true;
                break;
            case "taxi":
            case "sedan":
            default:
                break;
        }

        return { width, length, roofLength, roofY, hasLights, isBoxy, hasCross, hasLadder, isBeater };
    };

    const getColors = () => {
        switch (type) {
            case "taxi": return { body: "#FFC107", roof: "#FFE066", window: "#1A2C38", details: "#333333" };
            case "sport": return { body: "#EF4444", roof: "#F87171", window: "#111827", details: "#E5E7EB" };
            case "truck": return { body: "#8B5CF6", roof: "#A78BFA", window: "#1A2C38", details: "#1F2937" };
            case "police": return { body: "#1E3A8A", roof: "#FFFFFF", window: "#0F172A", details: "#F8FAFC" };
            case "ambulance": return { body: "#FFFFFF", roof: "#F1F5F9", window: "#1E293B", details: "#EF4444" };
            case "luxury": return { body: "#000000", roof: "#111111", window: "#333333", details: "#D4AF37" }; // Gold accents
            case "cheap": return { body: "#A3A3A3", roof: "#737373", window: "#27272A", details: "#52525B" }; // Rust/Beater
            case "bus": return { body: "#0284C7", roof: "#38BDF8", window: "#0C4A6E", details: "#E0F2FE" };
            case "fire_engine": return { body: "#DC2626", roof: "#B91C1C", window: "#450A0A", details: "#FCA5A5" };
            case "sedan":
            default: return { body: "#3B82F6", roof: "#60A5FA", window: "#1A2C38", details: "#F3F4F6" };
        }
    };

    const colors = getColors();
    const geom = getGeometry();

    // Centering calculations
    const cx = 50;
    const bodyX = cx - geom.width / 2;
    const bodyY = cx - geom.length / 2 + 50; // offset slightly
    const roofX = cx - (geom.width - 6) / 2;

    // Tires
    const tireW = 10;
    const tireH = 30;
    const tireLx = bodyX - tireW / 2;
    const tireRx = bodyX + geom.width - tireW / 2;
    const tireFy = bodyY + 10;
    const tireRy = bodyY + geom.length - tireH - 10;

    return (
        <svg
            viewBox="0 0 100 200"
            className={`w-full h-full ${className}`}
            style={{
                filter: "drop-shadow(0px 10px 8px rgba(0,0,0,0.5))",
                ...style
            }}
            {...props}
        >
            {/* Tires */}
            <rect x={tireLx} y={tireFy} width={tireW} height={tireH} rx="3" fill="#111" />
            <rect x={tireRx} y={tireFy} width={tireW} height={tireH} rx="3" fill="#111" />
            <rect x={tireLx} y={tireRy} width={tireW} height={tireH} rx="3" fill="#111" />
            <rect x={tireRx} y={tireRy} width={tireW} height={tireH} rx="3" fill="#111" />

            {/* Main Body */}
            {geom.isBeater ? (
                // Cheaper car looks a bit crooked/dented
                <path d={`M ${bodyX + 2} ${bodyY} L ${bodyX + geom.width - 3} ${bodyY + 2} L ${bodyX + geom.width} ${bodyY + geom.length - 2} L ${bodyX - 2} ${bodyY + geom.length} Z`} fill={colors.body} />
            ) : (
                <rect x={bodyX} y={bodyY} width={geom.width} height={geom.length} rx={geom.isBoxy ? 4 : 12} fill={colors.body} />
            )}

            {/* Bumpers & Details */}
            <rect x={bodyX + 5} y={bodyY + 5} width={geom.width - 10} height={15} rx="5" fill={colors.details} opacity={0.5} />
            <rect x={bodyX + 5} y={bodyY + geom.length - 20} width={geom.width - 10} height={15} rx="5" fill={colors.details} opacity={0.5} />

            {/* Headlights */}
            <circle cx={bodyX + 10} cy={bodyY + 5} r="4" fill={geom.isBeater ? "#FBBF24" : "#FFFFFF"} opacity={0.8} />
            <circle cx={bodyX + geom.width - 10} cy={bodyY + 5} r="4" fill={geom.isBeater ? "#4B5563" : "#FFFFFF"} opacity={0.8} />

            {/* Taillights */}
            <rect x={bodyX + 5} y={bodyY + geom.length - 5} width={10} height={5} rx="2" fill="#EF4444" />
            <rect x={bodyX + geom.width - 15} y={bodyY + geom.length - 5} width={10} height={5} rx="2" fill="#EF4444" />

            {/* Roof */}
            <rect x={roofX} y={geom.roofY} width={geom.width - 6} height={geom.roofLength} rx={geom.isBoxy ? 2 : 8} fill={colors.roof} />

            {/* Windows */}
            {geom.isBoxy && type !== "bus" ? (
                <>
                    {/* Truck/Ambulance Cab */}
                    <path d={`M ${roofX + 2} ${geom.roofY + 5} L ${roofX + geom.width - 8} ${geom.roofY + 5} L ${roofX + geom.width - 10} ${geom.roofY + 20} L ${roofX + 4} ${geom.roofY + 20} Z`} fill={colors.window} />
                </>
            ) : type === "bus" ? (
                <>
                    {/* Bus Windows */}
                    <rect x={roofX + 4} y={geom.roofY + 5} width={geom.width - 14} height={15} fill={colors.window} rx="2" />
                    {[...Array(6)].map((_, i) => (
                        <rect key={i} x={roofX + 2} y={geom.roofY + 30 + (i * 20)} width={geom.width - 10} height={12} fill={colors.window} rx="1" />
                    ))}
                </>
            ) : (
                <>
                    {/* Normal Car Windshields */}
                    <path d={`M ${roofX + 4} ${geom.roofY + 5} L ${roofX + geom.width - 10} ${geom.roofY + 5} L ${roofX + geom.width - 12} ${geom.roofY + 20} L ${roofX + 6} ${geom.roofY + 20} Z`} fill={colors.window} />
                    <path d={`M ${roofX + 6} ${geom.roofY + geom.roofLength - 20} L ${roofX + geom.width - 12} ${geom.roofY + geom.roofLength - 20} L ${roofX + geom.width - 10} ${geom.roofY + geom.roofLength - 5} L ${roofX + 4} ${geom.roofY + geom.roofLength - 5} Z`} fill={colors.window} />
                    <rect x={roofX + 1} y={geom.roofY + 25} width={4} height={geom.roofLength - 50} rx="1" fill={colors.window} />
                    <rect x={roofX + geom.width - 11} y={geom.roofY + 25} width={4} height={geom.roofLength - 50} rx="1" fill={colors.window} />
                </>
            )}

            {/* Type Specific Overlays */}
            {type === "taxi" && (
                <rect x={cx - 8} y={geom.roofY + 5} width={16} height={8} rx="2" fill="#FFFFFF" />
            )}

            {type === "police" && geom.hasLights && (
                <g>
                    <rect x={roofX + 4} y={geom.roofY + 25} width={(geom.width - 14) / 2} height={6} rx="1" fill="#3B82F6" opacity="0.9" />
                    <rect x={roofX + 4 + (geom.width - 14) / 2} y={geom.roofY + 25} width={(geom.width - 14) / 2} height={6} rx="1" fill="#EF4444" opacity="0.9" />
                </g>
            )}

            {geom.hasCross && (
                <g transform={`translate(${cx}, ${geom.roofY + geom.roofLength / 2})`}>
                    <rect x="-15" y="-5" width="30" height="10" fill="#EF4444" />
                    <rect x="-5" y="-15" width="10" height="30" fill="#EF4444" />
                </g>
            )}

            {geom.hasLadder && (
                <g>
                    <rect x={cx - 6} y={geom.roofY + 20} width={12} height={geom.roofLength - 30} fill="#E5E7EB" />
                    {[...Array(8)].map((_, i) => (
                        <rect key={i} x={cx - 6} y={geom.roofY + 25 + (i * 10)} width={12} height={3} fill="#9CA3AF" />
                    ))}
                    {geom.hasLights && (
                        <>
                            <rect x={roofX} y={geom.roofY + 5} width={10} height={6} rx="2" fill="#EF4444" opacity="0.9" />
                            <rect x={roofX + geom.width - 16} y={geom.roofY + 5} width={10} height={6} rx="2" fill="#EF4444" opacity="0.9" />
                        </>
                    )}
                </g>
            )}

            {type === "sport" && (
                <>
                    <rect x={cx - 20} y={bodyY + geom.length - 15} width={40} height={5} rx="2" fill={colors.details} />
                    <path d={`M ${cx - 15} ${bodyY + geom.length - 30} L ${cx - 10} ${bodyY + geom.length - 15} L ${cx - 15} ${bodyY + geom.length - 15} Z`} fill={colors.details} />
                    <path d={`M ${cx + 15} ${bodyY + geom.length - 30} L ${cx + 10} ${bodyY + geom.length - 15} L ${cx + 15} ${bodyY + geom.length - 15} Z`} fill={colors.details} />
                </>
            )}

            {type === "luxury" && (
                <rect x={cx - 1} y={bodyY + 2} width={2} height={geom.length - 4} fill="#D4AF37" opacity="0.6" />
            )}

        </svg>
    );
};

export default VehicleSVG;
