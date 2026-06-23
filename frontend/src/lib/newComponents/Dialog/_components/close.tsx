import { Dialog as DialogBase } from "@base-ui/react";
import { Close as CloseIcon } from "@mui/icons-material";

import { Tooltip } from "@lib/newComponents/Tooltip";

export function Close() {
    return (
        <DialogBase.Close className="min-h-selectable-sm text-body-lg hover:bg-neutral-hover active:bg-neutral-active text-neutral-subtle relative -top-0.25 -right-0.25 inline-flex aspect-square cursor-pointer items-center justify-center rounded">
            <Tooltip content="Close" side="top" delay="long">
                <CloseIcon fontSize="inherit" />
            </Tooltip>
        </DialogBase.Close>
    );
}
