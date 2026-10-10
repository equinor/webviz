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

// Renamed setting keys per persisted provider type (legacy key -> current key).
// Intersection provider types are literals so shared DPF code does not import from a module folder.
const LEGACY_SETTING_RENAMES_BY_PROVIDER_TYPE: Record<string, Record<string, string>> = {
    [DataProviderType.ATTRIBUTE_STATIC_SURFACE]: { [Setting.ATTRIBUTE]: Setting.SURFACE_ATTRIBUTE },
    [DataProviderType.ATTRIBUTE_TIME_STEP_SURFACE]: { [Setting.ATTRIBUTE]: Setting.SURFACE_ATTRIBUTE },
    [DataProviderType.ATTRIBUTE_INTERVAL_SURFACE]: { [Setting.ATTRIBUTE]: Setting.SURFACE_ATTRIBUTE },
    REALIZATION_SURFACES: { [Setting.ATTRIBUTE]: Setting.DEPTH_ATTRIBUTE },
    SURFACES_REALIZATIONS_UNCERTAINTY: { [Setting.ATTRIBUTE]: Setting.DEPTH_ATTRIBUTE },
};

// Returns a copy; the input may be retained verbatim by ErrorPlaceholder on failure.
function normalizeLegacyProviderSettings(
    serializedDataProvider: SerializedDataProvider<any>,
): SerializedDataProvider<any> {
    const renames = LEGACY_SETTING_RENAMES_BY_PROVIDER_TYPE[serializedDataProvider.dataProviderType];
    if (!renames) {
        return serializedDataProvider;
    }

    const settings: Record<string, string> = { ...serializedDataProvider.settings };
    let changed = false;
    for (const [legacyKey, currentKey] of Object.entries(renames)) {
        if (!(legacyKey in settings)) {
            continue;
        }
        if (!(currentKey in settings)) {
            settings[currentKey] = settings[legacyKey];
        }
        delete settings[legacyKey];
        changed = true;
    }

    return changed ? { ...serializedDataProvider, settings } : serializedDataProvider;
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
                const serializedDataProvider = normalizeLegacyProviderSettings(
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
