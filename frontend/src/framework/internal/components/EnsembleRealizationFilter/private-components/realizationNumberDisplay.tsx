import React from "react";

import { isEqual } from "lodash";

import { Tooltip } from "@lib/components/Tooltip";
import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type RealizationNumberDisplayProps = {
    selectedRealizations: readonly number[];
    availableRealizations: readonly number[];
    showAsCompact?: boolean;
    disableOnClick: boolean;
    onRealizationNumberClick: (selectedRealizations: readonly number[]) => void;
};

export const RealizationNumberDisplay: React.FC<RealizationNumberDisplayProps> = (props) => {
    const divRef = React.useRef<HTMLDivElement>(null);
    const divSize = useElementSize(divRef);

    const [prevSelectedRealizations, setPrevSelectedRealizations] = React.useState<readonly number[]>();
    const [allRealizationsInRange, setAllRealizationsInRange] = React.useState<number[]>(
        Array.from({ length: Math.max(...props.availableRealizations) + 1 }, (_, i) => i),
    );

    if (!isEqual(props.selectedRealizations, prevSelectedRealizations)) {
        setPrevSelectedRealizations(props.selectedRealizations);
        setAllRealizationsInRange(Array.from({ length: Math.max(...props.availableRealizations) + 1 }, (_, i) => i));
    }

    function handleRealizationElementClick(realization: number) {
        if (props.disableOnClick) {
            return;
        }
        if (!props.selectedRealizations.includes(realization)) {
            props.onRealizationNumberClick([...props.selectedRealizations, realization]);
            return;
        }
        const newRealizationNumberSelections = props.selectedRealizations.filter(
            (selectedRealization) => selectedRealization !== realization,
        );
        props.onRealizationNumberClick(newRealizationNumberSelections);
    }

    const isCompact = props.showAsCompact ?? false;
    const dotSizePx = isCompact ? 9 : 12;
    const gapPx = isCompact ? 3 : 4;
    const labelWidthPx = 28;

    // Number of dots per row (multiple of 5), accounting for label column in non-compact mode.
    // Total grid width = labelWidthPx + N * (dotSizePx + gapPx), so available = divSize.width - labelWidthPx.
    const availableWidth = isCompact ? divSize.width : divSize.width - labelWidthPx;
    const candidateNumPerRow = Math.max(5, Math.floor(availableWidth / (dotSizePx + gapPx)));
    const remainder = candidateNumPerRow % 5;
    const numPerRow = remainder === 0 ? candidateNumPerRow : candidateNumPerRow - remainder;

    const gridTemplateColumns = isCompact
        ? `repeat(${numPerRow}, ${dotSizePx}px)`
        : `${labelWidthPx}px repeat(${numPerRow}, ${dotSizePx}px)`;

    // Build a linear-gradient that draws 1px vertical separator lines centered in the gap after
    // every 5th dot column. Using a background on the outer container makes the lines continuous
    // across all rows and row gaps without any per-cell logic.
    const dotOffset = isCompact ? 0 : labelWidthPx + gapPx;
    const separatorStops: string[] = [];
    for (let col = 5; col < numPerRow; col += 5) {
        // Center of the gap between dot (col-1) and dot col
        const lineCenter = dotOffset + col * (dotSizePx + gapPx) - gapPx / 2;
        separatorStops.push(
            `transparent ${lineCenter - 0.5}px`,
            `rgba(0,0,0,0.15) ${lineCenter - 0.5}px`,
            `rgba(0,0,0,0.15) ${lineCenter + 0.5}px`,
            `transparent ${lineCenter + 0.5}px`,
        );
    }
    const backgroundImage =
        separatorStops.length > 0 ? `linear-gradient(to right, ${separatorStops.join(", ")})` : undefined;

    const gridElements: React.ReactNode[] = [];

    if (!isCompact) {
        gridElements.push(<span key="col-header-corner" />);
        for (let col = 0; col < numPerRow; col++) {
            gridElements.push(
                <span
                    key={`col-header-${col}`}
                    className="text-neutral-subtle self-end text-center text-[10px] leading-none select-none"
                >
                    {col % 5 === 0 ? col : ""}
                </span>,
            );
        }
    }

    for (let rowStart = 0; rowStart < allRealizationsInRange.length; rowStart += numPerRow) {
        const rowRealizations = allRealizationsInRange.slice(rowStart, rowStart + numPerRow);

        if (!isCompact) {
            gridElements.push(
                <span
                    key={`label-${rowStart}`}
                    className="text-neutral-subtle flex items-center justify-end text-[10px] leading-none select-none"
                >
                    {allRealizationsInRange[rowStart]}
                </span>,
            );
        }

        for (const realization of rowRealizations) {
            const isAvailable = props.availableRealizations.includes(realization);
            const isSelected = props.selectedRealizations.includes(realization);
            const isClickDisabled = props.disableOnClick || !isAvailable;

            gridElements.push(
                <Tooltip
                    key={realization}
                    title={isAvailable ? `real-${realization}` : `real-${realization} (unavailable)`}
                >
                    <div
                        style={{ width: dotSizePx, height: dotSizePx }}
                        className={resolveClassNames(
                            "flex aspect-square items-center justify-center rounded-full hover:outline",
                            {
                                "bg-accent-strong hover:bg-accent-strong-hover hover:outline-accent-strong": isSelected,
                                "bg-accent hover:bg-accent-hover hover:outline-accent": !isSelected && isAvailable,
                                "bg-disabled": !isSelected && !isAvailable,
                                "cursor-pointer": !props.disableOnClick && isAvailable,
                                "cursor-not-allowed": !props.disableOnClick && !isAvailable,
                            },
                        )}
                        onClick={isClickDisabled ? undefined : () => handleRealizationElementClick(realization)}
                    />
                </Tooltip>,
            );
        }
    }

    return (
        <div ref={divRef}>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns,
                    gap: `${gapPx}px`,
                    alignItems: "center",
                    backgroundImage,
                }}
            >
                {gridElements}
            </div>
        </div>
    );
};
