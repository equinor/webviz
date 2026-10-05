import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import {
    type SerializedContextBoundary,
    type SerializedDataProvider,
    type SerializedDataProviderManager,
    type SerializedGroup,
    type SerializedItem,
    type SerializedSharedSetting,
    SerializedType,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { GRID_PROVIDER_TYPE, SURFACE_PROVIDER_TYPE } from "./testProviders";

/*
 * Builders for serialized item trees - restored with DataProviderManager.deserializeState(), the same way a saved
 * session is. Item names double as ids, so they have to be unique within a tree.
 * Settings that are left out have no persisted value.
 */

type ItemOptions = { visible?: boolean };

function makeItem<TType extends SerializedType>(type: TType, name: string, options: ItemOptions) {
    return { id: name, type, name, expanded: true, visible: options.visible ?? true };
}

function serializeSettings(values: Partial<Record<Setting, unknown>>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(values)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, JSON.stringify(value)]),
    );
}

export function surfaceProvider(
    name: string,
    values: {
        attribute?: string | null;
        surfaceName?: string | null;
        realization?: number | null;
        showLabels?: boolean;
    } = {},
    options: ItemOptions = {},
): SerializedDataProvider<any> {
    return {
        ...makeItem(SerializedType.DATA_PROVIDER, name, options),
        dataProviderType: SURFACE_PROVIDER_TYPE,
        settings: serializeSettings({
            [Setting.ATTRIBUTE]: values.attribute,
            [Setting.SURFACE_NAME]: values.surfaceName,
            [Setting.REALIZATION]: values.realization,
            [Setting.SHOW_LABELS]: values.showLabels,
        }),
    };
}

export function gridProvider(
    name: string,
    values: { gridName?: string | null } = {},
    options: ItemOptions = {},
): SerializedDataProvider<any> {
    return {
        ...makeItem(SerializedType.DATA_PROVIDER, name, options),
        dataProviderType: GRID_PROVIDER_TYPE,
        settings: serializeSettings({ [Setting.GRID_NAME]: values.gridName }),
    };
}

export function view(name: string, children: SerializedItem[], options: ItemOptions = {}): SerializedGroup<any> {
    return {
        ...makeItem(SerializedType.GROUP, name, options),
        groupType: GroupType.VIEW,
        color: `color-of-${name}`,
        settings: {},
        children,
    };
}

export function boundary(
    name: string,
    children: SerializedItem[],
    options: ItemOptions = {},
): SerializedContextBoundary {
    return { ...makeItem(SerializedType.CONTEXT_BOUNDARY, name, options), children };
}

export function sharedSetting(
    name: string,
    setting: Setting,
    value: unknown = null,
    options: ItemOptions = {},
): SerializedSharedSetting {
    return {
        ...makeItem(SerializedType.SHARED_SETTING, name, options),
        wrappedSettingType: setting,
        value: JSON.stringify(value),
    };
}

export function managerState(children: SerializedItem[]): SerializedDataProviderManager {
    return { ...makeItem(SerializedType.DATA_PROVIDER_MANAGER, "Manager", {}), children };
}
