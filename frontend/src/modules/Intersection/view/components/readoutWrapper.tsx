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
import { Interfaces } from "@modules/Intersection/interfaces";

import { isEqual } from "lodash";

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
    viewContext: ViewContext<Interfaces>;
};

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    const [readoutItems, setReadoutItems] = React.useState<ReadoutItem[]>([]);

    const [syncedHoveredMd, setSyncedHoveredMd] = React.useState<number | null>(null);
    const [readoutMd, setReadoutMd] = React.useState<number | null>(null);
    const [prevSyncedHoveredMd, setPrevSyncedHoveredMd] = React.useState<
        GlobalTopicDefinitions["global.hoverMd"] | null
    >(null);

    const syncedHoverMd = useSubscribedValue(
        "global.hoverMd",
        props.workbenchServices,
        props.viewContext.getInstanceIdString()
    );

    if (!isEqual(syncedHoveredMd, prevSyncedHoveredMd)) {
        setPrevSyncedHoveredMd(syncedHoverMd);
        if (syncedHoverMd?.wellboreUuid === props.wellboreHeaderUuid) {
            setSyncedHoveredMd(syncedHoverMd?.md ?? null);
        } else {
            setSyncedHoveredMd(null);
        }
    }

    const moduleInstanceId = props.viewContext.getInstanceIdString();

    React.useEffect(
        function propagateReadoutMdChange() {
            if (!readoutMd || !props.wellboreHeaderUuid) {
                props.workbenchServices.publishGlobalData("global.hoverMd", null);
                return;
            }
            props.workbenchServices.publishGlobalData(
                "global.hoverMd",
                { wellboreUuid: props.wellboreHeaderUuid, md: readoutMd },
                moduleInstanceId
            );

            return function resetPublishedHoverMd() {
                props.workbenchServices.publishGlobalData("global.hoverMd", null, moduleInstanceId);
            };
        },
        [readoutMd, props.workbenchServices, props.viewContext, props.wellboreHeaderUuid, moduleInstanceId]
    );

    const handleReadoutItemsChange = React.useCallback(function handleReadoutItemsChange(
        event: EsvIntersectionReadoutEvent
    ): void {
        setReadoutItems(event.readoutItems);
        const items = event.readoutItems;
        const wellboreReadoutItem = items.find((item) => isWellborepathLayer(item.layer));
        const md = wellboreReadoutItem?.md;
        setReadoutMd(md ?? null);
    },
    []);

    const makeLabelFromLayer = React.useCallback(
        function makeLabelFromLayer(layer: Layer<any>): string | null {
            return props.layerIdToNameMap[layer.id] ?? null;
        },
        [props.layerIdToNameMap]
    );

    const highlightItems: HighlightItem[] = [];
    if (props.referenceSystem && syncedHoveredMd) {
        const point = props.referenceSystem.project(syncedHoveredMd);
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
