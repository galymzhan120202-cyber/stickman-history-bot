import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export type SentenceTiming = { text: string; start: number; duration: number };

// Long-form narration reads as full sentences, not TikTok-style word bursts —
// a simple fade/rise per sentence matches the doodle-storytime genre.
export const SentenceCaption: React.FC<{ sentence: SentenceTiming; fps: number }> = ({
  sentence,
  fps,
}) => {
  const frame = useCurrentFrame();
  const durFrames = sentence.duration * fps;
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durFrames - 10, durFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });
  const rise = interpolate(frame, [0, 10], [14, 0], { extrapolateRight: "clamp" });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 70 }}>
      <div
        style={{
          maxWidth: 1400,
          padding: "14px 34px",
          background: "rgba(10, 14, 30, 0.55)",
          borderRadius: 14,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 40,
          lineHeight: 1.35,
          color: "#fdf6e3",
          textAlign: "center",
          opacity,
          transform: `translateY(${rise}px)`,
        }}
      >
        {sentence.text}
      </div>
    </AbsoluteFill>
  );
};
