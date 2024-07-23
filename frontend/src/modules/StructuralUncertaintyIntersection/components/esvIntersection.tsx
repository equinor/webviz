import React from "react";

import { StatisticFunction_api, SurfaceRealizationSampleValues_api } from "@api";
import {
    Controller,
    GeomodelCanvasLayer,
    GeomodelLayerV2,
    GridLayer,
    PixiRenderApplication,
    ReferenceLine,
    ReferenceLineLayer,
    SurfaceData,
    WellborepathLayer,
} from "@equinor/esv-intersection";
import { addMDOverlay } from "@modules/SeismicIntersection/utils/esvIntersectionControllerUtils";
import { makeReferenceSystemFromTrajectoryXyzPoints } from "@modules/SeismicIntersection/utils/esvIntersectionDataConversion";

import { isEqual } from "lodash";

import { SurfaceRealizationSampleValuesData } from "../queryHooks";
import { StratigraphyColorMap, VisualizationMode } from "../typesAndEnums";

type EsvIntersectionProps = {
    width: number;
    height: number;
    zScale: number;
    extension: number;
    wellborePath: number[][] | null;
    cumLength: number[] | null;
    surfaceRealizationSampleValuesData?: SurfaceRealizationSampleValuesData[] | null;
    visualizationMode: VisualizationMode;
    statisticFunctions: StatisticFunction_api[];
    stratigraphyColorMap: StratigraphyColorMap;
};

