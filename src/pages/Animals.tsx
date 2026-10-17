import { useMemo, useState } from 'react'
import { Animal, deleteAnimal, groupName, saveAnimal, SPECIES, STATUS_LABEL, uid, AnimalStatus, formatNum, today } from '../logic'
import { useFarm } from '../store'
import { confirmAction, Empty, Field, Modal, num, PageHead } from '../ui'

const blank = (): Animal => ({
  id: uid(),
  tag: '',
  species: 'Sigir',
  breed: '',
  sex: 'urgochi',
  birthDate: '',
  weightKg: 0,
  groupId: '',
  status: 'active',
  note: '',
})

function age(birth: string): string {
  if (!birth) return '—'
  const months = Math.floor((Date.parse(today()) - Date.parse(birth)) / (30.44 * 864e5))
  if (months < 12) return `${Math.max(0, months)} oy`
  return `${Math.floor(months / 12)} yil ${months % 12} oy`
}

export default function Animals() {
  const { state, run } = useFarm()
  const [q, setQ] = useState('')
  const [species, setSpecies] = useState('')
  const [group, setGroup] = useState('')
  const [status, setStatus] = useState<AnimalStatus | ''>('active')
  const [edit, setEdit] = useState<Animal | null>(null)
  const [weightText, setWeightText] = useState('')

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return state.animals
      .filter((a) => !species || a.species === species)
      .filter((a) => !group || a.groupId === (group === '_none' ? '' : group))
      .filter((a) => !status || a.status === status)
      .filter((a) => !ql || [a.tag, a.breed, a.note].some((v) => v.toLowerCase().includes(ql)))
      .sort((a, b) => a.tag.localeCompare(b.tag))
  }, [state.animals, q, species, group, status])

  const open = (a: Animal) => {
    setEdit(a)
    setWeightText(a.weightKg ? String(a.weightKg) : '')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!edit) return
    const w = weightText.trim() === '' ? 0 : num(weightText)
    const isNew = !state.animals.some((a) => a.id === edit.id)
    if (run((s) => saveAnimal(s, { ...edit, weightKg: w }), isNew ? 'Hayvon qo‘shildi' : 'O‘zgarishlar saqlandi')) setEdit(null)
  }

  const speciesOptions = [...new Set([...SPECIES, ...state.animals.map((a) => a.species)])]

  return (
    <>
      <PageHead
        title="Hayvonlar"
        sub={`Jami ${state.animals.length}, faol ${state.animals.filter((a) => a.status === 'active').length}`}
        actions={
          <button className="btn primary" onClick={() => open(blank())}>
            + Hayvon qo‘shish
          </button>
        }
      />
      <div className="filters">
        <input placeholder="Qidirish: birka, zot, izoh…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={species} onChange={(e) => setSpecies(e.target.value)}>
          <option value="">Barcha turlar</option>
          {speciesOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Barcha guruhlar</option>
          <option value="_none">Guruhsiz</option>
          {state.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as AnimalStatus | '')}>
          <option value="">Barcha holatlar</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="card table-card">
        {list.length === 0 ? (
          <Empty text="Mos hayvon topilmadi" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Birka</th>
                <th>Turi / zoti</th>
                <th>Jinsi</th>
                <th>Yoshi</th>
                <th className="num">Vazn, kg</th>
                <th>Guruh</th>
                <th>Holat</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td data-label="Birka">
                    <b>{a.tag}</b>
                    {a.note && <div className="muted small">{a.note}</div>}
                  </td>
                  <td data-label="Turi">
                    {a.species}
                    {a.breed && <span className="muted"> · {a.breed}</span>}
                  </td>
                  <td data-label="Jinsi">{a.sex === 'erkak' ? 'Erkak' : 'Urg‘ochi'}</td>
                  <td data-label="Yoshi">{age(a.birthDate)}</td>
                  <td data-label="Vazn" className="num">
                    {a.weightKg ? formatNum(a.weightKg) : '—'}
                  </td>
                  <td data-label="Guruh">{groupName(state, a.groupId)}</td>
                  <td data-label="Holat">
                    <span className={'pill st-' + a.status}>{STATUS_LABEL[a.status]}</span>
                  </td>
                  <td className="row-actions">
                    <button className="btn small" onClick={() => open(a)}>
                      Tahrirlash
                    </button>
                    <button
                      className="btn small danger"
                      onClick={() => confirmAction(`${a.tag} o‘chirilsinmi?`) && run((s) => deleteAnimal(s, a.id), 'Hayvon o‘chirildi')}
                    >
                      O‘chirish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <Modal title={state.animals.some((a) => a.id === edit.id) ? 'Hayvonni tahrirlash' : 'Yangi hayvon'} onClose={() => setEdit(null)}>
          <form onSubmit={submit} className="form-grid">
            <Field label="Birka raqami *">
              <input autoFocus value={edit.tag} onChange={(e) => setEdit({ ...edit, tag: e.target.value })} />
            </Field>
            <Field label="Turi *">
              <select value={edit.species} onChange={(e) => setEdit({ ...edit, species: e.target.value })}>
                {speciesOptions.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Zoti">
              <input value={edit.breed} onChange={(e) => setEdit({ ...edit, breed: e.target.value })} />
            </Field>
            <Field label="Jinsi">
              <select value={edit.sex} onChange={(e) => setEdit({ ...edit, sex: e.target.value as Animal['sex'] })}>
                <option value="urgochi">Urg‘ochi</option>
                <option value="erkak">Erkak</option>
              </select>
            </Field>
            <Field label="Tug‘ilgan sana">
              <input type="date" max={today()} value={edit.birthDate} onChange={(e) => setEdit({ ...edit, birthDate: e.target.value })} />
            </Field>
            <Field label="Vazn, kg">
              <input inputMode="decimal" value={weightText} onChange={(e) => setWeightText(e.target.value)} />
            </Field>
            <Field label="Guruh">
              <select value={edit.groupId} onChange={(e) => setEdit({ ...edit, groupId: e.target.value })}>
                <option value="">Guruhsiz</option>
                {state.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Holat">
              <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as AnimalStatus })}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Izoh">
              <textarea rows={2} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
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
