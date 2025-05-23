import React from "react";

import _ from "lodash";
import type { PlotParams } from "react-plotly.js";
import BasePlot from "react-plotly.js";

export type PlotProps = {
    /**
     * Informs if data/layout changes are ready to be applied
     */
    plotUpdateReady: boolean;
} & PlotParams;

const DEFAULT_CONFIG: Partial<Plotly.Config> = {
    modeBarButtonsToRemove: ["toImage", "sendDataToCloud", "resetScale2d"],
    displaylogo: false,
    responsive: true,
    displayModeBar: true,
};

const DEFAULT_LAYOUT: Partial<Plotly.Layout> = {
    // By default, we try to keep the ui changes stable
    uirevision: "revision_stable",
};

/**
 * A wrapper utility of react-plotly that avoids the loss of UI state (zoom/pan/select)
 * ! This component is still a bit unstable, and might reset if re-rendered multiple
 * ! times in succession. Try to keep property references as stable as possible
 * @param props
 * @returns
 */
export function Plot(props: PlotProps): React.ReactNode {
    const { plotUpdateReady, layout, data, config, ...otherProps } = props;

    // Store previous prop to avoid unnecessary rerenders
    const [prevLayout, setPrevLayout] = React.useState<PlotParams["layout"]>(layout);
    const [prevData, setPrevData] = React.useState<PlotParams["data"]>(data);
    const [prevConfig, setPrevConfig] = React.useState<PlotParams["config"]>(config);

    // ! Plotly seems to mutate objects given to it as props, so we need to clone them when
    // ! For example, it changed the data's xAxis from "x1" to "x"
    const [layoutStable, setLayoutStable] = React.useState<PlotParams["layout"]>(layout);
    const [dataStable, setDataStable] = React.useState<PlotParams["data"]>(data);
    const [configStable, setConfigStable] = React.useState<PlotParams["config"]>(config);

    const [otherPropsStable, setOtherPropsStable] = React.useState<typeof otherProps>(otherProps);

    if (plotUpdateReady && !_.isEqual(prevLayout, layout)) {
        setPrevLayout(layout);
        setLayoutStable(_.cloneDeep(layout));
    }

    if (plotUpdateReady && !_.isEqual(prevData, data)) {
        setPrevData(data);
        setDataStable(_.cloneDeep(data));
    }

    if (plotUpdateReady && !_.isEqual(prevConfig, config)) {
        setPrevConfig(config);
        setConfigStable(_.cloneDeep(config));
    }

    if (plotUpdateReady && !_.isEqual(otherPropsStable, otherProps)) {
        setOtherPropsStable(otherProps);
    }

    return React.useMemo(() => {
        const layoutWithRevision = _.defaults({}, layoutStable, DEFAULT_LAYOUT);
        const configWithDefaults = _.defaults({}, configStable, DEFAULT_CONFIG);

        return (
            <BasePlot data={dataStable} layout={layoutWithRevision} config={configWithDefaults} {...otherPropsStable} />
        );
    }, [configStable, dataStable, layoutStable, otherPropsStable]);
}
