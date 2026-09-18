import { DataProviderRegistry } from "../../dataProviders/DataProviderRegistry";
import { DataProviderType } from "../../dataProviders/dataProviderTypes";
import { GroupRegistry } from "../../groups/GroupRegistry";
import type { Item } from "../../interfacesAndTypes/entities";
import type {
    SerializedDataProvider,
    SerializedGroup,
    SerializedItem,
    SerializedContextBoundary,
    SerializedSharedSetting,
} from "../../interfacesAndTypes/serialization";
import { SerializedType } from "../../interfacesAndTypes/serialization";
import { Setting } from "../../settings/settingsDefinitions";
import { ContextBoundary } from "../ContextBoundary/ContextBoundary";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import { ErrorPlaceholder } from "../ErrorPlaceholder/ErrorPlaceholder";
import { SharedSetting } from "../SharedSetting/SharedSetting";

// Persisted `dataProviderType` values whose "attribute" setting was renamed to a dedicated key once
// Setting.ATTRIBUTE (shared with grid/seismic providers) was split apart for surfaces. The two
// Intersection provider type IDs are kept as literals - matching their registrations in
// `modules/Intersection/DataProviderFramework/customDataProviderImplementations/dataProviderTypes.ts` -
// so shared DPF code never imports from a module folder. Verified against those registrations in
// DeserializationAssistant.test.ts.
const LEGACY_SURFACE_PROVIDER_SETTING_RENAMES_BY_TYPE: Record<string, { legacyKey: string; currentKey: string }> = {
    [DataProviderType.ATTRIBUTE_STATIC_SURFACE]: {
        legacyKey: Setting.ATTRIBUTE,
        currentKey: Setting.SURFACE_ATTRIBUTE,
    },
    [DataProviderType.ATTRIBUTE_TIME_STEP_SURFACE]: {
        legacyKey: Setting.ATTRIBUTE,
        currentKey: Setting.SURFACE_ATTRIBUTE,
    },
    [DataProviderType.ATTRIBUTE_INTERVAL_SURFACE]: {
        legacyKey: Setting.ATTRIBUTE,
        currentKey: Setting.SURFACE_ATTRIBUTE,
    },
    REALIZATION_SURFACES: { legacyKey: Setting.ATTRIBUTE, currentKey: Setting.DEPTH_ATTRIBUTE },
    SURFACES_REALIZATIONS_UNCERTAINTY: { legacyKey: Setting.ATTRIBUTE, currentKey: Setting.DEPTH_ATTRIBUTE },
};

// Dispatches on the persisted dataProviderType only, never on the setting value or the mere presence
// of a legacy key. Returns a normalized copy; the caller's serialized object (which may be retained
// verbatim by ErrorPlaceholder on failure) is never mutated. Idempotent: once the legacy key has been
// moved, re-running this is a no-op.
function normalizeLegacySurfaceProviderSettings(
    serializedDataProvider: SerializedDataProvider<any>,
): SerializedDataProvider<any> {
    const rename = LEGACY_SURFACE_PROVIDER_SETTING_RENAMES_BY_TYPE[serializedDataProvider.dataProviderType];
    if (!rename || !(rename.legacyKey in serializedDataProvider.settings)) {
        return serializedDataProvider;
    }

    const settings: Record<string, string> = { ...serializedDataProvider.settings };
    if (!(rename.currentKey in settings)) {
        settings[rename.currentKey] = settings[rename.legacyKey];
    }
    delete settings[rename.legacyKey];

    return { ...serializedDataProvider, settings };
}

export class DeserializationAssistant {
    private _dataProviderManager: DataProviderManager;

    constructor(dataProviderManager: DataProviderManager) {
        this._dataProviderManager = dataProviderManager;
    }

    makeItem(serialized: SerializedItem): Item {
        if (serialized.type === SerializedType.DATA_PROVIDER_MANAGER) {
            throw new Error(
                "Cannot deserialize a DataProviderManager in DeserializationFactory. A DataProviderManager can never be a descendant of a DataProviderManager.",
            );
        }

        try {
            if (serialized.type === SerializedType.DATA_PROVIDER) {
                const serializedDataProvider = normalizeLegacySurfaceProviderSettings(
                    serialized as SerializedDataProvider<any>,
                );
                const provider = DataProviderRegistry.makeDataProvider(
                    serializedDataProvider.dataProviderType,
                    this._dataProviderManager,
                    serializedDataProvider.name,
                );
                provider.deserializeState(serializedDataProvider);
                provider.getItemDelegate().setId(serializedDataProvider.id);
                provider.getItemDelegate().setName(serializedDataProvider.name);
                return provider;
            }

            if (serialized.type === SerializedType.GROUP) {
                const serializedGroup = serialized as SerializedGroup<any>;
                const group = GroupRegistry.makeGroup(serializedGroup.groupType, this._dataProviderManager);
                group.deserializeState(serializedGroup);
                return group;
            }

            if (serialized.type === SerializedType.CONTEXT_BOUNDARY) {
                const serializedContextBoundary = serialized as SerializedContextBoundary;
                const contextBoundary = new ContextBoundary(serializedContextBoundary.name, this._dataProviderManager);
                contextBoundary.deserializeState(serializedContextBoundary);
                return contextBoundary;
            }

            if (serialized.type === SerializedType.SHARED_SETTING) {
                const serializedSharedSetting = serialized as SerializedSharedSetting;
                const setting = new SharedSetting(
                    serializedSharedSetting.wrappedSettingType,
                    serializedSharedSetting.value,
                    this._dataProviderManager,
                );
                setting.deserializeState(serializedSharedSetting);
                return setting;
            }
        } catch (error) {
            const name = serialized.name ?? "Unknown item";
            const errorMessage = `Error deserializing item '${name}' - it might have been renamed or removed: ${error instanceof Error ? error.message : String(error)}`;
            const errorPlaceholder = new ErrorPlaceholder(
                name,
                errorMessage,
                serialized as any,
                this._dataProviderManager,
            );
            return errorPlaceholder;
        }

        throw new Error(`Unhandled serialized item type: ${serialized.type}`);
    }
}
