import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "../api/client";
import Pagination from "../components/Pagination";
import Badge from "../components/Badge";
import Loading from "../components/Loading";
import Modal from "../components/Modal";
import ActionModal from "../components/ActionModal";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionUser, setActionUser] = useState(null);
  const [actionDefault, setActionDefault] = useState("warning");

  const load = async (page = 1, query = search) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users", {
        params: { page, limit: 20, search: query },
      });
      setUsers(res.data.data);
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

  const toggleVerify = async (id) => {
    await api.put(`/admin/users/${id}/verify`);
    load(pagination.page, search);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await api.delete(`/admin/users/${confirmDelete._id}`);
    setConfirmDelete(null);
    load(pagination.page, search);
  };

  const openAction = (user, defaultAction) => {
    setActionUser(user);
    setActionDefault(defaultAction);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Users</h1>
        <p className="text-sm text-inkMuted mt-1">Manage all registered users</p>
      </div>

      {/* ===== SEARCH ===== */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-inkMuted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
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

      {/* ===== USERS TABLE ===== */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">
                    User
                  </th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">
                    Contact
                  </th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">
                    Status
                  </th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">
                    Rating
                  </th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">
                    Jobs
                  </th>
                  <th className="px-4 py-3 font-bold text-inkMuted uppercase text-xs">
                    Joined
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSuspended =
                    !u.isBanned &&
                    u.suspendedUntil &&
                    new Date(u.suspendedUntil) > new Date();

                  return (
                    <tr
                      key={u._id}
                      className="border-b border-border last:border-0 hover:bg-background/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/users/${u._id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-9 h-9 rounded-full bg-primaryLight flex items-center justify-center overflow-hidden">
                            {u.profileImage ? (
                              <img
                                src={u.profileImage}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-primary font-bold">
                                {u.name?.charAt(0)?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-ink group-hover:text-primary">
                            {u.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-inkSoft">
                        <div className="text-xs">{u.email}</div>
                        {u.phone && (
                          <div className="text-xs text-inkMuted">{u.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          {u.isVerified ? (
                            <Badge tone="success">Verified</Badge>
                          ) : (
                            <Badge tone="gray">Unverified</Badge>
                          )}
                          {u.isBanned && <Badge tone="danger">Banned</Badge>}
                          {isSuspended && <Badge tone="warning">Suspended</Badge>}
                          {u.warnings?.length > 0 && (
                            <Badge tone="warning">
                              {u.warnings.length} warning
                              {u.warnings.length !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">
                        {u.rating || 0}
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">
                        {u.jobsCompleted || 0}
                      </td>
                      <td className="px-4 py-3 text-inkSoft text-xs">
                        {formatDistanceToNow(new Date(u.createdAt), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          {/* Verify toggle */}
                          <button
                            onClick={() => toggleVerify(u._id)}
                            className="p-2 rounded-lg hover:bg-primaryLight text-inkSoft"
                            title={u.isVerified ? "Unverify" : "Verify"}
                          >
                            {u.isVerified ? (
                              <XCircle size={16} className="text-warning" />
                            ) : (
                              <CheckCircle size={16} className="text-success" />
                            )}
                          </button>

                          {/* Warn */}
                          <button
                            onClick={() => openAction(u, "warning")}
                            className="p-2 rounded-lg hover:bg-amber-50 text-warning"
                            title="Warn"
                          >
                            <AlertTriangle size={16} />
                          </button>

                          {/* Ban (or Unban shortcut if banned) */}
                          {u.isBanned ? (
                            <button
                              onClick={() => openAction(u, "ban")}
                              className="p-2 rounded-lg hover:bg-red-50 text-danger"
                              title="Open actions (banned)"
                            >
                              <ShieldOff size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => openAction(u, "ban")}
                              className="p-2 rounded-lg hover:bg-red-50 text-danger"
                              title="Ban"
                            >
                              <ShieldOff size={16} />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => setConfirmDelete(u)}
                            className="p-2 rounded-lg hover:bg-red-50 text-danger"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-inkMuted"
                    >
                      No users found.
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

      {/* ===== DELETE MODAL ===== */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete User"
      >
        <p className="text-sm text-inkSoft mb-4">
          Permanently delete <strong>{confirmDelete?.name}</strong> and all
          associated data (posts, wallet, reviews, reports)? This cannot be
          undone.
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

      {/* ===== ACTION MODAL (Warn / Suspend / Ban) ===== */}
      <ActionModal
        open={!!actionUser}
        onClose={() => setActionUser(null)}
        target={actionUser}
        targetType="user"
        defaultAction={actionDefault}
        onSuccess={() => load(pagination.page, search)}
      />
    </div>
  );
}