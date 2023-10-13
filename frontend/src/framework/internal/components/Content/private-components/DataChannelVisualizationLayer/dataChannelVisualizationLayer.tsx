import React from "react";
import ReactDOM from "react-dom";

import { GuiEvent, GuiEventPayloads, GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { GlobalCursorType } from "@framework/internal/GlobalCursor";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { Point } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

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

export const DataChannelVisualizationLayer: React.FC<DataChannelVisualizationProps> = (props) => {
    const ref = React.useRef<SVGSVGElement>(null);
    const [visible, setVisible] = React.useState<boolean>(false);
    const [originPoint, setOriginPoint] = React.useState<Point>({ x: 0, y: 0 });
    const [currentPointerPosition, setCurrentPointerPosition] = React.useState<Point>({ x: 0, y: 0 });
    const [currentChannelName, setCurrentChannelName] = React.useState<string | null>(null);
    const [showDataChannelConnections, setShowDataChannelConnections] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.DataChannelConnectionLayerVisible
    );
    const [highlightedDataChannelConnection, setHighlightedDataChannelConnection] = React.useState<{
        moduleInstanceId: string;
        dataChannelName: string;
    } | null>(null);
    const [editDataChannelConnectionsForModuleInstanceId, setEditDataChannelConnectionsForModuleInstanceId] =
        React.useState<string | null>(null);

    // When data channels are changed within a module, we need to force a rerender to update the drawn arrows
    const forceRerender = React.useReducer((x) => x + 1, 0)[1];

    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const boundingRect = useElementBoundingRect(ref);

    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const [, setDataChannelConnectionsLayerVisible] = useGuiState(
        guiMessageBroker,
        GuiState.DataChannelConnectionLayerVisible
    );

    React.useEffect(() => {
        let localMousePressed = false;
        let localCurrentOriginPoint: Point = { x: 0, y: 0 };
        let localEditDataChannelConnections = false;

        function handleDataChannelOriginPointerDown(payload: GuiEventPayloads[GuiEvent.DataChannelOriginPointerDown]) {
            const clientRect = payload.originElement.getBoundingClientRect();
            localCurrentOriginPoint = {
                x: clientRect.left + clientRect.width / 2,
                y: clientRect.top + clientRect.height / 2,
            };
            setVisible(true);
            setOriginPoint(localCurrentOriginPoint);
            guiMessageBroker.getGlobalCursor().setOverrideCursor(GlobalCursorType.Crosshair);
            localMousePressed = true;
            setCurrentPointerPosition(localCurrentOriginPoint);
            setCurrentChannelName(null);
            setDataChannelConnectionsLayerVisible(true);

            const moduleInstance = props.workbench.getModuleInstance(payload.moduleInstanceId);
            if (!moduleInstance) {
                return;
            }

            const availableChannels = moduleInstance.getBroadcastChannels();
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
        }

        function handleDataChannelDone() {
            localEditDataChannelConnections = false;
            setVisible(false);
            setEditDataChannelConnectionsForModuleInstanceId(null);
            setShowDataChannelConnections(false);
            guiMessageBroker.getGlobalCursor().restoreOverrideCursor();
            setDataChannelConnectionsLayerVisible(false);
        }

        function handlePointerMove(e: PointerEvent) {
            if (!localMousePressed) {
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
                    y: localCurrentOriginPoint.y > boundingRect.top ? boundingRect.bottom : boundingRect.top,
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

        function handleNodeHover(payload: GuiEventPayloads[GuiEvent.DataChannelNodeHover]) {
            if (!localEditDataChannelConnections) {
                if (payload.connectionAllowed) {
                    guiMessageBroker.getGlobalCursor().changeOverrideCursor(GlobalCursorType.Copy);
                } else {
                    guiMessageBroker.getGlobalCursor().changeOverrideCursor(GlobalCursorType.NotAllowed);
                }
            }
        }

        function handleNodeUnhover() {
            guiMessageBroker.getGlobalCursor().restoreOverrideCursor();
        }

        function handleEditDataChannelConnectionsRequest(
            payload: GuiEventPayloads[GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest]
        ) {
            localEditDataChannelConnections = true;
            setEditDataChannelConnectionsForModuleInstanceId(payload.moduleInstanceId);
            setShowDataChannelConnections(true);
        }

        function handleHighlightDataChannelConnectionRequest(
            payload: GuiEventPayloads[GuiEvent.HighlightDataChannelConnectionRequest]
        ) {
            setHighlightedDataChannelConnection({
                moduleInstanceId: payload.moduleInstanceId,
                dataChannelName: payload.dataChannelName,
            });
        }

        function handleUnhighlightDataChannelConnectionRequest() {
            setHighlightedDataChannelConnection(null);
        }

        const removeHighlightDataChannelConnectionRequestHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.HighlightDataChannelConnectionRequest,
            handleHighlightDataChannelConnectionRequest
        );

        const removeUnhighlightDataChannelConnectionRequestHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.UnhighlightDataChannelConnectionRequest,
            handleUnhighlightDataChannelConnectionRequest
        );

        const removeEditDataChannelConnectionsRequestHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest,
            handleEditDataChannelConnectionsRequest
        );

        const removeDataChannelOriginPointerDownHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.DataChannelOriginPointerDown,
            handleDataChannelOriginPointerDown
        );
        const removeDataChannelPointerUpHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.DataChannelPointerUp,
            handlePointerUp
        );
        const removeDataChannelDoneHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.HideDataChannelConnectionsRequest,
            handleDataChannelDone
        );
        const removeConnectionChangeHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.DataChannelConnectionsChange,
            handleConnectionChange
        );
        const removeNodeHoverHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.DataChannelNodeHover,
            handleNodeHover
        );
        const removeNodeUnhoverHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.DataChannelNodeUnhover,
            handleNodeUnhover
        );

        document.addEventListener("pointerup", handlePointerUp);
        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("resize", handleConnectionChange);

        return () => {
            removeEditDataChannelConnectionsRequestHandler();
            removeHighlightDataChannelConnectionRequestHandler();
            removeUnhighlightDataChannelConnectionRequestHandler();
            removeDataChannelOriginPointerDownHandler();
            removeDataChannelPointerUpHandler();
            removeDataChannelDoneHandler();
            removeConnectionChangeHandler();
            removeNodeHoverHandler();
            removeNodeUnhoverHandler();

            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("resize", handleConnectionChange);
        };
    }, []);
    let midPointY = (originPoint.y + currentPointerPosition.y) / 2;

    if (currentPointerPosition.y < originPoint.y + 40 && currentPointerPosition.y > originPoint.y) {
        midPointY = originPoint.y - 20;
    } else if (currentPointerPosition.y > originPoint.y - 40 && currentPointerPosition.y < originPoint.y) {
        midPointY = originPoint.y + 20;
    }

    const midPoint1: Point = {
        x: originPoint.x,
        y: midPointY,
    };

    const midPoint2: Point = {
        x: currentPointerPosition.x,
        y: midPointY,
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
                    highlightedDataChannelConnection?.dataChannelName === inputChannelName &&
                    highlightedDataChannelConnection?.moduleInstanceId === moduleInstance.getId();

                dataChannelPaths.push({
                    key: `${originModuleInstanceId}-${moduleInstance.getId()}-${inputChannelName}-${JSON.stringify(
                        boundingRect
                    )}`,
                    origin: originPoint,
                    midPoint1: midPoint1,
                    midPoint2: midPoint2,
                    destination: destinationPoint,
                    description: inputChannel.getDisplayName(),
                    descriptionCenterPoint: descriptionCenterPoint,
                    highlighted: highlighted,
                });
            }
        }
        return dataChannelPaths;
    }

    if (!visible && !showDataChannelConnections) {
        return null;
    }

    const dataChannelPaths = makeDataChannelPaths();

    return ReactDOM.createPortal(
        <svg
            ref={ref}
            className={resolveClassNames("absolute bg-slate-50 left-0 top-0 h-full w-full z-40 bg-opacity-70", {
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
            </defs>
            {visible && (
                <g>
                    {originPoint.x < currentPointerPosition.x ? (
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
                    ) : (
                        <path
                            id="current-data-channel-path"
                            d={`M ${currentPointerPosition.x} ${
                                currentPointerPosition.y + (currentPointerPosition.y > originPoint.y ? -20 : 20)
                            } C ${midPoint2.x} ${midPoint2.y} ${midPoint1.x} ${midPoint1.y} ${originPoint.x} ${
                                originPoint.y
                            }`}
                            stroke="black"
                            fill="transparent"
                            className={resolveClassNames({ invisible: !visible })}
                            markerStart="url(#arrowhead-left)"
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
            {dataChannelPaths.map((dataChannelPath) => (
                <g key={dataChannelPath.key}>
                    {dataChannelPath.origin.x < dataChannelPath.destination.x ? (
                        <path
                            id={dataChannelPath.key}
                            d={`M ${dataChannelPath.origin.x} ${dataChannelPath.origin.y} C ${dataChannelPath.midPoint1.x} ${dataChannelPath.midPoint1.y} ${dataChannelPath.midPoint2.x} ${dataChannelPath.midPoint2.y} ${dataChannelPath.destination.x} ${dataChannelPath.destination.y}`}
                            stroke={dataChannelPath.highlighted ? "blue" : "#aaa"}
                            fill="transparent"
                            markerEnd={`url(#arrowhead-right${dataChannelPath.highlighted ? "-active" : ""})`}
                        />
                    ) : (
                        <path
                            id={dataChannelPath.key}
                            d={`M ${dataChannelPath.destination.x} ${dataChannelPath.destination.y} C ${dataChannelPath.midPoint2.x} ${dataChannelPath.midPoint2.y} ${dataChannelPath.midPoint1.x} ${dataChannelPath.midPoint1.y} ${dataChannelPath.origin.x} ${dataChannelPath.origin.y}`}
                            stroke={dataChannelPath.highlighted ? "blue" : "#aaa"}
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
        </svg>,
        document.body
    );
};
