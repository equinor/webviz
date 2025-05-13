import React from "react";

import { NumberInput } from "@lib/components/@next/Input/numberInput";
import { ToggleButton } from "@lib/components/ToggleButton";
import { GroupAdd, Search } from "@mui/icons-material";

import { ExampleTitle } from "../ExampleTitle";
import { ValueResult } from "../ValueResult";

export function NumberInputExample(): React.ReactNode {
    const [inputValue, setInputValue] = React.useState<number | null>(10);

    const [showStartAdornment, setShowStartAdornment] = React.useState<boolean>(false);
    const [showEndAdornment, setShowEndAdornment] = React.useState<boolean>(false);
    const [isDisabled, setIsDisabled] = React.useState<boolean>(false);
    const [isError, setIsError] = React.useState<boolean>(false);

    return (
        <>
            <ExampleTitle>Number input field</ExampleTitle>

            <div>
                <NumberInput
                    value={inputValue}
                    placeholder="My placeholder"
                    disabled={isDisabled}
                    onValueChange={setInputValue}
                    invalid={isError}
                    startAdornment={showStartAdornment && <GroupAdd fontSize="inherit" />}
                    endAdornment={showEndAdornment && <Search fontSize="inherit" />}
                />

                <div className="mt-2 flex gap-2 ">
                    <ToggleButton
                        className="!p-1 !text-xs"
                        active={showStartAdornment}
                        onToggle={setShowStartAdornment}
                    >
                        Start-adornment
                    </ToggleButton>
                    <ToggleButton className="!p-1 !text-xs" active={showEndAdornment} onToggle={setShowEndAdornment}>
                        End-adornment
                    </ToggleButton>
                    <ToggleButton className="!p-1 !text-xs" active={isDisabled} onToggle={setIsDisabled}>
                        Disabled
                    </ToggleButton>
                    <ToggleButton className="!p-1 !text-xs" active={isError} onToggle={setIsError}>
                        Error
                    </ToggleButton>
                </div>
            </div>

            <ValueResult>{inputValue}</ValueResult>
        </>
    );
}
