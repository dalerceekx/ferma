import { useState } from 'react'
import { buildReport, CATEGORY_LABEL, formatMoney, formatNum, today, toCSV } from '../logic'
import { useFarm } from '../store'
import { Empty, Field, PageHead, Stat } from '../ui'

function monthStart(): string {
  return today().slice(0, 8) + '01'
}

export function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function Reports() {
  const { state, notify } = useFarm()
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const badRange = !!from && !!to && from > to
  const r = buildReport(state, from, to)
  const period = `${from || 'boshidan'} — ${to || 'hozirgacha'}`
  const maxCat = Math.max(1, ...r.byCategory.map((c) => c.amount))

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      [state.farmName, 'Hisobot', period],
      [],
      ['XARAJATLAR'],
      ['Toifa', 'Summa (so‘m)'],
      ...r.byCategory.map((c) => [CATEGORY_LABEL[c.category], Math.round(c.amount)]),
      ['Jami', Math.round(r.expenseTotal)],
      [],
      ['OMBOR'],
      ['Yem', 'Birlik', 'Kirim', 'Chiqim', 'Kirim summasi', 'Joriy qoldiq'],
      ...r.feeds.map((f) => [f.name, f.unit, f.inQty, f.outQty, Math.round(f.inSum), f.balance]),
      [],
      ['HAYVONLAR'],
      ['Turi', 'Faol', 'Sotilgan', 'Nobud'],
      ...r.animals.map((a) => [a.species, a.active, a.sold, a.dead]),
    ]
    download(`hisobot_${from || 'all'}_${to || 'all'}.csv`, toCSV(rows), 'text/csv;charset=utf-8')
    notify('CSV fayl yuklab olindi')
  }

  return (
    <>
      <PageHead
        title="Hisobot"
        sub={period}
        actions={
          <>
            <button className="btn" disabled={badRange} onClick={exportCSV}>
              CSV yuklab olish
            </button>
            <button className="btn primary" disabled={badRange} onClick={() => window.print()}>
              PDF / Chop etish
            </button>
          </>
        }
      />
      <div className="filters no-print">
        <Field label="Boshlanish">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Tugash">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <button className="btn" onClick={() => { setFrom(monthStart()); setTo(today()) }}>
          Shu oy
        </button>
        <button className="btn" onClick={() => { setFrom(''); setTo('') }}>
          Barcha davr
        </button>
      </div>
      {badRange ? (
        <div className="alert">Boshlanish sanasi tugash sanasidan keyin bo‘lishi mumkin emas</div>
      ) : (
        <div className="report">
          <h2 className="print-only">
            {state.farmName} — hisobot ({period})
          </h2>
          <div className="stats">
            <Stat label="Jami xarajat" value={formatMoney(r.expenseTotal)} />
            <Stat label="Faol hayvonlar" value={r.animals.reduce((s, a) => s + a.active, 0)} />
            <Stat label="Yem kirimi summasi" value={formatMoney(r.feeds.reduce((s, f) => s + f.inSum, 0))} />
          </div>
          <div className="grid-2">
            <section className="card">
              <h2>Xarajatlar toifa bo‘yicha</h2>
              {r.byCategory.length === 0 ? (
                <Empty text="Bu davrda xarajat yo‘q" />
              ) : (
                <ul className="bars">
                  {r.byCategory.map((c) => (
                    <li key={c.category}>
                      <div className="bar-label">
                        <span>{CATEGORY_LABEL[c.category]}</span>
                        <b>{formatMoney(c.amount)}</b>
                      </div>
                      <div className="bar">
                        <div className="bar-fill" style={{ width: (c.amount / maxCat) * 100 + '%' }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="card">
              <h2>Hayvonlar</h2>
              {r.animals.length === 0 ? (
                <Empty text="Hayvonlar yo‘q" />
              ) : (
                <table className="compact">
                  <thead>
                    <tr>
                      <th>Turi</th>
                      <th className="num">Faol</th>
                      <th className="num">Sotilgan</th>
                      <th className="num">Nobud</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.animals.map((a) => (
                      <tr key={a.species}>
                        <td>{a.species}</td>
                        <td className="num">{a.active}</td>
                        <td className="num">{a.sold}</td>
                        <td className="num">{a.dead}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
          <section className="card">
            <h2>Ombor harakati</h2>
            {r.feeds.length === 0 ? (
              <Empty text="Yemlar yo‘q" />
            ) : (
              <table className="compact">
                <thead>
                  <tr>
                    <th>Yem</th>
                    <th className="num">Kirim</th>
                    <th className="num">Chiqim</th>
                    <th className="num">Kirim summasi</th>
                    <th className="num">Joriy qoldiq</th>
                  </tr>
                </thead>
                <tbody>
                  {r.feeds.map((f) => (
                    <tr key={f.feedId}>
                      <td>{f.name}</td>
                      <td className="num">
                        {formatNum(f.inQty)} {f.unit}
                      </td>
                      <td className="num">
                        {formatNum(f.outQty)} {f.unit}
                      </td>
                      <td className="num">{formatMoney(f.inSum)}</td>
                      <td className="num">
                        {formatNum(f.balance)} {f.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </>
  )
}
