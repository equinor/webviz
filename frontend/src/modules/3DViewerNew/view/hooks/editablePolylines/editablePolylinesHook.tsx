import React from "react";

import addPathIcon from "@assets/add_path.svg";
import continuePathIcon from "@assets/continue_path.svg";
import removePathIcon from "@assets/remove_path.svg";
import setPathPointIcon from "@assets/set_path_point.svg";
import { Layer, PickingInfo } from "@deck.gl/core";
import { DeckGLProps, DeckGLRef } from "@deck.gl/react";
import { Edit, Remove } from "@mui/icons-material";
import { MapMouseEvent } from "@webviz/subsurface-viewer";

import { isEqual } from "lodash";
import { v4 } from "uuid";

import { EditablePolylineLayer, isEditablePolylineLayerPickingInfo } from "./deckGlLayers/EditablePolylineLayer";
import { PolylinesLayer, isPolylinesLayerPickingInfo } from "./deckGlLayers/PolylinesLayer";
import { ContextMenuItem, Polyline, PolylineEditingMode } from "./types";

export type UseEditablePolylinesProps = {
    deckGlRef: React.MutableRefObject<DeckGLRef | null>;
    editingMode: PolylineEditingMode;
    polylines: Polyline[];
    onEditingModeChange?: (mode: PolylineEditingMode) => void;
};

export type UseEditablePolylinesReturnType = {
    layers: Layer<any>[];
    onDrag: (info: PickingInfo) => boolean;
    onMouseEvent: (event: MapMouseEvent) => void;
    disableCameraInteraction: boolean;
    getCursor: DeckGLProps["getCursor"];
    cursorPosition: number[] | null;
    contextMenuItems: ContextMenuItem[];
    activePolylineId: string | null;
    polylines: Polyline[];
};

enum CursorIcon {
    NONE = "none",
    POINTER = "pointer",
    ADD_POINT = "add-point",
    REMOVE_POINT = "remove-point",
    CONTINUE_FROM_POINT = "continue-from-point",
}

enum PathAppendLocation {
    START = "start",
    END = "end",
}

