import { ModuleRegistry } from "@/core/framework/ModuleRegistry";
import { Button } from "@/lib/components/Button";

const module = ModuleRegistry.getModule("MyModule");

module.viewFC = (props) => {
    const count = props.moduleContext.useStoreValue("count", 0);

    return (
        <div>
            <h3>Count: {count as number}</h3>
        </div>
    );
};

module.settingsFC = (props) => {
    const [count, setCount] = props.moduleContext.useStoreState("count", 0);

    return (
        <div>
            <Button onClick={() => setCount((prev: number) => prev + 1 )}>Count</Button>
        </div>
    );
};
