import { BugReport, Forum } from "@mui/icons-material";

import notFoundIllustration from "@assets/moduleNotFound.svg";

import type { AtomStore } from "@framework/AtomStoreMaster";
import { ImportStatus, Module, ModuleCategory, ModuleDevState } from "@framework/Module";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { Tag } from "@lib/components/Tag";
import { Button } from "@lib/newComponents/Button";
import { Heading } from "@lib/newComponents/Typography/compositions/Heading/heading";
import { Paragraph } from "@lib/newComponents/Typography/compositions";
import { Separator } from "@lib/newComponents/Separator";

export class ModuleNotFoundPlaceholder extends Module<any, any> {
    constructor(moduleName: string) {
        super({
            name: moduleName,
            defaultTitle: moduleName,
            category: ModuleCategory.MAIN,
            devState: ModuleDevState.PROD,
        });
        this._importStatus = ImportStatus.Imported;
    }

    makeInstance(id: string, atomStore: AtomStore): ModuleInstance<any, any> {
        const instance = super.makeInstance(id, atomStore);
        return instance;
    }

    viewFC = () => {
        function reportIssue() {
            window.open("https://github.com/equinor/webviz/issues/new", "_blank");
        }

        function startDiscussion() {
            window.open(
                "https://github.com/equinor/webviz/discussions/new?category=announcements&welcome_text=true",
                "_blank",
            );
        }

        return (
            <div className="gap-vertical-md flex h-full w-full flex-col items-center">
                <div className="bg-danger px-horizontal-md py-vertical-md gap-vertical-sm flex w-full flex-col items-center text-center">
                    <img
                        src={notFoundIllustration}
                        alt="Module not found"
                        aria-hidden="true"
                        className="h-auto max-h-[100px] w-auto"
                    />
                    <Heading as="h6" weight="bolder" tone="danger">
                        <Tag label={this.getName()} /> not found.
                    </Heading>
                </div>
                <Paragraph
                    size="sm"
                    tone="neutral"
                    variant="subtle"
                    layoutClassName="w-full line-clamp-4 text-center"
                    title="The module is no longer available and might have been removed from the application. You can safely
                    remove the module instance by clicking on the cross in its header. If you are wondering why this
                    module has been removed, please get in touch with us on GitHub."
                >
                    The module is no longer available and might have been removed from the application. You can safely
                    remove the module instance by clicking on the cross in its header. If you are wondering why this
                    module has been removed, please get in touch with us on GitHub.
                </Paragraph>
                <Separator orientation="horizontal" />
                <div className="gap-horizontal-2xs flex">
                    <Button variant="ghost" onClick={reportIssue} size="small">
                        <BugReport fontSize="inherit" /> Report issue
                    </Button>
                    <Button variant="ghost" onClick={startDiscussion} size="small">
                        <Forum fontSize="inherit" /> Start discussion
                    </Button>
                </div>
            </div>
        );
    };

    settingsFC = () => {
        return (
            <div className="px-horizontal-xs py-vertical-xs gap-vertical-md flex h-full flex-col items-center justify-center text-center">
                <img
                    src={notFoundIllustration}
                    alt="Module not found"
                    aria-hidden="true"
                    className="h-auto max-h-20 w-auto"
                />
                <span>
                    <Tag label={this.getName()} /> not found.
                </span>
            </div>
        );
    };
}
