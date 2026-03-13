import type { DrawPreviewFunc } from "@framework/Preview";

export const preview: DrawPreviewFunc = function (width: number, height: number) {
    const hw = width / 2;
    const hh = height / 2;
    const pad = width * 0.06;
    const colors = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#fc8452"];

    // --- Top-left: timeseries fan ---
    const tsX0 = pad;
    const tsX1 = hw - pad;
    const tsY0 = pad;
    const tsY1 = hh - pad;
    const tsW = tsX1 - tsX0;
    const tsH = tsY1 - tsY0;

    const fanTop = [0.7, 0.5, 0.35, 0.25, 0.2, 0.22, 0.18, 0.15];
    const fanBot = [0.7, 0.82, 0.88, 0.9, 0.85, 0.88, 0.92, 0.95];
    const meanY = [0.7, 0.65, 0.58, 0.55, 0.5, 0.52, 0.48, 0.45];

    const fanPath = fanTop
        .map((v, i) => `${tsX0 + (i / (fanTop.length - 1)) * tsW},${tsY0 + v * tsH}`)
        .join(" L ");
    const fanPathBot = [...fanBot]
        .reverse()
        .map((v, i) => `${tsX0 + ((fanBot.length - 1 - i) / (fanBot.length - 1)) * tsW},${tsY0 + v * tsH}`)
        .join(" L ");
    const meanPath = meanY.map((v, i) => `${tsX0 + (i / (meanY.length - 1)) * tsW},${tsY0 + v * tsH}`).join(" L ");

    // --- Top-right: bar chart ---
    const barX0 = hw + pad;
    const barY1 = hh - pad;
    const barW = hw - 2 * pad;
    const barH = hh - 2 * pad;
    const bars = [0.45, 0.72, 0.88, 0.6, 0.35];
    const barGap = barW / (bars.length * 1.5 + 0.5);
    const barWidth = barGap * 1.2;

    // --- Bottom-left: histogram ---
    const histX0 = pad;
    const histY0 = hh + pad;
    const histY1 = height - pad;
    const histW = hw - 2 * pad;
    const histH = histY1 - histY0;
    const hist = [0.12, 0.25, 0.55, 0.85, 0.95, 0.78, 0.48, 0.22, 0.08];
    const histBarW = histW / hist.length;

    // --- Bottom-right: distribution / KDE curve ---
    const kdeX0 = hw + pad;
    const kdeY0 = hh + pad;
    const kdeY1 = height - pad;
    const kdeW = hw - 2 * pad;
    const kdeH = kdeY1 - kdeY0;
    const kde = [0.0, 0.05, 0.18, 0.45, 0.82, 0.95, 0.72, 0.35, 0.12, 0.03, 0.0];
    const kdePath = kde.map((v, i) => `${kdeX0 + (i / (kde.length - 1)) * kdeW},${kdeY0 + (1 - v) * kdeH}`);

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            {/* Grid dividers */}
            <line x1={hw} y1={0} x2={hw} y2={height} stroke="#e0e0e0" strokeWidth={0.5} />
            <line x1={0} y1={hh} x2={width} y2={hh} stroke="#e0e0e0" strokeWidth={0.5} />

            {/* Top-left: timeseries fan + mean */}
            <path d={`M ${fanPath} L ${fanPathBot} Z`} fill={colors[4]} fillOpacity={0.3} />
            <polyline points={meanPath} fill="none" stroke={colors[0]} strokeWidth={1.5} />

            {/* Top-right: bar chart */}
            {bars.map((v, i) => (
                <rect
                    key={`bar-${i}`}
                    x={barX0 + i * (barWidth + barGap) + barGap * 0.5}
                    y={barY1 - v * barH}
                    width={barWidth}
                    height={v * barH}
                    fill={colors[i % colors.length]}
                    rx={1}
                />
            ))}

            {/* Bottom-left: histogram */}
            {hist.map((v, i) => (
                <rect
                    key={`hist-${i}`}
                    x={histX0 + i * histBarW}
                    y={histY0 + (1 - v) * histH}
                    width={histBarW - 1}
                    height={v * histH}
                    fill={colors[0]}
                    fillOpacity={0.7}
                />
            ))}

            {/* Bottom-right: KDE curve */}
            <path
                d={`M ${kdePath.join(" L ")}`}
                fill="none"
                stroke={colors[3]}
                strokeWidth={1.5}
            />
            <path
                d={`M ${kdePath[0]} L ${kdePath.join(" L ")} L ${kdeX0 + kdeW},${kdeY1} L ${kdeX0},${kdeY1} Z`}
                fill={colors[3]}
                fillOpacity={0.15}
            />
        </svg>
    );
};
