import React from "react";

import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";
import { isEqual } from "lodash";
import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Check } from "@mui/icons-material";

type ValueType = [number, number] | null;
type Category = SettingCategory.RANGE;

export class RangeSetting implements CustomSettingImplementation<ValueType, Category> {
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Range";
    }

    makeComponent(): (props: SettingComponentProps<ValueType, Category>) => React.ReactNode {
        return function RangeSlider(props: SettingComponentProps<ValueType, Category>) {
            const divRef = React.useRef<HTMLDivElement>(null);
            const divSize = useElementSize(divRef);

            const [internalValue, setInternalValue] = React.useState<ValueType>(props.value);
            const [prevValue, setPrevValue] = React.useState<ValueType>(props.value);

            if (!isEqual(prevValue, props.value)) {
                setInternalValue(props.value);
                setPrevValue(props.value);
            }

            function handleChange(_: any, value: number | number[]) {
                if (!Array.isArray(value)) {
                    return;
                }
                setInternalValue([value[0], value[1]]);
            }

            function handleClick() {
                if (internalValue) {
                    props.onValueChange([internalValue[0], internalValue[1]]);
                }
            }

            const hasChanges = !isEqual(internalValue, props.value);
            const MIN_SIZE = 250;
            let inputsVisible = true;
            if (divSize.width < MIN_SIZE) {
                inputsVisible = false;
            }

            return (
                <div
                    className={resolveClassNames("flex flex-row gap-2", { "outline-2 outline-amber-400": hasChanges })}
                    ref={divRef}
                >
                    <div className={resolveClassNames("flex-1 min-w-16", { hidden: !inputsVisible })}>
                        <Input
                            type="number"
                            value={internalValue?.[0] ?? 0}
                            onChange={(e) => handleChange(e, [Number(e.target.value), props.value?.[1] ?? 1])}
                        />
                    </div>
                    <div className="flex-4">
                        <Slider
                            min={props.availableValues?.[0] ?? 0}
                            max={props.availableValues?.[1] ?? 1}
                            step={props.availableValues?.[2] ?? 1}
                            onChange={handleChange}
                            value={internalValue ?? [props.availableValues?.[0] ?? 0, props.availableValues?.[1] ?? 1]}
                            valueLabelDisplay="auto"
                        />
                    </div>
                    <div className={resolveClassNames("flex-1 min-w-16", { hidden: !inputsVisible })}>
                        <Input
                            type="number"
                            value={internalValue?.[1] ?? 1}
                            onChange={(e) => handleChange(e, [props.value?.[0] ?? 0, Number(e.target.value)])}
                        />
                    </div>
                    <div className="flex-1 w-16">
                        <DenseIconButton onClick={handleClick} title="Apply" disabled={!hasChanges}>
                            <Check fontSize="small" />
                        </DenseIconButton>
                    </div>
                </div>
            );
        };
    }
}
