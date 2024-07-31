import React from "react";

import { WellboreCasing_api } from "@api";
import {
    Casing,
    IntersectionReferenceSystem,
    ReferenceLine,
    SurfaceData,
    SurfaceLine,
    getPicksData,
    getSeismicOptions,
} from "@equinor/esv-intersection";
import { ViewContext } from "@framework/ModuleContext";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import { LayerItem, LayerType } from "@framework/components/EsvIntersection";
import { Viewport } from "@framework/components/EsvIntersection/esvIntersection";
import { SurfaceStatisticalFanchart } from "@framework/components/EsvIntersection/layers/SurfaceStatisticalFanchartCanvasLayer";
import { makeSurfaceStatisticalFanchartFromRealizationSurface } from "@framework/components/EsvIntersection/utils/surfaceStatisticalFancharts";
import { IntersectionType } from "@framework/types/intersection";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { Interfaces } from "@modules/Intersection/interfaces";
import { BaseLayer, LayerStatus, useLayers } from "@modules/Intersection/utils/layers/BaseLayer";
import { GridLayer, isGridLayer } from "@modules/Intersection/utils/layers/GridLayer";
import { SeismicLayer, isSeismicLayer } from "@modules/Intersection/utils/layers/SeismicLayer";
import { isSurfaceLayer } from "@modules/Intersection/utils/layers/SurfaceLayer";
import { isSurfacesUncertaintyLayer } from "@modules/Intersection/utils/layers/SurfacesUncertaintyLayer";
import { isWellpicksLayer } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { ColorLegendsContainer } from "@modules_shared/components/ColorLegendsContainer";

import { isEqual } from "lodash";

import { ViewportWrapper } from "./viewportWrapper";

import { ColorScaleWithName } from "../../../_shared/utils/ColorScaleWithName";

export type LayersWrapperProps = {
    referenceSystem: IntersectionReferenceSystem | null;
    layers: BaseLayer<any, any>[];
    wellboreCasingData: WellboreCasing_api[] | null;
    intersectionExtensionLength: number;
    intersectionType: IntersectionType;
    workbenchServices: WorkbenchServices;
    viewContext: ViewContext<Interfaces>;
    wellboreHeaderUuid: string | null;
    wellboreHeaderDepthReferencePoint: string | null;
    wellboreHeaderDepthReferenceElevation: number | null;
};

