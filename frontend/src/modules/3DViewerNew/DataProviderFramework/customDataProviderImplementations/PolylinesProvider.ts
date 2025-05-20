import type { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import type {
    CustomDataProviderImplementation,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { type MakeSettingTypesMap, Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

const polylinesSettings = [Setting.POLYLINES] as const;
export type PolylinesSettings = typeof polylinesSettings;
type SettingsWithTypes = MakeSettingTypesMap<PolylinesSettings>;

export type PolylinesData = IntersectionPolyline[] | null;

export class PolylinesProvider implements CustomDataProviderImplementation<PolylinesSettings, PolylinesData> {
    settings = polylinesSettings;

    getDefaultName(): string {
        return "Custom Polylines";
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    doSettingsChangesRequireDataRefetch(_: SettingsWithTypes, __: SettingsWithTypes): boolean {
        return true;
    }

    fetchData({
        getSetting,
        getGlobalSetting,
    }: FetchDataParams<PolylinesSettings, PolylinesData>): Promise<PolylinesData> {
        const polylines = getSetting(Setting.POLYLINES);
        const allPolylines = getGlobalSetting("intersectionPolylines");

        if (polylines === null) {
            return Promise.resolve(null);
        }

        if (allPolylines === null) {
            return Promise.resolve(null);
        }

        return new Promise((resolve, reject) => {
            if (!polylines) {
                reject(new Error("No polylines provided"));
                return;
            }

            const polylinesData = allPolylines.filter((polyline) => {
                return polylines.some((selectedPolyline) => selectedPolyline.value === polyline.id);
            });

            resolve(polylinesData);
        });
    }

    defineDependencies({ availableSettingsUpdater }: DefineDependenciesArgs<PolylinesSettings>): void {
        availableSettingsUpdater(Setting.POLYLINES, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const allPolylines = getGlobalSetting("intersectionPolylines");

            const localPolylines = allPolylines.filter((polyline) => {
                return polyline.fieldId === fieldIdentifier;
            });

            return localPolylines.map((polyline) => ({
                value: polyline.id,
                label: polyline.name,
            }));
        });
    }
}
