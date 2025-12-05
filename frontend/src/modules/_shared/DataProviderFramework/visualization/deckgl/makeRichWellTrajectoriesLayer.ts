import type {
    WellFeature as BaseWellFeature,
    GeoJsonWellProperties as BaseWellProperties,
} from "@webviz/subsurface-viewer/dist/layers/wells/types";

import type {
    WellboreHeader_api,
    WellboreTrajectory_api,
    WellInjectionData_api,
    WellProductionData_api,
    WellTrajectoryFormationSegments_api,
} from "@api";
import type { RichDrilledWellTrajectoriesSettings } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RichDrilledWellTrajectoriesProvider";
import type {
    FormationSegmentData,
    RichWellsLayerProps,
    WellboreData,
} from "@modules/_shared/customDeckGlLayers/RichWellsLayer/RichWellsLayer";
import { RichWellsLayer } from "@modules/_shared/customDeckGlLayers/RichWellsLayer/RichWellsLayer";

import { Setting } from "../../settings/settingsDefinitions";
import type { TransformerArgs } from "../VisualizationAssembler";

export type GeoWellProperties = BaseWellProperties & {
    uuid: string;
    uwi: string;
    lineWidth: number;
    wellHeadSize: number;
};
export type GeoWellFeature = BaseWellFeature & { properties: GeoWellProperties };
function setColorByFlowData(
    oilProdMin: number,
    gasProdMin: number,
    waterProdMin: number,
    waterInjMin: number,
    gasInjMin: number,
    wellboreUwi: string,
    productionData: WellProductionData_api[],
    injectionData: WellInjectionData_api[],
): { r: number; g: number; b: number } | null {
    const prodData = productionData.find((pd) => pd.wellboreUwi === wellboreUwi);
    const injData = injectionData.find((id) => id.wellboreUwi === wellboreUwi);

    if (prodData) {
        // Oil production - muted green
        if (prodData.oilProductionSm3 >= oilProdMin) {
            return { r: 76, g: 175, b: 80 };
        }
        // Gas production - muted red
        if (prodData.gasProductionSm3 >= gasProdMin) {
            return { r: 211, g: 47, b: 47 };
        }
        // Water production - muted blue
        if (prodData.waterProductionM3 >= waterProdMin) {
            return { r: 66, g: 133, b: 244 };
        }
    }

    if (injData) {
        // Water injection - clear blue (distinct from oil green)
        if (injData.waterInjection >= waterInjMin) {
            return { r: 33, g: 150, b: 243 };
        }
        // Gas injection - muted amber/gold
        if (injData.gasInjection >= gasInjMin) {
            return { r: 255, g: 193, b: 7 };
        }
    }

    // Default gray color
    return null;
}
export function makeRichWellTrajectoriesLayer({
    id,
    isLoading,
    getData,
    getSetting,
    getStoredData,
}: TransformerArgs<RichDrilledWellTrajectoriesSettings, WellboreTrajectory_api[], any>): RichWellsLayer | null {
    if (isLoading) return null;

    const wellboreTrajectories = getData();
    // const selectedWellboreHeaders: WellboreHeader_api[] = getStoredData("selectedWellBoreHeaders") ?? [];
    const allWellboreHeaders: WellboreHeader_api[] = getStoredData("allWellboreHeaders") ?? [];

    const depthFilter = getSetting(Setting.DEPTH_FILTER);

    const formationSegments: WellTrajectoryFormationSegments_api[] = getStoredData("formationSegments");
    const productionData = getStoredData("productionData");
    const injectionData = getStoredData("injectionData");

    // **************************
    // TODO: Segment filter settings is currently not optional. Making same top/bottom count as "unfiltered"
    const surfaceFilterTop = getSetting(Setting.WELL_TRAJ_FILTER_TOP_SURFACE_NAME);
    const surfaceFilterBtm = getSetting(Setting.WELL_TRAJ_FILTER_BOTTOM_SURFACE_NAME);

    const shouldApplySegmentFilter = surfaceFilterTop !== surfaceFilterBtm;
    // **************************

    const selectedHeaders = getSetting(Setting.SMDA_WELLBORE_HEADERS);

    if (!wellboreTrajectories) {
        return null;
    }

    if (!allWellboreHeaders) {
        return null;
    }

    const headersByUuid = new Map(allWellboreHeaders.map((h) => [h.wellboreUuid, h]));
    // TODO: Use uuid, for consistency
    const formationsByBoreIdent = new Map<string, FormationSegmentData[]>(
        formationSegments?.map((f) => [
            f.uwi,
            f.formationSegments.map((fs) => ({
                segmentIdent: "WITHIN_FILTER", // Placeholder, as the API does not provide segment names atm
                mdEnter: fs.mdEnter,
                mdExit: fs.mdExit,
            })),
        ]),
    );

    const tvdRange: RichWellsLayerProps["tvdFilterValue"] = depthFilter
        ? [depthFilter.tvdCutoffAbove, depthFilter.tvdCutoffBelow]
        : undefined;

    const mdRange: RichWellsLayerProps["mdFilterValue"] = depthFilter
        ? [depthFilter.mdCutoffAbove, depthFilter.mdCutoffBelow]
        : undefined;

    const wellboreData: WellboreData[] = wellboreTrajectories.map((wt): WellboreData => {
        const header = headersByUuid.get(wt.wellboreUuid);
        const formationSegments = formationsByBoreIdent.get(wt.uniqueWellboreIdentifier);

        if (!header) throw Error(`Missing header for well ${wt.wellboreUuid}`);

        return {
            uuid: wt.wellboreUuid,
            uniqueIdentifier: wt.uniqueWellboreIdentifier,
            trajectory: wt,

            perforations: header.perforations ?? [],
            // TODO: Segments for the entire track, not just selected range?
            formationSegments: formationSegments ?? [],
            screens: header.screens ?? [],
            purpose: header.wellborePurpose,
            status: header.wellboreStatus,
            well: {
                uuid: header.wellUuid,
                uniqueIdentifier: header.uniqueWellIdentifier,
                easting: header.wellEasting,
                northing: header.wellNorthing,
            },
        };
    });

    // Get settings for flow data filtering
    const oilProdMin = getSetting(Setting.PDM_OIL_PROD_MIN) ?? 0;
    const gasProdMin = getSetting(Setting.PDM_GAS_PROD_MIN) ?? 0;
    const waterProdMin = getSetting(Setting.PDM_WATER_PROD_MIN) ?? 0;
    const waterInjMin = getSetting(Setting.PDM_WATER_INJ_MIN) ?? 0;
    const gasInjMin = getSetting(Setting.PDM_GAS_INJ_MIN) ?? 0;

    //TODO Fix Filter wells to only include those with valid flow data
    const filteredWellboreData =
        productionData && injectionData
            ? wellboreData.filter((wb) => {
                  const color = setColorByFlowData(
                      oilProdMin,
                      gasProdMin,
                      waterProdMin,
                      waterInjMin,
                      gasInjMin,
                      wb.uniqueIdentifier,
                      productionData,
                      injectionData,
                  );
                  return color !== null;
              })
            : wellboreData;

    const wellsLayer = new RichWellsLayer({
        id,
        data: filteredWellboreData,
        segmentFilterValue: shouldApplySegmentFilter ? ["WITHIN_FILTER"] : undefined,
        tvdFilterValue: tvdRange,
        mdFilterValue: mdRange,

        discardFilteredSections: !depthFilter?.useOpaqueCutoff,
        isWellboreSelected: (uuid) => !!selectedHeaders?.some((header) => header.wellboreUuid === uuid),
        getWellColor: (wellboreUwi: string) => {
            if (productionData && injectionData) {
                const color = setColorByFlowData(
                    oilProdMin,
                    gasProdMin,
                    waterProdMin,
                    waterInjMin,
                    gasInjMin,
                    wellboreUwi,
                    productionData,
                    injectionData,
                );
                // Return color or default gray (shouldn't happen since we filter)
                return color ?? { r: 128, g: 128, b: 128 };
            } else {
                // Default color (gray) if no data available
                return { r: 128, g: 128, b: 128 };
            }
        },
    });

    return wellsLayer;
}
