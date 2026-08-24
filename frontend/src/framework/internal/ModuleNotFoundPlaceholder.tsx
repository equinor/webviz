import { Forum } from "@mui/icons-material";

import notFoundIllustration from "@assets/moduleNotFound.svg";

import type { AtomStore } from "@framework/AtomStoreMaster";
import type { ModuleViewProps } from "@framework/Module";
import { ImportStatus, Module, ModuleCategory, ModuleDevState } from "@framework/Module";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { SLACK_HREF, VIVA_ENGAGE_HREF } from "@framework/utils/externalUrls";
import { Button } from "@lib/components/Button";
import { Separator } from "@lib/components/Separator";
import { Tag } from "@lib/components/Tag";
import { Paragraph } from "@lib/components/Typography/compositions";
import { Heading } from "@lib/components/Typography/compositions/Heading/heading";

import { ReportIssueButton } from "./components/ReportIssueButton";

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

    viewFC = (props: ModuleViewProps<any>) => {
        return (
            <div className="gap-y-md flex h-full w-full flex-col items-center">
                <div className="bg-danger px-md py-md gap-y-sm flex w-full flex-col items-center text-center">
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
                    module has been removed, please get in touch with us on Slack or Viva Engage."
                >
                    The module is no longer available and might have been removed from the application. You can safely
                    remove the module instance by clicking on the cross in its header. If you are wondering why this
                    module has been removed, please get in touch with us on For general thoughts and comments, you can
                    contact us on{" "}
                    <a className="inline-anchor" href={SLACK_HREF} target="_blank" rel="noopener noreferrer">
                        Slack
                    </a>{" "}
                    or{" "}
                    <a className="inline-anchor" href={VIVA_ENGAGE_HREF} target="_blank" rel="noopener noreferrer">
                        Viva Engage
                    </a>
                    .
                </Paragraph>
                <Separator orientation="horizontal" />
                <div className="gap-x-2xs flex">
                    <Button.AsLink external variant="ghost" href={SLACK_HREF} size="small">
                        <Forum fontSize="inherit" /> Start discussion
                    </Button.AsLink>

                    <ReportIssueButton
                        buttonSize="small"
                        error={new Error(`${this.getName()} not found`)}
                        session={props.workbenchSession}
                        componentStack={null}
                    />
                </div>
            </div>
        );
    };

    settingsFC = () => {
        return (
            <div className="px-xs py-xs gap-y-md flex h-full flex-col items-center justify-center text-center">
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
