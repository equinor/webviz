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
import { TimeType } from "../../settings/implementations/TimeTypeSetting";
import { Setting } from "../../settings/settingsDefinitions";
import { ContextBoundary } from "../ContextBoundary/ContextBoundary";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import { ErrorPlaceholder } from "../ErrorPlaceholder/ErrorPlaceholder";
import { SharedSetting } from "../SharedSetting/SharedSetting";

// Rewrites serialized settings in place; an existing current key always wins over the legacy one.
type LegacySettingsMigration = (settings: Record<string, string>) => void;

function renameSettingKey(legacyKey: string, currentKey: string): LegacySettingsMigration {
    return (settings) => {
        if (!(legacyKey in settings)) {
            return;
        }
        if (!(currentKey in settings)) {
            settings[currentKey] = settings[legacyKey];
        }
        delete settings[legacyKey];
    };
}

// Grid providers replaced the combined time-or-interval setting with a time type plus one value setting per type.
function splitLegacyTimeOrInterval(settings: Record<string, string>): void {
    if (!(Setting.TIME_OR_INTERVAL in settings)) {
        return;
    }

    const legacyValue: unknown = JSON.parse(settings[Setting.TIME_OR_INTERVAL]);
    delete settings[Setting.TIME_OR_INTERVAL];

    if (Setting.TIME_TYPE in settings || typeof legacyValue !== "string") {
        return;
    }

    if (legacyValue === "NO_TIME") {
        settings[Setting.TIME_TYPE] = JSON.stringify(TimeType.NO_TIME);
    } else if (legacyValue.includes("/")) {
        settings[Setting.TIME_TYPE] = JSON.stringify(TimeType.INTERVAL);
        settings[Setting.TIME_INTERVAL] = JSON.stringify(legacyValue);
    } else {
        settings[Setting.TIME_TYPE] = JSON.stringify(TimeType.TIME_POINT);
        settings[Setting.TIME_POINT] = JSON.stringify(legacyValue);
    }
}

// Module-specific provider types are literals so shared DPF code does not import from a module folder.
const LEGACY_SETTINGS_MIGRATIONS_BY_PROVIDER_TYPE: Record<string, LegacySettingsMigration> = {
    [DataProviderType.ATTRIBUTE_STATIC_SURFACE]: renameSettingKey(Setting.ATTRIBUTE, Setting.SURFACE_ATTRIBUTE),
    [DataProviderType.ATTRIBUTE_TIME_STEP_SURFACE]: renameSettingKey(Setting.ATTRIBUTE, Setting.SURFACE_ATTRIBUTE),
    [DataProviderType.ATTRIBUTE_INTERVAL_SURFACE]: renameSettingKey(Setting.ATTRIBUTE, Setting.SURFACE_ATTRIBUTE),
    REALIZATION_SURFACES: renameSettingKey(Setting.ATTRIBUTE, Setting.DEPTH_ATTRIBUTE),
    SURFACES_REALIZATIONS_UNCERTAINTY: renameSettingKey(Setting.ATTRIBUTE, Setting.DEPTH_ATTRIBUTE),
    [DataProviderType.INTERSECTION_REALIZATION_GRID]: splitLegacyTimeOrInterval,
    [DataProviderType.INTERSECTION_WITH_WELLBORE_EXTENSION_REALIZATION_GRID]: splitLegacyTimeOrInterval,
    REALIZATION_GRID_2D: splitLegacyTimeOrInterval,
    REALIZATION_GRID_3D: splitLegacyTimeOrInterval,
};

// Returns a copy; the input may be retained verbatim by ErrorPlaceholder on failure.
function normalizeLegacyProviderSettings(
    serializedDataProvider: SerializedDataProvider<any>,
): SerializedDataProvider<any> {
    const migrate = LEGACY_SETTINGS_MIGRATIONS_BY_PROVIDER_TYPE[serializedDataProvider.dataProviderType];
    if (!migrate) {
        return serializedDataProvider;
    }

    const settings: Record<string, string> = { ...serializedDataProvider.settings };
    migrate(settings);
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
