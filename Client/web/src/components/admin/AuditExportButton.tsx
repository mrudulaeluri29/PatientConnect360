import { exportAuditLogs } from "../../api/admin";

type Props = {
  filters: {
    actionType?: string;
    actorRole?: string;
    search?: string;
    from?: string;
    to?: string;
  };
};

export function AuditExportButton({ filters }: Props) {
  const handleExport = async () => {
    const blob = await exportAuditLogs(filters);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin-audit-log-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button className="btn-secondary" type="button" onClick={() => void handleExport()}>
      Export CSV
    </button>
  );
}
