import React from "react";

import { AssignmentTurnedIn, ContentPaste } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { TextInput } from "@lib/components/TextInput";
import { Tooltip } from "@lib/components/Tooltip";
import { useTimeoutFunction } from "@lib/hooks/useTimeoutFunction";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type WithCopyButtonProps = {
    /** The string value displayed in the read-only input and copied to the clipboard. */
    value: string;
    /** Additional class names applied to the input wrapper. Prefer `layoutClassName` on other components. */
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
