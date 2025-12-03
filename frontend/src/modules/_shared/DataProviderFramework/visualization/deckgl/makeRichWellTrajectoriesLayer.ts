import type {
    WellFeature as BaseWellFeature,
    GeoJsonWellProperties as BaseWellProperties,
} from "@webviz/subsurface-viewer/dist/layers/wells/types";

import type { WellboreHeader_api, WellboreTrajectory_api } from "@api";
import type { RichDrilledWellTrajectoriesSettings } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RichDrilledWellTrajectoriesProvider";
import type { WellboreData } from "@modules/_shared/customDeckGlLayers/RichWellsLayer/RichWellsLayer";
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
    getData,
    getSetting,
    getStoredData,
}: TransformerArgs<RichDrilledWellTrajectoriesSettings, WellboreTrajectory_api[], any>): RichWellsLayer | null {
    const wellboreTrajectories = getData();
    const wellboreHeaders: WellboreHeader_api[] = getStoredData("selectedWellBoreHeaders") ?? [];

    const depthFilter = getSetting(Setting.DEPTH_FILTER);
    const formationSegments = getStoredData("formationSegments");
    const productionData = getStoredData("productionData");
    const injectionData = getStoredData("injectionData");

    const selectedHeaders = getSetting(Setting.SMDA_WELLBORE_HEADERS);

    if (!wellboreTrajectories) {
        return null;
    }

    if (!wellboreHeaders) {
        return null;
    }

    const headersByUuid = new Map(
        wellboreHeaders.map((h) => {
            return [h.wellboreUuid, h];
        }),
    );

    const tvdRange: [number | undefined, number | undefined] | undefined = depthFilter
        ? [depthFilter.tvdCutoffAbove, depthFilter.tvdCutoffBelow]
        : undefined;

    const wellboreData: WellboreData[] = wellboreTrajectories.map((wt): WellboreData => {
        const header = headersByUuid.get(wt.wellboreUuid);

        if (!header) throw Error(`Missing header for well ${wt.wellboreUuid}`);

        return {
            uuid: wt.wellboreUuid,
            uniqueIdentifier: wt.uniqueWellboreIdentifier,
            perforations: header.perforations ?? [],
            screens: header.screens ?? [],
            purpose: header.wellborePurpose,
            status: header.wellboreStatus,
            trajectory: wt,
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
        isWellboreSelected: (uuid) => !!selectedHeaders?.some((header) => header.wellboreUuid === uuid),
        tvdRange: tvdRange,
    });

    return wellsLayer;
}
