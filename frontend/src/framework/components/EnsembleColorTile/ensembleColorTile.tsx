import { FilterAlt } from "@mui/icons-material";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { isEnsembleRealizationFilterEffective } from "@framework/utils/realizationFilterUtils";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
import { ColorTileWithBadge } from "@lib/components/ColorTileWithBadge";
import { Tooltip } from "@lib/components/Tooltip";

type EnsembleColorTileBaseProps = {
    ensemble: RegularEnsemble | DeltaEnsemble;
    wrapperClassName?: string;
    badgeClassName?: string;
};
type EnsembleColorTileWithFilterFuncProps = EnsembleColorTileBaseProps & {
    ensembleRealizationFilterFunction?: EnsembleRealizationFilterFunction;
};
type EnsembleColorTileWithFilterFlagProps = EnsembleColorTileBaseProps & {
    isRealizationFilterEffective: boolean;
};

export type EnsembleColorTileProps = EnsembleColorTileWithFilterFuncProps | EnsembleColorTileWithFilterFlagProps;

export function EnsembleColorTile(props: EnsembleColorTileProps): React.ReactNode {
    const { ensemble, badgeClassName } = props;

    let isRealizationFilterEffective = false;
    if ("isRealizationFilterEffective" in props) {
        isRealizationFilterEffective = props.isRealizationFilterEffective;
    } else {
        isRealizationFilterEffective = isEnsembleRealizationFilterEffective(
            ensemble,
            props.ensembleRealizationFilterFunction,
        );
    }

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
