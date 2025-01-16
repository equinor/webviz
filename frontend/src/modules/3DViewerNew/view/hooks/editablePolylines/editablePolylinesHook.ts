import React from "react";

import { Layer } from "@deck.gl/core";
import { MapMouseEvent } from "@webviz/subsurface-viewer";

import { isEqual } from "lodash";
import { v4 } from "uuid";

import { EditablePolylineLayer } from "./deckGlLayers/EditablePolylineLayer";
import { HoverPointLayer } from "./deckGlLayers/HoverPointLayer";
import { Polyline } from "./types";

export type UseEditablePolylinesProps = {
    editingActive: boolean;
    polylines: Polyline[];
};

export type UseEditablePolylinesReturnType = {
    layers: Layer<any>[];
    onMouseEvent: (event: MapMouseEvent) => void;
};

export function useEditablePolylines(props: UseEditablePolylinesProps): UseEditablePolylinesReturnType {
    const [hoverPoint, setHoverPoint] = React.useState<number[] | null>(null);
    const [activePolylineId, setActivePolylineId] = React.useState<string | null>(null);
    const [polylines, setPolylines] = React.useState<Polyline[]>(props.polylines);
    const [prevPolylines, setPrevPolylines] = React.useState<Polyline[]>(props.polylines);

    if (!isEqual(props.polylines, prevPolylines)) {
        setPolylines(props.polylines);
        setPrevPolylines(props.polylines);
    }

    const onMouseEvent = React.useCallback(
        (event: MapMouseEvent) => {
            if (event.type === "hover") {
                if (!props.editingActive) {
                    setHoverPoint(null);
                    return;
                }
                if (!event.x || !event.y) {
                    setHoverPoint(null);
                    return;
                }
                const firstLayerInfos = event.infos[0];
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

                if (!activePolylineId) {
                    const uuid = v4();
                    setActivePolylineId(uuid);
                    setPolylines([
                        ...polylines,
                        { id: uuid, color: [0, 0, 255, 255], polyline: [[...firstLayerInfos.coordinate]] },
                    ]);
                } else {
                    const updatedPolylines = polylines.map((polyline) => {
                        if (polyline.id === activePolylineId) {
                            if (!event.x || !event.y) {
                                return polyline;
                            }
                            const firstLayerInfos = event.infos[0];
                            if (!firstLayerInfos || !firstLayerInfos.coordinate) {
                                return polyline;
                            }
                            return {
                                ...polyline,
                                polyline: [...polyline.polyline, [...firstLayerInfos.coordinate]],
                            };
                        }
                        return polyline;
                    });
                    setPolylines(updatedPolylines);
                }
            }
        },
        [props.editingActive, activePolylineId, polylines]
    );

    const layers = [
        new HoverPointLayer({
            id: "hover-point-layer",
            point: hoverPoint,
            color: [255, 0, 0, 100],
        }),
        new EditablePolylineLayer({
            id: "editable-polylines-layer",
            polylines,
            editable: props.editingActive,
        }),
    ];

    return {
        layers,
        onMouseEvent,
    };
}
