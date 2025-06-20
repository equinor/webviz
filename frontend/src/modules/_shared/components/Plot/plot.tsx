import React from "react";

import _ from "lodash";
import type { PlotParams } from "react-plotly.js";
import BasePlot from "react-plotly.js";

export type PlotProps = {
    /**
     * Informs if data/layout changes are ready to be applied
     */
    plotUpdateReady?: boolean;
} & PlotParams;

const DEFAULT_CONFIG: Partial<Plotly.Config> = {
    modeBarButtonsToRemove: ["toImage", "sendDataToCloud", "resetScale2d"],
    displaylogo: false,
    responsive: true,
    displayModeBar: "hover",
};

const DEFAULT_LAYOUT: Partial<Plotly.Layout> = {
    // By default, we try to keep the ui changes stable
    uirevision: "revision_stable",
};

/**
 * A wrapper utility of react-plotly that avoids the loss of UI state (zoom/pan/select)
 * ! This component is still a bit unstable, and might reset if re-rendered multiple
 * ! times in succession. Try to keep property references as stable as possible
 */
export function Plot(props: PlotProps): React.ReactNode {
    const { plotUpdateReady, layout, data, config, ...otherProps } = props;

    // Default to true if not defined
    const shouldApplyPlotUpdate = plotUpdateReady ?? true;

    // Store previous prop to avoid unnecessary rerenders
    const [prevLayout, setPrevLayout] = React.useState<PlotParams["layout"]>(layout);
    const [prevData, setPrevData] = React.useState<PlotParams["data"]>(data);
    const [prevConfig, setPrevConfig] = React.useState<PlotParams["config"]>(config);

    // ! Plotly seems to mutate objects given to it as props, so we need to clone them
    // ! For example, it changed the data's xAxis from "x1" to "x"
    const [stableLayout, setStableLayout] = React.useState<PlotParams["layout"]>(layout);
    const [stableData, setStableData] = React.useState<PlotParams["data"]>(data);
    const [stableConfig, setStableConfig] = React.useState<PlotParams["config"]>(config);

    const [stableOtherProps, setStableOtherProps] = React.useState<typeof otherProps>(otherProps);

    if (shouldApplyPlotUpdate && !_.isEqual(prevLayout, layout)) {
        setPrevLayout(layout);
        setStableLayout(_.cloneDeep(layout));
    }

    if (shouldApplyPlotUpdate && !_.isEqual(prevData, data)) {
        setPrevData(data);
        setStableData(_.cloneDeep(data));
    }

    if (shouldApplyPlotUpdate && !_.isEqual(prevConfig, config)) {
        setPrevConfig(config);
        setStableConfig(_.cloneDeep(config));
    }

    if (shouldApplyPlotUpdate && !_.isEqual(stableOtherProps, otherProps)) {
        setStableOtherProps(otherProps);
    }

    return React.useMemo(() => {
        const layoutWithDefaults = _.defaults({}, stableLayout, DEFAULT_LAYOUT);
        const configWithDefaults = _.defaults({}, stableConfig, DEFAULT_CONFIG);

        return (
            <BasePlot data={stableData} layout={layoutWithDefaults} config={configWithDefaults} {...stableOtherProps} />
        );
    }, [stableConfig, stableData, stableLayout, stableOtherProps]);
}
