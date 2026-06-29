import type React from "react";

export type FmuAnimatedLogoProps = {
    className?: string;
    style?: React.CSSProperties;
};

const CSS = `
@keyframes fmu-spin {
  0%, 10% { transform: rotate(0deg); }
  50%      { transform: rotate(1080deg); }
  100%     { transform: rotate(1080deg); }
}
@keyframes fmu-path-push-g1 {
  0%, 100% { transform: translate(0, 0); }
  10%, 50% { transform: translate(-2.71%, -5.70%); }
  65%      { transform: translate(0, 0); }
}
@keyframes fmu-circle-push-g1 {
  0%, 100% { transform: translate(0, 0); }
  10%, 50% { transform: translate(-4.75%, -9.98%); }
  65%      { transform: translate(0, 0); }
}
@keyframes fmu-path-push-g2 {
  0%, 100% { transform: translate(0, 0); }
  10%, 50% { transform: translate(-6.38%, -0.55%); }
  65%      { transform: translate(0, 0); }
}
@keyframes fmu-circle-push-g2 {
  0%, 100% { transform: translate(0, 0); }
  10%, 50% { transform: translate(-11.16%, -0.98%); }
  65%      { transform: translate(0, 0); }
}
@keyframes fmu-path-push-g3 {
  0%, 100% { transform: translate(0, 0); }
  10%, 50% { transform: translate(3.68%, -5.15%); }
  65%      { transform: translate(0, 0); }
}
@keyframes fmu-circle-push-g3 {
  0%, 100% { transform: translate(0, 0); }
  10%, 50% { transform: translate(6.44%, -9.02%); }
  65%      { transform: translate(0, 0); }
}
@keyframes fmu-path-push-g4 {
  0%, 100% { transform: translate(0, 0); }
  10%, 50% { transform: translate(2.71%, 5.70%); }
  65%      { transform: translate(0, 0); }
}
@keyframes fmu-circle-push-g4 {
  0%, 100% { transform: translate(0, 0); }
  10%, 50% { transform: translate(4.75%, 9.98%); }
  65%      { transform: translate(0, 0); }
}
@keyframes fmu-path-push-g5 {
  0%, 100% { transform: translate(0, 0); }
  10%, 50% { transform: translate(6.38%, 0.55%); }
  65%      { transform: translate(0, 0); }
}
@keyframes fmu-circle-push-g5 {
  0%, 100% { transform: translate(0, 0); }
  10%, 50% { transform: translate(11.16%, 0.98%); }
  65%      { transform: translate(0, 0); }
}
@keyframes fmu-path-push-g6 {
  0%, 100% { transform: translate(0, 0); }
  10%, 50% { transform: translate(-3.68%, 5.15%); }
  65%      { transform: translate(0, 0); }
}
@keyframes fmu-circle-push-g6 {
  0%, 100% { transform: translate(0, 0); }
  10%, 50% { transform: translate(-6.44%, 9.02%); }
  65%      { transform: translate(0, 0); }
}

.fmu-spinner {
  animation: fmu-spin 4s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: 50% 50%;
}
.fmu-ghost1 { opacity: 0.3; }
.fmu-ghost2 { opacity: 0.2; }
.fmu-ghost3 { opacity: 0.1; }

.fmu-og.g1 .fmu-p  { animation: fmu-path-push-g1   4s ease-in-out infinite; }
.fmu-og.g1 .fmu-c  { animation: fmu-circle-push-g1 4s ease-in-out infinite; }
.fmu-og.g2 .fmu-p  { animation: fmu-path-push-g2   4s ease-in-out infinite; }
.fmu-og.g2 .fmu-c  { animation: fmu-circle-push-g2 4s ease-in-out infinite; }
.fmu-og.g3 .fmu-p  { animation: fmu-path-push-g3   4s ease-in-out infinite; }
.fmu-og.g3 .fmu-c  { animation: fmu-circle-push-g3 4s ease-in-out infinite; }
.fmu-og.g4 .fmu-p  { animation: fmu-path-push-g4   4s ease-in-out infinite; }
.fmu-og.g4 .fmu-c  { animation: fmu-circle-push-g4 4s ease-in-out infinite; }
.fmu-og.g5 .fmu-p  { animation: fmu-path-push-g5   4s ease-in-out infinite; }
.fmu-og.g5 .fmu-c  { animation: fmu-circle-push-g5 4s ease-in-out infinite; }
.fmu-og.g6 .fmu-p  { animation: fmu-path-push-g6   4s ease-in-out infinite; }
.fmu-og.g6 .fmu-c  { animation: fmu-circle-push-g6 4s ease-in-out infinite; }
`;

