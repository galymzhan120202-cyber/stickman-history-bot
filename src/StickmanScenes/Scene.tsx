import { Easing, interpolate, useVideoConfig } from "remotion";

const cameraEase = Easing.inOut(Easing.quad);
import { Pose, Stickman } from "./Stickman";
import { hashString, seededRandom } from "./seededRandom";

export type Env =
  | "forest-day"
  | "blizzard"
  | "dusk-shelter"
  | "campfire-night"
  | "predawn"
  | "dawn-rescue"
  | "frozen-river"
  | "sunny-meadow"
  | "recovery-room";

type EnvConfig = {
  sky: [string, string];
  ground: [string, string];
  stars: boolean;
  snowfall: boolean;
  fire: "big" | "small" | "none";
  shelter: boolean;
  clouds: boolean;
  rescueLights: boolean;
  treeColor: [string, string];
  sun: "day" | "dusk" | "dawn" | "none";
  mountains: [string, string] | null;
  river: boolean;
  indoor: boolean;
};

const ENV: Record<Env, EnvConfig> = {
  "forest-day": {
    sky: ["#7ec8ff", "#cdeeff"],
    ground: ["#8fd66a", "#4f9e3a"],
    stars: false, snowfall: false, fire: "none", shelter: false, clouds: true, rescueLights: false,
    treeColor: ["#3fb857", "#28843a"], sun: "day",
    mountains: ["#a9c8e8", "#8fb3d9"], river: false, indoor: false,
  },
  blizzard: {
    sky: ["#9db4d6", "#dbe7f4"],
    ground: ["#ffffff", "#c9d9ec"],
    stars: false, snowfall: true, fire: "none", shelter: false, clouds: false, rescueLights: false,
    treeColor: ["#7590b3", "#4d6485"], sun: "none",
    mountains: ["#c3d3e6", "#a9bdd6"], river: false, indoor: false,
  },
  "dusk-shelter": {
    sky: ["#ffb066", "#7a5aa8"],
    ground: ["#f3ecff", "#c9c2e8"],
    stars: false, snowfall: true, fire: "none", shelter: true, clouds: false, rescueLights: false,
    treeColor: ["#5a3f7c", "#3a2857"], sun: "dusk",
    mountains: ["#9a7ab8", "#7a5aa0"], river: false, indoor: false,
  },
  "campfire-night": {
    sky: ["#13205c", "#3a4f8f"],
    ground: ["#e8effa", "#aebedb"],
    stars: true, snowfall: false, fire: "big", shelter: false, clouds: false, rescueLights: false,
    treeColor: ["#1c2d5c", "#101a3a"], sun: "none",
    mountains: ["#243a7a", "#182a5c"], river: false, indoor: false,
  },
  predawn: {
    sky: ["#3d5490", "#8ba3d4"],
    ground: ["#eef2fb", "#c3cee6"],
    stars: true, snowfall: false, fire: "small", shelter: false, clouds: false, rescueLights: false,
    treeColor: ["#456196", "#2d4166"], sun: "none",
    mountains: ["#5870ac", "#425388"], river: false, indoor: false,
  },
  "dawn-rescue": {
    sky: ["#ffdd8a", "#8fcaff"],
    ground: ["#fff3dc", "#f3cf9a"],
    stars: false, snowfall: false, fire: "none", shelter: false, clouds: true, rescueLights: true,
    treeColor: ["#6a5a97", "#4a3f6b"], sun: "dawn",
    mountains: ["#f0c896", "#e0ac7a"], river: false, indoor: false,
  },
  "frozen-river": {
    sky: ["#8fa8c9", "#c9dbee"],
    ground: ["#eef4fb", "#c9d9ec"],
    stars: false, snowfall: true, fire: "none", shelter: false, clouds: false, rescueLights: false,
    treeColor: ["#7590b3", "#4d6485"], sun: "none",
    mountains: ["#b9cbe0", "#9db3cc"], river: true, indoor: false,
  },
  "sunny-meadow": {
    sky: ["#ffe9a8", "#bfe8ff"],
    ground: ["#bdec7c", "#7fc94a"],
    stars: false, snowfall: false, fire: "none", shelter: false, clouds: true, rescueLights: false,
    treeColor: ["#5fd472", "#37a34e"], sun: "day",
    mountains: null, river: false, indoor: false,
  },
  "recovery-room": {
    sky: ["#fff3df", "#ffe3bd"],
    ground: ["#e8cfa8", "#d1b48c"],
    stars: false, snowfall: false, fire: "none", shelter: false, clouds: false, rescueLights: false,
    treeColor: ["#c9c9c9", "#c9c9c9"], sun: "none",
    mountains: null, river: false, indoor: true,
  },
};

