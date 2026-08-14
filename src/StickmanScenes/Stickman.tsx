export type Pose = "walk" | "confused" | "build" | "sit-fire" | "stand-wave";

const INK = "#1c1c1c";
const HAIR = "#6b4a2b";
const CAPE = "#3f6fb5";
const CAPE_DARK = "#2d5290";
const SCARF = "#e0533d";

type Angles = {
  headTilt: number;
  bodyLean: number;
  bob: number;
  lUpperArm: number; lLowerArm: number;
  rUpperArm: number; rLowerArm: number;
  lUpperLeg: number; lLowerLeg: number;
  rUpperLeg: number; rLowerLeg: number;
  breathe: number;
};

const deg = (r: number) => (r * Math.PI) / 180;

const poseAngles = (pose: Pose, frame: number): Angles => {
  const breathe = 1 + Math.sin(frame / 22) * 0.015;

  if (pose === "walk") {
    const c = Math.sin(frame / 6.2);
    const c2 = Math.sin(frame / 6.2 + Math.PI);
    return {
      headTilt: c * 3,
      bodyLean: 6 + c * 2,
      bob: Math.abs(Math.cos(frame / 6.2)) * -10,
      lUpperArm: c * 40, lLowerArm: 15 + Math.abs(c) * 25,
      rUpperArm: c2 * 40, rLowerArm: 15 + Math.abs(c2) * 25,
      lUpperLeg: c * 34, lLowerLeg: Math.max(0, c) * 45,
      rUpperLeg: c2 * 34, rLowerLeg: Math.max(0, c2) * 45,
      breathe,
    };
  }
  if (pose === "confused") {
    const sway = Math.sin(frame / 16);
    return {
      headTilt: sway * 10,
      bodyLean: sway * 4,
      bob: Math.sin(frame / 20) * 4,
      lUpperArm: -20 + sway * 12, lLowerArm: 20,
      rUpperArm: 35 - sway * 10, rLowerArm: 30,
      lUpperLeg: -4, lLowerLeg: 4,
      rUpperLeg: 4, rLowerLeg: 4,
      breathe,
    };
  }
  if (pose === "build") {
    const chop = Math.max(0, Math.sin(frame / 4));
    return {
      headTilt: -6,
      bodyLean: 14,
      bob: -chop * 8,
      lUpperArm: -50, lLowerArm: 30,
      rUpperArm: -110 + chop * 55, rLowerArm: 20,
      lUpperLeg: -8, lLowerLeg: 10,
      rUpperLeg: 10, rLowerLeg: 6,
      breathe,
    };
  }
  if (pose === "sit-fire") {
    const shiver = Math.sin(frame * 1.8) * 1.2;
    return {
      headTilt: shiver,
      bodyLean: shiver * 0.6,
      bob: Math.sin(frame / 26) * 2,
      lUpperArm: 55 + shiver, lLowerArm: 70,
      rUpperArm: -55 - shiver, rLowerArm: 70,
      lUpperLeg: 80, lLowerLeg: 100,
      rUpperLeg: -80, rLowerLeg: 100,
      breathe,
    };
  }
  // stand-wave
  const wave = Math.sin(frame / 5);
  return {
    headTilt: 4,
    bodyLean: 0,
    bob: Math.sin(frame / 15) * 2,
    lUpperArm: -10, lLowerArm: 6,
    rUpperArm: -150 + wave * 22, rLowerArm: 20,
    lUpperLeg: -3, lLowerLeg: 3,
    rUpperLeg: 3, rLowerLeg: 3,
    breathe,
  };
};

