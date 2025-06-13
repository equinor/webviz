import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";

import type { HoverService } from "@framework/HoverService";
import { HoverTopic, useHover, usePublishHoverValue } from "@framework/HoverService";
import type { ViewContext } from "@framework/ModuleContext";
import type { Viewport } from "@framework/types/viewport";
import type { EsvIntersectionReadoutEvent, LayerItem, Bounds } from "@modules/_shared/components/EsvIntersection";
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
    hoverService: HoverService;
    viewContext: ViewContext<Interfaces>;
};

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    const moduleInstanceId = props.viewContext.getInstanceIdString();
    const [readoutItems, setReadoutItems] = React.useState<ReadoutItem[]>([]);
    // Hover synchronization
    const hoverIsLocal = props.hoverService.getLastHoveredModule() === moduleInstanceId;
    const [hoveredMd, setHoveredMd] = useHover(HoverTopic.MD, props.hoverService, moduleInstanceId);
    const [hoveredWellbore, setHoveredWellbore] = useHover(HoverTopic.WELLBORE, props.hoverService, moduleInstanceId);
    const setHoveredWorldPos = usePublishHoverValue(HoverTopic.WORLD_POS, props.hoverService, moduleInstanceId);

    const formatEsvLayout = React.useCallback(
        function formatEsvLayout(item: EsvReadoutItem, index: number): ReadoutItem {
            return esvReadoutToGenericReadout(item, index, props.layerIdToNameMap);
        },
        [props.layerIdToNameMap],
    );

    const publishHoverEvent = React.useCallback(
        function publishHoverEvent(md: number | null): void {
            if (md !== null && props.referenceSystem) {
                const [x, y] = props.referenceSystem.getPosition(md);
                const [, z] = props.referenceSystem.project(md);
                // ! We need to flip z since reference system increases downwards
                setHoveredWorldPos({ x, y, z: -z });
            } else {
                setHoveredWorldPos(null);
            }

            setHoveredWellbore(props.wellboreHeaderUuid);
            setHoveredMd(md);
        },
        [props.referenceSystem, props.wellboreHeaderUuid, setHoveredMd, setHoveredWellbore, setHoveredWorldPos],
    );

    const handleReadoutItemsChange = React.useCallback(
        function handleReadoutItemsChange(event: EsvIntersectionReadoutEvent): void {
            const items = event.readoutItems;
            const wellboreReadoutItem = items.find((item) => isWellborepathLayer(item.layer));
            const md = wellboreReadoutItem?.md;

            publishHoverEvent(md ?? null);
            setReadoutItems(event.readoutItems.map(formatEsvLayout));
        },
        [formatEsvLayout, publishHoverEvent],
    );

    const highlightItems: HighlightItem[] = [];

    if (props.referenceSystem && !hoverIsLocal && hoveredMd && hoveredWellbore === props.wellboreHeaderUuid) {
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
            <ReadoutBox readoutItems={readoutItems} edgeDistanceRem={READOUT_EDGE_DISTANCE_REM} />
        </>
    );
}
