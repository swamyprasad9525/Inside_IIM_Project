"use client";

import { useState } from "react";

const PARTICLE_COUNT = 9;
const RESPAWN_DELAY_MS = 2400;

let audioCtx: AudioContext | null = null;

function playPopSound() {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.13);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  } catch {
    // sound is a nice-to-have; never let it block the pop interaction
  }
}

interface BubbleBlobProps {
  className: string;
}

export function BubbleBlob({ className }: BubbleBlobProps) {
  const [popped, setPopped] = useState(false);

  function handlePop() {
    if (popped) return;
    setPopped(true);
    playPopSound();
    setTimeout(() => setPopped(false), RESPAWN_DELAY_MS);
  }

  return (
    <div className={`clay-blob ${className} ${popped ? "is-popped" : ""}`} onClick={handlePop}>
      {popped && (
        <>
          <span className="bubble-ripple" />
          <div className="bubble-burst">
            {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
              const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
              const distance = 34 + ((i * 5) % 4) * 10;
              const x = Math.cos(angle) * distance;
              const y = Math.sin(angle) * distance;
              return (
                <span
                  key={i}
                  style={{
                    // @ts-expect-error custom properties consumed by the bubble-burst-fly keyframe
                    "--burst-x": `${x}px`,
                    "--burst-y": `${y}px`,
                    animationDelay: `${(i % 3) * 0.03}s`,
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
