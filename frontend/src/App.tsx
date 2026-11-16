import { ThemeProvider, createTheme } from "@mui/material";

import { AuthenticationBoundary } from "@framework/internal/components/AuthenticationBoundary";
import { GlobalConfirmationDialog } from "@framework/internal/components/GlobalConfirmationDialog";
import { WorkbenchWrapper } from "@framework/internal/components/WorkbenchWrapper/workbenchWrapper";
import { UserSettingsProvider } from "@framework/internal/providers/UserSettingsProvider";
import { AlertDialogNestingProvider } from "@lib/contexts/alertDialogNestingContext";

import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

const theme = createTheme({
    components: {
        MuiSvgIcon: {
            defaultProps: {
                fontSize: "inherit",
            },
        },
    },
});

function App() {
    return (
        <UserSettingsProvider>
            <ThemeProvider theme={theme}>
                <AlertDialogNestingProvider>
                    <div className="bg-canvas h-screen w-screen">
                        <GlobalConfirmationDialog />
                        <AuthenticationBoundary>
                            <WorkbenchWrapper />
                        </AuthenticationBoundary>
                    </div>
                </AlertDialogNestingProvider>
            </ThemeProvider>
        </UserSettingsProvider>
    );
}

export default App;
