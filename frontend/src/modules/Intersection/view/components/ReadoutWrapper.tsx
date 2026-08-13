import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";

import type { HoverService } from "@framework/HoverService";
import { HoverTopic, useHover, usePublishHoverValue } from "@framework/HoverService";
import type { ViewContext } from "@framework/ModuleContext";
import type { Intersection } from "@framework/types/intersection";
import { IntersectionType } from "@framework/types/intersection";
import type { Viewport } from "@framework/types/viewport";
import type { EsvIntersectionReadoutEvent, EsvLayer, Bounds } from "@modules/_shared/components/EsvIntersection";
import { EsvIntersection } from "@modules/_shared/components/EsvIntersection";
import type { EsvIntersectionController } from "@modules/_shared/components/EsvIntersection/EsvIntersectionController";
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

/**
 * referenceSystem.getPosition() clamps internally to the trajectory's real extent, so past the
 * fence's actual start/end (e.g. within the axis's visual extension margin) it keeps returning
 * the same boundary coordinate instead of a genuine position for the cursor. This extrapolates
 * linearly beyond the endpoints using the trajectory's own tangent vectors, mirroring what
 * IntersectionReferenceSystem.getTrajectory does internally for its from/to range extension.
 */
const MIN_DISPLACEMENT_M = 1e-6;

function getWorldPositionAtCurtainX(referenceSystem: IntersectionReferenceSystem, curtainX: number): number[] {
    const { trajectory } = referenceSystem.interpolators;
    // getPointAt is typed to return Vector (number[] | VectorType) generically, but this library
    // always uses plain number[] tuples for trajectory points.
    const getTrajectoryPoint = (t: number): number[] => trajectory.getPointAt(t) as number[];

    // A near-vertical fence has ~zero horizontal displacement, so the curtainX/displacement
    // normalization below (and getPosition()'s own internal curtainX/maxX normalization) divides
    // by ~0, producing NaN. The trajectory's XY position is constant regardless of depth in this
    // case (the well doesn't move horizontally), so just use it directly.
    if (Math.abs(referenceSystem.displacement) < MIN_DISPLACEMENT_M) {
        return getTrajectoryPoint(0);
    }

    const normalized = curtainX / referenceSystem.displacement;
    if (normalized >= 0 && normalized <= 1) {
        return referenceSystem.getPosition(curtainX);
    }

    if (normalized < 0) {
        const start = getTrajectoryPoint(0);
        const excess = -normalized * referenceSystem.displacement;
        return [
            start[0] + referenceSystem.startVector[0] * excess,
            start[1] + referenceSystem.startVector[1] * excess,
        ];
    }

    const end = getTrajectoryPoint(1);
    const excess = (normalized - 1) * referenceSystem.displacement;
    return [end[0] + referenceSystem.endVector[0] * excess, end[1] + referenceSystem.endVector[1] * excess];
}

