import { workbench } from "@/core";
import { Button } from "@/lib/components/Button";

const module = workbench.registerModule("MyModule");

module.view = (props) => {
    const currentField =
        props.workbenchContext.useWorkbenchStateValue<string>("field");
    const currentCase =
        props.workbenchContext.useWorkbenchStateValue<string>("case");
    const count = props.moduleContext.useModuleStateValue<number>("count", 0);

    return (
        <div>
            <h1>Field: {currentField}</h1>
            <h2>Case: {currentCase}</h2>
            <h3>Count: {count}</h3>
        </div>
    );
};

module.settings = (props) => {
    const [count, setCount] = props.moduleContext.useModuleState<number>(
        "count",
        0
    );

    return (
        <div>
            <Button onClick={() => setCount(count + 1)}>Count</Button>
        </div>
    );
};
