import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { api } from "../api/client";
import Pagination from "../components/Pagination";
import Badge from "../components/Badge";
import Loading from "../components/Loading";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/transactions", { params: { page, limit: 20 } });
      setTransactions(res.data.data);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Transactions</h1>
        <p className="text-sm text-inkMuted mt-1">All wallet transactions</p>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Provider</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Type</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Amount</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Description</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Reference</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id} className="border-b border-border last:border-0 hover:bg-background/50">
                    <td className="px-4 py-3">
                      <Link to={`/users/${t.provider?._id}`} className="text-primary hover:underline font-semibold">
                        {t.provider?.name || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={t.type === "credit" ? "success" : "danger"}>
                        {t.type}
                      </Badge>
                    </td>
                    <td
                      className={`px-4 py-3 font-bold ${
                        t.type === "credit" ? "text-success" : "text-danger"
                      }`}
                    >
                      {t.type === "credit" ? "+" : "−"}₦{(t.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-inkSoft">{t.description || "—"}</td>
                    <td className="px-4 py-3 text-inkMuted text-xs font-mono truncate max-w-[200px]">
                      {t.reference || "—"}
                    </td>
                    <td className="px-4 py-3 text-inkSoft text-xs">
                      {t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "—"}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-inkMuted">
                      No transactions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={load} />
    </div>
  );
}