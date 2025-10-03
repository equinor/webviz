import type {
    WellFeature as BaseWellFeature,
    GeoJsonWellProperties as BaseWellProperties,
} from "@webviz/subsurface-viewer/dist/layers/wells/types";

import type { EnhancedWellboreHeader_api, WellboreTrajectory_api } from "@api";
import type { WellboreData } from "@modules/2DViewer/view/customDeckGlLayers/AdvancedWellsLayer2";
import { AdvancedWellsLayer } from "@modules/2DViewer/view/customDeckGlLayers/AdvancedWellsLayer2";

import { Setting } from "../../settings/settingsDefinitions";
import type { TransformerArgs } from "../VisualizationAssembler";

export type GeoWellProperties = BaseWellProperties & {
    uuid: string;
    uwi: string;
    lineWidth: number;
    wellHeadSize: number;
};
export type GeoWellFeature = BaseWellFeature & { properties: GeoWellProperties };

export function makeDrilledWellTrajectoriesLayer({
    id,
    getData,
    getSetting,
    getStoredData,
}: TransformerArgs<any, WellboreTrajectory_api[], any>): AdvancedWellsLayer | null {
    const wellboreTrajectories = getData();
    const wellboreHeaders: EnhancedWellboreHeader_api[] = getStoredData("wellboreHeaders") ?? [];
    const depthFilter = getSetting(Setting.DEPTH_FILTER);
    const selectedHeaders: EnhancedWellboreHeader_api[] = getSetting(Setting.SMDA_WELLBORE_HEADERS);

    if (!wellboreTrajectories) {
        return null;
    }

    // const wellLayerDataFeatures = wellboreTrajectories.map((well) => wellTrajectoryToGeojson(well));

    // function getLineStyleWidth(object: Feature): number {
    //     if (object.properties && "lineWidth" in object.properties) {
    //         return object.properties.lineWidth as number;
    //     }
    //     return 2;
    // }

    // function getWellHeadStyleWidth(object: Feature): number {
    //     if (object.properties && "wellHeadSize" in object.properties) {
    //         return object.properties.wellHeadSize as number;
    //     }
    //     return 1;
    // }

    // function getColor(object: Feature): [number, number, number, number] {
    //     if (object.properties && "color" in object.properties) {
    //         return object.properties.color as [number, number, number, number];
    //     }
    //     return [50, 50, 50, 100];
    // }

    const headersByUuid = new Map(
        wellboreHeaders.map((h) => {
            return [h.wellboreUuid, h];
        }),
    );

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

    const wellsLayer = new AdvancedWellsLayer({
        id,
        data: wellboreData,
        isWellboreSelected: (uuid) => selectedHeaders.some((header) => header.wellboreUuid === uuid),
    });

    return wellsLayer;
}