export const EsvIntersection: React.FC<EsvIntersectionProps> = (props) => {
    const containerDiv = React.useRef<HTMLDivElement | null>(null);
    const controller = React.useRef<Controller | null>(null);
    const pixiContent = React.useRef<PixiRenderApplication | null>(null);
    const [previousWellborePath, setPreviousWellborePath] = React.useState<number[][] | null>(null);
    const width = props.width;
    const height = props.height;
    const seaAndRKBLayerData: ReferenceLine[] = [
        { text: "RKB", lineType: "dashed", color: "black", depth: 0 },
        { text: "MSL", lineType: "wavy", color: "blue", depth: 30 },
        { text: "Seabed", lineType: "solid", color: "slategray", depth: 91.1, lineWidth: 2 },
    ];
    const seaAndRKBLayer = new ReferenceLineLayer("sea-and-rkb-layer", { data: seaAndRKBLayerData });

    React.useEffect(function initializeEsvIntersectionController() {
        if (containerDiv.current) {
            const axisOptions = { xLabel: "x", yLabel: "y", unitOfMeasure: "m" };
            controller.current = new Controller({
                container: containerDiv.current,
                axisOptions,
            });
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            pixiContent.current = new PixiRenderApplication({ width: width, height: height });

            // Initialize/configure controller
            addMDOverlay(controller.current);
            controller.current.addLayer(new GridLayer("gridLayer"));
            controller.current.addLayer(new WellborepathLayer("wellBorePathLayer"));
            controller.current.addLayer(
                new GeomodelCanvasLayer("statisticalSurfaceLayer", { order: 3, layerOpacity: 0.6 })
            );
            controller.current.addLayer(
                new GeomodelLayerV2(pixiContent.current, "realizationsSurfaceLayer", { order: 4, layerOpacity: 0.6 })
            );
            controller.current.addLayer(seaAndRKBLayer);
            controller.current.setBounds([10, 1000], [0, 3000]);
            controller.current.setViewport(1000, 1650, 6000);
            controller.current.zoomPanHandler.zFactor = props.zScale;
        }
        return () => {
            controller.current?.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    if (!isEqual(previousWellborePath, props.wellborePath)) {
        setPreviousWellborePath(props.wellborePath);
    }
    if (controller.current && props.wellborePath && props.cumLength) {
        controller.current.adjustToSize(Math.max(0, width), Math.max(0, height));
        const referenceSystem = makeReferenceSystemFromTrajectoryXyzPoints(props.wellborePath);
        controller.current.setReferenceSystem(referenceSystem);

        controller.current?.getLayer("statisticalSurfaceLayer")?.clearData();
        controller.current?.getLayer("realizationsSurfaceLayer")?.clearData();
        if (props.surfaceRealizationSampleValuesData) {
            if (
                props.visualizationMode === VisualizationMode.STATISTICAL_LINES ||
                props.visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
            ) {
                const statData = surfaceSamplePointsToStatisticalLayerData(
                    props.surfaceRealizationSampleValuesData,
                    props.cumLength,
                    props.statisticFunctions,
                    props.stratigraphyColorMap
                );
                controller.current.getLayer("statisticalSurfaceLayer")?.setData(statData);
            }
            if (
                props.visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
                props.visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
            ) {
                const realizationData = surfaceSamplePointsToRealizationLayerData(
                    props.surfaceRealizationSampleValuesData,
                    props.cumLength,
                    props.stratigraphyColorMap
                );
                controller.current.getLayer("realizationsSurfaceLayer")?.setData(realizationData);
            }
        }
    }

    return <div ref={containerDiv} className="w-full h-full" />;
};

function surfaceSamplePointsToRealizationLayerData(
    samplePoints: SurfaceRealizationSampleValuesData[],
    cumLength: number[],
    stratigraphyColorMap: StratigraphyColorMap
): SurfaceData {
    const surfaceValues: { name: string; realization: number; values: number[]; showLabel: boolean }[] = [];
    samplePoints.forEach((surfaceSet) => {
        surfaceSet.realizationPoints.forEach((realSamplePoints: SurfaceRealizationSampleValues_api, rdx: number) => {
            surfaceValues.push({
                name: surfaceSet.surfaceName,
                showLabel: rdx === 0,
                realization: realSamplePoints.realization,
                values: realSamplePoints.sampled_values,
            });
        });
    });
    const geolayerdata: SurfaceData = {
        areas: [],
        lines: surfaceValues.map((realizationValues) => {
            return {
                data: realizationValues.values.map((z: number, idx) => {
                    return [cumLength[idx], z];
                }),
                color: stratigraphyColorMap[realizationValues.name] || "black",
                id: realizationValues.name + realizationValues.realization,
                label: realizationValues.showLabel ? realizationValues.name : "",
                textColor: "black",
                width: 1,
            };
        }),
    };
    return geolayerdata;
}

function surfaceSamplePointsToStatisticalLayerData(
    samplePoints: SurfaceRealizationSampleValuesData[],
    cumLength: number[],
    statisticFunctions: StatisticFunction_api[],
    stratigraphyColorMap: StratigraphyColorMap
): SurfaceData {
    const statisticLines: { name: string; statistic: string; values: number[]; color: string }[] = [];

    samplePoints.forEach((surfaceSet) => {
        const allValues: number[][] = surfaceSet.realizationPoints.map((p) => p.sampled_values);
        const numPoints = allValues[0]?.length || 0;
        const statistics: any = {
            MEAN: new Array(numPoints).fill(0),
            MIN: new Array(numPoints).fill(Infinity),
            MAX: new Array(numPoints).fill(-Infinity),
            P10: new Array(numPoints).fill(0),
            P50: new Array(numPoints).fill(0),
            P90: new Array(numPoints).fill(0),
        };

        for (let i = 0; i < numPoints; i++) {
            const valuesAtPosition = allValues.map((values) => values[i]);
            if (valuesAtPosition.some((value) => value === null)) {
                statistics.MEAN[i] = null;
                statistics.MIN[i] = null;
                statistics.MAX[i] = null;
                statistics.P10[i] = null;
                statistics.P50[i] = null;
                statistics.P90[i] = null;
                continue;
            }
            statistics.MEAN[i] = mean(valuesAtPosition);
            statistics.MIN[i] = Math.min(...valuesAtPosition);
            statistics.MAX[i] = Math.max(...valuesAtPosition);
            statistics.P10[i] = percentile(valuesAtPosition, 10);
            statistics.P50[i] = percentile(valuesAtPosition, 50);
            statistics.P90[i] = percentile(valuesAtPosition, 90);
        }

        Object.keys(statistics).forEach((stat) => {
            if (!statisticFunctions.includes(stat as StatisticFunction_api)) {
                return;
            }
            statisticLines.push({
                name: surfaceSet.surfaceName,
                statistic: stat,
                values: statistics[stat],
                color: stratigraphyColorMap[surfaceSet.surfaceName] || "black",
            });
        });
    });

    const geolayerdata: SurfaceData = {
        areas: [],
        lines: statisticLines.map((line) => ({
            data: line.values.map((value, idx) => [cumLength[idx], value]),
            color: line.color,
            id: line.name + line.statistic,
            label: line.statistic,
            width: 1,
        })),
    };

    return geolayerdata;

    function mean(values: number[]): number {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    function percentile(values: number[], p: number): number {
        values.sort((a, b) => a - b);
        const position = ((values.length - 1) * p) / 100;
        const base = Math.floor(position);
        const rest = position - base;
        if (values[base + 1] !== undefined) {
            return values[base] + rest * (values[base + 1] - values[base]);
        } else {
            return values[base];
        }
    }
}
