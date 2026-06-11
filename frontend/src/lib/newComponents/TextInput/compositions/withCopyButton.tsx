import React from "react";

import { AssignmentTurnedIn, ContentPaste } from "@mui/icons-material";

import { useTimeoutFunction } from "@lib/hooks/useTimeoutFunction";
import { Button } from "@lib/newComponents/Button";
import { TextInput } from "@lib/newComponents/TextInput";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type WithCopyButtonProps = {
    value: string;
    className?: string;
};

export const WithCopyButton = React.forwardRef<HTMLInputElement, WithCopyButtonProps>(
    function WithCopyButton(props, ref) {
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
            <TextInput
                ref={ref}
                value={props.value}
                readOnly
                layoutClassName={resolveClassNames("w-full", props.className)}
                endAdornment={
                    <Tooltip content={showCopySuccess ? "Copied!" : "Copy to clipboard"}>
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
        );
    },
);
