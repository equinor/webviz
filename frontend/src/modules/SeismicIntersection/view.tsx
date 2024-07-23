import React from "react";

import {
    SeismicFencePolyline_api,
    SurfaceIntersectionCumulativeLengthPolyline_api,
    SurfaceIntersectionData_api,
    WellborePicksAndStratigraphicUnits_api,
} from "@api";
import { Controller, IntersectionReferenceSystem, Trajectory } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import {
    useWellborePicksAndStratigraphicUnitsQuery,
    useWellboreTrajectoriesQuery,
} from "@modules/_shared/WellBore/queryHooks";
import { ContentError } from "@modules/_shared/components/ContentMessage";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { isEqual } from "lodash";

import { Interfaces } from "./interfaces";
import { useSeismicFenceDataQuery, useSurfaceIntersectionQueries } from "./queryHooks";
import { WellborePickSelectionType } from "./typesAndEnums";
import {
    addMDOverlay,
    addSeismicLayer,
    addSurfacesLayer,
    addWellborePathLayer,
    addWellborePicksLayer,
} from "./utils/esvIntersectionControllerUtils";
import {
    createEsvSurfaceIntersectionDataArrayFromSurfaceIntersectionDataApiArray,
    createEsvWellborePicksAndStratigraphicUnits,
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

export function View({ viewContext, workbenchSettings }: ModuleViewProps<Interfaces>): React.ReactNode {
    const wrapperDivRef = React.useRef<HTMLDivElement | null>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const esvIntersectionContainerRef = React.useRef<HTMLDivElement | null>(null);
    const esvIntersectionControllerRef = React.useRef<Controller | null>(null);

    const statusWriter = useViewStatusWriter(viewContext);

    const seismicAddress = viewContext.useSettingsToViewInterfaceValue("seismicAddress");
    const surfaceAddress = viewContext.useSettingsToViewInterfaceValue("surfaceAddress");
    const wellboreAddress = viewContext.useSettingsToViewInterfaceValue("wellboreAddress");
    const wellborePickCaseUuid = viewContext.useSettingsToViewInterfaceValue("wellborePickCaseUuid");
    const wellborePickSelection = viewContext.useSettingsToViewInterfaceValue("wellborePickSelection");
    const extension = viewContext.useSettingsToViewInterfaceValue("extension");
    const zScale = viewContext.useSettingsToViewInterfaceValue("zScale");

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
        React.useState<SurfaceIntersectionCumulativeLengthPolyline_api | null>(null);

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

            // Initialize/configure controller
            addMDOverlay(esvIntersectionControllerRef.current);
            esvIntersectionControllerRef.current.setBounds([10, 1000], [0, 3000]);
            esvIntersectionControllerRef.current.setViewport(1000, 1650, 6000);
        }
        return () => {
            esvIntersectionControllerRef.current?.destroy();
        };
    }, []);

    // Get well trajectories query
    const wellTrajectoriesQuery = useWellboreTrajectoriesQuery(wellboreAddress ? [wellboreAddress.uuid] : undefined);
    usePropagateApiErrorToStatusWriter(wellTrajectoriesQuery, statusWriter);

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

    usePropagateApiErrorToStatusWriter(seismicFenceDataQuery, statusWriter);

    // Get surface intersection data from polyline
    const surfaceIntersectionDataQueries = useSurfaceIntersectionQueries(
        surfaceAddress?.caseUuid ?? null,
        surfaceAddress?.ensemble ?? null,
        surfaceAddress?.realizationNumber ?? null,
        surfaceAddress?.surfaceNames ?? null,
        surfaceAddress?.attribute ?? null,
        null, // Time string not used for surface intersection
        candidateSurfaceIntersectionCumulativeLengthPolyline,
        surfaceAddress !== null
    );
    for (const query of surfaceIntersectionDataQueries) {
        if (!query.isError) continue;

        const queryIndex = surfaceIntersectionDataQueries.indexOf(query);
        const surfaceName = surfaceAddress?.surfaceNames ? surfaceAddress?.surfaceNames[queryIndex] : "unknown";
        statusWriter.addWarning(`Error loading surface intersection data for "${surfaceName}"`);
    }

    // Get all well bore picks
    const wellborePicksAndStratigraphicUnitsQuery = useWellborePicksAndStratigraphicUnitsQuery(
        wellborePickCaseUuid ?? undefined,
        wellboreAddress ? wellboreAddress.uuid : undefined,
        wellborePickSelection !== WellborePickSelectionType.NONE
    );
    usePropagateApiErrorToStatusWriter(wellborePicksAndStratigraphicUnitsQuery, statusWriter);

    // Filter wellbore picks and stratigraphic units based on selected surface names
    const selectedWellborePicksAndStratigraphicUnits: WellborePicksAndStratigraphicUnits_api | null =
        React.useMemo(() => {
            if (
                !wellborePicksAndStratigraphicUnitsQuery.data ||
                wellborePickSelection === WellborePickSelectionType.NONE
            ) {
                return null;
            }

            if (wellborePickSelection === WellborePickSelectionType.ALL) {
                return wellborePicksAndStratigraphicUnitsQuery.data;
            }

            if (wellborePickSelection === WellborePickSelectionType.SELECTED_SURFACES) {
                const selectedSurfaceNames = surfaceAddress?.surfaceNames ?? [];
                return {
                    wellbore_picks: wellborePicksAndStratigraphicUnitsQuery.data.wellbore_picks.filter((pick) =>
                        selectedSurfaceNames.includes(pick.pickIdentifier)
                    ),
                    stratigraphic_units: wellborePicksAndStratigraphicUnitsQuery.data.stratigraphic_units,
                };
            }

            return wellborePicksAndStratigraphicUnitsQuery.data;
        }, [wellborePicksAndStratigraphicUnitsQuery.data, wellborePickSelection, surfaceAddress?.surfaceNames]);

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
            seismicAddress &&
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

        const fetchedSurfaceIntersections: SurfaceIntersectionData_api[] = [];
        for (const surfaceIntersectionDataQuery of surfaceIntersectionDataQueries) {
            if (!surfaceIntersectionDataQuery.data) continue;

            fetchedSurfaceIntersections.push(surfaceIntersectionDataQuery.data);
        }
        if (fetchedSurfaceIntersections.length !== 0) {
            const convertedSurfaceIntersectionDataList =
                createEsvSurfaceIntersectionDataArrayFromSurfaceIntersectionDataApiArray(fetchedSurfaceIntersections);
            addSurfacesLayer(esvIntersectionControllerRef.current, {
                surfaceIntersectionDataList: convertedSurfaceIntersectionDataList,
                layerName: "Surface intersection",
                surfaceColor: "red",
                surfaceWidth: 10,
            });
        }

        if (selectedWellborePicksAndStratigraphicUnits) {
            const { wellborePicks, stratigraphicUnits } = createEsvWellborePicksAndStratigraphicUnits(
                selectedWellborePicksAndStratigraphicUnits
            );
            addWellborePicksLayer(esvIntersectionControllerRef.current, wellborePicks, stratigraphicUnits);
        }

        // Update layout
        esvIntersectionControllerRef.current.zoomPanHandler.zFactor = Math.max(1.0, zScale); // Prevent scaling to zero
        esvIntersectionControllerRef.current.adjustToSize(
            Math.max(0, wrapperDivSize.width),
            Math.max(0, wrapperDivSize.height - 100)
        );
    }

    statusWriter.setLoading(
        wellTrajectoriesQuery.isFetching ||
            seismicFenceDataQuery.isFetching ||
            surfaceIntersectionDataQueries.some((query) => query.isFetching)
    );

    const hasErrorForEverySurfaceIntersectionQuery =
        surfaceIntersectionDataQueries.length > 0 && surfaceIntersectionDataQueries.every((query) => query.isError);

    return (
        <div ref={wrapperDivRef} className="relative w-full h-full">
            {seismicFenceDataQuery.isError && wellTrajectoriesQuery.isError ? (
                <ContentError>Error loading well trajectories and seismic fence data</ContentError>
            ) : seismicFenceDataQuery.isError ? (
                <ContentError>Error loading seismic fence data</ContentError>
            ) : wellTrajectoriesQuery.isError ? (
                <ContentError>Error loading well trajectories</ContentError>
            ) : hasErrorForEverySurfaceIntersectionQuery ? (
                <ContentError>Error loading surface intersection data</ContentError>
            ) : generatedSeismicSliceImageData.status === SeismicSliceImageStatus.ERROR ? (
                <ContentError>Error generating seismic slice image</ContentError>
            ) : (
                <div ref={esvIntersectionContainerRef}></div>
            )}
        </div>
    );
}
