import React from "react";

import addPathIcon from "@assets/add_path.svg";
import continuePathIcon from "@assets/continue_path.svg";
import removePathIcon from "@assets/remove_path.svg";
import setPathPointIcon from "@assets/set_path_point.svg";
import { Layer, PickingInfo } from "@deck.gl/core";
import { DeckGLProps, DeckGLRef } from "@deck.gl/react";
import { MapMouseEvent } from "@webviz/subsurface-viewer";

import { isEqual } from "lodash";
import { v4 } from "uuid";

import {
    EditablePolyline,
    EditablePolylineLayer,
    isEditablePolylineLayerPickingInfo,
} from "./deckGlLayers/EditablePolylineLayer";
import { PolylinesLayer } from "./deckGlLayers/PolylinesLayer";
import { Polyline } from "./types";

export type UseEditablePolylinesProps = {
    deckGlRef: React.MutableRefObject<DeckGLRef | null>;
    editingActive: boolean;
    polylines: Polyline[];
};

export type UseEditablePolylinesReturnType = {
    layers: Layer<any>[];
    onDrag: (info: PickingInfo) => boolean;
    onMouseEvent: (event: MapMouseEvent) => void;
    disableCameraInteraction: boolean;
    getCursor: DeckGLProps["getCursor"];
};

enum CursorIcon {
    NONE = "none",
    ADD_POINT = "add-point",
    REMOVE_POINT = "remove-point",
    CONTINUE_FROM_POINT = "continue-from-point",
}

enum PathAppendLocation {
    START = "start",
    END = "end",
}

const PATH_ADD_POINT_ICON = "";

