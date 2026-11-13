import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { api } from "../api/client";
import Pagination from "../components/Pagination";
import Badge from "../components/Badge";
import Loading from "../components/Loading";
import Modal from "../components/Modal";

const STATUS_TONE = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
};

export default function Appeals() {
  const [appeals, setAppeals] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/appeals", {
        params: { page, limit: 20, status: filter },
      });
      setAppeals(res.data.data);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [filter]);

  const handleResolve = async (status) => {
    if (!resolving) return;
    setSubmitting(true);
    try {
      await api.put(`/admin/appeals/${resolving._id}/resolve`, {
        status,
        adminNote: adminNote.trim(),
      });
      setResolving(null);
      setAdminNote("");
      load(pagination.page);
    } catch (err) {
      window.alert(err.response?.data?.message || "Failed to resolve appeal");
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = (appeal) => {
    if (appeal.status !== "pending" || !appeal.dueBy) return false;
    return new Date() > new Date(appeal.dueBy);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Appeals</h1>
        <p className="text-sm text-inkMuted mt-1">
          User appeals against bans and suspensions
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["pending", "accepted", "rejected", "all"].map((s) => (
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
      </div>

      <div className="space-y-3">
        {loading ? (
          <Loading />
        ) : appeals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center text-inkMuted">
            No appeals found.
          </div>
        ) : (
          appeals.map((a) => (
            <div key={a._id} className="bg-white rounded-2xl border border-border p-5">
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  <Badge tone={a.type === "ban" ? "danger" : "warning"}>
                    {a.type}
                  </Badge>
                  {isOverdue(a) && (
                    <Badge tone="danger">
                      <AlertTriangle size={11} className="inline mr-1" />
                      OVERDUE
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-inkMuted whitespace-nowrap">
                  Submitted{" "}
                  {format(new Date(a.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>

              <div className="text-sm text-inkSoft mb-3">
                <span className="font-semibold text-ink">From </span>
                <Link
                  to={`/users/${a.user?._id}`}
                  className="text-primary hover:underline font-semibold"
                >
                  {a.user?.name || a.email}
                </Link>
                <span className="text-inkMuted"> ({a.email})</span>
              </div>

              <div className="bg-background rounded-xl p-3 text-sm text-inkSoft mb-3 whitespace-pre-wrap">
                {a.reason}
              </div>

              <div className="text-xs text-inkMuted mb-3 flex flex-wrap gap-4">
                <span>
                  <span className="font-semibold">Response due: </span>
                  {a.dueBy
                    ? format(new Date(a.dueBy), "MMM d, yyyy")
                    : "—"}
                </span>
                {a.resolvedAt && (
                  <span>
                    <span className="font-semibold">Resolved: </span>
                    {format(new Date(a.resolvedAt), "MMM d, yyyy")}
                  </span>
                )}
              </div>

              {a.adminNote && (
                <div
                  className={`rounded-xl p-3 text-sm mb-3 ${
                    a.status === "accepted"
                      ? "bg-green-50 text-success border border-green-200"
                      : "bg-red-50 text-danger border border-red-200"
                  }`}
                >
                  <span className="font-semibold">Admin note: </span>
                  {a.adminNote}
                </div>
              )}

              {a.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setResolving(a);
                      setAdminNote("");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-green-50 text-success text-xs font-bold hover:bg-green-100"
                  >
                    <CheckCircle size={13} className="inline mr-1" />
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      setResolving(a);
                      setAdminNote("");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-50 text-danger text-xs font-bold hover:bg-red-100"
                  >
                    <XCircle size={13} className="inline mr-1" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={load} />

      {/* ===== RESOLVE MODAL ===== */}
      <Modal
        open={!!resolving}
        onClose={() => setResolving(null)}
        title="Resolve Appeal"
      >
        {resolving && (
          <div className="space-y-4">
            <div className="text-sm text-inkSoft">
              <span className="font-semibold text-ink">From: </span>
              {resolving.user?.name} ({resolving.email})
            </div>
            <div className="bg-background rounded-xl p-3 text-sm text-inkSoft whitespace-pre-wrap">
              {resolving.reason}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-inkMuted mb-2">
                Admin note (optional — shared with user)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder="Explain your decision…"
                className="w-full px-3 py-2 rounded-xl border border-border bg-white focus:border-primary outline-none text-sm"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setResolving(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border border-border text-inkSoft font-semibold hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve("rejected")}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-danger text-white font-bold hover:bg-red-600 disabled:opacity-60"
              >
                Reject
              </button>
              <button
                onClick={() => handleResolve("accepted")}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-success text-white font-bold hover:bg-green-600 disabled:opacity-60"
              >
                Accept & Unban
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}