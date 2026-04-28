/**
 * Paydirt particle engine — CSS-animated gold sparks for celebrations + bursts.
 * No dependencies. Attach to any DOM container.
 */

export interface BurstOptions {
    colors?: string[];
    minSize?: number;
    maxSize?: number;
    minSpeed?: number;
    maxSpeed?: number;
    gravity?: number;
    lifetime?: number;
    spread?: number; // degrees
    /** When true, particles render below cells via a lower z-index modifier —
     *  used on bonus-round hits so sparks read as emerging from BEHIND the
     *  gem rather than on top of it. */
    behind?: boolean;
}

const DEFAULT_COLORS = ["#ffd700", "#ffb800", "#ff9500", "#fff4cc"];

export class ParticleEngine {
    constructor(private container: HTMLElement) {}

    /** Emit a radial burst of particles from (x, y). Particles are
     *  appended to `parent` if provided (for in-cell bursts that need
     *  to live in the cell's stacking context so they can sit visually
     *  behind the gem image), otherwise to this.container. */
    burst(x: number, y: number, count: number, opts: BurstOptions = {}, parent?: HTMLElement) {
        // Per-key fallback (NOT spread) so callers passing
        // `{ colors: undefined }` don't override the default and crash
        // on cfg.colors.length.
        const cfg = {
            colors: opts.colors ?? DEFAULT_COLORS,
            minSize: opts.minSize ?? 4,
            maxSize: opts.maxSize ?? 12,
            minSpeed: opts.minSpeed ?? 120,
            maxSpeed: opts.maxSpeed ?? 400,
            gravity: opts.gravity ?? 260,
            lifetime: opts.lifetime ?? 1500,
            spread: opts.spread ?? 360,
            behind: opts.behind ?? false,
        };
        const target = parent ?? this.container;

        for (let i = 0; i < count; i++) {
            const p = document.createElement("div");
            p.className = cfg.behind ? "pd-particle pd-particle--behind" : "pd-particle";
            const size = cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize);
            const angle = ((Math.random() * cfg.spread - cfg.spread / 2) * Math.PI) / 180;
            const speed = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
            const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];

            p.style.cssText = `
                left: ${x}px; top: ${y}px;
                width: ${size}px; height: ${size}px;
                background: ${color};
                box-shadow: 0 0 ${size}px ${color};
            `;
            target.appendChild(p);

            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const finalX = vx * (cfg.lifetime / 1000);
            const finalY = vy * (cfg.lifetime / 1000) + 0.5 * cfg.gravity * (cfg.lifetime / 1000) ** 2;

            const anim = p.animate(
                [
                    { transform: "translate(0, 0) scale(1)", opacity: 1 },
                    { transform: `translate(${finalX}px, ${finalY}px) scale(0.2)`, opacity: 0 },
                ],
                {
                    duration: cfg.lifetime,
                    easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    fill: "forwards",
                },
            );
            anim.onfinish = () => p.remove();
            anim.oncancel = () => p.remove();
        }
    }

    /** Emit a burst at the center of a given cell element. Particles are
     *  appended INTO the element so they live in its stacking context
     *  (sit behind the gem image, masked by the opaque silhouette,
     *  visible through the transparent edges as they fly outward).
     *
     *  All cells share z-index: 2, so by row-major DOM order, sparks
     *  flying past the cell's right/bottom edges get clipped by later-
     *  painted neighbors. To fix, temporarily elevate the source cell
     *  for the burst lifetime. Chest cells (z-index 100) are skipped —
     *  dropping them would break the chest's protrude-above stacking. */
    burstAtElement(el: HTMLElement, count: number, opts: BurstOptions = {}) {
        const rect = el.getBoundingClientRect();
        const isChest = el.classList.contains("pd-cell--has-chest");
        if (!isChest) {
            const prev = el.style.zIndex;
            el.style.zIndex = "50";
            const lifetime = opts.lifetime ?? 1500;
            setTimeout(() => {
                // Only revert if WE set it — don't clobber a value
                // another concurrent burst may have written.
                if (el.style.zIndex === "50") el.style.zIndex = prev;
            }, lifetime + 200);
        }
        this.burst(rect.width / 2, rect.height / 2, count, opts, el);
    }

    /** Clear all particles (used on reset). */
    clear() {
        const existing = this.container.querySelectorAll(".pd-particle");
        existing.forEach((p) => p.remove());
    }
}

/** Mount/unmount ambient floating dust specks in a container. */
export function mountAmbientDust(container: HTMLElement, count = 14): () => void {
    const layer = document.createElement("div");
    layer.className = "pd-ambient-dust";
    for (let i = 0; i < count; i++) {
        const speck = document.createElement("div");
        speck.className = "pd-ambient-dust__speck";
        const duration = 18 + Math.random() * 14;
        const delay = -Math.random() * duration;
        const left = Math.random() * 100;
        speck.style.left = `${left}%`;
        speck.style.animationDuration = `${duration}s`;
        speck.style.animationDelay = `${delay}s`;
        speck.style.opacity = String(0.3 + Math.random() * 0.5);
        layer.appendChild(speck);
    }
    container.appendChild(layer);
    return () => {
        layer.remove();
    };
}