const TREE_X = [140, 260, 1660, 1780, 340, 1540, 60, 1860, 480, 1420];

const Mountains: React.FC<{ colors: [string, string] }> = ({ colors }) => (
  <g opacity={0.75}>
    <path d="M-50,700 L280,420 L560,620 L820,380 L1100,640 L1380,400 L1650,620 L1970,460 L1970,700 Z" fill={colors[1]} />
    <path d="M-50,720 L200,540 L480,680 L760,500 L1040,700 L1320,520 L1600,700 L1970,560 L1970,720 Z" fill={colors[0]} opacity={0.85} />
  </g>
);

const ForegroundSnow: React.FC<{ color: string }> = ({ color }) => (
  <g opacity={0.9}>
    <ellipse cx={120} cy={1040} rx={260} ry={90} fill={color} />
    <ellipse cx={1780} cy={1060} rx={300} ry={100} fill={color} />
  </g>
);

const River: React.FC<{ frame: number }> = ({ frame }) => {
  const shimmer = 0.5 + 0.5 * Math.sin(frame / 14);
  return (
    <g>
      <path d="M-50,860 Q500,820 960,850 T1970,830 L1970,940 Q960,970 -50,940 Z" fill="#bfe0f0" opacity={0.9} />
      <path d="M-50,860 Q500,820 960,850 T1970,830" fill="none" stroke="#ffffff" strokeWidth={4} opacity={0.4 + shimmer * 0.3} />
      {[220, 560, 900, 1300, 1650].map((x, i) => (
        <path key={i} d={`M${x},870 L${x + 40},900 L${x + 10},905`} stroke="#9fc4d8" strokeWidth={3} fill="none" opacity={0.6} />
      ))}
    </g>
  );
};

const RoomBackdrop: React.FC = () => (
  <g>
    <rect x={0} y={0} width={1920} height={1080} fill="#f6e6cf" />
    <rect x={1280} y={140} width={480} height={380} fill="#bfe4ff" stroke="#8a6a45" strokeWidth={16} />
    <rect x={1280} y={140} width={480} height={380} fill="none" stroke="#8a6a45" strokeWidth={6} />
    <line x1={1520} y1={140} x2={1520} y2={520} stroke="#8a6a45" strokeWidth={8} />
    <line x1={1280} y1={330} x2={1760} y2={330} stroke="#8a6a45" strokeWidth={8} />
    <circle cx={1600} cy={230} r={46} fill="#fff3b0" opacity={0.85} />
    <rect x={0} y={860} width={1920} height={220} fill="#d1b48c" />
    <line x1={0} y1={860} x2={1920} y2={860} stroke="#a98a5f" strokeWidth={6} />
  </g>
);

