import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { PreviewPage } from "@/components/admin/preview/PreviewPage";

export const Route = createFileRoute("/admin/preview")({
  component: () => (
    <AdminShell>
      <PreviewPage />
    </AdminShell>
  ),
});
