import React, { useId } from "react";

import { SeismicFencePolyline_api, WellBoreTrajectory_api } from "@api";
import {
    Controller,
    GridLayer,
    IntersectionReferenceSystem,
    Trajectory,
    generateSeismicSliceImage,
} from "@equinor/esv-intersection";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useGetWellTrajectories } from "@modules/_shared/WellBore/queryHooks";
import { ContentError } from "@modules/_shared/components/ContentMessage";

import { isEqual } from "lodash";

import { useSeismicFenceDataQuery } from "./queryHooks";
import { State } from "./state";
import { addMDOverlay, addSeismicLayer, addWellborePathLayer } from "./utils/esvIntersectionControllerUtils";
import {
    createSeismicSliceImageDataArrayFromFenceData,
    createSeismicSliceImageYAxisValuesArrayFromFenceData,
    makeExtendedTrajectoryFromWellboreTrajectory,
    makeReferenceSystemFromWellboreTrajectory,
} from "./utils/esvIntersectionDataConversion";

enum SeismicImageBitmapStatus {
    ERROR = "error",
    INVALID = "invalid",
    VALID = "valid",
}

type SeismicLayerData = {
    wellboreTrajectoryXyProjection: number[][]; // Array of 2D projected points [x, y]
    seismicImageDataArray: number[][]; // Array of seismic image data values
    seismicImageYAxisValues: number[]; // Array of seismic image y axis values
};

