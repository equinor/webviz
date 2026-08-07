import React from "react";

import { Numbers, Palette, PlayArrow, Verified } from "@mui/icons-material";

import { Drawer } from "@framework/internal/components/Drawer";
import type { Workbench } from "@framework/Workbench";
import { ColorPaletteType, ColorScaleDiscreteSteps } from "@framework/WorkbenchSettings";
import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorPaletteSelector, ColorPaletteSelectorType } from "@lib/components/ColorPaletteSelector";
import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { useActiveSession } from "../../ActiveSessionBoundary";
import { EnsembleQc } from "@framework/internal/QC/EnsembleQc";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { EnsembleColorTile } from "@framework/components/EnsembleColorTile";
import { Button } from "@lib/components/Button";
import { QcCheckRuntime } from "@framework/internal/QC/QcCheck";

export type QcChecksPanelProps = {
    workbench: Workbench;
    onClose: () => void;
};

export const QcChecksPanel = React.memo(function QcChecksPanel(props: QcChecksPanelProps) {
    const workbenchSession = useActiveSession();

    const ensembleQcs = workbenchSession.getEnsembleQcSet().getEnsembleQcsArray();

    return (
        <Drawer title="QC Checks" icon={<Verified />} visible={true} onClose={props.onClose}>
            {ensembleQcs.map((ensembleQc) => {
                const ensembleIdentString = ensembleQc.getEnsemble().getIdent().toString();
                const checkRuntimes = Array.from(ensembleQc.getCheckRuntimes().values());

                return <EnsembleQcContainer key={ensembleIdentString} ensembleQc={ensembleQc} />;
            })}
        </Drawer>
    );
});

type EnsembleQcContainerProps = {
    ensembleQc: EnsembleQc;
};

function EnsembleQcContainer(props: EnsembleQcContainerProps) {
    const ensembleIdentString = props.ensembleQc.getEnsemble().getIdent().toString();
    const checkRuntimes = Array.from(props.ensembleQc.getCheckRuntimes().values());
    const ensemble = props.ensembleQc.getEnsemble();

    const readableEnsembleName = ensemble.getCustomName() ?? ensemble.getDisplayName();

    return (
        <div
            className={resolveClassNames(
                "group outline-neutral-subtle hover:outline-accent cursor-pointer rounded-md outline",
            )}
        >
            <div className="bg-neutral flex items-center justify-center rounded-t">
                <div className={resolveClassNames("px-2xs py-3xs gap-x-2xs flex h-full min-w-0 grow items-center")}>
                    <EnsembleColorTile wrapperClassName="w-5 h-5" ensemble={ensemble} />
                    <div className="font-bolder px-2xs text-body-sm flex h-full min-w-0 grow cursor-pointer items-center">
                        <span className="truncate">{readableEnsembleName}</span>
                    </div>
                    <Button tone="accent" size="small" variant="ghost" iconOnly>
                        <PlayArrow style={{ fontSize: 16 }} />
                    </Button>
                </div>
            </div>
            <div className="gap-y-2xs p-2xs flex flex-col">
                {checkRuntimes.map((checkRuntime) => {
                    const checkId = checkRuntime.getId();
                    return <CheckRuntimeContainer key={checkId} checkRuntime={checkRuntime} />;
                })}
            </div>
        </div>
    );
}

type CheckRuntimeContainerProps = {
    checkRuntime: QcCheckRuntime;
};

function CheckRuntimeContainer(props: CheckRuntimeContainerProps) {
    const checkDefinition = props.checkRuntime.getCheckDefinition();
    const checkId = props.checkRuntime.getId();

    return (
        <div className="gap-y-2xs p-2xs flex flex-col">
            <div className="font-bolder text-body-sm">{checkDefinition.name}</div>
            <div className="text-body-xs text-neutral-subtle"></div>
        </div>
    );
}
