import React from "react";

import { ModuleRegistry } from "@framework/ModuleRegistry";
import { DrawPreviewFunc } from "@framework/Preview";
import { useStoreValue } from "@framework/StateStore";
import { DrawerContent, Workbench } from "@framework/Workbench";
import { LayoutEventTypes } from "@framework/internal/components/Content/private-components/layout";
import { Drawer } from "@framework/internal/components/Drawer";
import { WindowIcon } from "@heroicons/react/20/solid";
import { useElementSize } from "@lib/hooks/useElementSize";
import {
    MANHATTAN_LENGTH,
    Point,
    Size,
    pointDifference,
    pointDistance,
    pointRelativeToDomRect,
    pointerEventToPoint,
} from "@lib/utils/geometry";

type ModulesListItemProps = {
    moduleName: string;
    moduleDisplayName: string;
    moduleDrawPreviewFunc: DrawPreviewFunc | null;
    relContainer: HTMLDivElement | null;
};

const makeStyle = (isDragged: boolean, dragSize: Size, dragPosition: Point): React.CSSProperties => {
    if (isDragged) {
        return {
            width: dragSize.width,
            height: dragSize.height,
            left: dragPosition.x,
            top: dragPosition.y,
            zIndex: 1,
            opacity: 0.5,
            position: "absolute",
        };
    }
    return {
        zIndex: 0,
        opacity: 1,
    };
};

const ModulesListItem: React.FC<ModulesListItemProps> = (props) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const mainRef = React.useRef<HTMLDivElement>(null);
    const [isDragged, setIsDragged] = React.useState<boolean>(false);
    const [dragPosition, setDragPosition] = React.useState<Point>({ x: 0, y: 0 });
    const [dragSize, setDragSize] = React.useState<Size>({ width: 0, height: 0 });

    const itemSize = useElementSize(mainRef);

    React.useEffect(() => {
        let pointerDownPoint: Point | null = null;
        let dragging = false;
        let pointerDownElementPosition: Point | null = null;
        let pointerToElementDiff: Point = { x: 0, y: 0 };

        const handlePointerDown = (e: PointerEvent) => {
            if (ref.current) {
                const point = pointerEventToPoint(e);
                const rect = ref.current.getBoundingClientRect();
                pointerDownElementPosition = pointDifference(point, pointRelativeToDomRect(point, rect));
                document.dispatchEvent(
                    new CustomEvent(LayoutEventTypes.NEW_MODULE_POINTER_DOWN, {
                        detail: {
                            name: props.moduleName,
                            elementPosition: pointDifference(point, pointRelativeToDomRect(point, rect)),
                            pointerPoint: point,
                        },
                    })
                );
                pointerDownPoint = point;
            }
        };

        const handlePointerUp = () => {
            pointerDownPoint = null;
            dragging = false;
            setIsDragged(false);
            pointerDownElementPosition = null;
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!pointerDownPoint) {
                return;
            }

            if (
                !dragging &&
                pointDistance(pointerEventToPoint(e), pointerDownPoint) > MANHATTAN_LENGTH &&
                pointerDownElementPosition
            ) {
                dragging = true;
                setIsDragged(true);
                if (mainRef.current) {
                    const rect = mainRef.current.getBoundingClientRect();
                    setDragSize({ width: rect.width, height: rect.height });
                }
                pointerToElementDiff = pointDifference(pointerDownPoint, pointerDownElementPosition);
                return;
            }

            if (dragging) {
                const rect = props.relContainer?.getBoundingClientRect();
                if (rect) {
                    setDragPosition(
                        pointDifference(pointDifference(pointerEventToPoint(e), rect), pointerToElementDiff)
                    );
                }
            }
        };

        if (ref.current) {
            ref.current.addEventListener("pointerdown", handlePointerDown);
            document.addEventListener("pointerup", handlePointerUp);
            document.addEventListener("pointermove", handlePointerMove);
        }

        return () => {
            if (ref.current) {
                ref.current.removeEventListener("pointerdown", handlePointerDown);
            }
            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("pointermove", handlePointerMove);
        };
    }, [props.relContainer]);

    return (
        <>
            {isDragged && <div ref={mainRef} className="bg-red-300 w-full h-40 mb-4" />}
            <div
                ref={isDragged ? undefined : mainRef}
                className="mb-4 flex flex-col border box-border border-slate-300 border-solid text-sm text-gray-700 w-full h-40 select-none hover:shadow-md"
                style={makeStyle(isDragged, dragSize, dragPosition)}
            >
                <div ref={ref} className="bg-slate-100 p-2 cursor-move flex items-center text-xs font-bold shadow">
                    {props.moduleDisplayName}
                </div>
                <div className="p-4 flex flex-grow items-center justify-center ">
                    {props.moduleDrawPreviewFunc
                        ? props.moduleDrawPreviewFunc(
                              Math.max(0, itemSize.width - 40),
                              Math.max(0, itemSize.height - 60)
                          )
                        : "No preview available"}
                </div>
            </div>
        </>
    );
};

type ModulesListProps = {
    workbench: Workbench;
    relContainer: HTMLDivElement | null;
};

/*
    @rmt: This component does probably need virtualization and therefore refactoring. 
    As this includes a lot more implementation, 
    I will skip it for now and come back to it when it becomes a problem.
*/
export const ModulesList: React.FC<ModulesListProps> = (props) => {
    const drawerContent = useStoreValue(props.workbench.getGuiStateStore(), "drawerContent");
    const [searchQuery, setSearchQuery] = React.useState("");

    const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    return (
        <Drawer
            visible={drawerContent === DrawerContent.ModulesList}
            title="Add modules"
            icon={<WindowIcon />}
            showFilter
            filterPlaceholder="Filter modules..."
            onFilterChange={handleSearchQueryChange}
        >
            {Object.values(ModuleRegistry.getRegisteredModules())
                .filter((mod) => mod.getDefaultTitle().toLowerCase().includes(searchQuery.toLowerCase()))
                .map((mod) => (
                    <ModulesListItem
                        relContainer={props.relContainer}
                        key={mod.getName()}
                        moduleName={mod.getName()}
                        moduleDisplayName={mod.getDefaultTitle()}
                        moduleDrawPreviewFunc={mod.getDrawPreviewFunc()}
                    />
                ))}
        </Drawer>
    );
};
