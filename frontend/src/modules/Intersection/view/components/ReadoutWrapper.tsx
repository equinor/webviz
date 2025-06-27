import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { isEqual } from "lodash";

import type { ViewContext } from "@framework/ModuleContext";
import type { Viewport } from "@framework/types/viewport";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import type { GlobalTopicDefinitions, WorkbenchServices } from "@framework/WorkbenchServices";
import type { Bounds, EsvIntersectionReadoutEvent, LayerItem } from "@modules/_shared/components/EsvIntersection";
import { EsvIntersection } from "@modules/_shared/components/EsvIntersection";
import type { ReadoutItem as EsvReadoutItem, HighlightItem } from "@modules/_shared/components/EsvIntersection/types";
import { HighlightItemShape } from "@modules/_shared/components/EsvIntersection/types";
import { isWellborepathLayer } from "@modules/_shared/components/EsvIntersection/utils/layers";
import { esvReadoutToGenericReadout } from "@modules/_shared/components/EsvIntersection/utils/readoutItemUtils";
import type { ReadoutItem } from "@modules/_shared/components/ReadoutBox";
import { ReadoutBox } from "@modules/_shared/components/ReadoutBox";
import type { Interfaces } from "@modules/Intersection/interfaces";

// Needs extra distance for the left side; this avoids overlapping with legend elements
const READOUT_EDGE_DISTANCE_REM = { left: 6 };

export type ReadoutWrapperProps = {
    wellboreHeaderUuid: string | null;
    showGrid: boolean;
    referenceSystem?: IntersectionReferenceSystem;
    layers: LayerItem[];
    layerIdToNameMap: Record<string, string>;
    viewport?: Viewport;
    onViewportChange: (viewport: Viewport) => void;
    bounds: Bounds;
    verticalScale: number;
    workbenchServices: WorkbenchServices;
    viewContext: ViewContext<Interfaces>;
};

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    const [readoutItems, setReadoutItems] = React.useState<ReadoutItem[]>([]);

    const [storedGlobalHoverMd, setStoredGlobalHoverMd] = React.useState<number | null>(null);
    const [readoutMd, setReadoutMd] = React.useState<number | null>(null);
    const [prevStoredGlobalHoverMd, setPrevSyncedHoverMd] = React.useState<
        GlobalTopicDefinitions["global.hoverMd"] | null
    >(null);

    const globalHoverMd = useSubscribedValue(
        "global.hoverMd",
        props.workbenchServices,
        props.viewContext.getInstanceIdString(),
    );

    if (!isEqual(globalHoverMd, prevStoredGlobalHoverMd)) {
        setPrevSyncedHoverMd(globalHoverMd);
        if (globalHoverMd?.wellboreUuid === props.wellboreHeaderUuid) {
            setStoredGlobalHoverMd(globalHoverMd?.md ?? null);
        } else {
            setStoredGlobalHoverMd(null);
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
                moduleInstanceId,
            );

            return function resetPublishedHoverMd() {
                props.workbenchServices.publishGlobalData("global.hoverMd", null, moduleInstanceId);
            };
        },
        [readoutMd, props.workbenchServices, props.viewContext, props.wellboreHeaderUuid, moduleInstanceId],
    );

    const formatEsvLayout = React.useCallback(
        function formatEsvLayout(item: EsvReadoutItem, index: number): ReadoutItem {
            return esvReadoutToGenericReadout(item, index, props.layerIdToNameMap);
        },
        [props.layerIdToNameMap],
    );

    const handleReadoutItemsChange = React.useCallback(
        function handleReadoutItemsChange(event: EsvIntersectionReadoutEvent): void {
            const items = event.readoutItems;
            const wellboreReadoutItem = items.find((item) => isWellborepathLayer(item.layer));
            const md = wellboreReadoutItem?.md;

            setReadoutMd(md ?? null);
            setReadoutItems(event.readoutItems.map(formatEsvLayout));
        },
        [formatEsvLayout],
    );

    const highlightItems: HighlightItem[] = [];
    if (props.referenceSystem && storedGlobalHoverMd) {
        const point = props.referenceSystem.project(storedGlobalHoverMd);
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
            <ReadoutBox readoutItems={readoutItems} edgeDistanceRem={READOUT_EDGE_DISTANCE_REM} />
        </>
    );
}
