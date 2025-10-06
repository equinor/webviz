import type React from "react";

import { Close } from "@mui/icons-material";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
import { IconButton } from "@lib/components/IconButton";
import type { TagProps } from "@lib/components/TagInput";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEnsembleRealizationFilterEffective } from "../private-utils/realizationFilterUtil";

import { EnsembleColorTile } from "./ensembleColorTIle";

export type EnsembleTagProps = TagProps & {
    ensembles: readonly (RegularEnsemble | DeltaEnsemble)[] | readonly RegularEnsemble[];
    ensembleRealizationFilterFunction?: EnsembleRealizationFilterFunction;
};

export function EnsembleTag(props: EnsembleTagProps): React.ReactNode {
    const { ensembleRealizationFilterFunction } = props;

    const ensemble = props.ensembles.find((ens) => ens.getIdent().toString() === props.tag) ?? null;
    const ensembleColor = ensemble?.getColor() ?? null;
    const isRealizationFilterEffective = isEnsembleRealizationFilterEffective(
        ensemble,
        ensembleRealizationFilterFunction,
    );

    // Color const for passing to ColorTileWithBadge
    const TAG_BACKGROUND_COLOR = "bg-slate-50";

    return (
        <li
            className={resolveClassNames(
                `text-sm rounded pl-1 pr-1 py-1 border-1 flex gap-1 items-center relative ${TAG_BACKGROUND_COLOR}`,
                {
                    "outline-1": props.focused,
                },
            )}
            style={{
                outlineColor: (props.focused && ensembleColor) || "var(--color-blue-500)",
                borderColor: ensembleColor ?? undefined,
            }}
            onClick={props.onFocus}
        >
            {ensembleColor && (
                <EnsembleColorTile
                    ensembleColor={ensembleColor}
                    isRealizationFilterEffective={isRealizationFilterEffective}
                    badgeClassName={TAG_BACKGROUND_COLOR}
                />
            )}
            <span>{props.label ?? String(props.tag)}</span>
            <IconButton className="align-text-bottom" title="Remove ensemble" size="small" onClick={props.onRemove}>
                <Close fontSize="inherit" />
            </IconButton>

            {props.selected && (
                <div className="bg-blue-500 opacity-30 absolute left-0 top-0 w-full h-full block z-10 rounded-sm" />
            )}
        </li>
    );
}
