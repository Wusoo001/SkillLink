import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { api } from "../api/client";
import Pagination from "../components/Pagination";
import Loading from "../components/Loading";
import Modal from "../components/Modal";

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewPost, setViewPost] = useState(null);

  const load = async (page = 1, q = search) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/posts", {
        params: { page, limit: 20, search: q },
      });
      setPosts(res.data.data);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, "");
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(1, search);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await api.delete(`/admin/posts/${confirmDelete._id}`);
    setConfirmDelete(null);
    load(pagination.page, search);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Posts</h1>
        <p className="text-sm text-inkMuted mt-1">All service listings</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-inkMuted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skill, description, tags…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white focus:border-primary outline-none text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primaryDark"
        >
          Search
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Skill</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Posted by</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Price</th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p._id} className="border-b border-border last:border-0 hover:bg-background/50">
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-semibold text-ink truncate">{p.skill}</p>
                      <p className="text-xs text-inkMuted truncate mt-0.5">{p.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/users/${p.user?._id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {p.user?.name || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      ₦{p.price?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-inkSoft text-xs">
                      {format(new Date(p.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setViewPost(p)}
                          className="p-2 rounded-lg hover:bg-primaryLight text-inkSoft"
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          className="p-2 rounded-lg hover:bg-red-50 text-danger"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {posts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-inkMuted">
                      No posts found.
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
        onPageChange={(p) => load(p, search)}
      />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Post">
        <p className="text-sm text-inkSoft mb-4">
          Delete <strong>{confirmDelete?.skill}</strong>? This cannot be undone.
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

      <Modal open={!!viewPost} onClose={() => setViewPost(null)} title="Post Detail" wide>
        {viewPost && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase text-inkMuted">Skill</p>
              <p className="font-bold text-ink text-lg">{viewPost.skill}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-inkMuted">Description</p>
              <p className="text-sm text-inkSoft whitespace-pre-wrap">{viewPost.description}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-inkMuted">Price</p>
              <p className="font-bold text-primary text-lg">₦{viewPost.price?.toLocaleString()}</p>
            </div>
            {viewPost.location && (
              <div>
                <p className="text-xs font-bold uppercase text-inkMuted">Location</p>
                <p className="text-sm text-inkSoft">{viewPost.location}</p>
              </div>
            )}
            {viewPost.tags?.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase text-inkMuted mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {viewPost.tags.map((t, i) => (
                    <span key={i} className="px-2 py-1 rounded-lg bg-primaryLight text-primary text-xs font-bold">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {viewPost.media && viewPost.mediaType === "image" && (
              <img src={viewPost.media} alt="" className="w-full rounded-xl" />
            )}
            {viewPost.media && viewPost.mediaType === "video" && (
              <video src={viewPost.media} controls className="w-full rounded-xl" />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}