import React from "react";

import { GeoJsonLayer } from "@deck.gl/layers";
import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import type { MapMouseEvent } from "@webviz/subsurface-viewer";
import type { Feature } from "geojson";
import _ from "lodash";

import type { HoverData, HoverService } from "@framework/HoverService";
import { HoverTopic, useHoverValue, usePublishHoverValue } from "@framework/HoverService";
import type { ViewContext } from "@framework/ModuleContext";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import { getHoverTopicValuesInEvent } from "@modules/_shared/utils/subsurfaceViewerLayers";

import type { BoundingBox3D, BoundingBox2D, SubsurfaceViewerWrapperProps } from "./SubsurfaceViewerWrapper";
import { SubsurfaceViewerWrapper } from "./SubsurfaceViewerWrapper";

export type HoverUpdateWrapperProps = {
    wellboreUuid: string | null;
    intersectionReferenceSystem?: IntersectionReferenceSystem;
    workbenchServices: WorkbenchServices;
    hoverService: HoverService;
    viewContext: ViewContext<any>;
} & SubsurfaceViewerWrapperProps;

function useValidMdHover(activeWellbore: string | null, hoverService: HoverService, instanceId: string): number | null {
    const hoveredWellbore = useHoverValue(HoverTopic.WELLBORE, hoverService, instanceId);
    const hoveredMd = useHoverValue(HoverTopic.MD, hoverService, instanceId);

    if (hoveredWellbore !== activeWellbore) return null;

    return hoveredMd;
}

function useValidWorldPosHover(
    boundingBox: BoundingBox3D | BoundingBox2D,
    hoverService: HoverService,
    instanceId: string,
): HoverData[HoverTopic.WORLD_POS] {
    const is3Dbox = "zmin" in boundingBox;

    const hoveredWorldPos = useHoverValue(HoverTopic.WORLD_POS, hoverService, instanceId) ?? {};
    const { x, y, z } = hoveredWorldPos;
    const coordinates = [x, y, z];

    // We need at least 2 values to build a useful feature
    if (coordinates.filter((v) => v !== undefined).length < 2) return null;

    // Verify that all existing values are within the boundary
    if (x && !_.inRange(x, boundingBox.xmin, boundingBox.xmax)) return null;
    if (y && !_.inRange(y, boundingBox.ymin, boundingBox.ymax)) return null;
    // ? Should we validate Z? The box is the surface data, but wellbores can be rendered outside this range
    if (z && is3Dbox && !_.inRange(z, boundingBox.zmin, boundingBox.zmax)) return null;

    return hoveredWorldPos;
}

function makeMdHighlightFeature(md: number, intersectionReferenceSystem: IntersectionReferenceSystem): Feature {
    const [x, y] = intersectionReferenceSystem.getPosition(md);
    const [, z] = intersectionReferenceSystem.project(md);
    const hoveredMdPoint3d = [x, y, -z];

    return {
        type: "Feature",
        geometry: {
            type: "Point",
            coordinates: hoveredMdPoint3d,
        },
        properties: {
            color: [255, 0, 0], // Custom property to use in styling (optional)
        },
    };
}

function makeWorldPosHighlightFeature(
    worldPos: NonNullable<HoverData[HoverTopic.WORLD_POS]>,
    boundingBox: BoundingBox3D | BoundingBox2D,
): Feature {
    const { x, y, z } = worldPos;
    const validCoordinates = [x, y, z].filter((c) => c !== undefined);
    if (validCoordinates.length < 2) throw Error("Expected at least 2 coordinates in world position");

    if (validCoordinates.length === 3) {
        return {
            type: "Feature",
            properties: {},
            geometry: {
                type: "Point",
                coordinates: [x!, y!, z!],
            },
        };
    }

    const coordsX = x ? [x, x] : [boundingBox.xmin, boundingBox.xmax];
    const coordsY = y ? [y, y] : [boundingBox.ymin, boundingBox.ymax];
    // Z bounding box is only based on the grid's own values, and is fairly small,
    // so we expand the z-length somewhat to make it easier to see vertical bars

    const zBoundMax = "zmax" in boundingBox ? boundingBox.zmax : 1000;
    const cordsZ = z ? [z, z] : [0, -zBoundMax];

    return {
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: [
                [coordsX[0], coordsY[0], cordsZ[0]],
                [coordsX[1], coordsY[1], cordsZ[1]],
            ],
        },
    };
}

export function HoverUpdateWrapper(props: HoverUpdateWrapperProps): React.ReactNode {
    const { onViewerHover: onViewerHoverExternal, ...otherProps } = props;

    const hoverService = props.hoverService;
    const instanceId = props.viewContext.getInstanceIdString();
    const lastHoverWasLocal = hoverService.getLastHoveredModule() === instanceId;

    const setHoveredWorldPos = usePublishHoverValue(HoverTopic.WORLD_POS, hoverService, instanceId);
    const setHoveredWellbore = usePublishHoverValue(HoverTopic.WELLBORE, hoverService, instanceId);
    const setHoveredMd = usePublishHoverValue(HoverTopic.MD, hoverService, instanceId);

    const validHoverMd = useValidMdHover(props.wellboreUuid, hoverService, instanceId);
    const validHoverWorldPos = useValidWorldPosHover(props.boundingBox, hoverService, instanceId);

    const highlightFeatures = React.useMemo((): Feature[] => {
        if (lastHoverWasLocal) return [];

        const highlights: Feature[] = [];
        if (validHoverMd && props.intersectionReferenceSystem) {
            highlights.push(makeMdHighlightFeature(validHoverMd, props.intersectionReferenceSystem));
        } else if (validHoverWorldPos) {
            highlights.push(makeWorldPosHighlightFeature(validHoverWorldPos, props.boundingBox));
        }

        return highlights;
    }, [lastHoverWasLocal, validHoverMd, props.intersectionReferenceSystem, props.boundingBox, validHoverWorldPos]);

    const highlightLayer = new GeoJsonLayer({
        id: "hover-highlights",
        data: {
            type: "FeatureCollection",
            features: highlightFeatures,
        },
        coordinateSystem: 0,
        pickable: false,
        getPosition: (d: number[]) => d,
        getRadius: 10,
        pointRadiusUnits: "pixels",
        lineWidthUnits: "pixels",
        getFillColor: [255, 0, 0],
        getLineColor: [0, 0, 0, 175],
        getLineWidth: 3,
        lineWidthMinPixels: 3,
        ZIncreasingDownwards: false,
        lineBillboard: true,
    });

    const onViewerHover = React.useCallback(
        function onViewerHover(mouseEvent: MapMouseEvent) {
            const hoverData = getHoverTopicValuesInEvent(
                mouseEvent,
                HoverTopic.MD,
                HoverTopic.WELLBORE,
                HoverTopic.WORLD_POS,
            );

            setHoveredWorldPos(hoverData[HoverTopic.WORLD_POS]);
            setHoveredWellbore(hoverData[HoverTopic.WELLBORE]);
            setHoveredMd(hoverData[HoverTopic.MD]);

            onViewerHoverExternal?.(mouseEvent);
        },
        [onViewerHoverExternal, setHoveredMd, setHoveredWellbore, setHoveredWorldPos],
    );

    return (
        <SubsurfaceViewerWrapper
            {...otherProps}
            layers={[...props.layers, highlightLayer]}
            onViewerHover={onViewerHover}
        />
    );
}
