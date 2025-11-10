import { toast } from "react-toastify";

import type { PersistenceNotifier } from "./PersistenceNotifier";

export const ToastNotifier: PersistenceNotifier = {
    loading: (msg) => toast.loading(msg),
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg),
    info: (msg) => toast.info(msg),
    dismiss: (id) => toast.dismiss(id),
};
