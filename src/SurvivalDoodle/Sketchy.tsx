import { useCurrentFrame } from "remotion";

// Hand-drawn line-wobble filter, shared by every doodle scene. The seed steps
// every 6 frames (not every frame) so linework subtly "redraws" itself like a
// whiteboard-animation channel, without turning into distracting noise.
export const SketchyDefs: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 6) % 100;

  return (
    <defs>
      <filter id="sketchy" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.012 0.018"
          numOctaves={2}
          seed={seed}
          result="noise"
        />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale={5} />
      </filter>
    </defs>
  );
};

export const INK = "#1a1a1a";
