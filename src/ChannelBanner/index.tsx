import { AbsoluteFill } from "remotion";
import { Stickman, Pose } from "../StickmanScenes/Stickman";

const LINEUP: { pose: Pose; frame: number }[] = [
  { pose: "stand-wave", frame: 10 },
  { pose: "walk", frame: 8 },
  { pose: "confused", frame: 20 },
  { pose: "build", frame: 6 },
  { pose: "sit-fire", frame: 15 },
  { pose: "walk", frame: 2 },
  { pose: "stand-wave", frame: 40 },
];

const BG_BANDS = ["#ffd166", "#06d6a0", "#118ab2", "#ef476f", "#ffd166", "#06d6a0", "#118ab2"];

export const ChannelBanner: React.FC = () => {
  const w = 2048;
  const h = 1152;
  const cols = LINEUP.length;
  const colW = w / cols;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1b3e" }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
        {LINEUP.map((_, i) => (
          <rect key={i} x={i * colW} y={0} width={colW} height={h} fill={BG_BANDS[i]} opacity={0.16} />
        ))}
        <rect x={0} y={h - 140} width={w} height={140} fill="#ffffff" opacity={0.06} />

        {LINEUP.map((item, i) => (
          <Stickman
            key={i}
            pose={item.pose}
            frame={item.frame}
            x={colW * (i + 0.5)}
            y={h * 0.62}
            scale={3.4}
          />
        ))}

        <text
          x={w / 2}
          y={130}
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight={900}
          fontSize={92}
          fill="#ffffff"
          stroke="#0d1b3e"
          strokeWidth={4}
        >
          STICKMAN HISTORY
        </text>
        <text
          x={w / 2}
          y={195}
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight={600}
          fontSize={40}
          fill="#ffd166"
        >
          Survival stories, animated
        </text>
      </svg>
    </AbsoluteFill>
  );
};
