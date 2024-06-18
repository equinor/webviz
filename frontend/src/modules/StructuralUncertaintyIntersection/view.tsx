import React from "react";

import { IntersectionReferenceSystem, Trajectory } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useElementSize } from "@lib/hooks/useElementSize";
import {
    makeExtendedTrajectoryFromTrajectoryXyzPoints,
    makeTrajectoryXyzPointsFromWellboreTrajectory,
} from "@modules/SeismicIntersection/utils/esvIntersectionDataConversion";
import { useWellboreTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { ContentError } from "@modules/_shared/components/ContentMessage";

import { isEqual } from "lodash";

import Legend from "./components/Legend";
import { EsvIntersection } from "./components/esvIntersection";
import { useSampleSurfaceInPointsQueries } from "./queryHooks";
import { State } from "./state";

export const View = ({ viewContext }: ModuleViewProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement | null>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const statusWriter = useViewStatusWriter(viewContext);

    const surfaceSetAddress = viewContext.useStoreValue("SurfaceSetAddress");
    const visualizationMode = viewContext.useStoreValue("visualizationMode");
    const statisticFunctions = viewContext.useStoreValue("statisticFunctions");
    const wellboreAddress = viewContext.useStoreValue("wellboreAddress");
    const intersectionSettings = viewContext.useStoreValue("intersectionSettings");
    const stratigraphyColorMap = viewContext.useStoreValue("stratigraphyColorMap");

    // Extended wellbore trajectory for creating intersection/fence extended on both sides of wellbore
    const [extendedWellboreTrajectory, setExtendedWellboreTrajectory] = React.useState<Trajectory | null>(null);

    const [renderWellboreTrajectoryXyzPoints, setRenderWellboreTrajectoryXyzPoints] = React.useState<number[][] | null>(
        null
    );
    const width = wrapperDivSize.width;
    const height = wrapperDivSize.height - 100;

    // Get well trajectories query
    const getWellTrajectoriesQuery = useWellboreTrajectoriesQuery(wellboreAddress ? [wellboreAddress.uuid] : undefined);
    if (getWellTrajectoriesQuery.isError) {
        statusWriter.addError("Error loading well trajectories");
    }

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
        }

        // When new well trajectory 3D points are loaded, update the render trajectory and clear the seismic fence image
        if (!isEqual(trajectoryXyzPoints, renderWellboreTrajectoryXyzPoints)) {
            setRenderWellboreTrajectoryXyzPoints(trajectoryXyzPoints);
        }
    }

    const x_points = extendedWellboreTrajectory?.points.map((coord) => coord[0]) ?? [];
    const y_points = extendedWellboreTrajectory?.points.map((coord) => coord[1]) ?? [];

    const cum_length = extendedWellboreTrajectory
        ? IntersectionReferenceSystem.toDisplacement(
              extendedWellboreTrajectory.points,
              extendedWellboreTrajectory.offset
          ).map((coord) => coord[0] - intersectionSettings.extension)
        : [];

    const sampleSurfaceInPointsQueries = useSampleSurfaceInPointsQueries(
        surfaceSetAddress?.caseUuid ?? "",
        surfaceSetAddress?.ensembleName ?? "",
        surfaceSetAddress?.names ?? [],
        surfaceSetAddress?.attribute ?? "",
        surfaceSetAddress?.realizationNums ?? [],
        x_points,
        y_points,
        true
    );

    statusWriter.setLoading(getWellTrajectoriesQuery.isFetching || sampleSurfaceInPointsQueries.isFetching);
    // Build up an error string handling multiple errors. e.g. "Error loading well trajectories and seismic fence data"
    // Do not useMemo
    let errorString = "";
    if (getWellTrajectoriesQuery.isError) {
        errorString += "Error loading well trajectories";
    }

    if (errorString !== "") {
        statusWriter.addError(errorString);
    }
    const stratigraphyColorLegendItems =
        surfaceSetAddress?.names.map((key) => {
            return { color: stratigraphyColorMap[key], label: key };
        }) ?? [];

    return (
        <div
            ref={wrapperDivRef}
            className="w-full h-full relative
        "
        >
            {errorString !== "" ? (
                <ContentError>{errorString}</ContentError>
            ) : (
                <>
                    <EsvIntersection
                        width={width}
                        height={height}
                        zScale={5}
                        extension={5}
                        wellborePath={renderWellboreTrajectoryXyzPoints}
                        surfaceRealizationSampleValuesData={sampleSurfaceInPointsQueries.data}
                        visualizationMode={visualizationMode}
                        statisticFunctions={statisticFunctions}
                        cumLength={cum_length}
                        stratigraphyColorMap={stratigraphyColorMap}
                    />
                    <div className="absolute bottom-0 left-0 right-0">
                        <Legend items={stratigraphyColorLegendItems} />
                    </div>
                </>
            )}
        </div>
    );
};
