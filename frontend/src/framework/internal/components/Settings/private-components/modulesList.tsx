import React from "react";

import { DrawerContent, GuiEvent, GuiMessageBroker, GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { DrawPreviewFunc } from "@framework/Preview";
import { Workbench } from "@framework/Workbench";
import { Drawer } from "@framework/internal/components/Drawer";
import { useElementSize } from "@lib/hooks/useElementSize";
import {
    MANHATTAN_LENGTH,
    Point2D,
    Size2D,
    pointDistance,
    pointRelativeToDomRect,
    pointerEventToPoint,
    vectorDifference,
} from "@lib/utils/geometry";
import { Help, WebAsset } from "@mui/icons-material";

type ModulesListItemProps = {
    name: string;
    displayName: string;
    description: string | null;
    drawPreviewFunc: DrawPreviewFunc | null;
    relContainer: HTMLDivElement | null;
    guiMessageBroker: GuiMessageBroker;
};

const makeStyle = (isDragged: boolean, dragSize: Size2D, dragPosition: Point2D): React.CSSProperties => {
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
    const [isDragged, setIsDragged] = React.useState<boolean>(false);
    const [dragPosition, setDragPosition] = React.useState<Point2D>({ x: 0, y: 0 });
    const [dragSize, setDragSize] = React.useState<Size2D>({ width: 0, height: 0 });

    const itemSize = useElementSize(ref);

    React.useEffect(() => {
        const refCurrent = ref.current;
        let pointerDownPoint: Point2D | null = null;
        let dragging = false;
        let pointerDownElementPosition: Point2D | null = null;
        let pointerToElementDiff: Point2D = { x: 0, y: 0 };

        const handlePointerDown = (e: PointerEvent) => {
            if (ref.current) {
                document.body.classList.add("touch-none");
                const point = pointerEventToPoint(e);
                const rect = ref.current.getBoundingClientRect();
                pointerDownElementPosition = vectorDifference(point, pointRelativeToDomRect(point, rect));
                props.guiMessageBroker.publishEvent(GuiEvent.NewModulePointerDown, {
                    moduleName: props.name,
                    elementPosition: vectorDifference(point, pointRelativeToDomRect(point, rect)),
                    elementSize: { width: rect.width, height: rect.height },
                    pointerPosition: point,
                });
                pointerDownPoint = point;
                addDraggingEventListeners();
            }
        };

        const handlePointerUp = () => {
            if (!pointerDownPoint) {
                return;
            }
            pointerDownPoint = null;
            dragging = false;
            setIsDragged(false);
            document.body.classList.remove("touch-none");
            pointerDownElementPosition = null;

            removeDraggingEventListeners();
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
                if (ref.current) {
                    const rect = ref.current.getBoundingClientRect();
                    setDragSize({ width: rect.width, height: rect.height });
                }
                pointerToElementDiff = vectorDifference(pointerDownPoint, pointerDownElementPosition);
                return;
            }

            if (dragging) {
                const rect = props.relContainer?.getBoundingClientRect();
                if (rect) {
                    setDragPosition(
                        vectorDifference(vectorDifference(pointerEventToPoint(e), rect), pointerToElementDiff)
                    );
                }
            }
        };

        function addDraggingEventListeners() {
            document.addEventListener("pointerup", handlePointerUp);
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointercancel", handlePointerUp);
            document.addEventListener("blur", handlePointerUp);
        }

        function removeDraggingEventListeners() {
            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointercancel", handlePointerUp);
            document.removeEventListener("blur", handlePointerUp);
        }

        if (ref.current) {
            ref.current.addEventListener("pointerdown", handlePointerDown);
        }

        return () => {
            if (refCurrent) {
                refCurrent.removeEventListener("pointerdown", handlePointerDown);
            }
            removeDraggingEventListeners();
        };
    }, [props.relContainer, props.guiMessageBroker, props.name]);

    return (
        <>
            {isDragged && <div ref={ref} className="bg-red-300 w-full h-40 mb-4" />}
            <div
                ref={isDragged ? undefined : ref}
                className="touch-none mb-4 cursor-move flex flex-col border box-border border-slate-300 border-solid text-sm text-gray-700 w-full h-40 select-none hover:shadow-md"
                style={makeStyle(isDragged, dragSize, dragPosition)}
            >
                <div ref={ref} className="bg-slate-100 p-2 flex items-center text-xs font-bold shadow">
                    <span className="flex-grow">{props.displayName}</span>
                    {props.description && (
                        <span
                            title={props.description ?? ""}
                            className="cursor-help text-slate-500 hover:text-slate-900"
                        >
                            <Help fontSize="small" />
                        </span>
                    )}
                </div>
                <div className="p-4 flex flex-grow items-center justify-center relative">
                    <div className="absolute w-full h-full z-10 select-none bg-transparent" />
                    {props.drawPreviewFunc
                        ? props.drawPreviewFunc(Math.max(0, itemSize.width - 40), Math.max(0, itemSize.height - 60))
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
    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.DrawerContent);
    const [searchQuery, setSearchQuery] = React.useState("");

    const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    return (
        <>
            <Drawer
                visible={drawerContent === DrawerContent.ModulesList}
                title="Add modules"
                icon={<WebAsset />}
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
                            name={mod.getName()}
                            displayName={mod.getDefaultTitle()}
                            description={mod.getDescription()}
                            drawPreviewFunc={mod.getDrawPreviewFunc()}
                            guiMessageBroker={props.workbench.getGuiMessageBroker()}
                        />
                    ))}
            </Drawer>
        </>
    );
};