export function LayersWrapper(props: LayersWrapperProps): React.ReactNode {
    const layers = useLayers(props.layers);

    const divRef = React.useRef<HTMLDivElement>(null);
    const divSize = useElementBoundingRect(divRef);

    const [prevReferenceSystem, setPrevReferenceSystem] = React.useState<IntersectionReferenceSystem | null>(null);
    const [viewport, setViewport] = React.useState<Viewport>([0, 0, 2000]);
    const [prevLayersViewport, setPrevLayersViewport] = React.useState<Viewport | null>(null);
    const [prevBounds, setPrevBounds] = React.useState<{ x: [number, number]; y: [number, number] } | null>(null);
    const [isInitialLayerViewportSet, setIsInitialLayerViewportSet] = React.useState<boolean>(false);

    if (props.referenceSystem && !isEqual(prevReferenceSystem, props.referenceSystem)) {
        setIsInitialLayerViewportSet(false);
        setPrevReferenceSystem(props.referenceSystem);
        setPrevLayersViewport(null);
    }

    const esvLayers: LayerItem[] = [];
    const esvLayerIdToNameMap: Record<string, string> = {};
    const colorScales: { id: string; colorScale: ColorScaleWithName }[] = [];

    if (props.intersectionType === IntersectionType.WELLBORE && props.referenceSystem) {
        esvLayers.push({
            id: "wellbore-path",
            type: LayerType.WELLBORE_PATH,
            hoverable: true,
            options: {
                stroke: "red",
                strokeWidth: "2",
                order: 6 + layers.length,
                data: props.referenceSystem.projectedPath as [number, number][],
            },
        });
    }

    const referenceLines: ReferenceLine[] = [
        {
            depth: 0,
            text: "MSL",
            color: "blue",
            lineType: "wavy",
            textColor: "blue",
        },
    ];

    if (props.wellboreHeaderDepthReferencePoint && props.wellboreHeaderDepthReferenceElevation) {
        referenceLines.push({
            depth: -props.wellboreHeaderDepthReferenceElevation,
            text: props.wellboreHeaderDepthReferencePoint,
            color: "black",
            lineType: "dashed",
            textColor: "black",
        });
    }

    esvLayers.push({
        id: "reference-line",
        type: LayerType.REFERENCE_LINE,
        hoverable: false,
        options: {
            data: referenceLines,
        },
    });

    if (props.wellboreCasingData && props.referenceSystem) {
        const casingData = props.wellboreCasingData.filter((casing) => casing.itemType === "Casing");

        const casings: Casing[] = casingData.map((casing, index) => ({
            id: `casing-${index}`,
            diameter: casing.diameterNumeric,
            start: casing.depthTopMd,
            end: casing.depthBottomMd,
            innerDiameter: casing.diameterInner,
            kind: "casing",
            hasShoe: false,
        }));

        if (props.intersectionType === IntersectionType.WELLBORE) {
            esvLayers.push({
                id: "schematic",
                type: LayerType.SCHEMATIC,
                hoverable: true,
                options: {
                    data: {
                        holeSizes: [],
                        casings,
                        cements: [],
                        completion: [],
                        pAndA: [],
                        symbols: {},
                        perforations: [],
                    },
                    order: 5 + layers.length,
                    referenceSystem: props.referenceSystem,
                },
            });
        }
    }

    const bounds: { x: [number, number]; y: [number, number] } = {
        x: [Number.MAX_VALUE, Number.MIN_VALUE],
        y: [Number.MAX_VALUE, Number.MIN_VALUE],
    };
    let boundsSetByLayer: boolean = false;

    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        const order = layers.length - i;

        if (!layer.getIsVisible() || layer.getStatus() !== LayerStatus.SUCCESS) {
            continue;
        }

        const boundingBox = layer.getBoundingBox();
        if (boundingBox) {
            bounds.x = [Math.min(bounds.x[0], boundingBox.x[0]), Math.max(bounds.x[1], boundingBox.x[1])];
            bounds.y = [Math.min(bounds.y[0], boundingBox.y[0]), Math.max(bounds.y[1], boundingBox.y[1])];
            boundsSetByLayer = true;
        }

        esvLayerIdToNameMap[layer.getId()] = layer.getName();

        if (isGridLayer(layer)) {
            const gridLayer = layer as GridLayer;
            const data = gridLayer.getData();

            if (!data) {
                continue;
            }

            const colorScale = gridLayer.getColorScale().clone();

            if (!gridLayer.getUseCustomColorScaleBoundaries()) {
                colorScale.setRangeAndMidPoint(
                    data.min_grid_prop_value,
                    data.max_grid_prop_value,
                    data.min_grid_prop_value + (data.max_grid_prop_value - data.min_grid_prop_value) / 2
                );
            }

            esvLayers.push({
                id: layer.getId(),
                type: LayerType.POLYLINE_INTERSECTION,
                hoverable: true,
                options: {
                    data: {
                        fenceMeshSections: data.fenceMeshSections.map((section) => ({
                            verticesUzArr: section.verticesUzFloat32Arr,
                            verticesPerPolyArr: section.verticesPerPolyUintArr,
                            polySourceCellIndicesArr: section.polySourceCellIndicesUint32Arr,
                            polyPropsArr: section.polyPropsFloat32Arr,
                            polyIndicesArr: section.polyIndicesUintArr,
                            sectionLength: section.sectionLength,
                            minZ: section.minZ,
                            maxZ: section.maxZ,
                        })),
                        minGridPropValue: data.min_grid_prop_value,
                        maxGridPropValue: data.max_grid_prop_value,
                        colorScale: colorScale,
                        hideGridlines: !gridLayer.getSettings().showMesh,
                        extensionLengthStart: props.intersectionExtensionLength,
                        gridDimensions: {
                            cellCountI: data.grid_dimensions.i_count,
                            cellCountJ: data.grid_dimensions.j_count,
                            cellCountK: data.grid_dimensions.k_count,
                        },
                        propertyName: layer.getSettings().parameterName ?? "",
                        propertyUnit: "",
                    },
                    order,
                },
            });

            colorScales.push({ id: `${layer.getId()}-${colorScale.getColorPalette().getId()}`, colorScale });
        }

        if (isSeismicLayer(layer)) {
            const seismicLayer = layer as SeismicLayer;
            const data = seismicLayer.getData();

            if (!data || !data.image || !data.options) {
                continue;
            }

            const seismicInfo = data.seismicInfo;

            const colorScale = seismicLayer.getColorScale();

            if (!seismicInfo) {
                continue;
            }

            if (!seismicLayer.getUseCustomColorScaleBoundaries()) {
                colorScale.setRangeAndMidPoint(seismicInfo.domain.min, seismicInfo.domain.max, 0);
            }
            colorScales.push({ id: `${layer.getId()}-${colorScale.getColorPalette().getId()}`, colorScale });

            esvLayers.push({
                id: layer.getId(),
                type: LayerType.SEISMIC,
                options: {
                    data: {
                        image: data.image,
                        options: getSeismicOptions(seismicInfo),
                        propertyName: layer.getSettings().attribute ?? "",
                        propertyUnit: "",
                        minFenceX: seismicInfo.minX,
                        maxFenceX: seismicInfo.maxX,
                        minFenceDepth: seismicInfo.minTvdMsl,
                        maxFenceDepth: seismicInfo.maxTvdMsl,
                        numSamplesPerTrace: data.seismicFenceData.num_samples_per_trace,
                        numTraces: data.seismicFenceData.num_traces,
                        fenceTracesFloat32Array: data.seismicFenceData.fenceTracesFloat32Arr,
                    },
                    order,
                    layerOpacity: 1,
                },
                hoverable: true,
            });
        }

        if (isSurfaceLayer(layer)) {
            const surfaceLayer = layer;
            const data = surfaceLayer.getData();

            if (!data) {
                continue;
            }

            const colorSet = surfaceLayer.getColorSet();

            let currentColor = colorSet.getFirstColor();
            const surfaceData: SurfaceData = {
                areas: [],
                lines: data.map((surface) => {
                    const color = currentColor;
                    currentColor = colorSet.getNextColor();
                    return {
                        data: surface.cum_lengths.map((el, index) => [el, surface.z_points[index]]),
                        color: color,
                        id: surface.name,
                        label: surface.name,
                    };
                }),
            };

            esvLayers.push({
                id: `${layer.getId()}-surfaces`,
                type: LayerType.GEOMODEL_CANVAS,
                hoverable: true,
                options: {
                    data: surfaceData,
                    order,
                    referenceSystem: props.referenceSystem ?? undefined,
                },
            });

            esvLayers.push({
                id: `${layer.getId()}-surfaces-labels`,
                type: LayerType.GEOMODEL_LABELS,
                options: {
                    data: surfaceData,
                    order,
                    referenceSystem: props.referenceSystem ?? undefined,
                },
            });
        }

        if (isSurfacesUncertaintyLayer(layer)) {
            const surfaceLayer = layer;
            const data = surfaceLayer.getData();

            if (!data) {
                continue;
            }

            const colorSet = surfaceLayer.getColorSet();

            let currentColor = colorSet.getFirstColor();
            const labelData: SurfaceLine[] = [];
            const fancharts: SurfaceStatisticalFanchart[] = [];

            for (const surface of data) {
                const fanchart = makeSurfaceStatisticalFanchartFromRealizationSurface(
                    surface.sampledValues,
                    surface.cumulatedLengths,
                    surface.surfaceName,
                    currentColor
                );
                labelData.push({
                    data: fanchart.data.mean,
                    color: currentColor,
                    label: surface.surfaceName,
                });
                currentColor = colorSet.getNextColor();
                fancharts.push(fanchart);
            }

            esvLayers.push({
                id: `${layer.getId()}-surfaces-uncertainty`,
                type: LayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS,
                hoverable: true,
                options: {
                    data: {
                        fancharts,
                    },
                    order,
                    referenceSystem: props.referenceSystem ?? undefined,
                },
            });

            esvLayers.push({
                id: `${layer.getId()}-surfaces-uncertainty-labels`,
                type: LayerType.GEOMODEL_LABELS,
                options: {
                    data: {
                        areas: [],
                        lines: labelData,
                    },
                    referenceSystem: props.referenceSystem ?? undefined,
                },
            });
        }

        if (isWellpicksLayer(layer)) {
            const wellpicksLayer = layer;
            const data = wellpicksLayer.getFilteredData();

            if (!data) {
                continue;
            }

            esvLayers.push({
                id: layer.getId(),
                type: LayerType.CALLOUT_CANVAS,
                hoverable: false,
                options: {
                    data: getPicksData(data),
                    order,
                    referenceSystem: props.referenceSystem ?? undefined,
                },
            });
        }
    }

    if (!boundsSetByLayer && props.referenceSystem) {
        const firstPoint = props.referenceSystem.projectedPath[0];
        const lastPoint = props.referenceSystem.projectedPath[props.referenceSystem.projectedPath.length - 1];
        const xMax = Math.max(firstPoint[0], lastPoint[0], 1000);
        const xMin = Math.min(firstPoint[0], lastPoint[0], -1000);
        const yMax = Math.max(firstPoint[1], lastPoint[1]);
        const yMin = Math.min(firstPoint[1], lastPoint[1]);

        bounds.x = [xMin, xMax];
        bounds.y = [yMin, yMax];
    } else if (!boundsSetByLayer) {
        bounds.x = prevBounds?.x ?? [0, 2000];
        bounds.y = prevBounds?.y ?? [0, 1000];
    }

    if (!isEqual(bounds, prevBounds)) {
        setPrevBounds(bounds);
    }

    const viewportRatio = divSize.width / divSize.height;

    const newLayersViewport: [number, number, number] = [
        bounds.x[0] + (bounds.x[1] - bounds.x[0]) / 2,
        bounds.y[0] + (bounds.y[1] - bounds.y[0]) / 2,
        Math.max(Math.abs(bounds.y[1] - bounds.y[0]) * viewportRatio, Math.abs(bounds.x[1] - bounds.x[0])) * 1.2,
    ];

    if (!isEqual(newLayersViewport, prevLayersViewport) && !isInitialLayerViewportSet) {
        setViewport(newLayersViewport);
        setPrevLayersViewport(newLayersViewport);
        if (boundsSetByLayer) {
            setIsInitialLayerViewportSet(true);
        }
    }

    return (
        <div className="relative h-full" ref={divRef}>
            <ViewportWrapper
                referenceSystem={props.referenceSystem ?? undefined}
                layers={esvLayers}
                layerIdToNameMap={esvLayerIdToNameMap}
                bounds={bounds}
                viewport={viewport}
                workbenchServices={props.workbenchServices}
                viewContext={props.viewContext}
                wellboreHeaderUuid={props.wellboreHeaderUuid}
            />
            <ColorLegendsContainer colorScales={colorScales} height={divSize.height / 2 - 50} />
        </div>
    );
}
