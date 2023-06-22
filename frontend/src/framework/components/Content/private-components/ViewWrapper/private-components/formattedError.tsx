import React from "react";

import { FaceFrownIcon } from "@heroicons/react/20/solid";

import { Button } from "../../../../../../lib/components/Button";
import { Dialog } from "../../../../../../lib/components/Dialog";

export type FormattedErrorProps = {
    error: Error;
    errorInfo: React.ErrorInfo;
    onReload?: () => void;
};

function formatStackLine(line: string): React.ReactNode {
    const parts = line.trimStart().split(" ");

    const at = parts[0];
    const location = parts[1];
    const path = parts[2];

    return (
        <div className="flex gap-2 ml-4">
            <span>{at}</span>
            <strong>{location}</strong>
            {path && (
                <span className="">
                    (<span className="text-gray-500 underline">{path.replace("(", "").replace(")", "")}</span>)
                </span>
            )}
        </div>
    );
}

function formatStack(stack: string): React.ReactNode {
    const lines = stack.split("\n");

    return (
        <>
            {lines.map((line, index) => (
                <div key={"line-" + index} className="text-sm">
                    {index === 0 ? line : formatStackLine(line)}
                </div>
            ))}
        </>
    );
}

export const FormattedError: React.FC<FormattedErrorProps> = (props) => {
    const [showDetails, setShowDetails] = React.useState<boolean>(false);

    const handleReload = () => {
        if (!props.onReload) {
            return;
        }

        props.onReload();
    };

    const handleShowDetails = () => {
        setShowDetails(true);
    };

    return (
        <div className="flex flex-col h-full w-full">
            <div className="bg-red-400 flex flex-col justify-center items-center h-[50%] text-white gap-4">
                <FaceFrownIcon className="h-16 w-16" />
                <div className="font-bold">{props.error.message}</div>
            </div>
            <div className="flex flex-col justify-center items-center h-[50%] gap-6 p-4">
                The above error made your module instance crash. Unfortunately, this means that its state is lost. You
                can reset the instance to its initial state in order to start over.
                <div className="flex gap-2">
                    <Button onClick={handleReload} variant="contained">
                        Reset to initial state
                    </Button>
                    <Button onClick={handleShowDetails}>Show error details</Button>
                </div>
            </div>
            {showDetails && (
                <Dialog title={props.error.message} onClose={() => setShowDetails(false)} open modal>
                    <div className="flex flex-col gap-2">
                        {props.error.stack && (
                            <div>
                                <b>Stack:</b>
                                {formatStack(props.error.stack)}
                            </div>
                        )}
                        <div>
                            <b>Component stack:</b>
                            {formatStack(props.errorInfo.componentStack)}
                        </div>
                    </div>
                </Dialog>
            )}
        </div>
    );
};

FormattedError.displayName = "FormattedError";
