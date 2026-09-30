import { describe, expect, test, vi } from "vitest";

import { AtomStoreMaster } from "@framework/AtomStoreMaster";
import { Dashboard } from "@framework/internal/Dashboard";
import { Module } from "@framework/Module";
import { TemplateRegistry } from "@framework/TemplateRegistry";

import "@modules/registerAllModules";
import "../../src/templates/registerAllTemplates";

// `registerAllModules` reads debug flags from `localStorage` (absent in the node test environment) on import,
// so it must be stubbed before the imports above are evaluated.
vi.hoisted(() => {
    vi.stubGlobal("localStorage", { getItem: () => null });
});

// Creating a module instance fires off a lazy, un-awaited import of the module's code (`loadModule.tsx`), which
// would still be in flight when the test environment is torn down. Template wiring only depends on the module
// registration, so skip the import.
vi.spyOn(
    Module.prototype as unknown as { maybeImportSelf: () => Promise<void> },
    "maybeImportSelf",
).mockResolvedValue();

describe("Templates", () => {
    const templates = TemplateRegistry.getRegisteredTemplates();

    test("at least one template is registered", () => {
        expect(templates.length).toBeGreaterThan(0);
    });

    // Resolves module names, instance references, data channels and receivers of each template
    test.each(templates.map((template) => [template.name, template] as const))(
        "template '%s' can be instantiated",
        (_name, template) => {
            expect(() => Dashboard.fromTemplate(template, new AtomStoreMaster())).not.toThrow();
        },
    );
});
