import React from "react";

export type PerformanceOverlayHandle = {
    recordFrame: () => void;
};

type PerformanceOverlayProps = {
    visible: boolean;
};

export const PerformanceOverlay = React.forwardRef<PerformanceOverlayHandle, PerformanceOverlayProps>(
    function PerformanceOverlay(props, ref): React.ReactNode {
        const [measuredFpsDataPoints, setMeasuredFpsDataPoints] = React.useState<number[]>([]);
        const frameTimesRef = React.useRef<number[]>([]);
        const lastFrameTimeRef = React.useRef<number | null>(null);

        // Expose recordFrame method via ref
        React.useImperativeHandle(ref, () => ({
            recordFrame: () => {
                const now = performance.now();
                if (lastFrameTimeRef.current !== null) {
                    const delta = now - lastFrameTimeRef.current;
                    frameTimesRef.current.push(delta);
                    if (frameTimesRef.current.length > 60) {
                        frameTimesRef.current.shift();
                    }
                }
                lastFrameTimeRef.current = now;
            },
        }));

        if (!props.visible) return null;

        React.useEffect(function updateFpsDataPointsEffect() {
            const intervalId = setInterval(() => {
                // Calculate FPS from recorded frame times
                const frameTimes = frameTimesRef.current;
                if (frameTimes.length === 0) {
                    // No frames recorded in this interval - show N/A or keep last value
                    setMeasuredFpsDataPoints((prev) => {
                        const newDataPoints = [...prev, 0];
                        if (newDataPoints.length > 60) {
                            newDataPoints.shift();
                        }
                        return newDataPoints;
                    });
                    return;
                }

                const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
                const fps = 1000 / avgFrameTime;

                setMeasuredFpsDataPoints((prev) => {
                    const newDataPoints = [...prev, fps];
                    if (newDataPoints.length > 60) {
                        newDataPoints.shift();
                    }
                    return newDataPoints;
                });

                // Clear frame times after calculating - we want fresh data each interval
                frameTimesRef.current = [];
                lastFrameTimeRef.current = null;
            }, 500);

            return () => clearInterval(intervalId);
        }, []);

        return (
            <div className="absolute top-2 right-2 bg-black/70 text-green-400 font-mono text-xs p-2 rounded pointer-events-none z-50">
                <div>FPS:</div>
                <div>
                    {measuredFpsDataPoints.length > 0 && measuredFpsDataPoints[measuredFpsDataPoints.length - 1] > 0
                        ? measuredFpsDataPoints[measuredFpsDataPoints.length - 1].toFixed(1)
                        : "N/A"}
                </div>
                <div className="flex items-end justify-end" style={{ height: "50px", width: "240px" }}>
                    {measuredFpsDataPoints.map((fps, index) => (
                        <div
                            key={index}
                            style={{
                                width: "4px",
                                height: fps > 0 ? `${Math.min(50, (fps / 60) * 50)}px` : "1px",
                                backgroundColor: fps > 0 ? "limegreen" : "gray",
                            }}
                        ></div>
                    ))}
                </div>
            </div>
        );
    },
);
