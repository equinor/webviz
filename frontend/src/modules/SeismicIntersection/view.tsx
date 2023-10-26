import React, { useId } from "react";

import { SeismicFencePolyline_api } from "@api";
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

import { useSeismicFenceDataQuery } from "./queryHooks";
import { State } from "./state";
import {
    addMDOverlay,
    addSeismicLayer,
    addWellborePathLayerAndSetReferenceSystem,
    makeExtendedTrajectory,
} from "./utils/esvIntersectionUtils";
import { SeismicFenceData_trans } from "./utils/queryDataTransforms";

export const view = ({ moduleContext, workbenchSettings }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement | null>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const esvIntersectionContainerRef = React.useRef<HTMLDivElement | null>(null);
    const esvIntersectionControllerRef = React.useRef<Controller | null>(null);

    const [seismicFenceImageBitmap, setSeismicFenceImageBitmap] = React.useState<ImageBitmap | null>(null);

    const gridLayerUuid = useId();
    const statusWriter = useViewStatusWriter(moduleContext);

    const seismicAddress = moduleContext.useStoreValue("seismicAddress");
    const wellboreAddress = moduleContext.useStoreValue("wellboreAddress");

    const seismicColorScale = workbenchSettings.useDiscreteColorScale({
        gradientType: ColorScaleGradientType.Diverging,
    });
    const seismicColors = seismicColorScale.getColorPalette().getColors();

    // TMP HARDCODED VALUES
    const TEMP_HARDCODED_Z_SCALE = 5;
    const TEMP_HARDCODED_EXTENSION = 1000;

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
            esvIntersectionControllerRef.current.zoomPanHandler.zFactor = TEMP_HARDCODED_Z_SCALE; // viewSettings.zScale
        }
        return () => {
            console.debug("controller destroyed");
            esvIntersectionControllerRef.current?.destroy();
        };
    }, []);

    // Get well trajectories
    const getWellTrajectoriesQuery = useGetWellTrajectories(wellboreAddress ? [wellboreAddress.uuid] : undefined);
    if (getWellTrajectoriesQuery.isError) {
        statusWriter.addError("Error loading well trajectories");
    }

    let extendedTrajectory: Trajectory | null = null;
    let seismicFencePolyline: SeismicFencePolyline_api | null = null;
    if (getWellTrajectoriesQuery.data && getWellTrajectoriesQuery.data.length !== 0) {
        extendedTrajectory = makeExtendedTrajectory(getWellTrajectoriesQuery.data[0], TEMP_HARDCODED_EXTENSION);

        const x_points = extendedTrajectory ? extendedTrajectory.points.map((coord) => coord[0]) : [];
        const y_points = extendedTrajectory ? extendedTrajectory.points.map((coord) => coord[1]) : [];

        seismicFencePolyline = { x_points, y_points };
    }

    // Curtain projection on a set of points in 3D
    const curtain: number[][] | null = extendedTrajectory
        ? IntersectionReferenceSystem.toDisplacement(extendedTrajectory.points, extendedTrajectory.offset)
        : null;

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

    // Create seismic image using fence data
    const seismicImageDataArray: number[][] | null = seismicFenceDataQuery.data
        ? createSeismicSliceImageDataArrayFromFenceData(seismicFenceDataQuery.data)
        : null;
    const seismicImageYAxisValues: number[] | null = seismicFenceDataQuery.data
        ? createSeismicSliceImageYAxisValuesArrayFromFenceData(seismicFenceDataQuery.data)
        : null;

    React.useEffect(
        function generateSeismicFenceImageBitmap() {
            const imageDataPoints = seismicImageDataArray ?? [];
            const yAxisValues = seismicImageYAxisValues ?? [];
            const trajectory = curtain ?? [];
            generateSeismicSliceImage(
                { datapoints: imageDataPoints, yAxisValues: yAxisValues },
                trajectory,
                seismicColors,
                {
                    isLeftToRight: true,
                }
            ).then((image) => setSeismicFenceImageBitmap(image ?? null));
        },
        [seismicImageDataArray, seismicImageYAxisValues, curtain, seismicColors]
    );

    if (
        esvIntersectionControllerRef.current &&
        getWellTrajectoriesQuery.data &&
        getWellTrajectoriesQuery.data.length !== 0
    ) {
        esvIntersectionControllerRef.current.removeAllLayers();
        esvIntersectionControllerRef.current.clearAllData();

        addWellborePathLayerAndSetReferenceSystem(
            esvIntersectionControllerRef.current,
            getWellTrajectoriesQuery.data[0]
        );

        if (seismicImageDataArray && seismicImageYAxisValues && seismicFenceImageBitmap && curtain) {
            addSeismicLayer(esvIntersectionControllerRef.current, {
                curtain: curtain,
                extension: TEMP_HARDCODED_EXTENSION,
                image: seismicFenceImageBitmap,
                dataValues: seismicImageDataArray,
                yAxisValues: seismicImageYAxisValues,
            });
        }

        esvIntersectionControllerRef.current.zoomPanHandler.zFactor = TEMP_HARDCODED_Z_SCALE;
        esvIntersectionControllerRef.current.adjustToSize(
            Math.max(0, wrapperDivSize.width),
            Math.max(0, wrapperDivSize.height - 100)
        );
    }

    statusWriter.setLoading(getWellTrajectoriesQuery.isFetching || seismicFenceDataQuery.isFetching);
    return (
        <div ref={wrapperDivRef} className="relative w-full h-full">
            {
                // seismicFenceDataQuery.isError && getWellTrajectoriesQuery.isError ? (
                //     <ContentError>Error loading well trajectories and seismic fence data</ContentError>
                // ) : seismicFenceDataQuery.isError ? (
                //     <ContentError>Error loading seismic fence data</ContentError>
                // ) :
                getWellTrajectoriesQuery.isError ? (
                    <ContentError>Error loading well trajectories</ContentError>
                ) : (
                    <div ref={esvIntersectionContainerRef}></div>
                )
            }
        </div>
    );
};

