import { FilterAlt, SubdirectoryArrowRight } from "@mui/icons-material";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { ColorTileWithBadge } from "@lib/components/ColorTileWithBadge";
import { Tooltip } from "@lib/components/Tooltip";

export type EnsembleColorTileProps = {
    ensemble: RegularEnsemble | DeltaEnsemble;
    isRealizationFilterEffective?: boolean;
    wrapperClassName?: string;
    badgeClassName?: string;
    size?: "small" | "default" | "large";
};

export function EnsembleColorTile(props: EnsembleColorTileProps): React.ReactNode {
    const { ensemble, badgeClassName } = props;

    const tooltipLines: string[] = [];
    let isRestartEnsemble = false;
    if (ensemble instanceof RegularEnsemble) {
        const restartFromIdent = ensemble.getRestartFromEnsembleIdent();
        if (restartFromIdent) {
            isRestartEnsemble = true;
            const isOtherCase = restartFromIdent.getCaseUuid() !== ensemble.getCaseUuid();
            tooltipLines.push(
                `Restarted from ${restartFromIdent.getEnsembleName()}${isOtherCase ? " (in another case)" : ""}`,
            );
        }
    }
    if (props.isRealizationFilterEffective) {
        tooltipLines.push("Some realizations are being filtered out");
    }

    return (
        <Tooltip content={tooltipLines.length > 0 ? tooltipLines.join(". ") : undefined} delay="medium">
            <span className={`flex items-center ${props.wrapperClassName}`}>
                <ColorTileWithBadge
                    color={ensemble.getColor()}
                    showBadge={props.isRealizationFilterEffective ?? false}
                    badgeIcon={FilterAlt}
                    badgeClassName={badgeClassName}
                    showSecondaryBadge={isRestartEnsemble}
                    secondaryBadgeIcon={SubdirectoryArrowRight}
                    size={props.size}
                />
            </span>
        </Tooltip>
    );
}
