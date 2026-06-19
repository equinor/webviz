import React from "react";

import { Tooltip } from "@lib/newComponents/Tooltip";
import { Paragraph } from "@lib/newComponents/Typography/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type RealizationNumberDisplayProps = {
    selectedRealizations: readonly number[];
    availableRealizations: readonly number[];
    showAsCompact?: boolean;
    disableOnClick: boolean;
    onRealizationNumberClick: (selectedRealizations: readonly number[]) => void;
};

export const RealizationNumberDisplay: React.FC<RealizationNumberDisplayProps> = (props) => {
    // Since the function prop is not guaranteed to be stable, we wrap it in a ref so we can safely memoize against it
    const onRealizationNumberClickRef = React.useRef(props.onRealizationNumberClick);
    onRealizationNumberClickRef.current = props.onRealizationNumberClick;

    const handleRealizationElementClick = React.useCallback(
        function handleRealizationElementClickFunc(realization: number) {
            if (props.disableOnClick) return;
            if (!props.selectedRealizations.includes(realization)) {
                onRealizationNumberClickRef.current([...props.selectedRealizations, realization]);
                return;
            }
            onRealizationNumberClickRef.current(props.selectedRealizations.filter((r) => r !== realization));
        },
        [props.disableOnClick, props.selectedRealizations],
    );

    const isCompact = props.showAsCompact ?? false;
    const dotSizePx = isCompact ? 9 : 12;
    const gapPx = isCompact ? 3 : 4;
    const labelWidthPx = 28;
    const labelHeightPx = 16;

    const maxRealization = props.availableRealizations.length > 0 ? Math.max(...props.availableRealizations) : -1;
    const allRealizations = Array.from({ length: maxRealization + 1 }, (_, i) => i);

    if (allRealizations.length === 0) {
        return (
            <Paragraph size="sm" tone="neutral" layoutClassName="text-center w-full py-sm">
                No realizations
            </Paragraph>
        );
    }

    const selectedRealizationsSet = new Set(props.selectedRealizations);
    const availableRealizationsSet = new Set(props.availableRealizations);

    const numGroups = Math.ceil(allRealizations.length / 5);
    const groups = Array.from({ length: numGroups }, (_, g) => allRealizations.slice(g * 5, g * 5 + 5));

    return (
        /*
         * padding-left reserves space for the row labels positioned to the left of each group.
         * Only the label of the first group on each visual row is visible — the rest are covered
         * by the dot wrappers of the preceding group (z-index 1 > label z-index 0).
         */
        <div style={{ paddingLeft: isCompact ? 0 : labelWidthPx, paddingTop: isCompact ? 0 : labelHeightPx }}>
            <div className="isolate flex flex-wrap" style={{ gap: gapPx }}>
                {groups.map((group) => (
                    <div key={group[0]} className="relative">
                        {!isCompact && (
                            <>
                                {/*
                                 * Shifted left into the padding area.
                                 */}
                                <span
                                    style={{
                                        left: -labelWidthPx,
                                        width: labelWidthPx - gapPx,
                                    }}
                                    className="text-neutral-subtle absolute z-0 flex h-full items-center justify-end text-[10px] leading-none select-none"
                                >
                                    {group[0]}
                                </span>
                                {/*
                                 * Shifted top into the padding area.
                                 */}
                                <span
                                    style={{
                                        top: -labelHeightPx,
                                        width: labelWidthPx,
                                        height: labelHeightPx,
                                    }}
                                    className="text-neutral-subtle absolute z-0 flex h-full items-center text-[10px] leading-none select-none"
                                >
                                    {group[0]}
                                </span>
                            </>
                        )}
                        <div className="bg-surface relative z-1 flex" style={{ gap: gapPx, paddingRight: gapPx }}>
                            {group.map((realization) => {
                                const isAvailable = availableRealizationsSet.has(realization);
                                const isSelected = selectedRealizationsSet.has(realization);
                                const isClickDisabled = isCompact || props.disableOnClick || !isAvailable;

                                return (
                                    <Tooltip
                                        key={realization}
                                        content={
                                            isAvailable ? `real-${realization}` : `real-${realization} (unavailable)`
                                        }
                                    >
                                        <div
                                            style={{ width: dotSizePx, height: dotSizePx }}
                                            className={resolveClassNames("aspect-square rounded-full", {
                                                "bg-accent-strong": isSelected,
                                                "bg-accent": !isSelected && isAvailable,
                                                "bg-disabled": !isSelected && !isAvailable,
                                                "hover:bg-accent-strong-hover hover:outline-accent-strong hover:outline":
                                                    !isCompact && isSelected && !props.disableOnClick,
                                                "hover:bg-accent-hover hover:outline-accent hover:outline":
                                                    !isCompact && !isSelected && isAvailable && !props.disableOnClick,
                                                "cursor-pointer": !isCompact && !props.disableOnClick && isAvailable,
                                                "cursor-not-allowed":
                                                    !isCompact && !props.disableOnClick && !isAvailable,
                                            })}
                                            onClick={
                                                isClickDisabled
                                                    ? undefined
                                                    : () => handleRealizationElementClick(realization)
                                            }
                                        />
                                    </Tooltip>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
