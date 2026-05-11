import type {
    WellFeature as BaseWellFeature,
    GeoJsonWellProperties as BaseWellProperties,
} from "@webviz/subsurface-viewer/dist/layers/wells/types";

import type { WellboreTrajectoryData } from "../DataProviderFramework/dataProviders/implementations/wellboreTrajectoryTypes";

export type ExtendedWellFeatureProperties = BaseWellProperties & {
    uuid: string;
    uwi: string;

    // Styling
    lineWidth: number;
    wellHeadSize: number;

    // "Rich" info
    status?: WellboreTrajectoryData["wellboreStatus"];
    purpose?: WellboreTrajectoryData["wellborePurpose"];
    injectionData?: WellboreTrajectoryData["injectionData"];
    productionData?: WellboreTrajectoryData["productionData"];
};

export type ExtendedWellFeature = BaseWellFeature & { properties: ExtendedWellFeatureProperties };
