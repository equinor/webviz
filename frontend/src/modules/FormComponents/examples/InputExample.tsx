import React from "react";

import { Input } from "@lib/components/@next/Input";
import { ToggleButton } from "@lib/components/ToggleButton";
import { GroupAdd, Search } from "@mui/icons-material";

import { ValueResult } from "../ValueResult";

export function InputExample(): React.ReactNode {
    const [inputValue, setInputValue] = React.useState<string | undefined>("");

    const [showStartAdornment, setShowStartAdornment] = React.useState<boolean>(false);
    const [showEndAdornment, setShowEndAdornment] = React.useState<boolean>(false);
    const [isDisabled, setIsDisabled] = React.useState<boolean>(false);
    const [isError, setIsError] = React.useState<boolean>(false);

    return (
        <>
            <div>
                <Input
                    value={inputValue}
                    placeholder="My placeholder"
                    disabled={isDisabled}
                    invalid={isError}
                    startAdornment={showStartAdornment && <GroupAdd fontSize="inherit" />}
                    endAdornment={showEndAdornment && <Search fontSize="inherit" />}
                    onValueChange={(v) => setInputValue(v as string)}
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
