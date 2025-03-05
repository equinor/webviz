import type React from "react";

import { Warning } from "@mui/icons-material";

export type DisclaimerWrapperProps = {
    disclaimerText: string;
    hoverText?: string;
    children?: React.ReactNode;
};

export const DisclaimerWrapper: React.FC<DisclaimerWrapperProps> = (props) => {
    return (
        <div className="h-full w-full flex flex-col">
            <div
                className="flex items-center gap-2 p-2 justify-center bg-yellow-200 border-l-4 border-yellow-500 text-yellow-700"
                title={props.hoverText ?? props.disclaimerText}
            >
                <Warning />
                <p className="overflow-hidden text-ellipsis whitespace-nowrap">{props.disclaimerText}</p>
            </div>
            <div className="grow">{props.children ?? null}</div>
        </div>
    );
};
