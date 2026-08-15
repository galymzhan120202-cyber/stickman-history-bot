import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AIBackdropScene } from "./AIBackdropScene";
import { LiveBeat } from "./story";
import { hashString, seededRandom } from "./seededRandom";

const FPS = 60;
const CROSSFADE_FRAMES = 30;

export const AIBackdropScenesLayer: React.FC<{ beats: LiveBeat[] }> = ({ beats }) => {
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

  const mirrorFor = (b: LiveBeat) => seededRandom(hashString(b.text)) > 0.5;

  return (
    <AbsoluteFill>
      <AIBackdropScene
        image={beat.image}
        pose={beat.pose}
        frame={localFrame}
        durationInFrames={beatDurFrames}
        cold={beat.cold}
        mirror={mirrorFor(beat)}
      />
      {inCrossfade && next ? (
        <AbsoluteFill style={{ opacity: crossOpacity }}>
          <AIBackdropScene
            image={next.image}
            pose={next.pose}
            frame={0}
            durationInFrames={Math.round(next.duration * FPS)}
            cold={next.cold}
            mirror={mirrorFor(next)}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
