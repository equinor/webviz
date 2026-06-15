import React from "react";

import { isEqual } from "lodash";

import { CheckboxCompositions } from "@lib/newComponents/Checkbox/compositions";

import type { PressureDependentVariable } from "../../../typesAndEnums";
import { PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME } from "../../../typesAndEnums";

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
                    <CheckboxCompositions.WithLabel
                        key={variable}
                        label={PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME[variable]}
                        checked={selectedVariables.includes(variable)}
                        onCheckedChange={(checked) => handleSelectionChange(variable, checked)}
                        size="small"
                    />
                );
            })}
        </div>
    );
}
