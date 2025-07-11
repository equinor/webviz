import React from "react";

import type { Workbench } from "@framework/Workbench";
import { Dialog } from "@lib/components/Dialog";
import type { DialogProps } from "@lib/components/Dialog/dialog";

export type SessionOverviewDialogProps = {
    workbench: Workbench;
    mode?: "";
} & Pick<DialogProps, "open" | "onClose">;

export function SessionOverviewDialog(props: SessionOverviewDialogProps): React.ReactNode {
    // TODO: Open via gui-events?

    const { mode, ...otherProps } = props;

    const [currentPage, setCurrentPage] = React.useState(0);

    return (
        <Dialog title="Open Session" modal {...otherProps}>
            <div>{mode}</div>

            {/* TODO: use filterable table select that Jørgen is working on  */}
        </Dialog>
    );
}
