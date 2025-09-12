import React from "react";

import { GuiEvent, GuiState, LeftDrawerContent, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { DashboardTopic } from "@framework/internal/WorkbenchSession/Dashboard";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
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
    const dashboard = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD,
    );
    const [prevWidth, setPrevWidth] = React.useState<number>(props.width);
    const [prevHeight, setPrevHeight] = React.useState<number>(props.height);
    const [prevX, setPrevX] = React.useState<number>(props.x);
    const [prevY, setPrevY] = React.useState<number>(props.y);

    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ActiveModuleInstanceId);
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

    function handleReceiversClick(e: React.PointerEvent<HTMLDivElement>): void {
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
            {/* ! Show a placeholder while dragging modules around/resizing, since resizing module content while dragging might be costly */}
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
                    <div className="bg-white h-full w-full flex flex-col border-solid border-2 box-border shadow-sm p-1">
                        {makeHeader()}
                    </div>
                </div>
            )}
            <div
                ref={ref}
                className={resolveClassNames("absolute box-border contain-content", {
                    "p-0.5": !props.isMinimized,
                    invisible: props.changingLayout,
                    "z-10": props.isMaximized,
                })}
                style={{
                    width: props.isMaximized ? "100%" : prevWidth,
                    height: props.isMaximized ? "100%" : prevHeight,
                    left: props.isMaximized ? "0px" : prevX,
                    top: props.isMaximized ? "0px" : prevY,
                }}
            >
                <div
                    className={resolveClassNames(
                        "relative bg-white h-full w-full flex flex-col box-border shadow-sm border border-slate-100",
                        {
                            "cursor-grabbing select-none": props.isDragged,
                            "p-1": !props.isMinimized,
                        },
                    )}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                >
                    <div
                        className={resolveClassNames(
                            "absolute w-full h-full z-10 inset-0 bg-transparent box-border border-solid border-2 pointer-events-none",
                            {
                                "border-blue-500": showAsActive,
                                "border-transparent": !showAsActive,
                            },
                        )}
                    />
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
        </>
    );
};
