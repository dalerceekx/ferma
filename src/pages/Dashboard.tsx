import { Link } from 'react-router-dom'
import { CATEGORY_LABEL, feedBalance, feedName, formatMoney, formatNum, groupName, lowStockFeeds, today } from '../logic'
import { useFarm } from '../store'
import { Empty, PageHead, Stat } from '../ui'

export default function Dashboard() {
  const { state } = useFarm()
  const active = state.animals.filter((a) => a.status === 'active')
  const month = today().slice(0, 7)
  const monthExp = state.expenses.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)
  const low = lowStockFeeds(state)
  const drafts = state.plans.filter((p) => p.status === 'draft')
  const recent = [...state.moves].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
  const recentExp = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <>
      <PageHead title="Bosh sahifa" sub={`${state.farmName} — umumiy holat`} />
      <div className="stats">
        <Stat label="Faol hayvonlar" value={active.length} />
        <Stat label="Guruhlar" value={state.groups.length} />
        <Stat label="Kam qolgan yemlar" value={low.length} tone={low.length ? 'warn' : undefined} />
        <Stat label="Shu oy xarajat" value={formatMoney(monthExp)} />
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Ombordagi yemlar</h2>
            <Link to="/ombor">Omborga →</Link>
          </div>
          {state.feeds.length === 0 ? (
            <Empty text="Hali yem qo‘shilmagan" />
          ) : (
            <ul className="bars">
              {state.feeds.map((f) => {
                const bal = feedBalance(state, f.id)
                const pct = Math.min(100, f.minStock > 0 ? (bal / (f.minStock * 4)) * 100 : 100)
                const isLow = bal <= f.minStock
                return (
                  <li key={f.id}>
                    <div className="bar-label">
                      <span>{f.name}</span>
                      <b className={isLow ? 'text-warn' : ''}>
                        {formatNum(bal)} {f.unit}
                      </b>
                    </div>
                    <div className="bar">
                      <div className={'bar-fill' + (isLow ? ' warn' : '')} style={{ width: pct + '%' }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Tasdiqlanmagan yem rejalari</h2>
            <Link to="/hisoblagich">Hisoblagich →</Link>
          </div>
          {drafts.length === 0 ? (
            <Empty text="Kutilayotgan reja yo‘q" />
          ) : (
            <ul className="list">
              {drafts.map((p) => (
                <li key={p.id}>
                  <span>{groupName(state, p.groupId)}</span>
                  <small className="muted">
                    {p.heads} bosh × {p.days} kun
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>So‘nggi ombor harakatlari</h2>
          {recent.length === 0 ? (
            <Empty text="Harakatlar yo‘q" />
          ) : (
            <ul className="list">
              {recent.map((m) => (
                <li key={m.id}>
                  <span>
                    <span className={'pill ' + m.kind}>{m.kind === 'in' ? 'Kirim' : 'Chiqim'}</span> {feedName(state, m.feedId)}
                  </span>
                  <small className="muted">
                    {formatNum(m.qty)} · {m.date}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>So‘nggi xarajatlar</h2>
            <Link to="/xarajatlar">Barchasi →</Link>
          </div>
          {recentExp.length === 0 ? (
            <Empty text="Xarajatlar yo‘q" />
          ) : (
            <ul className="list">
              {recentExp.map((e) => (
                <li key={e.id}>
                  <span>{CATEGORY_LABEL[e.category]}</span>
                  <small className="muted">
                    {formatMoney(e.amount)} · {e.date}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
