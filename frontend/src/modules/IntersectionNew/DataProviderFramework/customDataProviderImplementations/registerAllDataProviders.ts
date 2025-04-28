import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { EnsembleWellborePicksProvider } from "./EnsembleWellborePicksProvider";
import { RealizationSurfacesProvider } from "./RealizationSurfacesProvider";
import { SurfacesPerRealizationValuesProvider } from "./SurfacesPerRealizationValuesProvider";
import { CustomDataProviderType } from "./dataProviderTypes";

DataProviderRegistry.registerDataProvider(
    CustomDataProviderType.ENSEMBLE_WELLBORE_PICKS,
    EnsembleWellborePicksProvider,
);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_SURFACES, RealizationSurfacesProvider);
DataProviderRegistry.registerDataProvider(
    CustomDataProviderType.SURFACES_REALIZATIONS_UNCERTAINTY,
    SurfacesPerRealizationValuesProvider,
);
