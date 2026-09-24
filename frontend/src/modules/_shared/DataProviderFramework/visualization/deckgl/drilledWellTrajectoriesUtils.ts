import type { PerforationProperties, ScreenProperties } from "@webviz/subsurface-viewer/dist/layers/wells/types";
import { parse, type Rgb } from "culori";
import type { FeatureCollection, GeometryCollection } from "geojson";

import type {
    SettingTypeDefinitions,
    Setting,
} from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { ExtendedWellFeature, ExtendedWellFeatureProperties } from "@modules/_shared/types/geojson";
import { simplifyWellTrajectoryRadialDist, wellTrajectoryToGeojson } from "@modules/_shared/utils/wellbore";

import type {
    DrilledWellboreTrajectoriesData,
    DrilledWellboreTrajectoryData,
} from "../../dataProviders/implementations/DrilledWellboreTrajectoriesProvider";

export const SIMPLIFICATION_RADIAL_DIST = 1.5;
export const FORMATION_FILTER_NAME = "WITHIN FILTER";

export type TrajectorySimplificationPoint = { easting: number; northing: number; tvdMsl: number };
export type TrajectoryDistanceFn = (
    point1: TrajectorySimplificationPoint,
    point2: TrajectorySimplificationPoint,
) => number;

export function wellDataToGeoJson(
    wellboreTrajectoriesData: DrilledWellboreTrajectoriesData,
    computeDistance?: TrajectoryDistanceFn,
): FeatureCollection<GeometryCollection, ExtendedWellFeatureProperties> {
    const wellboreFeatures: ExtendedWellFeature[] = [];

    for (const fullWt of wellboreTrajectoriesData) {
        const wt = createSimplifiedTrajectory(fullWt, computeDistance);
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

export function createSimplifiedTrajectory(
    trajectory: DrilledWellboreTrajectoryData,
    computeDistance?: TrajectoryDistanceFn,
): DrilledWellboreTrajectoryData {
    // Undefined falls back to the util's full-3D radial distance
    return simplifyWellTrajectoryRadialDist(trajectory, SIMPLIFICATION_RADIAL_DIST, computeDistance);
}

export function hexToRgb(hex: string): [r: number, g: number, b: number] {
    const color = parse(hex);

    if (!color || !("r" in color && "g" in color && "b" in color)) {
        // Fallback to gray if parsing fails
        return [128, 128, 128];
    }

    const rgb = color as Rgb;

    return [Math.round(rgb.r * 255), Math.round(rgb.g * 255), Math.round(rgb.b * 255)];
}

export function setColorByFlowData(
    flowFilterSettings: SettingTypeDefinitions[Setting.FLOW_FILTER]["externalValue"],
    productionData: ExtendedWellFeatureProperties["productionData"],
    injectionData: ExtendedWellFeatureProperties["injectionData"],
): [r: number, g: number, b: number] | null {
    if (!productionData && !injectionData) return null;
    if (!flowFilterSettings) return null;

    const flowSetting = getApplicableFlowDataSetting(flowFilterSettings, productionData, injectionData);

    if (!flowSetting) return null;
    return hexToRgb(flowSetting.color);
}

export function getApplicableFlowDataSetting(
    flowFilterSettings: SettingTypeDefinitions[Setting.FLOW_FILTER]["externalValue"],
    productionData: ExtendedWellFeatureProperties["productionData"],
    injectionData: ExtendedWellFeatureProperties["injectionData"],
) {
    if (!flowFilterSettings) return null;

    const { production, injection } = flowFilterSettings;

    if (productionData) {
        if (productionData.oilProductionSm3 > flowFilterSettings.production.oil.value) {
            return production.oil;
        }
        if (productionData.gasProductionSm3 > flowFilterSettings.production.gas.value) {
            return production.gas;
        }
        if (productionData.waterProductionM3 > flowFilterSettings.production.water.value) {
            return production.water;
        }
    }

    if (injectionData) {
        if (injectionData.waterInjection > flowFilterSettings.injection.water.value) {
            return injection.water;
        }
        if (injectionData.gasInjection > flowFilterSettings.injection.gas.value) {
            return injection.gas;
        }
    }

    return null;
}
