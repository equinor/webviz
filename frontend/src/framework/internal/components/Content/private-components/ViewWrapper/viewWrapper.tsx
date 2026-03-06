import React from "react";

import { GuiEvent, GuiState, LeftDrawerContent, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { useActiveDashboard } from "@framework/internal/components/ActiveDashboardBoundary";
import { useConnectionGroupColors } from "@framework/internal/components/useConnectionGroupColors";
import { DashboardTopic } from "@framework/internal/Dashboard";
import type { ModuleInstance } from "@framework/ModuleInstance";
import type { Workbench } from "@framework/Workbench";
import { pointRelativeToDomRect } from "@lib/utils/geometry";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { Vec2 } from "@lib/utils/vec2";
import { subtractVec2, vec2FromPointerEvent } from "@lib/utils/vec2";

import { ViewWrapperPlaceholder } from "../viewWrapperPlaceholder";

import { ChannelReceiverNodesWrapper } from "./private-components/channelReceiverNodesWrapper";
import { Header } from "./private-components/header";
import { ViewContent } from "./private-components/viewContent";

type ViewWrapperProps = {
    isMaximized?: boolean;
    isMinimized?: boolean;
    moduleInstance: ModuleInstance<any, any>;
    workbench: Workbench;
    width: number;
    height: number;
    x: number;
    y: number;
    isDragged: boolean;
    dragPosition: Vec2;
    changingLayout: boolean;
};

export const ViewWrapper: React.FC<ViewWrapperProps> = (props) => {
    const dashboard = useActiveDashboard();
    const [prevWidth, setPrevWidth] = React.useState<number>(props.width);
    const [prevHeight, setPrevHeight] = React.useState<number>(props.height);
    const [prevX, setPrevX] = React.useState<number>(props.x);
    const [prevY, setPrevY] = React.useState<number>(props.y);

    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ACTIVE_MODULE_INSTANCE_ID);
    const isActive = props.moduleInstance.getId() === activeModuleInstanceId;

    const ref = React.useRef<HTMLDivElement>(null);
    const [drawerContent, setDrawerContent] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftDrawerContent,
    );
    const [leftSettingsPanelWidth, setLeftSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelWidthInPercent,
    );

    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const dataChannelConnectionsLayerVisible = useGuiValue(
        guiMessageBroker,
        GuiState.DataChannelConnectionLayerVisible,
    );

    const [, setEditDataChannelConnections] = useGuiState(guiMessageBroker, GuiState.EditDataChannelConnections);

    const connectionGroupColors = useConnectionGroupColors();
    const connectionInfo = connectionGroupColors.get(props.moduleInstance.getId());

    // Hover-highlight from settings panel connection cards
    const highlightedModuleInstanceId = useGuiValue(guiMessageBroker, GuiState.HighlightedModuleInstanceId);
    const isHighlighted = highlightedModuleInstanceId === props.moduleInstance.getId();

    const timeRef = React.useRef<number | null>(null);
    const pointerDown = React.useRef<boolean>(false);

    if (props.width !== prevWidth && !props.changingLayout) {
        setPrevWidth(props.width);
    }

    if (props.height !== prevHeight && !props.changingLayout) {
        setPrevHeight(props.height);
    }

    if (props.x !== prevX && !props.changingLayout) {
        setPrevX(props.x);
    }

    if (props.y !== prevY && !props.changingLayout) {
        setPrevY(props.y);
    }

    const handleHeaderPointerDown = React.useCallback(
        function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
            if (ref.current) {
                const point = vec2FromPointerEvent(e.nativeEvent);
                const rect = ref.current.getBoundingClientRect();
                guiMessageBroker.publishEvent(GuiEvent.ModuleHeaderPointerDown, {
                    moduleInstanceId: props.moduleInstance.getId(),
                    elementPosition: subtractVec2(point, pointRelativeToDomRect(point, rect)),
                    elementSize: { width: rect.width, height: rect.height },
                    pointerPosition: point,
                });
            }
        },
        [props.moduleInstance, guiMessageBroker],
    );

    function handleModuleClick() {
        if (dataChannelConnectionsLayerVisible) {
            return;
        }
        guiMessageBroker.setState(GuiState.HighlightedModuleInstanceId, null);
        if (leftSettingsPanelWidth <= 5) {
            setLeftSettingsPanelWidth(20);
        }
        if (drawerContent !== LeftDrawerContent.SyncSettings) {
            setDrawerContent(LeftDrawerContent.ModuleSettings);
        }
        if (isActive) return;
        dashboard.setActiveModuleInstanceId(props.moduleInstance.getId());
    }

    function handlePointerDown() {
        timeRef.current = Date.now();
        pointerDown.current = true;
    }

    function handlePointerUp() {
        if (!pointerDown.current) {
            return;
        }
        pointerDown.current = false;
        handleModuleClick();
    }

    function handleReceiversClick(e: React.PointerEvent<HTMLButtonElement>): void {
        guiMessageBroker.publishEvent(GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest, {
            moduleInstanceId: props.moduleInstance.getId(),
        });
        setEditDataChannelConnections(true);
        e.stopPropagation();
    }

    const showAsActive =
        isActive && [LeftDrawerContent.ModuleSettings, LeftDrawerContent.SyncSettings].includes(drawerContent);

    function makeHeader() {
        return (
            <Header
                workbench={props.workbench}
                isMaximized={props.isMaximized}
                isMinimized={props.isMinimized}
                moduleInstance={props.moduleInstance}
                isDragged={props.isDragged}
                onPointerDown={handleHeaderPointerDown}
                onReceiversClick={handleReceiversClick}
                connectionInfo={connectionInfo}
            />
        );
    }

    return (
        <>
            {props.isDragged && (
                <>
                    <ViewWrapperPlaceholder width={props.width} height={props.height} x={props.x} y={props.y} />
                </>
            )}
            {/* ! Show a placeholder while dragging modules around, since resizing module content while dragging might be costly */}
            {props.changingLayout && (
                <div
                    className={resolveClassNames("absolute box-border", { "p-0.5": !props.isMinimized })}
                    style={{
                        width: props.width,
                        height: props.height,
                        left: props.isDragged ? props.dragPosition.x : props.x,
                        top: props.isDragged ? props.dragPosition.y : props.y,
                        opacity: props.isDragged ? 0.5 : 1,
                        zIndex: props.isDragged ? 1 : 0,
                    }}
                >
                    <div className="bg-white h-full w-full flex flex-col border-solid border-2 box-border shadow-sm">
                        {makeHeader()}
                    </div>
                </div>
            )}
            <div
                ref={ref}
                className={resolveClassNames("absolute box-border contain-content", {
                    "p-0.5": !props.isMinimized,
                    invisible: props.changingLayout,
                })}
                style={{
                    width: prevWidth,
                    height: prevHeight,
                    left: prevX,
                    top: prevY,
                }}
            >
                <div
                    className={resolveClassNames(
                        "relative bg-white h-full w-full flex flex-col box-border shadow-sm border border-slate-100",
                        {
                            "cursor-grabbing select-none": props.isDragged,
                        },
                    )}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                >
                    <div
                        className={resolveClassNames(
                            "absolute w-full h-full z-10 inset-0 bg-transparent box-border border-solid pointer-events-none rounded-sm transition-shadow",
                            {
                                "border-[2.5px] border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]": showAsActive && !isHighlighted,
                                "border-2 border-transparent": !showAsActive && !isHighlighted,
                                "border-[2.5px]": isHighlighted,
                            },
                        )}
                        style={
                            isHighlighted && connectionInfo?.colors[0]
                                ? {
                                      borderColor: connectionInfo.colors[0],
                                      boxShadow: `0 0 12px ${hexToRgba(connectionInfo.colors[0], 0.5)}`,
                                  }
                                : undefined
                        }
                    />
                    <div className={resolveClassNames("flex flex-col grow min-w-0 min-h-0", { "p-1": !props.isMinimized })}>
                    {makeHeader()}
                    <div
                        className={resolveClassNames("grow overflow-auto h-0", {
                            hidden: props.changingLayout || props.isMinimized,
                        })}
                        onClick={handleModuleClick}
                    >
                        <ViewContent workbench={props.workbench} moduleInstance={props.moduleInstance} />
                        <ChannelReceiverNodesWrapper
                            forwardedRef={ref}
                            moduleInstance={props.moduleInstance}
                            workbench={props.workbench}
                        />
                    </div>
                    </div>
                </div>
            </div>
        </>
    );
};

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
