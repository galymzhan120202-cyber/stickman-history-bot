import "./index.css";
import { Composition, Still, staticFile } from "remotion";
import {
  CaptionedVideo,
  calculateCaptionedVideoMetadata,
  captionedVideoSchema,
} from "./CaptionedVideo";
import { SurvivalDoodle, calculateSurvivalDoodleMetadata } from "./SurvivalDoodle";
import { AIStoryScenes, calculateAIStoryScenesMetadata } from "./AIStoryScenes";
import { StickmanStory, calculateStickmanStoryMetadata } from "./StickmanScenes";
import { ChannelBanner } from "./ChannelBanner";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Still id="ChannelBanner" component={ChannelBanner} width={2048} height={1152} />
      <Composition
        id="StickmanStory"
        component={StickmanStory}
        calculateMetadata={calculateStickmanStoryMetadata}
        width={1920}
        height={1080}
        fps={60}
      />
      <Composition
        id="AIStoryScenes"
        component={AIStoryScenes}
        calculateMetadata={calculateAIStoryScenesMetadata}
        width={1920}
        height={1080}
        fps={60}
        defaultProps={{
          beatsFile: "scenes/beats.json",
        }}
      />
      <Composition
        id="SurvivalDoodle"
        component={SurvivalDoodle}
        calculateMetadata={calculateSurvivalDoodleMetadata}
        width={1920}
        height={1080}
        fps={30}
        defaultProps={{
          narration: "survival_narration.mp3",
          timestamps: "survival_narration_timestamps.json",
        }}
      />
      <Composition
        id="CaptionedVideo"
        component={CaptionedVideo}
        calculateMetadata={calculateCaptionedVideoMetadata}
        schema={captionedVideoSchema}
        width={1080}
        height={1920}
        defaultProps={{
          src: staticFile("sample-video.mp4"),
        }}
      />
    </>
  );
};
