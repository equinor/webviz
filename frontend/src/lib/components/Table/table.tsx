import React from "react";

import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";

import { v4 } from "uuid";

import { IconButton } from "../IconButton";
import { Input } from "../Input";
import { Virtualization } from "../Virtualization";

export enum TableLayoutDirection {
    Horizontal = "horizontal",
    Vertical = "vertical",
    Both = "both",
}

export type TableHeading = {
    [key: string]: {
        label: string;
        sortable?: boolean;
        sizeInPercent: number;
    };
};

type TableSeries<T extends TableHeading> = {
    [key in keyof T]: string | number;
};

type IdentifiedTableSeries<T extends TableHeading> = {
    id: string;
    values: { [key in keyof T]: string | number };
};

type TableMatrix<T extends TableHeading, U extends TableHeading> = {
    [key in keyof T]: {
        [key in keyof U]: string | number;
    };
};

export type TableProps<T extends TableHeading, U extends TableHeading> =
    | (
          | {
                layoutDirection: Exclude<TableLayoutDirection, TableLayoutDirection.Both>;
                headings: T;
                series: TableSeries<T>[];
            }
          | {
                layoutDirection: TableLayoutDirection.Both;
                horizontalHeadings: T;
                verticalHeadings: U;
                series: TableMatrix<T, U>;
            }
      ) & {
          width?: number | string;
          height?: number | string;
          onHover?: (series: TableSeries<T> | TableMatrix<T, U>) => void;
          highlightFilter?: (series: TableSeries<T> | TableMatrix<T, U>) => boolean;
      };

type LayoutError = {
    error: boolean;
    message: string;
};

enum SortDirection {
    Asc = "asc",
    Desc = "desc",
}

function filterData(
    data: IdentifiedTableSeries<TableHeading>[],
    filterValues: { [key: string]: string }
): IdentifiedTableSeries<TableHeading>[] {
    return data.filter((series) => {
        for (const key in filterValues) {
            if (
                filterValues[key] !== "" &&
                series.values[key].toString().toLowerCase().indexOf(filterValues[key].toLowerCase()) === -1
            ) {
                return false;
            }
        }
        return true;
    });
}

function sortData(
    data: IdentifiedTableSeries<TableHeading>[],
    col: string,
    dir: SortDirection
): IdentifiedTableSeries<TableHeading>[] {
    return [
        ...data.sort((a, b) => {
            if (a.values[col] < b.values[col]) {
                return dir === SortDirection.Asc ? -1 : 1;
            }
            if (a.values[col] > b.values[col]) {
                return dir === SortDirection.Asc ? 1 : -1;
            }
            return 0;
        }),
    ];
}

function preprocessData(data: TableSeries<TableHeading>[]): IdentifiedTableSeries<TableHeading>[] {
    return data.map((series) => {
        return {
            id: v4(),
            values: series,
        };
    });
}

function makeRows(
    data: IdentifiedTableSeries<TableHeading>[],
    headings: TableHeading
): { [key: string]: React.ReactNode[] } {
    const rows: { [key: string]: React.ReactNode[] } = {};

    data.forEach((series) => {
        Object.keys(headings).forEach((key) => {
            if (!rows[key]) {
                rows[key] = [];
            }
            rows[key].push(
                <td key={series.id} className="px-2 py-2 whitespace-nowrap">
                    {series.values[key]}
                </td>
            );
        });
    });

    return rows;
}

