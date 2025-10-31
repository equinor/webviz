import React from "react";

import { Input, type InputProps } from "../Input/input";

export type TextLengthControlledInputProps = InputProps & {
    maxLength: number;
    value: string;
    onControlledValueChange: (newValue: string) => void;
};

export function TextLengthControlledInput(props: TextLengthControlledInputProps): React.ReactNode {
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
        <Input
            {...rest}
            value={controlledValue}
            uirevision={uirevision}
            onChange={handleChange}
            endAdornment={
                <span>
                    {controlledValue.length}/{maxLength}
                </span>
            }
        />
    );
}
