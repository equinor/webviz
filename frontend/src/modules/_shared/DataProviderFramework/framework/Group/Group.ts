import { isDevMode } from "@lib/utils/devMode";

import { GroupDelegate } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SharedSettingsDelegate } from "../../delegates/SharedSettingsDelegate";
import type { GroupType } from "../../groups/groupTypes";
import type {
    CustomGroupImplementation,
    CustomGroupImplementationWithSettings,
} from "../../interfacesAndTypes/customGroupImplementation";
import { includesSettings } from "../../interfacesAndTypes/customGroupImplementation";
import type { ItemGroup } from "../../interfacesAndTypes/entities";
import type { SerializedGroup } from "../../interfacesAndTypes/serialization";
import { SerializedType } from "../../interfacesAndTypes/serialization";
import type { SettingsKeysFromTuple } from "../../interfacesAndTypes/utils";
import type { MakeSettingTypesMap, SettingTypes, Settings } from "../../settings/settingsDefinitions";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import type { SettingManager } from "../SettingManager/SettingManager";
import { makeSettings } from "../utils/makeSettings";

export function isGroup(obj: any): obj is Group {
    if (!isDevMode()) {
        return obj instanceof Group;
    }

    if (typeof obj !== "object" || obj === null) {
        return false;
    }

    if (obj.constructor.name !== "Group") {
        return false;
    }

    const group: Group = obj as Group;

    return Object.hasOwn(group, "getGroupType") && Object.hasOwn(group, "getGroupDelegate");
}

export type GroupParams<
    TSettingTypes extends Settings,
    TSettings extends MakeSettingTypesMap<TSettingTypes> = MakeSettingTypesMap<TSettingTypes>,
> = {
    dataProviderManager: DataProviderManager;
    color?: string;
    type: GroupType;
    customGroupImplementation:
        | CustomGroupImplementation
        | CustomGroupImplementationWithSettings<TSettingTypes, TSettings>;
};

export class Group<
    TSettings extends Settings = [],
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> implements ItemGroup
{
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _type: GroupType;
    private _icon: React.ReactNode | null = null;
    private _emptyContentMessage: string | null = null;
    private _sharedSettingsDelegate: SharedSettingsDelegate<TSettings, TSettingKey> | null = null;

    constructor(params: GroupParams<TSettings, TSettingTypes>) {
        const { dataProviderManager, customGroupImplementation, type } = params;
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.setColor(dataProviderManager.makeGroupColor());
        this._itemDelegate = new ItemDelegate(customGroupImplementation.getDefaultName(), 1, dataProviderManager);
        if (includesSettings(customGroupImplementation)) {
            this._sharedSettingsDelegate = new SharedSettingsDelegate<TSettings, TSettingKey>(
                this,
                makeSettings<TSettings, TSettingTypes, TSettingKey>(
                    customGroupImplementation.settings as unknown as TSettings,
                    customGroupImplementation.getDefaultSettingsValues() as unknown as TSettingTypes,
                ),
            );
        }
        this._type = type;
        this._emptyContentMessage = customGroupImplementation.getEmptyContentMessage
            ? customGroupImplementation.getEmptyContentMessage()
            : null;
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    getIcon(): React.ReactNode {
        return this._icon;
    }

    getEmptyContentMessage(): string | null {
        return this._emptyContentMessage;
    }

    getSharedSettingsDelegate(): SharedSettingsDelegate<TSettings, TSettingKey> | null {
        return this._sharedSettingsDelegate;
    }

    getWrappedSettings(): { [K in TSettingKey]: SettingManager<K, SettingTypes[K]> } {
        if (!this._sharedSettingsDelegate) {
            throw new Error("Group does not have shared settings.");
        }
        return this._sharedSettingsDelegate.getWrappedSettings();
    }

    getGroupType(): GroupType {
        return this._type;
    }

    serializeState(): SerializedGroup {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.GROUP,
            groupType: this._type,
            color: this._groupDelegate.getColor() ?? "",
            children: this._groupDelegate.serializeChildren(),
        };
    }

    deserializeState(serialized: SerializedGroup) {
        this._itemDelegate.deserializeState(serialized);
        this._groupDelegate.setColor(serialized.color);
        this._groupDelegate.deserializeChildren(serialized.children);
    }
}
