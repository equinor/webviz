import React from "react";

import type { WellboreHeader_api } from "@api";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = WellboreHeader_api[] | null;

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
            return availableValues;
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
            const availableValues = props.availableValues ?? [];

            const options: SelectOption[] = availableValues?.map((ident) => ({
                value: ident.wellboreUuid,
                label: ident.uniqueWellboreIdentifier,
            }));

            function handleChange(selectedUuids: string[]) {
                const selectedWellbores = availableValues.filter((ident) => selectedUuids.includes(ident.wellboreUuid));
                props.onValueChange(selectedWellbores);
            }

            const selectedValues = React.useMemo(
                () => props.value?.map((ident) => ident.wellboreUuid) ?? [],
                [props.value],
            );

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <Select
                        filter
                        options={options}
                        value={selectedValues}
                        onChange={handleChange}
                        showQuickSelectButtons={true}
                        disabled={props.isOverridden}
                        multiple={true}
                        size={5}
                    />
                </div>
            );
        };
    }
}
