import type React from "react";

import { Tune } from "@mui/icons-material";

type EmptySettingsPlaceholderProps = {
    text?: string;
};

export function EmptySettingsPlaceholder(props: EmptySettingsPlaceholderProps): React.ReactNode {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-2">
            <Tune fontSize="large" className="text-slate-200" />
            {props.text && <p className="text-slate-300 text-sm">{props.text}</p>}
        </div>
    );
}
