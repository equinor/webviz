import React from "react";

export function makePlotGrid<T extends unknown>({
    data,
    plotFunction,
    width,
    height,
}: {
    data: T[];
    plotFunction: (data: T) => React.ReactNode;
    width: number;
    height: number;
}): JSX.Element {
    const grid: React.ReactNode[] = [];

    const numCols = Math.floor(Math.sqrt(data.length));
    const numRows = Math.ceil(data.length / numCols);

    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            const index = i * numCols + j;
            if (index >= data.length) {
                break;
            }
            grid.push(
                <div
                    key={index}
                    className="flex flex-col items-center justify-center"
                    style={{
                        width: `${width / numCols - 20}`,
                        height: `${height / numRows - 20}`,
                    }}
                >
                    {plotFunction(data[index])}
                </div>
            );
        }
    }
    return <div className="w-full h-full flex flex-row flex-wrap gap-2">{grid}</div>;
}
