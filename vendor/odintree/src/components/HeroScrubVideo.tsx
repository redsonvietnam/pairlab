"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PIN_VH_MULTIPLE = 3.2;
const IMMERSE_OVERFILL = 1.04;
const ENTRY_DELAY = 0.2;
const CARD_START_SCALE_DESKTOP = 0.6;
const CARD_START_SCALE_MOBILE = 0.82;

export type HeroScrubVideoProps = {
  videoSrc: string;
  titleTop: string;
  titleBottom: string;
  bgClassName?: string;
  accentHex?: string;
  defaultAspect?: number;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

export function HeroScrubVideo({
  videoSrc,
  titleTop,
  titleBottom,
  bgClassName = "bg-black",
  accentHex = "hsl(var(--background))",
  defaultAspect = 16 / 9,
}: HeroScrubVideoProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleTopRef = useRef<HTMLHeadingElement>(null);
  const titleBottomRef = useRef<HTMLHeadingElement>(null);
  const [ready, setReady] = useState(false);
  const [aspect, setAspect] = useState<number>(defaultAspect);
  const reduced = usePrefersReducedMotion();

  // Wait for video metadata
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
      setReady(true);
    };
    if (v.readyState >= 1) onMeta();
    else v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, []);

  // Entry animation
  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: ENTRY_DELAY });
      tl.from(bgRef.current, { opacity: 0, duration: 1.4, ease: "power2.out" });
      tl.from(cardRef.current, { opacity: 0, duration: 1.1, ease: "power3.out" }, 0.35);
      tl.from(titleTopRef.current, { opacity: 0, y: 30, duration: 1, ease: "expo.out" }, 0.5);
      tl.from(titleBottomRef.current, { opacity: 0, y: -30, duration: 1, ease: "expo.out" }, 0.62);
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  // Scroll choreography
  useEffect(() => {
    if (reduced || !ready) return;
    const section = sectionRef.current;
    const v = videoRef.current;
    if (!section || !v) return;

    const ctx = gsap.context(() => {
      const startScale = () =>
        window.innerWidth < 768 ? CARD_START_SCALE_MOBILE : CARD_START_SCALE_DESKTOP;

      const immerseScale = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const baseW = Math.min(vw * 0.96, vh * 0.72 * aspect);
        const baseH = Math.min(vh * 0.72, (vw * 0.96) / aspect);
        if (baseW <= 0 || baseH <= 0) return 1.5;
        return Math.max(vw / baseW, vh / baseH) * IMMERSE_OVERFILL;
      };

      gsap.set(cardRef.current, { scale: startScale(), transformOrigin: "50% 50%" });

      const master = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            const mapped = gsap.utils.clamp(0, 1, (p - 0.15) / 0.63);
            const dur = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
            if (dur > 0) {
              const t = mapped * dur;
              try { v.currentTime = t; } catch {}
            }
          },
        },
      });

      master.to(cardRef.current, { scale: 1, ease: "power2.out", duration: 0.15 }, 0);
      master.to(titleTopRef.current, {
        x: () => (window.innerWidth < 768 ? "-70vw" : "-60vw"),
        letterSpacing: "0.02em",
        ease: "power2.inOut",
        duration: 0.15,
      }, 0);
      master.to(titleBottomRef.current, {
        x: () => (window.innerWidth < 768 ? "70vw" : "60vw"),
        letterSpacing: "0.02em",
        ease: "power2.inOut",
        duration: 0.15,
      }, 0);

      master.to(cardRef.current, { scale: immerseScale(), ease: "power2.in", duration: 0.63 }, 0.15);
      master.to(titleTopRef.current, { opacity: 0, ease: "power1.in", duration: 0.22 }, 0.15);
      master.to(titleBottomRef.current, { opacity: 0, ease: "power1.in", duration: 0.22 }, 0.15);

      master.to(cardRef.current, { scale: startScale(), ease: "power3.inOut", duration: 0.22 }, 0.78);
      master.to(titleTopRef.current, {
        x: 0, opacity: 1, letterSpacing: "-0.04em", ease: "power2.inOut", duration: 0.22,
      }, 0.78);
      master.to(titleBottomRef.current, {
        x: 0, opacity: 1, letterSpacing: "-0.04em", ease: "power2.inOut", duration: 0.22,
      }, 0.78);

      ScrollTrigger.refresh();
    }, sectionRef);
    return () => ctx.revert();
  }, [ready, reduced, aspect]);

  const tallHeight = `${(PIN_VH_MULTIPLE + 1) * 100}vh`;

  return (
    <section
      ref={sectionRef}
      className={`relative w-full overflow-clip ${bgClassName}`}
      style={{ height: tallHeight }}
      aria-label="Cinematic scroll-scrubbed hero"
    >
      <div
        ref={stickyRef}
        className="sticky top-0 flex h-[100svh] w-full flex-col items-center justify-center overflow-hidden"
      >
        <div ref={bgRef} aria-hidden className="absolute inset-0 z-0" style={{ backgroundColor: accentHex }} />
        <div aria-hidden className="absolute inset-0 z-0" style={{
          background: "radial-gradient(ellipse at 50% 35%, hsl(var(--foreground) / 0.05) 0%, transparent 55%)",
        }} />
        <div aria-hidden className="absolute inset-0 z-0" style={{
          background: "radial-gradient(ellipse at center, transparent 55%, hsl(var(--background) / 0.6) 100%)",
        }} />

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-3 md:gap-4 text-foreground">
          <h2 ref={titleTopRef} aria-hidden className="font-serif italic" style={{
            fontSize: "clamp(3.75rem, 12vw, 11rem)", lineHeight: 0.85, letterSpacing: "-0.04em",
          }}>{titleTop}</h2>

          <div ref={cardRef} className="relative overflow-hidden rounded-[12px] shadow-[0_20px_80px_hsl(var(--foreground)/0.25)] ring-1 ring-foreground/10 will-change-transform md:rounded-[16px]" style={{
            width: `min(96vw, calc(72svh * ${aspect}))`,
            height: `min(72svh, 96vw / ${aspect})`,
            aspectRatio: aspect,
          }}>
            <div aria-hidden className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_120px_hsl(var(--background)/0.45)]" />
            <video
              ref={videoRef}
              src={videoSrc}
              muted
              playsInline
              preload="auto"
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover bg-black"
            />
          </div>

          <h2 ref={titleBottomRef} aria-hidden className="font-serif italic" style={{
            fontSize: "clamp(3.75rem, 12vw, 11rem)", lineHeight: 0.85, letterSpacing: "-0.04em",
          }}>{titleBottom}</h2>
        </div>
      </div>
    </section>
  );
}