import type React from "react";

import { useAtom } from "jotai";

import type { ModuleSettingsProps } from "@framework/Module";
import { Source } from "@framework/utils/atomUtils";
import { useContinuousColorScale, useDiscreteColorScale } from "@framework/WorkbenchSettings";
import { Button } from "@lib/components/Button";
import { ColorGradient } from "@lib/components/ColorGradient/colorGradient";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select } from "@lib/components/Select";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { PersistableAtomWarningWrapper } from "@modules/_shared/components/PersistableAtomWarningWrapper";

import type { Interfaces } from "../interfaces";
import type { SerializedState } from "../persistedState";

import { divMidPointAtom, gradientTypeAtom, maxAtom, minAtom, myPersistableAtom, typeAtom } from "./atoms/baseAtoms";

export function Settings(props: ModuleSettingsProps<Interfaces, SerializedState>): React.ReactNode {
    const [type, setType] = useAtom(typeAtom);
    const [gradientType, setGradientType] = useAtom(gradientTypeAtom);
    const [min, setMin] = useAtom(minAtom);
    const [max, setMax] = useAtom(maxAtom);
    const [divMidPoint, setDivMidPoint] = useAtom(divMidPointAtom);
    const [persistableState, setPersistableState] = useAtom(myPersistableAtom);

    function handleTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setType(e.target.value as ColorScaleType);
    }

    function handleGradientTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setGradientType(e.target.value as ColorScaleGradientType);
    }

    const continuousColorScale = useContinuousColorScale(props.workbenchSettings, { gradientType });
    const discreteColorScale = useDiscreteColorScale(props.workbenchSettings, { gradientType });

    const colorScale = type === ColorScaleType.Continuous ? continuousColorScale : discreteColorScale;

    return (
        <div className="flex flex-col gap-4">
            <Label text="Persistable state">
                <>
                    <PersistableAtomWarningWrapper atom={myPersistableAtom}>
                        <Select
                            size={5}
                            options={[
                                { value: "value1", label: "Value 1" },
                                { value: "value2", label: "Value 2" },
                            ]}
                            onChange={(values) => {
                                setPersistableState(values[0]);
                            }}
                            value={[persistableState.value]}
                        />
                    </PersistableAtomWarningWrapper>
                    <Button onClick={() => setPersistableState({ value: "value1", _source: Source.PERSISTENCE })}>
                        Valid Persisted Value
                    </Button>
                    <Button onClick={() => setPersistableState({ value: "value1", _source: Source.TEMPLATE })}>
                        Valid Template Value
                    </Button>
                    <Button onClick={() => setPersistableState({ value: "invalid", _source: Source.PERSISTENCE })}>
                        Invalid Persisted Value
                    </Button>
                    <Button onClick={() => setPersistableState({ value: "invalid", _source: Source.TEMPLATE })}>
                        Invalid Template Value
                    </Button>
                    <Button onClick={() => setPersistableState("value3")}>Invalid Value with fixup</Button>
                </>
            </Label>
            <Label text="Type">
                <RadioGroup
                    value={type}
                    onChange={handleTypeChange}
                    options={[
                        {
                            value: ColorScaleType.Discrete,
                            label: (
                                <div className="flex gap-4 items-center">
                                    <div className="grow w-24">
                                        <ColorGradient colorPalette={colorScale.getColorPalette()} steps={10} />
                                    </div>
                                    <div>Discrete</div>
                                </div>
                            ),
                        },
                        {
                            value: ColorScaleType.Continuous,
                            label: (
                                <div className="flex gap-4 items-center h-4">
                                    <div className="grow w-24">
                                        <ColorGradient colorPalette={colorScale.getColorPalette()} />
                                    </div>
                                    <div>Continuous</div>
                                </div>
                            ),
                        },
                    ]}
                />
            </Label>
            <Label text="Gradient type">
                <RadioGroup
                    value={gradientType}
                    onChange={handleGradientTypeChange}
                    options={[
                        {
                            value: ColorScaleGradientType.Sequential,
                            label: "Sequential",
                        },
                        {
                            value: ColorScaleGradientType.Diverging,
                            label: "Diverging",
                        },
                    ]}
                    direction="horizontal"
                />
            </Label>
            <Label text="Min">
                <Input
                    type="number"
                    min={-1}
                    max={10}
                    value={min}
                    onChange={(e) => setMin(parseFloat(e.target.value))}
                />
            </Label>
            <Label text="Max">
                <Input type="number" value={max} onChange={(e) => setMax(parseFloat(e.target.value))} />
            </Label>
            {gradientType === ColorScaleGradientType.Diverging && (
                <Label text="Midpoint">
                    <Input
                        type="number"
                        value={divMidPoint}
                        onChange={(e) => setDivMidPoint(parseFloat(e.target.value))}
                        min={0}
                        max={max}
                    />
                </Label>
            )}
        </div>
    );
}
