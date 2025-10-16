import React from "react";

import type { PickingInfo } from "@deck.gl/core";
import type { PropertyDataType } from "@webviz/subsurface-viewer";
import type { PickingInfoPerView } from "@webviz/subsurface-viewer/dist/hooks/useMultiViewPicking";
import _ from "lodash";

import type { InfoItem, ReadoutItem } from "@modules/_shared/components/ReadoutBox";
import { ReadoutBox } from "@modules/_shared/components/ReadoutBox";

// Needs extra distance for the left side; this avoids overlapping with legend elements
const READOUT_EDGE_DISTANCE_REM = { left: 6, right: 2 };

// Infering the record type from PickingInfoPerView since it's not exported anywhere
export type ViewportPickingInfo = PickingInfoPerView extends Record<any, infer V> ? V : never;

export type ReadoutBoxWrapperProps = {
    viewportPicks?: PickingInfo[];
    maxNumItems?: number;
    visible?: boolean;
    compact?: boolean;
};

function makePositionReadout(coordinates?: number[]): ReadoutItem | null {
    if (coordinates === undefined || coordinates.length < 2) {
        return null;
    }
    return {
        label: "Position",
        info: [
            { name: "x", value: coordinates[0], unit: "m" },
            { name: "y", value: coordinates[1], unit: "m" },
        ],
    };
}

function makeInfoPickReadout(pick: PickingInfo): ReadoutItem | null {
    // @ts-expect-error -- name injected by subsurface viewer
    const label = pick.layer?.props.name;
    const info: InfoItem[] = [];

    // Subsurface has different fields of layers with singular and multiple properties
    if ("propertyValue" in pick) {
        const property = pick.propertyValue as number;
        info.push({ name: "Value", value: property });
    } else if ("properties" in pick) {
        const properties = pick.properties as PropertyDataType[];

        for (const property of properties) {
            info.push({ name: property.name, value: property.value });
        }
    }

    if (!info.length) return null;
    return { label, info };
}

export function ReadoutBoxWrapper(props: ReadoutBoxWrapperProps): React.ReactNode {
    const readoutItems = React.useMemo(() => {
        if (!props.viewportPicks?.length) return [];

        const readoutItems: ReadoutItem[] = [];

        // Coordinates can be taken from any of them
        const position = makePositionReadout(props.viewportPicks[0].coordinate);
        if (position) {
            readoutItems.push(position);
        }

        for (const pick of _.sortBy(props.viewportPicks, "index")) {
            const readout = makeInfoPickReadout(pick);
            if (readout) readoutItems.push(readout);
        }

        return readoutItems;
    }, [props.viewportPicks]);

    return (
        <ReadoutBox
            noLabelColor
            readoutItems={readoutItems}
            edgeDistanceRem={READOUT_EDGE_DISTANCE_REM}
            compact={props.compact}
        />
    );
}
