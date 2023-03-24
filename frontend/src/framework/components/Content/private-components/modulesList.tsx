import React from "react";

import { ModuleRegistry } from "@framework/ModuleRegistry";
import { useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import {
    MANHATTAN_LENGTH,
    Point,
    Size,
    pointDifference,
    pointDistance,
    pointRelativeToDomRect,
    pointerEventToPoint,
} from "@framework/utils/geometry";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { Input } from "@lib/components/Input";

import { LayoutEventTypes } from "./layout";

type ModulesListItemProps = {
    moduleName: string;
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
            {isDragged && <div ref={mainRef} className="bg-red-500 w-full h-40 mb-4" />}
            <div
                ref={isDragged ? undefined : mainRef}
                className="mb-4 border box-border border-slate-600 border-solid text-sm text-gray-700 w-full h-40 select-none"
                style={makeStyle(isDragged, dragSize, dragPosition)}
            >
                <div ref={ref} className="bg-slate-100 p-4 cursor-move">
                    {props.moduleName}
                </div>
                <div className="p-4">Preview</div>
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
    const visible = useStoreValue(props.workbench.getStateStore(), "modulesListOpen");
    const [searchQuery, setSearchQuery] = React.useState("");

    const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    return (
        <div className={`flex flex-col bg-white p-4 w-96 min-h-0 h-full${visible ? "" : " hidden"}`}>
            <Input
                placeholder="Filter modules..."
                startAdornment={<MagnifyingGlassIcon className="w-4 h-4" />}
                onChange={handleSearchQueryChange}
            />
            <div className="mt-4 flex-grow min-h-0 overflow-y-auto max-h-full h-0">
                {Object.keys(ModuleRegistry.getRegisteredModules())
                    .filter((module) => module.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((moduleName) => (
                        <ModulesListItem relContainer={props.relContainer} key={moduleName} moduleName={moduleName} />
                    ))}
            </div>
        </div>
    );
};
