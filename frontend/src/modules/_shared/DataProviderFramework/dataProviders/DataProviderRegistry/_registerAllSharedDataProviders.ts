import { DataProviderType } from "../dataProviderTypes";
import { DrilledWellborePicksProvider } from "../implementations/DrilledWellborePicksProvider";
import { DrilledWellTrajectoriesProvider } from "../implementations/DrilledWellTrajectoriesProvider";
import { IntersectionRealizationGridProvider } from "../implementations/IntersectionRealizationGridProvider";
import {
    IntersectionRealizationSeismicProvider,
    SeismicDataSource,
} from "../implementations/IntersectionRealizationSeismicProvider";

import { DataProviderRegistry } from "./_DataProviderRegistry";

DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELLBORE_PICKS, DrilledWellborePicksProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELL_TRAJECTORIES, DrilledWellTrajectoriesProvider);
DataProviderRegistry.registerDataProvider(
    DataProviderType.INTERSECTION_WITH_EXTENSION_REALIZATION_GRID,
    IntersectionRealizationGridProvider,
    [{ isExtensionLengthEnabled: true }],
);
DataProviderRegistry.registerDataProvider(
    DataProviderType.INTERSECTION_REALIZATION_OBSERVED_SEISMIC,
    IntersectionRealizationSeismicProvider,
    [SeismicDataSource.OBSERVED],
);
DataProviderRegistry.registerDataProvider(
    DataProviderType.INTERSECTION_REALIZATION_SIMULATED_SEISMIC,
    IntersectionRealizationSeismicProvider,
    [SeismicDataSource.SIMULATED],
);
