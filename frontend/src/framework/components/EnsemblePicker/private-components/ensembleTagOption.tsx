import type React from "react";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import type { TagOptionProps } from "@lib/components/TagPicker";
import { Tooltip } from "@lib/components/Tooltip";

import { isEnsembleRealizationFilterEffective } from "../private-utils/realizationFilterUtil";

import { EnsembleColorTile } from "./ensembleColorTIle";

export type EnsembleTagOptionProps = TagOptionProps & {
    ensembles: readonly (RegularEnsemble | DeltaEnsemble)[];
    ensembleRealizationFilterFunction?: EnsembleRealizationFilterFunction;
};

export function EnsembleTagOption(props: EnsembleTagOptionProps): React.ReactNode {
    const { ensembleRealizationFilterFunction } = props;

    const ensemble = props.ensembles.find((ens) => ens.getIdent().toString() === props.value) ?? null;
    const ensembleColor = ensemble?.getColor() ?? null;
    const isRealizationFilterEffective = isEnsembleRealizationFilterEffective(
        ensemble,
        ensembleRealizationFilterFunction,
    );

    // Color const for passing to ColorTileWithBadge
    const TAG_OPTION_BACKGROUND_COLOR = props.isFocused ? "bg-blue-100" : "bg-white";

    return (
        <>
            <li
                className={`-mx-2 flex items-center ${TAG_OPTION_BACKGROUND_COLOR}`}
                style={{
                    height: props.height,
                }}
                onMouseMove={props.onHover}
            >
                <label className="flex size-full px-2 py-1 cursor-pointer gap-2">
                    <Checkbox className="w-full" checked={props.isSelected} onChange={props.onToggle} />
                    {ensembleColor && (
                        <EnsembleColorTile
                            ensembleColor={ensembleColor}
                            isRealizationFilterEffective={isRealizationFilterEffective}
                            badgeClassName={TAG_OPTION_BACKGROUND_COLOR}
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
