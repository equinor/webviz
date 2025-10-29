import type React from "react";

import { Close } from "@mui/icons-material";

import { EnsembleColorTile } from "@framework/components/EnsembleColorTile/ensembleColorTile";
import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
import { IconButton } from "@lib/components/IconButton";
import type { TagProps } from "@lib/components/TagInput";
import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type EnsembleTagProps = TagProps & {
    ensembles: readonly (RegularEnsemble | DeltaEnsemble)[] | readonly RegularEnsemble[];
    ensembleRealizationFilterFunction?: EnsembleRealizationFilterFunction;
};

export function EnsembleTag(props: EnsembleTagProps): React.ReactNode {
    const { ensembleRealizationFilterFunction } = props;

    const ensemble = props.ensembles.find((ens) => ens.getIdent().toString() === props.tag) ?? null;

    // Color const for passing to ColorTileWithBadge
    const TAG_BACKGROUND_COLOR = "bg-slate-50";

    return (
        <li
            className={resolveClassNames(
                `text-sm rounded pl-1 pr-1 py-1 border-1 flex gap-1 items-center relative overflow-x-hidden ${TAG_BACKGROUND_COLOR}`,
                {
                    "outline-1": props.focused,
                },
            )}
            style={{
                outlineColor: (props.focused && ensemble?.getColor()) || "var(--color-blue-500)",
                borderColor: ensemble?.getColor() ?? undefined,
            }}
            onClick={props.onFocus}
        >
            {ensemble && (
                <EnsembleColorTile
                    ensemble={ensemble}
                    ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                    wrapperClassName="w-6 h-6"
                    badgeClassName={TAG_BACKGROUND_COLOR}
                />
            )}
            <Tooltip title={props.label ?? props.tag} enterDelay="long">
                <span className="truncate whitespace-normal">{props.label ?? String(props.tag)}</span>
            </Tooltip>
            <Tooltip title="Remove ensemble" enterDelay="medium">
                <IconButton className="align-text-bottom" size="small" onClick={props.onRemove}>
                    <Close fontSize="inherit" />
                </IconButton>
            </Tooltip>

            {props.selected && (
                <div className="bg-blue-500 opacity-30 absolute left-0 top-0 w-full h-full block z-10 rounded-sm" />
            )}
        </li>
    );
}
