import { GroupDelegate } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SharedSettingsDelegate } from "../../delegates/SharedSettingsDelegate";
import {
    CustomGroupImplementation,
    CustomGroupImplementationWithSettings,
    includesSettings,
} from "../../interfacesAndTypes/customGroupImplementation";
import { ItemGroup } from "../../interfacesAndTypes/entitites";
import { SerializedGroup, SerializedType } from "../../interfacesAndTypes/serialization";
import { SettingsKeysFromTuple } from "../../interfacesAndTypes/utils";
import { MakeSettingTypesMap, SettingTypes, Settings } from "../../settings/settingsDefinitions";
import { DataLayerManager } from "../DataLayerManager/DataLayerManager";
import { SettingManager } from "../SettingManager/SettingManager";
import { makeSettings } from "../utils/makeSettings";

export type GroupParams<
    TSettingTypes extends Settings,
    TSettings extends MakeSettingTypesMap<TSettingTypes> = MakeSettingTypesMap<TSettingTypes>
> = {
    layerManager: DataLayerManager;
    color?: string;
    type: string;
    customGroupImplementation:
        | CustomGroupImplementation
        | CustomGroupImplementationWithSettings<TSettingTypes, TSettings>;
};

export class Group<
    TSettings extends Settings = [],
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>
> implements ItemGroup
{
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _type: string;
    private _sharedSettingsDelegate: SharedSettingsDelegate<TSettings, TSettingKey> | null = null;

    constructor(params: GroupParams<TSettings, TSettingTypes>) {
        const { layerManager, customGroupImplementation, type } = params;
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.setColor(layerManager.makeGroupColor());
        this._itemDelegate = new ItemDelegate(customGroupImplementation.getDefaultName(), 1, layerManager);
        if (includesSettings(customGroupImplementation)) {
            this._sharedSettingsDelegate = new SharedSettingsDelegate<TSettings, TSettingKey>(
                this,
                makeSettings<TSettings, TSettingTypes, TSettingKey>(
                    customGroupImplementation.settings as unknown as TSettings,
                    customGroupImplementation.getDefaultSettingsValues() as unknown as TSettingTypes
                )
            );
        }
        this._type = type;
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
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

    getGroupType(): string {
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
