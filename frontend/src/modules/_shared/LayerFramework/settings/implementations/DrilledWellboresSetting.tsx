import React from "react";

import { WellboreHeader_api } from "@api";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Select, SelectOption } from "@lib/components/Select";
import { Deselect, SelectAll } from "@mui/icons-material";

import { AvailableValuesType, CustomSettingImplementation, SettingComponentProps } from "../../interfaces";

type ValueType = WellboreHeader_api[] | null;

export class DrilledWellboresSetting implements CustomSettingImplementation<ValueType> {
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Drilled wellbores";
    }

    fixupValue(availableValues: AvailableValuesType<ValueType>, currentValue: ValueType): ValueType {
        if (!currentValue) {
            return availableValues;
        }

        const matchingValues = currentValue.filter((value) =>
            availableValues.some((availableValue) => availableValue.wellboreUuid === value.wellboreUuid)
        );
        if (matchingValues.length === 0) {
            return availableValues;
        }
        return matchingValues;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function DrilledWellbores(props: SettingComponentProps<ValueType>) {
            const options: SelectOption[] = React.useMemo(
                () =>
                    props.availableValues.map((ident) => ({
                        value: ident.wellboreUuid,
                        label: ident.uniqueWellboreIdentifier,
                    })),
                [props.availableValues]
            );

            function handleChange(selectedUuids: string[]) {
                const selectedWellbores = props.availableValues.filter((ident) =>
                    selectedUuids.includes(ident.wellboreUuid)
                );
                props.onValueChange(selectedWellbores);
            }

            function selectAll() {
                const allUuids = props.availableValues.map((ident) => ident.wellboreUuid);
                handleChange(allUuids);
            }

            function selectNone() {
                handleChange([]);
            }

            const selectedValues = React.useMemo(
                () => props.value?.map((ident) => ident.wellboreUuid) ?? [],
                [props.value]
            );

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-2">
                        <DenseIconButton onClick={selectAll} title="Select all">
                            <SelectAll fontSize="inherit" />
                            Select all
                        </DenseIconButton>
                        <DenseIconButton onClick={selectNone} title="Clear selection">
                            <Deselect fontSize="inherit" />
                            Clear selection
                        </DenseIconButton>
                    </div>
                    <Select
                        filter
                        options={options}
                        value={selectedValues}
                        onChange={handleChange}
                        disabled={props.isOverridden}
                        multiple={true}
                        size={5}
                    />
                </div>
            );
        };
    }
}
