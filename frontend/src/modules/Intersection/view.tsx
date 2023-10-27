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
import {
    addMDOverlay,
    addSeismicLayer,
    addWellborePathLayerAndSetReferenceSystem,
} from "./utils/esvIntersectionControllerUtils";
import {
    createSeismicSliceImageDataArrayFromFenceData,
    createSeismicSliceImageYAxisValuesArrayFromFenceData,
    makeExtendedTrajectoryFromWellboreTrajectory,
} from "./utils/esvIntersectionDataConversion";

export const view = ({ moduleContext, workbenchSettings }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement | null>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const esvIntersectionContainerRef = React.useRef<HTMLDivElement | null>(null);
    const esvIntersectionControllerRef = React.useRef<Controller | null>(null);
    const [extendedWellboreTrajectory, setExtendedWellboreTrajectory] = React.useState<Trajectory | null>(null);

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

    // Data for well trajectory layer in esv-intersection (to be in synch with seismic fence layer)
    const [renderWellboreTrajectory, setRenderWellboreTrajectory] = React.useState<WellBoreTrajectory_api | null>(null);

    // Data for seismic fence layer in esv-intersection
    const [seismicFencePolyline, setSeismicFencePolyline] = React.useState<SeismicFencePolyline_api | null>(null);
    const [wellboreTrajectoryProjection, setWellboreTrajectoryProjection] = React.useState<number[][] | null>(null);
    const [seismicImageDataArray, setSeismicImageDataArray] = React.useState<number[][] | null>(null);
    const [seismicImageYAxisValues, setSeismicImageYAxisValues] = React.useState<number[] | null>(null);
    const [seismicFenceImageBitmapAndStatus, setSeismicFenceImageBitmapAndStatus] = React.useState<{
        image: ImageBitmap | null;
        errorStatus: boolean;
    }>({ image: null, errorStatus: false });

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
            esvIntersectionControllerRef.current.zoomPanHandler.zFactor = zScale; // viewSettings.zScale
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

        const x_points = newExtendedWellboreTrajectory
            ? newExtendedWellboreTrajectory.points.map((coord) => coord[0])
            : [];
        const y_points = newExtendedWellboreTrajectory
            ? newExtendedWellboreTrajectory.points.map((coord) => coord[1])
            : [];

        if (!isEqual(newExtendedWellboreTrajectory, extendedWellboreTrajectory)) {
            setExtendedWellboreTrajectory(newExtendedWellboreTrajectory);
            setSeismicFencePolyline({ x_points, y_points });
        }

        // When new well trajectory is loaded, update the renderWellboreTrajectory and clear the seismic fence image
        if (!isEqual(getWellTrajectoriesQuery.data[0], renderWellboreTrajectory)) {
            setRenderWellboreTrajectory(getWellTrajectoriesQuery.data[0]);
            setSeismicFenceImageBitmapAndStatus({ image: null, errorStatus: false });
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
    // - seismicFenceDataQuery.data in dependency array: Assumes provides same reference as long as the query data is the same (https://github.com/TanStack/query/commit/89bec2039324282a023e4e726ea6ae2e1c45178a)
    React.useEffect(
        function generateSeismicFenceImageLayerData() {
            if (!seismicFenceDataQuery.data) return;

            // Curtain projection on a set of points in 3D
            const newWellboreTrajectoryProjection: number[][] | null = extendedWellboreTrajectory
                ? IntersectionReferenceSystem.toDisplacement(
                      extendedWellboreTrajectory.points,
                      extendedWellboreTrajectory.offset
                  )
                : null;

            const newSeismicImageDataArray = createSeismicSliceImageDataArrayFromFenceData(seismicFenceDataQuery.data);
            const newSeismicImageYAxisValues = createSeismicSliceImageYAxisValuesArrayFromFenceData(
                seismicFenceDataQuery.data
            );

            const imageDataPoints = newSeismicImageDataArray;
            const yAxisValues = newSeismicImageYAxisValues;
            const trajectory = newWellboreTrajectoryProjection ?? [];

            // Note: useQuery has cache, this does not - thereby the image is regenerated when switching back and forth
            generateSeismicSliceImage(
                { datapoints: imageDataPoints, yAxisValues: yAxisValues },
                trajectory,
                seismicColors,
                {
                    isLeftToRight: true,
                }
            )
                .then((image) => setSeismicFenceImageBitmapAndStatus({ image: image ?? null, errorStatus: false }))
                .catch((_error) => setSeismicFenceImageBitmapAndStatus({ image: null, errorStatus: true }));

            setWellboreTrajectoryProjection(newWellboreTrajectoryProjection);
            setSeismicImageDataArray(newSeismicImageDataArray);
            setSeismicImageYAxisValues(newSeismicImageYAxisValues);
            setRenderWellboreTrajectory(
                getWellTrajectoriesQuery.data && getWellTrajectoriesQuery.data.length !== 0
                    ? getWellTrajectoriesQuery.data[0]
                    : null
            );
        },
        [seismicFenceDataQuery.data, extendedWellboreTrajectory]
    );

    if (esvIntersectionControllerRef.current && renderWellboreTrajectory) {
        esvIntersectionControllerRef.current.removeAllLayers();
        esvIntersectionControllerRef.current.clearAllData();

        addWellborePathLayerAndSetReferenceSystem(esvIntersectionControllerRef.current, renderWellboreTrajectory);

        if (
            seismicImageDataArray &&
            seismicImageYAxisValues &&
            seismicFenceImageBitmapAndStatus.image &&
            wellboreTrajectoryProjection
        ) {
            addSeismicLayer(esvIntersectionControllerRef.current, {
                curtain: wellboreTrajectoryProjection,
                extension: extension,
                image: seismicFenceImageBitmapAndStatus.image,
                dataValues: seismicImageDataArray,
                yAxisValues: seismicImageYAxisValues,
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
