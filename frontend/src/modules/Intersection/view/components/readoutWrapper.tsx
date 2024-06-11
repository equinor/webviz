import React from "react";

import { IntersectionReferenceSystem, Layer } from "@equinor/esv-intersection";
import { ViewContext } from "@framework/ModuleContext";
import { GlobalTopicDefinitions, WorkbenchServices, useSubscribedValue } from "@framework/WorkbenchServices";
import {
    EsvIntersection,
    EsvIntersectionReadoutEvent,
    LayerItem,
    Viewport,
} from "@framework/components/EsvIntersection";
import { HighlightItem, HighlightItemShape, ReadoutItem } from "@framework/components/EsvIntersection/types";
import { ReadoutBox } from "@framework/components/EsvIntersection/utilityComponents/ReadoutBox";
import { isWellborepathLayer } from "@framework/components/EsvIntersection/utils/layers";
import { SettingsToViewInterface } from "@modules/Intersection/settingsToViewInterface";
import { State } from "@modules/Intersection/state";

import { isEqual } from "lodash";

import { ViewAtoms } from "../atoms/atomDefinitions";

export type ReadoutWrapperProps = {
    wellboreHeaderUuid: string | null;
    showGrid: boolean;
    referenceSystem?: IntersectionReferenceSystem;
    layers: LayerItem[];
    layerIdToNameMap: Record<string, string>;
    viewport?: Viewport;
    onViewportChange: (viewport: Viewport) => void;
    bounds: {
        x: [number, number];
        y: [number, number];
    };
    verticalScale: number;
    workbenchServices: WorkbenchServices;
    viewContext: ViewContext<State, SettingsToViewInterface, Record<string, never>, ViewAtoms>;
};

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    const [readoutItems, setReadoutItems] = React.useState<ReadoutItem[]>([]);

    const [hoveredMd, setHoveredMd] = React.useState<number | null>(null);
    const [prevHoveredMd, setPrevHoveredMd] = React.useState<GlobalTopicDefinitions["global.hoverMd"] | null>(null);
    const syncedHoveredMd = useSubscribedValue(
        "global.hoverMd",
        props.workbenchServices,
        props.viewContext.getInstanceIdString()
    );

    if (!isEqual(syncedHoveredMd, prevHoveredMd)) {
        setPrevHoveredMd(syncedHoveredMd);
        if (syncedHoveredMd?.wellboreUuid === props.wellboreHeaderUuid) {
            setHoveredMd(syncedHoveredMd?.md ?? null);
        } else {
            setHoveredMd(null);
        }
    }

    const moduleInstanceId = props.viewContext.getInstanceIdString();

    const handleReadoutItemsChange = React.useCallback(
        function handleReadoutItemsChange(event: EsvIntersectionReadoutEvent): void {
            setReadoutItems(event.readoutItems);
            const items = event.readoutItems;
            const wellboreReadoutItem = items.find((item) => isWellborepathLayer(item.layer));
            const md = wellboreReadoutItem?.md;
            if (!md || !props.wellboreHeaderUuid) {
                props.workbenchServices.publishGlobalData("global.hoverMd", null);
                return;
            }
            props.workbenchServices.publishGlobalData(
                "global.hoverMd",
                { wellboreUuid: props.wellboreHeaderUuid, md: md },
                moduleInstanceId
            );
        },
        [moduleInstanceId, props.wellboreHeaderUuid, props.workbenchServices]
    );

    const makeLabelFromLayer = React.useCallback(
        function makeLabelFromLayer(layer: Layer<any>): string | null {
            return props.layerIdToNameMap[layer.id] ?? null;
        },
        [props.layerIdToNameMap]
    );

    const highlightItems: HighlightItem[] = [];
    if (props.referenceSystem && hoveredMd) {
        const point = props.referenceSystem.project(hoveredMd);
        highlightItems.push({
            point: [point[0], point[1]],
            color: "red",
            shape: HighlightItemShape.POINT,
            paintOrder: 6,
        });
    }

    return (
        <>
            <EsvIntersection
                showGrid={props.showGrid}
                zFactor={props.verticalScale}
                intersectionReferenceSystem={props.referenceSystem ?? undefined}
                showAxes
                axesOptions={{
                    xLabel: "X",
                    yLabel: "Z",
                    unitOfMeasure: "m",
                }}
                layers={props.layers}
                bounds={props.bounds}
                viewport={props.viewport ?? undefined}
                intersectionThreshold={50}
                highlightItems={highlightItems}
                onReadout={handleReadoutItemsChange}
                onViewportChange={props.onViewportChange}
            />
            <ReadoutBox readoutItems={readoutItems} makeLabelFromLayer={makeLabelFromLayer} />
        </>
    );
}