export function useEditablePolylines(props: UseEditablePolylinesProps): UseEditablePolylinesReturnType {
    const { onEditingModeChange } = props;

    const [hoverPoint, setHoverPoint] = React.useState<number[] | null>(null);
    const [activePolylineId, setActivePolylineId] = React.useState<string | null>(null);
    const [polylines, setPolylines] = React.useState<Polyline[]>(props.polylines);
    const [prevPolylines, setPrevPolylines] = React.useState<Polyline[]>(props.polylines);
    const [cursorIcon, setCursorIcon] = React.useState<CursorIcon | null>(null);
    const [cursorPosition, setCursorPosition] = React.useState<number[] | null>(null);
    const [appendLocation, setAppendLocation] = React.useState<PathAppendLocation>(PathAppendLocation.END);
    const [draggedPointIndex, setDraggedPointIndex] = React.useState<number | null>(null);
    const [contextMenuItems, setContextMenuItems] = React.useState<ContextMenuItem[]>([]);
    const [selectedPolylineId, setSelectedPolylineId] = React.useState<string | null>(null);
    const [referencePathPointIndex, setReferencePathPointIndex] = React.useState<number | undefined>(undefined);
    const [prevEditingMode, setPrevEditingMode] = React.useState<PolylineEditingMode>(PolylineEditingMode.NONE);

    let changedPolylines = polylines;

    if (!isEqual(props.polylines, prevPolylines)) {
        setPolylines(props.polylines);
        setPrevPolylines(props.polylines);
        changedPolylines = props.polylines;
    }

    if (props.editingMode !== prevEditingMode) {
        if (props.editingMode === PolylineEditingMode.NONE) {
            setActivePolylineId(null);
            setReferencePathPointIndex(undefined);
        }
        if (props.editingMode === PolylineEditingMode.IDLE) {
            setReferencePathPointIndex(undefined);
        }
        setPrevEditingMode(props.editingMode);
    }

    React.useEffect(
        function onMount() {
            function onKeyUp(event: KeyboardEvent) {
                if (event.key === "Escape") {
                    setReferencePathPointIndex(undefined);
                    onEditingModeChange?.(PolylineEditingMode.IDLE);
                }
            }

            window.addEventListener("keyup", onKeyUp);

            return () => {
                window.removeEventListener("keyup", onKeyUp);
            };
        },
        [onEditingModeChange]
    );

    const onMouseEvent = React.useCallback(
        (event: MapMouseEvent) => {
            if (draggedPointIndex !== null) {
                return;
            }

            const activePolyline = polylines.find((polyline) => polyline.id === activePolylineId);

            if (event.type === "hover") {
                if (!event.x || !event.y) {
                    setHoverPoint(null);
                    setCursorIcon(CursorIcon.NONE);
                    return;
                }

                const firstLayerInfos = event.infos[0];

                if (!firstLayerInfos) {
                    setHoverPoint(null);
                    setCursorIcon(CursorIcon.NONE);
                    return;
                }

                const editablePolylineLayerPickingInfo = event.infos.find(isEditablePolylineLayerPickingInfo);

                if (
                    editablePolylineLayerPickingInfo &&
                    editablePolylineLayerPickingInfo.viewport &&
                    firstLayerInfos.coordinate
                ) {
                    if (
                        [PolylineEditingMode.DRAW, PolylineEditingMode.ADD_POINT].includes(props.editingMode) &&
                        editablePolylineLayerPickingInfo.editableEntity &&
                        editablePolylineLayerPickingInfo.editableEntity.type === "line"
                    ) {
                        setCursorIcon(CursorIcon.ADD_POINT);
                        return;
                    }
                    if (
                        [PolylineEditingMode.DRAW, PolylineEditingMode.REMOVE_POINT].includes(props.editingMode) &&
                        activePolyline &&
                        editablePolylineLayerPickingInfo.editableEntity &&
                        editablePolylineLayerPickingInfo.editableEntity.type === "point"
                    ) {
                        const index = editablePolylineLayerPickingInfo.editableEntity.index;
                        if (
                            (index === 0 || index === activePolyline.path.length - 1) &&
                            index !== referencePathPointIndex
                        ) {
                            setCursorIcon(CursorIcon.CONTINUE_FROM_POINT);
                            return;
                        }

                        setCursorIcon(CursorIcon.REMOVE_POINT);
                        return;
                    }
                }

                const polylinesLayerPickingInfo = event.infos.find(isPolylinesLayerPickingInfo);

                if (polylinesLayerPickingInfo && props.editingMode === PolylineEditingMode.IDLE) {
                    setCursorIcon(CursorIcon.POINTER);
                    return;
                }

                setCursorIcon(CursorIcon.NONE);

                if (firstLayerInfos && firstLayerInfos.coordinate) {
                    setHoverPoint([...firstLayerInfos.coordinate]);
                }
            }

            if (event.type === "click") {
                const firstLayerInfos = event.infos[0];
                if (!firstLayerInfos || !firstLayerInfos.coordinate) {
                    setContextMenuItems([]);
                    setSelectedPolylineId(null);
                    return;
                }

                if (props.editingMode === PolylineEditingMode.IDLE && !activePolylineId) {
                    const polylinesLayerPickingInfo = event.infos.find(isPolylinesLayerPickingInfo);
                    if (
                        !polylinesLayerPickingInfo ||
                        !polylinesLayerPickingInfo.viewport ||
                        !polylinesLayerPickingInfo.coordinate
                    ) {
                        setContextMenuItems([]);
                        setSelectedPolylineId(null);
                        return;
                    }

                    const position = polylinesLayerPickingInfo.viewport.project([
                        ...polylinesLayerPickingInfo.coordinate,
                    ]);
                    setCursorPosition(position);
                    setSelectedPolylineId(polylinesLayerPickingInfo.polylineId ?? null);

                    setContextMenuItems([
                        {
                            icon: <Edit />,
                            label: "Edit",
                            onClick: () => {
                                setActivePolylineId(polylinesLayerPickingInfo.polylineId ?? null);
                                setReferencePathPointIndex(undefined);
                                onEditingModeChange?.(PolylineEditingMode.DRAW);
                                setSelectedPolylineId(null);
                                setContextMenuItems([]);
                            },
                        },
                        {
                            icon: <Remove />,
                            label: "Delete",
                            onClick: () => {
                                setPolylines((prevPolylines) =>
                                    prevPolylines.filter(
                                        (polyline) => polyline.id !== polylinesLayerPickingInfo.polylineId
                                    )
                                );
                                setContextMenuItems([]);
                                setSelectedPolylineId(null);
                            },
                        },
                    ]);

                    return;
                }

                setContextMenuItems([]);

                const editablePolylineLayerPickingInfo = event.infos.find(isEditablePolylineLayerPickingInfo);
                if (
                    activePolyline &&
                    editablePolylineLayerPickingInfo &&
                    editablePolylineLayerPickingInfo.editableEntity
                ) {
                    // Remove point
                    if (
                        editablePolylineLayerPickingInfo.editableEntity.type === "point" &&
                        [PolylineEditingMode.DRAW, PolylineEditingMode.REMOVE_POINT].includes(props.editingMode)
                    ) {
                        const index = editablePolylineLayerPickingInfo.editableEntity.index;

                        if (
                            (index === 0 || index === activePolyline.path.length - 1) &&
                            index !== referencePathPointIndex
                        ) {
                            setReferencePathPointIndex(index);
                            if (index === 0) {
                                setAppendLocation(PathAppendLocation.START);
                            } else {
                                setAppendLocation(PathAppendLocation.END);
                            }
                            return;
                        }

                        let newReferencePathPointIndex: number | undefined = undefined;
                        if (referencePathPointIndex !== undefined) {
                            newReferencePathPointIndex = Math.max(0, referencePathPointIndex - 1);
                            if (editablePolylineLayerPickingInfo.editableEntity.index > referencePathPointIndex) {
                                newReferencePathPointIndex = referencePathPointIndex;
                            }
                            if (activePolyline.path.length - 1 < 1) {
                                newReferencePathPointIndex = undefined;
                            }
                        }
                        const newPolyline: Polyline = {
                            ...activePolyline,
                            path: activePolyline.path.filter(
                                (_, index) => index !== editablePolylineLayerPickingInfo.editableEntity?.index
                            ),
                        };

                        setReferencePathPointIndex(newReferencePathPointIndex);

                        setPolylines((prevPolylines) =>
                            prevPolylines.map((polyline) =>
                                polyline.id === activePolyline.id ? newPolyline : polyline
                            )
                        );
                        setCursorIcon(CursorIcon.NONE);

                        return;
                    }
                    if (
                        editablePolylineLayerPickingInfo.editableEntity.type === "line" &&
                        [PolylineEditingMode.DRAW, PolylineEditingMode.ADD_POINT].includes(props.editingMode)
                    ) {
                        const newPath = [...activePolyline.path];
                        newPath.splice(editablePolylineLayerPickingInfo.editableEntity.index + 1, 0, [
                            ...firstLayerInfos.coordinate,
                        ]);

                        let newReferencePathPointIndex: number | undefined = undefined;
                        if (referencePathPointIndex !== undefined) {
                            newReferencePathPointIndex = referencePathPointIndex + 1;
                            if (editablePolylineLayerPickingInfo.editableEntity.index > referencePathPointIndex) {
                                newReferencePathPointIndex = referencePathPointIndex;
                            }
                        }

                        const newPolyline: Polyline = {
                            ...activePolyline,
                            path: newPath,
                        };

                        setReferencePathPointIndex(newReferencePathPointIndex);

                        setPolylines((prevPolylines) =>
                            prevPolylines.map((polyline) =>
                                polyline.id === activePolyline.id ? newPolyline : polyline
                            )
                        );
                        setCursorIcon(CursorIcon.NONE);
                        return;
                    }
                }

                if (!activePolyline && props.editingMode === PolylineEditingMode.DRAW) {
                    const id = v4();
                    const newPolyline: Polyline = {
                        id,
                        name: "New polyline",
                        color: [230, 136, 21, 255],
                        path: [[...firstLayerInfos.coordinate]],
                    };
                    setPolylines([...polylines, newPolyline]);
                    setActivePolylineId(id);
                    setReferencePathPointIndex(0);
                } else if (activePolyline) {
                    if (referencePathPointIndex === undefined) {
                        setActivePolylineId(null);
                        onEditingModeChange?.(PolylineEditingMode.IDLE);
                        return;
                    }
                    if (props.editingMode === PolylineEditingMode.DRAW) {
                        const newPolyline: Polyline = {
                            ...activePolyline,
                            path: appendCoordinateToPath(
                                activePolyline.path,
                                firstLayerInfos.coordinate,
                                appendLocation
                            ),
                        };
                        setPolylines((prevPolylines) =>
                            prevPolylines.map((polyline) =>
                                polyline.id === activePolyline.id ? newPolyline : polyline
                            )
                        );

                        setReferencePathPointIndex(
                            appendLocation === PathAppendLocation.END ? activePolyline.path.length : 0
                        );
                    }
                }
            }
        },
        [
            props.editingMode,
            activePolylineId,
            appendLocation,
            polylines,
            referencePathPointIndex,
            draggedPointIndex,
            onEditingModeChange,
        ]
    );

    const disablePanning = React.useCallback(
        function disablePanning() {
            if (props.deckGlRef.current?.deck) {
                props.deckGlRef.current.deck.setProps({
                    controller: {
                        dragRotate: false,
                        dragPan: false,
                    },
                });
            }
        },
        [props.deckGlRef]
    );

    const enablePanning = React.useCallback(
        function enablePanning() {
            if (props.deckGlRef.current?.deck) {
                props.deckGlRef.current.deck.setProps({
                    controller: {
                        dragRotate: true,
                        dragPan: true,
                    },
                });
            }
        },
        [props.deckGlRef]
    );

    const onDragStart = React.useCallback(
        function onDragStart(info: PickingInfo) {
            if (!isEditablePolylineLayerPickingInfo(info)) {
                return false;
            }

            if (info.editableEntity?.type === "point") {
                setDraggedPointIndex(info.editableEntity.index);
                disablePanning();
                return true;
            }
        },
        [disablePanning]
    );

    const onDrag = React.useCallback(
        function onDrag(info: PickingInfo) {
            if (draggedPointIndex === null || !activePolylineId || !info.coordinate) {
                return false;
            }

            if (!info.viewport) {
                return false;
            }

            if (!props.deckGlRef.current) {
                return false;
            }

            const layers = props.deckGlRef.current.pickMultipleObjects({
                x: info.x,
                y: info.y,
                radius: 10,
                depth: 1,
                unproject3D: true,
            });

            if (!layers.length) {
                return false;
            }

            const firstLayerInfos = layers[0];

            if (!firstLayerInfos || !firstLayerInfos.coordinate) {
                return false;
            }

            setPolylines((prevPolylines) => {
                const activePolyline = prevPolylines.find((polyline) => polyline.id === activePolylineId);
                if (!activePolyline || !firstLayerInfos.coordinate) {
                    return prevPolylines;
                }

                const newPath = [...activePolyline.path];
                newPath[draggedPointIndex] = [...firstLayerInfos.coordinate];

                const newPolyline: Polyline = {
                    ...activePolyline,
                    path: newPath,
                };
                return prevPolylines.map((polyline) => (polyline.id === activePolyline.id ? newPolyline : polyline));
            });

            return false;
        },
        [draggedPointIndex, activePolylineId, props.deckGlRef]
    );

    const onDragEnd = React.useCallback(
        function onDragEnd() {
            setDraggedPointIndex(null);
            enablePanning();
        },
        [enablePanning]
    );

    const layers: Layer<any>[] = [
        new PolylinesLayer({
            id: "polylines-layer",
            polylines: polylines.filter((polyline) => polyline.id !== activePolylineId),
            selectedPolylineId:
                props.editingMode === PolylineEditingMode.NONE ? undefined : selectedPolylineId ?? undefined,
            hoverable: props.editingMode === PolylineEditingMode.IDLE,
        }),
    ];

    if (activePolylineId) {
        const activePolyline = polylines.find((polyline) => polyline.id === activePolylineId);
        layers.push(
            new EditablePolylineLayer({
                id: "editable-polylines-layer",
                polyline: activePolyline,
                mouseHoverPoint: hoverPoint ?? undefined,
                referencePathPointIndex:
                    props.editingMode === PolylineEditingMode.DRAW ? referencePathPointIndex : undefined,
                onDragStart,
                onDragEnd,
            })
        );
    }

    const getCursor = React.useCallback(
        function getCursor(cursorState: Parameters<Exclude<DeckGLProps["getCursor"], undefined>>[0]): string {
            if (cursorState.isDragging) {
                return "grabbing";
            }

            if (cursorIcon === CursorIcon.POINTER) {
                return "pointer";
            }

            if (cursorIcon === CursorIcon.CONTINUE_FROM_POINT) {
                return `url(${continuePathIcon}), crosshair`;
            }

            if (cursorIcon === CursorIcon.ADD_POINT) {
                return `url(${addPathIcon}), crosshair`;
            }

            if (cursorIcon === CursorIcon.REMOVE_POINT) {
                return `url(${removePathIcon}), crosshair`;
            }

            if (
                (activePolylineId && referencePathPointIndex !== undefined) ||
                (!activePolylineId && props.editingMode === PolylineEditingMode.DRAW)
            ) {
                return `url(${setPathPointIcon}), crosshair`;
            }

            return "default";
        },
        [cursorIcon, activePolylineId, referencePathPointIndex, props.editingMode]
    );

    return {
        layers,
        onMouseEvent,
        onDrag,
        getCursor,
        disableCameraInteraction: draggedPointIndex !== null,
        contextMenuItems,
        cursorPosition,
        activePolylineId,
        polylines: changedPolylines,
    };
}

function appendCoordinateToPath(path: number[][], coordinate: number[], index: number): number[][];
function appendCoordinateToPath(path: number[][], coordinate: number[], appendLocation: PathAppendLocation): number[][];
function appendCoordinateToPath(
    path: number[][],
    coordinate: number[],
    indexOrAppendLocation: number | PathAppendLocation
): number[][] {
    if (typeof indexOrAppendLocation === "number") {
        return [...path.slice(0, indexOrAppendLocation), coordinate, ...path.slice(indexOrAppendLocation)];
    }

    if (indexOrAppendLocation === PathAppendLocation.START) {
        return [coordinate, ...path];
    }

    return [...path, coordinate];
}
