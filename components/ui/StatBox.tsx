export default function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}
