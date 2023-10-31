import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { BaseComponent, BaseComponentProps } from "@lib/components/BaseComponent";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { getTextWidthWithFont } from "@lib/utils/textSize";
import { Close } from "@mui/icons-material";

type RealizationRange = {
    start: number;
    end?: number;
};

type RealizationRangeTag = {
    range: RealizationRange;
};

const realizationRangeRegex = /^\d+(\-\d+)?$/;

const RealizationRangeTag: React.FC<RealizationRangeTag> = (props) => {
    const [valid, setValid] = React.useState<boolean>(true);
    const [hasFocus, setHasFocus] = React.useState<boolean>(false);

    const ref = React.useRef<HTMLInputElement>(null);

    function makeValue() {
        if (props.range.end) {
            return `${props.range.start}-${props.range.end}`;
        } else {
            return `${props.range.start}`;
        }
    }

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        if (realizationRangeRegex.test(value)) {
            setValid(true);
        } else {
            setValid(false);
        }
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
        e.stopPropagation();
        setHasFocus(true);
    }

    return (
        <li
            className={resolveClassNames("flex rounded px-2 py-1 mr-1 text-sm", {
                "bg-blue-200": !hasFocus,
                "bg-red-300": !valid,
            })}
        >
            <input
                ref={ref}
                className="bg-transparent outline-none"
                style={{ width: getTextWidthWithFont(makeValue(), "0.75rem") + 10 }}
                type="text"
                defaultValue={makeValue()}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={() => setHasFocus(false)}
            />
            <div
                className={resolveClassNames("text-slate-800 hover:text-slate-600 text-sm cursor-pointer", {
                    invisible: hasFocus,
                })}
            >
                <Close fontSize="inherit" />
            </div>
        </li>
    );
};

export type RealizationPickerProps = {
    ensembleIdents: EnsembleIdent[];
    onChange?: (selectedRealizations: number[]) => void;
} & BaseComponentProps;

export const RealizationPicker: React.FC<RealizationPickerProps> = (props) => {
    const [selectedRealizations, setSelectedRealizations] = React.useState<RealizationRange[]>([]);
    const [numSelectedRealizations, setNumSelectedRealizations] = React.useState<number>(0);

    const debounceTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    function handleTotalChange(event: React.ChangeEvent<HTMLInputElement>) {
        const selectedRealizations = event.target.value
            .split(",")
            .map((valueOrRange) => {
                const range = valueOrRange.split("-");
                if (range.length === 1) {
                    return parseInt(range[0]);
                } else if (range.length === 2) {
                    return Array.from(
                        { length: parseInt(range[1]) - parseInt(range[0]) + 1 },
                        (_, i) => i + parseInt(range[0])
                    );
                } else {
                    return [];
                }
            })
            .flat()
            .filter((realization) => realization > 0);

        setNumSelectedRealizations(selectedRealizations.length);

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            if (props.onChange) {
                props.onChange(selectedRealizations);
            }
        }, 500);
    }

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        if (value[value.length - 1] === ",") {
            const range = value.split("-");
            const realizations: number[] = [];
            if (range.length === 1) {
                realizations.push(parseInt(range[0]));
                setSelectedRealizations([...selectedRealizations, { start: parseInt(range[0]) }]);
            } else if (range.length === 2) {
                for (let i = parseInt(range[0]); i <= parseInt(range[1]); i++) {
                    realizations.push(i);
                }
                setSelectedRealizations([
                    ...selectedRealizations,
                    { start: parseInt(range[0]), end: parseInt(range[1]) },
                ]);
            }
            event.target.value = "";
        }
    }

    function handlePointerDown() {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }

    return (
        <BaseComponent disabled={props.disabled}>
            <ul
                className="border border-gray-300 rounded p-2 flex flex-wrap items-center cursor-text"
                onPointerDown={handlePointerDown}
            >
                {selectedRealizations.map((realizationRange) => (
                    <RealizationRangeTag key={realizationRange.start} range={realizationRange} />
                ))}
                <li className="flex-grow">
                    <input
                        ref={inputRef}
                        type="text"
                        onChange={handleChange}
                        className="outline-none"
                        style={{ width: 30 }}
                    />
                </li>
            </ul>
            <div className="text-sm text-gray-500 text-right mt-2">
                {numSelectedRealizations} realization{numSelectedRealizations === 1 ? "" : "s"} selected
            </div>
        </BaseComponent>
    );
};
