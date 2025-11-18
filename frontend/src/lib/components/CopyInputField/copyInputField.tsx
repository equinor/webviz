import React from "react";

import { AssignmentTurnedIn, ContentPaste } from "@mui/icons-material";

import { useTimeoutFunction } from "@lib/hooks/useTimeoutFunction";

import { Button } from "../Button";
import type { ButtonProps } from "../Button/button";
import { Input } from "../Input";
import { Tooltip } from "../Tooltip";

export type CopyInputFieldProps = {
    value: string;
    size?: ButtonProps["size"];
    className?: string;
};

export function CopyInputField(props: CopyInputFieldProps): React.ReactNode {
    const [showCopySuccess, setShowCopySuccess] = React.useState<boolean>(false);
    const timeoutFunction = useTimeoutFunction();

    function copyToClipboard() {
        navigator.clipboard.writeText(props.value).then(() => {
            setShowCopySuccess(true);
            timeoutFunction(() => {
                setShowCopySuccess(false);
            }, 2000);
        });
    }

    return (
        <div className={props.className}>
            <Input
                type="text"
                value={props.value}
                readOnly
                className="w-full"
                endAdornment={
                    <Tooltip title={showCopySuccess ? "Copied!" : "Copy to clipboard"}>
                        <Button
                            variant="contained"
                            onClick={copyToClipboard}
                            color={showCopySuccess ? "success" : "primary"}
                            size={props.size ?? "medium"}
                        >
                            {showCopySuccess ? (
                                <AssignmentTurnedIn fontSize="inherit" />
                            ) : (
                                <ContentPaste fontSize="inherit" />
                            )}
                        </Button>
                    </Tooltip>
                }
            />
        </div>
    );
}
