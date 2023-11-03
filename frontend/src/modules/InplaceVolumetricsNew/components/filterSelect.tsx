import React from "react";

import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { useValidState } from "@lib/hooks/useValidState";

export type FilterSelectProps = {
    name: string;
    options: string[];
    size: number;
    onChange?: (values: string[]) => void;
};

export const FilterSelect: React.FC<FilterSelectProps> = (props) => {
    const [values, setValues] = React.useState<string[]>([]);

    const selectOptions = props.options.map((option) => ({ value: `${option}`, label: `${option}` }));

    function handleSelectionChange(newValues: string[]) {
        setValues(newValues);
        if (props.onChange) {
            props.onChange(newValues);
        }
    }

    return (
        <Label text={props.name}>
            <Select
                options={selectOptions}
                size={props.size}
                value={values}
                onChange={handleSelectionChange}
                multiple
            />
        </Label>
    );
};

export default FilterSelect;
