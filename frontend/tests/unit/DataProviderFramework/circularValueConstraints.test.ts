import { describe, expect, test } from "vitest";

import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { SettingRegistry } from "@modules/_shared/DataProviderFramework/settings/SettingRegistry";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

// Every module registers its providers on import - all of them are checked below
import "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/registerAllDataProviders";
import "@modules/3DViewer/DataProviderFramework/registerAllDataProviders";
import "@modules/Intersection/DataProviderFramework/customDataProviderImplementations/registerAllDataProviders";
import "@modules/WellLogViewer/DataProviderFramework/registerFrameworkExtensions";

import { makeDataProviderManager } from "../../utils/dataProviderFramework";

const MUTUAL_SETTINGS = [Setting.ATTRIBUTE, Setting.SURFACE_NAME] as const;

// The value constraints of each setting are resolved from the other one
class MutuallyResolvedProvider implements CustomDataProviderImplementation<typeof MUTUAL_SETTINGS, null> {
    settings = MUTUAL_SETTINGS;

    getDefaultName(): string {
        return "Mutually resolved";
    }

    setupBindings({ setting }: SetupBindingsContext<typeof MUTUAL_SETTINGS>) {
        setting(Setting.ATTRIBUTE).bindValueConstraints({
            read(read) {
                return { surfaceName: read.localSetting(Setting.SURFACE_NAME) };
            },
            resolve() {
                return [];
            },
        });
        setting(Setting.SURFACE_NAME).bindValueConstraints({
            read(read) {
                return { attribute: read.localSetting(Setting.ATTRIBUTE) };
            },
            resolve() {
                return [];
            },
        });
    }

    fetchData(): Promise<null> {
        return Promise.resolve(null);
    }
}

const SHARED_RESULT_SETTINGS = [Setting.SURFACE_NAME, Setting.REALIZATION] as const;

// The cycle only closes through a shared result: SURFACE_NAME <- shared result <- REALIZATION <- SURFACE_NAME
class ResolvedThroughSharedResultProvider implements CustomDataProviderImplementation<
    typeof SHARED_RESULT_SETTINGS,
    null
> {
    settings = SHARED_RESULT_SETTINGS;

    getDefaultName(): string {
        return "Resolved through a shared result";
    }

    setupBindings({ setting, makeSharedResult }: SetupBindingsContext<typeof SHARED_RESULT_SETTINGS>) {
        const realizationDep = makeSharedResult({
            debugName: "Realization",
            read(read) {
                return { realization: read.localSetting(Setting.REALIZATION) };
            },
            resolve({ realization }) {
                return realization;
            },
        });
        setting(Setting.SURFACE_NAME).bindValueConstraints({
            read(read) {
                return { realization: read.sharedResult(realizationDep) };
            },
            resolve() {
                return [];
            },
        });
        setting(Setting.REALIZATION).bindValueConstraints({
            read(read) {
                return { surfaceName: read.localSetting(Setting.SURFACE_NAME) };
            },
            resolve() {
                return [];
            },
        });
    }

    fetchData(): Promise<null> {
        return Promise.resolve(null);
    }
}

const MUTUALLY_RESOLVED_PROVIDER_TYPE = "test-mutually-resolved-provider";
const RESOLVED_THROUGH_SHARED_RESULT_PROVIDER_TYPE = "test-resolved-through-shared-result-provider";

function label(setting: Setting): string {
    return SettingRegistry.makeSetting(setting).getLabel();
}

/*
 * A setting whose value constraints are resolved from an invalid one is blocked until it is valid - settings that are
 * resolved from each other would wait for each other for good, so such bindings must be impossible to set up.
 */
describe("Circular value constraints", () => {
    test("are rejected when a provider is made, naming the settings in the cycle", () => {
        DataProviderRegistry.registerDataProvider(MUTUALLY_RESOLVED_PROVIDER_TYPE, MutuallyResolvedProvider);

        expect(() =>
            DataProviderRegistry.makeDataProvider(MUTUALLY_RESOLVED_PROVIDER_TYPE, makeDataProviderManager()),
        ).toThrow(`${label(Setting.ATTRIBUTE)} -> ${label(Setting.SURFACE_NAME)} -> ${label(Setting.ATTRIBUTE)}`);
    });

    test("are rejected when they only close through a shared result", () => {
        DataProviderRegistry.registerDataProvider(
            RESOLVED_THROUGH_SHARED_RESULT_PROVIDER_TYPE,
            ResolvedThroughSharedResultProvider,
        );

        expect(() =>
            DataProviderRegistry.makeDataProvider(
                RESOLVED_THROUGH_SHARED_RESULT_PROVIDER_TYPE,
                makeDataProviderManager(),
            ),
        ).toThrow(`${label(Setting.SURFACE_NAME)} -> ${label(Setting.REALIZATION)} -> ${label(Setting.SURFACE_NAME)}`);
    });

    // Acts as a lint rule: every provider the modules register must be possible to make
    test.each(
        DataProviderRegistry.getRegisteredDataProviderTypes().filter(
            (type) => type !== MUTUALLY_RESOLVED_PROVIDER_TYPE && type !== RESOLVED_THROUGH_SHARED_RESULT_PROVIDER_TYPE,
        ),
    )("are not used by the registered provider %s", (type) => {
        const provider = DataProviderRegistry.makeDataProvider(type, makeDataProviderManager());
        provider.beforeDestroy();
    });
});
