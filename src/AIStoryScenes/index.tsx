import { useCallback, useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  cancelRender,
  getStaticFiles,
  Sequence,
  staticFile,
  useDelayRender,
} from "remotion";
import { SentenceCaption } from "../SurvivalDoodle/Captions";
import { ScenesLayer } from "./ScenesLayer";

export type Beat = {
  index: number;
  text: string;
  audio: string;
  image: string;
  start: number;
  duration: number;
};

const FPS = 60;
const MUSIC_PATH = "scenes/music.mp3";
const hasMusic = () => getStaticFiles().some((f) => f.src === staticFile(MUSIC_PATH));

export const calculateAIStoryScenesMetadata: CalculateMetadataFunction<{
  beatsFile: string;
}> = async ({ props }) => {
  const res = await fetch(staticFile(props.beatsFile));
  const beats = (await res.json()) as Beat[];
  const last = beats[beats.length - 1];
  const totalSeconds = last.start + last.duration;
  return { fps: FPS, durationInFrames: Math.ceil(totalSeconds * FPS) };
};

export const AIStoryScenes: React.FC<{ beatsFile: string }> = ({ beatsFile }) => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());

  const load = useCallback(async () => {
    try {
      const res = await fetch(staticFile(beatsFile));
      const data = (await res.json()) as Beat[];
      setBeats(data);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [continueRender, handle, beatsFile]);

  useEffect(() => {
    load();
  }, [load]);

  if (beats.length === 0) {
    return <AbsoluteFill style={{ backgroundColor: "black" }} />;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <ScenesLayer beats={beats} />

      {beats.map((beat) => {
        const from = Math.round(beat.start * FPS);
        const durationInFrames = Math.round(beat.duration * FPS);
        return (
          <Sequence key={beat.index} from={from} durationInFrames={durationInFrames}>
            <SentenceCaption sentence={{ text: beat.text, start: 0, duration: beat.duration }} fps={FPS} />
            <Audio src={staticFile(beat.audio)} />
          </Sequence>
        );
      })}

      {hasMusic() ? <Audio src={staticFile(MUSIC_PATH)} volume={0.12} /> : null}
    </AbsoluteFill>
  );
};
