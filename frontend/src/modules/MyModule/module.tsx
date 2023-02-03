import { useQuery } from "react-query";

import { ModuleRegistry } from "@/core/framework/ModuleRegistry";
import { Button } from "@/lib/components/Button";

import { State } from "./state";

import { useApiService } from "../../core/providers/ApiServiceProvider";

const module = ModuleRegistry.getModule<State>("MyModule");

module.viewFC = (props) => {
    const apiService = useApiService();
    const count = props.moduleContext.useStoreValue("count");

    const data = useQuery([], async (): Promise<string[]> => {
        return apiService.timeseries.getCaseIds();
    });

    return (
        <div>
            <h3>Count: {count as number}</h3>
            <h4>Case ids:</h4>
            <br />
            {data.data?.map((id) => (
                <div>{id}</div>
            ))}
        </div>
    );
};

module.settingsFC = (props) => {
    const setCount = props.moduleContext.useSetStoreValue("count");

    return (
        <div>
            <Button onClick={() => setCount((prev: number) => prev + 1)}>Count</Button>
        </div>
    );
};
