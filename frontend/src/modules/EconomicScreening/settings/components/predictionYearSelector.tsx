import React from "react";

import { Combobox } from "@lib/components/Combobox";
import {
    MAX_CALENDAR_YEAR,
    MIN_CALENDAR_YEAR,
    parseCalendarYear,
} from "@modules/EconomicScreening/utils/setupReadiness";

export type PredictionYearSelectorProps = {
    value: number | null;
    /** Years with supported source data; they describe availability and do not restrict entry. */
    suggestedYears: number[];
    isLoading: boolean;
    onValueChange: (year: number | null) => void;
};

/** Searchable suggestions plus any typed whole year, composed from the shared Combobox without extending it. */
export function PredictionYearSelector(props: PredictionYearSelectorProps): React.ReactNode {
    const [inputText, setInputText] = React.useState("");
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    // Text typed since the last selection; Escape discards it, leaving the selector commits it.
    const pendingTextRef = React.useRef<string | null>(null);
    const typedYear = parseCalendarYear(inputText);
    const suggested = new Set(props.suggestedYears);
    const years = new Set(props.suggestedYears);
    if (props.value !== null) years.add(props.value);
    if (typedYear !== null) years.add(typedYear);
    const items = [...years]
        .sort((first, second) => first - second)
        .map((year) => ({
            value: year,
            label: String(year),
            description: suggested.has(year) ? undefined : "No source data from 1 January",
        }));

    function handleInputValueChange(text: string, eventDetails: { reason: string }) {
        setInputText(text);
        pendingTextRef.current = eventDetails.reason === "input-change" ? text : null;
    }

    function handleValueChange(year: number | null) {
        pendingTextRef.current = null;
        props.onValueChange(year);
    }

    function handleKeyDown(event: React.KeyboardEvent) {
        if (event.key === "Escape") {
            pendingTextRef.current = null;
        }
    }

    function handleBlur(event: React.FocusEvent) {
        if (wrapperRef.current?.contains(event.relatedTarget as Node | null)) {
            return;
        }
        const pendingText = pendingTextRef.current;
        pendingTextRef.current = null;
        const year = pendingText === null ? null : parseCalendarYear(pendingText);
        if (year !== null && year !== props.value) {
            props.onValueChange(year);
        }
    }

    return (
        <div ref={wrapperRef} className="contents" onBlur={handleBlur} onKeyDownCapture={handleKeyDown}>
            <Combobox<number>
                items={items}
                value={props.value}
                onValueChange={handleValueChange}
                onInputValueChange={handleInputValueChange}
                autoHighlight
                showClearAllButton
                loading={props.isLoading && props.suggestedYears.length === 0}
                placeholder="Search or type a year"
                noMatchesText={`Type a whole year within ${MIN_CALENDAR_YEAR}-${MAX_CALENDAR_YEAR}.`}
            />
        </div>
    );
}
