import type {
    FormationSegment_api,
    WellboreCompletion_api,
    WellboreHeader_api,
    WellborePerforation_api,
    WellboreTrajectory_api,
    WellInjectionData_api,
    WellProductionData_api,
} from "@api";

export type WellboreTrajectoryData = WellboreHeader_api &
    Omit<WellboreTrajectory_api, "wellboreUuid" | "wellboreUwi"> & {
        formationSegments?: FormationSegment_api[];
        productionData?: Omit<WellProductionData_api, "wellboreUuid" | "wellboreUwi"> | null;
        injectionData?: Omit<WellInjectionData_api, "wellboreUuid" | "wellboreUwi"> | null;
        perforations?: WellborePerforation_api[];
        screens?: WellboreCompletion_api[];
    };

export type WellboreTrajectoriesData = WellboreTrajectoryData[];