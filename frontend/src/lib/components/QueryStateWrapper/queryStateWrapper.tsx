import type React from "react";

import type { QueryObserverResult } from "@tanstack/react-query";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

// Definition of error criteria for multiple queries
// - SOME_QUERIES_HAVE_ERROR: If at least one query has an error, the error component is displayed
// - ALL_QUERIES_HAVE_ERROR: If all queries have an error, the error component is displayed
export enum QueriesErrorCriteria {
    SOME_QUERIES_HAVE_ERROR = "some_queries_have_error",
    ALL_QUERIES_HAVE_ERROR = "all_queries_have_error",
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
    showErrorWhen: QueriesErrorCriteria;
};

export const QueryStateWrapper: React.FC<QueryStateWrapperProps | QueryStatesWrapperProps> = (
    props: QueryStateWrapperProps | QueryStatesWrapperProps,
) => {
    let showQueryLoading = false;
    let showQueryError = false;
    if ("queryResult" in props) {
        showQueryLoading = props.queryResult.isFetching;
        showQueryError = props.queryResult.isError;
    } else {
        // Check to prevent .every() returning true on empty array
        if (props.queryResults.length > 0) {
            showQueryLoading = props.queryResults.some((elm) => elm.isFetching);
            showQueryError =
                props.showErrorWhen === QueriesErrorCriteria.SOME_QUERIES_HAVE_ERROR
                    ? props.queryResults.some((elm) => elm.isError)
                    : props.queryResults.every((elm) => elm.isError);
        }
    }

    return (
        <div
            className={resolveClassNames(
                "relative rounded-sm",
                { "outline outline-blue-100 outline-offset-2": showQueryLoading },
                { "outline outline-red-100 outline-offset-2": showQueryError },
                props.className ?? "",
            )}
            style={props.style}
        >
            {showQueryLoading && (
                <div className="absolute left-0 right-0 w-full h-full bg-white/80 flex items-center justify-center z-10">
                    {props.loadingComponent}
                </div>
            )}
            {showQueryError && (
                <div className="absolute left-0 right-0 w-full h-full bg-white/80 flex items-center justify-center z-10">
                    {props.errorComponent}
                </div>
            )}
            {props.children}
        </div>
    );
};
