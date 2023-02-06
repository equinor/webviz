import { Workbench } from "../Workbench";
import { WorkbenchServices } from "../WorkbenchServices";
import { NavigatorTopicDefinitions } from "../WorkbenchServices";

export class PrivateWorkbenchServices extends WorkbenchServices {
    constructor(workbench: Workbench) {
        super(workbench);
    }

    publishNavigatorData<T extends keyof NavigatorTopicDefinitions>(topic: T, value: NavigatorTopicDefinitions[T]) {
        this.internalPublishAnyTopic(topic, value);
    }
}
