import { GroupDelegate } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SharedSettingsDelegate } from "../../delegates/SharedSettingsDelegate";
import {
    CustomGroupImplementation,
    CustomGroupImplementationWithSettings,
    ItemGroup,
    SerializedGroup,
    SerializedType,
    Settings,
    includesSettings,
} from "../../interfaces";
import { MakeSettingTuple, MakeSettingTypesMap } from "../../settings/settingsTypes";
import { DataLayerManager } from "../DataLayerManager/DataLayerManager";
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
    TSettingTypes extends Settings,
    TSettings extends MakeSettingTypesMap<TSettingTypes> = MakeSettingTypesMap<TSettingTypes>
> implements ItemGroup
{
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _type: string;
    private _sharedSettingsDelegate: SharedSettingsDelegate<TSettingTypes> | null = null;

    constructor(params: GroupParams<TSettingTypes, TSettings>) {
        const { layerManager, customGroupImplementation, type } = params;
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.setColor(layerManager.makeGroupColor());
        this._itemDelegate = new ItemDelegate(customGroupImplementation.getDefaultName(), 1, layerManager);
        if (includesSettings(customGroupImplementation)) {
            this._sharedSettingsDelegate = new SharedSettingsDelegate<TSettingTypes>(
                Object.values(
                    makeSettings(
                        customGroupImplementation.settings,
                        customGroupImplementation.getDefaultSettingsValues()
                    )
                ) as MakeSettingTuple<TSettingTypes>,
                this
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

    getSharedSettingsDelegate(): SharedSettingsDelegate<TSettingTypes> | null {
        return this._sharedSettingsDelegate;
    }

    getWrappedSettings(): MakeSettingTuple<TSettingTypes> {
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
