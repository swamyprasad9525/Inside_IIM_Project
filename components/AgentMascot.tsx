"use client";

import { useRef, useState } from "react";

export type MascotState = "idle" | "thinking" | "running" | "success" | "error";

const LABELS: Record<MascotState, string> = {
  idle: "Ready when you are",
  thinking: "Thinking…",
  running: "Researching…",
  success: "Hurray! Done",
  error: "Hit a snag",
};

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

// Drag-anywhere-on-the-page behaviour, kept local to this component: pointer events
// only (no dependency), position stored as a fixed-layer offset from its default spot.
export function AgentMascot({ state }: { state: MascotState }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ pointerX: 0, pointerY: 0, offsetX: 0, offsetY: 0 });

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

  return (
    <div
      className="mascot-scene"
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF sprite, no next/image processing needed */}
        <img
          key={state}
          src={`/mascot/${state}.gif`}
          alt={LABELS[state]}
          width={96}
          height={104}
          className="mascot-sprite"
          draggable={false}
        />
        {state === "success" && <Confetti />}
      </div>
      <span className="mascot-label">{LABELS[state]}</span>
    </div>
  );
}
