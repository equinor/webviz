import React from "react";

import { SettingConfigButton } from "@lib/components/SettingConfigButton";
import type { SimplifiedWellboreHeader } from "@lib/utils/wellboreTypes";
import { WellboreSelectionForm } from "@modules/_shared/components/WellboreSelectionForm/wellboreSelectionForm";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = SimplifiedWellboreHeader[] | null;

export class DrilledWellboresSetting implements CustomSettingImplementation<ValueType, SettingCategory.MULTI_SELECT> {
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Drilled wellbores";
    }

    fixupValue(
        currentValue: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.MULTI_SELECT>,
    ): ValueType {
        if (!currentValue) {
            return [];
        }

        const matchingValues = currentValue.filter((value) =>
            availableValues.some((availableValue) => availableValue.wellboreUuid === value.wellboreUuid),
        );
        if (matchingValues.length === 0) {
            return availableValues;
        }
        return matchingValues;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) => React.ReactNode {
        return function DrilledWellbores(props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) {
            // Available values are already simplified wellbore headers from the provider
            const availableValues = props.availableValues ?? [];
            const currentSelection = props.value ?? [];

            const selectedCount = currentSelection.length;
            const totalCount = availableValues.length;

            const [localFormValue, setLocalFormValue] = React.useState<SimplifiedWellboreHeader[]>([]);

            function handleConfigOpen() {
                setLocalFormValue([...currentSelection]);
            }

            function handleApplyConfig() {
                props.onValueChange(localFormValue);
            }

            function handleDiscardConfig() {
                setLocalFormValue([]);
            }

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <SettingConfigButton
                        className="w-full"
                        size="medium"
                        formTitle="Select wellbores"
                        modalWidth="1200px"
                        modalHeight="80vh"
                        formContent={
                            <WellboreSelectionForm
                                selectedWellbores={localFormValue}
                                availableWellbores={availableValues}
                                onSelectionChange={setLocalFormValue}
                                onFormSubmit={handleApplyConfig}
                            />
                        }
                        onOpen={handleConfigOpen}
                        onDiscard={handleDiscardConfig}
                        onApply={handleApplyConfig}
                    >
                        {selectedCount === 0
                            ? "Select wellbores..."
                            : `${selectedCount} of ${totalCount} wellbores selected`}
                    </SettingConfigButton>
                </div>
            );
        };
    }
}
