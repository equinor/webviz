import { DataProviderType } from "../dataProviderTypes";
import { DrilledWellborePicksProvider } from "../implementations/DrilledWellborePicksProvider";
import { DrilledWellTrajectoriesProvider } from "../implementations/DrilledWellTrajectoriesProvider";
import { FaultPolygonsProvider } from "../implementations/FaultPolygonsProvider";
import { IntersectionRealizationGridProvider } from "../implementations/IntersectionRealizationGridProvider";
import { RealizationPolygonsProvider } from "../implementations/RealizationPolygonsProvider";
import { IntersectionSeismicProvider } from "../implementations/seismicProviders/IntersectionSeismicProvider";
import {
    AttributeSurfaceProvider,
    AttributeSurfaceType,
} from "../implementations/surfaceProviders/AttributeSurfaceProvider";
import { DepthSurfaceProvider } from "../implementations/surfaceProviders/DepthSurfaceProvider";
import { SeismicSurfaceProvider, SeismicSurfaceType } from "../implementations/surfaceProviders/SeismicSurfaceProvider";

import { DataProviderRegistry } from "./_DataProviderRegistry";

DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELLBORE_PICKS, DrilledWellborePicksProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELL_TRAJECTORIES, DrilledWellTrajectoriesProvider);
DataProviderRegistry.registerDataProvider(
    DataProviderType.INTERSECTION_WITH_WELLBORE_EXTENSION_REALIZATION_GRID,
    IntersectionRealizationGridProvider,
    [{ enableWellboreExtensionLength: true }],
);

DataProviderRegistry.registerDataProvider(DataProviderType.INTERSECTION_SEISMIC, IntersectionSeismicProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.FAULT_POLYGONS, FaultPolygonsProvider);

DataProviderRegistry.registerDataProvider(DataProviderType.REALIZATION_POLYGONS, RealizationPolygonsProvider);

DataProviderRegistry.registerDataProvider(
    DataProviderType.INTERSECTION_REALIZATION_GRID,
    IntersectionRealizationGridProvider,
);

DataProviderRegistry.registerDataProvider(DataProviderType.DEPTH_SURFACE, DepthSurfaceProvider);

DataProviderRegistry.registerDataProvider(DataProviderType.SEISMIC_3D_SURFACE, SeismicSurfaceProvider, [
    { surfaceType: SeismicSurfaceType.SEISMIC_SURVEY },
]);
DataProviderRegistry.registerDataProvider(DataProviderType.SEISMIC_4D_SURFACE, SeismicSurfaceProvider, [
    { surfaceType: SeismicSurfaceType.SEISMIC_TIME_LAPSE },
]);
DataProviderRegistry.registerDataProvider(DataProviderType.ATTRIBUTE_STATIC_SURFACE, AttributeSurfaceProvider, [
    { surfaceType: AttributeSurfaceType.ATTRIBUTE_STATIC },
]);
DataProviderRegistry.registerDataProvider(DataProviderType.ATTRIBUTE_TIME_STEP_SURFACE, AttributeSurfaceProvider, [
    { surfaceType: AttributeSurfaceType.ATTRIBUTE_TIME_STEP },
]);
DataProviderRegistry.registerDataProvider(DataProviderType.ATTRIBUTE_INTERVAL_SURFACE, AttributeSurfaceProvider, [
    { surfaceType: AttributeSurfaceType.ATTRIBUTE_INTERVAL },
]);