const Tree: React.FC<{ x: number; i: number; colors: [string, string]; frame: number }> = ({ x, i, colors, frame }) => {
  const sway = Math.sin(frame / 55 + i * 1.7) * 2.2;
  const [light, dark] = colors;
  const hueShift = (i % 3) * 3 - 3; // per-tree brightness variance so a row of trees doesn't read as one stamp
  const s = 0.85 + (i % 4) * 0.08;
  return (
    <g transform={`translate(${x} 730) scale(${s})`}>
      <ellipse cx={0} cy={4} rx={44} ry={10} fill="#000000" opacity={0.16} />
      <rect x={-7} y={-36} width={14} height={40} fill="#6b4226" />
      <rect x={-7} y={-36} width={5} height={40} fill="#8a5a35" opacity={0.6} />
      <g style={{ transformOrigin: "0px -38px" }} transform={`rotate(${sway})`} opacity={1 - hueShift * 0.02}>
        <path d="M-60,-36 L0,-95 L60,-36 Z" fill={dark} />
        <path d="M-46,-70 L0,-125 L46,-70 Z" fill={dark} />
        <path d="M-34,-102 L0,-155 L34,-102 Z" fill={dark} />
        <path d="M-60,-36 L0,-95 L60,-36 Z" fill={light} opacity={0.55} transform="translate(-8 5) scale(0.88)" />
        <path d="M-46,-70 L0,-125 L46,-70 Z" fill={light} opacity={0.55} transform="translate(-6 4) scale(0.88)" />
        <path d="M-34,-102 L0,-155 L34,-102 Z" fill={light} opacity={0.55} transform="translate(-5 3) scale(0.88)" />
      </g>
    </g>
  );
};

const HorizonHaze: React.FC = () => (
  <rect x={0} y={640} width={1920} height={140} fill="url(#hazeGrad)" opacity={0.5} style={{ pointerEvents: "none" }} />
);

const Embers: React.FC<{ frame: number; originX: number; originY: number }> = ({ frame, originX, originY }) => {
  const embers = Array.from({ length: 10 }, (_, i) => {
    const seed = i * 41 + 7;
    const life = (frame + seed * 6) % 90;
    const t = life / 90;
    const drift = (seededRandom(seed) - 0.5) * 70;
    return { x: originX + drift * t, y: originY - t * 140, r: 4 * (1 - t) + 1, o: 1 - t };
  });
  return (
    <g>
      {embers.map((e, i) => (
        <circle key={i} cx={e.x} cy={e.y} r={e.r} fill="#ffb84d" opacity={e.o * 0.9} />
      ))}
    </g>
  );
};

const Fire: React.FC<{ size: "big" | "small"; frame: number }> = ({ size, frame }) => {
  const scale = size === "big" ? 1 : 0.55;
  const flicker = 1 + Math.sin(frame / 3) * 0.09 + Math.sin(frame / 1.4) * 0.03;
  const sway = Math.sin(frame / 5) * 3;
  return (
    <g transform={`translate(1500 780) scale(${scale})`}>
      <ellipse cx={0} cy={14} rx={70} ry={14} fill="#000000" opacity={0.18} />
      <g stroke="#5c3a21" strokeWidth={7} strokeLinecap="round">
        <line x1={-40} y1={10} x2={35} y2={-6} />
        <line x1={-35} y1={-4} x2={38} y2={12} />
        <line x1={-8} y1={14} x2={6} y2={-18} />
      </g>
      <g transform={`scale(1 ${flicker}) rotate(${sway})`} style={{ transformOrigin: "0px 10px" }}>
        <path d="M0,10 C-24,-10 -14,-38 0,-68 C14,-38 24,-10 0,10 Z" fill="#ff7a12" />
        <path d="M0,6 C-15,-8 -8,-28 0,-50 C8,-28 15,-8 0,6 Z" fill="#ffab1e" />
        <path d="M0,2 C-8,-6 -4,-18 0,-32 C4,-18 8,-6 0,2 Z" fill="#ffe066" />
      </g>
      <circle cx={0} cy={-15} r={130 * scale} fill="#ff8a1e" opacity={0.16} />
      <Embers frame={frame} originX={0} originY={-20} />
    </g>
  );
};

const Snowfall: React.FC<{ frame: number }> = ({ frame }) => {
  const flakes = Array.from({ length: 55 }, (_, i) => {
    const seedX = (i * 137) % 1920;
    const speed = 55 + (i % 6) * 22;
    const y = ((frame * speed) / 30 + i * 47) % 1150;
    const x = seedX + Math.sin(frame / 22 + i) * 34;
    return { x, y, r: 2.5 + (i % 4) };
  });
  return (
    <g>
      {flakes.map((f, i) => (
        <circle key={i} cx={f.x} cy={f.y} r={f.r} fill="#ffffff" opacity={0.85} />
      ))}
    </g>
  );
};

