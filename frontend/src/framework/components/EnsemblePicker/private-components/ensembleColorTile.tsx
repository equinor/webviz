import { FilterAlt } from "@mui/icons-material";

import { ColorTileWithBadge } from "@lib/components/ColorTileWithBadge";
import { Tooltip } from "@lib/components/Tooltip";

export function EnsembleColorTile({
    ensembleColor,
    isRealizationFilterEffective,
    badgeClassName,
}: {
    ensembleColor: string;
    isRealizationFilterEffective: boolean;
    badgeClassName?: string;
}): React.ReactNode {
    return (
        <Tooltip
            title={isRealizationFilterEffective ? "Some realizations are being filtered out" : undefined}
            enterDelay="medium"
        >
            <span className="flex items-center w-6">
                <ColorTileWithBadge
                    color={ensembleColor}
                    showBadge={isRealizationFilterEffective}
                    badgeIcon={FilterAlt}
                    badgeClassName={badgeClassName}
                />
            </span>
        </Tooltip>
    );
}
