"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type MascotSprite =
  | "idle"
  | "thinking"
  | "running"
  | "running-left"
  | "running-right"
  | "waiting"
  | "waving"
  | "success"
  | "error";

const CONFETTI_COLORS = ["#8b7ff5", "#a7efc2", "#ffc4ae", "#6a5de7", "#4fbf7a"];

function Confetti() {
  const pieces = Array.from({ length: 14 });
  return (
    <div className="mascot-confetti">
      {pieces.map((_, i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        const distance = 50 + ((i * 7) % 5) * 6;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance - 20;
        return (
          <span
            key={i}
            style={{
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              // @ts-expect-error custom property used by the confetti-burst keyframe
              "--confetti-end": `translate(${x}px, ${y}px)`,
              animationDelay: `${(i % 4) * 0.04}s`,
            }}
          />
        );
      })}
    </div>
  );
}

const INTRO_STORAGE_KEY = "doguri2-intro-seen";

// Peekaboo intro frames: hidden -> half-peek -> hidden again -> fully out & settled.
// clipPath hides the bottom of the sprite (as if tucked behind the search bar below
// it) and translateY nudges it down to sell the "popping up from behind" look.
const INTRO_FRAMES = [
  { clip: "inset(0 0 100% 0)", y: 44, transition: "none" },
  { clip: "inset(0 0 45% 0)", y: 20, transition: "clip-path 0.4s ease, transform 0.4s ease" },
  { clip: "inset(0 0 100% 0)", y: 44, transition: "clip-path 0.3s ease-in, transform 0.3s ease-in" },
  { clip: "inset(0 0 0% 0)", y: 0, transition: "clip-path 0.5s ease-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" },
];
const INTRO_STEP_DELAYS = [350, 500, 300]; // ms between successive frames after the first

interface AgentMascotProps {
  sprite: MascotSprite;
  label: string;
  isActive: boolean;
}

// Drag-anywhere-on-the-page behaviour, kept local to this component: pointer events
// only (no dependency), position stored as a fixed-layer offset from its default spot.
export function AgentMascot({ sprite, label, isActive }: AgentMascotProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ pointerX: 0, pointerY: 0, offsetX: 0, offsetY: 0 });

  const [introFrameIndex, setIntroFrameIndex] = useState(INTRO_FRAMES.length - 1);

  // First-ever visit (per browser): play the peekaboo intro, then remember it's done.
  // Everything lives in one useLayoutEffect (mount-once) so the "hidden" starting frame
  // is applied before first paint, and so the timer sequence doesn't depend on reading
  // state back from a second effect (which saw a stale closure and never fired).
  useLayoutEffect(() => {
    if (localStorage.getItem(INTRO_STORAGE_KEY)) return;

    const showHidden = () => setIntroFrameIndex(0);
    showHidden();

    const timers = INTRO_STEP_DELAYS.map((_, i) =>
      setTimeout(
        () => setIntroFrameIndex(i + 1),
        INTRO_STEP_DELAYS.slice(0, i + 1).reduce((a, b) => a + b, 0)
      )
    );
    const totalDelay = INTRO_STEP_DELAYS.reduce((a, b) => a + b, 0);
    timers.push(setTimeout(() => localStorage.setItem(INTRO_STORAGE_KEY, "1"), totalDelay + 200));

    return () => timers.forEach(clearTimeout);
  }, []);

  // While researching, the pet wanders near its usual spot; dragging always takes
  // priority, and it settles back to its default spot once the run finishes. Kept
  // close to the header (mostly sideways, slightly up) so it never drifts down over
  // the search bar below it.
  useEffect(() => {
    if (dragging) return;

    if (!isActive) {
      const frame = requestAnimationFrame(() => setOffset({ x: 0, y: 0 }));
      return () => cancelAnimationFrame(frame);
    }

    const wander = () => {
      const maxX = window.innerWidth * 0.28;
      const upReach = window.innerHeight * 0.14;
      const downReach = window.innerHeight * 0.04;
      setOffset({
        x: (Math.random() * 2 - 1) * maxX,
        y: -upReach + Math.random() * (upReach + downReach),
      });
    };

    wander();
    const interval = setInterval(wander, 3200);
    return () => clearInterval(interval);
  }, [isActive, dragging]);

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.offsetX + (e.clientX - dragStart.current.pointerX),
      y: dragStart.current.offsetY + (e.clientY - dragStart.current.pointerY),
    });
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  }

  const introFrame = INTRO_FRAMES[introFrameIndex];

  return (
    <div
      className="mascot-scene"
      style={{
        transform: `translate(${offset.x}px, ${offset.y + introFrame.y}px)`,
        transition: dragging
          ? "none"
          : introFrameIndex < INTRO_FRAMES.length - 1
            ? introFrame.transition
            : "transform 2.2s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div style={{ position: "relative", clipPath: introFrame.clip }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF sprite, no next/image processing needed */}
        <img
          key={sprite}
          src={`/mascot/${sprite}.gif`}
          alt={label}
          width={96}
          height={104}
          className="mascot-sprite"
          draggable={false}
        />
        {sprite === "success" && <Confetti />}
      </div>
      <span
        className="mascot-label"
        style={{
          opacity: introFrameIndex === 0 || introFrameIndex === 2 ? 0 : 1,
          transition: "opacity 0.25s ease",
        }}
      >
        {label}
      </span>
    </div>
  );
}
