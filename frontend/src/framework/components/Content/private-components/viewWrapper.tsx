import React from "react";

import { ImportState } from "@framework/Module";
import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { Point, pointRelativeToDomRect, pointerEventToPoint } from "@framework/utils/geometry";

import { LayoutEventTypes } from "./layout";

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

            if (importState === ImportState.Importing) {
                return <div>Loading...</div>;
            }

            if (importState === ImportState.Failed) {
                return <div>Failed</div>;
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

    return (
        <>
            {props.isDragged && (
                <div
                    className="absolute box-border p-2"
                    style={{
                        width: props.width,
                        height: props.height,
                        left: props.x,
                        top: props.y,
                    }}
                >
                    <div className="bg-red-300 h-full w-full" />
                </div>
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
                }}
            >
                <div
                    className={`bg-white h-full w-full ${
                        props.isActive ? "border-red-600" : ""
                    } border-solid border box-border shadow ${
                        props.isDragged ? "cursor-grabbing select-none" : "cursor-grab"
                    }}`}
                    onClick={() => props.workbench.setActiveModuleId(props.moduleInstance.getId())}
                >
                    <div
                        className={`bg-slate-100 p-4 select-none ${
                            props.isDragged ? "cursor-grabbing" : "cursor-move"
                        }`}
                        onPointerDown={handlePointerDown}
                    >
                        {props.moduleInstance.getName()}
                    </div>
                    <div className="p-4">{createContent()}</div>
                </div>
            </div>
        </>
    );
};
