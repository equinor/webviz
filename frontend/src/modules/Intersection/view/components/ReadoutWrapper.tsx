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
import { PositionReadout, type PositionCoordinates } from "@modules/_shared/components/PositionReadout";
import type { ReadoutItem } from "@modules/_shared/components/ReadoutBox";
import { ReadoutBox } from "@modules/_shared/components/ReadoutBox";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
import type { Interfaces } from "@modules/Intersection/interfaces";

const AXES_LABELS = { xLabel: "Length along", yLabel: "Depth" };

// Needs extra distance for the left side; this avoids overlapping with legend elements.
// Bottom offset is set to clear the PositionReadout displayed at the bottom of the view.
const READOUT_EDGE_DISTANCE_REM = { left: 6, bottom: 6 };

const DEPTH_HOVER_MIN_THRESHOLD_M = 1000; // Minimum threshold for hover in depth direction, in meters
const VIEWPORT_HOVER_THRESHOLD_PERCENTAGE = 25.0; // Percentage of the viewport height

export type ReadoutWrapperProps = {
    intersectionSource: IntersectionSettingValue | null;
    showGrid: boolean;
    referenceSystem?: IntersectionReferenceSystem;
    layers: LayerItem[];
    layerIdToNameMap: Record<string, string>;
    viewport?: Viewport;
    bounds: Bounds;
    verticalScale: number;
    hoverService: HoverService;
    viewContext: ViewContext<Interfaces>;
    onViewportChange: (viewport: Viewport) => void;
};

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    const moduleInstanceId = props.viewContext.getInstanceIdString();
    const [readoutItems, setReadoutItems] = React.useState<ReadoutItem[]>([]);
    const [mouseCursorUtmCoordinate, setMouseCursorUtmCoordinate] = React.useState<PositionCoordinates | null>(null);

    // Track if hovering is from this view, or externally:
    const isLocallyHoveringRef = React.useRef(false);

    // Hover synchronization
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
            return esvReadoutToGenericReadout(item, index, props.layerIdToNameMap, AXES_LABELS);
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

    const handleMousePositionChange = React.useCallback(
        function handleMousePositionChange(position: { x: number; y: number } | null): void {
            isLocallyHoveringRef.current = position !== null;

            const viewportSpanY = props.viewport
                ? props.viewport[2] / props.verticalScale
                : props.bounds.y[1] - props.bounds.y[0];
            const depthThreshold = Math.max(
                (viewportSpanY * VIEWPORT_HOVER_THRESHOLD_PERCENTAGE) / 100.0,
                DEPTH_HOVER_MIN_THRESHOLD_M,
            );
            const isValidCursorPosition =
                position !== null &&
                position.x >= props.bounds.x[0] &&
                position.x <= props.bounds.x[1] &&
                position.y >= props.bounds.y[0] - depthThreshold &&
                position.y <= props.bounds.y[1] + depthThreshold;

            if (polylineId) {
                const polylineHoverData = isValidCursorPosition ? { polylineId, lengthAlong: position.x } : null;
                setPolylineHoverData(polylineHoverData);
            }

            if (!isValidCursorPosition || !props.referenceSystem || !position) {
                setMouseCursorUtmCoordinate(null);
                return;
            }

            // Extract UTM coordinates from the intersection ref system
            const utmPos = props.referenceSystem.getPosition(position.x);
            setMouseCursorUtmCoordinate({ x: utmPos[0], y: utmPos[1], z: position.y });
        },
        [
            polylineId,
            props.bounds,
            props.verticalScale,
            props.viewport,
            props.referenceSystem,
            setPolylineHoverData,
            setMouseCursorUtmCoordinate,
        ],
    );

    const handleReadoutItemsChange = React.useCallback(
        function handleReadoutItemsChange(event: EsvIntersectionReadoutEvent): void {
            const items = event.readoutItems;
            const wellboreReadoutItem = items.find((item) => isWellborepathLayer(item.layer));

            publishWellboreHoverEvent(wellboreReadoutItem?.md ?? null);

            setReadoutItems(items.map(formatEsvLayout));
        },
        [formatEsvLayout, publishWellboreHoverEvent],
    );

    const highlightItems: HighlightItem[] = [];

    // External hover on wellbore path
    // - red point at the hovered MD position
    if (
        props.referenceSystem &&
        !isLocallyHoveringRef.current &&
        hoveredMd &&
        hoveredMd.wellboreUuid === wellboreUuid
    ) {
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
    if (polylineId && !isLocallyHoveringRef.current && polylineHoverData?.polylineId === polylineId) {
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
                showAxesLabels
                axesOptions={{
                    xLabel: AXES_LABELS.xLabel,
                    yLabel: AXES_LABELS.yLabel,
                    unitOfMeasure: "m",
                }}
                layers={props.layers}
                bounds={props.bounds}
                viewport={props.viewport ?? undefined}
                intersectionThreshold={50}
                highlightItems={highlightItems}
                onReadout={handleReadoutItemsChange}
                onMousePositionChange={handleMousePositionChange}
                onViewportChange={props.onViewportChange}
            />
            <ReadoutBox readoutItems={readoutItems} edgeDistanceRem={READOUT_EDGE_DISTANCE_REM} compact />
            <PositionReadout
                coordinates={mouseCursorUtmCoordinate}
                labels={{ z: "Depth" }}
                className="absolute bottom-10 right-12 bg-white/50 p-2 backdrop-blur-sm rounded-sm flex gap-2 z-10 text-sm font-mono"
                visible={!!mouseCursorUtmCoordinate}
            />
        </>
    );
}
