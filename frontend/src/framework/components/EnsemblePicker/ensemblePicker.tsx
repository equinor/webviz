import React from "react";

import { Close } from "@mui/icons-material";
import { isEqual } from "lodash";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { useEnsembleRealizationFilterFunc, useEnsembleSet, type WorkbenchSession } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { IconButton } from "@lib/components/IconButton";
import type { TagProps } from "@lib/components/TagInput";
import { TagPicker, type TagOption, type TagOptionProps } from "@lib/components/TagPicker";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ColorTileWithFilterBadge } from "./private-components/colorTileWithFilterBadge";

export type EnsemblePickerProps = (
    | {
          ensembles: readonly (RegularEnsemble | DeltaEnsemble)[];
          allowDeltaEnsembles: true;
          value: (RegularEnsembleIdent | DeltaEnsembleIdent)[];
          onChange: (ensembleIdentArray: (RegularEnsembleIdent | DeltaEnsembleIdent)[]) => void;
      }
    | {
          ensembles: readonly RegularEnsemble[];
          allowDeltaEnsembles?: false | undefined;
          value: RegularEnsembleIdent[];
          onChange: (ensembleIdentArray: RegularEnsembleIdent[]) => void;
      }
) & {
    workbenchSession: WorkbenchSession;
};

export function EnsemblePicker(props: EnsemblePickerProps): JSX.Element {
    const { onChange, ensembles, value, allowDeltaEnsembles } = props;

    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const optionsArray: TagOption[] = [];
    for (const ens of ensembles) {
        optionsArray.push({
            value: ens.getIdent().toString(),
            label: ens.getDisplayName(),
        });
    }

    const selectedArray: string[] = [];
    for (const ident of value) {
        selectedArray.push(ident.toString());
    }

    const getEnsembleColor = React.useCallback(
        function getEnsembleColor(ens: RegularEnsemble | DeltaEnsemble): string | null {
            const color = ensembleSet.getEnsemble(ens.getIdent())?.getColor() ?? null;
            return color;
        },
        [ensembleSet],
    );

    const hasEffectiveRealizationFilter = React.useCallback(
        function hasEffectiveRealizationFilter(ens: RegularEnsemble | DeltaEnsemble | null): boolean {
            if (!ens) {
                return false;
            }

            const ensembleRealizations = [...ens.getRealizations()].toSorted();
            const filteredRealizations = [...filterEnsembleRealizationsFunc(ens.getIdent())].toSorted();
            return !isEqual(filteredRealizations, ensembleRealizations);
        },
        [filterEnsembleRealizationsFunc],
    );

    const EnsembleTagOption = React.useCallback(
        function EnsembleTagOption(props: TagOptionProps): React.ReactNode {
            const ensemble = ensembleSet.findEnsembleByIdentString(props.value);
            const ensembleColor = ensemble ? getEnsembleColor(ensemble) : null;
            const isRealizationFilterEffective = hasEffectiveRealizationFilter(ensemble);

            // Hardcoded for passing to ColorTileWithFilterBadge
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
                                <span
                                    className="flex items-center w-6"
                                    title={
                                        isRealizationFilterEffective
                                            ? "Some realizations are being filtered out"
                                            : undefined
                                    }
                                >
                                    <ColorTileWithFilterBadge
                                        color={ensembleColor}
                                        showBadge={isRealizationFilterEffective}
                                        badgeClassName={TAG_OPTION_BACKGROUND_COLOR}
                                    />
                                </span>
                            )}
                            <span title={props.label ?? props.value} className="truncate min-w-0">
                                {props.label ?? props.value}
                            </span>
                        </label>
                    </li>
                </>
            );
        },
        [ensembleSet, getEnsembleColor, hasEffectiveRealizationFilter],
    );

    const EnsembleTag = React.useCallback(
        function EnsembleTag(props: TagProps): React.ReactNode {
            const ensemble = ensembleSet.findEnsembleByIdentString(props.tag);
            const ensembleColor = ensemble ? getEnsembleColor(ensemble) : null;
            const isRealizationFilterEffective = hasEffectiveRealizationFilter(ensemble);

            // Hardcoded for passing to ColorTileWithFilterBadge
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
                        <span
                            className="flex items-center w-6"
                            title={
                                isRealizationFilterEffective ? "Some realizations are being filtered out" : undefined
                            }
                        >
                            <ColorTileWithFilterBadge
                                color={ensembleColor}
                                showBadge={isRealizationFilterEffective}
                                badgeClassName={TAG_BACKGROUND_COLOR}
                            />
                        </span>
                    )}
                    <span>{props.label ?? String(props.tag)}</span>
                    <IconButton className="align-text-bottom" title="Remove tag" size="small" onClick={props.onRemove}>
                        <Close fontSize="inherit" />
                    </IconButton>

                    {props.selected && (
                        <div className="bg-blue-500 opacity-30 absolute left-0 top-0 w-full h-full block z-10 rounded-sm" />
                    )}
                </li>
            );
        },
        [ensembleSet, getEnsembleColor, hasEffectiveRealizationFilter],
    );

    const handleSelectionChange = React.useCallback(
        function handleSelectionChanged(selectedEnsembleIdentStringArray: string[]) {
            const identArray: (RegularEnsembleIdent | DeltaEnsembleIdent)[] = [];
            for (const identStr of selectedEnsembleIdentStringArray) {
                const foundEnsemble = ensembles.find((ens) => ens.getIdent().toString() === identStr);
                if (!foundEnsemble) {
                    throw new Error(`Ensemble not found: ${identStr}`);
                }
                if (!allowDeltaEnsembles && foundEnsemble instanceof DeltaEnsemble) {
                    throw new Error(`Invalid ensemble selection: ${identStr}. Got delta ensemble when not allowed.`);
                }
                identArray.push(foundEnsemble.getIdent());
            }

            // Filter to match the correct return type before calling onChange
            if (!allowDeltaEnsembles) {
                const validIdentArray = identArray.filter((ident) =>
                    isEnsembleIdentOfType(ident, RegularEnsembleIdent),
                ) as RegularEnsembleIdent[];
                onChange(validIdentArray);
                return;
            }
            onChange(identArray);
        },
        [allowDeltaEnsembles, ensembles, onChange],
    );

    return (
        <TagPicker
            selection={selectedArray}
            tagOptions={optionsArray}
            onChange={handleSelectionChange}
            renderTag={(props) => <EnsembleTag {...props} />}
            renderTagOption={(props) => <EnsembleTagOption {...props} />}
            placeholder="Select ensembles..."
        />
    );
}
