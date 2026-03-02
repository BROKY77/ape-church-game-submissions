import React from "react";

export type ChickenState = "idle" | "jump" | "dead";

interface ChickenSVGProps extends React.SVGProps<SVGSVGElement> {
  chickenState?: ChickenState;
}

const ChickenSVG: React.FC<ChickenSVGProps> = ({ chickenState = "idle", className = "", style, ...props }) => {
  // We use inline CSS for self-contained animations on the SVG elements.

  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full ${className}`}
      style={{
        filter: "drop-shadow(0px 8px 6px rgba(0,0,0,0.4))",
        overflow: "visible",
        ...style
      }}
      {...props}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes chickenIdle {
          0%, 100% { transform: scaleY(1) translateY(0); }
          50% { transform: scaleY(0.95) translateY(2px); }
        }
        @keyframes chickenJump {
          0% { transform: scaleY(1) translateY(0); }
          30% { transform: scaleY(0.8) translateY(5px); }
          50% { transform: scaleY(1.1) translateY(-15px); }
          80% { transform: scaleY(0.9) translateY(2px); }
          100% { transform: scaleY(1) translateY(0); }
        }
        @keyframes fadeAndFall {
          0% { opacity: 0; transform: scale(0.15) translate(0, 0) rotate(0deg); }
          10% { opacity: 1; transform: scale(calc(var(--scale) * 1.05)) translate(calc(var(--tx) * 0.18), calc(var(--ty) * 0.18)) rotate(calc(var(--rot) * 0.15)); }
          35% { opacity: 1; transform: scale(var(--scale)) translate(calc(var(--tx) * 0.55), calc(var(--ty) * 0.55)) rotate(calc(var(--rot) * 0.55)); }
          100% { opacity: 0; transform: scale(calc(var(--scale) * 0.8)) translate(var(--tx), var(--ty)) rotate(var(--rot)); }
        }
        @keyframes popOut {
          0% { transform: scale(1) rotate(0deg); opacity: 1; }
          14% { transform: scale(1.16, 0.86) rotate(-8deg); opacity: 1; }
          28% { transform: scale(0.92, 1.08) rotate(9deg); opacity: 1; }
          42% { transform: scale(0.35) rotate(22deg); opacity: 0.35; }
          100% { transform: scale(0) rotate(28deg); opacity: 0; }
        }
        @keyframes impactFlash {
          0% { opacity: 0; transform: scale(0.2); }
          8% { opacity: 0.7; transform: scale(0.75); }
          100% { opacity: 0; transform: scale(1.8); }
        }
        @keyframes impactDust {
          0% { opacity: 0; transform: scale(0.4, 0.2); }
          15% { opacity: 0.5; transform: scale(0.9, 0.45); }
          100% { opacity: 0; transform: scale(1.8, 0.9); }
        }

        .anim-idle {
          animation: chickenIdle 1s ease-in-out infinite;
          transform-origin: 50% 90%;
        }
        .anim-jump {
          animation: chickenJump 0.5s ease-out forwards;
          transform-origin: 50% 90%;
        }
        .anim-dead {
          animation: popOut 0.8s forwards;
          transform-origin: 50% 70%;
        }

        .impact-ring,
        .impact-dust {
          opacity: 0;
          transform-origin: 56px 64px;
        }
        .anim-dead-feathers .impact-ring {
          animation: impactFlash 0.42s ease-out forwards;
        }
        .anim-dead-feathers .impact-dust {
          animation: impactDust 0.48s ease-out forwards;
        }

        .feather {
          opacity: 0;
          transform-origin: 56px 62px;
        }
        .anim-dead-feathers .feather {
          animation: fadeAndFall 0.62s cubic-bezier(0.18, 0.85, 0.32, 1.2) forwards;
        }
      `}} />

      {/* Feathers burst (behind chicken) */}
      <g className={chickenState === "dead" ? "anim-dead-feathers" : ""}>
        {/* Render feather burst using CSS variables for keyframes */}
        {[...Array(22)].map((_, i) => {
          const angle = (i / 22) * Math.PI * 2;
          const pseudoRandom1 = Math.abs(Math.sin(i * 4.2)) * 100;
          const pseudoRandom2 = Math.abs(Math.cos(i * 2.1)) * 100;

          const radius = 48 + (pseudoRandom1 % 54);
          const tx = Math.cos(angle) * radius;
          const ty = Math.sin(angle) * radius - (pseudoRandom2 % 34) - 14; // explosive upwards bias
          const rot = (pseudoRandom1 - 50) * 15; // wide rotation scatter
          const featherScale = 0.35 + ((pseudoRandom2 % 55) / 100);
          const featherPalette = ["#FFFFFF", "#F9FAFB", "#FEF3C7", "#FFE4B5", "#FFD166"];
          const featherFill = featherPalette[i % featherPalette.length];
          const txCss = `${tx.toFixed(3)}px`;
          const tyCss = `${ty.toFixed(3)}px`;
          const rotCss = `${rot.toFixed(3)}deg`;
          const scaleCss = featherScale.toFixed(3);

          return (
            <path
              key={i}
              className="feather"
              d="M 56 58 C 51 53, 51 63, 56 68 C 61 63, 61 53, 56 58 Z"
              fill={featherFill}
              style={{
                "--tx": txCss,
                "--ty": tyCss,
                "--rot": rotCss,
                "--scale": scaleCss
              } as React.CSSProperties}
            />
          );
        })}
      </g>

      {/* Main Chicken Group (animated state) */}
      <g className={`
        ${chickenState === "idle" ? "anim-idle" : ""}
        ${chickenState === "jump" ? "anim-jump" : ""}
        ${chickenState === "dead" ? "anim-dead" : ""}
      `}>
        {/* Body */}
        <path d="M 30 70 C 30 50, 45 40, 60 40 C 75 40, 85 50, 85 70 C 85 85, 75 90, 60 90 C 45 90, 30 85, 30 70 Z" fill="#FFFFFF" />
        {/* Tail */}
        <path d="M 30 70 C 20 65, 15 50, 25 55 C 30 58, 30 65, 30 70 Z" fill="#FFFFFF" />
        {/* Head */}
        <circle cx="70" cy="45" r="15" fill="#FFFFFF" />
        {/* Comb */}
        <path d="M 65 30 C 60 20, 70 20, 70 28 C 72 18, 80 20, 78 30 Z" fill="#FF2E4C" />
        {/* Wattle */}
        <path d="M 80 50 C 80 55, 85 55, 82 48 Z" fill="#FF2E4C" />
        {/* Beak */}
        <path d="M 82 42 L 95 45 L 82 48 Z" fill="#FFA500" />

        {/* Eye */}
        {chickenState === "dead" ? (
          <g stroke="#1A2C38" strokeWidth="2" strokeLinecap="round">
            <line x1="72" y1="37" x2="78" y2="43" />
            <line x1="78" y1="37" x2="72" y2="43" />
          </g>
        ) : (
          <circle cx="75" cy="40" r="3" fill="#1A2C38" />
        )}

        {/* Wing */}
        <path d="M 45 65 C 45 55, 60 55, 65 65 C 65 75, 45 75, 45 65 Z" fill="#E5E7EB" />
        {/* Legs */}
        <line x1="50" y1="88" x2="50" y2="98" stroke="#FFA500" strokeWidth="3" strokeLinecap="round" />
        <line x1="50" y1="98" x2="45" y2="98" stroke="#FFA500" strokeWidth="3" strokeLinecap="round" />
        <line x1="65" y1="88" x2="65" y2="98" stroke="#FFA500" strokeWidth="3" strokeLinecap="round" />
        <line x1="65" y1="98" x2="70" y2="98" stroke="#FFA500" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Front impact puff so the hit reads at the body center, not behind the head */}
      <g className={chickenState === "dead" ? "anim-dead-feathers" : ""}>
        <circle className="impact-ring" cx="56" cy="64" r="14" fill="#FFFFFF" fillOpacity="0.16" />
        <circle className="impact-ring" cx="56" cy="64" r="10" fill="#FDE68A" fillOpacity="0.18" />
        <ellipse className="impact-dust" cx="56" cy="76" rx="20" ry="8" fill="#E5E7EB" fillOpacity="0.22" />
      </g>
    </svg>
  );
};

export default ChickenSVG;
