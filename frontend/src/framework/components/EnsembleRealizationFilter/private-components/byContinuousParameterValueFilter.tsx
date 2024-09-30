import React from "react";

import { EnsembleParameters, Parameter } from "@framework/EnsembleParameters";
import { NumberRange } from "@framework/RealizationFilter";

import { isEqual } from "lodash";

// Map of parameter ident strings to value selection.
// - Continuous parameter: NumberRange
// - Discrete parameter: string[] | number[]
export type ParameterIdentStringAndValueSelectionMap = Map<string, NumberRange | string[] | number[]>;

export type ByParameterValueFilterProps = {
    ensembleParameters: EnsembleParameters;
    selectedParameterIdentStringAndValueSelectionMap: ParameterIdentStringAndValueSelectionMap;
    disabled: boolean;
    onEditedChange: (isEdited: boolean) => void;
};

export const ByContinuousParameterValueFilter: React.FC<ByParameterValueFilterProps> = (props) => {
    const [prevEnsembleParameters, setPrevEnsembleParameters] = React.useState<EnsembleParameters | null>(null);
    // const [selectedParameterIde]

    // Compare by reference to avoid unnecessary updates
    if (!isEqual(props.ensembleParameters, prevEnsembleParameters)) {
        setPrevEnsembleParameters(props.ensembleParameters);

        // Validate parameterIdent strings
        // selectedParameterIdentStringAndValueSelectionMap
    }

    return <></>;
};
