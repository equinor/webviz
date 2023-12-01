import React from "react";

import { Button } from "@lib/components/Button";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";

import { isEqual } from "lodash";

type RealizationsSelectProps = {
    availableRealizations: number[] | null;
    onChange: (values: number[] | null) => void;
};

export const RealizationsSelect: React.FC<RealizationsSelectProps> = (props) => {
    const [selectedRealizations, setSelectedRealizations] = React.useState<number[]>([]);
    if (!isEqual(props.availableRealizations, selectedRealizations)) {
        const newValues = props.availableRealizations?.filter((value) => selectedRealizations.includes(value)) ?? [];
        if (!isEqual(newValues, selectedRealizations)) {
            setSelectedRealizations(newValues);
            props.onChange(newValues);
        }
    }
    const realOptions = props.availableRealizations?.map((real) => ({ label: `${real}`, value: `${real}` })) ?? [];
    const onChange = (values: string[]) => {
        setSelectedRealizations(values.map((value) => parseInt(value)));
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
                    value={selectedRealizations.map((real) => `${real}`) ?? []}
                    size={5}
                    multiple={true}
                />
            </>
        </Label>
    );
};
