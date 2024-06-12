import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH, Point2D, pointDistance, rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import {
    LAYER_TYPE_TO_STRING_MAPPING,
    LayerActionType,
    LayerActions,
    LayerType,
} from "@modules/Intersection/typesAndEnums";
import {
    BaseLayer,
    LayerStatus,
    useIsLayerVisible,
    useLayerName,
    useLayerStatus,
} from "@modules/Intersection/utils/layers/BaseLayer";
import { isGridLayer } from "@modules/Intersection/utils/layers/GridLayer";
import { isSeismicLayer } from "@modules/Intersection/utils/layers/SeismicLayer";
import { isSurfaceLayer } from "@modules/Intersection/utils/layers/SurfaceLayer";
import { isWellpicksLayer } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { Dropdown, MenuButton } from "@mui/base";
import {
    Add,
    ArrowDropDown,
    Check,
    Delete,
    DragIndicator,
    Error,
    ExpandLess,
    ExpandMore,
    Settings,
    Visibility,
    VisibilityOff,
} from "@mui/icons-material";

import { useAtom } from "jotai";
import { isEqual } from "lodash";

import { GridLayerSettingsComponent } from "./layerSettings/gridLayer";
import { SeismicLayerSettingsComponent } from "./layerSettings/seismicLayer";
import { SurfaceLayerSettingsComponent } from "./layerSettings/surfaceLayer";
import { WellpicksLayerSettingsComponent } from "./layerSettings/wellpicksLayer";

import { layersAtom } from "../atoms/layersAtoms";

