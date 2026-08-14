import { Env } from "./Scene";
import { Pose } from "./Stickman";

export type StoryBeat = {
  index: number;
  text: string;
  audio: string;
  start: number;
  duration: number;
  env: Env;
  pose: Pose;
};

export type RawBeat = { text: string; audio: string; duration: number; env: Env; pose: Pose };

// Ordered beats only need a duration (measured from the actual narration
// clip) — start times are derived automatically here, so inserting or
// reordering a beat never requires re-computing every timestamp by hand.
// Used both by the static fallback story below and by the automated
// pipeline's generated JSON (see index.tsx).
export const computeStoryBeats = (raw: RawBeat[]): StoryBeat[] => {
  let cursor = 0;
  return raw.map((b, i) => {
    const beat: StoryBeat = { index: i + 1, start: cursor, ...b };
    cursor += b.duration;
    return beat;
  });
};

// Static fallback story (used by the Root.tsx demo composition / local
// preview when no generated scenes/live_beats.json is present).
const RAW_BEATS: RawBeat[] = [
  {
    text: "Every year, thousands of hikers underestimate how fast a quiet mountain trail can turn deadly. This is one of those stories.",
    audio: "scenes/sm_narration_1.mp3",
    duration: 8.736,
    env: "forest-day",
    pose: "stand-wave",
  },
  {
    text: "He'd mapped this route a dozen times on paper. Paper never mentioned how loud silence gets when you're the only living thing for miles.",
    audio: "scenes/sm_narration_2.mp3",
    duration: 8.688,
    env: "forest-day",
    pose: "confused",
  },
  {
    text: "Three days into the solo hike, the trail disappeared under two feet of fresh snow. He'd trained for cold, but never for being completely, utterly alone.",
    audio: "scenes/sm_narration_3.mp3",
    duration: 10.92,
    env: "forest-day",
    pose: "walk",
  },
  {
    text: "The storm rolled in faster than the forecast promised, swallowing the ridge line in white and erasing every landmark he'd used to navigate.",
    audio: "scenes/sm_narration_4.mp3",
    duration: 8.352,
    env: "blizzard",
    pose: "walk",
  },
  {
    text: "By early afternoon he was no longer following a trail. He was following his own instincts, and even those were starting to feel unreliable.",
    audio: "scenes/sm_narration_5.mp3",
    duration: 9.408,
    env: "blizzard",
    pose: "confused",
  },
  {
    text: "Crossing the frozen creek felt like a bad idea the moment his boot cracked the surface, but backtracking meant losing what little daylight was left.",
    audio: "scenes/sm_narration_6.mp3",
    duration: 8.616,
    env: "frozen-river",
    pose: "walk",
  },
  {
    text: "By nightfall, he'd stripped pine branches into a makeshift shelter, packing snow along the edges and praying the wind wouldn't tear it apart.",
    audio: "scenes/sm_narration_7.mp3",
    duration: 8.544,
    env: "dusk-shelter",
    pose: "build",
  },
  {
    text: "The fire was the only thing standing between him and a cold that had killed hikers twice his experience. He fed it every scrap of dry wood he had.",
    audio: "scenes/sm_narration_8.mp3",
    duration: 9.48,
    env: "campfire-night",
    pose: "sit-fire",
  },
  {
    text: "Somewhere around midnight, his hands stopped shaking from cold and started shaking from exhaustion. Sleep felt dangerous, but staying awake felt almost impossible.",
    audio: "scenes/sm_narration_9.mp3",
    duration: 10.848,
    env: "campfire-night",
    pose: "sit-fire",
  },
  {
    text: "For a moment his mind drifted somewhere warmer, a summer afternoon, a full plate of food, his sister laughing at something he'd said.",
    audio: "scenes/sm_narration_10.mp3",
    duration: 8.184,
    env: "sunny-meadow",
    pose: "stand-wave",
  },
  {
    text: "He talked to himself just to hear a voice, counting his own heartbeat to stay conscious until the first grey light finally touched the trees.",
    audio: "scenes/sm_narration_11.mp3",
    duration: 8.232,
    env: "predawn",
    pose: "sit-fire",
  },
  {
    text: "At one point he thought he heard an engine. It was just wind. He kept listening anyway.",
    audio: "scenes/sm_narration_12.mp3",
    duration: 7.392,
    env: "predawn",
    pose: "confused",
  },
  {
    text: "When the search team's flashlights broke through the treeline at dawn, he was hypothermic and barely standing, but very much, unmistakably alive.",
    audio: "scenes/sm_narration_13.mp3",
    duration: 9.288,
    env: "dawn-rescue",
    pose: "stand-wave",
  },
  {
    text: "Two weeks later, wrapped in a hospital blanket instead of a snowbank, he said the same thing every rescued hiker says: never again, until the next trail.",
    audio: "scenes/sm_narration_14.mp3",
    duration: 9.936,
    env: "recovery-room",
    pose: "sit-fire",
  },
];

export const storyBeats: StoryBeat[] = computeStoryBeats(RAW_BEATS);
