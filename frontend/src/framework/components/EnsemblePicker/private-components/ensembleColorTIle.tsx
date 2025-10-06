import { FilterAlt } from "@mui/icons-material";

import { ColorTileWithBadge } from "@lib/components/ColorTileWithBadge";

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
        <span
            className="flex items-center w-6"
            title={isRealizationFilterEffective ? "Some realizations are being filtered out" : undefined}
        >
            <ColorTileWithBadge
                color={ensembleColor}
                showBadge={isRealizationFilterEffective}
                badgeIcon={FilterAlt}
                badgeClassName={badgeClassName}
            />
        </span>
    );
}
