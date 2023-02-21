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
    [key in keyof T]: string | number;
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
                matrix: TableMatrix<T, U>;
            }
      ) & {
          width?: number | string;
          height?: number | string;
          onHover?: (series: TableSeries<T> | TableMatrix<T, U>) => void;
          highlightSeriesIndex?: number;
      };

type LayoutError = {
    error: boolean;
    message: string;
};

export const Table: React.FC<TableProps<any, any>> = (props) => {
    const [layoutError, setLayoutError] = React.useState<LayoutError>({ error: false, message: "" });

    React.useLayoutEffect(() => {
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

    if (layoutError.error) {
        return <div>{layoutError.message}</div>;
    }

    if (props.layoutDirection === TableLayoutDirection.Vertical) {
        return (
            <table style={{ width: props.width, height: props.height }}>
                <thead>
                    <tr>
                        {Object.keys(props.headings).map((key, index) => (
                            <th key={index} className="border p-1 text-left">
                                {props.headings[key].label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {props.series.map((series, index) => {
                        return (
                            <tr
                                key={index}
                                className={`${
                                    props.highlightSeriesIndex === index ? "bg-blue-50 " : ""
                                } hover:bg-blue-100`}
                                onPointerOver={() => handlePointerOver(series)}
                            >
                                {Object.keys(series).map((key, index) => (
                                    <td key={index} className="border p-1">
                                        {series[key]}
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
