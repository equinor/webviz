import React from "react";

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

    return (
        <div className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-1 max-w-sm">
            {allRealizationsInRange.map((realization) => {
                const isCurrentRealizationAvailable = props.availableRealizations.includes(realization);
                return (
                    <div
                        title={`real-${realization}`}
                        key={realization}
                        className={`w-full rounded-full aspect-square flex justify-center items-center max-w-[0.75rem] max-h-[0.75rem]
                    ${
                        props.selectedRealizations.includes(realization)
                            ? "bg-green-600"
                            : isCurrentRealizationAvailable
                            ? "bg-gray-400"
                            : "bg-gray-100"
                    }
                    ${!isCurrentRealizationAvailable ? "border-gray-600" : ""}
                    ${!props.disabledInteraction && isCurrentRealizationAvailable ? "cursor-pointer" : ""} `}
                        onClick={
                            props.disabledInteraction || !isCurrentRealizationAvailable
                                ? undefined
                                : (e) => handleRealizationElementClick(e, realization)
                        }
                    />
                );
            })}
        </div>
    );
};
