import React from "react";

import { Layer } from "@deck.gl/core";
import { MapMouseEvent } from "@webviz/subsurface-viewer";

import { Polyline } from "./types";

export type UseEditablePolylinesProps = {
    polylines: Polyline[];
};

export type UseEditablePolylinesReturnType = {
    layers: Layer<any>[];
    onMouseEvent: (event: MapMouseEvent) => void;
};

export function useEditablePolylines(props: UseEditablePolylinesProps): UseEditablePolylinesReturnType {
    const onMouseEvent = React.useCallback((event: MapMouseEvent) => {
        console.log("MouseEvent", event);
    }, []);

    return {
        layers: [],
        onMouseEvent,
    };
}
