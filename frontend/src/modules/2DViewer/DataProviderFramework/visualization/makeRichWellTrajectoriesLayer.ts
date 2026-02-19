import type { WellsLayer, WellsLayerProps } from "@webviz/subsurface-viewer/dist/layers";
import { LabelOrientation } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";
import type { PerforationProperties, ScreenProperties } from "@webviz/subsurface-viewer/dist/layers/wells/types";
import { parse, type Rgb } from "culori";
import type { Feature, FeatureCollection, GeometryCollection } from "geojson";

import { point2Distance, vec2FromArray } from "@lib/utils/vec2";
import { DEFAULT_WELLS_LAYER_PROPS } from "@modules/_shared/constants/wellsLayer";
import { AdjustedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdjustedWellsLayer";
import type {
    DrilledWellboreTrajectoriesData,
    DrilledWellboreTrajectoriesSettings,
    DrilledWellboreTrajectoriesStoredData,
    DrilledWellboreTrajectoryData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellboreTrajectoriesProvider";
import type { SettingTypeDefinitions } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ExtendedWellFeature, ExtendedWellFeatureProperties } from "@modules/_shared/types/geojson";
import { simplifyWellTrajectoryRadialDist, wellTrajectoryToGeojson } from "@modules/_shared/utils/wellbore";

const SIMPLIFICATION_RADIAL_DIST = 1.5;
const FORMATION_FILTER_NAME = "WITHIN FILTER";

export function makeRichWellTrajectoriesLayer(
    args: TransformerArgs<
        DrilledWellboreTrajectoriesSettings,
        DrilledWellboreTrajectoriesData,
        DrilledWellboreTrajectoriesStoredData
    >,
): WellsLayer | null {
    const { id, isLoading, getData, getSetting } = args;

    const wellboreTrajectoriesData = getData();
    const depthFilterType = getSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE);
    const pdmFilterType = getSetting(Setting.PDM_FILTER_TYPE);
    const pdmFilterSettings = getSetting(Setting.PDM_FILTER);
    const mdRangeSetting = getSetting(Setting.MD_RANGE);

    if (isLoading) {
        return null;
    }

    if (!wellboreTrajectoriesData) {
        return null;
    }

    // Transform data
    const wellGeoJson = wellDataToGeoJson(wellboreTrajectoriesData);

    // Get filter settings (if enabled)
    let mdFilterRange: WellsLayerProps["mdFilterRange"] = [-1, -1];
    let formationFilter: WellsLayerProps["formationFilter"] = [];
    const filteredWellNames: string[] = [];
    const filtersEnabled = depthFilterType !== "none" || pdmFilterType !== "none";

    if (depthFilterType === "md_range" && mdRangeSetting) {
        mdFilterRange = [mdRangeSetting[0] ?? -1, mdRangeSetting[1] ?? -1];
    } else if (depthFilterType === "surface_based") {
        formationFilter = [FORMATION_FILTER_NAME];
    }

    // Filter away trajectories if the trajectory does not have flow data within the configured limits
    if (pdmFilterType === "production_injection") {
        // If list is completely empty (aka, no well passes the check), the filter won't apply, so we include one dummy-value to avoid that
        filteredWellNames.push("DUMMY");

        // TODO: Finalize flow filter
        wellboreTrajectoriesData.forEach((wt) => {
            const flowSetting = getApplicableFlowDataSetting(pdmFilterSettings, wt.productionData, wt.injectionData);

            if (flowSetting) {
                filteredWellNames.push(wt.uniqueWellboreIdentifier);
            }
        });
    }

    const wellsLayer = new AdjustedWellsLayer({
        ...DEFAULT_WELLS_LAYER_PROPS,
        id: id,
        positionFormat: "XY",
        outline: false,
        data: wellGeoJson,
        pickable: false,
        depthTest: false,
        lineWidthScale: 2,
        markers: {
            showPerforations: true,
            showScreens: true,
            showScreenTrajectoryAsDash: true,
        },
        enableFilters: filtersEnabled,
        // Use this option to show filtered trajectory parts
        // showFilterTrajectoryGhost: [139, 139, 139, 255 * 0.1],
        mdFilterRange: mdFilterRange,
        formationFilter: formationFilter,
        wellNameFilter: filteredWellNames,
        lineStyle: {
            ...DEFAULT_WELLS_LAYER_PROPS.lineStyle,
            // Trajectory color. If flow filter is enabled, color based on flow data
            color: (d: Feature) => {
                const geoWellFeature = d as ExtendedWellFeature;
                const { productionData, injectionData, color = [128, 128, 128] } = geoWellFeature.properties;

                if (pdmFilterType === "none") return color;

                const flowColor = setColorByFlowData(pdmFilterSettings, productionData, injectionData);
                // Return color or default gray (shouldn't happen since we filter)
                return flowColor ?? color;
            },
        },

        wellLabel: {
            // The label position is tied to the **entire** trajectory, so they look a bit out of place when filtering is applied. We might want to make sure the labels are hidden if `showFilterTrajectoryGhost` is false
            // visible: false
            orientation: wellGeoJson.features.length < 200 ? LabelOrientation.TANGENT : LabelOrientation.HORIZONTAL,
            positionFormat: "XY",
            getPositionAlongPath: 1,
            getBackgroundColor: [255, 255, 255, 255 * 0.1],
            getTextAnchor: "end",
            getAlignmentBaseline: "top",
        },
    });

    return wellsLayer;
}

