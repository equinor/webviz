import type React from "react";

import { useAtom } from "jotai";

import type { ModuleSettingsProps } from "@framework/Module";
import { useContinuousColorScale, useDiscreteColorScale } from "@framework/WorkbenchSettings";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { ColorGradient } from "@lib/components/ColorGradient/colorGradient";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import type { Interfaces } from "../interfaces";

import { divMidPointAtom, gradientTypeAtom, maxAtom, minAtom, typeAtom } from "./atoms/baseAtoms";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const [type, setType] = useAtom(typeAtom);
    const [gradientType, setGradientType] = useAtom(gradientTypeAtom);
    const [min, setMin] = useAtom(minAtom);
    const [max, setMax] = useAtom(maxAtom);
    const [divMidPoint, setDivMidPoint] = useAtom(divMidPointAtom);

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
            <CollapsibleGroup title="Setting wrapper" contentClassName="flex flex-col gap-2" expanded={true}>
                <SettingWrapper
                    infoAnnotation="This is an info"
                    label="Info annotation"
                    help={{
                        title: "Help title",
                        content: <>This is some help content.</>,
                    }}
                >
                    <Dropdown
                        options={[
                            {
                                label: "Option 1",
                                value: "Option 1",
                            },
                            {
                                label: "Option 2",
                                value: "Option 2",
                            },
                        ]}
                        value="Option 1"
                        onChange={() => {}}
                    />
                </SettingWrapper>
                <SettingWrapper warningAnnotation="This is a warning" label="Warning annotation">
                    <Dropdown
                        options={[
                            {
                                label: "Option 1",
                                value: "Option 1",
                            },
                            {
                                label: "Option 2",
                                value: "Option 2",
                            },
                        ]}
                        value="Option 1"
                        onChange={() => {}}
                    />
                </SettingWrapper>
                <SettingWrapper errorAnnotation="This is an error" label="Error annotation">
                    <Dropdown
                        options={[
                            {
                                label: "Option 1",
                                value: "Option 1",
                            },
                            {
                                label: "Option 2",
                                value: "Option 2",
                            },
                        ]}
                        value="Option 1"
                        onChange={() => {}}
                    />
                </SettingWrapper>
                <SettingWrapper
                    annotations={[
                        { type: "info", message: "This is an info" },
                        { type: "warning", message: "This is a warning" },
                        { type: "error", message: "This is an error" },
                        { type: "error", message: "Another error message" },
                    ]}
                    label="Multiple annotations"
                >
                    <Dropdown
                        options={[
                            {
                                label: "Option 1",
                                value: "Option 1",
                            },
                            {
                                label: "Option 2",
                                value: "Option 2",
                            },
                        ]}
                        value="Option 1"
                        onChange={() => {}}
                    />
                </SettingWrapper>
                <SettingWrapper loadingOverlay={true} label="Loading state">
                    <Dropdown
                        options={[
                            {
                                label: "Option 1",
                                value: "Option 1",
                            },
                            {
                                label: "Option 2",
                                value: "Option 2",
                            },
                        ]}
                        value="Option 1"
                        onChange={() => {}}
                    />
                </SettingWrapper>
                <SettingWrapper label="Error state" errorOverlay="Error message">
                    <Dropdown
                        options={[
                            {
                                label: "Option 1",
                                value: "Option 1",
                            },
                            {
                                label: "Option 2",
                                value: "Option 2",
                            },
                        ]}
                        value="Option 1"
                        onChange={() => {}}
                    />
                </SettingWrapper>
                <SettingWrapper label="Error state" warningOverlay="Warning message">
                    <Dropdown
                        options={[
                            {
                                label: "Option 1",
                                value: "Option 1",
                            },
                            {
                                label: "Option 2",
                                value: "Option 2",
                            },
                        ]}
                        value="Option 1"
                        onChange={() => {}}
                    />
                </SettingWrapper>
                <SettingWrapper label="Error state" infoOverlay="Info message">
                    <Dropdown
                        options={[
                            {
                                label: "Option 1",
                                value: "Option 1",
                            },
                            {
                                label: "Option 2",
                                value: "Option 2",
                            },
                        ]}
                        value="Option 1"
                        onChange={() => {}}
                    />
                </SettingWrapper>
            </CollapsibleGroup>
        </div>
    );
}
