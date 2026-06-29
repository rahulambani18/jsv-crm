export default function StatCard({ icon: Icon, tone = 'blue', label, value, mono = false }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon />
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className={`stat-value ${mono ? 'mono' : ''}`}>{value}</p>
      </div>
    </div>
  )
}
