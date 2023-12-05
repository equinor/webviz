import React, { useId } from "react";

import { RealizationsSurfaceSetSpec_api, StatisticalSurfaceSetSpec_api } from "@api";
import {
    Controller,
    GridLayer,
    IntersectionReferenceSystem,
    PixiRenderApplication,
    Trajectory,
} from "@equinor/esv-intersection";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useWellTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { ContentError } from "@modules/_shared/components/ContentMessage";
import { ContentErrorProps } from "@modules/_shared/components/ContentMessage/contentMessage";

import { isEqual } from "lodash";

import { EsvIntersection } from "./components/esvIntersection";
import {
    SurfacePolyLineSpec,
    useWellRealizationsSurfaceSetIntersectionQuery,
    useWellStatisticsSurfaceSetIntersectionQuery,
} from "./queryHooks";
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
    const esvPixiContentRef = React.useRef<PixiRenderApplication | null>(null);
    // const [pixiContext, setPixiContext] = React.useState<PixiRenderApplication | null>(null);
    const gridLayerUuid = useId();
    const statusWriter = useViewStatusWriter(moduleContext);

    const realizationsSurfaceSetSpec = moduleContext.useStoreValue("realizationsSurfaceSetSpec");
    const statisticalSurfaceSetSpec = moduleContext.useStoreValue("statisticalSurfaceSetSpec");
    const wellboreAddress = moduleContext.useStoreValue("wellboreAddress");
    const intersectionSettings = moduleContext.useStoreValue("intersectionSettings");

    // Extended wellbore trajectory for creating intersection/fence extended on both sides of wellbore
    const [extendedWellboreTrajectory, setExtendedWellboreTrajectory] = React.useState<Trajectory | null>(null);

    const [renderWellboreTrajectoryXyzPoints, setRenderWellboreTrajectoryXyzPoints] = React.useState<number[][] | null>(
        null
    );
    // Data for seismic fence layer in esv-intersection
    const width = wrapperDivSize.width;
    const height = wrapperDivSize.height - 100;
    React.useEffect(function initializeEsvIntersectionController() {
        if (esvIntersectionContainerRef.current) {
            const axisOptions = { xLabel: "x", yLabel: "y", unitOfMeasure: "m" };
            esvIntersectionControllerRef.current = new Controller({
                container: esvIntersectionContainerRef.current,
                axisOptions,
            });

            // Initialize/configure controller
            addMDOverlay(esvIntersectionControllerRef.current);
            esvIntersectionControllerRef.current.addLayer(new GridLayer(gridLayerUuid));
            esvIntersectionControllerRef.current.setBounds([10, 1000], [0, 3000]);
            esvIntersectionControllerRef.current.setViewport(1000, 1650, 6000);
            esvIntersectionControllerRef.current.zoomPanHandler.zFactor = intersectionSettings.zScale;
        }
        return () => {
            console.debug("controller destroyed");
            esvIntersectionControllerRef.current?.destroy();
        };
    }, []);
    console.log(wellboreAddress);
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
            intersectionSettings.extension
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
            console.log(newExtendedWellboreTrajectory.offset);
            const cum_length = newExtendedWellboreTrajectory
                ? IntersectionReferenceSystem.toDisplacement(
                      newExtendedWellboreTrajectory.points,
                      newExtendedWellboreTrajectory.offset
                  ).map((coord) => coord[0] - intersectionSettings.extension)
                : [];
            console.log(cum_length);
            candidateSurfacePolyLineSpec = { x_points, y_points, cum_length };
            setSurfacePolyLineSpec(candidateSurfacePolyLineSpec);
        }

        // When new well trajectory 3D points are loaded, update the render trajectory and clear the seismic fence image
        if (!isEqual(trajectoryXyzPoints, renderWellboreTrajectoryXyzPoints)) {
            setRenderWellboreTrajectoryXyzPoints(trajectoryXyzPoints);
        }
    }
    const realEnsembleIdent: EnsembleIdent = EnsembleIdent.fromCaseUuidAndEnsembleName(
        realizationsSurfaceSetSpec?.caseUuid ?? "",
        realizationsSurfaceSetSpec?.ensembleName ?? ""
    );
    const statEnsembleIdent: EnsembleIdent = EnsembleIdent.fromCaseUuidAndEnsembleName(
        statisticalSurfaceSetSpec?.caseUuid ?? "",
        statisticalSurfaceSetSpec?.ensembleName ?? ""
    );
    let realizationsSurfaceSetSpec_api: RealizationsSurfaceSetSpec_api | null = null;
    if (realizationsSurfaceSetSpec) {
        realizationsSurfaceSetSpec_api = {
            surface_names: realizationsSurfaceSetSpec.names,
            surface_attribute: realizationsSurfaceSetSpec.attribute,
            realization_nums: realizationsSurfaceSetSpec.realizationNums ?? [],
        };
    }
    let statisticalSurfaceSetSpec_api: StatisticalSurfaceSetSpec_api | null = null;
    if (statisticalSurfaceSetSpec) {
        statisticalSurfaceSetSpec_api = {
            surface_names: statisticalSurfaceSetSpec.names,
            surface_attribute: statisticalSurfaceSetSpec.attribute,
            statistic_function: statisticalSurfaceSetSpec.statistics,
            realization_nums: statisticalSurfaceSetSpec.realizationNums ?? [],
        };
    }
    // Get seismic fence data from polyline
    const surfaceSetRealizationsIntersectionPointsQuery = useWellRealizationsSurfaceSetIntersectionQuery(
        realEnsembleIdent,
        realizationsSurfaceSetSpec_api,
        candidateSurfacePolyLineSpec,
        true
    );
    if (surfaceSetRealizationsIntersectionPointsQuery.isError) {
        statusWriter.addError("Error loading seismic fence data");
    }
    const surfaceSetStatisticsInsectionPointsQuery = useWellStatisticsSurfaceSetIntersectionQuery(
        statEnsembleIdent,
        statisticalSurfaceSetSpec_api,
        candidateSurfacePolyLineSpec,
        true
    );
    if (
        esvIntersectionControllerRef.current &&
        (surfaceSetRealizationsIntersectionPointsQuery.data || surfaceSetStatisticsInsectionPointsQuery.data) &&
        renderWellboreTrajectoryXyzPoints
    ) {
        // // Get an array of projected 2D points [x, y], as 2D curtain projection from a set of trajectory 3D points and offset
        // const newExtendedWellboreTrajectoryXyProjection: number[][] = extendedWellboreTrajectory
        //     ? IntersectionReferenceSystem.toDisplacement(
        //           extendedWellboreTrajectory.points,
        //           extendedWellboreTrajectory.offset
        //       )
        //     : [];

        esvIntersectionControllerRef.current.removeAllLayers();
        esvIntersectionControllerRef.current.clearAllData();
        if (!esvPixiContentRef.current) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore

            esvPixiContentRef.current = new PixiRenderApplication({ width, height });
            console.log("hello");
        }

        addWellborePathLayer(esvIntersectionControllerRef.current, renderWellboreTrajectoryXyzPoints);
        if (surfaceSetRealizationsIntersectionPointsQuery.data) {
            addSurfaceLayers(
                esvIntersectionControllerRef.current,
                surfaceSetRealizationsIntersectionPointsQuery.data,
                esvPixiContentRef.current,
                "realizations",
                "black",
                4
            );
        }
        if (surfaceSetStatisticsInsectionPointsQuery.data) {
            addSurfaceLayers(
                esvIntersectionControllerRef.current,
                surfaceSetStatisticsInsectionPointsQuery.data,
                esvPixiContentRef.current,
                "statistical",
                "red",
                10
            );
        }
        // Update layout
        esvIntersectionControllerRef.current.zoomPanHandler.zFactor = intersectionSettings.zScale;
        esvIntersectionControllerRef.current.adjustToSize(
            Math.max(0, wrapperDivSize.width),
            Math.max(0, wrapperDivSize.height - 100)
        );
    }

    statusWriter.setLoading(
        getWellTrajectoriesQuery.isFetching || surfaceSetRealizationsIntersectionPointsQuery.isFetching
    );
    // Build up an error string handling multiple errors. e.g. "Error loading well trajectories and seismic fence data"
    // Do not useMemo
    let errorString = "";
    if (getWellTrajectoriesQuery.isError) {
        errorString += "Error loading well trajectories";
    }
    if (surfaceSetRealizationsIntersectionPointsQuery.isError) {
        errorString += "Error loading seismic fence data";
    }
    if (surfaceSetStatisticsInsectionPointsQuery.isError) {
        errorString += "Error loading statistical surface data";
    }
    if (errorString !== "") {
        statusWriter.addError(errorString);
    }

    return (
        <div ref={wrapperDivRef} className="relative w-full h-full">
            {errorString !== "" ? (
                <ContentError>{errorString}</ContentError>
            ) : (
                <EsvIntersection
                    width={width}
                    height={height}
                    zScale={5}
                    extension={5}
                    wellborePath={renderWellboreTrajectoryXyzPoints}
                    statisticalSurfaceIntersectionPoints={surfaceSetStatisticsInsectionPointsQuery.data}
                    realizationsSurfaceIntersectionPoints={surfaceSetRealizationsIntersectionPointsQuery.data}
                />
            )}
        </div>
    );
};