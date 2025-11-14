import React from "react";

import { Input, type InputProps } from "../Input/input";

export type CharLimitedInputProps = InputProps & {
    label: string;
    maxLength: number;
    value: string;
    onControlledValueChange: (newValue: string) => void;
};

export function CharLimitedInput(props: CharLimitedInputProps): React.ReactNode {
    const { onControlledValueChange, maxLength, value, ...rest } = props;

    const [controlledValue, setControlledValue] = React.useState<string>(value);
    const [prevValue, setPrevValue] = React.useState<string>(value);
    const [uirevision, setUirevision] = React.useState<number>(0);

    if (value !== prevValue) {
        setControlledValue(value);
        setPrevValue(value);
    }

    const handleChange = React.useCallback(
        function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
            const newValue = event.target.value;

            if (newValue.length <= maxLength) {
                setControlledValue(newValue);
                setUirevision((prev) => prev + 1);
                onControlledValueChange(newValue);
            } else {
                const croppedValue = newValue.slice(0, maxLength);
                setControlledValue(croppedValue);
                setUirevision((prev) => prev + 1);
                onControlledValueChange(croppedValue);
            }
        },
        [onControlledValueChange, maxLength, setControlledValue],
    );

    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center">
                <label className="text-sm text-gray-500 leading-tight grow">{props.label}</label>
                <span className="ml-auto text-sm text-gray-500">
                    {controlledValue.length}/{maxLength}
                </span>
            </div>
            <Input {...rest} value={controlledValue} uirevision={uirevision} onChange={handleChange} />
        </div>
    );
}
