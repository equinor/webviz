import React from "react";

import { useGuiSelector } from "@framework/GuiState";
import { useStoreState, useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { Point } from "@framework/utils/geometry";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";

export enum DataChannelEventTypes {
    DATA_CHANNEL_ORIGIN_POINTER_DOWN = "data-channel-origin-pointer-down",
    DATA_CHANNEL_DONE = "data-channel-done",
    DATA_CHANNEL_CONNECTIONS_CHANGED = "data-channel-connections-changed",
}

export interface DataChannelEvents {
    [DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN]: CustomEvent<{
        moduleInstanceId: string;
        originElement: HTMLElement;
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
    const ref = React.useRef<SVGSVGElement>(null);
    const [visible, setVisible] = React.useState<boolean>(false);
    const [originPoint, setOriginPoint] = React.useState<Point>({ x: 0, y: 0 });
    const [currentPointerPosition, setCurrentPointerPosition] = React.useState<Point>({ x: 0, y: 0 });
    const [currentChannelName, setCurrentChannelName] = React.useState<string | null>(null);
    const [_, forceRerender] = React.useReducer((x) => x + 1, 0);

    const guiState = useGuiSelector((state) => state.draggedNewModule);

    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const boundingRect = useElementBoundingRect(ref);

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
        forceRerender();
    }, [boundingRect]);

    React.useEffect(() => {
        let mousePressed = false;
        let currentOriginPoint: Point = { x: 0, y: 0 };

        function handleDataChannelOriginPointerDown(
            e: CustomEvent<{ moduleInstanceId: string; originElement: HTMLElement }>
        ) {
            const clientRect = e.detail.originElement.getBoundingClientRect();
            currentOriginPoint = {
                x: clientRect.left + clientRect.width / 2,
                y: clientRect.top + clientRect.height / 2,
            };
            setVisible(true);
            setOriginPoint(currentOriginPoint);
            document.body.classList.add("cursor-crosshair");
            mousePressed = true;
            setCurrentPointerPosition(currentOriginPoint);
            setCurrentChannelName(null);

            const moduleInstance = props.workbench.getModuleInstance(e.detail.moduleInstanceId);
            if (!moduleInstance) {
                return;
            }

            const availableChannels = moduleInstance.getBroadcastChannels();
            if (Object.keys(availableChannels).length === 1) {
                setCurrentChannelName(Object.values(availableChannels)[0].getDisplayName());
                return;
            }
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
            const hoveredElement = document.elementFromPoint(e.clientX, e.clientY);
            if (
                hoveredElement &&
                hoveredElement instanceof HTMLElement &&
                hoveredElement.hasAttribute("data-channelconnector")
            ) {
                const boundingRect = hoveredElement.getBoundingClientRect();
                setCurrentPointerPosition({
                    x: boundingRect.left + boundingRect.width / 2,
                    y: currentOriginPoint.y > boundingRect.top ? boundingRect.bottom : boundingRect.top,
                });
                return;
            }
            setCurrentPointerPosition({ x: e.clientX, y: e.clientY });
        }

        function handleConnectionChange() {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                forceRerender();
            }, 100);
        }

        document.addEventListener(
            DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN,
            handleDataChannelOriginPointerDown
        );
        document.addEventListener("pointerup", handlePointerUp);
        document.addEventListener(DataChannelEventTypes.DATA_CHANNEL_DONE, handleDataChannelDone);
        document.addEventListener(DataChannelEventTypes.DATA_CHANNEL_CONNECTIONS_CHANGED, handleConnectionChange);
        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("resize", handleConnectionChange);

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
            document.removeEventListener("resize", handleConnectionChange);
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
                    y: destinationRect.top < originPoint.y ? destinationRect.bottom + 20 : destinationRect.top - 20,
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
                    description: `${inputChannel.getDisplayName()}`,
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
            ref={ref}
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
            <defs>
                <marker id="arrowhead-right" markerWidth="20" markerHeight="14" refX="0" refY="7" orient="auto">
                    <polygon points="0 0, 20 7, 0 14" />
                </marker>
                <marker
                    id="arrowhead-right-active"
                    fill="red"
                    markerWidth="20"
                    markerHeight="14"
                    refX="0"
                    refY="7"
                    orient="auto"
                >
                    <polygon points="0 0, 20 7, 0 14" />
                </marker>
                <marker id="arrowhead-left" markerWidth="20" markerHeight="14" refX="20" refY="7" orient="auto">
                    <polygon points="20 0, 0 7, 20 14" />
                </marker>
                <marker
                    id="arrowhead-left-active"
                    fill="red"
                    markerWidth="20"
                    markerHeight="14"
                    refX="20"
                    refY="7"
                    orient="auto"
                >
                    <polygon points="20 0, 0 7, 20 14" />
                </marker>
            </defs>
            {visible && (
                <g>
                    <path
                        id="current-data-channel-path"
                        d={`M ${originPoint.x} ${originPoint.y} C ${midPoint1.x} ${midPoint1.y} ${midPoint2.x} ${
                            midPoint2.y
                        } ${currentPointerPosition.x} ${
                            currentPointerPosition.y + (currentPointerPosition.y > originPoint.y ? -20 : 20)
                        }`}
                        stroke="black"
                        fill="transparent"
                        className={resolveClassNames({ invisible: !visible })}
                        markerEnd="url(#arrowhead-right)"
                    />
                    {currentChannelName && (
                        <text>
                            <textPath
                                href={`#current-data-channel-path`}
                                startOffset="50%"
                                textAnchor="middle"
                                alignmentBaseline="after-edge"
                            >
                                {currentChannelName}
                            </textPath>
                        </text>
                    )}
                </g>
            )}
            {dataChannelPaths.map((dataChannelPath) => (
                <g key={dataChannelPath.key}>
                    {dataChannelPath.origin.x < dataChannelPath.destination.x ? (
                        <path
                            id={dataChannelPath.key}
                            d={`M ${dataChannelPath.origin.x} ${dataChannelPath.origin.y} C ${dataChannelPath.midPoint1.x} ${dataChannelPath.midPoint1.y} ${dataChannelPath.midPoint2.x} ${dataChannelPath.midPoint2.y} ${dataChannelPath.destination.x} ${dataChannelPath.destination.y}`}
                            stroke={dataChannelPath.highlighted ? "red" : "#aaa"}
                            fill="transparent"
                            markerEnd={`url(#arrowhead-right${dataChannelPath.highlighted ? "-active" : ""})`}
                        />
                    ) : (
                        <path
                            id={dataChannelPath.key}
                            d={`M ${dataChannelPath.destination.x} ${dataChannelPath.destination.y} C ${dataChannelPath.midPoint2.x} ${dataChannelPath.midPoint2.y} ${dataChannelPath.midPoint1.x} ${dataChannelPath.midPoint1.y} ${dataChannelPath.origin.x} ${dataChannelPath.origin.y}`}
                            stroke={dataChannelPath.highlighted ? "red" : "#aaa"}
                            fill="transparent"
                            markerStart={`url(#arrowhead-left${dataChannelPath.highlighted ? "-active" : ""})`}
                        />
                    )}
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
