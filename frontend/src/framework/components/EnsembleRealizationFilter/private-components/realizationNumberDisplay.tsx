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

    function createNonCompactRealizationNumberVisualization(): React.ReactNode {
        const groupDivs: JSX.Element[] = [];
        const numGroupedRealizations = 5;

        let groupElmCounter = 0;
        let groupRealizationDivs: JSX.Element[] = [];
        for (const realization of allRealizationsInRange) {
            const isCurrentRealizationAvailable = props.availableRealizations.includes(realization);
            const isRealizationSelected = props.selectedRealizations.includes(realization);
            const isClickDisabled = props.disableInteraction || !isCurrentRealizationAvailable;

            const realizationDiv = (
                <div
                    title={`real-${realization}`}
                    key={realization}
                    className={resolveClassNames(
                        "w-[0.75rem] rounded-full aspect-square flex justify-center items-center",
                        {
                            "bg-green-600": isRealizationSelected,
                            "bg-gray-400": !isRealizationSelected && isCurrentRealizationAvailable,
                            "bg-gray-300": !isRealizationSelected && !isCurrentRealizationAvailable,
                            "border-gray-600": !isCurrentRealizationAvailable,
                            "cursor-pointer": !isClickDisabled,
                        }
                    )}
                    onClick={isClickDisabled ? undefined : () => handleRealizationElementClick(realization)}
                />
            );

            // Add circle to group of 5, when group is full, add to groupDivs and reset groupRealizationDivs and groupElmCounter
            groupRealizationDivs.push(realizationDiv);
            groupElmCounter++;

            if (groupElmCounter === numGroupedRealizations) {
                groupDivs.push(<div className="flex gap-[0.2rem] ">{[...groupRealizationDivs]}</div>);
                groupRealizationDivs = [];
                groupElmCounter = 0;
            }
        }

        return <div className="flex flex-wrap gap-1">{groupDivs}</div>;
    }

    function createCompactRealizationNumberVisualization(): React.ReactNode {
        const { width, height } = divSize;
        const realizationCount = allRealizationsInRange.length;
        const lineWidth = width / realizationCount;
        return (
            <div className="h-10">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                    {allRealizationsInRange.map((realization, index) => {
                        const isCurrentRealizationAvailable = props.availableRealizations.includes(realization);
                        const isRealizationSelected = props.selectedRealizations.includes(realization);

                        return (
                            <rect
                                key={realization}
                                x={index * lineWidth} // Adjust the x position to distribute lines evenly
                                y={0}
                                width={lineWidth} // Set the width of each rect to lineWidth
                                height={"100%"}
                                className={resolveClassNames("", {
                                    "fill-green-600": isRealizationSelected,
                                    "border-green-600": isRealizationSelected,
                                    "fill-gray-300": !isRealizationSelected && isCurrentRealizationAvailable,
                                    "border-gray-300": !isRealizationSelected && isCurrentRealizationAvailable,
                                    "fill-gray-200": !isRealizationSelected && !isCurrentRealizationAvailable,
                                    "border-gray-200": !isRealizationSelected && !isCurrentRealizationAvailable,
                                })}
                            >
                                <title>{`real-${realization}`}</title>
                            </rect>
                        );
                    })}
                </svg>
            </div>
        );
    }

    return (
        <div ref={divRef}>
            {props.showAsCompact
                ? createCompactRealizationNumberVisualization()
                : createNonCompactRealizationNumberVisualization()}
        </div>
    );
};
