import React, { useId } from "react";

import { SeismicFencePolyline_api } from "@api";
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
import { SurfaceIntersectionCumulativeLengthPolyline } from "src/api/models/SurfaceIntersectionCumulativeLengthPolyline";

import { useSeismicFenceDataQuery, useSurfaceIntersectionQuery } from "./queryHooks";
import { State } from "./state";
import { addMDOverlay, addSeismicLayer, addWellborePathLayer } from "./utils/esvIntersectionControllerUtils";
import {
    createSeismicSliceImageDataArrayFromFenceData,
    createSeismicSliceImageYAxisValuesArrayFromFenceData,
    makeExtendedTrajectoryFromTrajectoryXyzPoints,
    makeReferenceSystemFromTrajectoryXyzPoints,
    makeTrajectoryXyzPointsFromWellboreTrajectory,
} from "./utils/esvIntersectionDataConversion";
import {
    SeismicSliceImageOptions,
    SeismicSliceImageStatus,
    useGenerateSeismicSliceImageData,
} from "./utils/esvIntersectionHooks";

export const view = ({ moduleContext, workbenchSettings }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement | null>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const esvIntersectionContainerRef = React.useRef<HTMLDivElement | null>(null);
    const esvIntersectionControllerRef = React.useRef<Controller | null>(null);
    const esvPixiRenderApplicationRef = React.useRef<PixiRenderApplication | null>(null);

    const gridLayerUuid = useId();
    const statusWriter = useViewStatusWriter(moduleContext);

    const seismicAddress = moduleContext.useStoreValue("seismicAddress");
    const surfaceAddress = moduleContext.useStoreValue("surfaceAddress");
    const wellboreAddress = moduleContext.useStoreValue("wellboreAddress");
    const extension = moduleContext.useStoreValue("extension");
    const zScale = moduleContext.useStoreValue("zScale");

    const seismicColorScale = workbenchSettings.useDiscreteColorScale({
        gradientType: ColorScaleGradientType.Diverging,
    });

    const [seismicColors, setSeismicColors] = React.useState<string[]>(seismicColorScale.getColorPalette().getColors());
    if (!isEqual(seismicColorScale.getColorPalette().getColors(), seismicColors)) {
        setSeismicColors(seismicColorScale.getColorPalette().getColors());
    }

    // Extended wellbore trajectory for creating intersection/fence extended on both sides of wellbore
    const [extendedWellboreTrajectory, setExtendedWellboreTrajectory] = React.useState<Trajectory | null>(null);

    // Array of 3D points [x,y,z] for well trajectory layer in esv-intersection (to be in synch with seismic fence layer)
    const [renderWellboreTrajectoryXyzPoints, setRenderWellboreTrajectoryXyzPoints] = React.useState<number[][] | null>(
        null
    );

    // States to fetch seismic fence and surface intersection
    const [seismicFencePolyline, setSeismicFencePolyline] = React.useState<SeismicFencePolyline_api | null>(null);
    const [surfaceIntersectionCumulativeLengthPolyline, setSurfaceIntersectionCumulativeLengthPolyline] =
        React.useState<SurfaceIntersectionCumulativeLengthPolyline | null>(null);

    // Async generating seismic slice image
    const [generateSeismicSliceImageOptions, setGenerateSeismicSliceImageOptions] =
        React.useState<SeismicSliceImageOptions | null>(null);
    const generatedSeismicSliceImageData = useGenerateSeismicSliceImageData(generateSeismicSliceImageOptions);

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
            esvPixiRenderApplicationRef.current = new PixiRenderApplication({ width, height });

            // Initialize/configure controller
            addMDOverlay(esvIntersectionControllerRef.current);
            esvIntersectionControllerRef.current.addLayer(new GridLayer(gridLayerUuid));
            esvIntersectionControllerRef.current.setBounds([10, 1000], [0, 3000]);
            esvIntersectionControllerRef.current.setViewport(1000, 1650, 6000);
            esvIntersectionControllerRef.current.zoomPanHandler.zFactor = zScale;
        }
        return () => {
            esvIntersectionControllerRef.current?.destroy();
            esvPixiRenderApplicationRef.current?.destroy();
        };
    }, []);

    // Get well trajectories query
    const wellTrajectoriesQuery = useWellTrajectoriesQuery(wellboreAddress ? [wellboreAddress.uuid] : undefined);
    if (wellTrajectoriesQuery.isError) {
        statusWriter.addError("Error loading well trajectories");
    }

    // Use first trajectory and create polyline for seismic fence query, and extended wellbore trajectory for generating seismic fence image
    let candidateSeismicFencePolyline = seismicFencePolyline;
    let candidateSurfaceIntersectionCumulativeLengthPolyline = surfaceIntersectionCumulativeLengthPolyline;
    if (wellTrajectoriesQuery.data && wellTrajectoriesQuery.data.length !== 0) {
        const trajectoryXyzPoints = makeTrajectoryXyzPointsFromWellboreTrajectory(wellTrajectoriesQuery.data[0]);
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
            candidateSeismicFencePolyline = { x_points, y_points };
            setSeismicFencePolyline(candidateSeismicFencePolyline);

            const cum_lengths = newExtendedWellboreTrajectory
                ? IntersectionReferenceSystem.toDisplacement(
                      newExtendedWellboreTrajectory.points,
                      newExtendedWellboreTrajectory.offset
                  ).map((coord) => coord[0] - extension)
                : [];
            candidateSurfaceIntersectionCumulativeLengthPolyline = { x_points, y_points, cum_lengths };
            setSurfaceIntersectionCumulativeLengthPolyline(candidateSurfaceIntersectionCumulativeLengthPolyline);
        }

        // When new well trajectory 3D points are loaded, update the render trajectory and clear the seismic fence image
        if (!isEqual(trajectoryXyzPoints, renderWellboreTrajectoryXyzPoints)) {
            setRenderWellboreTrajectoryXyzPoints(trajectoryXyzPoints);
            setGenerateSeismicSliceImageOptions(null);
        }
    }

    // Get seismic fence data from polyline
    const seismicFenceDataQuery = useSeismicFenceDataQuery(
        seismicAddress?.caseUuid ?? null,
        seismicAddress?.ensemble ?? null,
        seismicAddress?.realizationNumber ?? null,
        seismicAddress?.attribute ?? null,
        seismicAddress?.timeString ?? null,
        seismicAddress?.observed ?? null,
        candidateSeismicFencePolyline,
        seismicAddress !== null
    );
    if (seismicFenceDataQuery.isError) {
        statusWriter.addError("Error loading seismic fence data");
    }

    // Get surface intersection data from polyline
    const surfaceIntersectionDataQuery = useSurfaceIntersectionQuery(
        surfaceAddress?.caseUuid ?? null,
        surfaceAddress?.ensemble ?? null,
        surfaceAddress?.realizationNumber ?? null,
        surfaceAddress?.surfaceNames ?? null,
        surfaceAddress?.attribute ?? null,
        surfaceAddress?.timeString ?? null,
        candidateSurfaceIntersectionCumulativeLengthPolyline,
        seismicAddress !== null
    );
    if (surfaceIntersectionDataQuery.isError) {
        statusWriter.addError("Error loading surface intersection data");
    }

    if (seismicFenceDataQuery.data) {
        // Get an array of projected 2D points [x, y], as 2D curtain projection from a set of trajectory 3D points and offset
        const newExtendedWellboreTrajectoryXyProjection: number[][] = extendedWellboreTrajectory
            ? IntersectionReferenceSystem.toDisplacement(
                  extendedWellboreTrajectory.points,
                  extendedWellboreTrajectory.offset
              )
            : [];

        const newSeismicImageDataArray = createSeismicSliceImageDataArrayFromFenceData(seismicFenceDataQuery.data);
        const newSeismicImageYAxisValues = createSeismicSliceImageYAxisValuesArrayFromFenceData(
            seismicFenceDataQuery.data
        );

        const newGenerateSeismicSliceImageOptions: SeismicSliceImageOptions = {
            dataValues: newSeismicImageDataArray,
            yAxisValues: newSeismicImageYAxisValues,
            trajectoryXyPoints: newExtendedWellboreTrajectoryXyProjection,
            colormap: seismicColors,
            extension: extension,
        };

        if (!isEqual(generateSeismicSliceImageOptions, newGenerateSeismicSliceImageOptions)) {
            setGenerateSeismicSliceImageOptions(newGenerateSeismicSliceImageOptions);
        }
    }

    // Update esv-intersection controller when data is ready - keep old data to prevent blank view when fetching new data
    if (esvIntersectionControllerRef.current && renderWellboreTrajectoryXyzPoints) {
        esvIntersectionControllerRef.current.removeAllLayers();
        esvIntersectionControllerRef.current.clearAllData();

        addWellborePathLayer(esvIntersectionControllerRef.current, renderWellboreTrajectoryXyzPoints);

        if (
            generateSeismicSliceImageOptions &&
            generatedSeismicSliceImageData.synchedOptions &&
            generatedSeismicSliceImageData.image &&
            generatedSeismicSliceImageData.status === SeismicSliceImageStatus.SUCCESS
        ) {
            addSeismicLayer(esvIntersectionControllerRef.current, {
                curtain: generatedSeismicSliceImageData.synchedOptions.trajectoryXyPoints,
                xAxisOffset: generatedSeismicSliceImageData.synchedOptions.extension,
                image: generatedSeismicSliceImageData.image,
                dataValues: generatedSeismicSliceImageData.synchedOptions.dataValues,
                yAxisValues: generatedSeismicSliceImageData.synchedOptions.yAxisValues,
            });
        }

        // Update layout
        esvIntersectionControllerRef.current.zoomPanHandler.zFactor = Math.max(1.0, zScale); // Prevent scaling to zero
        esvIntersectionControllerRef.current.adjustToSize(
            Math.max(0, wrapperDivSize.width),
            Math.max(0, wrapperDivSize.height - 100)
        );
    }

    statusWriter.setLoading(wellTrajectoriesQuery.isFetching || seismicFenceDataQuery.isFetching);
    return (
        <div ref={wrapperDivRef} className="relative w-full h-full">
            {seismicFenceDataQuery.isError && wellTrajectoriesQuery.isError ? (
                <ContentError>Error loading well trajectories and seismic fence data</ContentError>
            ) : seismicFenceDataQuery.isError ? (
                <ContentError>Error loading seismic fence data</ContentError>
            ) : wellTrajectoriesQuery.isError ? (
                <ContentError>Error loading well trajectories</ContentError>
            ) : generatedSeismicSliceImageData.status === SeismicSliceImageStatus.ERROR ? (
                <ContentError>Error generating seismic slice image</ContentError>
            ) : (
                <div ref={esvIntersectionContainerRef}></div>
            )}
        </div>
    );
};
