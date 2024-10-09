import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

export type RealizationNumberSelectorProps = {
    selectedRealizations: readonly number[];
    availableRealizations: readonly number[];
    disabledInteraction: boolean;
    onRealizationNumberSelectionsChange: (realizationNumberSelections: readonly number[]) => void;
};

export const RealizationNumberSelector: React.FC<RealizationNumberSelectorProps> = (props) => {
    const [prevSelectedRealizations, setPrevSelectedRealizations] = React.useState<readonly number[]>();
    const [allRealizationsInRange, setAllRealizationsInRange] = React.useState<number[]>(
        Array.from({ length: Math.max(...props.availableRealizations) + 1 }, (_, i) => i)
    );

    if (!isEqual(props.selectedRealizations, prevSelectedRealizations)) {
        setPrevSelectedRealizations(props.selectedRealizations);
        setAllRealizationsInRange(Array.from({ length: Math.max(...props.availableRealizations) + 1 }, (_, i) => i));
    }

    function handleRealizationElementClick(e: React.MouseEvent<HTMLDivElement>, realization: number) {
        if (props.disabledInteraction) {
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

    // grid-cols-[repeat(18,minmax(0,1fr))]
    return (
        <div className="grid gap-1 max-w-sm" style={{ gridTemplateColumns: "repeat(40, minmax(0, 1fr))" }}>
            {allRealizationsInRange.map((realization) => {
                const isCurrentRealizationAvailable = props.availableRealizations.includes(realization);
                const isRealizationSelected = props.selectedRealizations.includes(realization);
                const isClickDisabled = props.disabledInteraction || !isCurrentRealizationAvailable;
                return (
                    <div
                        title={`real-${realization}`}
                        key={realization}
                        className={resolveClassNames(
                            "w-full rounded-full aspect-square flex justify-center items-center min-w-[0.5rem]",
                            {
                                "bg-green-600": isRealizationSelected,
                                "bg-gray-400": !isRealizationSelected && isCurrentRealizationAvailable,
                                "bg-gray-300": !isRealizationSelected && !isCurrentRealizationAvailable,
                                "border-gray-600": !isCurrentRealizationAvailable,
                                "cursor-pointer": !isClickDisabled,
                            }
                        )}
                        onClick={isClickDisabled ? undefined : (e) => handleRealizationElementClick(e, realization)}
                    />
                );
            })}
        </div>
    );
};
