import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { makeSubplots } from "@modules/_shared/Figure";

import { usePvtDataQueries } from "./queryHooks";
import { Interface, State } from "./state";
import { PvtDataAccessor } from "./utils/PvtDataAccessor";

//-----------------------------------------------------------------------------------------------------------

export function View({ viewContext, workbenchSettings }: ModuleViewProps<State, Interface>) {
    const colorSet = workbenchSettings.useColorSet();

    const selectedEnsembleIdents = viewContext.useInterfaceValue("selectedEnsembleIdents");
    const selectedRealizations = viewContext.useInterfaceValue("selectedRealizations");
    const selectedPvtNums = viewContext.useInterfaceValue("selectedPvtNums");
    const selectedPhases = viewContext.useInterfaceValue("selectedPhases");
    const selectedColorBy = viewContext.useInterfaceValue("selectedColorBy");
    const selectedPlots = viewContext.useInterfaceValue("selectedPlots");

    const pvtDataQueries = usePvtDataQueries(selectedEnsembleIdents, selectedRealizations);

    const pvtDataAccessor = new PvtDataAccessor(pvtDataQueries.tableCollections);

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const numPlots = selectedPlots.length;
    const numRows = Math.ceil(numPlots / 2);
    const numCols = Math.min(numPlots, 2);

    const figure = makeSubplots({
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        numRows,
        numCols,
        sharedXAxes: false,
        sharedYAxes: false,
        margin: { t: 20, b: 40, l: 40, r: 20 },
    });

    //const pvtPlotBuilder = new PvtPlotBuilder(pvtDataAccessor);

    for (let i = 0; i < numPlots; i++) {
        const pvtPlot = selectedPlots[i];
        const row = Math.floor(i / 2) + 1;
        const col = (i % 2) + 1;

        /*
        figure.updateLayout({
            title: DEPENDENT_VARIABLES_NAMES[pvtPlot],
            [`xaxis${i + 1}`]: { title: "Pressure" },
            [`yaxis${i + 1}`]: { title: pvtPlot },
        });

        const traces = pvtPlotBuilder.makeTraces(pvtPlot, selectedPvtNums, selectedPhases, colorSet);

        for (const trace of traces) {
            figure.addTrace(trace, row, col);
        }
        */
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {figure.makePlot()}
        </div>
    );
}
