import type {
    WellFeature as BaseWellFeature,
    GeoJsonWellProperties as BaseWellProperties,
} from "@webviz/subsurface-viewer/dist/layers/wells/types";

import type { DrilledWellboreTrajectoryData } from "../DataProviderFramework/dataProviders/implementations/DrilledWellboreTrajectoriesProvider";

export type ExtendedWellFeatureProperties = BaseWellProperties & {
    uuid: string;
    uwi: string;

    // Styling
    lineWidth: number;
    wellHeadSize: number;

    // "Rich" info
    status?: DrilledWellboreTrajectoryData["wellboreStatus"];
    purpose?: DrilledWellboreTrajectoryData["wellborePurpose"];
    injectionData?: DrilledWellboreTrajectoryData["injectionData"];
    productionData?: DrilledWellboreTrajectoryData["productionData"];
};

export type ExtendedWellFeature = BaseWellFeature & { properties: ExtendedWellFeatureProperties };
