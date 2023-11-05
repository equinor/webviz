import React from "react";

import { Dropdown } from "@lib/components/Dropdown";

import { PrevNextButtonsProps } from "./previousNextButtons";

export type SingleSelectWithButtonsProps = {
    name: string;
    options: string[];
    value: string;
    labelFunction?: (value: string) => string;
    onChange?: (values: string) => void;
};
export const SingleSelectWithButtons: React.FC<SingleSelectWithButtonsProps> = (props) => {
    const selectOptions = props.options.map((option) => ({
        value: option,
        label: props.labelFunction?.(option) ?? option,
    }));
    const handleSelectionChange = (selectedValue: string) => {
        props.onChange?.(selectedValue);
    };

    return (
        <tr>
            <td className="px-6 py-0 whitespace-nowrap">{props.name}</td>
            <td className="px-6 py-0 w-full whitespace-nowrap">
                <Dropdown options={selectOptions} value={props.value} onChange={handleSelectionChange} />
            </td>
            <td className="px-0 py-0 whitespace-nowrap text-right">
                <PrevNextButtonsProps onChange={handleSelectionChange} options={props.options} value={props.value} />
            </td>
        </tr>
    );
};
