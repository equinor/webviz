import { useAtom } from "jotai";

import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { CheckboxCompositions } from "@lib/components/Checkbox/compositions";
import { Collapsible } from "@lib/components/Collapsible";
import { Combobox } from "@lib/components/Combobox";
import { Hidden } from "@lib/components/Hidden";
import { RadioCompositions } from "@lib/components/Radio/compositions";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { Slider } from "@lib/components/Slider";

import type { Interfaces } from "../interfaces";
import { BarSortBy, PlotType } from "../typesAndEnums";

import {
    barSortByAtom,
    numBinsAtom,
    orientationAtom,
    plotTypeAtom,
    sharedXAxesAtom,
    sharedYAxesAtom,
} from "./atoms/baseAtoms";

const plotTypeItems = [
    {
        value: PlotType.Histogram,
        label: "Histogram",
    },
    {
        value: PlotType.BarChart,
        label: "Bar chart",
    },
    {
        value: PlotType.Scatter,
        label: "Scatter 2D",
    },
    {
        value: PlotType.ScatterWithColorMapping,
        label: "Scatter 2D with color mapping",
    },
];

//-----------------------------------------------------------------------------------------------------------
export function Settings({ initialSettings }: ModuleSettingsProps<Interfaces>) {
    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [numBins, setNumBins] = useAtom(numBinsAtom);
    const [orientation, setOrientation] = useAtom(orientationAtom);
    const [sharedXAxes, setSharedXAxes] = useAtom(sharedXAxesAtom);
    const [sharedYAxes, setSharedYAxes] = useAtom(sharedYAxesAtom);
    const [barSortBy, setBarSortBy] = useAtom(barSortByAtom);

    useApplyInitialSettingsToState(initialSettings, "plotType", "string", setPlotType);
    useApplyInitialSettingsToState(initialSettings, "numBins", "number", setNumBins);
    useApplyInitialSettingsToState(initialSettings, "orientation", "string", setOrientation);

    function handleNumBinsChange(value: number | readonly number[]) {
        if (Array.isArray(value)) {
            return;
        }
        setNumBins(value as number);
    }

    const showAxesSettings =
        plotType === PlotType.Histogram ||
        plotType === PlotType.Scatter ||
        plotType === PlotType.ScatterWithColorMapping;

    return (
        <Collapsible.ScrollArea>
            <SettingWrapper.Group>
                <SettingWrapper.Section title="Plot type" defaultOpen>
                    <SettingWrapper label="Plot type">
                        <Combobox<PlotType>
                            items={plotTypeItems}
                            value={plotType}
                            onValueChange={(value) => value && setPlotType(value)}
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
                <Hidden hidden={plotType === null}>
                    <SettingWrapper.Section title="Plot settings" defaultOpen>
                        <Hidden hidden={plotType !== PlotType.Histogram}>
                            <SettingWrapper label="Number of bins" stacked>
                                <Slider
                                    value={numBins}
                                    onValueChange={handleNumBinsChange}
                                    min={1}
                                    max={30}
                                    valueLabelDisplay="auto"
                                />
                            </SettingWrapper>
                        </Hidden>
                        <Hidden hidden={!showAxesSettings}>
                            <SettingWrapper label="Axes" stacked contentClassName="flex flex-col gap-y-xs">
                                <>
                                    <CheckboxCompositions.WithLabel
                                        label="Shared X axes"
                                        checked={sharedXAxes}
                                        onCheckedChange={setSharedXAxes}
                                        size="small"
                                    />
                                    <CheckboxCompositions.WithLabel
                                        label="Shared Y axes"
                                        checked={sharedYAxes}
                                        onCheckedChange={setSharedYAxes}
                                        size="small"
                                    />
                                </>
                            </SettingWrapper>
                        </Hidden>
                        <Hidden hidden={plotType !== PlotType.BarChart}>
                            <SettingWrapper label="Orientation" stacked>
                                <RadioCompositions.GroupWithLabels
                                    value={orientation}
                                    options={[
                                        { label: "Horizontal", value: "h" },
                                        { label: "Vertical", value: "v" },
                                    ]}
                                    onValueChange={(value) => setOrientation(value as "h" | "v")}
                                    size="small"
                                />
                            </SettingWrapper>
                        </Hidden>
                        <Hidden hidden={plotType !== PlotType.BarChart}>
                            <SettingWrapper label="Sort bars by" stacked>
                                <RadioCompositions.GroupWithLabels
                                    value={barSortBy}
                                    options={[
                                        { label: "Value", value: BarSortBy.Value },
                                        { label: "Key", value: BarSortBy.Key },
                                    ]}
                                    onValueChange={(value) => setBarSortBy(value as typeof barSortBy)}
                                    size="small"
                                />
                            </SettingWrapper>
                        </Hidden>
                    </SettingWrapper.Section>
                </Hidden>
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
}
