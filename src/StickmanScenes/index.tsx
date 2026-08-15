import { useCallback, useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  getStaticFiles,
  Sequence,
  staticFile,
  useDelayRender,
} from "remotion";
import { KaraokeCaption } from "./KaraokeCaption";
import { AIBackdropScenesLayer } from "./AIBackdropScenesLayer";
import { computeLiveBeats, liveStoryBeats as fallbackBeats, LiveBeat, RawLiveBeat } from "./story";

const FPS = 60;
const MUSIC_PATH = "scenes/music.mp3";
const LIVE_BEATS_PATH = "scenes/live_beats.json";
const hasMusic = () => getStaticFiles().some((f) => f.src === staticFile(MUSIC_PATH));
const hasLiveBeats = () => getStaticFiles().some((f) => f.src === staticFile(LIVE_BEATS_PATH));

// The automated pipeline (see automation/generate_story.py) writes a fresh
// scenes/live_beats.json every run — an ordered RawLiveBeat[] with a
// Pollinations-generated background image per beat. If it's not present
// (local dev / demo), fall back to the static sample story in story.ts.
const loadBeats = async (): Promise<LiveBeat[]> => {
  if (!hasLiveBeats()) return fallbackBeats;
  const res = await fetch(staticFile(LIVE_BEATS_PATH));
  const raw = (await res.json()) as RawLiveBeat[];
  return computeLiveBeats(raw);
};

export const calculateStickmanStoryMetadata: CalculateMetadataFunction<Record<string, unknown>> = async () => {
  const beats = await loadBeats();
  const last = beats[beats.length - 1];
  const totalSeconds = last.start + last.duration;
  return { fps: FPS, durationInFrames: Math.ceil(totalSeconds * FPS) };
};

export const StickmanStory: React.FC = () => {
  const [beats, setBeats] = useState<LiveBeat[]>([]);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());

  const load = useCallback(async () => {
    const data = await loadBeats();
    setBeats(data);
    continueRender(handle);
  }, [continueRender, handle]);

  useEffect(() => {
    load();
  }, [load]);

  if (beats.length === 0) {
    return <AbsoluteFill style={{ backgroundColor: "black" }} />;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AIBackdropScenesLayer beats={beats} />

      {beats.map((beat) => {
        const from = Math.round(beat.start * FPS);
        const durationInFrames = Math.round(beat.duration * FPS);
        return (
          <Sequence key={beat.index} from={from} durationInFrames={durationInFrames}>
            <KaraokeCaption words={beat.words} fallbackText={beat.text} />
            <Audio src={staticFile(beat.audio)} />
          </Sequence>
        );
      })}

      {hasMusic() ? <Audio src={staticFile(MUSIC_PATH)} volume={0.08} /> : null}
    </AbsoluteFill>
  );
};
