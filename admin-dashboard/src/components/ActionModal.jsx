import { useState, useEffect } from "react";
import Modal from "./Modal";
import { api } from "../api/client";

const DURATIONS = [
  { label: "1 day", value: 1 },
  { label: "3 days", value: 3 },
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
];

const IRREVERSIBLE = ["ban", "dismiss"];

export default function ActionModal({ open, onClose, target, targetType, defaultAction = "warning", onSuccess }) {
  const [action, setAction] = useState(defaultAction);
  const [reason, setReason] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (open) {
      setAction(defaultAction);
      setReason("");
      setDurationDays(7);
      setError("");
      setConfirming(false);
    }
  }, [open, defaultAction]);

  const doSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const url =
        targetType === "report"
          ? `/admin/reports/${target._id}/action`
          : `/admin/users/${target._id}/action`;
      await api.post(url, {
        action,
        reason: reason.trim(),
        durationDays: action === "suspension" ? durationDays : undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to apply action");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (!reason.trim() && action !== "dismiss") {
      setError("Please provide a reason.");
      return;
    }
    setError("");

    // Irreversible actions require a second confirmation click
    if (IRREVERSIBLE.includes(action)) {
      setConfirming(true);
      return;
    }

    doSubmit();
  };

  if (!open) return null;

  const actions = targetType === "report"
    ? ["warning", "suspension", "ban", "dismiss"]
    : ["warning", "suspension", "ban"];

  return (
    <Modal open={open} onClose={onClose} title={confirming ? "Confirm Action" : "Take Action"}>
      {confirming ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-bold text-danger text-sm">
              Confirm irreversible action: {action === "ban" ? "BAN" : "DISMISS"}
            </p>
            <p className="text-sm text-inkSoft mt-2">
              {action === "ban"
                ? "This will permanently ban the account. The user will be logged out and cannot log in again unless you unban them."
                : "This will dismiss the report. The reported content remains untouched."}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setConfirming(false)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-border text-inkSoft font-semibold hover:bg-background"
            >
              Back
            </button>
            <button
              onClick={doSubmit}
              disabled={submitting}
              className={`px-4 py-2 rounded-xl text-white font-bold disabled:opacity-60 ${
                action === "ban"
                  ? "bg-danger hover:bg-red-600"
                  : "bg-gray-700 hover:bg-gray-800"
              }`}
            >
              {submitting ? "Applying…" : `Yes, ${action === "ban" ? "Ban Account" : "Dismiss Report"}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-inkMuted mb-2">
              Action
            </label>
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                    action === a
                      ? a === "ban" || a === "dismiss"
                        ? "bg-danger text-white"
                        : a === "suspension"
                        ? "bg-warning text-white"
                        : "bg-primary text-white"
                      : "bg-white border border-border text-inkSoft hover:bg-primaryLight"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {action === "suspension" && (
            <div>
              <label className="block text-xs font-bold uppercase text-inkMuted mb-2">
                Duration
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:border-primary outline-none text-sm"
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-inkMuted mb-2">
              Reason {action !== "dismiss" && <span className="text-danger">*</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Explain why this action is being taken…"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:border-primary outline-none text-sm"
            />
          </div>

          {error && (
            <div className="text-sm text-danger bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-border text-inkSoft font-semibold hover:bg-background"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`px-4 py-2 rounded-xl text-white font-bold disabled:opacity-60 ${
                action === "ban"
                  ? "bg-danger hover:bg-red-600"
                  : action === "suspension"
                  ? "bg-warning hover:bg-amber-600"
                  : "bg-primary hover:bg-primaryDark"
              }`}
            >
              {submitting ? "Applying…" : `Apply ${action}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}