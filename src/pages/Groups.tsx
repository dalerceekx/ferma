import { useState } from 'react'
import { deleteGroup, Group, groupHeadCount, saveGroup, uid } from '../logic'
import { useFarm } from '../store'
import { confirmAction, Empty, Field, Modal, PageHead } from '../ui'

export default function Groups() {
  const { state, run } = useFarm()
  const [edit, setEdit] = useState<Group | null>(null)
  const unassigned = state.animals.filter((a) => !a.groupId && a.status === 'active').length

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!edit) return
    const isNew = !state.groups.some((g) => g.id === edit.id)
    if (run((s) => saveGroup(s, edit), isNew ? 'Guruh yaratildi' : 'Guruh saqlandi')) setEdit(null)
  }

  return (
    <>
      <PageHead
        title="Guruhlar"
        sub={unassigned ? `${unassigned} ta faol hayvon guruhga biriktirilmagan` : 'Hayvonlarni guruhlab boshqaring'}
        actions={
          <button className="btn primary" onClick={() => setEdit({ id: uid(), name: '', description: '' })}>
            + Guruh qo‘shish
          </button>
        }
      />
      {state.groups.length === 0 ? (
        <Empty text="Hali guruh yo‘q" />
      ) : (
        <div className="cards">
          {state.groups.map((g) => {
            const animals = state.animals.filter((a) => a.groupId === g.id)
            const species = [...new Set(animals.map((a) => a.species))].join(', ')
            return (
              <div key={g.id} className="card group-card">
                <h2>{g.name}</h2>
                <p className="muted">{g.description || 'Izoh yo‘q'}</p>
                <div className="group-count">
                  <strong>{groupHeadCount(state, g.id)}</strong> faol bosh
                  {species && <span className="muted"> · {species}</span>}
                </div>
                <div className="row-actions">
                  <button className="btn small" onClick={() => setEdit(g)}>
                    Tahrirlash
                  </button>
                  <button
                    className="btn small danger"
                    onClick={() =>
                      confirmAction(`"${g.name}" o‘chirilsinmi? Undagi hayvonlar guruhsiz qoladi.`) &&
                      run((s) => deleteGroup(s, g.id), 'Guruh o‘chirildi')
                    }
                  >
                    O‘chirish
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {edit && (
        <Modal title={state.groups.some((g) => g.id === edit.id) ? 'Guruhni tahrirlash' : 'Yangi guruh'} onClose={() => setEdit(null)}>
          <form onSubmit={submit} className="form-grid one">
            <Field label="Nomi *">
              <input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label="Izoh">
              <textarea rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
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