export function useEditablePolylines(props: UseEditablePolylinesProps): UseEditablePolylinesReturnType {
    const [hoverPoint, setHoverPoint] = React.useState<number[] | null>(null);
    const [activePolyline, setActivePolyline] = React.useState<EditablePolyline | null>(null);
    const [polylines, setPolylines] = React.useState<Polyline[]>(props.polylines);
    const [prevPolylines, setPrevPolylines] = React.useState<Polyline[]>(props.polylines);
    const [prevEditingActive, setPrevEditingActive] = React.useState<boolean>(props.editingActive);
    const [cursorIcon, setCursorIcon] = React.useState<CursorIcon | null>(null);
    const [cursorPosition, setCursorPosition] = React.useState<number[] | null>(null);
    const [appendLocation, setAppendLocation] = React.useState<PathAppendLocation>(PathAppendLocation.END);
    const [draggedPointIndex, setDraggedPointIndex] = React.useState<number | null>(null);

    if (!isEqual(props.polylines, prevPolylines)) {
        setPolylines(props.polylines);
        setPrevPolylines(props.polylines);
    }

    if (!isEqual(props.editingActive, prevEditingActive)) {
        setPrevEditingActive(props.editingActive);
        if (activePolyline && !props.editingActive) {
            setPolylines((prev) => [
                ...prev,
                {
                    id: v4(),
                    color: [230, 136, 21, 255],
                    polyline: activePolyline.path,
                },
            ]);
        }
        setActivePolyline(null);
    }

    React.useEffect(function onMount() {
        function onKeyUp(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setActivePolyline((prev) => (!prev ? prev : { ...prev, referencePathPointIndex: undefined }));
            }
        }

        window.addEventListener("keyup", onKeyUp);

        return () => {
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);

    const onMouseEvent = React.useCallback(
        (event: MapMouseEvent) => {
            if (event.type === "hover") {
                if (!event.x || !event.y) {
                    setHoverPoint(null);
                    setCursorIcon(CursorIcon.NONE);
                    return;
                }

                const firstLayerInfos = event.infos[0];

                if (!firstLayerInfos) {
                    setHoverPoint(null);
                    setCursorPosition(null);
                    setCursorIcon(CursorIcon.NONE);
                    return;
                }

                const editablePolylineLayerPickingInfo = event.infos.find(isEditablePolylineLayerPickingInfo);

                if (
                    editablePolylineLayerPickingInfo &&
                    editablePolylineLayerPickingInfo.viewport &&
                    firstLayerInfos.coordinate
                ) {
                    const position = editablePolylineLayerPickingInfo.viewport.project([...firstLayerInfos.coordinate]);
                    setCursorPosition(position);
                    if (
                        editablePolylineLayerPickingInfo.editableEntity &&
                        editablePolylineLayerPickingInfo.editableEntity.type === "line"
                    ) {
                        setCursorIcon(CursorIcon.ADD_POINT);
                        return;
                    }
                    if (
                        activePolyline &&
                        editablePolylineLayerPickingInfo.editableEntity &&
                        editablePolylineLayerPickingInfo.editableEntity.type === "point"
                    ) {
                        const index = editablePolylineLayerPickingInfo.editableEntity.index;
                        if (
                            activePolyline?.referencePathPointIndex === undefined &&
                            (index === 0 || index === activePolyline.path.length - 1)
                        ) {
                            setCursorIcon(CursorIcon.CONTINUE_FROM_POINT);
                            return;
                        }

                        setCursorIcon(CursorIcon.REMOVE_POINT);
                        return;
                    }
                } else {
                    setCursorPosition(null);
                    setCursorIcon(CursorIcon.NONE);
                }

                if (firstLayerInfos && firstLayerInfos.coordinate) {
                    setHoverPoint([...firstLayerInfos.coordinate]);
                }
            }

            if (event.type === "click") {
                if (!props.editingActive) {
                    return;
                }

                const firstLayerInfos = event.infos[0];
                if (!firstLayerInfos || !firstLayerInfos.coordinate) {
                    return;
                }

                const editablePolylineLayerPickingInfo = event.infos.find(isEditablePolylineLayerPickingInfo);
                if (
                    activePolyline &&
                    editablePolylineLayerPickingInfo &&
                    editablePolylineLayerPickingInfo.editableEntity
                ) {
                    // Remove point
                    if (editablePolylineLayerPickingInfo.editableEntity.type === "point") {
                        if (activePolyline.referencePathPointIndex === undefined) {
                            let index = editablePolylineLayerPickingInfo.editableEntity.index;
                            if (index === 0 || index === activePolyline.path.length - 1) {
                                const newPolyline: EditablePolyline = {
                                    ...activePolyline,
                                    referencePathPointIndex: index,
                                };

                                setActivePolyline(newPolyline);
                                if (index === 0) {
                                    setAppendLocation(PathAppendLocation.START);
                                } else {
                                    setAppendLocation(PathAppendLocation.END);
                                }
                                return;
                            }
                        }

                        let newReferencePathPointIndex: number | undefined = undefined;
                        if (activePolyline.referencePathPointIndex !== undefined) {
                            newReferencePathPointIndex = Math.max(0, activePolyline.referencePathPointIndex - 1);
                            if (
                                editablePolylineLayerPickingInfo.editableEntity.index >
                                activePolyline.referencePathPointIndex
                            ) {
                                newReferencePathPointIndex = activePolyline.referencePathPointIndex;
                            }
                            if (activePolyline.path.length - 1 < 1) {
                                newReferencePathPointIndex = undefined;
                            }
                        }
                        const newPolyline: EditablePolyline = {
                            ...activePolyline,
                            path: activePolyline.path.filter(
                                (_, index) => index !== editablePolylineLayerPickingInfo.editableEntity?.index
                            ),
                            referencePathPointIndex: newReferencePathPointIndex,
                        };

                        setActivePolyline(newPolyline);
                        return;
                    }
                    if (editablePolylineLayerPickingInfo.editableEntity.type === "line") {
                        const newPath = [...activePolyline.path];
                        newPath.splice(editablePolylineLayerPickingInfo.editableEntity.index + 1, 0, [
                            ...firstLayerInfos.coordinate,
                        ]);

                        let newReferencePathPointIndex: number | undefined = undefined;
                        if (activePolyline.referencePathPointIndex !== undefined) {
                            newReferencePathPointIndex = activePolyline.referencePathPointIndex + 1;
                            if (
                                editablePolylineLayerPickingInfo.editableEntity.index >
                                activePolyline.referencePathPointIndex
                            ) {
                                newReferencePathPointIndex = activePolyline.referencePathPointIndex;
                            }
                        }

                        const newPolyline: EditablePolyline = {
                            ...activePolyline,
                            path: newPath,
                            referencePathPointIndex: newReferencePathPointIndex,
                        };

                        setActivePolyline(newPolyline);
                        return;
                    }
                }

                if (!activePolyline) {
                    const newPolyline: EditablePolyline = {
                        color: [230, 136, 21, 255],
                        path: [[...firstLayerInfos.coordinate]],
                        referencePathPointIndex: 0,
                    };
                    setActivePolyline(newPolyline);
                } else {
                    if (activePolyline.referencePathPointIndex === undefined) {
                        return;
                    }
                    setActivePolyline({
                        ...activePolyline,
                        path: appendCoordinateToPath(activePolyline.path, firstLayerInfos.coordinate, appendLocation),
                        referencePathPointIndex:
                            appendLocation === PathAppendLocation.END ? activePolyline.path.length : 0,
                    });
                }
            }
        },
        [props.editingActive, activePolyline, appendLocation]
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
            }

            return true;
        },
        [disablePanning]
    );

    const onDrag = React.useCallback(
        function onDrag(info: PickingInfo) {
            if (draggedPointIndex === null || !activePolyline || !info.coordinate) {
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
                depth: 2,
                unproject3D: true,
            });

            if (!layers.length) {
                return false;
            }

            const firstLayerInfos = layers[0];

            if (!firstLayerInfos || !firstLayerInfos.coordinate) {
                return false;
            }

            const newPath = [...activePolyline.path];
            newPath[draggedPointIndex] = [...firstLayerInfos.coordinate];

            setActivePolyline({
                ...activePolyline,
                path: newPath,
            });

            return false;
        },
        [draggedPointIndex, activePolyline]
    );

    const onDragEnd = React.useCallback(
        function onDragEnd(info: PickingInfo) {
            setDraggedPointIndex(null);
            enablePanning();
        },
        [enablePanning]
    );

    const layers: Layer<any>[] = [
        new PolylinesLayer({
            id: "polylines-layer",
            polylines,
        }),
    ];

    if (activePolyline) {
        layers.push(
            new EditablePolylineLayer({
                id: "editable-polylines-layer",
                polyline: activePolyline,
                mouseHoverPoint: hoverPoint ?? undefined,
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

            if (cursorIcon === CursorIcon.CONTINUE_FROM_POINT) {
                return `url(${continuePathIcon}), crosshair`;
            }

            if (cursorIcon === CursorIcon.ADD_POINT) {
                return `url(${addPathIcon}), crosshair`;
            }

            if (cursorIcon === CursorIcon.REMOVE_POINT) {
                return `url(${removePathIcon}), crosshair`;
            }

            if (activePolyline) {
                return `url(${setPathPointIcon}), crosshair`;
            }

            return "default";
        },
        [cursorIcon, activePolyline]
    );

    return {
        layers,
        onMouseEvent,
        onDrag,
        getCursor,
        disableCameraInteraction: draggedPointIndex !== null,
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