export type ReadoutWrapperProps = {
    intersectionSource: IntersectionSettingValue | null;
    showGrid: boolean;
    referenceSystem?: IntersectionReferenceSystem;
    layers: EsvLayer[];
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

    // Live controller instance, exposed once by EsvIntersection on mount. Used to issue
    // read-only "what would be read out at this position" queries for synced hover, without
    // making EsvIntersection itself re-render on every hover tick.
    const controllerRef = React.useRef<EsvIntersectionController | null>(null);
    const handleControllerReady = React.useCallback(function handleControllerReady(
        controller: EsvIntersectionController | null,
    ) {
        controllerRef.current = controller;
    }, []);

    // Hover synchronization
    const [hoveredMd, setHoveredMd] = useHover(HoverTopic.WELLBORE_MD, props.hoverService, moduleInstanceId);
    const setHoveredWellbore = usePublishHoverValue(HoverTopic.WELLBORE, props.hoverService, moduleInstanceId);
    const [polylineHoverData, setPolylineHoverData] = useHover(
        HoverTopic.POLYLINE_LENGTH_ALONG,
        props.hoverService,
        moduleInstanceId,
    );
    // Same-fence readout position sync: a raw (x, y) point in this fence's own reference-system
    // space (length-along, depth), independent of MD. Works uniformly for wellbore and
    // custom-polyline fences alike, since both use that same axis space.
    const [hoveredFencePosition, setHoveredFencePosition] = useHover(
        HoverTopic.INTERSECTION_FENCE_POSITION,
        props.hoverService,
        moduleInstanceId,
    );

    // Extract wellbore and polyline id
    const wellboreUuid =
        props.intersectionSource?.type === IntersectionType.WELLBORE ? props.intersectionSource.uuid : null;
    const polylineId =
        props.intersectionSource?.type === IntersectionType.CUSTOM_POLYLINE ? props.intersectionSource.uuid : null;
    // Typed fence identity (type + uuid) for this view, used to scope readout position sync to
    // views on the exact same fence. Memoized so it is referentially stable across renders where
    // the underlying type/uuid haven't changed - it feeds a useCallback dependency array below.
    const intersectionSourceType = props.intersectionSource?.type ?? null;
    const intersectionSourceUuid = props.intersectionSource?.uuid ?? null;
    const fence: Intersection | null = React.useMemo(
        function makeFence() {
            if (intersectionSourceType === null || intersectionSourceUuid === null) {
                return null;
            }
            return { type: intersectionSourceType, uuid: intersectionSourceUuid };
        },
        [intersectionSourceType, intersectionSourceUuid],
    );

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

            // Sync the raw fence-local (x, y) position for same-fence readout queries. Uses
            // position.x/y directly (already in reference-system space) rather than MD, so it
            // works uniformly for wellbore and custom-polyline fences.
            if (fence) {
                setHoveredFencePosition(
                    isValidCursorPosition && position ? { fence, x: position.x, y: position.y } : null,
                );
            }

            if (!isValidCursorPosition || !props.referenceSystem || !position) {
                setMouseCursorUtmCoordinate(null);
                return;
            }

            // Extract UTM coordinates from the intersection ref system
            const utmPos = getWorldPositionAtCurtainX(props.referenceSystem, position.x);
            setMouseCursorUtmCoordinate({ x: utmPos[0], y: utmPos[1], z: position.y });
        },
        [
            polylineId,
            fence,
            props.bounds,
            props.verticalScale,
            props.viewport,
            props.referenceSystem,
            setPolylineHoverData,
            setHoveredFencePosition,
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

    // Readout items for a same-fence hover synced from another view, driven by the raw fence-local
    // (x, y) position - independent of MD, so it works uniformly for wellbore and custom-polyline
    // fences.
    let syncedReadoutItems: ReadoutItem[] = [];
    if (
        !isLocallyHoveringRef.current &&
        fence &&
        hoveredFencePosition &&
        hoveredFencePosition.fence.type === fence.type &&
        hoveredFencePosition.fence.uuid === fence.uuid
    ) {
        const synced = controllerRef.current?.calcReadoutAndHighlightItemsAtReferenceSystemPoint([
            hoveredFencePosition.x,
            hoveredFencePosition.y,
        ]) ?? { readoutItems: [], highlightItems: [] };
        syncedReadoutItems = synced.readoutItems.map(formatEsvLayout);
        highlightItems.push(...synced.highlightItems);
    }

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

    const displayedReadoutItems = isLocallyHoveringRef.current ? readoutItems : syncedReadoutItems;

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
                onControllerReady={handleControllerReady}
            />
            <ReadoutBox readoutItems={displayedReadoutItems} edgeDistanceRem={READOUT_EDGE_DISTANCE_REM} compact />
            <PositionReadout
                coordinates={mouseCursorUtmCoordinate}
                labels={{ z: "Depth" }}
                className="text-body-sm z-elevated gap-3xs p-3xs bg-surface/50 absolute right-12 bottom-10 flex rounded-sm font-mono backdrop-blur-sm"
                visible={!!mouseCursorUtmCoordinate}
            />
        </>
    );
}
