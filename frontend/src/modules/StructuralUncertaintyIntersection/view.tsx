import React, { useId } from "react";

import { RealizationsSurfaceSetSpec_api, StatisticalSurfaceSetSpec_api, SurfaceIntersectionPoints_api } from "@api";
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
import { useWellTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { ContentError } from "@modules/_shared/components/ContentMessage";

import { isEqual } from "lodash";

import { EsvIntersection } from "./components/esvIntersection";
import {
    SurfacePolyLineSpec,
    useWellIntersectionSurfaceSetQueries,
    useWellRealizationsSurfaceSetIntersectionQuery,
    useWellStatisticsSurfaceSetIntersectionQuery,
} from "./queryHooks";
import { State } from "./state";
import { addMDOverlay, addSurfaceLayers, addWellborePathLayer } from "./utils/esvIntersectionControllerUtils";
import {
    makeExtendedTrajectoryFromTrajectoryXyzPoints,
    makeReferenceSystemFromTrajectoryXyzPoints,
    makeTrajectoryXyzPointsFromWellboreTrajectory,
} from "./utils/esvIntersectionDataConversion";

export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement | null>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

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

        // If the new extended trajectory is different, update the polyline, but keep the seismic fence image
        if (!isEqual(newExtendedWellboreTrajectory, extendedWellboreTrajectory)) {
            setExtendedWellboreTrajectory(newExtendedWellboreTrajectory);

            const x_points = newExtendedWellboreTrajectory?.points.map((coord) => coord[0]) ?? [];
            const y_points = newExtendedWellboreTrajectory?.points.map((coord) => coord[1]) ?? [];

            const cum_length = newExtendedWellboreTrajectory
                ? IntersectionReferenceSystem.toDisplacement(
                      newExtendedWellboreTrajectory.points,
                      newExtendedWellboreTrajectory.offset
                  ).map((coord) => coord[0] - intersectionSettings.extension)
                : [];

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

    const wellIntersectionSurfaceSetQueries = useWellIntersectionSurfaceSetQueries(
        realEnsembleIdent,
        realizationsSurfaceSetSpec_api,
        candidateSurfacePolyLineSpec,
        true
    );
    const realData: SurfaceIntersectionPoints_api[] = [];
    wellIntersectionSurfaceSetQueries.data?.forEach((surfaceSetIntersectionPoints) => {
        surfaceSetIntersectionPoints.intersectionPoints.forEach((intersectionPoint) => {
            realData.push(intersectionPoint);
        });
    });

    const surfaceSetStatisticsInsectionPointsQuery = useWellStatisticsSurfaceSetIntersectionQuery(
        statEnsembleIdent,
        statisticalSurfaceSetSpec_api,
        candidateSurfacePolyLineSpec,
        true
    );

    statusWriter.setLoading(getWellTrajectoriesQuery.isFetching || wellIntersectionSurfaceSetQueries.isFetching);
    // Build up an error string handling multiple errors. e.g. "Error loading well trajectories and seismic fence data"
    // Do not useMemo
    let errorString = "";
    if (getWellTrajectoriesQuery.isError) {
        errorString += "Error loading well trajectories";
    }

    if (surfaceSetStatisticsInsectionPointsQuery.isError) {
        errorString += "Error loading statistical surface data";
    }
    if (errorString !== "") {
        statusWriter.addError(errorString);
    }

    return (
        <div ref={wrapperDivRef} className="w-full h-full">
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
                    realizationsSurfaceIntersectionPoints={realData}
                />
            )}
        </div>
    );
};
