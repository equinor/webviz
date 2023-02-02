import { ModuleRegistry } from "@/core/framework/ModuleRegistry";
import { Input } from "@/lib/components/Input";

const module = ModuleRegistry.getModule("MyModule2");

module.viewFC = (props) => {
    const text = props.moduleContext.useStoreValue(
        "text",
        "Hello"
    );

    return (
        <div>
            <h1>Text: {text as string}</h1>
        </div>
    );
};

module.settingsFC = (props) => {
    const [text, setText] = props.moduleContext.useStoreState(
        "text",
        "Hello"
    );

    return (
        <div>
            <Input value={text} onChange={(e) => setText(e.target.value)} />
        </div>
    );
};
