import { useState } from 'react'
import { addFeedIn, addFeedOut, deleteFeed, deleteMove, Feed, feedBalance, feedName, formatMoney, formatNum, saveFeed, today, uid } from '../logic'
import { useFarm } from '../store'
import { confirmAction, Empty, Field, Modal, num, PageHead } from '../ui'

type MoveForm = { kind: 'in' | 'out'; feedId: string; qty: string; price: string; date: string; note: string }

export default function Warehouse() {
  const { state, run } = useFarm()
  const [feedEdit, setFeedEdit] = useState<(Feed & { minText: string }) | null>(null)
  const [move, setMove] = useState<MoveForm | null>(null)
  const [filter, setFilter] = useState('')

  const openMove = (kind: 'in' | 'out', feedId = state.feeds[0]?.id ?? '') =>
    setMove({ kind, feedId, qty: '', price: '', date: today(), note: '' })

  const submitFeed = (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedEdit) return
    const { minText, ...feed } = feedEdit
    const isNew = !state.feeds.some((f) => f.id === feed.id)
    const minStock = minText.trim() === '' ? 0 : num(minText)
    if (run((s) => saveFeed(s, { ...feed, minStock }), isNew ? 'Yem turi qo‘shildi' : 'Saqlandi')) setFeedEdit(null)
  }

  const submitMove = (e: React.FormEvent) => {
    e.preventDefault()
    if (!move) return
    const ok =
      move.kind === 'in'
        ? run(
            (s) =>
              addFeedIn(s, {
                feedId: move.feedId,
                qty: num(move.qty),
                unitPrice: move.price.trim() === '' ? 0 : num(move.price),
                date: move.date,
                note: move.note,
              }),
            'Kirim omborga qo‘shildi va xarajatga yozildi',
          )
        : run((s) => addFeedOut(s, { feedId: move.feedId, qty: num(move.qty), date: move.date, note: move.note }), 'Chiqim yozildi')
    if (ok) setMove(null)
  }

  const moves = state.moves.filter((m) => !filter || m.feedId === filter).sort((a, b) => b.date.localeCompare(a.date))
  const moveFeed = move ? state.feeds.find((f) => f.id === move.feedId) : undefined
  const moveTotal = move && move.kind === 'in' ? num(move.qty) * (move.price.trim() === '' ? 0 : num(move.price)) : NaN

  return (
    <>
      <PageHead
        title="Ombor"
        sub="Yem qoldig‘i kirim va chiqimlardan avtomatik hisoblanadi"
        actions={
          <>
            <button className="btn" onClick={() => setFeedEdit({ id: uid(), name: '', unit: 'kg', minStock: 0, minText: '' })}>
              + Yem turi
            </button>
            <button className="btn" disabled={!state.feeds.length} onClick={() => openMove('out')}>
              − Chiqim
            </button>
            <button className="btn primary" disabled={!state.feeds.length} onClick={() => openMove('in')}>
              + Kirim
            </button>
          </>
        }
      />

      <div className="card table-card">
        {state.feeds.length === 0 ? (
          <Empty text="Avval yem turini qo‘shing" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Yem</th>
                <th className="num">Qoldiq</th>
                <th className="num">Minimal</th>
                <th>Holat</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.feeds.map((f) => {
                const bal = feedBalance(state, f.id)
                const low = bal <= f.minStock
                return (
                  <tr key={f.id}>
                    <td data-label="Yem">
                      <b>{f.name}</b>
                    </td>
                    <td data-label="Qoldiq" className="num">
                      {formatNum(bal)} {f.unit}
                    </td>
                    <td data-label="Minimal" className="num">
                      {formatNum(f.minStock)} {f.unit}
                    </td>
                    <td data-label="Holat">
                      <span className={'pill ' + (low ? 'warn' : 'ok')}>{low ? 'Kam qoldi' : 'Yetarli'}</span>
                    </td>
                    <td className="row-actions">
                      <button className="btn small" onClick={() => openMove('in', f.id)}>
                        Kirim
                      </button>
                      <button className="btn small" onClick={() => openMove('out', f.id)}>
                        Chiqim
                      </button>
                      <button className="btn small" onClick={() => setFeedEdit({ ...f, minText: String(f.minStock) })}>
                        Tahrirlash
                      </button>
                      <button
                        className="btn small danger"
                        onClick={() => confirmAction(`"${f.name}" o‘chirilsinmi?`) && run((s) => deleteFeed(s, f.id), 'Yem turi o‘chirildi')}
                      >
                        O‘chirish
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="section-head">
        <h2>Harakatlar tarixi</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Barcha yemlar</option>
          {state.feeds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <div className="card table-card">
        {moves.length === 0 ? (
          <Empty text="Harakatlar yo‘q" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>Turi</th>
                <th>Yem</th>
                <th className="num">Miqdor</th>
                <th className="num">Summa</th>
                <th>Izoh</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td data-label="Sana">{m.date}</td>
                  <td data-label="Turi">
                    <span className={'pill ' + m.kind}>{m.kind === 'in' ? 'Kirim' : 'Chiqim'}</span>
                  </td>
                  <td data-label="Yem">{feedName(state, m.feedId)}</td>
                  <td data-label="Miqdor" className="num">
                    {formatNum(m.qty)}
                  </td>
                  <td data-label="Summa" className="num">
                    {m.kind === 'in' ? formatMoney(m.qty * m.unitPrice) : '—'}
                  </td>
                  <td data-label="Izoh" className="muted">
                    {m.note || '—'}
                  </td>
                  <td className="row-actions">
                    {!m.planId && (
                      <button
                        className="btn small danger"
                        onClick={() =>
                          confirmAction(m.kind === 'in' ? 'Kirim va unga bog‘liq xarajat o‘chirilsinmi?' : 'Chiqim o‘chirilsinmi?') &&
                          run((s) => deleteMove(s, m.id), 'Harakat o‘chirildi')
                        }
                      >
                        O‘chirish
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {feedEdit && (
        <Modal title={state.feeds.some((f) => f.id === feedEdit.id) ? 'Yem turini tahrirlash' : 'Yangi yem turi'} onClose={() => setFeedEdit(null)}>
          <form onSubmit={submitFeed} className="form-grid">
            <Field label="Nomi *">
              <input autoFocus value={feedEdit.name} onChange={(e) => setFeedEdit({ ...feedEdit, name: e.target.value })} />
            </Field>
            <Field label="O‘lchov birligi *">
              <input value={feedEdit.unit} onChange={(e) => setFeedEdit({ ...feedEdit, unit: e.target.value })} />
            </Field>
            <Field label="Minimal qoldiq" hint="Shundan kam qolsa ogohlantiriladi">
              <input inputMode="decimal" value={feedEdit.minText} onChange={(e) => setFeedEdit({ ...feedEdit, minText: e.target.value })} />
            </Field>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setFeedEdit(null)}>
                Bekor qilish
              </button>
              <button className="btn primary">Saqlash</button>
            </div>
          </form>
        </Modal>
      )}

      {move && (
        <Modal title={move.kind === 'in' ? 'Yem kirimi' : 'Yem chiqimi'} onClose={() => setMove(null)}>
          <form onSubmit={submitMove} className="form-grid">
            <Field label="Yem *">
              <select value={move.feedId} onChange={(e) => setMove({ ...move, feedId: e.target.value })}>
                {state.feeds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Miqdor${moveFeed ? ', ' + moveFeed.unit : ''} *`} hint={move.kind === 'out' && moveFeed ? `Omborda: ${formatNum(feedBalance(state, moveFeed.id))} ${moveFeed.unit}` : undefined}>
              <input autoFocus inputMode="decimal" value={move.qty} onChange={(e) => setMove({ ...move, qty: e.target.value })} />
            </Field>
            {move.kind === 'in' && (
              <Field label="Birlik narxi, so‘m" hint={Number.isFinite(moveTotal) && moveTotal > 0 ? `Jami: ${formatMoney(moveTotal)}` : 'Xarajatga yoziladi'}>
                <input inputMode="decimal" value={move.price} onChange={(e) => setMove({ ...move, price: e.target.value })} />
              </Field>
            )}
            <Field label="Sana *">
              <input type="date" value={move.date} onChange={(e) => setMove({ ...move, date: e.target.value })} />
            </Field>
            <Field label="Izoh">
              <input value={move.note} onChange={(e) => setMove({ ...move, note: e.target.value })} />
            </Field>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setMove(null)}>
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
