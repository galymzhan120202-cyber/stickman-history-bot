import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { INK, SketchyDefs } from "./Sketchy";

const STARS = [
  [120, 90], [260, 140], [420, 70], [610, 130], [820, 60], [980, 150],
  [1150, 85], [1320, 145], [1500, 75], [1680, 135], [1800, 95], [80, 200],
  [720, 40], [1420, 45],
];

const CLOUDS = [
  { x: 220, y: 110, s: 1 },
  { x: 900, y: 90, s: 0.8 },
  { x: 1600, y: 130, s: 1.15 },
];

const WIND_LINES = [
  { y: 460, len: 260, dur: 5 },
  { y: 520, len: 340, dur: 6.5 },
  { y: 600, len: 220, dur: 4.2 },
  { y: 690, len: 380, dur: 7 },
  { y: 780, len: 200, dur: 3.8 },
];

const Cloud: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#sketchy)">
    <path
      d="M0,20 Q-10,-10 30,0 Q40,-25 75,-5 Q110,-15 115,10 Q140,10 130,30 Q120,45 90,35 Q40,45 0,20 Z"
      fill="none"
      stroke="#e8f0fa"
      strokeWidth={3}
      opacity={0.55}
    />
  </g>
);

const Star: React.FC<{ x: number; y: number; frame: number; phase: number }> = ({
  x,
  y,
  frame,
  phase,
}) => {
  const twinkle = 0.5 + 0.5 * Math.sin(frame / 14 + phase);
  const r = 6;
  return (
    <path
      d={`M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`}
      fill="#fff8e0"
      opacity={0.35 + twinkle * 0.55}
    />
  );
};

const WindSwirl: React.FC<{ y: number; len: number; dur: number; frame: number; fps: number }> = ({
  y,
  len,
  dur,
  frame,
  fps,
}) => {
  const speed = len / dur; // px/sec
  const offset = ((frame / fps) * speed) % (1920 + len);
  const x = -len + offset;
  return (
    <path
      d={`M${x} ${y} Q${x + len * 0.25} ${y - 14} ${x + len * 0.5} ${y} T${x + len} ${y}`}
      fill="none"
      stroke="#8fa8bb"
      strokeWidth={3}
      opacity={0.5}
      filter="url(#sketchy)"
    />
  );
};

const Campfire: React.FC<{ frame: number }> = ({ frame }) => {
  const flicker = 1 + Math.sin(frame / 3.1) * 0.08 + Math.sin(frame / 1.7) * 0.04;
  const sway = Math.sin(frame / 5) * 3;

  return (
    <g transform="translate(1420 860)">
      {/* logs */}
      <g filter="url(#sketchy)" stroke={INK} strokeWidth={5} strokeLinecap="round">
        <line x1={-70} y1={20} x2={60} y2={-8} />
        <line x1={-60} y1={-6} x2={65} y2={22} />
        <line x1={-10} y1={26} x2={10} y2={-26} />
      </g>
      {/* flame */}
      <g transform={`translate(0 -10) scale(1 ${flicker}) rotate(${sway})`} filter="url(#sketchy)">
        <path
          d="M0,10 C-26,-10 -14,-40 0,-70 C14,-40 26,-10 0,10 Z"
          fill="#ff8a1e"
        />
        <path
          d="M0,4 C-14,-8 -8,-30 0,-48 C8,-30 14,-8 0,4 Z"
          fill="#ffd21e"
        />
      </g>
      {/* glow */}
      <circle cx={0} cy={-20} r={90} fill="#ff8a1e" opacity={0.12} />
    </g>
  );
};

const ShiveringCharacter: React.FC<{ frame: number }> = ({ frame }) => {
  const shiver = Math.sin(frame / 1.6) * 1.4;

  return (
    <g transform={`translate(560 900) rotate(${shiver})`} filter="url(#sketchy)" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round">
      {/* lying body + legs, curled toward the fire */}
      <path d="M0,0 Q90,-15 180,10 Q230,20 270,0" />
      <path d="M180,10 Q210,40 250,55" />
      <path d="M180,10 Q195,45 220,70" />
      <path d="M0,0 Q-20,-10 -35,-30" />
      {/* head */}
      <circle cx={-55} cy={-45} r={42} fill="#fff" />
      {/* scribble hair */}
      <path
        d="M-95,-55 Q-100,-90 -70,-88 Q-75,-105 -50,-95 Q-40,-112 -20,-92 Q-5,-100 -12,-72 Q-15,-95 -35,-80 Q-55,-98 -70,-75 Q-90,-85 -95,-55 Z"
        fill={INK}
      />
      {/* closed eye */}
      <path d="M-70,-40 Q-62,-34 -54,-40" strokeWidth={4} />
    </g>
  );
};

export const NightSnowCampfireScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.08]);
  const panX = interpolate(frame, [0, durationInFrames], [0, -30]);

  return (
    <svg
      viewBox={`0 0 1920 1080`}
      width={width}
      height={height}
      style={{ display: "block", background: "#16274f" }}
    >
      <SketchyDefs />
      <g style={{ transformOrigin: "50% 50%" }} transform={`scale(${zoom}) translate(${panX} 0)`}>
        {/* sky */}
        <rect x={0} y={0} width={1920} height={620} fill="#132258" />
        {STARS.map(([x, y], i) => (
          <Star key={i} x={x} y={y} frame={frame} phase={i * 1.3} />
        ))}
        {CLOUDS.map((c, i) => (
          <Cloud key={i} {...c} />
        ))}

        {/* horizon */}
        <path
          d="M0,610 Q480,580 960,615 T1920,600 L1920,1080 L0,1080 Z"
          fill="#cfe0ea"
          filter="url(#sketchy)"
        />

        {WIND_LINES.map((w, i) => (
          <WindSwirl key={i} {...w} frame={frame} fps={30} />
        ))}

        <Campfire frame={frame} />
        <ShiveringCharacter frame={frame} />
      </g>
    </svg>
  );
};