export const view = ({ moduleContext, workbenchSettings }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement | null>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const esvIntersectionContainerRef = React.useRef<HTMLDivElement | null>(null);
    const esvIntersectionControllerRef = React.useRef<Controller | null>(null);

    const gridLayerUuid = useId();
    const statusWriter = useViewStatusWriter(moduleContext);

    const seismicAddress = moduleContext.useStoreValue("seismicAddress");
    const wellboreAddress = moduleContext.useStoreValue("wellboreAddress");
    const extension = moduleContext.useStoreValue("extension");
    const zScale = moduleContext.useStoreValue("zScale");

    const seismicColorScale = workbenchSettings.useDiscreteColorScale({
        gradientType: ColorScaleGradientType.Diverging,
    });
    const seismicColors = seismicColorScale.getColorPalette().getColors();

    // State for extended wellbore trajectory
    const [extendedWellboreTrajectory, setExtendedWellboreTrajectory] = React.useState<Trajectory | null>(null);

    // Data for well trajectory layer in esv-intersection (to be in synch with seismic fence layer)
    const [renderWellboreTrajectory, setRenderWellboreTrajectory] = React.useState<WellBoreTrajectory_api | null>(null);

    // Data for seismic fence layer in esv-intersection
    const [seismicFencePolyline, setSeismicFencePolyline] = React.useState<SeismicFencePolyline_api | null>(null);
    const [seismicLayerData, setSeismicLayerData] = React.useState<SeismicLayerData | null>(null);
    const [seismicFenceImageBitmapAndStatus, setSeismicFenceImageBitmapAndStatus] = React.useState<{
        image: ImageBitmap | null;
        status: SeismicImageBitmapStatus;
    }>({ image: null, status: SeismicImageBitmapStatus.INVALID });

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
            esvIntersectionControllerRef.current.zoomPanHandler.zFactor = zScale;
        }
        return () => {
            console.debug("controller destroyed");
            esvIntersectionControllerRef.current?.destroy();
        };
    }, []);

    // Get well trajectories query
    const getWellTrajectoriesQuery = useGetWellTrajectories(wellboreAddress ? [wellboreAddress.uuid] : undefined);
    if (getWellTrajectoriesQuery.isError) {
        statusWriter.addError("Error loading well trajectories");
    }

    // Use first trajectory and create polyline for seismic fence query, and extended wellbore trajectory for generating seismic fence image
    if (getWellTrajectoriesQuery.data && getWellTrajectoriesQuery.data.length !== 0) {
        const newExtendedWellboreTrajectory = makeExtendedTrajectoryFromWellboreTrajectory(
            getWellTrajectoriesQuery.data[0],
            extension
        );

        const referenceSystem = makeReferenceSystemFromWellboreTrajectory(getWellTrajectoriesQuery.data[0]);
        if (esvIntersectionControllerRef.current) {
            esvIntersectionControllerRef.current.setReferenceSystem(referenceSystem);
        }

        if (!isEqual(newExtendedWellboreTrajectory, extendedWellboreTrajectory)) {
            setExtendedWellboreTrajectory(newExtendedWellboreTrajectory);

            const x_points = newExtendedWellboreTrajectory
                ? newExtendedWellboreTrajectory.points.map((coord) => coord[0])
                : [];
            const y_points = newExtendedWellboreTrajectory
                ? newExtendedWellboreTrajectory.points.map((coord) => coord[1])
                : [];
            setSeismicFencePolyline({ x_points, y_points });
        }

        // When new well trajectory is loaded, update the renderWellboreTrajectory and clear the seismic fence image
        if (!isEqual(getWellTrajectoriesQuery.data[0], renderWellboreTrajectory)) {
            setRenderWellboreTrajectory(getWellTrajectoriesQuery.data[0]);
            setSeismicLayerData(null);
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
        seismicFencePolyline,
        seismicAddress !== null
    );
    if (seismicFenceDataQuery.isError) {
        statusWriter.addError("Error loading seismic fence data");
    }

    // Regenerate seismic fence image when fence data changes
    // - Must be useEffect due to async generateSeismicSliceImage function
    // - seismicFenceDataQuery.data in dependency array: Assumes useQuery provides same reference as long as the query data is the
    //   same (https://github.com/TanStack/query/commit/89bec2039324282a023e4e726ea6ae2e1c45178a)
    React.useEffect(
        function generateSeismicFenceImageLayerData() {
            if (!seismicFenceDataQuery.data) return;

            // Get an array of projected [x, y] points, as 2D curtain projection from a set of trajectory 3D points and offset
            const newWellboreTrajectoryXyProjection: number[][] | null = extendedWellboreTrajectory
                ? IntersectionReferenceSystem.toDisplacement(
                      extendedWellboreTrajectory.points,
                      extendedWellboreTrajectory.offset
                  )
                : [];

            const newSeismicImageDataArray = createSeismicSliceImageDataArrayFromFenceData(seismicFenceDataQuery.data);
            const newSeismicImageYAxisValues = createSeismicSliceImageYAxisValuesArrayFromFenceData(
                seismicFenceDataQuery.data
            );

            const imageDataPoints = newSeismicImageDataArray;
            const yAxisValues = newSeismicImageYAxisValues;
            const trajectory = newWellboreTrajectoryXyProjection;

            // Note: No cache, thereby the image is regenerated when switching back and forth
            generateSeismicSliceImage(
                { datapoints: imageDataPoints, yAxisValues: yAxisValues },
                trajectory,
                seismicColors,
                {
                    isLeftToRight: true,
                }
            )
                .then((image) =>
                    setSeismicFenceImageBitmapAndStatus({
                        image: image ?? null,
                        status: SeismicImageBitmapStatus.VALID,
                    })
                )
                .catch(() =>
                    setSeismicFenceImageBitmapAndStatus({ image: null, status: SeismicImageBitmapStatus.ERROR })
                );

            // Update calculated data and wellbore trajectory
            setSeismicLayerData({
                wellboreTrajectoryXyProjection: newWellboreTrajectoryXyProjection,
                seismicImageDataArray: newSeismicImageDataArray,
                seismicImageYAxisValues: newSeismicImageYAxisValues,
            });
            setRenderWellboreTrajectory(
                getWellTrajectoriesQuery.data && getWellTrajectoriesQuery.data.length !== 0
                    ? getWellTrajectoriesQuery.data[0]
                    : null
            );
        },
        [seismicFenceDataQuery.data, extendedWellboreTrajectory, getWellTrajectoriesQuery.data]
    );

    // Update esv-intersection controller when data is ready - keep old data to prevent blank view when fetching new data
    if (esvIntersectionControllerRef.current && renderWellboreTrajectory) {
        esvIntersectionControllerRef.current.removeAllLayers();
        esvIntersectionControllerRef.current.clearAllData();

        addWellborePathLayer(esvIntersectionControllerRef.current, renderWellboreTrajectory);

        if (seismicLayerData && seismicFenceImageBitmapAndStatus.image) {
            addSeismicLayer(esvIntersectionControllerRef.current, {
                curtain: seismicLayerData.wellboreTrajectoryXyProjection,
                extension: extension,
                image: seismicFenceImageBitmapAndStatus.image,
                dataValues: seismicLayerData.seismicImageDataArray,
                yAxisValues: seismicLayerData.seismicImageYAxisValues,
            });
        }

        esvIntersectionControllerRef.current.zoomPanHandler.zFactor = zScale;
        esvIntersectionControllerRef.current.adjustToSize(
            Math.max(0, wrapperDivSize.width),
            Math.max(0, wrapperDivSize.height - 100)
        );
    }

    statusWriter.setLoading(getWellTrajectoriesQuery.isFetching || seismicFenceDataQuery.isFetching);
    return (
        <div ref={wrapperDivRef} className="relative w-full h-full">
            {seismicFenceDataQuery.isError && getWellTrajectoriesQuery.isError ? (
                <ContentError>Error loading well trajectories and seismic fence data</ContentError>
            ) : seismicFenceDataQuery.isError ? (
                <ContentError>Error loading seismic fence data</ContentError>
            ) : getWellTrajectoriesQuery.isError ? (
                <ContentError>Error loading well trajectories</ContentError>
            ) : (
                <div ref={esvIntersectionContainerRef}></div>
            )}
        </div>
    );
};
