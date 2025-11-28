import React from "react";

import { SettingConfigButton } from "@lib/components/SettingConfigButton";

import type { DepthFilterConfig } from "../../../components/DepthFilterDialog";
import { DepthFilterForm } from "../../../components/DepthFilterDialog";
import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = DepthFilterConfig | null;

export class DepthFilterSetting implements CustomSettingImplementation<ValueType, SettingCategory.STATIC> {
    defaultValue: ValueType = {};

    getLabel(): string {
        return "Depth Filter";
    }

    getIsStatic(): boolean {
        return true;
    }

    isValueValid(): boolean {
        return true; // Static settings are always valid
    }

    fixupValue(currentValue: ValueType): ValueType {
        // For static settings, just return the current value or default
        return currentValue ?? this.defaultValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value || {});
    }

    deserializeValue(serializedValue: string): ValueType {
        try {
            return JSON.parse(serializedValue);
        } catch {
            return this.defaultValue;
        }
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.STATIC>) => React.ReactNode {
        return function DepthFilter(props: SettingComponentProps<ValueType, SettingCategory.STATIC>) {
            const [localFormValue, setLocalFormValue] = React.useState<DepthFilterConfig>({});

            const currentSettings = props.value ?? {};

            function handleConfigOpen() {
                setLocalFormValue(currentSettings);
            }

            function handleApplyConfig() {
                props.onValueChange(localFormValue);
            }

            function handleDiscardConfig() {
                setLocalFormValue({});
            }

            // Create a summary of active settings
            const getSettingsSummary = () => {
                const activeSetting = [];

                if (currentSettings.tvdCutoffAbove !== undefined) {
                    activeSetting.push(`Above: ${currentSettings.tvdCutoffAbove}m`);
                }
                if (currentSettings.tvdCutoffBelow !== undefined) {
                    activeSetting.push(`Below: ${currentSettings.tvdCutoffBelow}m`);
                }

                if (activeSetting.length === 0) {
                    return "Configure TVD filter...";
                }

                return activeSetting.join(", ");
            };

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <SettingConfigButton
                        className="w-full"
                        size="medium"
                        formTitle="Depth Filter Settings"
                        formContent={
                            <DepthFilterForm
                                value={localFormValue}
                                onValueChange={setLocalFormValue}
                                onFormSubmit={handleApplyConfig}
                            />
                        }
                        onOpen={handleConfigOpen}
                        onDiscard={handleDiscardConfig}
                        onApply={handleApplyConfig}
                    >
                        {getSettingsSummary()}
                    </SettingConfigButton>
                </div>
            );
        };
    }
}
