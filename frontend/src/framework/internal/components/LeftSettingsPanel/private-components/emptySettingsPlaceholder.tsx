import type React from "react";

import { Tune } from "@mui/icons-material";
import { Paragraph } from "@lib/components/Typography/compositions";

type EmptySettingsPlaceholderProps = {
    text?: string;
};

export function EmptySettingsPlaceholder(props: EmptySettingsPlaceholderProps): React.ReactNode {
    return (
        <div className="gap-y-xs flex h-full flex-col items-center justify-center">
            <Tune fontSize="large" className="text-neutral-subtle" />
            {props.text && (
                <Paragraph size="md" weight="bolder" tone="neutral">
                    {props.text}
                </Paragraph>
            )}
        </div>
    );
}
