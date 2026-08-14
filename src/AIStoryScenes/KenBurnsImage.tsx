import { AbsoluteFill, Easing, Img, interpolate, staticFile, useVideoConfig } from "remotion";

const ease = Easing.inOut(Easing.quad);

export const KenBurnsImage: React.FC<{
  src: string;
  frame: number;
  durationInFrames: number;
  direction: "in-right" | "in-left" | "out-right" | "out-left";
}> = ({ src, frame, durationInFrames, direction }) => {
  const { width, height } = useVideoConfig();

  const zoomingIn = direction.startsWith("in");
  const scale = zoomingIn
    ? interpolate(frame, [0, durationInFrames], [1.0, 1.14], { easing: ease })
    : interpolate(frame, [0, durationInFrames], [1.14, 1.0], { easing: ease });
  const panSignX = direction.endsWith("right") ? -1 : 1;
  const panX = interpolate(frame, [0, durationInFrames], [0, panSignX * 50], { easing: ease });
  const panY = interpolate(frame, [0, durationInFrames], [0, zoomingIn ? -18 : 18], { easing: ease });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale}) translate(${panX}px, ${panY}px)` }}>
        <Img src={staticFile(src)} style={{ width, height, objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.15) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
