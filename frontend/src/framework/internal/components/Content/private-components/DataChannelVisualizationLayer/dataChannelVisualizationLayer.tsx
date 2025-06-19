import React from "react";

import type { GuiEventPayloads } from "@framework/GuiMessageBroker";
import { GuiEvent, GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { Vec2 } from "@lib/utils/vec2";

export type DataChannelVisualizationProps = {
    workbench: Workbench;
};

type DataChannelPath = {
    key: string;
    origin: Vec2;
    midPoint1: Vec2;
    midPoint2: Vec2;
    destination: Vec2;
    description: string;
    descriptionCenterPoint: Vec2;
    highlighted: boolean;
};

export const DataChannelVisualizationLayer: React.FC<DataChannelVisualizationProps> = (props) => {
    const dashboard = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD,
    );
    const ref = React.useRef<SVGSVGElement>(null);
    const [visible, setVisible] = React.useState<boolean>(false);
    const [originPoint, setOriginPoint] = React.useState<Vec2>({ x: 0, y: 0 });
    const [currentPointerPosition, setCurrentPointerPosition] = React.useState<Vec2>({ x: 0, y: 0 });
    const [currentChannelName, setCurrentChannelName] = React.useState<string | null>(null);
    const [showDataChannelConnections, setShowDataChannelConnections] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.DataChannelConnectionLayerVisible,
    );
    const [highlightedDataChannelConnection, setHighlightedDataChannelConnection] = React.useState<{
        moduleInstanceId: string;
        receiverIdString: string;
    } | null>(null);
    const [editDataChannelConnectionsForModuleInstanceId, setEditDataChannelConnectionsForModuleInstanceId] =
        React.useState<string | null>(null);

    // When data channels are changed within a module, we need to force a rerender to update the drawn arrows
    const forceRerender = React.useReducer((x) => x + 1, 0)[1];

    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const boundingRect = useElementBoundingRect(ref);

    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    React.useEffect(() => {
        let localMousePressed = false;
        let localCurrentOriginPoint: Vec2 = { x: 0, y: 0 };
        let localEditDataChannelConnections = false;
        let resizeObserver: ResizeObserver | null = null;

        function handleDataChannelOriginPointerDown(payload: GuiEventPayloads[GuiEvent.DataChannelOriginPointerDown]) {
            const clientRect = payload.originElement.getBoundingClientRect();
            localCurrentOriginPoint = {
                x: clientRect.left + clientRect.width / 2,
                y: clientRect.top + clientRect.height / 2,
            };
            setVisible(true);
            setOriginPoint(localCurrentOriginPoint);
            localMousePressed = true;
            setCurrentPointerPosition(localCurrentOriginPoint);
            setCurrentChannelName(null);
            setShowDataChannelConnections(true);
            addDraggingEventListeners();

            const moduleInstance = dashboard.getModuleInstance(payload.moduleInstanceId);
            if (!moduleInstance) {
                return;
            }

            const availableChannels = moduleInstance.getChannelManager().getChannels();
            if (Object.keys(availableChannels).length === 1) {
                setCurrentChannelName(Object.values(availableChannels)[0].getDisplayName());
                return;
            }
        }

        function handlePointerUp() {
            localMousePressed = false;

            if (localEditDataChannelConnections) {
                return;
            }
            setShowDataChannelConnections(false);
            setEditDataChannelConnectionsForModuleInstanceId(null);

            removeDraggingEventListeners();
        }

        function handleDataChannelDone() {
            localEditDataChannelConnections = false;
            setVisible(false);
            setEditDataChannelConnectionsForModuleInstanceId(null);
            setShowDataChannelConnections(false);
            setShowDataChannelConnections(false);

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            disconnectResizeObserver();
            removeDraggingEventListeners();
        }

        function handlePointerMove(e: PointerEvent) {
            if (!localMousePressed) {
                return;
            }

            // Prevent any scrolling on touch devices
            e.preventDefault();
            e.stopPropagation();

            const hoveredElement = document.elementFromPoint(e.clientX, e.clientY);
            const receiverNode = hoveredElement?.closest("[data-channelconnector]");
            if (
                receiverNode &&
                receiverNode instanceof HTMLElement &&
                receiverNode.hasAttribute("data-channelconnector")
            ) {
                const boundingRect = receiverNode.getBoundingClientRect();
                setCurrentPointerPosition({
                    x: boundingRect.left + boundingRect.width / 2,
                    y: boundingRect.top,
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

        function handleEditDataChannelConnectionsRequest(
            payload: GuiEventPayloads[GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest],
        ) {
            localEditDataChannelConnections = true;
            setEditDataChannelConnectionsForModuleInstanceId(payload.moduleInstanceId);
            setShowDataChannelConnections(true);

            addResizeObserver();
        }

        function handleHighlightDataChannelConnectionRequest(
            payload: GuiEventPayloads[GuiEvent.HighlightDataChannelConnectionRequest],
        ) {
            setHighlightedDataChannelConnection({
                moduleInstanceId: payload.moduleInstanceId,
                receiverIdString: payload.receiverIdString,
            });
        }

        function addDraggingEventListeners() {
            document.addEventListener("pointerup", handlePointerUp);
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointercancel", handlePointerUp);
            document.addEventListener("blur-sm", handlePointerUp);
        }

        function removeDraggingEventListeners() {
            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointercancel", handlePointerUp);
            document.removeEventListener("blur-sm", handlePointerUp);
        }

        function addResizeObserver() {
            if (!ref.current) {
                return;
            }

            if (resizeObserver) {
                resizeObserver.disconnect();
            }

            resizeObserver = new ResizeObserver(handleConnectionChange);
            resizeObserver.observe(ref.current);
        }

        function disconnectResizeObserver() {
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        }

        function handleUnhighlightDataChannelConnectionRequest() {
            setHighlightedDataChannelConnection(null);
        }

        const removeHighlightDataChannelConnectionRequestHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.HighlightDataChannelConnectionRequest,
            handleHighlightDataChannelConnectionRequest,
        );

        const removeUnhighlightDataChannelConnectionRequestHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.UnhighlightDataChannelConnectionRequest,
            handleUnhighlightDataChannelConnectionRequest,
        );

        const removeEditDataChannelConnectionsRequestHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest,
            handleEditDataChannelConnectionsRequest,
        );

        const removeDataChannelOriginPointerDownHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.DataChannelOriginPointerDown,
            handleDataChannelOriginPointerDown,
        );
        const removeDataChannelPointerUpHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.DataChannelPointerUp,
            handlePointerUp,
        );
        const removeDataChannelDoneHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.HideDataChannelConnectionsRequest,
            handleDataChannelDone,
        );
        const removeConnectionChangeHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.DataChannelConnectionsChange,
            handleConnectionChange,
        );

        return () => {
            removeEditDataChannelConnectionsRequestHandler();
            removeHighlightDataChannelConnectionRequestHandler();
            removeUnhighlightDataChannelConnectionRequestHandler();
            removeDataChannelOriginPointerDownHandler();
            removeDataChannelPointerUpHandler();
            removeDataChannelDoneHandler();
            removeConnectionChangeHandler();

            removeDraggingEventListeners();
            disconnectResizeObserver();
        };
    }, [forceRerender, guiMessageBroker, dashboard, setShowDataChannelConnections]);

    let midPointY = (originPoint.y + currentPointerPosition.y) / 2;

    if (currentPointerPosition.y < originPoint.y) {
        midPointY = currentPointerPosition.y / 2;
    }

    const midPoint1: Vec2 = {
        x: originPoint.x,
        y: midPointY,
    };

    const midPoint2: Vec2 = {
        x: currentPointerPosition.x,
        y: midPointY,
    };

    function makeDataChannelPaths() {
        const dataChannelPaths: DataChannelPath[] = [];
        for (const moduleInstance of dashboard.getModuleInstances()) {
            if (
                editDataChannelConnectionsForModuleInstanceId &&
                moduleInstance.getId() !== editDataChannelConnectionsForModuleInstanceId
            ) {
                continue;
            }
            const receivers = moduleInstance.getChannelManager().getReceivers();
            if (!receivers) {
                continue;
            }

            for (const receiver of receivers) {
                const channel = receiver.getChannel();
                if (!channel) {
                    continue;
                }

                const originModuleInstanceId = channel.getManager().getModuleInstanceId();
                const originModuleInstance = dashboard.getModuleInstance(originModuleInstanceId);
                if (!originModuleInstance) {
                    continue;
                }

                const originElement = document.getElementById(
                    `moduleinstance-${originModuleInstanceId}-data-channel-origin`,
                );
                const destinationElement = document.getElementById(
                    `channel-connector-${moduleInstance.getId()}-${receiver.getIdString()}`,
                );
                if (!originElement || !destinationElement) {
                    continue;
                }

                const originRect = originElement.getBoundingClientRect();
                const destinationRect = destinationElement.getBoundingClientRect();

                const originPoint: Vec2 = {
                    x: originRect.left + originRect.width / 2,
                    y: originRect.top + originRect.height / 2,
                };

                const destinationPoint: Vec2 = {
                    x: destinationRect.left + destinationRect.width / 2,
                    // y: destinationRect.top < originPoint.y ? destinationRect.bottom + 20 : destinationRect.top - 20,
                    y: destinationRect.top - 20,
                };

                let midPointY = (originPoint.y + destinationPoint.y) / 2;

                if (destinationPoint.y < originPoint.y) {
                    midPointY = destinationPoint.y / 2;
                }

                const midPoint1: Vec2 = {
                    x: originPoint.x,
                    y: midPointY,
                };

                const midPoint2: Vec2 = {
                    x: destinationPoint.x,
                    y: midPointY,
                };

                const descriptionCenterPoint: Vec2 = {
                    x: (originPoint.x + destinationPoint.x) / 2,
                    y: (originPoint.y + destinationPoint.y) / 2,
                };

                const highlighted =
                    highlightedDataChannelConnection?.receiverIdString === receiver.getIdString() &&
                    highlightedDataChannelConnection?.moduleInstanceId === moduleInstance.getId();

                const contents = channel
                    .getContents()
                    .filter((el) => receiver.getContentIdStrings().includes(el.getIdString()))
                    .map((el) => el.getDisplayName());

                let contentsDescription = "";

                if (contents.length === 1) {
                    contentsDescription = contents[0];
                }

                if (contents.length > 1) {
                    contentsDescription = `(${contents[0]} + ${contents.length - 1} more)`;
                }

                dataChannelPaths.push({
                    key: `${originModuleInstanceId}-${moduleInstance.getId()}-${receiver.getIdString()}-${JSON.stringify(
                        boundingRect,
                    )}`,
                    origin: originPoint,
                    midPoint1: midPoint1,
                    midPoint2: midPoint2,
                    destination: destinationPoint,
                    description: `${channel.getDisplayName()} ${contentsDescription}`,
                    descriptionCenterPoint: descriptionCenterPoint,
                    highlighted: highlighted,
                });
            }
        }
        return dataChannelPaths;
    }

    const dataChannelPaths = makeDataChannelPaths();

    return createPortal(
        <svg
            ref={ref}
            className={resolveClassNames("absolute bg-slate-50/70 left-0 top-0 h-full w-full z-40", {
                invisible: !visible && !showDataChannelConnections,
            })}
        >
            <defs>
                <marker id="arrowhead-right" markerWidth="20" markerHeight="14" refX="0" refY="7" orient="auto">
                    <polygon points="0 0, 20 7, 0 14" />
                </marker>
                <marker
                    id="arrowhead-right-active"
                    fill="blue"
                    markerWidth="20"
                    markerHeight="14"
                    refX="0"
                    refY="7"
                    orient="auto"
                >
                    <polygon points="0 0, 20 7, 0 14" />
                </marker>
                <marker
                    id="arrowhead-right-remove"
                    fill="red"
                    markerWidth="20"
                    markerHeight="14"
                    refX="0"
                    refY="7"
                    orient="auto"
                >
                    <polygon points="0 0, 20 7, 0 14" />
                </marker>
                <marker
                    id="arrowhead-right-add"
                    fill="green"
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
                    fill="blue"
                    markerWidth="20"
                    markerHeight="14"
                    refX="20"
                    refY="7"
                    orient="auto"
                >
                    <polygon points="20 0, 0 7, 20 14" />
                </marker>
                <marker
                    id="arrowhead-left-remove"
                    fill="red"
                    markerWidth="20"
                    markerHeight="14"
                    refX="20"
                    refY="7"
                    orient="auto"
                >
                    <polygon points="20 0, 0 7, 20 14" />
                </marker>
                <marker
                    id="arrowhead-left-add"
                    fill="green"
                    markerWidth="20"
                    markerHeight="14"
                    refX="20"
                    refY="7"
                    orient="auto"
                >
                    <polygon points="20 0, 0 7, 20 14" />
                </marker>
            </defs>
            {dataChannelPaths.map((dataChannelPath) => {
                let color = "#aaa";
                let path = `M ${dataChannelPath.origin.x} ${dataChannelPath.origin.y} C ${dataChannelPath.midPoint1.x} ${dataChannelPath.midPoint1.y} ${dataChannelPath.midPoint2.x} ${dataChannelPath.midPoint2.y} ${dataChannelPath.destination.x} ${dataChannelPath.destination.y}`;
                let arrowHeadUrl = "#arrowhead-right";
                let markerEnd = true;
                if (dataChannelPath.origin.x >= dataChannelPath.destination.x) {
                    path = `M ${dataChannelPath.destination.x} ${dataChannelPath.destination.y} C ${dataChannelPath.midPoint2.x} ${dataChannelPath.midPoint2.y} ${dataChannelPath.midPoint1.x} ${dataChannelPath.midPoint1.y} ${dataChannelPath.origin.x} ${dataChannelPath.origin.y}`;
                    arrowHeadUrl = "#arrowhead-left";
                    markerEnd = false;
                }
                if (dataChannelPath.highlighted) {
                    if (visible) {
                        color = "red";
                        arrowHeadUrl = `${arrowHeadUrl}-remove`;
                    } else {
                        color = "blue";
                        arrowHeadUrl = `${arrowHeadUrl}-active`;
                    }
                }

                return (
                    <g key={dataChannelPath.key}>
                        <path
                            id={dataChannelPath.key}
                            d={path}
                            stroke={color}
                            fill="transparent"
                            {...{
                                [markerEnd ? "markerEnd" : "markerStart"]: `url(${arrowHeadUrl})`,
                            }}
                        />
                        {dataChannelPath.highlighted && !visible && (
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
                        )}
                    </g>
                );
            })}
            {visible && (
                <g>
                    {originPoint.x < currentPointerPosition.x ? (
                        <path
                            id="current-data-channel-path"
                            d={`M ${originPoint.x} ${originPoint.y} C ${midPoint1.x} ${midPoint1.y} ${midPoint2.x} ${
                                midPoint2.y
                            } ${currentPointerPosition.x} ${currentPointerPosition.y - 20}`}
                            stroke="green"
                            fill="transparent"
                            className={resolveClassNames({ invisible: !visible })}
                            markerEnd="url(#arrowhead-right-add)"
                        />
                    ) : (
                        <path
                            id="current-data-channel-path"
                            d={`M ${currentPointerPosition.x} ${currentPointerPosition.y - 20} C ${midPoint2.x} ${
                                midPoint2.y
                            } ${midPoint1.x} ${midPoint1.y} ${originPoint.x} ${originPoint.y}`}
                            stroke="green"
                            fill="transparent"
                            className={resolveClassNames({ invisible: !visible })}
                            markerStart="url(#arrowhead-left-add)"
                        />
                    )}
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
        </svg>,
    );
};