export const Table: React.FC<TableProps<TableHeading, TableHeading>> = (props) => {
    const [layoutError, setLayoutError] = React.useState<LayoutError>({ error: false, message: "" });
    const [preprocessedData, setPreprocessedData] = React.useState<IdentifiedTableSeries<TableHeading>[]>([]);
    const [filteredData, setFilteredData] = React.useState<IdentifiedTableSeries<TableHeading>[]>([]);
    const [filterValues, setFilterValues] = React.useState<{ [key: string]: string }>({});
    const [sortColumnAndDirection, setSortColumnAndDirection] = React.useState<{ col: string; dir: SortDirection }>({
        col: "",
        dir: SortDirection.Asc,
    });
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (props.layoutDirection === TableLayoutDirection.Both) {
            setPreprocessedData([]);
            return;
        }

        setPreprocessedData(preprocessData(props.series));
    }, [props.layoutDirection, props.series]);

    React.useEffect(() => {
        if (props.layoutDirection === TableLayoutDirection.Both) {
            setFilteredData([]);
            return;
        }

        setFilteredData(filterData(preprocessedData, filterValues));
    }, [props.layoutDirection, preprocessedData, filterValues]);

    React.useEffect(() => {
        if (props.layoutDirection === TableLayoutDirection.Both) {
            return;
        }

        setFilteredData((prev) => sortData(prev, sortColumnAndDirection.col, sortColumnAndDirection.dir));
    }, [props.layoutDirection, sortColumnAndDirection]);

    React.useEffect(() => {
        if (props.layoutDirection === TableLayoutDirection.Both) {
            /*
            if (props.verticalHeadings.length !== props.matrix.length) {
                setLayoutError({
                    error: true,
                    message: "The number of vertical headings does not match the number of data series.",
                });
                return;
            }
            const maxNumberOfSubheadings = countMaxNumberOfSubheadings(props.horizontalHeadings, 0);
            for (const series of props.matrix) {
                if (maxNumberOfSubheadings !== series.length) {
                    setLayoutError({
                        error: true,
                        message: "The number of horizontal headings does not match the number of data series.",
                    });
                    return;
                }
            }
            */
        } else {
            const maxNumberOfSubheadings = Object.keys(props.headings).length;
            for (const series of props.series) {
                if (Object.keys(series).length !== maxNumberOfSubheadings) {
                    setLayoutError({
                        error: true,
                        message: "The number of headings does not match the number of data series.",
                    });
                    break;
                }
            }
        }
    }, [props]);

    const handlePointerOver = (series: TableSeries<any> | TableMatrix<any, any>) => {
        if (props.onHover) {
            props.onHover(series);
        }
    };

    const handleFilterChange = (col: string, value: string) => {
        setFilterValues({ ...filterValues, [col]: value });
    };

    const handleSortDirectionChange = (col: string, dir: SortDirection) => {
        setSortColumnAndDirection({ col, dir });
    };

    if (layoutError.error) {
        return <div>{layoutError.message}</div>;
    }

    if (props.layoutDirection === TableLayoutDirection.Vertical) {
        return (
            <div
                ref={containerRef}
                className="overflow-auto relative"
                style={{ width: props.width, maxHeight: props.height }}
            >
                <table className="w-full h-full border-0 border-separate border-spacing-0">
                    <thead className="border-0 m-0 p-0">
                        <tr className="sticky p-0 border-0">
                            {Object.keys(props.headings).map((key) => (
                                <th
                                    key={key}
                                    className="bg-slate-300 border border-gray-400 border-solid p-0 text-left sticky top-0 drop-shadow"
                                    style={{ width: `${props.headings[key].sizeInPercent}%` }}
                                >
                                    <div className="p-1 flex items-center">
                                        <span className="flex-grow">{props.headings[key].label}</span>
                                        <div className="flex flex-col">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleSortDirectionChange(key, SortDirection.Asc)}
                                                color={
                                                    sortColumnAndDirection.col === key &&
                                                    sortColumnAndDirection.dir === SortDirection.Asc
                                                        ? "text-red-600"
                                                        : undefined
                                                }
                                            >
                                                <ChevronUpIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleSortDirectionChange(key, SortDirection.Desc)}
                                                color={
                                                    sortColumnAndDirection.col === key &&
                                                    sortColumnAndDirection.dir === SortDirection.Desc
                                                        ? "text-red-600"
                                                        : undefined
                                                }
                                            >
                                                <ChevronDownIcon />
                                            </IconButton>
                                        </div>
                                    </div>
                                    <div className="border-gray-400 border-t border-solid p-1">
                                        <Input
                                            type="text"
                                            placeholder={`Filter ${props.headings[key].label}...`}
                                            onChange={(e) => handleFilterChange(key, e.target.value)}
                                        />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody style={{ width: props.width, maxHeight: props.height }}>
                        <Virtualization
                            containerRef={containerRef}
                            direction="vertical"
                            placeholderComponent="tr"
                            elements={filteredData}
                            itemSize={30}
                            renderItem={(item: IdentifiedTableSeries<any>) => {
                                return (
                                    <tr
                                        key={item.id}
                                        className={`${
                                            props.highlightFilter && props.highlightFilter(item.values)
                                                ? "bg-blue-50 "
                                                : ""
                                        } hover:bg-blue-100`}
                                        onPointerOver={() => handlePointerOver(item.values)}
                                        style={{ height: 30 }}
                                    >
                                        {Object.keys(item.values).map((key) => (
                                            <td key={`${item.id}-${key}`} className="border p-1">
                                                {item.values[key]}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            }}
                        />
                    </tbody>
                </table>
            </div>
        );
    }

    if (props.layoutDirection === TableLayoutDirection.Horizontal) {
        return (
            <div
                ref={containerRef}
                className="overflow-auto relative"
                style={{ maxWidth: props.width, height: props.height }}
            >
                <table className="w-full h-full border-0 border-separate border-spacing-0 table-fixed">
                    <tbody>
                        {Object.keys(props.headings).map((key) => (
                            <tr key={key}>
                                <th
                                    key={key}
                                    className="bg-slate-300 border border-gray-400 border-solid p-0 text-left sticky left-0 drop-shadow w-40"
                                    style={{ height: `${props.headings[key].sizeInPercent}%` }}
                                >
                                    <div className="p-1 flex items-center">
                                        <span className="flex-grow">{props.headings[key].label}</span>
                                        <div className="flex flex-col">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleSortDirectionChange(key, SortDirection.Asc)}
                                                color={
                                                    sortColumnAndDirection.col === key &&
                                                    sortColumnAndDirection.dir === SortDirection.Asc
                                                        ? "text-red-600"
                                                        : undefined
                                                }
                                            >
                                                <ChevronUpIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleSortDirectionChange(key, SortDirection.Desc)}
                                                color={
                                                    sortColumnAndDirection.col === key &&
                                                    sortColumnAndDirection.dir === SortDirection.Desc
                                                        ? "text-red-600"
                                                        : undefined
                                                }
                                            >
                                                <ChevronDownIcon />
                                            </IconButton>
                                        </div>
                                    </div>
                                    <div className="border-gray-400 border-t border-solid p-1">
                                        <Input
                                            type="text"
                                            placeholder={`Filter ${props.headings[key].label}...`}
                                            onChange={(e) => handleFilterChange(key, e.target.value)}
                                        />
                                    </div>
                                </th>
                                <Virtualization
                                    containerRef={containerRef}
                                    direction="horizontal"
                                    placeholderComponent="td"
                                    elements={filteredData}
                                    itemSize={130}
                                    renderItem={(item: IdentifiedTableSeries<any>) => {
                                        return (
                                            <td
                                                key={`${item.id}-${key}`}
                                                className={`${
                                                    props.highlightFilter && props.highlightFilter(item.values)
                                                        ? "bg-blue-50 "
                                                        : ""
                                                } hover:bg-blue-100 border p-1`}
                                                onPointerOver={() => handlePointerOver(item.values)}
                                                style={{ width: 130 }}
                                            >
                                                {item.values[key]}
                                            </td>
                                        );
                                    }}
                                />
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return <div>Table</div>;
};

Table.displayName = "Table";
