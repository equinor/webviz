import React from "react";

import { ImportState } from "@framework/Module";
import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { Point, pointRelativeToDomRect, pointerEventToPoint } from "@framework/utils/geometry";
import { XMarkIcon } from "@heroicons/react/20/solid";

import { LayoutEventTypes } from "./layout";
import { ViewWrapperPlaceholder } from "./viewWrapperPlaceholder";

import { pointDifference } from "../../../utils/geometry";

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
    const [importState, setImportState] = React.useState<ImportState>(ImportState.NotImported);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        setImportState(props.moduleInstance.getImportState());

        function handleModuleInstanceImportStateChange() {
            setImportState(props.moduleInstance.getImportState());
        }

        const unsubscribeFunc = props.moduleInstance.subscribeToImportStateChange(
            handleModuleInstanceImportStateChange
        );

        return unsubscribeFunc;
    }, []);

    const createContent = React.useCallback(
        function createContent(): React.ReactElement {
            if (importState === ImportState.NotImported) {
                return <div>Not imported</div>;
            }

            if (importState === ImportState.Importing || !props.moduleInstance.isInitialised()) {
                return <div>Loading...</div>;
            }

            if (importState === ImportState.Failed) {
                return (
                    <div>
                        Module could not be imported. Please check the spelling when registering and initialising the
                        module.
                    </div>
                );
            }

            const View = props.moduleInstance.getViewFC();
            return (
                <View
                    moduleContext={props.moduleInstance.getContext()}
                    workbenchServices={props.workbench.getWorkbenchServices()}
                />
            );
        },
        [props.moduleInstance, props.workbench, importState]
    );

    const handlePointerDown = React.useCallback(
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

    const handleModuleHeaderClick = React.useCallback(
        function handleModuleHeaderClick() {
            if (props.isActive) return;
            props.workbench.setActiveModuleId(props.moduleInstance.getId());
        },
        [props.moduleInstance, props.workbench, props.isActive]
    );

    return (
        <>
            {props.isDragged && (
                <ViewWrapperPlaceholder width={props.width} height={props.height} x={props.x} y={props.y} />
            )}
            <div
                ref={ref}
                className="absolute box-border p-2"
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
                    onClick={handleModuleHeaderClick}
                >
                    <div
                        className={`bg-slate-100 p-4 flex select-none ${
                            props.isDragged ? "cursor-grabbing" : "cursor-move"
                        }`}
                        onPointerDown={handlePointerDown}
                    >
                        <div className="flex-grow">{props.moduleInstance.getName()}</div>
                        <div
                            className="hover:text-slate-500 cursor-pointer"
                            onPointerDown={handleRemoveClick}
                            title="Remove this module"
                        >
                            <XMarkIcon width={24} />
                        </div>
                    </div>
                    <div className="flex-grow overflow-auto h-0">
                        <div className="p-4 h-full w-full">{createContent()}</div>
                    </div>
                </div>
            </div>
        </>
    );
};
