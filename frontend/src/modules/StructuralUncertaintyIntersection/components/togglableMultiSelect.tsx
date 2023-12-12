import React from "react";

import { Checkbox } from "@lib/components/Checkbox";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";

import { isEqual } from "lodash";

type TogglableMultiSelectProps = {
    values: string[];
    label: string;
    onChange: (values: string[] | null) => void;
};

export const TogglableMultiSelect: React.FC<TogglableMultiSelectProps> = (props) => {
    const [active, toggleActive] = React.useState(false);
    const [values, setValues] = React.useState<string[]>([]);
    if (!isEqual(props.values, values)) {
        const newValues = props.values.filter((value) => values.includes(value));
        if (!isEqual(newValues, values)) {
            setValues(newValues);
        }
    }
    const handleValuesChange = (values: string[] | null) => {
        setValues(values ?? []);
        props.onChange(values);
    };
    const handleToggleActive = (checked: boolean) => {
        toggleActive(checked);
        if (!checked) {
            props.onChange([]);
        }
    };
    return (
        <div>
            <Label wrapperClassName="flex gap-2" text={props.label}>
                <Checkbox onChange={(e: any) => handleToggleActive(e.target.checked)} checked={active} />
            </Label>
            {active && (
                <Select
                    options={props.values.map((name) => ({ label: name, value: name }))}
                    onChange={(e) => handleValuesChange(e)}
                    value={values}
                    size={5}
                    multiple={true}
                />
            )}
        </div>
    );
};
