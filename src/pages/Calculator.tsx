import { useMemo, useState } from 'react'
import {
  deletePlan,
  FarmError,
  feedName,
  formatNum,
  groupHeadCount,
  groupName,
  issuePlan,
  planTotals,
  savePlan,
  today,
  uid,
  validatePlan,
} from '../logic'
import { useFarm } from '../store'
import { confirmAction, Empty, Field, num, PageHead } from '../ui'

interface Line {
  key: string
  feedId: string
  perHead: string
}

export default function Calculator() {
  const { state, run } = useFarm()
  const [groupId, setGroupId] = useState(state.groups[0]?.id ?? '')
  const [heads, setHeads] = useState(() => String(state.groups[0] ? groupHeadCount(state, state.groups[0].id) : ''))
  const [days, setDays] = useState('7')
  const [lines, setLines] = useState<Line[]>(() =>
    state.feeds.slice(0, 2).map((f) => ({ key: uid(), feedId: f.id, perHead: '' })),
  )

  const draft = useMemo(
    () => ({
      heads: num(heads),
      days: num(days),
      lines: lines.map((l) => ({ feedId: l.feedId, perHead: l.perHead.trim() === '' ? 0 : num(l.perHead) })),
    }),
    [heads, days, lines],
  )

  let error = ''
  try {
    validatePlan(draft)
  } catch (e) {
    error = e instanceof FarmError ? e.message : 'Xato'
  }
  const totals = error ? [] : planTotals(state, draft)
  const unit = (id: string) => state.feeds.find((f) => f.id === id)?.unit ?? ''

  const changeGroup = (id: string) => {
    setGroupId(id)
    setHeads(String(groupHeadCount(state, id)))
  }
  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const save = () => {
    run(
      (s) => savePlan(s, { id: uid(), createdAt: today(), groupId, heads: draft.heads, days: draft.days, lines: draft.lines, status: 'draft' }),
      'Reja saqlandi. Ombordan chiqarish uchun pastdagi ro‘yxatda tasdiqlang.',
    )
  }

  const plans = [...state.plans].sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === 'draft' ? -1 : 1))

  if (!state.groups.length || !state.feeds.length)
    return (
      <>
        <PageHead title="Yem hisoblagich" />
        <Empty text="Hisoblash uchun kamida bitta guruh va bitta yem turi kerak" />
      </>
    )

  return (
    <>
      <PageHead title="Yem hisoblagich" sub="Ratsion bo‘yicha kerakli yemni hisoblang va ombordan chiqaring" />
      <div className="grid-2 calc">
        <section className="card">
          <h2>Ratsion</h2>
          <div className="form-grid">
            <Field label="Guruh">
              <select value={groupId} onChange={(e) => changeGroup(e.target.value)}>
                {state.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bosh soni" hint={`Guruhda faol: ${groupHeadCount(state, groupId)}`}>
              <input inputMode="numeric" value={heads} onChange={(e) => setHeads(e.target.value)} />
            </Field>
            <Field label="Necha kunga">
              <input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
            </Field>
          </div>
          <h3 className="sub">Bir boshga kunlik miqdor</h3>
          {lines.map((l) => (
            <div key={l.key} className="ration-line">
              <select value={l.feedId} onChange={(e) => setLine(l.key, { feedId: e.target.value })}>
                {state.feeds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <input inputMode="decimal" placeholder="0" value={l.perHead} onChange={(e) => setLine(l.key, { perHead: e.target.value })} />
              <span className="muted">{unit(l.feedId)}</span>
              <button className="icon-btn" aria-label="Qatorni o‘chirish" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                ×
              </button>
            </div>
          ))}
          <button className="btn small" onClick={() => setLines((ls) => [...ls, { key: uid(), feedId: state.feeds[0].id, perHead: '' }])}>
            + Yem qo‘shish
          </button>
        </section>

        <section className="card">
          <h2>Natija</h2>
          {error ? (
            <div className="alert">{error}</div>
          ) : (
            <>
              <table className="compact">
                <thead>
                  <tr>
                    <th>Yem</th>
                    <th className="num">Kerak</th>
                    <th className="num">Omborda</th>
                    <th className="num">Yetmaydi</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((t) => (
                    <tr key={t.feedId}>
                      <td>{feedName(state, t.feedId)}</td>
                      <td className="num">
                        {formatNum(t.need)} {unit(t.feedId)}
                      </td>
                      <td className="num">{formatNum(t.have)}</td>
                      <td className={'num' + (t.missing > 0 ? ' text-warn' : '')}>{t.missing > 0 ? formatNum(t.missing) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totals.some((t) => t.missing > 0) && <div className="alert">Ba’zi yemlar yetmaydi — rejani saqlash mumkin, lekin chiqarishdan oldin kirim qiling.</div>}
              <button className="btn primary block" onClick={save}>
                Rejani saqlash
              </button>
            </>
          )}
        </section>
      </div>

      <div className="section-head">
        <h2>Yem rejalari</h2>
      </div>
      {plans.length === 0 ? (
        <Empty text="Saqlangan reja yo‘q" />
      ) : (
        <div className="cards">
          {plans.map((p) => {
            const t = planTotals(state, p)
            return (
              <div key={p.id} className="card plan-card">
                <div className="card-head">
                  <h3>{groupName(state, p.groupId)}</h3>
                  <span className={'pill ' + (p.status === 'issued' ? 'ok' : 'warn')}>{p.status === 'issued' ? `Chiqarilgan ${p.issuedAt}` : 'Tasdiqlanmagan'}</span>
                </div>
                <p className="muted">
                  {p.heads} bosh × {p.days} kun · {p.createdAt}
                </p>
                <ul className="list">
                  {t.map((x) => (
                    <li key={x.feedId}>
                      <span>{feedName(state, x.feedId)}</span>
                      <small className={p.status === 'draft' && x.missing > 0 ? 'text-warn' : 'muted'}>
                        {formatNum(x.need)} {unit(x.feedId)}
                        {p.status === 'draft' && x.missing > 0 && ` (yetmaydi ${formatNum(x.missing)})`}
                      </small>
                    </li>
                  ))}
                </ul>
                {p.status === 'draft' && (
                  <div className="row-actions">
                    <button
                      className="btn small primary"
                      onClick={() =>
                        confirmAction('Shu reja bo‘yicha yem ombordan chiqarilsinmi?') && run((s) => issuePlan(s, p.id, today()), 'Yem ombordan chiqarildi')
                      }
                    >
                      Ombordan chiqarish
                    </button>
                    <button className="btn small danger" onClick={() => confirmAction('Reja o‘chirilsinmi?') && run((s) => deletePlan(s, p.id), 'Reja o‘chirildi')}>
                      O‘chirish
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
