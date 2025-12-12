import type { WellInjectionData_api, WellProductionData_api } from "@api";
import type {
    FormationSegmentData,
    RichWellsLayerProps,
    WellboreData,
} from "@modules/_shared/customDeckGlLayers/RichWellsLayer/RichWellsLayer";
import { RichWellsLayer } from "@modules/_shared/customDeckGlLayers/RichWellsLayer/RichWellsLayer";
import type {
    DrilledWellboreTrajectoriesData,
    DrilledWellboreTrajectoriesSettings,
    DrilledWellboreTrajectoriesStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellboreTrajectoriesProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type {
    WellFeature as BaseWellFeature,
    GeoJsonWellProperties as BaseWellProperties,
} from "@webviz/subsurface-viewer/dist/layers/wells/types";
import { parse, type Rgb } from "culori";

export type GeoWellProperties = BaseWellProperties & {
    uuid: string;
    uwi: string;
    lineWidth: number;
    wellHeadSize: number;
};
export type GeoWellFeature = BaseWellFeature & { properties: GeoWellProperties };

export function makeRichWellTrajectoriesLayer({
    id,
    isLoading,
    getData,
    getSetting,
}: TransformerArgs<
    DrilledWellboreTrajectoriesSettings,
    DrilledWellboreTrajectoriesData,
    DrilledWellboreTrajectoriesStoredData
>): RichWellsLayer | null {
    if (isLoading) return null;

    const wellboreTrajectoriesData = getData();

    if (!wellboreTrajectoriesData) {
        return null;
    }

    const depthFilterType = getSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE);

    // **************************
    // TODO: Segment filter settings is currently not optional. Making same top/bottom count as "unfiltered"
    const formationFilter = getSetting(Setting.WELLBORE_DEPTH_FORMATION_FILTER);
    const surfaceFilterTop = formationFilter?.topSurfaceName;
    const surfaceFilterBtm = formationFilter?.baseSurfaceName;

    const shouldApplySegmentFilter =
        depthFilterType === "surface_based" && surfaceFilterTop !== surfaceFilterBtm && surfaceFilterTop !== null;
    // **************************

    let tvdRange: RichWellsLayerProps["tvdFilterValue"] = undefined;
    let mdRange: RichWellsLayerProps["mdFilterValue"] = undefined;
    if (depthFilterType === "tvd_range") {
        const tvdRangeSetting = getSetting(Setting.TVD_RANGE);
        tvdRange = tvdRangeSetting ?? undefined;
    } else if (depthFilterType === "md_range") {
        const mdRangeSetting = getSetting(Setting.MD_RANGE);
        mdRange = mdRangeSetting ?? undefined;
    }

    // Get settings for flow data filtering
    const pdmFilterType = getSetting(Setting.PDM_FILTER_TYPE);
    const pdmFilterActive = pdmFilterType === "production_injection";
    const pdmFilter = getSetting(Setting.PDM_FILTER);

    const oilProdMin = pdmFilterActive ? (pdmFilter?.production.oil ?? null) : null;
    const gasProdMin = pdmFilterActive ? (pdmFilter?.production.gas ?? null) : null;
    const waterProdMin = pdmFilterActive ? (pdmFilter?.production.water ?? null) : null;
    const waterInjMin = pdmFilterActive ? (pdmFilter?.injection.water ?? null) : null;
    const gasInjMin = pdmFilterActive ? (pdmFilter?.injection.gas ?? null) : null;

    const wellboreData: WellboreData[] = [];
    for (const wt of wellboreTrajectoriesData) {
        if (wt.productionData) {
            if (wt.productionData.oilProductionSm3 < (oilProdMin?.value ?? 0)) continue;
            if (wt.productionData.gasProductionSm3 < (gasProdMin?.value ?? 0)) continue;
            if (wt.productionData.waterProductionM3 < (waterProdMin?.value ?? 0)) continue;
        }
        if (wt.injectionData) {
            if (wt.injectionData.waterInjection < (waterInjMin?.value ?? 0)) continue;
            if (wt.injectionData.gasInjection < (gasInjMin?.value ?? 0)) continue;
        }

        wellboreData.push({
            uuid: wt.wellboreUuid,
            uniqueIdentifier: wt.uniqueWellboreIdentifier,
            trajectory: wt,

            perforations: wt.perforations,
            // TODO: Segments for the entire track, not just selected range?
            formationSegments: wt.formationSegments.map<FormationSegmentData>(
                (fs): FormationSegmentData => ({
                    mdEnter: fs.mdEnter,
                    mdExit: fs.mdExit,
                    segmentIdent: "WITHIN_FILTER",
                }),
            ),
            screens: wt.screens,
            purpose: wt.wellborePurpose,
            status: wt.wellboreStatus,
            well: {
                uuid: wt.wellUuid,
                uniqueIdentifier: wt.uniqueWellIdentifier,
                easting: wt.wellEasting,
                northing: wt.wellNorthing,
            },
        });
    }

    const wellsLayer = new RichWellsLayer({
        id,
        data: wellboreData,
        segmentFilterValue: shouldApplySegmentFilter ? ["WITHIN_FILTER"] : undefined,
        tvdFilterValue: tvdRange,
        mdFilterValue: mdRange,

        discardFilteredSections: true,
        getWellColor: (wellboreUwi: string) => {
            const productionData =
                wellboreTrajectoriesData.find((wt) => wt.uniqueWellIdentifier === wellboreUwi)?.productionData ?? null;
            const injectionData =
                wellboreTrajectoriesData.find((wt) => wt.uniqueWellboreIdentifier === wellboreUwi)?.injectionData ??
                null;
            const color = setColorByFlowData(
                oilProdMin,
                gasProdMin,
                waterProdMin,
                waterInjMin,
                gasInjMin,
                productionData,
                injectionData,
            );
            // Return color or default gray (shouldn't happen since we filter)
            return color ?? { r: 128, g: 128, b: 128 };
        },
    });

    return wellsLayer;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const color = parse(hex);

    if (!color || !("r" in color && "g" in color && "b" in color)) {
        // Fallback to gray if parsing fails
        return { r: 128, g: 128, b: 128 };
    }

    const rgb = color as Rgb;
    return {
        r: Math.round(rgb.r * 255),
        g: Math.round(rgb.g * 255),
        b: Math.round(rgb.b * 255),
    };
}

