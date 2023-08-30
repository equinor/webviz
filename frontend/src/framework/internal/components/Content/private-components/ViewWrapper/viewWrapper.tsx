import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";
import { useStoreState } from "@framework/StateStore";
import { DrawerContent, Workbench } from "@framework/Workbench";
import { Point, pointDifference, pointRelativeToDomRect, pointerEventToPoint } from "@lib/utils/geometry";

import { Header } from "./private-components/header";
import { ViewContent } from "./private-components/viewContent";

import { LayoutEventTypes } from "../layout";
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
    const [drawerContent, setDrawerContent] = useStoreState(props.workbench.getGuiStateStore(), "drawerContent");
    const [settingsPanelWidth, setSettingsPanelWidth] = useStoreState(
        props.workbench.getGuiStateStore(),
        "settingsPanelWidthInPercent"
    );

    const timeRef = React.useRef<number | null>(null);

    const handleHeaderPointerDown = React.useCallback(
        function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
            if (ref.current) {
                const point = pointerEventToPoint(e.nativeEvent);
                const rect = ref.current.getBoundingClientRect();
                document.dispatchEvent(
                    new CustomEvent(LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN, {
                        detail: {
                            id: props.moduleInstance.getId(),
                            elementPosition: pointDifference(point, pointRelativeToDomRect(point, rect)),
                            pointerPoint: point,
                        },
                    })
                );
            }
        },
        [props.moduleInstance]
    );

    const handleRemoveClick = React.useCallback(
        function handleRemoveClick(e: React.PointerEvent<HTMLDivElement>) {
            document.dispatchEvent(
                new CustomEvent(LayoutEventTypes.REMOVE_MODULE_INSTANCE_REQUEST, {
                    detail: {
                        id: props.moduleInstance.getId(),
                    },
                })
            );
            e.preventDefault();
            e.stopPropagation();
        },
        [props.moduleInstance]
    );

    function handleModuleClick() {
        if (settingsPanelWidth <= 5) {
            setSettingsPanelWidth(20);
        }
        if (drawerContent !== DrawerContent.SyncSettings) {
            setDrawerContent(DrawerContent.ModuleSettings);
        }
        if (props.isActive) return;
        props.workbench.setActiveModuleId(props.moduleInstance.getId());
    }

    function handlePointerDown() {
        timeRef.current = Date.now();
    }

    function handlePointerUp() {
        if (drawerContent === DrawerContent.ModulesList) {
            if (!timeRef.current || Date.now() - timeRef.current < 800) {
                handleModuleClick();
            }
            return;
        }
        handleModuleClick();
    }

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
                        props.isActive ? "border-blue-500" : ""
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
                    />
                    <div className="flex-grow overflow-auto h-0" onClick={handleModuleClick}>
                        <ViewContent workbench={props.workbench} moduleInstance={props.moduleInstance} />
                    </div>
                </div>
            </div>
        </>
    );
};
