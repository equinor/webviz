import { Dialog as DialogBase } from "@base-ui/react";
import { Close as CloseIcon } from "@mui/icons-material";

export function Close() {
    return (
        <DialogBase.Close className="h-selectable-sm hover:bg-neutral-hover active:bg-neutral-active text-neutral-subtle relative -top-0.5 -right-0.5 inline-flex aspect-square items-center justify-center rounded">
            <CloseIcon fontSize="inherit" />
        </DialogBase.Close>
    );
}
