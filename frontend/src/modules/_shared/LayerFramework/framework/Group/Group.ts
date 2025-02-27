import { GroupDelegate } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SettingsContextDelegate } from "../../delegates/SettingsContextDelegate";
import {
    CustomGroupImplementation,
    SerializedGroup,
    SerializedType,
    Setting,
    Settings,
    StoredData,
} from "../../interfaces";
import { AllSettingTypes, MakeSettingTypesMap } from "../../settings/settingsTypes";
import { DataLayerManager } from "../DataLayerManager/DataLayerManager";
import { makeSettings } from "../utils/makeSettings";

export type GroupParams<
    TSettingTypes extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettings extends Partial<AllSettingTypes> = MakeSettingTypesMap<TSettingTypes>
> = {
    name: string;
    layerManager: DataLayerManager;
    color?: string | null;
    type?: string;
    customGroupImplementation?: CustomGroupImplementation<TSettingTypes, TStoredData, TSettings>;
};

export class Group<
    TSettingTypes extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettings extends Partial<AllSettingTypes> = MakeSettingTypesMap<TSettingTypes>
> {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _groupName: string;
    private _settingsContextDelegate: SettingsContextDelegate<TSettingTypes, TSettings, TStoredData> | null = null;

    constructor(params: GroupParams<TSettingTypes, TStoredData, TSettings>) {
        const { name, layerManager, customGroupImplementation, color = null, type = "default" } = params;
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.setColor(color);
        this._itemDelegate = new ItemDelegate(name, layerManager);
        if (customGroupImplementation) {
            this._settingsContextDelegate = new SettingsContextDelegate<TSettingTypes, TSettings, TStoredData>(
                customGroupImplementation,
                layerManager,
                makeSettings(customGroupImplementation.settings) as { [key in keyof TSettings]: Setting<any> }
            );
        }
        this._groupName = type;
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    getSettingsContextDelegate() {
        return this._settingsContextDelegate;
    }

    getGroupName(): string {
        return this._groupName;
    }

    serializeState(): SerializedGroup {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.GROUP,
            groupName: this._groupName,
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
