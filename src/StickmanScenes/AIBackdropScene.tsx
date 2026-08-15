import { AbsoluteFill, Easing, Img, interpolate, staticFile, useVideoConfig } from "remotion";
import { Pose, Stickman } from "./Stickman";

const ease = Easing.inOut(Easing.quad);

// Same idea as the procedural StickmanScene, but the environment is a
// real AI-generated image (Pollinations, see automation/generate_story.py)
// instead of hand-coded SVG sky/trees/mountains. The character stays 100%
// procedural — only the backdrop behind it changes.
export const AIBackdropScene: React.FC<{
  image: string;
  pose: Pose;
  frame: number;
  durationInFrames: number;
  cold?: boolean;
  mirror?: boolean;
}> = ({ image, pose, frame, durationInFrames, cold = false, mirror = false }) => {
  const { width, height } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.12], { easing: ease });
  const panSignX = mirror ? 1 : -1;
  const panX = interpolate(frame, [0, durationInFrames], [0, panSignX * 45], { easing: ease });

  const charX =
    pose === "walk"
      ? interpolate(frame, [0, durationInFrames], [mirror ? 1100 : 820, mirror ? 820 : 1020], { easing: ease })
      : 960;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale}) translateX(${panX}px)` }}>
        <Img
          src={staticFile(image)}
          style={{
            width,
            height,
            objectFit: "cover",
            transform: mirror ? "scaleX(-1)" : undefined,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.08) 35%, rgba(0,0,0,0.2) 100%)",
        }}
      />
      <svg viewBox="0 0 1920 1080" width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <Stickman pose={pose} frame={frame} x={charX} y={590} scale={2.6} windy={cold} cold={cold} />
      </svg>
    </AbsoluteFill>
  );
};
