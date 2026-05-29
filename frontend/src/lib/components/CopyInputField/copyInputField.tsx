import React from "react";

import { AssignmentTurnedIn, ContentPaste } from "@mui/icons-material";

import { useTimeoutFunction } from "@lib/hooks/useTimeoutFunction";

import { Tooltip } from "../Tooltip";
import { TextInput } from "@lib/newComponents/TextInput";
import { Button, ButtonProps } from "@lib/newComponents/Button";

export type CopyInputFieldProps = {
    value: string;
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
            <TextInput
                value={props.value}
                readOnly
                layoutClassName="w-full"
                endAdornment={
                    <Tooltip title={showCopySuccess ? "Copied!" : "Copy to clipboard"}>
                        <Button
                            variant="contained"
                            onClick={copyToClipboard}
                            tone={showCopySuccess ? "accent" : "neutral"}
                            size="small"
                            iconOnly
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
