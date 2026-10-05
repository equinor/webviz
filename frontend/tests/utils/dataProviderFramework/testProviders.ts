import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { type GridTestData, getTestBackend, type LabelTestData, type SurfaceTestData } from "./testBackend";

export const SURFACE_PROVIDER_TYPE = "test-surface-provider";
export const GRID_PROVIDER_TYPE = "test-grid-provider";
export const LABEL_PROVIDER_TYPE = "test-label-provider";

const SURFACE_SETTINGS = [Setting.ATTRIBUTE, Setting.SURFACE_NAME, Setting.REALIZATION, Setting.SHOW_LABELS] as const;
type SurfaceSettings = typeof SURFACE_SETTINGS;
type SurfaceSettingTypes = MakeSettingTypesMap<SurfaceSettings>;
export type SurfaceStoredData = { surfaceCount: number };

/*
 * Dependency graph:
 *   global fieldId -> field catalogue (shared result, read by three bindings)
 *   catalogue -> ATTRIBUTE allowed values
 *   catalogue + ATTRIBUTE -> SURFACE_NAME allowed values, stored data "surfaceCount"
 *   fieldId + ATTRIBUTE + SURFACE_NAME -> REALIZATION allowed values (a request of its own)
 *   SHOW_LABELS -> REALIZATION attributes (realizations can't be picked while labels are shown)
 * Valid when ATTRIBUTE, SURFACE_NAME and REALIZATION are all set. SHOW_LABELS only affects the presentation,
 * so changing it does not refetch.
 */
export class SurfaceTestProvider implements CustomDataProviderImplementation<
    SurfaceSettings,
    SurfaceTestData,
    SurfaceStoredData
> {
    settings = SURFACE_SETTINGS;

    getDefaultName(): string {
        return "Test surface";
    }

    getDefaultSettingsValues(): Partial<SurfaceSettingTypes> {
        return { [Setting.SHOW_LABELS]: false };
    }

    setupBindings({ setting, storedData, makeSharedResult }: SetupBindingsContext<SurfaceSettings, SurfaceStoredData>) {
        const catalogueDep = makeSharedResult({
            debugName: "FieldCatalogue",
            read(read) {
                return { fieldId: read.globalSetting("fieldId") };
            },
            resolve({ fieldId }) {
                return getTestBackend().getFieldCatalogue(fieldId);
            },
        });

        setting(Setting.ATTRIBUTE).bindValueConstraints({
            read(read) {
                return { catalogue: read.sharedResult(catalogueDep) };
            },
            resolve({ catalogue }) {
                return Object.keys(catalogue ?? {});
            },
        });

        setting(Setting.SURFACE_NAME).bindValueConstraints({
            read(read) {
                return {
                    catalogue: read.sharedResult(catalogueDep),
                    attribute: read.localSetting(Setting.ATTRIBUTE),
                };
            },
            resolve({ catalogue, attribute }) {
                return Object.keys((attribute && catalogue?.[attribute]) || {});
            },
        });

        setting(Setting.REALIZATION).bindValueConstraints({
            read(read) {
                return {
                    fieldId: read.globalSetting("fieldId"),
                    attribute: read.localSetting(Setting.ATTRIBUTE),
                    surfaceName: read.localSetting(Setting.SURFACE_NAME),
                };
            },
            resolve({ fieldId, attribute, surfaceName }) {
                return getTestBackend().getRealizations(fieldId, attribute, surfaceName);
            },
        });

        setting(Setting.REALIZATION).bindAttributes({
            read(read) {
                return { showLabels: read.localSetting(Setting.SHOW_LABELS) };
            },
            resolve({ showLabels }) {
                return { enabled: !showLabels };
            },
        });

        storedData("surfaceCount").bindValue({
            read(read) {
                return {
                    catalogue: read.sharedResult(catalogueDep),
                    attribute: read.localSetting(Setting.ATTRIBUTE),
                };
            },
            resolve({ catalogue, attribute }) {
                return Object.keys((attribute && catalogue?.[attribute]) || {}).length;
            },
        });
    }

    areCurrentSettingsValid({
        getSetting,
    }: DataProviderAccessors<SurfaceSettings, SurfaceTestData, SurfaceStoredData>): boolean {
        return (
            getSetting(Setting.ATTRIBUTE) !== null &&
            getSetting(Setting.SURFACE_NAME) !== null &&
            getSetting(Setting.REALIZATION) !== null
        );
    }

    doSettingsChangesRequireDataRefetch(prev: SurfaceSettingTypes | null, next: SurfaceSettingTypes): boolean {
        return (
            !prev ||
            prev[Setting.ATTRIBUTE] !== next[Setting.ATTRIBUTE] ||
            prev[Setting.SURFACE_NAME] !== next[Setting.SURFACE_NAME] ||
            prev[Setting.REALIZATION] !== next[Setting.REALIZATION]
        );
    }

    fetchData({
        getSetting,
        getGlobalSetting,
        fetchQuery,
    }: FetchDataParams<SurfaceSettings, SurfaceTestData, SurfaceStoredData>): Promise<SurfaceTestData> {
        const args = [
            getGlobalSetting("fieldId") ?? "",
            getSetting(Setting.ATTRIBUTE) ?? "",
            getSetting(Setting.SURFACE_NAME) ?? "",
            getSetting(Setting.REALIZATION) ?? -1,
        ] as const;
        return fetchQuery({
            queryKey: ["testSurfaceData", ...args],
            queryFn: () => getTestBackend().getSurfaceData(...args),
        });
    }

    makeValueRange({
        getData,
    }: DataProviderAccessors<SurfaceSettings, SurfaceTestData, SurfaceStoredData>): [number, number] | null {
        const data = getData();
        if (!data) {
            return null;
        }
        return [Math.min(...data.values), Math.max(...data.values)];
    }
}

