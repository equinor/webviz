import React from "react";

import { IntersectionReferenceSystem, SurfaceLine, Trajectory } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import {
    EsvIntersection,
    EsvIntersectionReadoutEvent,
    LayerItem,
    LayerType,
    Viewport,
} from "@framework/components/EsvIntersection";
import { SurfaceStatisticalFanchart } from "@framework/components/EsvIntersection/layers/SurfaceStatisticalFanchartCanvasLayer";
import { ReadoutItem } from "@framework/components/EsvIntersection/types";
import { ReadoutBox } from "@framework/components/EsvIntersection/utilityComponents/ReadoutBox";
import { Toolbar } from "@framework/components/EsvIntersection/utilityComponents/Toolbar";
import { makeSurfaceStatisticalFanchartFromRealizationSurface } from "@framework/components/EsvIntersection/utils/surfaceStatisticalFancharts";
import {
    makeExtendedTrajectoryFromTrajectoryXyzPoints,
    makeTrajectoryXyzPointsFromWellboreTrajectory,
} from "@modules/SeismicIntersection/utils/esvIntersectionDataConversion";
import { useWellboreTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { ContentError } from "@modules/_shared/components/ContentMessage";

import { isEqual } from "lodash";

import { useSampleSurfaceInPointsQueries } from "./queryHooks";
import { State } from "./state";
import { StatisticOption, VisualizationMode } from "./types";

export const View = ({ viewContext }: ModuleViewProps<State>) => {
    const statusWriter = useViewStatusWriter(viewContext);

    const surfaceSetAddress = viewContext.useStoreValue("SurfaceSetAddress");
    const visualizationMode = viewContext.useStoreValue("visualizationMode");
    const statisticFunctions = viewContext.useStoreValue("statisticFunctions");
    const wellboreAddress = viewContext.useStoreValue("wellboreAddress");
    const intersectionSettings = viewContext.useStoreValue("intersectionSettings");
    const stratigraphyColorMap = viewContext.useStoreValue("stratigraphyColorMap");

    const [readoutItems, setReadoutItems] = React.useState<ReadoutItem[]>([]);
    const [verticalScale, setVerticalScale] = React.useState<number>(1);
    const [viewport, setViewport] = React.useState<Viewport>([1000, 1650, 6000]);
    const [referenceSystem, setReferenceSystem] = React.useState<IntersectionReferenceSystem | null>(null);

    // Extended wellbore trajectory for creating intersection/fence extended on both sides of wellbore
    const [extendedWellboreTrajectory, setExtendedWellboreTrajectory] = React.useState<Trajectory | null>(null);

    const [renderWellboreTrajectoryXyzPoints, setRenderWellboreTrajectoryXyzPoints] = React.useState<number[][] | null>(
        null
    );

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
            if (renderWellboreTrajectoryXyzPoints) {
                setReferenceSystem(new IntersectionReferenceSystem(trajectoryXyzPoints));
            }
        }
    }

    const xPoints = extendedWellboreTrajectory?.points.map((coord) => coord[0]) ?? [];
    const yPoints = extendedWellboreTrajectory?.points.map((coord) => coord[1]) ?? [];

    const cumLength = extendedWellboreTrajectory
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
        xPoints,
        yPoints,
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

    const handleReadoutItemsChange = React.useCallback(function handleReadoutItemsChange(
        event: EsvIntersectionReadoutEvent
    ): void {
        setReadoutItems(event.readoutItems);
    },
    []);

    const handleVerticalScaleIncrease = React.useCallback(function handleVerticalScaleIncrease(): void {
        setVerticalScale((prev) => {
            const newVerticalScale = prev + 0.1;
            return newVerticalScale;
        });
    }, []);

    const handleVerticalScaleDecrease = React.useCallback(function handleVerticalScaleIncrease(): void {
        setVerticalScale((prev) => {
            const newVerticalScale = Math.max(0.1, prev - 0.1);
            return newVerticalScale;
        });
    }, []);

    const handleFitInViewClick = React.useCallback(function handleFitInViewClick(): void {
        setViewport([1000, 1650, 6000]);
    }, []);

    const handleViewportChange = React.useCallback(function handleViewportChange(newViewport: Viewport): void {
        setViewport(newViewport);
    }, []);

    const layers: LayerItem[] = [];
    if (cumLength && sampleSurfaceInPointsQueries.data) {
        if (
            visualizationMode === VisualizationMode.STATISTICAL_LINES ||
            visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
        ) {
            const surfaces = sampleSurfaceInPointsQueries.data;
            const fancharts: SurfaceStatisticalFanchart[] = [];
            const surfaceLines: SurfaceLine[] = [];
            for (const surface of surfaces) {
                const fanchart = makeSurfaceStatisticalFanchartFromRealizationSurface(
                    surface.realizationPoints.map((el) => el.sampled_values),
                    cumLength,
                    surface.surfaceName,
                    stratigraphyColorMap,
                    {
                        mean: statisticFunctions.includes(StatisticOption.MEAN),
                        minMax: statisticFunctions.includes(StatisticOption.MIN_MAX),
                        p10p90: statisticFunctions.includes(StatisticOption.P10_P90),
                        p50: statisticFunctions.includes(StatisticOption.P50),
                    }
                );
                fancharts.push(fanchart);

                const surfaceLine: SurfaceLine = {
                    id: surface.surfaceName,
                    label: surface.surfaceName,
                    color: stratigraphyColorMap[surface.surfaceName] || "black",
                    data: fanchart.data.mean,
                };

                surfaceLines.push(surfaceLine);
            }

            layers.push({
                type: LayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS,
                id: "surface-fancharts",
                options: {
                    data: {
                        fancharts,
                    },
                    order: 3,
                },
                hoverable: true,
            });
            layers.push({
                type: LayerType.GEOMODEL_LABELS,
                id: "surface-labels",
                options: {
                    data: {
                        lines: surfaceLines,
                        areas: [],
                    },
                    maxFontSize: 16,
                    minFontSize: 10,
                    order: 4,
                },
            });
        }
        if (
            visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
            visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
        ) {
            const surfaceValues: { surfaceName: string; name: string; realization: number; values: number[] }[] = [];
            const surfaces = sampleSurfaceInPointsQueries.data;
            for (const surface of surfaces) {
                for (const realization of surface.realizationPoints) {
                    surfaceValues.push({
                        surfaceName: surface.surfaceName,
                        name: `${surface.surfaceName}, real ${realization.realization}`,
                        realization: realization.realization,
                        values: realization.sampled_values,
                    });
                }
            }

            const surfaceLines: SurfaceLine[] = [];
            const labelSurfaceLines: SurfaceLine[] = [];
            for (const realizationValues of surfaceValues) {
                const surfaceLine: SurfaceLine = {
                    id: realizationValues.name + realizationValues.realization,
                    label: realizationValues.name,
                    color: stratigraphyColorMap[realizationValues.surfaceName] || "black",
                    data: realizationValues.values.map((z: number, idx) => {
                        return [cumLength[idx], z];
                    }),
                };
                surfaceLines.push(surfaceLine);

                if (realizationValues.realization === 0) {
                    labelSurfaceLines.push({
                        ...surfaceLine,
                        label: realizationValues.surfaceName,
                    });
                }
            }

            layers.push({
                type: LayerType.GEOMODEL_V2,
                id: "surface-realizations",
                options: {
                    data: {
                        lines: surfaceLines,
                        areas: [],
                    },
                    order: 3,
                },
                hoverable: true,
            });

            layers.push({
                type: LayerType.GEOMODEL_LABELS,
                id: "surface-labels",
                options: {
                    data: {
                        lines: labelSurfaceLines,
                        areas: [],
                    },
                    maxFontSize: 16,
                    minFontSize: 10,
                    order: 4,
                },
            });
        }
    }

    if (renderWellboreTrajectoryXyzPoints) {
        layers.push({
            type: LayerType.WELLBORE_PATH,
            id: "wellbore-trajectory",
            options: {
                stroke: "red",
                strokeWidth: "2",
                order: 6,
            },
            hoverable: true,
        });
    }

    return (
        <div className="w-full h-full relative">
            {errorString !== "" ? (
                <ContentError>{errorString}</ContentError>
            ) : (
                <>
                    <EsvIntersection
                        showGrid
                        layers={layers}
                        zFactor={verticalScale}
                        bounds={{ x: [10, 1000], y: [0, 3000] }}
                        viewport={viewport}
                        onReadout={handleReadoutItemsChange}
                        onViewportChange={handleViewportChange}
                        axesOptions={{
                            xLabel: "Distance",
                            yLabel: "TVD",
                            unitOfMeasure: "m",
                        }}
                        intersectionReferenceSystem={referenceSystem ?? undefined}
                    />
                    <ReadoutBox readoutItems={readoutItems} />
                    <Toolbar
                        visible
                        zFactor={verticalScale}
                        gridVisible={false}
                        onGridLinesToggle={() => {}}
                        onFitInView={handleFitInViewClick}
                        onVerticalScaleIncrease={handleVerticalScaleIncrease}
                        onVerticalScaleDecrease={handleVerticalScaleDecrease}
                    />
                </>
            )}
        </div>
    );
};
