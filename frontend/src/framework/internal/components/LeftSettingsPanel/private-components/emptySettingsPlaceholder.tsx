import type React from "react";

import { Tune } from "@mui/icons-material";

type EmptySettingsPlaceholderProps = {
    text?: string;
};

export function EmptySettingsPlaceholder(props: EmptySettingsPlaceholderProps): React.ReactNode {
    return (
        <div className="gap-y-xs flex h-full flex-col items-center justify-center">
            <Tune fontSize="large" className="text-neutral-subtle" />
            {props.text && <p className="text-neutral-subtle text-body-sm">{props.text}</p>}
        </div>
    );
}
