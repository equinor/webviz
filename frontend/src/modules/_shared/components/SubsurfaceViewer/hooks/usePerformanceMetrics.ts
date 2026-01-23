import React from "react";

export type PerformanceMetrics = {
    fps: number;
    pickingTimeMs: number;
    hoverEventsPerSecond: number;
    pickingDepth: number;
    pickingRadius: number;
};

export function usePerformanceMetrics(pickingDepth: number, pickingRadius: number) {
    const [metrics, setMetrics] = React.useState<PerformanceMetrics>({
        fps: 0,
        pickingTimeMs: 0,
        hoverEventsPerSecond: 0,
        pickingDepth,
        pickingRadius,
    });

    // FPS tracking
    const frameTimesRef = React.useRef<number[]>([]);
    const lastFrameTimeRef = React.useRef(performance.now());

    // Picking time tracking
    const pickingTimesRef = React.useRef<number[]>([]);

    // Hover event tracking
    const hoverCountRef = React.useRef(0);
    const lastHoverCountTimeRef = React.useRef(performance.now());

    // Record a picking operation time
    const recordPickingTime = React.useCallback((timeMs: number) => {
        pickingTimesRef.current.push(timeMs);
        if (pickingTimesRef.current.length > 30) {
            pickingTimesRef.current.shift();
        }
    }, []);

    // Record a hover event
    const recordHoverEvent = React.useCallback(() => {
        hoverCountRef.current++;
    }, []);

    // FPS measurement loop
    React.useEffect(() => {
        let animationFrameId: number;

        const measureFrame = () => {
            const now = performance.now();
            const delta = now - lastFrameTimeRef.current;
            lastFrameTimeRef.current = now;

            frameTimesRef.current.push(delta);
            if (frameTimesRef.current.length > 60) {
                frameTimesRef.current.shift();
            }

            animationFrameId = requestAnimationFrame(measureFrame);
        };

        animationFrameId = requestAnimationFrame(measureFrame);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    // Update metrics periodically (every 500ms)
    React.useEffect(() => {
        const interval = setInterval(() => {
            const now = performance.now();

            // Calculate FPS
            const frameTimes = frameTimesRef.current;
            const avgFrameTime = frameTimes.length > 0 ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 16.67;
            const fps = 1000 / avgFrameTime;

            // Calculate average picking time
            const pickingTimes = pickingTimesRef.current;
            const avgPickingTime = pickingTimes.length > 0 ? pickingTimes.reduce((a, b) => a + b, 0) / pickingTimes.length : 0;

            // Calculate hover events per second
            const timeSinceLastCount = (now - lastHoverCountTimeRef.current) / 1000;
            const hoverEventsPerSecond = timeSinceLastCount > 0 ? hoverCountRef.current / timeSinceLastCount : 0;
            hoverCountRef.current = 0;
            lastHoverCountTimeRef.current = now;

            setMetrics({
                fps,
                pickingTimeMs: avgPickingTime,
                hoverEventsPerSecond,
                pickingDepth,
                pickingRadius,
            });
        }, 500);

        return () => clearInterval(interval);
    }, [pickingDepth, pickingRadius]);

    return { metrics, recordPickingTime, recordHoverEvent };
}
