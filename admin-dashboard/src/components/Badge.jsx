export default function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    primary: "bg-primaryLight text-primary",
    success: "bg-green-50 text-success",
    warning: "bg-amber-50 text-warning",
    danger: "bg-red-50 text-danger",
  };
  return (
    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}