function OrbitalGroup({ group, children }: { group: number; children: React.ReactNode }) {
    return <g className={`fmu-og g${group}`}>{children}</g>;
}

const PATHS = [
    "M182.5,1c-2.3-2.1-6-0.6-6.2,2.5l-4.5,67.9c-0.1,2-1.9,3.6-3.9,3.5l-79.3-4.7c-3.5-0.2-5.3,4.1-2.7,6.5l141.6,126.1c2.4,2.1,6.2,0.4,6.2-2.8L234.1,50c0-1,0.3-2.8-0.5-3.6L182.5,1z",
    "M200.4,219.4L70.8,144.1c-0.9-0.5-2.3-1.7-3.3-1.4L2.6,164.2c-3,0.9-3.5,4.9-1,6.6l56.5,37.9c1.7,1.1,2.2,3.4,1,5.1l-43.8,66.3c-1.9,2.9,0.9,6.7,4.3,5.6l180-59.5C202.8,225.1,203.2,221,200.4,219.4L200.4,219.4z",
    "M267.3,218.8l130-74.6c0.9-0.5,2.6-1.2,2.8-2.2L414,75.1c0.7-3-2.5-5.5-5.3-4.1l-61,30c-1.8,0.9-4,0.2-5-1.7l-35.6-71.1c-1.6-3.1-6.2-2.5-7,0.9l-38.5,185.7C261.1,218,264.5,220.4,267.3,218.8L267.3,218.8z",
    "M286.2,475.6c2.3,2.1,6,0.6,6.2-2.5l4.5-67.9c0.1-2,1.9-3.6,3.9-3.5l79.3,4.7c3.5,0.2,5.3-4.1,2.7-6.5L241.4,273.9c-2.4-2.1-6.2-0.4-6.2,2.8l-0.4,149.9c0,1-0.3,2.9,0.5,3.6L286.2,475.6z",
    "M268.4,257.2L398,332.5c0.9,0.5,2.3,1.7,3.3,1.4l64.9-21.5c3-0.9,3.5-4.9,1-6.6l-56.5-37.9c-1.7-1.1-2.2-3.4-1-5.1l43.8-66.3c1.9-2.9-0.9-6.7-4.3-5.6l-180,59.6C266,251.4,265.6,255.6,268.4,257.2L268.4,257.2z",
    "M201.5,257.8l-130,74.6c-0.9,0.5-2.6,1.2-2.8,2.2l-13.9,66.9c-0.7,3,2.5,5.5,5.3,4.1l61-30c1.8-0.9,4-0.1,5,1.7l35.6,71.1c1.6,3.2,6.2,2.5,7-0.9L207,261.7C207.6,258.6,204.3,256.2,201.5,257.8L201.5,257.8z",
] as const;

const CIRCLES: [number, number][] = [
    [142.7, 42.9],
    [20.2, 219.3],
    [358.6, 61.4],
    [326.1, 433.7],
    [448.6, 257.3],
    [110.2, 415.2],
];

function SpinnerBody() {
    return (
        <>
            {PATHS.map((d, i) => (
                <OrbitalGroup key={i} group={i + 1}>
                    <path className="fmu-p" d={d} />
                    <circle className="fmu-c" cx={CIRCLES[i][0]} cy={CIRCLES[i][1]} r="16.7" />
                </OrbitalGroup>
            ))}
        </>
    );
}

export function FmuAnimatedLogo(props: FmuAnimatedLogoProps): React.ReactNode {
    return (
        <svg
            viewBox="-100 -100 668.8 676.6"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
            fill="currentColor"
            style={{ overflow: "visible" }}
            {...props}
        >
            {/* eslint-disable-next-line react/no-danger */}
            <style dangerouslySetInnerHTML={{ __html: CSS }} />
            <g>
                <g className="fmu-spinner fmu-ghost1" transform="rotate(-2 234.4 238.3)">
                    <SpinnerBody />
                </g>
                <g className="fmu-spinner fmu-ghost2" transform="rotate(-4 234.4 238.3)">
                    <SpinnerBody />
                </g>
                <g className="fmu-spinner fmu-ghost3" transform="rotate(-6 234.4 238.3)">
                    <SpinnerBody />
                </g>
                <g className="fmu-spinner">
                    <SpinnerBody />
                </g>
            </g>
        </svg>
    );
}
