import React from "react";

import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

export type RealizationNumberDisplayProps = {
    selectedRealizations: readonly number[];
    availableRealizations: readonly number[];
    showAsCompact?: boolean;
    disableInteraction: boolean;
    onRealizationNumberSelectionsChange: (realizationNumberSelections: readonly number[]) => void;
};
export const RealizationNumberDisplay: React.FC<RealizationNumberDisplayProps> = (props) => {
    const divRef = React.useRef<HTMLDivElement>(null);
    const divSize = useElementSize(divRef);

    const [prevSelectedRealizations, setPrevSelectedRealizations] = React.useState<readonly number[]>();
    const [allRealizationsInRange, setAllRealizationsInRange] = React.useState<number[]>(
        Array.from({ length: Math.max(...props.availableRealizations) + 1 }, (_, i) => i)
    );

    if (!isEqual(props.selectedRealizations, prevSelectedRealizations)) {
        setPrevSelectedRealizations(props.selectedRealizations);
        setAllRealizationsInRange(Array.from({ length: Math.max(...props.availableRealizations) + 1 }, (_, i) => i));
    }

    function handleRealizationElementClick(realization: number) {
        if (props.disableInteraction) {
            return;
        }
        if (!props.selectedRealizations.includes(realization)) {
            // Add the realization to the selected realizations
            props.onRealizationNumberSelectionsChange([...props.selectedRealizations, realization]);
            return;
        }
        // Remove the realization from the selected realizations
        const newRealizationNumberSelections = props.selectedRealizations.filter(
            (selectedRealization) => selectedRealization !== realization
        );
        props.onRealizationNumberSelectionsChange(newRealizationNumberSelections);
    }

    function createRealizationNumberVisualization(isCompact: boolean, numRealizationPerRow: number): React.ReactNode {
        const mainDivElements: JSX.Element[] = [];

        // Compact/non-compact div size and gap class definitions
        const gapClass = isCompact ? "gap-[3px]" : "gap-[4px]";
        const realizationDivSizeClass = isCompact ? "w-[9px] h-[9px]" : "w-[12px] h-[12px]";

        let rowElmCounter = 0;
        let rowElements: JSX.Element[] = [];
        for (const [index, realization] of allRealizationsInRange.entries()) {
            const isCurrentRealizationAvailable = props.availableRealizations.includes(realization);
            const isRealizationSelected = props.selectedRealizations.includes(realization);
            const isClickDisabled = props.disableInteraction || !isCurrentRealizationAvailable;
            if (rowElmCounter === 0) {
                rowElements = [];
            }
            const realizationDiv = (
                <div
                    title={`real-${realization}`}
                    key={realization}
                    className={resolveClassNames(
                        `${realizationDivSizeClass} rounded-full aspect-square flex justify-center items-center`,
                        {
                            "bg-green-600": isRealizationSelected,
                            "bg-gray-400": !isRealizationSelected && isCurrentRealizationAvailable,
                            "bg-gray-300": !isRealizationSelected && !isCurrentRealizationAvailable,
                            "cursor-pointer": !isClickDisabled,
                        }
                    )}
                    onClick={isClickDisabled ? undefined : () => handleRealizationElementClick(realization)}
                />
            );
            rowElements.push(realizationDiv);

            // If the group is full (or last realization), add it to the main div elements and reset counter
            const isLastRealization = index === allRealizationsInRange.length - 1;
            if (++rowElmCounter === numRealizationPerRow || isLastRealization) {
                const groupDiv = <div className={resolveClassNames(`flex ${gapClass}`)}>{[...rowElements]}</div>;
                mainDivElements.push(groupDiv);
                rowElmCounter = 0;
            }
        }
        return <div className={resolveClassNames(`flex flex-col justify-start ${gapClass}`)}>{mainDivElements}</div>;
    }

    // Compact and non-compact element width and gap (Must be in sync with the CSS in createRealizationNumberVisualization() function)
    const nonCompactGapPx = 4;
    const nonCompactWidthAndHeightPx = 12;

    // Find the number of realizations that can fit in a row based on non-compact size, as factor of 5
    const candidateNumberOfRealizationsPerRow = Math.floor(
        divSize.width / (nonCompactWidthAndHeightPx + nonCompactGapPx)
    );
    const remainder = candidateNumberOfRealizationsPerRow % 5;
    const newNumberOfRealizationsPerRow =
        remainder === 0 ? candidateNumberOfRealizationsPerRow : candidateNumberOfRealizationsPerRow - remainder;

    return (
        <div ref={divRef}>
            {createRealizationNumberVisualization(props.showAsCompact ?? false, newNumberOfRealizationsPerRow)}
        </div>
    );
};