const Stars: React.FC<{ frame: number }> = ({ frame }) => {
  const pts = [
    [120, 90], [300, 60], [480, 120], [700, 50], [900, 100], [1100, 70],
    [1300, 110], [1500, 60], [1700, 95], [1820, 55], [220, 150], [1000, 40],
    [620, 180], [1620, 160],
  ];
  return (
    <g>
      {pts.map(([x, y], i) => {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(frame / 15 + i * 1.3));
        const r = 3 + (i % 3);
        return (
          <path
            key={i}
            transform={`translate(${x} ${y})`}
            d={`M0,${-r} L${r * 0.3},${-r * 0.3} L${r},0 L${r * 0.3},${r * 0.3} L0,${r} L${-r * 0.3},${r * 0.3} L${-r},0 L${-r * 0.3},${-r * 0.3} Z`}
            fill="#fff8d6"
            opacity={tw}
          />
        );
      })}
    </g>
  );
};

const Sun: React.FC<{ kind: "day" | "dusk" | "dawn" }> = ({ kind }) => {
  const cfg = {
    day: { x: 1560, y: 150, r: 70, color: "#fff6c8" },
    dusk: { x: 1500, y: 250, r: 90, color: "#ffcf8a" },
    dawn: { x: 500, y: 560, r: 100, color: "#ffe4a3" },
  }[kind];
  return (
    <g>
      <circle cx={cfg.x} cy={cfg.y} r={cfg.r * 1.8} fill={cfg.color} opacity={0.25} />
      <circle cx={cfg.x} cy={cfg.y} r={cfg.r} fill={cfg.color} opacity={0.95} />
    </g>
  );
};

const Clouds: React.FC = () => (
  <g fill="#ffffff" opacity={0.92}>
    <g transform="translate(300 130)">
      <ellipse cx={0} cy={0} rx={70} ry={26} />
      <ellipse cx={45} cy={-10} rx={45} ry={22} />
      <ellipse cx={-45} cy={-6} rx={40} ry={20} />
    </g>
    <g transform="translate(1550 160)">
      <ellipse cx={0} cy={0} rx={60} ry={22} />
      <ellipse cx={40} cy={-8} rx={38} ry={18} />
    </g>
    <g transform="translate(900 90)" opacity={0.7}>
      <ellipse cx={0} cy={0} rx={50} ry={18} />
    </g>
  </g>
);

const Shelter: React.FC = () => (
  <g transform="translate(1150 770)">
    <ellipse cx={0} cy={6} rx={170} ry={16} fill="#000000" opacity={0.16} />
    <path d="M-160,0 L0,-160 L160,0 Z" fill="#b9764a" stroke="#5c3a21" strokeWidth={6} />
    <path d="M-160,0 L0,-160 L160,0 Z" fill="#8a5230" opacity={0.4} transform="translate(8 6) scale(0.94)" />
    <path d="M-120,0 L0,-120 L120,0 Z" fill="#2c1c12" />
    <path d="M-120,0 L20,-100" stroke="#ff8a1e" strokeWidth={4} opacity={0.5} />
    <rect x={-160} y={-6} width={320} height={16} fill="#f3f7fc" />
  </g>
);

const RescueLights: React.FC<{ frame: number }> = ({ frame }) => (
  <g>
    {[1420, 1520, 1620].map((x, i) => {
      const tw = 0.5 + 0.5 * Math.sin(frame / 6 + i * 2);
      return (
        <g key={i}>
          <circle cx={x} cy={640 + i * 10} r={22} fill="#fff3b0" opacity={tw * 0.25} />
          <circle cx={x} cy={640 + i * 10} r={9} fill="#fff3b0" opacity={tw} />
        </g>
      );
    })}
  </g>
);

