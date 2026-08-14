import { useCallback, useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  cancelRender,
  Sequence,
  staticFile,
  useDelayRender,
} from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { SentenceCaption, SentenceTiming } from "./Captions";
import { NightSnowCampfireScene } from "./NightSnowCampfireScene";

export const calculateSurvivalDoodleMetadata: CalculateMetadataFunction<{
  narration: string;
  timestamps: string;
}> = async ({ props }) => {
  const fps = 30;
  const durationInSeconds = await getAudioDurationInSeconds(staticFile(props.narration));
  return { fps, durationInFrames: Math.ceil(durationInSeconds * fps) };
};

export const SurvivalDoodle: React.FC<{ narration: string; timestamps: string }> = ({
  narration,
  timestamps,
}) => {
  const [sentences, setSentences] = useState<SentenceTiming[]>([]);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());

  const load = useCallback(async () => {
    try {
      const res = await fetch(staticFile(timestamps));
      const data = (await res.json()) as SentenceTiming[];
      setSentences(data);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [continueRender, handle, timestamps]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <NightSnowCampfireScene />
      <Audio src={staticFile(narration)} />
      {sentences.map((s, i) => {
        const fps = 30;
        return (
          <Sequence key={i} from={Math.round(s.start * fps)} durationInFrames={Math.round(s.duration * fps)}>
            <SentenceCaption sentence={s} fps={fps} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
