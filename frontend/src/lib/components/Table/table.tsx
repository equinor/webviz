import React from "react";

export enum TableLayoutDirection {
    Horizontal = "horizontal",
    Vertical = "vertical",
    Both = "both",
}

export type TableHeading = {
    [key: string]: {
        label: string;
        sortable?: boolean;
    };
};

type TableSeries<T extends TableHeading> = {
    [key in keyof T]: {
        value: string | number;
    };
};

type TableMatrix<T extends TableHeading, U extends TableHeading> = {
    [key in keyof T]: {
        [key in keyof U]: {
            value: string | number;
        };
    };
};

export type TableProps<T extends TableHeading, U extends TableHeading> =
    | (
          | {
                layoutDirection: Exclude<TableLayoutDirection, TableLayoutDirection.Both>;
                headings: T;
                series: TableSeries<T>;
            }
          | {
                layoutDirection: TableLayoutDirection.Both;
                horizontalHeadings: T;
                verticalHeadings: U;
                matrix: TableMatrix<T, U>;
            }
      ) & {
          width?: number | string;
          height?: number | string;
      };

type LayoutError = {
    error: boolean;
    message: string;
};

type LayoutHeadCell = {
    key: string;
    label: string;
    span: number;
    siblings: LayoutHeadCell[];
    parent: LayoutHeadCell | null;
    depth: number;
    maxNumberOfSubheadings: number;
    numChildren: number;
};

const makeLayoutCells = (headings: TableHeading[], depth: number, parent: LayoutHeadCell | null): LayoutHeadCell[] => {
    let layoutCells: LayoutHeadCell[] = [];
    for (const heading of headings) {
        layoutCells.push({
            key: heading.key,
            label: heading.label,
            span: 1,
            siblings: [],
            parent: parent,
            depth: depth,
            numChildren: heading.subHeadings ? heading.subHeadings.length : 0,
            maxNumberOfSubheadings: heading.subHeadings ? countMaxNumberOfSubheadings(heading.subHeadings, 0) : 0,
        });
    }

    layoutCells = layoutCells.map((heading) => ({
        ...heading,
        siblings: layoutCells.filter((sibling) => sibling.key !== heading.key),
    }));

    for (const heading of headings) {
        const cell = layoutCells.find((cell) => cell.key === heading.key);
        if (cell && heading.subHeadings && heading.subHeadings.length > 0) {
            layoutCells.push(...makeLayoutCells(heading.subHeadings, depth + 1, cell));
        }
    }

    return layoutCells;
};

const countMaxNumberOfSubheadings = (headings: TableHeading[], count: number): number => {
    let max = Math.max(headings.length, count);
    for (const heading of headings) {
        if (heading.subHeadings) {
            max = Math.max(max, countMaxNumberOfSubheadings(heading.subHeadings, max));
        }
    }
    return max;
};

const countNumberOfHeadings = (headings: TableHeading[]): number => {
    let count = 0;
    for (const heading of headings) {
        if (heading.subHeadings) {
            count += countMaxNumberOfSubheadings(heading.subHeadings, 1);
        } else {
            count++;
        }
    }
    return count;
};

const makeLayoutHeadings = (headings: TableHeading[], onFilter: (key: string) => void): React.ReactElement => {
    const layoutCells = makeLayoutCells(headings, 0, null);
    const maxSubheadingsDepth = layoutCells.reduce((max, cell) => Math.max(cell.depth, max), 0);

    return (
        <thead>
            {Array.from({ length: maxSubheadingsDepth + 1 }).map((_, depth) => {
                const cells = layoutCells.filter((cell) => cell.depth === depth);
                return (
                    <>
                        <tr key={depth}>
                            {cells.map((cell) => {
                                const colSpan = cell.maxNumberOfSubheadings > 0 ? cell.maxNumberOfSubheadings : 1;
                                const rowSpan = cell.numChildren > 0 ? 1 : maxSubheadingsDepth - depth + 1;
                                return (
                                    <th
                                        key={cell.key}
                                        colSpan={colSpan}
                                        rowSpan={rowSpan}
                                        className="border border-white p-4 bg-slate-200 text-left"
                                    >
                                        {cell.label}
                                    </th>
                                );
                            })}
                        </tr>
                    </>
                );
            })}
        </thead>
    );
};

export const Table: React.FC<TableProps> = (props) => {
    const [layoutError, setLayoutError] = React.useState<LayoutError>({ error: false, message: "" });

    React.useLayoutEffect(() => {
        if (props.layoutDirection === TableLayoutDirection.Both) {
            if (props.verticalHeadings.length !== props.data.length) {
                setLayoutError({
                    error: true,
                    message: "The number of vertical headings does not match the number of data series.",
                });
                return;
            }
            const maxNumberOfSubheadings = countMaxNumberOfSubheadings(props.horizontalHeadings, 0);
            for (const series of props.data) {
                if (maxNumberOfSubheadings !== series.length) {
                    setLayoutError({
                        error: true,
                        message: "The number of horizontal headings does not match the number of data series.",
                    });
                    return;
                }
            }
        } else {
            const maxNumberOfSubheadings = countNumberOfHeadings(props.headings);
            console.log(maxNumberOfSubheadings);
            for (const series of props.data) {
                if (series.length !== maxNumberOfSubheadings) {
                    setLayoutError({
                        error: true,
                        message: "The number of headings does not match the number of data series.",
                    });
                    break;
                }
            }
        }
    }, [props]);

    if (layoutError.error) {
        return <div>{layoutError.message}</div>;
    }

    if (props.layoutDirection === TableLayoutDirection.Vertical) {
        return (
            <table style={{ width: props.width, height: props.height }}>
                {makeLayoutHeadings(props.headings, (key) => console.log(key))}
                <tbody>
                    {props.data.map((series, index) => {
                        return (
                            <tr key={index}>
                                {series.map((value, index) => (
                                    <td key={index} className="border p-4">
                                        {value}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    }

    return <div>Table</div>;
};
