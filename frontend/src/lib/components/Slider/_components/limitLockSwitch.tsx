import { LockOpen, Lock } from "@mui/icons-material";

import type { SelectableSize } from "@lib/components/_shared/utils/size";
import { Button } from "@lib/components/Button";

export function LimitLockSwitch(props: {
    layoutClassName?: string;
    size: SelectableSize;
    disabled: boolean;
    isLocked: boolean;
    onSetLocked: (newValue: boolean) => void;
}) {
    const ButtonIcon = props.isLocked ? Lock : LockOpen;

    return (
        <Button
            layoutClassName={props.layoutClassName}
            variant="ghost"
            tone="accent"
            size={props.size}
            compact
            pressed={props.isLocked}
            disabled={props.disabled}
            onClick={() => props.onSetLocked(!props.isLocked)}
        >
            <ButtonIcon className="text-accent-subtle text" fontSize="inherit" />
        </Button>
    );
}
