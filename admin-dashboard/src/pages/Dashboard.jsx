import { useEffect, useState } from "react";
import {
  Users,
  FileText,
  CalendarCheck,
  Star,
  Flag,
  Wallet,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { api } from "../api/client";
import StatCard from "../components/StatCard";
import Loading from "../components/Loading";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, c] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/stats/chart?days=30"),
        ]);
        setStats(s.data.data);
        setChart(c.data.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Loading />;
  if (!stats) return <p className="text-inkMuted">Failed to load stats.</p>;

  // Merge chart series by date
  const mergedChart = (chart?.users || []).map((row, i) => ({
    date: row.date,
    users: row.count,
    posts: chart?.posts?.[i]?.count || 0,
    bookings: chart?.bookings?.[i]?.count || 0,
  }));

  const formatted = mergedChart.map((r) => ({
    ...r,
    label: format(new Date(r.date), "MMM d"),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Dashboard</h1>
        <p className="text-sm text-inkMuted mt-1">
          Overview of platform health and activity
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Users" value={stats.totalUsers} icon={Users} tone="primary" />
        <StatCard label="Posts" value={stats.totalPosts} icon={FileText} tone="primary" />
        <StatCard
          label="Bookings"
          value={stats.totalBookings}
          icon={CalendarCheck}
          tone="primary"
        />
        <StatCard label="Reviews" value={stats.totalReviews} icon={Star} tone="warning" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Reports"
          value={stats.pendingReports}
          icon={Flag}
          tone={stats.pendingReports > 0 ? "danger" : "success"}
        />
        <StatCard
          label="New Users (7d)"
          value={stats.recentUsers}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Escrow Held"
          value={`₦${stats.escrowHeld.toLocaleString()}`}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="Total Released"
          value={`₦${stats.totalReleased.toLocaleString()}`}
          icon={Wallet}
          tone="success"
        />
      </div>

      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-ink">Growth — Last 30 Days</h2>
            <p className="text-xs text-inkMuted mt-1">New signups, posts, bookings</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E4DEF5" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#8A8499" }} />
            <YAxis tick={{ fontSize: 12, fill: "#8A8499" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E4DEF5",
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line type="monotone" dataKey="users" stroke="#5B3CC4" strokeWidth={2} dot={false} name="Users" />
            <Line type="monotone" dataKey="posts" stroke="#10B981" strokeWidth={2} dot={false} name="Posts" />
            <Line type="monotone" dataKey="bookings" stroke="#F59E0B" strokeWidth={2} dot={false} name="Bookings" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}