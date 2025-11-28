import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

interface WellboreItemProps {
    wellbore: {
        wellboreUuid: string;
        uniqueWellboreIdentifier: string;
        wellborePurpose: string;
        wellboreStatus: string;
        wellEasting: number;
        wellNorthing: number;
        depthReferencePoint: string;
        depthReferenceElevation: number;
        perforationAndScreens: string[];
    };
    isSelected: boolean;
    onWellboreToggle: (wellbore: any) => void;
}

export function WellboreItem({ wellbore, isSelected, onWellboreToggle }: WellboreItemProps): React.JSX.Element {
    return (
        <div
            className={resolveClassNames(
                "flex items-start p-4 border-l-4 cursor-pointer hover:bg-blue-50 transition-colors",
                {
                    "border-l-blue-500 bg-blue-50": isSelected,
                    "border-l-transparent": !isSelected,
                },
            )}
            onClick={() => onWellboreToggle(wellbore)}
        >
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onWellboreToggle(wellbore)}
                onClick={(e) => e.stopPropagation()}
                className="mr-4"
            />
            <div className="flex-1">
                <div className="font-medium text-base mb-1">{wellbore.uniqueWellboreIdentifier}</div>
                <div className="grid grid-cols-4 gap-6 mt-2 text-sm text-gray-600">
                    <div>
                        <span className="font-medium">Purpose:</span> {wellbore.wellborePurpose || "N/A"}
                    </div>
                    <div>
                        <span className="font-medium">Status:</span> {wellbore.wellboreStatus || "N/A"}
                    </div>
                    <div>
                        <span className="font-medium">Location:</span> ({wellbore.wellEasting.toFixed(1)},{" "}
                        {wellbore.wellNorthing.toFixed(1)})
                    </div>
                    <div>
                        <span className="font-medium">Depth Ref:</span> {wellbore.depthReferencePoint} (
                        {wellbore.depthReferenceElevation.toFixed(1)}m)
                    </div>
                </div>
                {/* Completion Data */}
                {wellbore.perforationAndScreens.length > 0 && (
                    <div className="grid grid-cols-2 gap-6 mt-3 text-xs">
                        {wellbore.perforationAndScreens.some((item) => item !== "Screen") && (
                            <div className="flex flex-wrap gap-1.5">
                                <span className="font-medium text-orange-700">Perforations:</span>
                                {wellbore.perforationAndScreens
                                    .filter((item) => item !== "Screen")
                                    .slice(0, 4)
                                    .map((perfStatus, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800"
                                        >
                                            {perfStatus}
                                        </span>
                                    ))}
                                {wellbore.perforationAndScreens.filter((item) => item !== "Screen").length > 4 && (
                                    <span className="text-orange-600 font-medium">
                                        +{wellbore.perforationAndScreens.filter((item) => item !== "Screen").length - 4}{" "}
                                        more
                                    </span>
                                )}
                            </div>
                        )}
                        {wellbore.perforationAndScreens.includes("Screen") && (
                            <div className="flex flex-wrap gap-1.5">
                                <span className="font-medium text-teal-700">Screens:</span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-teal-100 text-teal-800">
                                    Screen
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
