import React from "react";

import { GuiEvent, GuiState, LeftDrawerContent, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { pointRelativeToDomRect } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Vec2, subtractVec2, vec2FromPointerEvent } from "@lib/utils/vec2";

import { ChannelReceiverNodesWrapper } from "./private-components/channelReceiverNodesWrapper";
import { Header } from "./private-components/header";
import { ViewContent } from "./private-components/viewContent";

import { ViewWrapperPlaceholder } from "../viewWrapperPlaceholder";

type ViewWrapperProps = {
    isActive: boolean;
    moduleInstance: ModuleInstance<any>;
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
    const [prevWidth, setPrevWidth] = React.useState<number>(props.width);
    const [prevHeight, setPrevHeight] = React.useState<number>(props.height);
    const [prevX, setPrevX] = React.useState<number>(props.x);
    const [prevY, setPrevY] = React.useState<number>(props.y);

    const ref = React.useRef<HTMLDivElement>(null);
    const [drawerContent, setDrawerContent] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftDrawerContent
    );
    const [leftSettingsPanelWidth, setLeftSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelWidthInPercent
    );

    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const dataChannelConnectionsLayerVisible = useGuiValue(
        guiMessageBroker,
        GuiState.DataChannelConnectionLayerVisible
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
        [props.moduleInstance, guiMessageBroker]
    );

    const handleRemoveClick = React.useCallback(
        function handleRemoveClick(e: React.PointerEvent<HTMLDivElement>) {
            guiMessageBroker.publishEvent(GuiEvent.RemoveModuleInstanceRequest, {
                moduleInstanceId: props.moduleInstance.getId(),
            });
            e.preventDefault();
            e.stopPropagation();
        },
        [props.moduleInstance, guiMessageBroker]
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
        if (props.isActive) return;
        props.workbench.getGuiMessageBroker().setState(GuiState.ActiveModuleInstanceId, props.moduleInstance.getId());
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
        if (drawerContent === LeftDrawerContent.ModulesList) {
            if (!timeRef.current || Date.now() - timeRef.current < 800) {
                handleModuleClick();
            }
            return;
        }
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
        props.isActive && [LeftDrawerContent.ModuleSettings, LeftDrawerContent.SyncSettings].includes(drawerContent);

    return (
        <>
            {props.isDragged && (
                <>
                    <ViewWrapperPlaceholder width={props.width} height={props.height} x={props.x} y={props.y} />
                </>
            )}
            {props.changingLayout && (
                <div
                    className="absolute box-border p-0.5"
                    style={{
                        width: props.width,
                        height: props.height,
                        left: props.isDragged ? props.dragPosition.x : props.x,
                        top: props.isDragged ? props.dragPosition.y : props.y,
                        opacity: props.isDragged ? 0.5 : 1,
                        zIndex: props.isDragged ? 1 : 0,
                    }}
                >
                    <div className="bg-white h-full w-full flex flex-col border-solid border-2 box-border shadow">
                        <Header
                            moduleInstance={props.moduleInstance}
                            isDragged={props.isDragged}
                            onPointerDown={handleHeaderPointerDown}
                            onRemoveClick={handleRemoveClick}
                            onReceiversClick={handleReceiversClick}
                            guiMessageBroker={guiMessageBroker}
                        />
                    </div>
                </div>
            )}
            <div
                ref={ref}
                className="absolute box-border p-0.5"
                style={{
                    width: prevWidth,
                    height: prevHeight,
                    left: prevX,
                    top: prevY,
                    contain: "content",
                    visibility: props.changingLayout ? "hidden" : "visible",
                }}
            >
                <div
                    className={resolveClassNames(
                        "relative bg-white h-full w-full flex flex-col box-border shadow p-1 border-slate-100",
                        {
                            "cursor-grabbing select-none": props.isDragged,
                        }
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
                            }
                        )}
                    />
                    <Header
                        moduleInstance={props.moduleInstance}
                        isDragged={props.isDragged}
                        onPointerDown={handleHeaderPointerDown}
                        onRemoveClick={handleRemoveClick}
                        onReceiversClick={handleReceiversClick}
                        guiMessageBroker={guiMessageBroker}
                    />
                    <div
                        className={resolveClassNames("flex-grow overflow-auto h-0", { hidden: props.changingLayout })}
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
