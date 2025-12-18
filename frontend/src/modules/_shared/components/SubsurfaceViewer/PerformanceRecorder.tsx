import React, { useState, useRef, useEffect, useCallback } from "react";

import type { ViewStateType } from "@webviz/subsurface-viewer";

// --- Types ---
type GpuInfo = { vendor: string; renderer: string };
type PerfReport = {
    metadata: {
        timestamp: string;
        gpuVendor: string;
        gpuRenderer: string;
        cpuConcurrency: number;
        testConfig: {
            rotationEnabled: boolean;
            hoverEnabled: boolean;
        };
    };
    performance: {
        durationMs: number;
        totalFrames: number;
        averageFps: string;
        averageFrameTimeMs: string;
        cpuLongTaskCount: number;
        cpuTotalBlockingTimeMs: string;
        probableBottleneck: string;
    };
    rawFrameTimes: number[];
};

type PerformanceRecorderProps = {
    currentViewState?: ViewStateType;
    onViewStateChange?: (viewState: ViewStateType) => void;
    onBenchmarkEnd: () => void;
};

// --- Helpers ---
const getGpuInfo = (): GpuInfo => {
    try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (!gl) return { vendor: "N/A", renderer: "WebGL Unsupported" };

        const debugInfo = (gl as any).getExtension("WEBGL_debug_renderer_info");
        if (!debugInfo) return { vendor: "N/A", renderer: "Extension Blocked" };

        const vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return { vendor, renderer };
    } catch (e) {
        return { vendor: "Error", renderer: "Error detecting GPU" };
    }
};

