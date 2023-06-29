import React from "react";

import { useSetStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { Point } from "@framework/utils/geometry";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";

export enum DataChannelEventTypes {
    DATA_CHANNEL_ORIGIN_POINTER_DOWN = "data-channel-origin-pointer-down",
    DATA_CHANNEL_DONE = "data-channel-done",
}

export interface DataChannelEvents {
    [DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN]: CustomEvent<{
        moduleInstanceId: string;
        pointerPoint: Point;
    }>;
    [DataChannelEventTypes.DATA_CHANNEL_DONE]: CustomEvent;
}

declare global {
    interface Document {
        addEventListener<K extends keyof DataChannelEvents>(
            type: K,
            listener: (ev: DataChannelEvents[K]) => any,
            options?: boolean | AddEventListenerOptions
        ): void;
        removeEventListener<K extends keyof DataChannelEvents>(
            type: K,
            listener: (ev: DataChannelEvents[K]) => any,
            options?: boolean | EventListenerOptions
        ): void;
        dispatchEvent<K extends keyof DataChannelEvents>(event: DataChannelEvents[K]): void;
    }
}

export type DataChannelVisualizationProps = {
    workbench: Workbench;
};

type DataChannelPath = {
    key: string;
    origin: Point;
    midPoint1: Point;
    midPoint2: Point;
    destination: Point;
    description: string;
    descriptionCenterPoint: Point;
};

export const DataChannelVisualization: React.FC<DataChannelVisualizationProps> = (props) => {
    const [visible, setVisible] = React.useState<boolean>(false);
    const [originPoint, setOriginPoint] = React.useState<Point>({ x: 0, y: 0 });
    const [originModuleInstanceId, setOriginModuleInstanceId] = React.useState<string>("");
    const [currentPointerPosition, setCurrentPointerPosition] = React.useState<Point>({ x: 0, y: 0 });

    const setDataChannelConnectionMode = useSetStoreValue(
        props.workbench.getGuiStateStore(),
        "dataChannelConnectionMode"
    );

    React.useEffect(() => {
        let mousePressed = false;

        function handleDataChannelOriginPointerDown(e: CustomEvent<{ moduleInstanceId: string; pointerPoint: Point }>) {
            setVisible(true);
            setOriginPoint(e.detail.pointerPoint);
            setOriginModuleInstanceId(e.detail.moduleInstanceId);
            document.body.classList.add("cursor-crosshair");
            setDataChannelConnectionMode(true);
            mousePressed = true;
            setCurrentPointerPosition(e.detail.pointerPoint);
        }

        function handleDataChannelDone() {
            setVisible(false);
            document.body.classList.remove("cursor-crosshair");
            setDataChannelConnectionMode(false);
        }

        function handlePointerUp() {
            mousePressed = false;
        }

        function handlePointerMove(e: PointerEvent) {
            if (!mousePressed) {
                return;
            }
            setCurrentPointerPosition({ x: e.clientX, y: e.clientY });
        }

        document.addEventListener(
            DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN,
            handleDataChannelOriginPointerDown
        );
        document.addEventListener("pointerup", handlePointerUp);
        document.addEventListener(DataChannelEventTypes.DATA_CHANNEL_DONE, handleDataChannelDone);
        document.addEventListener("pointermove", handlePointerMove);

        return () => {
            document.removeEventListener(
                DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN,
                handleDataChannelOriginPointerDown
            );
            document.removeEventListener(DataChannelEventTypes.DATA_CHANNEL_DONE, handleDataChannelDone);
            document.removeEventListener("pointermove", handlePointerMove);
        };
    }, []);

    const midPoint1: Point = {
        x: originPoint.x,
        y: (originPoint.y + currentPointerPosition.y) / 2,
    };

    const midPoint2: Point = {
        x: currentPointerPosition.x,
        y: (originPoint.y + currentPointerPosition.y) / 2,
    };

    function makeDataChannelPaths() {
        const dataChannelPaths: DataChannelPath[] = [];
        for (const moduleInstance of props.workbench.getModuleInstances()) {
            const inputChannels = moduleInstance.getInputChannels();
            if (!inputChannels) {
                continue;
            }

            for (const inputChannelName in inputChannels) {
                const inputChannel = inputChannels[inputChannelName];
                const originModuleInstanceId = inputChannel.getModuleInstanceId();
                const originModuleInstance = props.workbench.getModuleInstance(originModuleInstanceId);
                if (!originModuleInstance) {
                    continue;
                }

                const originElement = document.getElementById(
                    `moduleinstance-${originModuleInstanceId}-data-channel-origin`
                );
                const destinationElement = document.getElementById(
                    `channel-connector-${moduleInstance.getId()}-${inputChannelName}`
                );
                if (!originElement || !destinationElement) {
                    continue;
                }

                const originRect = originElement.getBoundingClientRect();
                const destinationRect = destinationElement.getBoundingClientRect();

                const originPoint: Point = {
                    x: originRect.left + originRect.width / 2,
                    y: originRect.top + originRect.height / 2,
                };

                const destinationPoint: Point = {
                    x: destinationRect.left + destinationRect.width / 2,
                    y: destinationRect.top + destinationRect.height / 2,
                };

                const midPoint1: Point = {
                    x: originPoint.x,
                    y: (originPoint.y + destinationPoint.y) / 2,
                };

                const midPoint2: Point = {
                    x: destinationPoint.x,
                    y: (originPoint.y + destinationPoint.y) / 2,
                };

                const descriptionCenterPoint: Point = {
                    x: (originPoint.x + destinationPoint.x) / 2,
                    y: (originPoint.y + destinationPoint.y) / 2,
                };

                dataChannelPaths.push({
                    key: `${originModuleInstanceId}-${moduleInstance.getId()}-${inputChannelName}`,
                    origin: originPoint,
                    midPoint1: midPoint1,
                    midPoint2: midPoint2,
                    destination: destinationPoint,
                    description: `${inputChannel.getName()}`,
                    descriptionCenterPoint: descriptionCenterPoint,
                });
            }
        }
        return dataChannelPaths;
    }

    const dataChannelPaths = makeDataChannelPaths();

    return (
        <svg
            className={resolveClassNames(
                "absolute",
                "left-0",
                "top-0",
                "h-full",
                "w-full",
                "z-50",
                "bg-slate-50",
                "bg-opacity-70",
                {
                    invisible: !visible,
                }
            )}
        >
            <path
                d={`M ${originPoint.x} ${originPoint.y} C ${midPoint1.x} ${midPoint1.y} ${midPoint2.x} ${midPoint2.y} ${currentPointerPosition.x} ${currentPointerPosition.y}`}
                stroke="black"
                fill="transparent"
            />
            {dataChannelPaths.map((dataChannelPath) => (
                <g key={dataChannelPath.key}>
                    <path
                        id={dataChannelPath.key}
                        d={`M ${dataChannelPath.origin.x} ${dataChannelPath.origin.y} C ${dataChannelPath.midPoint1.x} ${dataChannelPath.midPoint1.y} ${dataChannelPath.midPoint2.x} ${dataChannelPath.midPoint2.y} ${dataChannelPath.destination.x} ${dataChannelPath.destination.y}`}
                        stroke="#aaa"
                        fill="transparent"
                    />
                    <text>
                        <textPath
                            href={`#${dataChannelPath.key}`}
                            startOffset="50%"
                            textAnchor="middle"
                            alignmentBaseline="after-edge"
                        >
                            {dataChannelPath.description}
                        </textPath>
                    </text>
                </g>
            ))}
        </svg>
    );
};
