import { useQuery } from "react-query";
import { apiService } from "@framework/ApiService";

import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { VectorRealizationData } from "@api";
import { PlotlyLineChart } from "@lib/components/PlotlyLineChart";
import { State } from "./state";





export const view = (props: ModuleFCProps<State>) => {
    const sumoCaseId: any = useSubscribedValue("navigator.caseId", props.workbenchServices);
    const sumoIterationId: string = "0"
    const selectedVector = props.moduleContext.useStoreValue("selectedVector");
    const data = useQuery([sumoCaseId, sumoIterationId, selectedVector], async (): Promise<VectorRealizationData[]> => {
        return apiService.timeseries.getRealizationsVectorData(sumoCaseId, sumoIterationId, selectedVector)
    })
    if (data.data) {
        const traces: any = data.data.map((real: VectorRealizationData) => {
            return { x: real.timestamps, y: real.values, type: 'scatter', mode: 'lines', marker: { color: 'red' } }
        })
        return (
            <div>
                <PlotlyLineChart
                    data={traces}
                    layout={{ autosize: true, title: 'A Fancy Plot' }}

                // className="w-full h-full" // I am using tailwind.css here, scss or just css would work fine as well
                />
            </div>
        )
    }
    return <div>snafu</div>
}