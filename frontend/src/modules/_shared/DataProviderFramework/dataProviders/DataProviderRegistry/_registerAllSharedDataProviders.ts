import { DataProviderType } from "../dataProviderTypes";
import { DrilledWellborePicksProvider } from "../implementations/DrilledWellborePicksProvider";
import { DrilledWellTrajectoriesProvider } from "../implementations/DrilledWellTrajectoriesProvider";
import { IntersectionRealizationGridProvider } from "../implementations/IntersectionRealizationGridProvider";
import {
    IntersectionRealizationSeismicProvider,
    SeismicDataSource,
} from "../implementations/IntersectionRealizationSeismicProvider";
import { RealizationPolygonsProvider } from "../implementations/RealizationPolygonsProvider";
import {
    RealizationSurfaceProvider,
    SurfaceDataFormat,
    VisualizationSpace,
} from "../implementations/RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "../implementations/StatisticalSurfaceProvider";

import { DataProviderRegistry } from "./_DataProviderRegistry";

DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELLBORE_PICKS, DrilledWellborePicksProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.DRILLED_WELL_TRAJECTORIES, DrilledWellTrajectoriesProvider);
DataProviderRegistry.registerDataProvider(
    DataProviderType.INTERSECTION_WITH_WELLBORE_EXTENSION_REALIZATION_GRID,
    IntersectionRealizationGridProvider,
    [{ enableWellboreExtensionLength: true }],
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
DataProviderRegistry.registerDataProvider(DataProviderType.REALIZATION_SURFACE_3D, RealizationSurfaceProvider, [
    SurfaceDataFormat.FLOAT,
    VisualizationSpace.SPACE_3D,
]);
DataProviderRegistry.registerDataProvider(DataProviderType.REALIZATION_POLYGONS, RealizationPolygonsProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.REALIZATION_SURFACE, RealizationSurfaceProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.STATISTICAL_SURFACE, StatisticalSurfaceProvider);
DataProviderRegistry.registerDataProvider(
    DataProviderType.INTERSECTION_REALIZATION_GRID,
    IntersectionRealizationGridProvider,
);
