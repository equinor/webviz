import React from "react";

import { Button } from "@lib/components/Button";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";

import { isEqual } from "lodash";

type RealizationsSelectProps = {
    availableRealizations: number[] | null;
    selectedRealizations: number[]; // Added as prop
    onChange: (values: number[] | null) => void;
};

export const RealizationsSelect: React.FC<RealizationsSelectProps> = (props) => {
    // Removed useState for selectedRealizations

    if (!isEqual(props.availableRealizations, props.selectedRealizations)) {
        const newValues =
            props.availableRealizations?.filter((value) => props.selectedRealizations.includes(value)) ?? [];
        if (!isEqual(newValues, props.selectedRealizations)) {
            props.onChange(newValues);
        }
    }

    const realOptions = props.availableRealizations?.map((real) => ({ label: `${real}`, value: `${real}` })) ?? [];

    const onChange = (values: string[]) => {
        props.onChange(values.map((value) => parseInt(value)));
    };

    return (
        <Label text="Realizations">
            <>
                <Button
                    className="float-left m-2 text-xs py-0"
                    variant="outlined"
                    onClick={() => onChange(props.availableRealizations?.map((real) => `${real}`) ?? [])}
                >
                    Select all
                </Button>
                <Button className="m-2 text-xs py-0" variant="outlined" onClick={() => onChange([])}>
                    Select none
                </Button>
                <Select
                    options={realOptions}
                    onChange={onChange}
                    value={props.selectedRealizations.map((real) => `${real}`) ?? []}
                    size={5}
                    multiple={true}
                />
            </>
        </Label>
    );
};
