import React from "react";

import { useStoreState, useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { Point } from "@framework/utils/geometry";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";

export enum DataChannelEventTypes {
    DATA_CHANNEL_ORIGIN_POINTER_DOWN = "data-channel-origin-pointer-down",
    DATA_CHANNEL_DONE = "data-channel-done",
    DATA_CHANNEL_CONNECTIONS_CHANGED = "data-channel-connections-changed",
}

export interface DataChannelEvents {
    [DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN]: CustomEvent<{
        moduleInstanceId: string;
        pointerPoint: Point;
    }>;
    [DataChannelEventTypes.DATA_CHANNEL_DONE]: CustomEvent;
    [DataChannelEventTypes.DATA_CHANNEL_CONNECTIONS_CHANGED]: CustomEvent;
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
    highlighted: boolean;
};

export const DataChannelVisualization: React.FC<DataChannelVisualizationProps> = (props) => {
    const [visible, setVisible] = React.useState<boolean>(false);
    const [originPoint, setOriginPoint] = React.useState<Point>({ x: 0, y: 0 });
    const [currentPointerPosition, setCurrentPointerPosition] = React.useState<Point>({ x: 0, y: 0 });
    const [_, forceRerender] = React.useReducer((x) => x + 1, 0);

    const [showDataChannelConnections, setShowDataChannelConnections] = useStoreState(
        props.workbench.getGuiStateStore(),
        "showDataChannelConnections"
    );

    const [editDataChannelConnectionsForModuleInstanceId, setEditDataChannelConnectionsForModuleInstanceId] =
        useStoreState(props.workbench.getGuiStateStore(), "editDataChannelConnectionsForModuleInstanceId");

    const highlightedDataChannelConnection = useStoreValue(
        props.workbench.getGuiStateStore(),
        "highlightedDataChannelConnection"
    );

    React.useEffect(() => {
        let mousePressed = false;

        function handleDataChannelOriginPointerDown(e: CustomEvent<{ moduleInstanceId: string; pointerPoint: Point }>) {
            setVisible(true);
            setOriginPoint(e.detail.pointerPoint);
            document.body.classList.add("cursor-crosshair");
            mousePressed = true;
            setCurrentPointerPosition(e.detail.pointerPoint);
        }

        function handleDataChannelDone() {
            setVisible(false);
            document.body.classList.remove("cursor-crosshair");
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

        function handleConnectionChange() {
            forceRerender();
        }

        document.addEventListener(
            DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN,
            handleDataChannelOriginPointerDown
        );
        document.addEventListener("pointerup", handlePointerUp);
        document.addEventListener(DataChannelEventTypes.DATA_CHANNEL_DONE, handleDataChannelDone);
        document.addEventListener(DataChannelEventTypes.DATA_CHANNEL_CONNECTIONS_CHANGED, handleConnectionChange);
        document.addEventListener("pointermove", handlePointerMove);

        return () => {
            document.removeEventListener(
                DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN,
                handleDataChannelOriginPointerDown
            );
            document.removeEventListener(DataChannelEventTypes.DATA_CHANNEL_DONE, handleDataChannelDone);
            document.removeEventListener(
                DataChannelEventTypes.DATA_CHANNEL_CONNECTIONS_CHANGED,
                handleConnectionChange
            );
            document.removeEventListener("pointermove", handlePointerMove);
        };
    }, []);

    React.useEffect(() => {
        function handlePointerUp() {
            if (!editDataChannelConnectionsForModuleInstanceId) {
                return;
            }
            setShowDataChannelConnections(false);
            setEditDataChannelConnectionsForModuleInstanceId(null);
            document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_DONE));
        }

        document.addEventListener("pointerup", handlePointerUp);

        return () => {
            document.removeEventListener("pointerup", handlePointerUp);
        };
    }, [editDataChannelConnectionsForModuleInstanceId]);

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
            if (
                editDataChannelConnectionsForModuleInstanceId &&
                moduleInstance.getId() !== editDataChannelConnectionsForModuleInstanceId
            ) {
                continue;
            }
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

                const highlighted =
                    highlightedDataChannelConnection?.channelName === inputChannelName &&
                    highlightedDataChannelConnection?.listenerId === moduleInstance.getId();

                dataChannelPaths.push({
                    key: `${originModuleInstanceId}-${moduleInstance.getId()}-${inputChannelName}`,
                    origin: originPoint,
                    midPoint1: midPoint1,
                    midPoint2: midPoint2,
                    destination: destinationPoint,
                    description: `${inputChannel.getName()}`,
                    descriptionCenterPoint: descriptionCenterPoint,
                    highlighted: highlighted,
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
                "bg-slate-50",
                "left-0",
                "top-0",
                "h-full",
                "w-full",
                "z-50",
                "bg-opacity-70",
                {
                    invisible: !visible && !showDataChannelConnections,
                }
            )}
        >
            {visible && (
                <path
                    d={`M ${originPoint.x} ${originPoint.y} C ${midPoint1.x} ${midPoint1.y} ${midPoint2.x} ${midPoint2.y} ${currentPointerPosition.x} ${currentPointerPosition.y}`}
                    stroke="black"
                    fill="transparent"
                    className={resolveClassNames({ invisible: !visible })}
                />
            )}
            {dataChannelPaths.map((dataChannelPath) => (
                <g key={dataChannelPath.key}>
                    <path
                        id={dataChannelPath.key}
                        d={`M ${dataChannelPath.origin.x} ${dataChannelPath.origin.y} C ${dataChannelPath.midPoint1.x} ${dataChannelPath.midPoint1.y} ${dataChannelPath.midPoint2.x} ${dataChannelPath.midPoint2.y} ${dataChannelPath.destination.x} ${dataChannelPath.destination.y}`}
                        stroke={dataChannelPath.highlighted ? "red" : "#aaa"}
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
