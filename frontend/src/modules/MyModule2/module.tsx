import { workbench } from "@/core";
import { Input } from "@/lib/components/Input";

const module = workbench.registerModule("MyModule2");

module.view = (props) => {
    const text = props.moduleContext.useModuleStateValue<string>(
        "text",
        "Hello"
    );

    return (
        <div>
            <h1>Text: {text}</h1>
        </div>
    );
};

module.settings = (props) => {
    const [text, setText] = props.moduleContext.useModuleState<string>(
        "text",
        "Hello"
    );

    return (
        <div>
            <Input value={text} onChange={(e) => setText(e.target.value)} />
        </div>
    );
};