const SnowTexture: React.FC<{ env: Env }> = ({ env }) => {
  const dots = Array.from({ length: 60 }, (_, i) => {
    const seed = hashString(env + i);
    return { x: seededRandom(seed) * 1920, y: 780 + seededRandom(seed + 1) * 260, r: 2 + seededRandom(seed + 2) * 3 };
  });
  return (
    <g opacity={0.5}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#ffffff" />
      ))}
    </g>
  );
};

const NO_SNOW_TEXTURE: Env[] = ["forest-day", "sunny-meadow", "recovery-room"];

export const StickmanScene: React.FC<{ env: Env; pose: Pose; frame: number; durationInFrames: number }> = ({
  env,
  pose,
  frame,
  durationInFrames,
}) => {
  const cfg = ENV[env];
  const { width, height } = useVideoConfig();

  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.06], { easing: cameraEase });
  const panX = interpolate(frame, [0, durationInFrames], [0, -14], { easing: cameraEase });
  const charX =
    pose === "walk"
      ? interpolate(frame, [0, durationInFrames], [820, 1020], { easing: cameraEase })
      : 900;
  const CHAR_SCALE = 2.6;

  if (cfg.indoor) {
    return (
      <svg viewBox="0 0 1920 1080" width={width} height={height} style={{ display: "block" }}>
        <g transform={`scale(${zoom}) translate(${panX} 0)`} style={{ transformOrigin: "50% 50%" }}>
          <RoomBackdrop />
          <Stickman pose={pose} frame={frame} x={900} y={560} scale={CHAR_SCALE} />
        </g>
        <VignetteOverlay />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 1920 1080" width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sky-${env}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cfg.sky[0]} />
          <stop offset="100%" stopColor={cfg.sky[1]} />
        </linearGradient>
        <linearGradient id={`ground-${env}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cfg.ground[0]} />
          <stop offset="100%" stopColor={cfg.ground[1]} />
        </linearGradient>
        <linearGradient id="hazeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0.9} />
        </linearGradient>
      </defs>
      <g transform={`scale(${zoom}) translate(${panX} 0)`} style={{ transformOrigin: "50% 50%" }}>
        <rect x={0} y={0} width={1920} height={760} fill={`url(#sky-${env})`} />
        {cfg.sun !== "none" ? <Sun kind={cfg.sun} /> : null}
        {cfg.stars ? <Stars frame={frame} /> : null}
        {cfg.clouds ? <Clouds /> : null}
        {cfg.mountains ? <Mountains colors={cfg.mountains} /> : null}
        <HorizonHaze />

        <rect x={0} y={720} width={1920} height={360} fill={`url(#ground-${env})`} />
        {cfg.river ? <River frame={frame} /> : null}
        {!NO_SNOW_TEXTURE.includes(env) ? <SnowTexture env={env} /> : null}

        {TREE_X.map((x, i) => (
          <Tree key={i} x={x} i={i} colors={cfg.treeColor} frame={frame} />
        ))}

        {cfg.shelter ? <Shelter /> : null}
        {cfg.fire !== "none" ? <Fire size={cfg.fire} frame={frame} /> : null}
        {cfg.rescueLights ? <RescueLights frame={frame} /> : null}

        <Stickman
          pose={pose}
          frame={frame}
          x={charX}
          y={590}
          scale={CHAR_SCALE}
          windy={env === "blizzard" || cfg.snowfall}
          cold={cfg.snowfall || env === "campfire-night" || env === "predawn"}
        />

        {cfg.snowfall ? <Snowfall frame={frame} /> : null}
        {cfg.snowfall ? <ForegroundSnow color={cfg.ground[0]} /> : null}
      </g>
      <VignetteOverlay />
    </svg>
  );
};

const VignetteOverlay: React.FC = () => (
  <>
    <rect x={0} y={0} width={1920} height={1080} fill="url(#vignette)" opacity={0.35} style={{ pointerEvents: "none" }} />
    <defs>
      <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
        <stop offset="60%" stopColor="#000000" stopOpacity={0} />
        <stop offset="100%" stopColor="#000000" stopOpacity={0.55} />
      </radialGradient>
    </defs>
  </>
);
