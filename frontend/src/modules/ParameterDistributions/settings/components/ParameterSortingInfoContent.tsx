import type React from "react";

export function ParameterSortingInfoContent(): React.ReactElement {
    return (
        <>
            <div className="p-4 space-y-4">
                <div>
                    <h4 className="font-semibold text-gray-800 mb-1">Alphabetical</h4>
                    <p className="text-sm text-gray-600">Sorts parameters by name in alphabetical order (A-Z).</p>
                </div>

                <div>
                    <h4 className="font-semibold text-gray-800 mb-1">Entropy Reduction</h4>
                    <p className="text-sm text-gray-600">
                        Shows parameters where uncertainty decreased the most from prior to posterior. High percentage =
                        distribution became more predictable.
                    </p>
                </div>

                <div>
                    <h4 className="font-semibold text-gray-800 mb-1">KL Divergence</h4>
                    <p className="text-sm text-gray-600">
                        Shows parameters where the distribution changed the most (spread, location, or shape). High
                        value = parameter distribution shape and/or location changed significantly.
                    </p>
                </div>

                <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-blue-700">
                        <strong>Note:</strong> For independent ensemble mode, only alphabetical sorting is available.
                    </p>
                </div>
            </div>
        </>
    );
}
