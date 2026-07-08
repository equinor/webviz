import { FilterAlt } from "@mui/icons-material";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
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

    return (
        <Tooltip
            content={props.isRealizationFilterEffective ? "Some realizations are being filtered out" : undefined}
            delay="medium"
        >
            <span className={`flex items-center ${props.wrapperClassName}`}>
                <ColorTileWithBadge
                    color={ensemble.getColor()}
                    showBadge={props.isRealizationFilterEffective ?? false}
                    badgeIcon={FilterAlt}
                    badgeClassName={badgeClassName}
                    size={props.size}
                />
            </span>
        </Tooltip>
    );
}
