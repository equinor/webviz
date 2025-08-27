import React from "react";

import type { PlotData, PlotMouseEvent } from "plotly.js";

import { Plot } from "@modules/_shared/components/Plot";
import { XAxisBarScaling, type SelectedSensitivity } from "@modules/TornadoChart/typesAndEnums";

import { calculateXaxisRange } from "./sensitivityChart/calculationUtils";
import { createLayout } from "./sensitivityChart/layoutCreator";
import { createLowTrace, createHighTrace, createRealizationPointsTraces } from "./sensitivityChart/traceCreators";
import type { SensitivityChartProps, SelectedBar, TraceGroup } from "./sensitivityChart/types";

export const SensitivityChart: React.FC<SensitivityChartProps> = (props) => {
    const [traceDataArr, setTraceDataArr] = React.useState<Partial<PlotData>[]>([]);
    const [xAxisRange, setXAxisRange] = React.useState<[number, number]>([0, 0]);
    const [selectedBar, setSelectedBar] = React.useState<SelectedBar | null>(null);

    const { showLabels, hideZeroY, sensitivityResponseDataset, height, width, xAxisBarScaling } = props;

    React.useEffect(() => {
        const traces: Partial<PlotData>[] = [];
        const isAbsolute = xAxisBarScaling === XAxisBarScaling.ABSOLUTE;
        let filteredSensitivityResponses = sensitivityResponseDataset.sensitivityResponses;

        if (hideZeroY) {
            filteredSensitivityResponses = filteredSensitivityResponses.filter(
                (s) => s.lowCaseReferenceDifference !== 0 || s.highCaseReferenceDifference !== 0,
            );
        }

        traces.push(
            createLowTrace(
                filteredSensitivityResponses,
                showLabels,
                selectedBar,
                props.sensitivityColorMap,
                isAbsolute,
                props.sensitivityResponseDataset.referenceAverage,
            ),
        );

        traces.push(
            createHighTrace(
                filteredSensitivityResponses,
                showLabels,
                selectedBar,
                props.sensitivityColorMap,
                isAbsolute,
                props.sensitivityResponseDataset.referenceAverage,
            ),
        );

        if (props.showRealizationPoints) {
            const [lowRealizationTrace, highRealizationTrace] = createRealizationPointsTraces(
                filteredSensitivityResponses,
                isAbsolute,
                props.sensitivityResponseDataset.referenceAverage,
            );
            traces.push(lowRealizationTrace, highRealizationTrace);
        }

        setTraceDataArr(traces);
        setXAxisRange(
            calculateXaxisRange(
                filteredSensitivityResponses.map((s) => (isAbsolute ? s.lowCaseAverage : s.lowCaseReferenceDifference)),
                filteredSensitivityResponses.map((s) =>
                    isAbsolute ? s.highCaseAverage : s.highCaseReferenceDifference,
                ),
                filteredSensitivityResponses.map((s) =>
                    isAbsolute
                        ? s.lowCaseRealizationValues
                        : s.lowCaseRealizationValues.map(
                              (val) => val - props.sensitivityResponseDataset.referenceAverage,
                          ),
                ),
                filteredSensitivityResponses.map((s) =>
                    isAbsolute
                        ? s.highCaseRealizationValues
                        : s.highCaseRealizationValues.map(
                              (val) => val - props.sensitivityResponseDataset.referenceAverage,
                          ),
                ),
                isAbsolute,
                props.sensitivityResponseDataset.referenceAverage,
            ),
        );
    }, [
        sensitivityResponseDataset,
        showLabels,
        hideZeroY,
        selectedBar,
        props.sensitivityColorMap,
        props.showRealizationPoints,
        xAxisBarScaling,
        props.sensitivityResponseDataset.referenceAverage,
    ]);

    const handleClick = (event: PlotMouseEvent) => {
        const point = event.points[0];

        const clickedBar: SelectedBar = {
            group: point.data.name as TraceGroup,
            index: point.pointNumber as number,
        };

        if (clickedBar.group === selectedBar?.group && clickedBar.index === selectedBar?.index) {
            setSelectedBar(null);
        } else {
            setSelectedBar(clickedBar);
        }

        if (props.onSelectedSensitivity) {
            const selectedSensitivity: SelectedSensitivity = {
                selectedSensitivity: point.y as string,
                selectedSensitivityCase: point.customdata as string,
            };
            props.onSelectedSensitivity(selectedSensitivity);
        }
    };

    const layout = createLayout(
        props.sensitivityResponseDataset,
        xAxisRange,
        xAxisBarScaling === XAxisBarScaling.ABSOLUTE,
        width,
        height,
    );

    return (
        <Plot
            data={traceDataArr}
            layout={layout}
            config={{ displayModeBar: false, responsive: true }}
            onClick={handleClick}
        />
    );
};