const GRID_SETTINGS = [Setting.GRID_NAME] as const;
type GridSettings = typeof GRID_SETTINGS;

// A second, simpler provider type: global fieldId -> GRID_NAME allowed values (a request of its own)
export class GridTestProvider implements CustomDataProviderImplementation<GridSettings, GridTestData> {
    settings = GRID_SETTINGS;

    getDefaultName(): string {
        return "Test grid";
    }

    setupBindings({ setting }: SetupBindingsContext<GridSettings>) {
        setting(Setting.GRID_NAME).bindValueConstraints({
            read(read) {
                return { fieldId: read.globalSetting("fieldId") };
            },
            resolve({ fieldId }) {
                return getTestBackend().getGridNames(fieldId);
            },
        });
    }

    areCurrentSettingsValid({ getSetting }: DataProviderAccessors<GridSettings, GridTestData>): boolean {
        return getSetting(Setting.GRID_NAME) !== null;
    }

    fetchData({ getSetting, getGlobalSetting, fetchQuery }: FetchDataParams<GridSettings, GridTestData>) {
        const args = [getGlobalSetting("fieldId") ?? "", getSetting(Setting.GRID_NAME) ?? ""] as const;
        return fetchQuery({
            queryKey: ["testGridData", ...args],
            queryFn: () => getTestBackend().getGridData(...args),
        });
    }
}

const LABEL_SETTINGS = [Setting.SHOW_LABELS] as const;
type LabelSettings = typeof LABEL_SETTINGS;

// A provider without any dependencies - nothing but its own construction makes it evaluate its (static) setting
export class LabelTestProvider implements CustomDataProviderImplementation<LabelSettings, LabelTestData> {
    settings = LABEL_SETTINGS;

    getDefaultName(): string {
        return "Test labels";
    }

    getDefaultSettingsValues(): Partial<MakeSettingTypesMap<LabelSettings>> {
        return { [Setting.SHOW_LABELS]: true };
    }

    setupBindings(): void {}

    fetchData({ getSetting, fetchQuery }: FetchDataParams<LabelSettings, LabelTestData>) {
        const showLabels = getSetting(Setting.SHOW_LABELS) ?? false;
        return fetchQuery({
            queryKey: ["testLabelData", showLabels],
            queryFn: () => getTestBackend().getLabelData(showLabels),
        });
    }
}

DataProviderRegistry.registerDataProvider(SURFACE_PROVIDER_TYPE, SurfaceTestProvider);
DataProviderRegistry.registerDataProvider(GRID_PROVIDER_TYPE, GridTestProvider);
DataProviderRegistry.registerDataProvider(LABEL_PROVIDER_TYPE, LabelTestProvider);
