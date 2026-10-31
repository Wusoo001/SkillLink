import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { api } from "../api/client";
import Pagination from "../components/Pagination";
import Badge from "../components/Badge";
import Loading from "../components/Loading";

const STATUSES = [
  "all", "pending_acceptance", "accepted", "rejected", "awaiting_payment",
  "paid_in_escrow", "in_progress", "completed", "ready_for_release",
  "released", "cancelled", "disputed",
];

const TONE = {
  pending_acceptance: "warning",
  accepted: "primary",
  rejected: "danger",
  awaiting_payment: "warning",
  paid_in_escrow: "success",
  in_progress: "primary",
  completed: "success",
  ready_for_release: "primary",
  released: "success",
  cancelled: "danger",
  disputed: "danger",
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async (page = 1, st = status) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/bookings", {
        params: { page, limit: 20, status: st },
      });
      setBookings(res.data.data);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, "all");
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Bookings</h1>
        <p className="text-sm text-inkMuted mt-1">All bookings across the platform</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); load(1, s); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              status === s
                ? "bg-primary text-white"
                : "bg-white border border-border text-inkSoft hover:bg-primaryLight"
            }`}
          >
            {s === "all" ? "All" : s.replace(/_/g, " ")}
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
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Service</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Client</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Provider</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Price</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Status</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Date</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b._id} className="border-b border-border last:border-0 hover:bg-background/50">
                    <td className="px-4 py-3 font-semibold text-ink max-w-xs truncate">
                      {b.serviceTitle}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/users/${b.client?._id}`} className="text-primary hover:underline font-semibold">
                        {b.client?.name || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/users/${b.provider?._id}`} className="text-primary hover:underline font-semibold">
                        {b.provider?.name || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      ₦{b.price?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={TONE[b.status] || "gray"}>{b.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-inkSoft text-xs">
                      {format(new Date(b.createdAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-inkMuted">
                      No bookings found.
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
        onPageChange={(p) => load(p, status)}
      />
    </div>
  );
}