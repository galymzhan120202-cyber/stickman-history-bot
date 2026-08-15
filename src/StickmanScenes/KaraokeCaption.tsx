import { Caption, createTikTokStyleCaptions } from "@remotion/captions";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export type WordTiming = { text: string; start: number; duration: number };

const SWITCH_CAPTIONS_EVERY_MS = 1400;
const ACCENT = "#ffd21e";

const boxStyle: React.CSSProperties = {
  maxWidth: 1400,
  padding: "14px 34px",
  background: "rgba(10, 14, 30, 0.55)",
  borderRadius: 14,
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 40,
  lineHeight: 1.35,
  color: "#fdf6e3",
  textAlign: "center",
};

// Highlights the exact word being spoken (edge-tts WordBoundary timing,
// see automation/generate_story.py) instead of showing a static full
// sentence for the whole beat — the single highest-leverage retention
// change found when researching how these channels caption their videos.
export const KaraokeCaption: React.FC<{ words: WordTiming[]; fallbackText: string }> = ({
  words,
  fallbackText,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;

  if (!words || words.length === 0) {
    return (
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 70 }}>
        <div style={boxStyle}>{fallbackText}</div>
      </AbsoluteFill>
    );
  }

  const captions: Caption[] = words.map((w) => ({
    text: w.text,
    startMs: w.start * 1000,
    endMs: (w.start + w.duration) * 1000,
    timestampMs: null,
    confidence: null,
  }));

  const { pages } = createTikTokStyleCaptions({
    combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
    captions,
  });

  const pageIndex = pages.findIndex((p, i) => {
    const nextStart = pages[i + 1]?.startMs ?? Infinity;
    return timeMs >= p.startMs && timeMs < nextStart;
  });
  const page = pages[pageIndex === -1 ? pages.length - 1 : pageIndex];
  if (!page) return null;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 70 }}>
      <div style={boxStyle}>
        {page.tokens.map((t) => {
          const active = timeMs >= t.fromMs && timeMs < t.toMs;
          return (
            <span key={t.fromMs} style={{ color: active ? ACCENT : "#fdf6e3" }}>
              {t.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
