import { workbench } from "@/core";

const module = workbench.registerModule("MyModule");

module.view = (props) => {
    const count = props.moduleContext.useModuleStateValue<number>("count");

    return (
        <div>
            <h1>Count: {count}</h1>
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
            <button onClick={() => setCount(count + 1)}>Count</button>
        </div>
    );
};
