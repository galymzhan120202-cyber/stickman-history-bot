import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { StickmanScene } from "./Scene";
import { StoryBeat } from "./story";

const FPS = 60;
const CROSSFADE_FRAMES = 40;

export const StickmanScenesLayer: React.FC<{ beats: StoryBeat[] }> = ({ beats }) => {
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
      <StickmanScene env={beat.env} pose={beat.pose} frame={localFrame} durationInFrames={beatDurFrames} seed={beat.text} />
      {inCrossfade && next ? (
        <AbsoluteFill style={{ opacity: crossOpacity }}>
          <StickmanScene
            env={next.env}
            pose={next.pose}
            frame={0}
            durationInFrames={Math.round(next.duration * FPS)}
            seed={next.text}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
