import type { WellsLayer, WellsLayerProps } from "@webviz/subsurface-viewer/dist/layers";
import { LabelOrientation } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";
import type { Feature } from "geojson";

import { DEFAULT_WELLS_LAYER_PROPS_BY_VIEW_MODE } from "@modules/_shared/constants/wellsLayer";
import { WebvizWellsLayer } from "@modules/_shared/customDeckGlLayers/WebvizWellsLayer";
import type {
    DrilledWellboreTrajectoriesData,
    DrilledWellboreTrajectoriesSettings,
    DrilledWellboreTrajectoriesStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellboreTrajectoriesProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ExtendedWellFeature } from "@modules/_shared/types/geojson";
import { trajectoryDistanceRadial, trajectoryDistanceXY } from "@modules/_shared/utils/wellbore";

import {
    FORMATION_FILTER_NAME,
    getApplicableFlowDataSetting,
    setColorByFlowData,
    wellDataToGeoJson,
} from "./drilledWellTrajectoriesUtils";

export type DrilledWellTrajectoriesLayerOptions = {
    viewMode: "2D" | "3D";
};

export function makeDrilledWellTrajectoriesLayer(
    args: TransformerArgs<
        DrilledWellboreTrajectoriesSettings,
        DrilledWellboreTrajectoriesData,
        DrilledWellboreTrajectoriesStoredData
    >,
    options: DrilledWellTrajectoriesLayerOptions,
): WellsLayer | null {
    const { id, isLoading, getData, getSetting } = args;

    const wellboreTrajectoriesData = getData();
    const depthFilterType = getSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE) ?? "none";
    const flowFilterType = getSetting(Setting.FLOW_FILTER_TYPE) ?? "none";
    const flowFilterSettings = getSetting(Setting.FLOW_FILTER);
    const mdRangeSetting = getSetting(Setting.MD_RANGE);

    if (isLoading) {
        return null;
    }

    if (!wellboreTrajectoriesData) {
        return null;
    }

    // 2D simplifies on XY distance only; 3D must use full 3D distance so near-vertical sections keep their shape.
    const computeDistance = options.viewMode === "2D" ? trajectoryDistanceXY : trajectoryDistanceRadial;

    const wellGeoJson = wellDataToGeoJson(wellboreTrajectoriesData, computeDistance);

    // Get filter settings (if enabled)
    let mdFilterRange: WellsLayerProps["mdFilterRange"] = [-1, -1];
    let formationFilter: WellsLayerProps["formationFilter"] = [];
    const filteredWellNames: string[] = [];
    const filtersEnabled = depthFilterType !== "none" || flowFilterType !== "none";

    if (depthFilterType === "md_range" && mdRangeSetting) {
        mdFilterRange = [mdRangeSetting[0] ?? -1, mdRangeSetting[1] ?? -1];
    } else if (depthFilterType === "surface_based") {
        formationFilter = [FORMATION_FILTER_NAME];
    }

    let noWellPassesFlowFilter = false;
    // Filter away trajectories if the trajectory does not have flow data within the configured limits
    if (flowFilterType === "production_injection") {
        wellboreTrajectoriesData.forEach((wt) => {
            const flowSetting = getApplicableFlowDataSetting(flowFilterSettings, wt.productionData, wt.injectionData);

            if (flowSetting) {
                filteredWellNames.push(wt.uniqueWellboreIdentifier);
            }
        });

        noWellPassesFlowFilter = filteredWellNames.length === 0;
    }

    if (noWellPassesFlowFilter) {
        return null;
    }
    // The label position is tied to the **entire** trajectory, so they look a bit out of place when filtering is applied. We might want to make sure the labels are hidden if `showFilterTrajectoryGhost` is false
    // wellLabel.visible: false
    const wellLabel = { ...DEFAULT_WELLS_LAYER_PROPS_BY_VIEW_MODE[options.viewMode].wellLabel };

    // Tangential orientation looks nice, but slows down significantly on larger sets, so we revert to horizontal if needed
    if (options.viewMode === "2D" && wellGeoJson.features.length > 200) {
        wellLabel.orientation = LabelOrientation.HORIZONTAL;
    }

    const wellsLayer = new WebvizWellsLayer({
        ...DEFAULT_WELLS_LAYER_PROPS_BY_VIEW_MODE[options.viewMode],
        id: id,
        outline: false,
        data: wellGeoJson,
        lineWidthScale: 2,
        markers: {
            showPerforations: true,
            showScreens: true,
            showScreenTrajectoryAsDash: true,
        },
        productionColors: {
            oil: flowFilterSettings?.production.oil.color,
            gas: flowFilterSettings?.production.gas.color,
            water: flowFilterSettings?.production.water.color,
        },
        injectionColors: {
            gas: flowFilterSettings?.injection.gas.color,
            water: flowFilterSettings?.injection.water.color,
        },
        enableFilters: filtersEnabled,
        // Use this option to show filtered trajectory parts
        // showFilterTrajectoryGhost: [139, 139, 139, 255 * 0.1],
        mdFilterRange: mdFilterRange,
        formationFilter: formationFilter,
        wellNameFilter: filteredWellNames,
        wellLabel: wellLabel,
        lineStyle: {
            ...DEFAULT_WELLS_LAYER_PROPS_BY_VIEW_MODE[options.viewMode].lineStyle,
            // Trajectory color. If flow filter is enabled, color based on flow data
            color: (d: Feature) => {
                const geoWellFeature = d as ExtendedWellFeature;
                const { productionData, injectionData, color = [128, 128, 128] } = geoWellFeature.properties;

                if (flowFilterType === "none") return color;

                const flowColor = setColorByFlowData(flowFilterSettings, productionData, injectionData);
                // Return color or default gray (shouldn't happen since we filter)
                return flowColor ?? color;
            },
        },
    });

    return wellsLayer;
}
