import { useQuery } from "react-query";

import { apiService } from "@framework/ApiService";
import { VectorDescription } from "@api";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useStoreState } from "@framework/StateStore";
import { ModuleFCProps } from "@framework/Module";
import { State } from "./state";

import { ListBox } from "@lib/components/ListBox";
import { RadioGroup } from "@lib/components/RadioGroup";
import { ListBoxItem } from "@lib/components/ListBox/list-box";


const prepareVectorNames = (vectorNames: VectorDescription[]): ListBoxItem[] => {
    return vectorNames.map((vectorName) => {
        return ({ value: vectorName.name, label: vectorName.descriptive_name })
    })

}

const mockedData: any = {
    vectorDescriptions: [
        { name: "FOPT", descriptive_name: "FOPT", has_historical: false },
        { name: "FOPR", descriptive_name: "FOPR", has_historical: false },
        { name: "GOPT", descriptive_name: "GOPT", has_historical: false }]
}


export const settings = (props: ModuleFCProps<State>) => {
    const sumoCaseId = useSubscribedValue("navigator.caseId", props.workbenchServices);
    const ensembleName: string = "iter-0"
    const caseVectorNames = useQuery({
        queryKey:["getVectorNamesAndDescriptions",sumoCaseId, ensembleName],
        queryFn: () => apiService.timeseries.getVectorNamesAndDescriptions(sumoCaseId || "", ensembleName),
        enabled: sumoCaseId ? true : false
    })
    
    const [selectedVector, setSelectedVector] = useStoreState(props.moduleContext.stateStore, "selectedVector");
    const [selectedVector2, setSelectedVector2] = useStoreState(props.moduleContext.stateStore, "selectedVector2");
    const [visualizationType, setVisualizationType] = useStoreState(props.moduleContext.stateStore, "visualizationType");
    
    if (caseVectorNames.data) {
        return (
            <>
                <div className="w-full max-w-xs">

                    <div className="mb-20">
                        <label className="block text-base text-gray-700 font-bold mb-2" >
                            Vector
                        </label>

                        <ListBox
                            // items={prepareVectorNames(caseVectorNames.data)}
                            items={prepareVectorNames(mockedData.vectorDescriptions)}
                            selectedItem={selectedVector}
                            onSelect={(value: string) => setSelectedVector(value)} />

                        <ListBox
                            // items={prepareVectorNames(caseVectorNames.data)}
                            items={prepareVectorNames(mockedData.vectorDescriptions)}
                            selectedItem={selectedVector2}
                            onSelect={(value: string) => setSelectedVector2(value)} />
                    </div>

                    <label className="block text-base text-gray-700 font-bold mb-2" >
                        Visualization
                    </label>
                    <RadioGroup selectedItem={visualizationType} onSelect={setVisualizationType} items={[{ value: "realization", label: "Realization" }, { value: "statistics", label: "Statistics" }]} />
                </div>
            </>
        )
    }
    return <div>snafu</div>
}