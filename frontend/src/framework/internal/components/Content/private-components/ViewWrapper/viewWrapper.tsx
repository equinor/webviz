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

    const timeRef = React.useRef<number | null>(null);
    const pointerDown = React.useRef<boolean>(false);

    // "Active path" flash: when a connected module becomes active, briefly flash this module's border
    const [flashColor, setFlashColor] = React.useState<string | null>(null);
    const [flashPhase, setFlashPhase] = React.useState<"on" | "fading">("on");
    const prevActiveRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (!activeModuleInstanceId || activeModuleInstanceId === prevActiveRef.current) {
            prevActiveRef.current = activeModuleInstanceId;
            return;
        }
        prevActiveRef.current = activeModuleInstanceId;

        // Don't flash the module that was just clicked (it already gets the blue active border)
        if (activeModuleInstanceId === props.moduleInstance.getId()) return;

        // Check if the newly-active module is connected to this module
        const activeInfo = connectionGroupColors.get(activeModuleInstanceId);
        if (!activeInfo || !connectionInfo) return;

        // Find a shared group between this module and the newly-active module
        const sharedGroup = connectionInfo.groups.find((g) =>
            activeInfo.groups.some(
                (ag) => ag.publisherInstanceId === g.publisherInstanceId && ag.channelDisplayName === g.channelDisplayName,
            ),
        );
        if (!sharedGroup) return;

        // Phase 1: flash ON
        setFlashColor(sharedGroup.color);
        setFlashPhase("on");

        // Phase 2: start fading after 400ms
        const fadeTimer = setTimeout(() => setFlashPhase("fading"), 400);
        // Phase 3: remove after fade completes
        const removeTimer = setTimeout(() => setFlashColor(null), 1000);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, [activeModuleInstanceId, connectionGroupColors, connectionInfo, props.moduleInstance]);

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
                            "absolute w-full h-full z-10 inset-0 bg-transparent box-border border-solid pointer-events-none",
                            {
                                "border-2 border-blue-500": showAsActive && !flashColor,
                                "border-2 border-transparent": !showAsActive && !flashColor,
                                "border-[3px]": !!flashColor,
                            },
                        )}
                        style={
                            flashColor
                                ? {
                                      borderColor: flashPhase === "on" ? flashColor : "transparent",
                                      transition:
                                          flashPhase === "on"
                                              ? "border-color 0.05s ease-in"
                                              : "border-color 0.6s ease-out",
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
