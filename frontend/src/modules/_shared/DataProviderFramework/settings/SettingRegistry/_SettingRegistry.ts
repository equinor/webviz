import { SettingManager } from "../../framework/SettingManager/SettingManager";
import type {
    CustomSettingImplementation,
    DynamicSettingImplementation,
    StaticSettingImplementation,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { Setting, SettingTypeDefinitions } from "../settingsDefinitions";

export class SettingRegistry {
    private static _registeredSettings: Map<
        Setting,
        {
            label: string;
            customSettingImplementation: {
                new (
                    customConstructorParameters?: any,
                ): StaticSettingImplementation<any, any> | DynamicSettingImplementation<any, any, any>;
            };
            customConstructorParameters?: any;
        }
    > = new Map();

    static registerSetting<
        TSetting extends Setting,
        TSettingDef extends SettingTypeDefinitions[TSetting] = SettingTypeDefinitions[TSetting],
        TSettingImpl extends new (
            ...args: any
        ) =>
            | StaticSettingImplementation<TSettingDef["internalValue"], TSettingDef["externalValue"]>
            | DynamicSettingImplementation<
                  TSettingDef["internalValue"],
                  TSettingDef["externalValue"],
                  TSettingDef["valueConstraints"]
              > = {
            new (
                params?: any,
            ): CustomSettingImplementation<
                TSettingDef["internalValue"],
                TSettingDef["externalValue"],
                TSettingDef["valueConstraints"]
            >;
        },
    >(
        type: TSetting,
        label: string,
        customSettingImplementation: TSettingImpl,
        options?: {
            customConstructorParameters?: ConstructorParameters<TSettingImpl>;
        },
    ): void {
        if (this._registeredSettings.has(type)) {
            throw new Error(`Setting ${type} already registered`);
        }
        this._registeredSettings.set(type, {
            label,
            customSettingImplementation,
            customConstructorParameters: options?.customConstructorParameters,
        });
    }

    static makeSetting<TSetting extends Setting>(
        type: TSetting,
        defaultValue?: SettingTypeDefinitions[TSetting]["internalValue"],
    ): SettingManager<TSetting> {
        const stored = this._registeredSettings.get(type);
        if (!stored) {
            throw new Error(`Setting ${type} not found`);
        }
        const customSettingImpl = new stored.customSettingImplementation(...(stored.customConstructorParameters ?? []));

        return new SettingManager<TSetting>({
            type,
            label: stored.label,
            defaultValue: defaultValue ?? customSettingImpl.defaultValue ?? null,
            customSettingImplementation: customSettingImpl as CustomSettingImplementation<
                SettingTypeDefinitions[TSetting]["internalValue"] | null,
                SettingTypeDefinitions[TSetting]["externalValue"] | null,
                SettingTypeDefinitions[TSetting]["valueConstraints"]
            >,
        });
    }
}
