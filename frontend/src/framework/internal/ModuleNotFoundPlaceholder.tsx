import { ImportState, Module } from "@framework/Module";
import { ModuleInstance } from "@framework/ModuleInstance";
import { BugAntIcon, ChatBubbleLeftRightIcon, NoSymbolIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { Tag } from "@lib/components/Tag";

export class ModuleNotFoundPlaceholder extends Module<Record<string, never>> {
    constructor(moduleName: string) {
        super(moduleName, moduleName, [], {}, null);
        this._importState = ImportState.Imported;
    }

    makeInstance(instanceNumber: number): ModuleInstance<Record<string, never>> {
        const instance = super.makeInstance(instanceNumber);
        instance.setDefaultState({});
        return instance;
    }

    viewFC = () => {
        function reportIssue() {
            window.open("https://github.com/equinor/webviz/issues/new", "_blank");
        }

        function startDiscussion() {
            window.open(
                "https://github.com/equinor/webviz/discussions/new?category=announcements&welcome_text=true",
                "_blank"
            );
        }

        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                <NoSymbolIcon className="w-16 h-16 text-gray-400" />
                <span className="text-lg text-red-500">
                    Module <Tag label={this.getName()} /> not found.
                </span>
                <span className="text-sm text-gray-600 text-center">
                    The module is no longer available and might have been removed from the application. You can safely
                    remove the module instance by clicking on the cross in its header. If you are wondering why this
                    module has been removed, please get in touch with us on GitHub.
                </span>
                <div className="flex gap-4">
                    <Button startIcon={<BugAntIcon className="w-4 h-4" />} onClick={reportIssue}>
                        Report issue
                    </Button>
                    <Button startIcon={<ChatBubbleLeftRightIcon className="w-4 h-4" />} onClick={startDiscussion}>
                        Start discussion
                    </Button>
                </div>
            </div>
        );
    };

    settingsFC = () => {
        return (
            <div>
                Module <Tag label={this.getName()} /> not found.
            </div>
        );
    };
}
