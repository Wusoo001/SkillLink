import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, ShieldOff, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import Badge from "../components/Badge";
import Loading from "../components/Loading";
import ActionModal from "../components/ActionModal";

export default function UserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionDefault, setActionDefault] = useState("warning");

  const handleLift = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await api.post(`/admin/users/${id}/action`, { action });
      window.location.reload();
    } catch (err) {
      window.alert(err.response?.data?.message || "Failed to apply action");
    }
  };

  useEffect(() => {
    api
      .get(`/admin/users/${id}`)
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!data) return <p className="text-inkMuted">User not found.</p>;

  const { user, posts, bookingsAsClient, bookingsAsProvider, reviewsWritten, reviewsReceived } = data;

  const isSuspended =
    !user.isBanned &&
    user.suspendedUntil &&
    new Date(user.suspendedUntil) > new Date();

  return (
    <div className="space-y-6">
      <Link
        to="/users"
        className="inline-flex items-center gap-2 text-sm font-semibold text-inkSoft hover:text-primary"
      >
        <ArrowLeft size={16} /> Back to Users
      </Link>

      {/* ==================== BANNED BANNER ==================== */}
      {user.isBanned && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <ShieldOff size={22} className="text-danger" />
          <div className="flex-1">
            <p className="font-bold text-danger">Account Banned</p>
            <p className="text-sm text-inkSoft">
              {user.banReason || "No reason provided"}
            </p>
            {user.bannedAt && (
              <p className="text-xs text-inkMuted mt-1">
                Banned on {new Date(user.bannedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={() => handleLift("unban")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-danger text-danger text-xs font-bold hover:bg-red-50"
          >
            <ShieldCheck size={14} />
            Unban
          </button>
        </div>
      )}

      {/* ==================== SUSPENDED BANNER ==================== */}
      {isSuspended && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={22} className="text-warning" />
          <div className="flex-1">
            <p className="font-bold text-warning">
              Suspended until {new Date(user.suspendedUntil).toLocaleDateString()}
            </p>
            <p className="text-sm text-inkSoft">
              {user.suspendReason || "No reason provided"}
            </p>
          </div>
          <button
            onClick={() => handleLift("unsuspend")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-warning text-warning text-xs font-bold hover:bg-amber-50"
          >
            <ShieldCheck size={14} />
            Lift Suspension
          </button>
        </div>
      )}

      {/* ==================== PROFILE HEADER ==================== */}
      <div className="bg-white rounded-2xl border border-border p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-primaryLight flex items-center justify-center overflow-hidden">
          {user.profileImage ? (
            <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-extrabold text-primary">
              {user.name?.charAt(0)?.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-extrabold text-ink">{user.name}</h1>
            {user.isVerified ? (
              <Badge tone="success">Verified</Badge>
            ) : (
              <Badge tone="gray">Unverified</Badge>
            )}
            {user.isBanned && <Badge tone="danger">Banned</Badge>}
            {isSuspended && <Badge tone="warning">Suspended</Badge>}
            {user.warnings?.length > 0 && (
              <Badge tone="warning">
                {user.warnings.length} warning{user.warnings.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-sm text-inkSoft">{user.email}</p>
          {user.phone && <p className="text-sm text-inkSoft">{user.phone}</p>}
          {user.location && <p className="text-xs text-inkMuted mt-1">📍 {user.location}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-primary">{user.rating || 0}</p>
          <p className="text-xs text-inkMuted">rating</p>
          <p className="text-sm font-bold text-ink mt-2">{user.jobsCompleted || 0} jobs</p>
        </div>
      </div>

      {/* ==================== ACTION BUTTONS ==================== */}
      {!user.isBanned && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setActionDefault("warning"); setActionOpen(true); }}
            className="px-4 py-2 rounded-xl bg-amber-50 text-warning text-sm font-bold hover:bg-amber-100 transition"
          >
            ⚠️ Issue Warning
          </button>
          <button
            onClick={() => { setActionDefault("suspension"); setActionOpen(true); }}
            className="px-4 py-2 rounded-xl bg-orange-50 text-orange-700 text-sm font-bold hover:bg-orange-100 transition"
          >
            ⏸ Suspend Account
          </button>
          <button
            onClick={() => { setActionDefault("ban"); setActionOpen(true); }}
            className="px-4 py-2 rounded-xl bg-red-50 text-danger text-sm font-bold hover:bg-red-100 transition"
          >
            🚫 Ban Account
          </button>
        </div>
      )}

      {/* ==================== BIO ==================== */}
      {user.bio && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-xs font-bold uppercase text-inkMuted mb-2">Bio</p>
          <p className="text-sm text-inkSoft">{user.bio}</p>
        </div>
      )}

      {/* ==================== WARNINGS ==================== */}
      {user.warnings?.length > 0 && (
        <Section title={`Warnings (${user.warnings.length})`}>
          {user.warnings
            .slice()
            .reverse()
            .map((w, i) => (
              <div key={i} className="border-b border-border last:border-0 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{w.reason}</p>
                  <span className="text-xs text-inkMuted whitespace-nowrap">
                    {new Date(w.issuedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
        </Section>
      )}

      {/* ==================== POSTS ==================== */}
      <Section title={`Posts (${posts.length})`}>
        {posts.length === 0 ? (
          <Empty>No posts</Empty>
        ) : (
          posts.map((p) => (
            <div key={p._id} className="border-b border-border last:border-0 py-3">
              <p className="font-semibold text-ink">{p.skill}</p>
              <p className="text-xs text-inkMuted mt-1 line-clamp-2">{p.description}</p>
              <p className="text-xs text-primary font-bold mt-1">₦{p.price?.toLocaleString()}</p>
            </div>
          ))
        )}
      </Section>

      {/* ==================== BOOKINGS AS CLIENT ==================== */}
      <Section title={`Bookings as Client (${bookingsAsClient.length})`}>
        {bookingsAsClient.length === 0 ? (
          <Empty>No bookings</Empty>
        ) : (
          bookingsAsClient.map((b) => (
            <div key={b._id} className="border-b border-border last:border-0 py-3 flex justify-between">
              <div>
                <p className="font-semibold text-ink">{b.serviceTitle}</p>
                <p className="text-xs text-inkMuted">with {b.provider?.name || "—"}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">₦{b.price?.toLocaleString()}</p>
                <Badge tone="primary">{b.status}</Badge>
              </div>
            </div>
          ))
        )}
      </Section>

      {/* ==================== BOOKINGS AS PROVIDER ==================== */}
      <Section title={`Bookings as Provider (${bookingsAsProvider.length})`}>
        {bookingsAsProvider.length === 0 ? (
          <Empty>No bookings</Empty>
        ) : (
          bookingsAsProvider.map((b) => (
            <div key={b._id} className="border-b border-border last:border-0 py-3 flex justify-between">
              <div>
                <p className="font-semibold text-ink">{b.serviceTitle}</p>
                <p className="text-xs text-inkMuted">from {b.client?.name || "—"}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">₦{b.price?.toLocaleString()}</p>
                <Badge tone="primary">{b.status}</Badge>
              </div>
            </div>
          ))
        )}
      </Section>

      {/* ==================== REVIEWS RECEIVED ==================== */}
      <Section title={`Reviews Received (${reviewsReceived.length})`}>
        {reviewsReceived.length === 0 ? (
          <Empty>No reviews</Empty>
        ) : (
          reviewsReceived.map((r) => (
            <div key={r._id} className="border-b border-border last:border-0 py-3">
              <div className="flex items-center gap-2">
                <Badge tone="warning">★ {r.rating}</Badge>
                <span className="text-xs text-inkMuted">by {r.client?.name}</span>
              </div>
              {r.comment && <p className="text-sm text-inkSoft mt-1">{r.comment}</p>}
            </div>
          ))
        )}
      </Section>

      {/* ==================== REVIEWS WRITTEN ==================== */}
      <Section title={`Reviews Written (${reviewsWritten.length})`}>
        {reviewsWritten.length === 0 ? (
          <Empty>No reviews</Empty>
        ) : (
          reviewsWritten.map((r) => (
            <div key={r._id} className="border-b border-border last:border-0 py-3">
              <div className="flex items-center gap-2">
                <Badge tone="primary">★ {r.rating}</Badge>
                <span className="text-xs text-inkMuted">for {r.provider?.name}</span>
              </div>
              {r.comment && <p className="text-sm text-inkSoft mt-1">{r.comment}</p>}
            </div>
          ))
        )}
      </Section>

      {/* ==================== ACTION MODAL ==================== */}
      <ActionModal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        target={user}
        targetType="user"
        defaultAction={actionDefault}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}

const Section = ({ title, children }) => (
  <div className="bg-white rounded-2xl border border-border p-5">
    <p className="text-xs font-bold uppercase text-inkMuted mb-3">{title}</p>
    {children}
  </div>
);

const Empty = ({ children }) => <p className="text-sm text-inkMuted py-4">{children}</p>;