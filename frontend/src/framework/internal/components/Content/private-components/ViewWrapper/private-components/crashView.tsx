import React from "react";

import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { BugReport, Info, MoodBad, Refresh } from "@mui/icons-material";

export type FormattedErrorProps = {
    moduleName: string;
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

export const CrashView: React.FC<FormattedErrorProps> = (props) => {
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

    const handleReportError = () => {
        const title = encodeURIComponent(`[USER REPORTED ERROR] (${props.moduleName}) ${props.error.message}`);
        const body = encodeURIComponent(
            `<!-- ⚠️ DO NOT INCLUDE DATA/SCREENSHOTS THAT CAN'T BE PUBLICLY AVAILABLE.-->\n\n\
**How to reproduce**\nPlease describe what you were doing when the error occurred.\n\n\
**Screenshots**\nIf applicable, add screenshots to help explain your problem.\n\n\
**Error stack**\n\`\`\`\n${props.error.stack}\n\`\`\`\n\n\
**Component stack**\n\`\`\`${props.errorInfo.componentStack}\n\`\`\``,
        );
        const label = encodeURIComponent("user reported error");
        window.open(
            `https://github.com/equinor/webviz/issues/new?title=${title}&body=${body}&labels=${label}`,
            "_blank",
        );
    };

    return (
        <div className="flex flex-col h-full w-full">
            <div className="bg-red-400 flex flex-col justify-center items-center h-[50%] text-white gap-4">
                <MoodBad fontSize="small" />
                <div className="font-bold text-center">{props.error.message}</div>
            </div>
            <div className="flex flex-col items-center h-[50%] gap-6 p-8">
                The above error made your module instance crash. Unfortunately, this means that its state is lost. You
                can try to reset the instance to its initial state in order to start over.
                <div className="flex gap-4">
                    <Button onClick={handleReload} variant="contained" startIcon={<Refresh fontSize="small" />}>
                        Reset to initial state
                    </Button>
                    <Button onClick={handleShowDetails} startIcon={<Info fontSize="small" />}>
                        Show error details
                    </Button>
                    <Button onClick={handleReportError} startIcon={<BugReport fontSize="small" />}>
                        Report error
                    </Button>
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

CrashView.displayName = "CrashView";
