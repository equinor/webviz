import React from "react";

import { ModuleRegistry } from "@framework/ModuleRegistry";
import { useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import {
    MANHATTAN_LENGTH,
    Point,
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
};

const ModulesListItem: React.FC<ModulesListItemProps> = (props) => {
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        let pointerDownPoint: Point | null = null;
        let dragging = false;

        const handlePointerDown = (e: PointerEvent) => {
            if (ref.current) {
                const point = pointerEventToPoint(e);
                const rect = ref.current.getBoundingClientRect();
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
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!pointerDownPoint) {
                return;
            }

            if (!dragging && pointDistance(pointerEventToPoint(e), pointerDownPoint) > MANHATTAN_LENGTH) {
                dragging = true;
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
    }, []);

    return (
        <div className="m-1 border border-slate-600 border-solid text-sm text-gray-700 w-full h-40">
            <div ref={ref} className="bg-slate-100 p-4 cursor-move">
                {props.moduleName}
            </div>
            <div className="p-4">Preview</div>
        </div>
    );
};

type ModulesListProps = {
    workbench: Workbench;
};

export const ModulesList: React.FC<ModulesListProps> = (props) => {
    const visible = useStoreValue(props.workbench.getStateStore(), "modulesListOpen");
    const [searchQuery, setSearchQuery] = React.useState("");

    const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    return (
        <div className={`bg-white p-4 w-96 h-full${visible ? "" : " hidden"}`}>
            <Input
                placeholder="Module name..."
                startAdornment={<MagnifyingGlassIcon className="w-4 h-4" />}
                onChange={handleSearchQueryChange}
            />
            <div className="mt-4">
                {Object.keys(ModuleRegistry.getRegisteredModules())
                    .filter((module) => module.includes(searchQuery))
                    .map((moduleName) => (
                        <ModulesListItem key={moduleName} moduleName={moduleName} />
                    ))}
            </div>
        </div>
    );
};
