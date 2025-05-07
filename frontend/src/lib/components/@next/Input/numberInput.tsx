import React from "react";

import { NumberField as BaseNumberField } from "@base-ui-components/react/number-field";
import { Add, HeightOutlined, Remove } from "@mui/icons-material";

import type { InputProps } from "./input";
import { Input } from "./input";

export type NumberInputProps = BaseNumberField.Root.Props & Pick<InputProps, "startAdornment" | "endAdornment">;

function NumberInputComponent(props: NumberInputProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const { startAdornment, endAdornment, ...baseProps } = props;

    return (
        <BaseNumberField.Root ref={ref} {...baseProps}>
            <BaseNumberField.Group render={<></>}>
                <BaseNumberField.ScrubAreaCursor>
                    <HeightOutlined />
                </BaseNumberField.ScrubAreaCursor>
                <BaseNumberField.Input
                    render={
                        <Input
                            invalid={baseProps.invalid}
                            noAdornmentWrapper
                            startAdornment={startAdornment}
                            endAdornment={
                                <div className="self-stretch py-0.5 flex items-stretch -my-2 -mr-2">
                                    {endAdornment}

                                    <BaseNumberField.Decrement className="rounded hover:bg-gray-100 p-1">
                                        <Remove fontSize="inherit" />
                                    </BaseNumberField.Decrement>
                                    <BaseNumberField.Increment className="rounded hover:bg-gray-100 p-1">
                                        <Add fontSize="inherit" />
                                    </BaseNumberField.Increment>
                                    <BaseNumberField.ScrubArea
                                        className="cursor-n-resize bg-gray-100 w-2.5  border-l border-double rounded-r"
                                        direction="vertical"
                                    />
                                </div>
                            }
                        />
                    }
                />
            </BaseNumberField.Group>
        </BaseNumberField.Root>
    );
}

export const NumberInput = React.forwardRef(NumberInputComponent);