const downloadJson = (data: PerfReport, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

const DEFAULT_VIEW_STATE: ViewStateType = {
    target: [0, 0, 0],
    zoom: 1,
    rotationX: 45,
    rotationOrbit: 0,
    minZoom: -10,
    maxZoom: 20,
};

export const PerformanceRecorder = ({
    currentViewState,
    onViewStateChange,
    onBenchmarkEnd,
}: PerformanceRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [enableRotation, setEnableRotation] = useState(true);
    const [enableHover, setEnableHover] = useState(false);

    // Refs
    const logsRef = useRef<number[]>([]);
    const longTasksRef = useRef<number>(0);
    const blockingTimeRef = useRef<number>(0);
    const observerRef = useRef<PerformanceObserver | null>(null);
    const requestRef = useRef<number>();
    const startTimeRef = useRef<number>(0);
    const previousTimeRef = useRef<number>(0);
    const originalViewStateRef = useRef<ViewStateType | undefined>(undefined);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Capture config at start time so toggling mid-run doesn't affect behavior
    const configRef = useRef({ rotation: true, hover: false });

    const DURATION_MS = 10000;

    // Find the canvas on mount
    useEffect(() => {
        const canvas = document.querySelector("canvas");
        canvasRef.current = canvas;
    }, []);

    // CPU Monitor
    const startCpuMonitoring = () => {
        longTasksRef.current = 0;
        blockingTimeRef.current = 0;
        if ("PerformanceObserver" in window) {
            observerRef.current = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    longTasksRef.current += 1;
                    blockingTimeRef.current += entry.duration;
                });
            });
            observerRef.current.observe({ entryTypes: ["longtask"] });
        }
    };

    const stopCpuMonitoring = () => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }
    };

    const finishRecording = useCallback(() => {
        setIsRecording(false);
        stopCpuMonitoring();
        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        // Restore camera
        if (onViewStateChange && originalViewStateRef.current) {
            onViewStateChange(originalViewStateRef.current);
        }

        onBenchmarkEnd();

        // Build report
        const frames = logsRef.current;
        const totalFrames = frames.length;
        const totalTime = frames.reduce((a, b) => a + b, 0);
        const avgFrameTime = totalTime / totalFrames;
        const estimatedFps = 1000 / avgFrameTime;
        const blockingRatio = blockingTimeRef.current / DURATION_MS;
        const gpuInfo = getGpuInfo();

        const bottleneck = estimatedFps > 55 ? "None (Smooth)" : blockingRatio > 0.3 ? "CPU Bound" : "GPU Bound";

        const report: PerfReport = {
            metadata: {
                timestamp: new Date().toISOString(),
                gpuVendor: gpuInfo.vendor,
                gpuRenderer: gpuInfo.renderer,
                cpuConcurrency: navigator.hardwareConcurrency || 0,
                testConfig: {
                    rotationEnabled: configRef.current.rotation,
                    hoverEnabled: configRef.current.hover,
                },
            },
            performance: {
                durationMs: DURATION_MS,
                totalFrames,
                averageFps: estimatedFps.toFixed(2),
                averageFrameTimeMs: avgFrameTime.toFixed(2),
                cpuLongTaskCount: longTasksRef.current,
                cpuTotalBlockingTimeMs: blockingTimeRef.current.toFixed(2),
                probableBottleneck: bottleneck,
            },
            rawFrameTimes: frames,
        };

        const safeRendererName = gpuInfo.renderer.replace(/[^a-z0-9]/gi, "_").substring(0, 30);
        downloadJson(report, `AutoBench_${safeRendererName}_${Date.now()}.json`);
    }, [onBenchmarkEnd, onViewStateChange]);

    const animate = useCallback(
        (time: number) => {
            const elapsedTime = time - startTimeRef.current;
            if (previousTimeRef.current !== undefined) {
                logsRef.current.push(time - previousTimeRef.current);
            }
            previousTimeRef.current = time;

            const baseState = originalViewStateRef.current || DEFAULT_VIEW_STATE;
            const progress = elapsedTime / DURATION_MS;

            // === ROTATION ===
            if (configRef.current.rotation && onViewStateChange) {
                const startRotation = baseState.rotationOrbit || 0;
                const newRotation = startRotation + progress * 360;

                onViewStateChange({
                    ...baseState,
                    rotationOrbit: newRotation,
                });
            }

            // === HOVER SIMULATION ===
            if (configRef.current.hover && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();

                // Move mouse in a circular pattern around the center
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const radius = Math.min(rect.width, rect.height) * 0.3;

                const angle = progress * Math.PI * 4; // Two full circles
                const clientX = centerX + Math.cos(angle) * radius;
                const clientY = centerY + Math.sin(angle) * radius;

                const mouseEvent = new MouseEvent("mousemove", {
                    clientX,
                    clientY,
                    bubbles: true,
                    cancelable: true,
                    view: window,
                });

                canvasRef.current.dispatchEvent(mouseEvent);
            }

            if (elapsedTime < DURATION_MS) {
                requestRef.current = requestAnimationFrame(animate);
            } else {
                finishRecording();
            }
        },
        [onViewStateChange, finishRecording],
    );

    const startRecording = useCallback(() => {
        if (isRecording) return;

        if (!currentViewState?.target) {
            console.warn("Cannot start benchmark: no valid view state");
            return;
        }

        // Capture config at start
        configRef.current = { rotation: enableRotation, hover: enableHover };

        originalViewStateRef.current = { ...currentViewState };

        setIsRecording(true);
        logsRef.current = [];

        startCpuMonitoring();

        startTimeRef.current = performance.now();
        previousTimeRef.current = performance.now();

        requestRef.current = requestAnimationFrame(animate);
    }, [isRecording, currentViewState, enableRotation, enableHover, animate]);

    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            stopCpuMonitoring();
        };
    }, []);

    const isReady = !!currentViewState?.target;
    const canStart = isReady && (enableRotation || enableHover);

    return (
        <div
            style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: "rgba(0, 0, 0, 0.7)",
                padding: 12,
                borderRadius: 6,
                boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
            }}
        >
            {/* Toggles */}
            <label
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "white",
                    fontSize: 13,
                    cursor: isRecording ? "not-allowed" : "pointer",
                    opacity: isRecording ? 0.5 : 1,
                }}
            >
                <input
                    type="checkbox"
                    checked={enableRotation}
                    onChange={(e) => setEnableRotation(e.target.checked)}
                    disabled={isRecording}
                />
                Rotate camera
            </label>

            <label
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "white",
                    fontSize: 13,
                    cursor: isRecording ? "not-allowed" : "pointer",
                    opacity: isRecording ? 0.5 : 1,
                }}
            >
                <input
                    type="checkbox"
                    checked={enableHover}
                    onChange={(e) => setEnableHover(e.target.checked)}
                    disabled={isRecording}
                />
                Simulate hover
            </label>

            {/* Start Button */}
            <button
                onClick={!isRecording ? startRecording : undefined}
                disabled={isRecording || !canStart}
                style={{
                    padding: "10px 20px",
                    background: isRecording ? "#ff4d4d" : !canStart ? "#666" : "#2196F3",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: isRecording || !canStart ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    marginTop: 4,
                }}
            >
                {isRecording
                    ? "Running..."
                    : !isReady
                      ? "Waiting..."
                      : !canStart
                        ? "Select an option"
                        : "Start Benchmark"}
            </button>
        </div>
    );
};
