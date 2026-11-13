import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "../api/client";
import Pagination from "../components/Pagination";
import Badge from "../components/Badge";
import Loading from "../components/Loading";

const ACTION_LABELS = {
  verify_user: "Verified user",
  unverify_user: "Unverified user",
  delete_user: "Deleted user",
  delete_post: "Deleted post",
  delete_review: "Deleted review",
  warn_user: "Warned user",
  suspend_user: "Suspended user",
  ban_user: "Banned user",
  unban_user: "Unbanned user",
  unsuspend_user: "Unsuspended user",
  dismiss_report: "Dismissed report",
  action_report: "Actioned report",
  resolve_appeal: "Resolved appeal",
};

const ACTION_TONES = {
  verify_user: "success",
  unverify_user: "gray",
  delete_user: "danger",
  delete_post: "danger",
  delete_review: "danger",
  warn_user: "warning",
  suspend_user: "warning",
  ban_user: "danger",
  unban_user: "success",
  unsuspend_user: "success",
  dismiss_report: "gray",
  action_report: "warning",
  resolve_appeal: "primary",
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "ban_user", label: "Bans" },
  { value: "suspend_user", label: "Suspensions" },
  { value: "warn_user", label: "Warnings" },
  { value: "delete_user", label: "User deletions" },
  { value: "delete_post", label: "Post deletions" },
  { value: "delete_review", label: "Review deletions" },
  { value: "action_report", label: "Report actions" },
  { value: "dismiss_report", label: "Report dismissals" },
  { value: "resolve_appeal", label: "Appeal resolutions" },
  { value: "unban_user", label: "Unbans" },
  { value: "unsuspend_user", label: "Unsuspensions" },
];

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (page = 1, action = filter) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (action) params.action = action;
      const res = await api.get("/admin/audit-logs", { params });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, "");
  }, []);

  const handleFilter = (value) => {
    setFilter(value);
    load(1, value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Audit Log</h1>
        <p className="text-sm text-inkMuted mt-1">
          Every destructive admin action, permanently recorded
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filter === f.value
                ? "bg-primary text-white"
                : "bg-white border border-border text-inkSoft hover:bg-primaryLight"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">When</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Admin</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Action</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Target</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Reason</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    className="border-b border-border last:border-0 hover:bg-background/50"
                  >
                    <td className="px-4 py-3 text-inkSoft text-xs whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-ink">
                        {log.actor?.name || "—"}
                      </div>
                      <div className="text-xs text-inkMuted">{log.actorEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={ACTION_TONES[log.action] || "gray"}>
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-inkSoft">
                      {log.targetLabel || String(log.targetId)}
                    </td>
                    <td className="px-4 py-3 text-inkSoft max-w-xs truncate">
                      {log.reason || "—"}
                    </td>
                    <td className="px-4 py-3 text-inkMuted text-xs font-mono">
                      {log.ip || "—"}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-inkMuted">
                      No audit log entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={pagination.page}
        pages={pagination.pages}
        onPageChange={(p) => load(p, filter)}
      />
    </div>
  );
}