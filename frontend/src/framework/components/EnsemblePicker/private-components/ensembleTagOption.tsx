import type React from "react";

import { EnsembleColorTile } from "@framework/components/EnsembleColorTile/ensembleColorTile";
import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import type { TagOptionProps } from "@lib/components/TagPicker";
import { Tooltip } from "@lib/components/Tooltip";

export type EnsembleTagOptionProps = TagOptionProps & {
    ensembles: readonly (RegularEnsemble | DeltaEnsemble)[];
    ensembleRealizationFilterFunction?: EnsembleRealizationFilterFunction;
};

export function EnsembleTagOption(props: EnsembleTagOptionProps): React.ReactNode {
    const { ensembleRealizationFilterFunction } = props;

    const ensemble = props.ensembles.find((ens) => ens.getIdent().toString() === props.value) ?? null;

    // Color const for passing to ColorTileWithBadge
    const tagOptionBackgroundColor = props.isFocused ? "bg-blue-100" : "bg-white";

    return (
        <>
            <li
                className={`-mx-2 flex items-center ${tagOptionBackgroundColor}`}
                style={{
                    height: props.height,
                }}
                onMouseMove={props.onHover}
            >
                <label className="flex size-full px-2 py-1 cursor-pointer gap-2">
                    <Checkbox className="w-full" checked={props.isSelected} onChange={props.onToggle} />
                    {ensemble && (
                        <EnsembleColorTile
                            ensemble={ensemble}
                            ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                            wrapperClassName="w-6 h-6"
                            badgeClassName={tagOptionBackgroundColor}
                        />
                    )}
                    <Tooltip title={props.label ?? props.value} enterDelay="long">
                        <span className="truncate min-w-0">{props.label ?? props.value}</span>
                    </Tooltip>
                </label>
            </li>
        </>
    );
}
