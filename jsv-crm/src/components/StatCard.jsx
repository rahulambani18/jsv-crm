export default function StatCard({ icon: Icon, tone = 'blue', label, value, mono = false, onClick }) {
  return (
    <div
      className={`stat-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
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