function wellDataToGeoJson(
    wellboreTrajectoriesData: DrilledWellboreTrajectoriesData,
): FeatureCollection<GeometryCollection, ExtendedWellFeatureProperties> {
    const wellboreFeatures: ExtendedWellFeature[] = [];

    for (const fullWt of wellboreTrajectoriesData) {
        const wt = createSimplifiedTrajectory(fullWt);
        const wellboreFeature = wellTrajectoryToGeojson(wt) as ExtendedWellFeature;

        // ! The data structure in the subsurface package is not final, so this might change in a future update
        wellboreFeature.properties = {
            ...wellboreFeature.properties,
            formations: wt.formationSegments.map((wtf) => ({
                mdEnter: wtf.mdEnter,
                mdExit: wtf.mdExit,
                name: FORMATION_FILTER_NAME,
            })),
            screens: wt.screens.map<ScreenProperties>((wts) => ({
                // Screen readout is shown as [wellbore.name :: name]
                name: wts.symbolName ?? "Screen", // This is what's shown in the readout
                description: wts.description ?? undefined,
                mdStart: wts.mdTop,
                mdEnd: wts.mdBottom,
            })),
            perforations: wt.perforations.map<PerforationProperties>((wtp) => ({
                // Perforation readout is shown as [name :: status]
                name: "Perforation",
                md: (wtp.mdTop + wtp.mdBottom) / 2,
                status: wtp.status,
                dateClosed: wtp.dateClosed ?? undefined,
                dateShot: wtp.dateShot ?? undefined,
            })),

            status: wt.wellboreStatus,
            purpose: wt.wellborePurpose,

            injectionData: wt.injectionData,
            productionData: wt.productionData,
        };

        wellboreFeatures.push(wellboreFeature);
    }

    return {
        type: "FeatureCollection",
        features: wellboreFeatures,
    };
}

function createSimplifiedTrajectory(trajectory: DrilledWellboreTrajectoryData) {
    return simplifyWellTrajectoryRadialDist(trajectory, SIMPLIFICATION_RADIAL_DIST, (point1, point2) => {
        const vecPoint1 = vec2FromArray([point1.easting, point1.northing]);
        const vecPoint2 = vec2FromArray([point2.easting, point2.northing]);

        return point2Distance(vecPoint1, vecPoint2);
    });
}

function hexToRgb(hex: string): [r: number, g: number, b: number] {
    const color = parse(hex);

    if (!color || !("r" in color && "g" in color && "b" in color)) {
        // Fallback to gray if parsing fails
        return [128, 128, 128];
    }

    const rgb = color as Rgb;

    return [Math.round(rgb.r * 255), Math.round(rgb.g * 255), Math.round(rgb.b * 255)];
}

function setColorByFlowData(
    pdmFilterSettings: SettingTypeDefinitions[Setting.PDM_FILTER]["externalValue"],
    productionData: ExtendedWellFeatureProperties["productionData"],
    injectionData: ExtendedWellFeatureProperties["injectionData"],
): [r: number, g: number, b: number] | null {
    if (!productionData && !injectionData) return null;
    if (!pdmFilterSettings) return null;

    const flowSetting = getApplicableFlowDataSetting(pdmFilterSettings, productionData, injectionData);

    if (!flowSetting) return null;
    return hexToRgb(flowSetting.color);
}

function getApplicableFlowDataSetting(
    pdmFilterSettings: SettingTypeDefinitions[Setting.PDM_FILTER]["externalValue"],
    productionData: ExtendedWellFeatureProperties["productionData"],
    injectionData: ExtendedWellFeatureProperties["injectionData"],
) {
    if (!pdmFilterSettings) return null;

    const { production, injection } = pdmFilterSettings;

    if (productionData) {
        if (productionData.oilProductionSm3 >= pdmFilterSettings.production.oil.value) {
            return production.oil;
        }
        if (productionData.gasProductionSm3 >= pdmFilterSettings.production.gas.value) {
            return production.gas;
        }
        if (productionData.waterProductionM3 >= pdmFilterSettings.production.water.value) {
            return production.water;
        }
    }

    if (injectionData) {
        if (injectionData.waterInjection >= pdmFilterSettings.injection.water.value) {
            return injection.water;
        }
        if (injectionData.gasInjection >= pdmFilterSettings.injection.gas.value) {
            return injection.gas;
        }
    }

    return null;
}
