import React from "react";

import { FileDownload } from "@mui/icons-material";

import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { toastManager } from "@framework/toastManager";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Field } from "@lib/components/Field";
import { Form } from "@lib/components/Form";
import { createZipFilename, downloadFilesZip } from "@lib/utils/downloadUtils";

import { makeErrorFile, makeSessionStateFile, makeUserAgentFile } from "./_utils";

export type SupportDocumentsGeneratorFormProps = {
    error: Error | null;
    session: PrivateWorkbenchSession | null;
    componentStack: string | null | undefined;
    onFilesGenerated?: (success: boolean) => void;
};

export function SupportDocumentsGeneratorForm(props: SupportDocumentsGeneratorFormProps): React.ReactNode {
    const hasActiveSession = !!props.session;

    const [isGenerating, setIsGenerating] = React.useState(false);

    const [includeStackTrace, setIncludeStackTrace] = React.useState(!!props.error);
    const [includeUserAgent, setIncludeUserAgent] = React.useState(true);
    const [includeSession, setIncludeSession] = React.useState(hasActiveSession);

    const noOptionSelected = !includeStackTrace && !includeSession && !includeUserAgent;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (noOptionSelected || isGenerating) return props.onFilesGenerated?.(false);

        setIsGenerating(true);

        const errorFile = includeStackTrace ? await makeErrorFile(props.error, props.componentStack) : null;
        const userAgentFile = includeUserAgent ? await makeUserAgentFile() : null;
        const sessionFile = includeSession ? await makeSessionStateFile(props.session) : null;

        const files = [errorFile, sessionFile, userAgentFile].filter((v) => v != null);
        try {
            if (files.length) {
                await downloadFilesZip(files, createZipFilename("error_report"));
                toastManager.add({ title: "Generated files", type: "success" });
                props.onFilesGenerated?.(true);
            } else {
                toastManager.add({ title: "No data available for download", type: "default" });
                props.onFilesGenerated?.(false);
            }
        } catch {
            toastManager.add({ title: "Failed to generate files", type: "error" });
            props.onFilesGenerated?.(false);
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <Form onSubmit={handleSubmit} layoutClassName="mb-[2px]">
            <Field.Root layoutClassName="flex flex-row items-start gap-2xs">
                <Checkbox size="small" checked={includeUserAgent} onCheckedChange={setIncludeUserAgent} />
                <div className="pt-4xs">
                    <Field.Label>Include system details</Field.Label>
                    <Field.Description>
                        This will include information about your browser and system, which can help us identify
                        environment-specific issues.
                    </Field.Description>
                </div>
            </Field.Root>

            {props.error && (
                <Field.Root layoutClassName="flex flex-row items-start gap-2xs">
                    <Checkbox size="small" checked={includeStackTrace} onCheckedChange={setIncludeStackTrace} />
                    <div className="pt-4xs">
                        <Field.Label>Include error details</Field.Label>
                        <Field.Description>
                            This will include the error message and stack trace, which can help us identify the source
                            of the problem.
                        </Field.Description>
                    </div>
                </Field.Root>
            )}

            {hasActiveSession && (
                <Field.Root layoutClassName="mt-xs flex flex-row items-start gap-2xs">
                    <Checkbox size="small" checked={includeSession} onCheckedChange={setIncludeSession} />
                    <div className="pt-4xs">
                        <Field.Label>Include session settings</Field.Label>
                        <Field.Description>
                            This will include the current dashboard settings, which can help us reproduce your issue. Be
                            mindful that this might include sensitive information, such as parameter and property names
                        </Field.Description>
                    </div>
                </Field.Root>
            )}

            <Button
                type="submit"
                layoutClassName="mt-sm ml-auto block!"
                iconPosition="end"
                size="small"
                icon={isGenerating ? <CircularProgress /> : <FileDownload fontSize="inherit" />}
                disabled={noOptionSelected || isGenerating}
            >
                Generate
            </Button>
        </Form>
    );
}
