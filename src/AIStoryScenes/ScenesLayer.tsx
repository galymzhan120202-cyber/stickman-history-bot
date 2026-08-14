import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Beat } from "./index";
import { KenBurnsImage } from "./KenBurnsImage";

const FPS = 60;
const CROSSFADE_FRAMES = 40;
const DIRECTIONS = ["in-right", "in-left", "out-right", "out-left"] as const;

// Renders the whole image timeline as one continuous layer (not per-beat
// <Sequence>s) so consecutive scenes can genuinely dissolve into each other
// instead of fading through black at the Sequence boundary.
export const ScenesLayer: React.FC<{ beats: Beat[] }> = ({ beats }) => {
  const frame = useCurrentFrame();

  let idx = beats.findIndex((b) => frame < Math.round((b.start + b.duration) * FPS));
  if (idx === -1) idx = beats.length - 1;
  const beat = beats[idx];
  const beatStartFrame = Math.round(beat.start * FPS);
  const beatDurFrames = Math.round(beat.duration * FPS);
  const localFrame = frame - beatStartFrame;

  const next = beats[idx + 1];
  const crossStart = beatDurFrames - CROSSFADE_FRAMES;
  const inCrossfade = Boolean(next) && localFrame > crossStart;
  const crossOpacity = inCrossfade
    ? interpolate(localFrame, [crossStart, beatDurFrames], [0, 1], { extrapolateRight: "clamp" })
    : 0;

  return (
    <AbsoluteFill>
      <KenBurnsImage
        src={beat.image}
        frame={localFrame}
        durationInFrames={beatDurFrames}
        direction={DIRECTIONS[idx % DIRECTIONS.length]}
      />
      {inCrossfade && next ? (
        <AbsoluteFill style={{ opacity: crossOpacity }}>
          <KenBurnsImage
            src={next.image}
            frame={0}
            durationInFrames={Math.round(next.duration * FPS)}
            direction={DIRECTIONS[(idx + 1) % DIRECTIONS.length]}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
