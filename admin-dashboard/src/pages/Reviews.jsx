import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { api } from "../api/client";
import Pagination from "../components/Pagination";
import Badge from "../components/Badge";
import Loading from "../components/Loading";
import Modal from "../components/Modal";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/reviews", { params: { page, limit: 20 } });
      setReviews(res.data.data);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await api.delete(`/admin/reviews/${confirmDelete._id}`);
    setConfirmDelete(null);
    load(pagination.page);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Reviews</h1>
        <p className="text-sm text-inkMuted mt-1">All customer reviews</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <Loading />
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center text-inkMuted">
            No reviews found.
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r._id} className="bg-white rounded-2xl border border-border p-5">
              <div className="flex justify-between items-start gap-4 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="warning">★ {r.rating}</Badge>
                  <span className="text-sm text-inkSoft">
                    <Link to={`/users/${r.client?._id}`} className="text-primary hover:underline font-semibold">
                      {r.client?.name}
                    </Link>
                    {" "}reviewed{" "}
                    <Link to={`/users/${r.provider?._id}`} className="text-primary hover:underline font-semibold">
                      {r.provider?.name}
                    </Link>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-inkMuted">
                    {format(new Date(r.createdAt), "MMM d, yyyy")}
                  </span>
                  <button
                    onClick={() => setConfirmDelete(r)}
                    className="p-2 rounded-lg hover:bg-red-50 text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {r.post && (
                <p className="text-xs text-inkMuted mb-2">
                  Post: <span className="font-semibold text-ink">{r.post.skill}</span>
                </p>
              )}
              {r.comment ? (
                <p className="text-sm text-inkSoft">{r.comment}</p>
              ) : (
                <p className="text-sm text-inkMuted italic">No comment</p>
              )}
            </div>
          ))
        )}
      </div>

      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={load} />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Review">
        <p className="text-sm text-inkSoft mb-4">
          Delete this review? The provider's rating will be recalculated.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setConfirmDelete(null)}
            className="px-4 py-2 rounded-xl border border-border text-inkSoft font-semibold hover:bg-background"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl bg-danger text-white font-bold hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}