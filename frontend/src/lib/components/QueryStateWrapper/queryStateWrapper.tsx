import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { QueryObserverResult } from "@tanstack/react-query";

// Definition of error criteria for multiple queries
// - SOME_QUERY: If at least one query has an error, the error component is displayed
// - EVERY_QUERY: If all queries have an error, the error component is displayed
export enum QueriesDisplayErrorCriteria {
    SOME_QUERY = "some_query",
    EVERY_QUERY = "every_query",
}

// Base state wrapper props
export type QueryStateWrapperBaseProps = {
    loadingComponent: React.ReactNode;
    errorComponent: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
};

export type QueryStateWrapperProps = QueryStateWrapperBaseProps & {
    queryResult: QueryObserverResult;
};

export type QueryStatesWrapperProps = QueryStateWrapperBaseProps & {
    queryResults: QueryObserverResult[];
    errorCriteria: QueriesDisplayErrorCriteria;
};

export const QueryStateWrapper: React.FC<QueryStateWrapperProps | QueryStatesWrapperProps> = (
    props: QueryStateWrapperProps | QueryStatesWrapperProps
) => {
    let showQueryLoading = false;
    let showQueryError = false;
    if ("queryResult" in props) {
        showQueryLoading = props.queryResult.isLoading;
        showQueryError = props.queryResult.isError;
    } else {
        showQueryLoading = props.queryResults.some((elm) => elm.isLoading);
        if (props.queryResults.length > 0) {
            showQueryError =
                props.errorCriteria === QueriesDisplayErrorCriteria.SOME_QUERY
                    ? props.queryResults.some((elm) => elm.isError)
                    : props.queryResults.every((elm) => elm.isError);
        }
    }

    return (
        <div
            className={resolveClassNames(
                "relative rounded",
                { "outline outline-blue-100 outline-offset-2": showQueryLoading },
                { "outline outline-red-100 outline-offset-2": showQueryError },
                props.className ?? ""
            )}
            style={props.style}
        >
            {showQueryLoading && (
                <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10">
                    {props.loadingComponent}
                </div>
            )}
            {showQueryError && (
                <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10">
                    {props.errorComponent}
                </div>
            )}
            {props.children}
        </div>
    );
};
