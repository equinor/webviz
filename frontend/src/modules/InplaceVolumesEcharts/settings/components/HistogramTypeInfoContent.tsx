import type React from "react";

export function HistogramTypeInfoContent(): React.ReactElement {
    return (
        <div className="space-y-8 max-w-md">
            <div className="flex gap-4">
                <div className="shrink-0 w-16 h-16 bg-gray-50 rounded border border-gray-200 p-1">
                    <svg
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full text-gray-300"
                    >
                        <path d="M10 10 V90 H90" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                        <rect x="30" y="50" width="40" height="40" fill="currentColor" />

                        <rect x="30" y="20" width="40" height="30" fill="#3B82F6" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-bold text-sm  tracking-wider text-gray-900">Stacked</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Bars are placed on top of each other. The total height shows the cumulative sum of all
                        categories in the bin.
                    </p>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="shrink-0 w-16 h-16 bg-gray-50 rounded border border-gray-200 p-1">
                    <svg
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full text-gray-300"
                    >
                        <path d="M10 10 V90 H90" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                        <rect x="25" y="40" width="20" height="50" fill="currentColor" />

                        <rect x="55" y="20" width="20" height="70" fill="#3B82F6" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-bold text-sm  tracking-wider text-gray-900">Grouped</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Bars are placed side-by-side. Best for comparing the exact magnitudes of different categories
                        within the same bin.
                    </p>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="shrink-0 w-16 h-16 bg-gray-50 rounded border border-gray-200 p-1">
                    <svg
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full text-gray-300"
                    >
                        <path d="M10 10 V90 H90" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                        <rect x="20" y="30" width="60" height="60" fill="currentColor" />

                        <rect
                            x="35"
                            y="50"
                            width="30"
                            height="40"
                            fill="#3B82F6"
                            opacity="0.7"
                            className="mix-blend-multiply"
                        />
                    </svg>
                </div>
                <div>
                    <h3 className="font-bold text-sm  tracking-wider text-gray-900">Overlayed</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Bars occupy the same space starting from the baseline. Requires transparency to see overlaps.
                    </p>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="shrink-0 w-16 h-16 bg-gray-50 rounded border border-gray-200 p-1">
                    <svg
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full text-gray-300"
                    >
                        <path
                            d="M10 10 V90 H90 M10 50 H90"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />

                        <rect x="30" y="20" width="40" height="30" fill="#3B82F6" />

                        <rect x="30" y="50" width="40" height="25" fill="#EF4444" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-bold text-sm  tracking-wider text-gray-900">Relative</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Stacked bars where positive values grow upward and negative values grow downward from the zero
                        line.
                    </p>
                </div>
            </div>
        </div>
    );
}
