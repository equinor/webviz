import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";

import type { HoverService } from "@framework/HoverService";
import { HoverTopic, useHover, usePublishHoverValue } from "@framework/HoverService";
import type { ViewContext } from "@framework/ModuleContext";
import { IntersectionType } from "@framework/types/intersection";
import type { Viewport } from "@framework/types/viewport";
import type { EsvIntersectionReadoutEvent, LayerItem, Bounds } from "@modules/_shared/components/EsvIntersection";
import { EsvIntersection } from "@modules/_shared/components/EsvIntersection";
import type { ReadoutItem as EsvReadoutItem, HighlightItem } from "@modules/_shared/components/EsvIntersection/types";
import { HighlightItemShape } from "@modules/_shared/components/EsvIntersection/types";
import { isWellborepathLayer } from "@modules/_shared/components/EsvIntersection/utils/layers";
import { esvReadoutToGenericReadout } from "@modules/_shared/components/EsvIntersection/utils/readoutItemUtils";
import type { ReadoutItem } from "@modules/_shared/components/ReadoutBox";
import { ReadoutBox } from "@modules/_shared/components/ReadoutBox";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
import type { Interfaces } from "@modules/Intersection/interfaces";

// Needs extra distance for the left side; this avoids overlapping with legend elements
const READOUT_EDGE_DISTANCE_REM = { left: 6 };

export type ReadoutWrapperProps = {
    intersectionSource: IntersectionSettingValue | null;
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
    const [hoveredMd, setHoveredMd] = useHover(HoverTopic.WELLBORE_MD, props.hoverService, moduleInstanceId);
    const setHoveredWellbore = usePublishHoverValue(HoverTopic.WELLBORE, props.hoverService, moduleInstanceId);
    const [polylineHoverData, setPolylineHoverData] = useHover(
        HoverTopic.POLYLINE_LENGTH_ALONG,
        props.hoverService,
        moduleInstanceId,
    );

    // Extract wellbore and polyline id
    const wellboreUuid =
        props.intersectionSource?.type === IntersectionType.WELLBORE ? props.intersectionSource.uuid : null;
    const polylineId =
        props.intersectionSource?.type === IntersectionType.CUSTOM_POLYLINE ? props.intersectionSource.uuid : null;

    const formatEsvLayout = React.useCallback(
        function formatEsvLayout(item: EsvReadoutItem, index: number): ReadoutItem {
            return esvReadoutToGenericReadout(item, index, props.layerIdToNameMap);
        },
        [props.layerIdToNameMap],
    );

    const publishWellboreHoverEvent = React.useCallback(
        function publishWellboreHoverEvent(md: number | null): void {
            if (md !== null && props.referenceSystem) {
                setHoveredWellbore(wellboreUuid);
                setHoveredMd({ md, wellboreUuid: wellboreUuid! });
            } else {
                setHoveredWellbore(null);
                setHoveredMd(null);
            }
        },
        [props.referenceSystem, wellboreUuid, setHoveredMd, setHoveredWellbore],
    );

    const publishPolylineHoverEvent = React.useCallback(
        function publishPolylineHoverEvent(items: EsvIntersectionReadoutEvent["readoutItems"]): void {
            if (polylineId && items.length > 0) {
                setPolylineHoverData({ polylineId: polylineId, lengthAlong: items[0].point[0] });
            } else {
                setPolylineHoverData(null);
            }
        },
        [polylineId, setPolylineHoverData],
    );

    const handleReadoutItemsChange = React.useCallback(
        function handleReadoutItemsChange(event: EsvIntersectionReadoutEvent): void {
            const items = event.readoutItems;
            const wellboreReadoutItem = items.find((item) => isWellborepathLayer(item.layer));

            publishWellboreHoverEvent(wellboreReadoutItem?.md ?? null);
            publishPolylineHoverEvent(items);

            setReadoutItems(items.map(formatEsvLayout));
        },
        [formatEsvLayout, publishWellboreHoverEvent, publishPolylineHoverEvent],
    );

    const highlightItems: HighlightItem[] = [];

    // External hover on wellbore path
    // - red point at the hovered MD position
    if (props.referenceSystem && !hoverIsLocal && hoveredMd && hoveredMd.wellboreUuid === wellboreUuid) {
        const point = props.referenceSystem.project(hoveredMd.md);
        highlightItems.push({
            point: [point[0], point[1]],
            color: "red",
            shape: HighlightItemShape.POINT,
            paintOrder: 6,
        });
    }

    // External hover on polyline
    // - vertical red line at the length-along position
    if (polylineId && !hoverIsLocal && polylineHoverData?.polylineId === polylineId) {
        const yExtension = Math.abs(props.bounds.y[1] - props.bounds.y[0]) * 0.1;
        highlightItems.push({
            shape: HighlightItemShape.LINE,
            line: [
                [polylineHoverData.lengthAlong, props.bounds.y[0] - yExtension],
                [polylineHoverData.lengthAlong, props.bounds.y[1] + yExtension],
            ],
            color: "red",
            paintOrder: 5,
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
