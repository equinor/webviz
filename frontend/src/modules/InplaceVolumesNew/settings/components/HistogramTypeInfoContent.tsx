import type React from "react";

import { Heading, Paragraph } from "@lib/components/Typography/compositions";

export function HistogramTypeInfoContent(): React.ReactElement {
    return (
        <div className="space-y-2xs max-w-md">
            <div className="gap-2xs flex">
                <div className="bg-surface border-neutral-subtle p-4xs h-16 w-16 shrink-0 rounded border">
                    <svg
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-neutral-subtle h-full w-full"
                    >
                        <path d="M10 10 V90 H90" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                        <rect x="30" y="50" width="40" height="40" fill="currentColor" />

                        <rect x="30" y="20" width="40" height="30" fill="#3B82F6" />
                    </svg>
                </div>
                <div>
                    <Heading as="h3">Stacked</Heading>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Bars are placed on top of each other. The total height shows the cumulative sum of all
                        categories in the bin.
                    </Paragraph>
                </div>
            </div>

            <div className="gap-2xs flex">
                <div className="border-neutral-subtle bg-surface p-4xs h-16 w-16 shrink-0 rounded border">
                    <svg
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-neutral-subtle h-full w-full"
                    >
                        <path d="M10 10 V90 H90" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                        <rect x="25" y="40" width="20" height="50" fill="currentColor" />

                        <rect x="55" y="20" width="20" height="70" fill="#3B82F6" />
                    </svg>
                </div>
                <div>
                    <Heading as="h3">Grouped</Heading>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Bars are placed side-by-side. Best for comparing the exact magnitudes of different categories
                        within the same bin.
                    </Paragraph>
                </div>
            </div>

            <div className="gap-2xs flex">
                <div className="border-neutral-subtle bg-surface p-4xs h-16 w-16 shrink-0 rounded border">
                    <svg
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-neutral-subtle h-full w-full"
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
                    <Heading as="h3">Overlayed</Heading>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Bars occupy the same space starting from the baseline. Requires transparency to see overlaps.
                    </Paragraph>
                </div>
            </div>

            <div className="gap-2xs flex">
                <div className="border-neutral-subtle bg-surface p-4xs h-16 w-16 shrink-0 rounded border">
                    <svg
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-neutral-subtle h-full w-full"
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
                    <Heading as="h3">Relative</Heading>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Stacked bars where positive values grow upward and negative values grow downward from the zero
                        line.
                    </Paragraph>
                </div>
            </div>
        </div>
    );
}