export type LayersProps = {
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function Layers(props: LayersProps): React.ReactNode {
    const [layers, dispatch] = useAtom(layersAtom);

    const [draggingLayerId, setDraggingLayerId] = React.useState<string | null>(null);
    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [dragPosition, setDragPosition] = React.useState<Point2D>({ x: 0, y: 0 });
    const [prevLayers, setPrevLayers] = React.useState<BaseLayer<any, any>[]>(layers);
    const [currentScrollPosition, setCurrentScrollPosition] = React.useState<number>(0);
    const [layerOrder, setLayerOrder] = React.useState<string[]>(layers.map((layer) => layer.getId()));

    const parentDivRef = React.useRef<HTMLDivElement>(null);
    const scrollDivRef = React.useRef<HTMLDivElement>(null);
    const upperScrollDivRef = React.useRef<HTMLDivElement>(null);
    const lowerScrollDivRef = React.useRef<HTMLDivElement>(null);

    if (!isEqual(prevLayers, layers)) {
        setPrevLayers(layers);
        setLayerOrder(layers.map((layer) => layer.getId()));
        if (scrollDivRef.current) {
            scrollDivRef.current.scrollTop = currentScrollPosition;
        }
    }

    function handleAddLayer(type: LayerType) {
        dispatch({ type: LayerActionType.ADD_LAYER, payload: { type } });
    }

    function handleRemoveLayer(id: string) {
        dispatch({ type: LayerActionType.REMOVE_LAYER, payload: { id } });
    }

    React.useEffect(
        function handleMount() {
            if (parentDivRef.current === null) {
                return;
            }

            const currentParentDivRef = parentDivRef.current;

            let pointerDownPosition: Point2D | null = null;
            let pointerDownPositionRelativeToElement: Point2D = { x: 0, y: 0 };
            let draggingActive: boolean = false;
            let layerId: string | null = null;
            let newLayerOrder: string[] = layers.map((layer) => layer.getId());

            let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
            let doScroll: boolean = false;
            let currentScrollTime = 100;

            function findLayerElement(element: HTMLElement): [HTMLElement | null, string | null] {
                if (element?.parentElement && element.dataset.layerId) {
                    return [element.parentElement, element.dataset.layerId];
                }
                return [null, null];
            }

            function handlePointerDown(e: PointerEvent) {
                const [element, id] = findLayerElement(e.target as HTMLElement);

                if (!element || !id) {
                    return;
                }

                draggingActive = false;
                setIsDragging(true);
                layerId = id;
                pointerDownPosition = { x: e.clientX, y: e.clientY };
                pointerDownPositionRelativeToElement = {
                    x: e.clientX - element.getBoundingClientRect().left,
                    y: e.clientY - element.getBoundingClientRect().top,
                };
                document.addEventListener("pointermove", handlePointerMove);
                document.addEventListener("pointerup", handlePointerUp);
            }

            function moveLayerToIndex(id: string, moveToIndex: number) {
                const layer = layers.find((layer) => layer.getId() === id);
                if (!layer) {
                    return;
                }

                const index = newLayerOrder.indexOf(layer.getId());
                if (index === moveToIndex) {
                    return;
                }

                if (moveToIndex <= 0) {
                    newLayerOrder = [id, ...newLayerOrder.filter((el) => el !== id)];
                } else if (moveToIndex >= layers.length - 1) {
                    newLayerOrder = [...newLayerOrder.filter((el) => el !== id), id];
                } else {
                    newLayerOrder = [...newLayerOrder];
                    newLayerOrder.splice(index, 1);
                    newLayerOrder.splice(moveToIndex, 0, id);
                }

                setLayerOrder(newLayerOrder);
            }

            function handleElementDrag(id: string, position: Point2D) {
                if (parentDivRef.current === null) {
                    return;
                }

                let index = 0;
                for (const child of parentDivRef.current.childNodes) {
                    if (child instanceof HTMLElement) {
                        const childBoundingRect = child.getBoundingClientRect();

                        if (!child.dataset.layerId) {
                            continue;
                        }

                        if (child.dataset.layerId === id) {
                            continue;
                        }

                        if (!rectContainsPoint(childBoundingRect, position)) {
                            index++;
                            continue;
                        }

                        if (position.y <= childBoundingRect.y + childBoundingRect.height / 2) {
                            moveLayerToIndex(id, index);
                        } else {
                            moveLayerToIndex(id, index + 1);
                        }
                        index++;
                    }
                }
            }

            function maybeScroll(position: Point2D) {
                if (
                    upperScrollDivRef.current === null ||
                    lowerScrollDivRef.current === null ||
                    scrollDivRef.current === null
                ) {
                    return;
                }

                if (scrollTimeout) {
                    clearTimeout(scrollTimeout);
                    currentScrollTime = 100;
                }

                if (rectContainsPoint(upperScrollDivRef.current.getBoundingClientRect(), position)) {
                    doScroll = true;
                    scrollTimeout = setTimeout(scrollUpRepeatedly, currentScrollTime);
                } else if (rectContainsPoint(lowerScrollDivRef.current.getBoundingClientRect(), position)) {
                    doScroll = true;
                    scrollTimeout = setTimeout(scrollDownRepeatedly, currentScrollTime);
                } else {
                    doScroll = false;
                }
            }

            function scrollUpRepeatedly() {
                currentScrollTime = Math.max(10, currentScrollTime - 5);
                if (scrollDivRef.current) {
                    scrollDivRef.current.scrollTop = Math.max(0, scrollDivRef.current.scrollTop - 10);
                }
                if (doScroll) {
                    scrollTimeout = setTimeout(scrollUpRepeatedly, currentScrollTime);
                }
            }

            function scrollDownRepeatedly() {
                currentScrollTime = Math.max(10, currentScrollTime - 5);
                if (scrollDivRef.current) {
                    scrollDivRef.current.scrollTop = Math.min(
                        scrollDivRef.current.scrollHeight,
                        scrollDivRef.current.scrollTop + 10
                    );
                }
                if (doScroll) {
                    scrollTimeout = setTimeout(scrollDownRepeatedly, currentScrollTime);
                }
            }

            function handlePointerMove(e: PointerEvent) {
                if (!pointerDownPosition || !layerId) {
                    return;
                }

                if (
                    !draggingActive &&
                    pointDistance(pointerDownPosition, { x: e.clientX, y: e.clientY }) > MANHATTAN_LENGTH
                ) {
                    draggingActive = true;
                    setDraggingLayerId(layerId);
                }

                if (!draggingActive) {
                    return;
                }

                const dx = e.clientX - pointerDownPositionRelativeToElement.x;
                const dy = e.clientY - pointerDownPositionRelativeToElement.y;
                setDragPosition({ x: dx, y: dy });

                const point: Point2D = { x: e.clientX, y: e.clientY };

                handleElementDrag(layerId, point);

                maybeScroll(point);
            }

            function handlePointerUp() {
                draggingActive = false;
                pointerDownPosition = null;
                layerId = null;
                setIsDragging(false);
                setDraggingLayerId(null);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
                dispatch({ type: LayerActionType.CHANGE_ORDER, payload: { orderedIds: newLayerOrder } });
            }

            currentParentDivRef.addEventListener("pointerdown", handlePointerDown);

            return function handleUnmount() {
                currentParentDivRef.removeEventListener("pointerdown", handlePointerDown);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
                setIsDragging(false);
                setDraggingLayerId(null);
            };
        },
        [dispatch, layers]
    );

    function handleScroll(e: React.UIEvent<HTMLDivElement>) {
        setCurrentScrollPosition(e.currentTarget.scrollTop);
    }

    return (
        <div className="w-full flex-grow flex flex-col min-h-0">
            <div className="flex bg-slate-100 p-2 items-center border-b border-gray-300">
                <div className="flex-grow font-bold text-sm">Layers</div>
                <Dropdown>
                    <MenuButton>
                        <div className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-sm flex items-center gap-2">
                            <Add fontSize="inherit" />
                            <span>Add layer</span>
                            <ArrowDropDown fontSize="inherit" />
                        </div>
                    </MenuButton>
                    <Menu anchorOrigin="bottom-end" className="text-sm p-1">
                        {Object.keys(LAYER_TYPE_TO_STRING_MAPPING).map((layerType, index) => {
                            return (
                                <MenuItem
                                    key={index}
                                    className="text-sm p-0.5"
                                    onClick={() => handleAddLayer(layerType as LayerType)}
                                >
                                    {LAYER_TYPE_TO_STRING_MAPPING[layerType as LayerType]}
                                </MenuItem>
                            );
                        })}
                    </Menu>
                </Dropdown>
            </div>
            {isDragging &&
                createPortal(
                    <div className="absolute z-40 transparent w-screen h-screen inset-0 cursor-grabbing select-none"></div>
                )}
            <div className="w-full flex-grow flex flex-col relative">
                <div
                    className="absolute top-0 left-0 w-full h-5 z-50 pointer-events-none"
                    ref={upperScrollDivRef}
                ></div>
                <div
                    className="absolute left-0 bottom-0 w-full h-5 z-50 pointer-events-none"
                    ref={lowerScrollDivRef}
                ></div>
                <div
                    className="flex-grow overflow-auto min-h-0 bg-slate-200 relative"
                    ref={scrollDivRef}
                    onScroll={handleScroll}
                >
                    <div className="flex flex-col border border-slate-100 relative max-h-0" ref={parentDivRef}>
                        {layerOrder
                            .map((id) => layers.find((el) => el.getId() === id))
                            .map((layer) => {
                                if (!layer) {
                                    return null;
                                }
                                return (
                                    <LayerItem
                                        key={layer.getId()}
                                        layer={layer}
                                        ensembleSet={props.ensembleSet}
                                        workbenchSession={props.workbenchSession}
                                        workbenchSettings={props.workbenchSettings}
                                        onRemoveLayer={handleRemoveLayer}
                                        dispatch={dispatch}
                                        isDragging={draggingLayerId === layer.getId()}
                                        dragPosition={dragPosition}
                                    />
                                );
                            })}
                    </div>
                    {layers.length === 0 && (
                        <div className="flex h-full -mt-1 justify-center text-sm items-center gap-1">
                            Click on <Add fontSize="inherit" /> to add a layer.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

type LayerItemProps = {
    layer: BaseLayer<any, any>;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    isDragging: boolean;
    dragPosition: Point2D;
    onRemoveLayer: (id: string) => void;
    dispatch: (action: LayerActions) => void;
};

function LayerItem(props: LayerItemProps): React.ReactNode {
    const [showSettings, setShowSettings] = React.useState<boolean>(true);

    const dragIndicatorRef = React.useRef<HTMLDivElement>(null);
    const divRef = React.useRef<HTMLDivElement>(null);

    const boundingClientRect = useElementBoundingRect(divRef);

    const isVisible = useIsLayerVisible(props.layer);
    const status = useLayerStatus(props.layer);

    function handleRemoveLayer() {
        props.onRemoveLayer(props.layer.getId());
    }

    function handleToggleLayerVisibility() {
        props.layer.setIsVisible(!isVisible);
    }

    function handleToggleSettingsVisibility() {
        setShowSettings(!showSettings);
    }

    function makeSettingsContainer(layer: BaseLayer<any, any>): React.ReactNode {
        if (isGridLayer(layer)) {
            return (
                <GridLayerSettingsComponent
                    ensembleSet={props.ensembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                    layer={layer}
                />
            );
        }
        if (isSeismicLayer(layer)) {
            return (
                <SeismicLayerSettingsComponent
                    ensembleSet={props.ensembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                    layer={layer}
                />
            );
        }
        if (isSurfaceLayer(layer)) {
            return (
                <SurfaceLayerSettingsComponent
                    ensembleSet={props.ensembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                    layer={layer}
                />
            );
        }
        if (isWellpicksLayer(layer)) {
            return (
                <WellpicksLayerSettingsComponent
                    ensembleSet={props.ensembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                    layer={layer}
                />
            );
        }
        return null;
    }

    function makeStatus(): React.ReactNode {
        if (status === LayerStatus.LOADING) {
            return (
                <div title="Loading">
                    <CircularProgress size="extra-small" />
                </div>
            );
        }
        if (status === LayerStatus.ERROR) {
            return (
                <div title="Error while loading">
                    <Error fontSize="inherit" className="text-red-700" />
                </div>
            );
        }
        if (status === LayerStatus.SUCCESS) {
            return (
                <div title="Successfully loaded">
                    <Check fontSize="inherit" className="text-green-700" />
                </div>
            );
        }
        return null;
    }

    function makeLayerElement(indicatorRef?: React.LegacyRef<HTMLDivElement>): React.ReactNode {
        return (
            <>
                <div
                    className={resolveClassNames("px-0.5", {
                        "hover:cursor-grab": !props.isDragging,
                        "hover:cursor-grabbing": props.isDragging,
                    })}
                    data-layer-id={props.layer.getId()}
                    ref={indicatorRef}
                >
                    <DragIndicator fontSize="inherit" className="pointer-events-none" />
                </div>
                <div
                    className={resolveClassNames("px-0.5 hover:cursor-pointer rounded", {
                        "hover:text-blue-800": !props.isDragging,
                    })}
                    onClick={handleToggleLayerVisibility}
                    title="Toggle visibility"
                >
                    {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
                </div>
                <LayerName layer={props.layer} />
                {makeStatus()}
                <div
                    className="hover:cursor-pointer hover:text-blue-800 p-0.5 rounded"
                    onClick={handleToggleSettingsVisibility}
                    title={showSettings ? "Hide settings" : "Show settings"}
                >
                    <Settings fontSize="inherit" />
                    {showSettings ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                </div>
                <div
                    className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded"
                    onClick={handleRemoveLayer}
                    title="Remove layer"
                >
                    <Delete fontSize="inherit" />
                </div>
            </>
        );
    }

    return (
        <div ref={divRef} className={resolveClassNames("relative")} data-layer-id={props.layer.getId()}>
            <div
                className={resolveClassNames("bg-blue-300 z-30 w-full h-full absolute left-0 top-0", {
                    hidden: !props.isDragging,
                })}
            ></div>
            <div
                className={resolveClassNames(
                    "flex h-10 py-2 px-1 hover:bg-blue-100 text-sm items-center gap-1 border-b border-b-gray-300 relative",
                    {
                        "bg-red-100": props.layer.getStatus() === LayerStatus.ERROR,
                        "bg-white": props.layer.getStatus() !== LayerStatus.ERROR,
                    }
                )}
            >
                {makeLayerElement(dragIndicatorRef)}
            </div>
            {props.isDragging &&
                createPortal(
                    <div
                        className={resolveClassNames(
                            "flex h-10 px-1 hover:bg-blue-50 text-sm items-center gap-1 border-b border-b-gray-300 absolute z-50"
                        )}
                        style={{
                            left: props.dragPosition.x,
                            top: props.dragPosition.y,
                            width: props.isDragging ? boundingClientRect.width : undefined,
                        }}
                    >
                        {makeLayerElement()}
                    </div>
                )}
            <div
                className={resolveClassNames("border-b border-b-gray-300 bg-gray-50 shadow-inner", {
                    "overflow-hidden h-[1px]": !showSettings,
                })}
            >
                {makeSettingsContainer(props.layer)}
            </div>
        </div>
    );
}

type LayerNameProps = {
    layer: BaseLayer<any, any>;
};

function LayerName(props: LayerNameProps): React.ReactNode {
    const layerName = useLayerName(props.layer);
    const [editingName, setEditingName] = React.useState<boolean>(false);

    function handleNameDoubleClick() {
        setEditingName(true);
    }

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        props.layer.setName(e.target.value);
    }

    function handleBlur() {
        setEditingName(false);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            setEditingName(false);
        }
    }

    return (
        <div
            className="flex-grow font-bold flex items-center pt-1"
            onDoubleClick={handleNameDoubleClick}
            title="Double-click to edit name"
        >
            {editingName ? (
                <input
                    type="text"
                    className="p-0.5 w-full"
                    value={layerName}
                    onChange={handleNameChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            ) : (
                layerName
            )}
        </div>
    );
}