// Pure thin-line limb (shoulder/elbow/hand, hip/knee/foot) — no filled
// sleeves or boots, just a bent black stroke with rounded joints. This is
// what makes it read as a classic "explainer" stick figure instead of a
// puffy mascot, while the two-segment angles still give it real joints.
const Limb: React.FC<{
  originX: number; originY: number;
  upperAngle: number; lowerAngle: number;
  upperLen: number; lowerLen: number;
  width: number;
}> = ({ originX, originY, upperAngle, lowerAngle, upperLen, lowerLen, width }) => {
  const a1 = deg(upperAngle);
  const jointX = originX + Math.sin(a1) * upperLen;
  const jointY = originY + Math.cos(a1) * upperLen;
  const a2 = deg(upperAngle + lowerAngle);
  const endX = jointX + Math.sin(a2) * lowerLen;
  const endY = jointY + Math.cos(a2) * lowerLen;

  return (
    <path
      d={`M${originX},${originY} L${jointX},${jointY} L${endX},${endY}`}
      stroke={INK}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
};

// A two-segment-limb rig (shoulder/elbow/hand, hip/knee/foot) driven by small
// per-pose angle functions — this is what makes poses read as actual body
// mechanics instead of straight stick lines, and lets new poses reuse the
// same rig by just supplying new angle numbers.
export const Stickman: React.FC<{
  pose: Pose;
  frame: number;
  x: number;
  y: number;
  scale?: number;
  windy?: boolean;
  cold?: boolean;
}> = ({ pose, frame, x, y, scale = 1, windy = false, cold = false }) => {
  const a = poseAngles(pose, frame);
  const blink = Math.sin(frame / 45) > 0.97;
  const gust = windy ? Math.sin(frame / 4.2) * 14 + 22 : Math.sin(frame / 10) * 6;
  const worried = pose === "confused" || pose === "sit-fire";

  return (
    <g transform={`translate(${x} ${y + a.bob}) scale(${scale}) rotate(${a.bodyLean})`}>
      {/* ground shadow */}
      <ellipse cx={0} cy={148} rx={40} ry={10} fill="#000000" opacity={0.2} />

      {/* back leg first so front leg overlaps naturally */}
      <Limb originX={8} originY={54} upperAngle={a.rUpperLeg} lowerAngle={a.rLowerLeg} upperLen={38} lowerLen={34} width={9} />
      {/* front leg */}
      <Limb originX={-8} originY={54} upperAngle={a.lUpperLeg} lowerAngle={a.lLowerLeg} upperLen={38} lowerLen={34} width={9} />

      {/* spine */}
      <line x1={0} y1={-4} x2={0} y2={54} stroke={INK} strokeWidth={9} strokeLinecap="round" />

      {/* simple fur-trimmed cape for the winter setting — small enough to keep the pure-stick silhouette */}
      <g transform={`scale(1 ${a.breathe})`} style={{ transformOrigin: "0px 30px" }}>
        <path d="M-24,-4 Q0,10 24,-4 L20,46 L10,38 L0,50 L-10,38 L-20,46 Z" fill={CAPE} stroke={INK} strokeWidth={3.5} />
        <path d="M-24,-4 Q0,10 24,-4 L22,10 Q0,20 -22,10 Z" fill={CAPE_DARK} opacity={0.6} />
        <path d="M-16,-2 Q0,8 16,-2 L13,10 Q0,16 -13,10 Z" fill={SCARF} stroke={INK} strokeWidth={2.2} />
        <path
          d={`M12,4 Q${22 + gust},14 ${16 + gust * 1.4},34 Q${11 + gust},42 ${17 + gust * 1.2},56`}
          fill="none"
          stroke={SCARF}
          strokeWidth={7}
          strokeLinecap="round"
        />
      </g>

      {/* back arm */}
      <Limb originX={14} originY={0} upperAngle={a.rUpperArm} lowerAngle={a.rLowerArm} upperLen={32} lowerLen={30} width={8} />

      {/* head — deliberately oversized vs. the body (chibi proportions), matching the reference */}
      <g transform={`rotate(${a.headTilt}) scale(1.28)`}>
        <circle cx={0} cy={-32} r={29} fill="#fdfaf3" stroke={INK} strokeWidth={3.6} />

        {/* messy scribble hair */}
        <path
          d="M-28,-42 Q-34,-64 -16,-60 Q-20,-78 -2,-68 Q2,-84 14,-66 Q26,-76 24,-56 Q36,-60 28,-40 Q20,-50 10,-44 Q2,-52 -6,-44 Q-16,-50 -22,-40 Z"
          fill={HAIR}
          stroke={INK}
          strokeWidth={2}
        />

        {/* dot eyes */}
        {blink ? (
          <>
            <line x1={-13} y1={-30} x2={-4} y2={-30} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
            <line x1={4} y1={-30} x2={13} y2={-30} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx={-8.5} cy={-30} r={3.6} fill={INK} />
            <circle cx={8.5} cy={-30} r={3.6} fill={INK} />
          </>
        )}

        {worried ? (
          <path d="M-7,-16 Q0,-20 7,-16" stroke={INK} strokeWidth={2.1} fill="none" strokeLinecap="round" />
        ) : (
          <path d="M-7,-18 Q0,-13 7,-18" stroke={INK} strokeWidth={2.1} fill="none" strokeLinecap="round" />
        )}
      </g>

      {/* front arm */}
      <Limb originX={-14} originY={0} upperAngle={a.lUpperArm} lowerAngle={a.lLowerArm} upperLen={32} lowerLen={30} width={8} />

      {cold && Math.sin(frame / 30) > 0.2 ? (
        <ellipse
          cx={14 + Math.sin(frame / 8) * 3}
          cy={-20 + a.headTilt * 0.1}
          rx={8 + Math.sin(frame / 6) * 2}
          ry={5}
          fill="#ffffff"
          opacity={0.35 + 0.15 * Math.sin(frame / 6)}
        />
      ) : null}
    </g>
  );
};
