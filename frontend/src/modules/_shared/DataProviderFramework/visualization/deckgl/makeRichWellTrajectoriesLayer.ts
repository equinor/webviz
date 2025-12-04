import type {
    WellFeature as BaseWellFeature,
    GeoJsonWellProperties as BaseWellProperties,
} from "@webviz/subsurface-viewer/dist/layers/wells/types";

import type { WellboreHeader_api, WellboreTrajectory_api, WellTrajectoryFormationSegments_api } from "@api";
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

    const wellsLayer = new RichWellsLayer({
        id,
        data: wellboreData,
        segmentFilterValue: shouldApplySegmentFilter ? ["WITHIN_FILTER"] : undefined,
        tvdFilterValue: tvdRange,
        mdFilterValue: mdRange,

        discardFilteredSections: !depthFilter?.useOpaqueCutoff,
        isWellboreSelected: (uuid) => !!selectedHeaders?.some((header) => header.wellboreUuid === uuid),
    });

    return wellsLayer;
}
