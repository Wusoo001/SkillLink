import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { api } from "../api/client";
import Pagination from "../components/Pagination";
import Badge from "../components/Badge";
import Loading from "../components/Loading";
import ActionModal from "../components/ActionModal";

const STATUS_TONE = {
  pending: "warning",
  reviewed: "primary",
  dismissed: "gray",
  actioned: "success",
};

const ACTION_LABEL = {
  warning: "⚠️ Warning issued",
  suspension: "⏸ Account suspended",
  ban: "🚫 Account banned",
  none: "No action taken",
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [filter, setFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionReport, setActionReport] = useState(null);
  const [actionDefault, setActionDefault] = useState("warning");

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/reports", {
        params: { page, limit: 20, status: filter, type: typeFilter },
      });
      setReports(res.data.data);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [filter, typeFilter]);

  const openAction = (report, defaultAction = "warning") => {
    setActionReport(report);
    setActionDefault(defaultAction);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Reports</h1>
        <p className="text-sm text-inkMuted mt-1">User-submitted content reports</p>
      </div>

      {/* ===== FILTERS ===== */}
      <div className="flex gap-2 flex-wrap items-center">
        {["pending", "reviewed", "dismissed", "actioned", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filter === s
                ? "bg-primary text-white"
                : "bg-white border border-border text-inkSoft hover:bg-primaryLight"
            }`}
          >
            {s}
          </button>
        ))}
        <div className="h-6 w-px bg-border" />
        {["all", "user", "post"].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              typeFilter === t
                ? "bg-primary text-white"
                : "bg-white border border-border text-inkSoft hover:bg-primaryLight"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ===== REPORTS LIST ===== */}
      <div className="space-y-3">
        {loading ? (
          <Loading />
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center text-inkMuted">
            No reports found.
          </div>
        ) : (
          reports.map((r) => {
            const isResolved = r.status === "actioned" || r.status === "dismissed";
            const appliedAction = r.adminAction?.action;

            return (
              <div key={r._id} className="bg-white rounded-2xl border border-border p-5">
                {/* ===== HEADER BADGES ===== */}
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                    <Badge tone="gray">{r.type}</Badge>
                    <Badge tone="danger">{(r.reason || "").replace(/_/g, " ")}</Badge>
                  </div>
                  <span className="text-xs text-inkMuted whitespace-nowrap">
                    {format(new Date(r.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>

                {/* ===== WHO / WHAT ===== */}
                <div className="text-sm text-inkSoft mb-3">
                  <span className="font-semibold text-ink">Reported by </span>
                  <Link
                    to={`/users/${r.reporter?._id}`}
                    className="text-primary hover:underline font-semibold"
                  >
                    {r.reporter?.name || "—"}
                  </Link>
                  {r.type === "user" && (
                    <>
                      <span className="font-semibold text-ink"> against </span>
                      <Link
                        to={`/users/${r.reportedUser?._id}`}
                        className="text-primary hover:underline font-semibold"
                      >
                        {r.reportedUser?.name || "—"}
                      </Link>
                    </>
                  )}
                  {r.type === "post" && r.reportedPost && (
                    <>
                      <span className="font-semibold text-ink"> on post </span>
                      <span className="font-semibold text-ink">"{r.reportedPost.skill}"</span>
                      <span className="text-inkMuted"> by {r.reportedPost.user?.name}</span>
                    </>
                  )}
                </div>

                {/* ===== DESCRIPTION ===== */}
                {r.description && (
                  <div className="bg-background rounded-xl p-3 text-sm text-inkSoft mb-3">
                    {r.description}
                  </div>
                )}

                {/* ===== ACTION INFO OR ACTION BUTTONS ===== */}
                {isResolved ? (
                  <div
                    className={`rounded-xl p-3 flex items-start justify-between gap-3 ${
                      r.status === "actioned"
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-border"
                    }`}
                  >
                    <div className="flex-1">
                      {r.status === "actioned" && appliedAction && appliedAction !== "none" ? (
                        <>
                          <p className="text-xs font-bold uppercase text-success">
                            {ACTION_LABEL[appliedAction] || appliedAction}
                          </p>
                          {r.adminAction.reason && (
                            <p className="text-sm text-inkSoft mt-1">
                              Reason: {r.adminAction.reason}
                            </p>
                          )}
                          {r.adminAction.durationDays && (
                            <p className="text-xs text-inkMuted mt-1">
                              Duration: {r.adminAction.durationDays} days
                            </p>
                          )}
                          {r.adminAction.actedAt && (
                            <p className="text-xs text-inkMuted mt-1">
                              Applied on{" "}
                              {format(
                                new Date(r.adminAction.actedAt),
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-bold uppercase text-inkMuted">
                            Dismissed
                          </p>
                          {r.adminAction?.reason && (
                            <p className="text-sm text-inkSoft mt-1">
                              Reason: {r.adminAction.reason}
                            </p>
                          )}
                          {r.adminAction?.actedAt && (
                            <p className="text-xs text-inkMuted mt-1">
                              Dismissed on{" "}
                              {format(
                                new Date(r.adminAction.actedAt),
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => openAction(r, "warning")}
                      className="text-xs text-primary font-bold hover:underline whitespace-nowrap"
                    >
                      {r.status === "actioned" ? "Change action" : "Take action"}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => openAction(r, "warning")}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 text-warning text-xs font-bold hover:bg-amber-100 transition"
                    >
                      ⚠️ Warn
                    </button>
                    <button
                      onClick={() => openAction(r, "suspension")}
                      className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold hover:bg-orange-100 transition"
                    >
                      ⏸ Suspend
                    </button>
                    <button
                      onClick={() => openAction(r, "ban")}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-danger text-xs font-bold hover:bg-red-100 transition"
                    >
                      🚫 Ban
                    </button>
                    <button
                      onClick={() => openAction(r, "dismiss")}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 text-inkSoft text-xs font-bold hover:bg-gray-200 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ===== ACTION MODAL ===== */}
      <ActionModal
        open={!!actionReport}
        onClose={() => setActionReport(null)}
        target={actionReport}
        targetType="report"
        defaultAction={actionDefault}
        onSuccess={() => load(pagination.page)}
      />

      <Pagination
        page={pagination.page}
        pages={pagination.pages}
        onPageChange={load}
      />
    </div>
  );
}