function setColorByFlowData(
    oilProdMin: { value: number; color: string } | null,
    gasProdMin: { value: number; color: string } | null,
    waterProdMin: { value: number; color: string } | null,
    waterInjMin: { value: number; color: string } | null,
    gasInjMin: { value: number; color: string } | null,
    productionData: Pick<WellProductionData_api, "oilProductionSm3" | "gasProductionSm3" | "waterProductionM3"> | null,
    injectionData: Pick<WellInjectionData_api, "waterInjection" | "gasInjection"> | null,
): { r: number; g: number; b: number } | null {
    if (productionData) {
        // Oil production
        if (oilProdMin) {
            if (productionData.oilProductionSm3 >= oilProdMin.value) {
                return hexToRgb(oilProdMin.color);
            }
        }
        // Gas production
        if (gasProdMin) {
            if (productionData.gasProductionSm3 >= gasProdMin.value) {
                return hexToRgb(gasProdMin.color);
            }
        }
        // Water production
        if (waterProdMin) {
            if (productionData.waterProductionM3 >= waterProdMin.value) {
                return hexToRgb(waterProdMin.color);
            }
        }
    }

    if (injectionData) {
        // Water injection
        if (waterInjMin) {
            if (injectionData.waterInjection >= waterInjMin.value) {
                return hexToRgb(waterInjMin.color);
            }
        }
        // Gas injection
        if (gasInjMin) {
            if (injectionData.gasInjection >= gasInjMin.value) {
                return hexToRgb(gasInjMin.color);
            }
        }
    }

    // Default gray color
    return null;
}
