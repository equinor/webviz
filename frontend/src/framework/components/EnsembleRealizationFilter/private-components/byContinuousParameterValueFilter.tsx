import React from "react";

import { Parameter } from "@framework/EnsembleParameters";
import { RealizationFilter } from "@framework/RealizationFilter";

export type ByParameterValueFilterProps = {
    realizationFilter: RealizationFilter;
    disabled: boolean;
    onEditedChange: (isEdited: boolean) => void;
};

export const ByContinuousParameterValueFilter: React.FC<ByParameterValueFilterProps> = (props) => {
    const [selectedContinuousParameters, setSelectedContinuousParameters] = React.useState<Parameter[]>([]);

    return <></>;
};
