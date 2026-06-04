import { AuthenticationBoundary } from "@framework/internal/components/AuthenticationBoundary";
import { GlobalConfirmationDialog } from "@framework/internal/components/GlobalConfirmationDialog";
import { WorkbenchWrapper } from "@framework/internal/components/WorkbenchWrapper/workbenchWrapper";
import { AlertDialogNestingProvider } from "@lib/contexts/alertDialogNestingContext";

import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

function App() {
    return (
        <AlertDialogNestingProvider>
            <div className="bg-canvas h-screen w-screen">
                <GlobalConfirmationDialog />
                <AuthenticationBoundary>
                    <WorkbenchWrapper />
                </AuthenticationBoundary>
            </div>
        </AlertDialogNestingProvider>
    );
}

export default App;
