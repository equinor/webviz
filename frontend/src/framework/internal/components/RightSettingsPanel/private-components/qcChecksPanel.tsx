import React from "react";

import { Verified } from "@mui/icons-material";

import { Drawer } from "@framework/internal/components/Drawer";
import type { Workbench } from "@framework/Workbench";
import { useEnsembleQcSet } from "@framework/WorkbenchSession";

import { useActiveSession } from "../../ActiveSessionBoundary";
import { EnsembleQcContainer } from "../../QC/EnsembleQcContainer";
import { QcRealizationPopoverProvider } from "../../QC/QcRealizationPopover";

export type QcChecksPanelProps = {
    workbench: Workbench;
    onClose: () => void;
};

export const QcChecksPanel = React.memo(function QcChecksPanel(props: QcChecksPanelProps) {
    const workbenchSession = useActiveSession();

    // Subscribes to `WorkbenchSessionTopic.ENSEMBLE_QC_SET` (rather than reading
    // `getEnsembleQcSet()` directly) so this panel re-renders when an ensemble is added to or
    // removed from the session while it's open.
    const ensembleQcs = useEnsembleQcSet(workbenchSession);

    return (
        <QcRealizationPopoverProvider>
            <Drawer title="QC Checks" icon={<Verified />} visible={true} onClose={props.onClose}>
                {ensembleQcs.map((ensembleQc) => {
                    const ensembleIdentString = ensembleQc.getEnsemble().getIdent().toString();
                    return (
                        <EnsembleQcContainer
                            key={ensembleIdentString}
                            ensembleQc={ensembleQc}
                            workbench={props.workbench}
                        />
                    );
                })}
            </Drawer>
        </QcRealizationPopoverProvider>
    );
});
