import { FilterAlt } from "@mui/icons-material";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { isEnsembleRealizationFilterEffective } from "@framework/utils/realizationFilterUtils";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
import { ColorTileWithBadge } from "@lib/components/ColorTileWithBadge";
import { Tooltip } from "@lib/components/Tooltip";

export type EnsembleColorTileProps = {
    ensemble: RegularEnsemble | DeltaEnsemble;
    ensembleRealizationFilterFunction?: EnsembleRealizationFilterFunction;
    wrapperClassName?: string;
    badgeClassName?: string;
};

export function EnsembleColorTile(props: EnsembleColorTileProps): React.ReactNode {
    const { ensemble, ensembleRealizationFilterFunction, badgeClassName } = props;

    const isRealizationFilterEffective = isEnsembleRealizationFilterEffective(
        ensemble,
        ensembleRealizationFilterFunction,
    );

    return (
        <Tooltip
            title={isRealizationFilterEffective ? "Some realizations are being filtered out" : undefined}
            enterDelay="medium"
        >
            <span className={`flex items-center ${props.wrapperClassName}`}>
                <ColorTileWithBadge
                    color={ensemble.getColor()}
                    showBadge={isRealizationFilterEffective}
                    badgeIcon={FilterAlt}
                    badgeClassName={badgeClassName}
                />
            </span>
        </Tooltip>
    );
}
