import { GroupDelegate } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import { SettingsContextDelegate } from "../../delegates/SettingsContextDelegate";
import {
    CustomGroupImplementation,
    CustomGroupImplementationWithSettings,
    CustomSettingsHandler,
    SerializedGroup,
    SerializedType,
    Settings,
    StoredData,
    includesCustomSettingsHandler,
} from "../../interfaces";
import { MakeSettingTypesMap } from "../../settings/settingsTypes";
import { DataLayerManager } from "../DataLayerManager/DataLayerManager";
import { Setting } from "../Setting/Setting";
import { makeSettings } from "../utils/makeSettings";

export type GroupParams<
    TSettingTypes extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettings extends MakeSettingTypesMap<TSettingTypes> = MakeSettingTypesMap<TSettingTypes>
> = {
    layerManager: DataLayerManager;
    color?: string;
    type: string;
    customGroupImplementation:
        | CustomGroupImplementation<TSettingTypes, TStoredData, TSettings>
        | CustomGroupImplementationWithSettings<TSettingTypes, TStoredData, TSettings>;
};

export class Group<
    TSettingTypes extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettings extends MakeSettingTypesMap<TSettingTypes> = MakeSettingTypesMap<TSettingTypes>
> {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _type: string;
    private _settingsContextDelegate: SettingsContextDelegate<TSettingTypes, TSettings, TStoredData> | null = null;

    constructor(params: GroupParams<TSettingTypes, TStoredData, TSettings>) {
        const { layerManager, customGroupImplementation, color = null, type } = params;
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.setColor(color);
        this._itemDelegate = new ItemDelegate(customGroupImplementation.getDefaultName(), 1, layerManager);
        if (includesCustomSettingsHandler(customGroupImplementation)) {
            this._settingsContextDelegate = new SettingsContextDelegate<TSettingTypes, TSettings, TStoredData>(
                customGroupImplementation as unknown as CustomSettingsHandler<TSettingTypes, TStoredData, TSettings>,
                layerManager,
                makeSettings(
                    customGroupImplementation.settings,
                    customGroupImplementation.getDefaultSettingsValues()
                ) as {
                    [key in keyof TSettings]: Setting<any>;
                }
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

    getSettingsContextDelegate() {
        return this._settingsContextDelegate;
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
