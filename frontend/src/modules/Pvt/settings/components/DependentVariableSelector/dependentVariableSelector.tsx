import React from "react";

import { Checkbox } from "@lib/components/Checkbox";

import { isEqual } from "lodash";

import { PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME, PressureDependentVariable } from "../../../typesAndEnums";

export type DependentVariableSelectorProps = {
    dependentVariables: PressureDependentVariable[];
    value: PressureDependentVariable[];
    onChange: (selectedPlots: string[]) => void;
};

export function DependentVariableSelector(props: DependentVariableSelectorProps): JSX.Element {
    const [selectedVariables, setSelectedVariables] = React.useState<PressureDependentVariable[]>(props.value);
    const [prevValue, setPrevValue] = React.useState<PressureDependentVariable[]>(props.value);

    if (!isEqual(props.value, prevValue)) {
        setSelectedVariables(props.value);
        setPrevValue(props.value);
    }

    function handleSelectionChange(variable: PressureDependentVariable, checked: boolean) {
        const newSelectedPlots = [];
        if (checked) {
            newSelectedPlots.push(...selectedVariables, variable);
        } else {
            newSelectedPlots.push(...selectedVariables.filter((selectedPlot) => selectedPlot !== variable));
        }
        setSelectedVariables(newSelectedPlots);
        props.onChange(newSelectedPlots);
    }

    return (
        <div className="flex flex-col">
            {props.dependentVariables.map((variable) => {
                return (
                    <Checkbox
                        key={variable}
                        label={PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME[variable]}
                        checked={selectedVariables.includes(variable)}
                        onChange={(_, checked) => handleSelectionChange(variable, checked)}
                    />
                );
            })}
        </div>
    );
}
