export default function StatCard({ label, value, icon: Icon, tone = "primary" }) {
  const tones = {
    primary: "bg-primaryLight text-primary",
    success: "bg-green-50 text-success",
    warning: "bg-amber-50 text-warning",
    danger: "bg-red-50 text-danger",
  };
  return (
    <div className="bg-white rounded-2xl border border-border p-5 flex items-center justify-between">
      <div>
        <p className="text-xs font-bold uppercase text-inkMuted tracking-wide">{label}</p>
        <p className="text-2xl font-extrabold text-ink mt-2">{value}</p>
      </div>
      {Icon && (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}