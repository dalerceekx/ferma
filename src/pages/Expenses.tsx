import { useState } from 'react'
import { CATEGORY_LABEL, deleteExpense, Expense, ExpenseCategory, formatMoney, saveExpense, today, uid } from '../logic'
import { useFarm } from '../store'
import { confirmAction, Empty, Field, Modal, num, PageHead, Stat } from '../ui'

type Form = Expense & { amountText: string }

export default function Expenses() {
  const { state, run } = useFarm()
  const [month, setMonth] = useState(today().slice(0, 7))
  const [cat, setCat] = useState<ExpenseCategory | ''>('')
  const [edit, setEdit] = useState<Form | null>(null)

  const list = state.expenses
    .filter((e) => !month || e.date.startsWith(month))
    .filter((e) => !cat || e.category === cat)
    .sort((a, b) => b.date.localeCompare(a.date))
  const total = list.reduce((s, e) => s + e.amount, 0)
  const feedTotal = list.filter((e) => e.category === 'yem').reduce((s, e) => s + e.amount, 0)

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!edit) return
    const { amountText, ...exp } = edit
    const isNew = !state.expenses.some((e) => e.id === exp.id)
    if (run((s) => saveExpense(s, { ...exp, amount: num(amountText) }), isNew ? 'Xarajat qo‘shildi' : 'Xarajat saqlandi')) setEdit(null)
  }

  return (
    <>
      <PageHead
        title="Xarajatlar"
        sub="Yem kirimlari avtomatik qo‘shiladi, boshqa xarajatlarni qo‘lda kiriting"
        actions={
          <button className="btn primary" onClick={() => setEdit({ id: uid(), date: today(), category: 'veterinar', amount: 0, note: '', amountText: '' })}>
            + Xarajat qo‘shish
          </button>
        }
      />
      <div className="filters">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value as ExpenseCategory | '')}>
          <option value="">Barcha toifalar</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {month && (
          <button className="btn" onClick={() => setMonth('')}>
            Barcha davr
          </button>
        )}
      </div>
      <div className="stats">
        <Stat label="Jami" value={formatMoney(total)} />
        <Stat label="Shundan yem" value={formatMoney(feedTotal)} />
        <Stat label="Yozuvlar" value={list.length} />
      </div>
      <div className="card table-card">
        {list.length === 0 ? (
          <Empty text="Bu davrda xarajat yo‘q" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>Toifa</th>
                <th>Izoh</th>
                <th className="num">Summa</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td data-label="Sana">{e.date}</td>
                  <td data-label="Toifa">
                    <span className="pill">{CATEGORY_LABEL[e.category]}</span>
                  </td>
                  <td data-label="Izoh">{e.note || <span className="muted">—</span>}</td>
                  <td data-label="Summa" className="num">
                    <b>{formatMoney(e.amount)}</b>
                  </td>
                  <td className="row-actions">
                    {e.moveId ? (
                      <small className="muted">Ombordan</small>
                    ) : (
                      <>
                        <button className="btn small" onClick={() => setEdit({ ...e, amountText: String(e.amount) })}>
                          Tahrirlash
                        </button>
                        <button className="btn small danger" onClick={() => confirmAction('Xarajat o‘chirilsinmi?') && run((s) => deleteExpense(s, e.id), 'Xarajat o‘chirildi')}>
                          O‘chirish
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {edit && (
        <Modal title={state.expenses.some((e) => e.id === edit.id) ? 'Xarajatni tahrirlash' : 'Yangi xarajat'} onClose={() => setEdit(null)}>
          <form onSubmit={submit} className="form-grid">
            <Field label="Toifa">
              <select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as ExpenseCategory })}>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Summa, so‘m *" hint={edit.category === 'yem' ? 'Yem xaridini Ombor → Kirim orqali kiritish tavsiya etiladi' : undefined}>
              <input autoFocus inputMode="decimal" value={edit.amountText} onChange={(e) => setEdit({ ...edit, amountText: e.target.value })} />
            </Field>
            <Field label="Sana *">
              <input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
            </Field>
            <Field label="Izoh">
              <input value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
            </Field>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setEdit(null)}>
                Bekor qilish
              </button>
              <button className="btn primary">Saqlash</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
