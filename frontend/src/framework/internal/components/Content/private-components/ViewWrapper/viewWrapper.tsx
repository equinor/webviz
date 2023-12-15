import React from "react";

import { DrawerContent, GuiEvent, GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { Point, pointDifference, pointRelativeToDomRect, pointerEventToPoint } from "@lib/utils/geometry";

import { Header } from "./private-components/header";
import { InputChannelNodes } from "./private-components/inputChannelNodeWrapper";
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
    dragPosition: Point;
};

export const ViewWrapper: React.FC<ViewWrapperProps> = (props) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const [drawerContent, setDrawerContent] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.DrawerContent
    );
    const [settingsPanelWidth, setSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SettingsPanelWidthInPercent
    );

    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const dataChannelConnectionsLayerVisible = useGuiValue(
        guiMessageBroker,
        GuiState.DataChannelConnectionLayerVisible
    );

    const timeRef = React.useRef<number | null>(null);
    const pointerDown = React.useRef<boolean>(false);

    const handleHeaderPointerDown = React.useCallback(
        function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
            if (ref.current) {
                const point = pointerEventToPoint(e.nativeEvent);
                const rect = ref.current.getBoundingClientRect();
                guiMessageBroker.publishEvent(GuiEvent.ModuleHeaderPointerDown, {
                    moduleInstanceId: props.moduleInstance.getId(),
                    elementPosition: pointDifference(point, pointRelativeToDomRect(point, rect)),
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
        if (settingsPanelWidth <= 5) {
            setSettingsPanelWidth(20);
        }
        if (drawerContent !== DrawerContent.SyncSettings) {
            setDrawerContent(DrawerContent.ModuleSettings);
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
        if (drawerContent === DrawerContent.ModulesList) {
            if (!timeRef.current || Date.now() - timeRef.current < 800) {
                handleModuleClick();
            }
            return;
        }
        handleModuleClick();
    }

    function handleInputChannelsClick(e: React.PointerEvent<HTMLDivElement>): void {
        guiMessageBroker.publishEvent(GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest, {
            moduleInstanceId: props.moduleInstance.getId(),
        });
        e.stopPropagation();
    }

    const showAsActive =
        props.isActive && [DrawerContent.ModuleSettings, DrawerContent.SyncSettings].includes(drawerContent);

    return (
        <>
            {props.isDragged && (
                <ViewWrapperPlaceholder width={props.width} height={props.height} x={props.x} y={props.y} />
            )}
            <div
                ref={ref}
                className="absolute box-border p-0.5"
                style={{
                    width: props.width,
                    height: props.height,
                    left: props.isDragged ? props.dragPosition.x : props.x,
                    top: props.isDragged ? props.dragPosition.y : props.y,
                    zIndex: props.isDragged ? 1 : 0,
                    opacity: props.isDragged ? 0.5 : 1,
                }}
            >
                <div
                    className={`bg-white h-full w-full flex flex-col ${
                        showAsActive && drawerContent ? "border-blue-500" : ""
                    } border-solid border-2 box-border shadow ${
                        props.isDragged ? "cursor-grabbing select-none" : "cursor-grab"
                    }}`}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                >
                    <Header
                        moduleInstance={props.moduleInstance}
                        isDragged={props.isDragged}
                        onPointerDown={handleHeaderPointerDown}
                        onRemoveClick={handleRemoveClick}
                        onInputChannelsClick={handleInputChannelsClick}
                        guiMessageBroker={guiMessageBroker}
                    />
                    <div className="flex-grow overflow-auto h-0" onClick={handleModuleClick}>
                        <ViewContent workbench={props.workbench} moduleInstance={props.moduleInstance} />
                        <InputChannelNodes
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
