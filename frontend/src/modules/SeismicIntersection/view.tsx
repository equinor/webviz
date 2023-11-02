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
    makeExtendedTrajectoryFromTrajectoryXyzPoints,
    makeReferenceSystemFromTrajectoryXyzPoints,
    makeTrajectoryXyzPointsFromWellboreTrajectory,
} from "./utils/esvIntersectionDataConversion";

enum SeismicImageBitmapStatus {
    ERROR = "error",
    INVALID = "invalid",
    VALID = "valid",
}

type SeismicLayerData = {
    trajectoryXyProjection: number[][]; // Array of 2D projected points [x, y]
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

    // Extended wellbore trajectory for creating intersection/fence extended on both sides of wellbore
    const [extendedWellboreTrajectory, setExtendedWellboreTrajectory] = React.useState<Trajectory | null>(null);

    // Array of 3D points [x,y,z] for well trajectory layer in esv-intersection (to be in synch with seismic fence layer)
    const [renderWellboreTrajectoryXyzPoints, setRenderWellboreTrajectoryXyzPoints] = React.useState<number[][] | null>(
        null
    );

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
        const trajectoryXyzPoints = makeTrajectoryXyzPointsFromWellboreTrajectory(getWellTrajectoriesQuery.data[0]);
        const newExtendedWellboreTrajectory = makeExtendedTrajectoryFromTrajectoryXyzPoints(
            trajectoryXyzPoints,
            extension
        );

        const referenceSystem = makeReferenceSystemFromTrajectoryXyzPoints(trajectoryXyzPoints);
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

        // When new well trajectory 3D points are loaded, update the render trajectory and clear the seismic fence image
        if (!isEqual(trajectoryXyzPoints, renderWellboreTrajectoryXyzPoints)) {
            setRenderWellboreTrajectoryXyzPoints(trajectoryXyzPoints);
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
    // - seismicFenceDataQuery.data in dependency array: Assumes useQuery provides same reference as long as the query data is the same
    //   (https://github.com/TanStack/query/commit/89bec2039324282a023e4e726ea6ae2e1c45178a)
    React.useEffect(
        function generateSeismicFenceImageLayerData() {
            if (!seismicFenceDataQuery.data) return;

            // Get an array of projected 2D points [x, y], as 2D curtain projection from a set of trajectory 3D points and offset
            const newExtendedWellboreTrajectoryXyProjection: number[][] | null = extendedWellboreTrajectory
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
            const trajectory = newExtendedWellboreTrajectoryXyProjection;

            // Note: No cache, thereby the image is regenerated when switching back and forth
            generateSeismicSliceImage(
                { datapoints: imageDataPoints, yAxisValues: yAxisValues },
                trajectory,
                seismicColors,
                {
                    isLeftToRight: true,
                }
            )
                .then((image) => {
                    if (!image) {
                        setSeismicFenceImageBitmapAndStatus({
                            image: null,
                            status: SeismicImageBitmapStatus.INVALID,
                        });
                        return;
                    }
                    setSeismicFenceImageBitmapAndStatus({
                        image: image,
                        status: SeismicImageBitmapStatus.VALID,
                    });
                })
                .catch(() =>
                    setSeismicFenceImageBitmapAndStatus({ image: null, status: SeismicImageBitmapStatus.ERROR })
                );

            // Update calculated seismic data
            setSeismicLayerData({
                trajectoryXyProjection: newExtendedWellboreTrajectoryXyProjection,
                seismicImageDataArray: newSeismicImageDataArray,
                seismicImageYAxisValues: newSeismicImageYAxisValues,
            });

            // Update wellbore trajectory
            let newRenderWellboreTrajectoryXyzPoints: number[][] | null = null;
            if (getWellTrajectoriesQuery.data && getWellTrajectoriesQuery.data.length !== 0) {
                newRenderWellboreTrajectoryXyzPoints = makeTrajectoryXyzPointsFromWellboreTrajectory(
                    getWellTrajectoriesQuery.data[0]
                );
            }
            setRenderWellboreTrajectoryXyzPoints(newRenderWellboreTrajectoryXyzPoints);
        },
        [seismicFenceDataQuery.data, extendedWellboreTrajectory, getWellTrajectoriesQuery.data]
    );

    // Update esv-intersection controller when data is ready - keep old data to prevent blank view when fetching new data
    if (esvIntersectionControllerRef.current && renderWellboreTrajectoryXyzPoints) {
        esvIntersectionControllerRef.current.removeAllLayers();
        esvIntersectionControllerRef.current.clearAllData();

        addWellborePathLayer(esvIntersectionControllerRef.current, renderWellboreTrajectoryXyzPoints);

        if (seismicLayerData && seismicFenceImageBitmapAndStatus.image) {
            addSeismicLayer(esvIntersectionControllerRef.current, {
                curtain: seismicLayerData.trajectoryXyProjection,
                extension: extension,
                image: seismicFenceImageBitmapAndStatus.image,
                dataValues: seismicLayerData.seismicImageDataArray,
                yAxisValues: seismicLayerData.seismicImageYAxisValues,
            });
        }

        // Update layout
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