/**
 * Utility function to convert the 1D array of values from the fence data to a 2D array of values
 * for the seismic slice image.
 *
 * For the bit map image, the values are provided s.t. a seismic trace is a column in the image,
 * thus the data will be transposed.
 *
 * trace a,b,c and d
 *
 * num_traces = 4
 * num_samples = 3
 * fence_traces = [a1, a2, a3, b1, b2, b3, c1, c2, c3, d1, d2, d3]
 *
 * Image:
 *
 * a1 b1 c1 d1
 * a2 b2 c2 d2
 * a3 b3 c3 d3
 */
function createSeismicSliceImageDataArrayFromFenceData(fenceData: SeismicFenceData_trans): number[][] {
    const imageArray: number[][] = [];

    const numTraces = fenceData.num_traces;
    const numSamples = fenceData.num_trace_samples;
    const fenceValues = fenceData.fenceTracesFloat32Arr;

    for (let i = 0; i < numSamples; ++i) {
        const row: number[] = [];
        for (let j = 0; j < numTraces; ++j) {
            const index = i + j * numSamples;
            row.push(fenceValues[index]);
        }
        imageArray.push(row);
    }
    return imageArray;
}

/**
 * Utility to create an array of values for the Y axis of the seismic slice image. I.e. depth values
 * for the seismic depth axis.
 */
function createSeismicSliceImageYAxisValuesArrayFromFenceData(fenceData: SeismicFenceData_trans): number[] {
    const yAxisValues: number[] = [];

    const numSamples = fenceData.num_trace_samples;
    const minDepth = fenceData.min_fence_depth;
    const maxDepth = fenceData.max_fence_depth;

    for (let i = 0; i < numSamples; ++i) {
        yAxisValues.push(minDepth + ((maxDepth - minDepth) / numSamples) * i);
    }
    return yAxisValues;
}
