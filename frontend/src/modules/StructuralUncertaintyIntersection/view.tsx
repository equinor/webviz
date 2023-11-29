import React, { useId } from "react";

import {
    Controller,
    GridLayer,
    IntersectionReferenceSystem,
    PixiRenderApplication,
    Trajectory,
} from "@equinor/esv-intersection";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useWellTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { ContentError } from "@modules/_shared/components/ContentMessage";

import { isEqual } from "lodash";

import { SurfacePolyLineSpec, useSurfaceFenceQuery } from "./queryHooks";
import { State } from "./state";
import {
    addMDOverlay,
    addSeismicLayer,
    addSurfaceLayers,
    addWellborePathLayer,
} from "./utils/esvIntersectionControllerUtils";
import {
    makeExtendedTrajectoryFromTrajectoryXyzPoints,
    makeReferenceSystemFromTrajectoryXyzPoints,
    makeTrajectoryXyzPointsFromWellboreTrajectory,
} from "./utils/esvIntersectionDataConversion";

export const view = ({ moduleContext, workbenchSettings }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement | null>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const esvIntersectionContainerRef = React.useRef<HTMLDivElement | null>(null);
    const esvIntersectionControllerRef = React.useRef<Controller | null>(null);
    const [pixiContext, setPixiContext] = React.useState<PixiRenderApplication | null>(null);
    const gridLayerUuid = useId();
    const statusWriter = useViewStatusWriter(moduleContext);

    const surfaceSetSpec = moduleContext.useStoreValue("surfaceSetSpec");
    const wellboreAddress = moduleContext.useStoreValue("wellboreAddress");
    const extension = moduleContext.useStoreValue("extension");
    const zScale = moduleContext.useStoreValue("zScale");

    // Extended wellbore trajectory for creating intersection/fence extended on both sides of wellbore
    const [extendedWellboreTrajectory, setExtendedWellboreTrajectory] = React.useState<Trajectory | null>(null);

    const [renderWellboreTrajectoryXyzPoints, setRenderWellboreTrajectoryXyzPoints] = React.useState<number[][] | null>(
        null
    );
    // Data for seismic fence layer in esv-intersection

    React.useEffect(function initializeEsvIntersectionController() {
        if (esvIntersectionContainerRef.current) {
            const axisOptions = { xLabel: "x", yLabel: "y", unitOfMeasure: "m" };
            esvIntersectionControllerRef.current = new Controller({
                container: esvIntersectionContainerRef.current,
                axisOptions,
            });
            const width = wrapperDivSize.width;
            const height = wrapperDivSize.height - 100;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const pixiContext = new PixiRenderApplication({ width, height });
            setPixiContext(pixiContext);
            // Initialize/configure controller
            addMDOverlay(esvIntersectionControllerRef.current);
            esvIntersectionControllerRef.current.addLayer(new GridLayer(gridLayerUuid));
            esvIntersectionControllerRef.current.setBounds([10, 1000], [0, 3000]);
            esvIntersectionControllerRef.current.setViewport(1000, 1650, 6000);
            esvIntersectionControllerRef.current.zoomPanHandler.zFactor = zScale;
        }
        return () => {
            console.debug("controller destroyed");
            esvIntersectionControllerRef.current?.destroy();
        };
    }, []);

    // Get well trajectories query
    const getWellTrajectoriesQuery = useWellTrajectoriesQuery(wellboreAddress ? [wellboreAddress.uuid] : undefined);
    if (getWellTrajectoriesQuery.isError) {
        statusWriter.addError("Error loading well trajectories");
    }
    const [surfacePolyLineSpec, setSurfacePolyLineSpec] = React.useState<SurfacePolyLineSpec | null>(null);
    let candidateSurfacePolyLineSpec = surfacePolyLineSpec;
    // Use first trajectory and create polyline for seismic fence query, and extended wellbore trajectory for generating seismic fence image

    if (getWellTrajectoriesQuery.data && getWellTrajectoriesQuery.data.length !== 0) {
        const trajectoryXyzPoints = makeTrajectoryXyzPointsFromWellboreTrajectory(getWellTrajectoriesQuery.data[0]);
        const newExtendedWellboreTrajectory = makeExtendedTrajectoryFromTrajectoryXyzPoints(
            trajectoryXyzPoints,
            extension
        );

        const referenceSystem = makeReferenceSystemFromTrajectoryXyzPoints(trajectoryXyzPoints);
        if (esvIntersectionControllerRef.current) {
            esvIntersectionControllerRef.current.setReferenceSystem(referenceSystem);
        }

        // If the new extended trajectory is different, update the polyline, but keep the seismic fence image
        if (!isEqual(newExtendedWellboreTrajectory, extendedWellboreTrajectory)) {
            setExtendedWellboreTrajectory(newExtendedWellboreTrajectory);

            const x_points = newExtendedWellboreTrajectory?.points.map((coord) => coord[0]) ?? [];
            const y_points = newExtendedWellboreTrajectory?.points.map((coord) => coord[1]) ?? [];
            const cum_length = newExtendedWellboreTrajectory
                ? IntersectionReferenceSystem.toDisplacement(
                      newExtendedWellboreTrajectory.points,
                      newExtendedWellboreTrajectory.offset
                  ).map((coord) => coord[0] - extension)
                : [];
            candidateSurfacePolyLineSpec = { x_points, y_points, cum_length };
            setSurfacePolyLineSpec(candidateSurfacePolyLineSpec);
        }

        // When new well trajectory 3D points are loaded, update the render trajectory and clear the seismic fence image
        if (!isEqual(trajectoryXyzPoints, renderWellboreTrajectoryXyzPoints)) {
            setRenderWellboreTrajectoryXyzPoints(trajectoryXyzPoints);
        }
    }
    console.log(
        surfaceSetSpec?.caseUuid ?? null,
        surfaceSetSpec?.ensembleName ?? null,
        surfaceSetSpec?.attribute ?? null,
        surfaceSetSpec?.names ?? null,
        surfaceSetSpec?.realizationNums ?? null,
        candidateSurfacePolyLineSpec,
        surfaceSetSpec !== null
    );
    // Get seismic fence data from polyline
    const surfaceSetIntersectionPointsQuery = useSurfaceFenceQuery(
        surfaceSetSpec?.caseUuid ?? null,
        surfaceSetSpec?.ensembleName ?? null,
        surfaceSetSpec?.names ?? null,
        surfaceSetSpec?.attribute ?? null,

        surfaceSetSpec?.realizationNums ?? null,
        candidateSurfacePolyLineSpec,
        surfaceSetSpec !== null
    );
    if (surfaceSetIntersectionPointsQuery.isError) {
        statusWriter.addError("Error loading seismic fence data");
    }

    if (
        surfaceSetIntersectionPointsQuery.data &&
        esvIntersectionControllerRef.current &&
        pixiContext &&
        renderWellboreTrajectoryXyzPoints
    ) {
        // Get an array of projected 2D points [x, y], as 2D curtain projection from a set of trajectory 3D points and offset
        const newExtendedWellboreTrajectoryXyProjection: number[][] = extendedWellboreTrajectory
            ? IntersectionReferenceSystem.toDisplacement(
                  extendedWellboreTrajectory.points,
                  extendedWellboreTrajectory.offset
              )
            : [];

        esvIntersectionControllerRef.current.removeAllLayers();
        esvIntersectionControllerRef.current.clearAllData();

        addWellborePathLayer(esvIntersectionControllerRef.current, renderWellboreTrajectoryXyzPoints);
        addSurfaceLayers(esvIntersectionControllerRef.current, surfaceSetIntersectionPointsQuery.data, pixiContext);

        // Update layout
        esvIntersectionControllerRef.current.zoomPanHandler.zFactor = zScale;
        esvIntersectionControllerRef.current.adjustToSize(
            Math.max(0, wrapperDivSize.width),
            Math.max(0, wrapperDivSize.height - 100)
        );
    }

    statusWriter.setLoading(getWellTrajectoriesQuery.isFetching || surfaceSetIntersectionPointsQuery.isFetching);
    return (
        <div ref={wrapperDivRef} className="relative w-full h-full">
            {surfaceSetIntersectionPointsQuery.isError && getWellTrajectoriesQuery.isError ? (
                <ContentError>Error loading well trajectories and seismic fence data</ContentError>
            ) : surfaceSetIntersectionPointsQuery.isError ? (
                <ContentError>Error loading seismic fence data</ContentError>
            ) : getWellTrajectoriesQuery.isError ? (
                <ContentError>Error loading well trajectories</ContentError>
            ) : (
                <div ref={esvIntersectionContainerRef}></div>
            )}
        </div>
    );
};
