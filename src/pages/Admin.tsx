import { useState } from 'react'
import { deleteUser, Role, ROLE_LABEL, saveUser, uid, User } from '../logic'
import { useFarm } from '../store'
import { confirmAction, Field, Modal, PageHead } from '../ui'

export default function Admin() {
  const { state, run } = useFarm()
  const [edit, setEdit] = useState<User | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!edit) return
    const isNew = !state.users.some((u) => u.id === edit.id)
    if (run((s) => saveUser(s, { ...edit, phone: edit.phone.trim() }), isNew ? 'Foydalanuvchi qo‘shildi' : 'Saqlandi')) setEdit(null)
  }

  return (
    <>
      <PageHead
        title="Admin panel"
        sub="Foydalanuvchilar va rollar"
        actions={
          <button className="btn primary" onClick={() => setEdit({ id: uid(), name: '', phone: '', role: 'fermer' })}>
            + Foydalanuvchi
          </button>
        }
      />
      <div className="card info">
        <b>Rollar:</b> <i>Fermer</i> — hayvonlar, ombor, hisoblagich, xarajat va hisobot bilan ishlaydi. <i>Admin</i> — qo‘shimcha ravishda
        foydalanuvchilarni boshqaradi, ferma nomini o‘zgartiradi va demo ma’lumotlarni tiklaydi.
      </div>
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Ism</th>
              <th>Telefon</th>
              <th>Rol</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.users.map((u) => (
              <tr key={u.id}>
                <td data-label="Ism">
                  <b>{u.name}</b> {u.id === state.currentUserId && <span className="pill ok">Siz</span>}
                </td>
                <td data-label="Telefon">{u.phone || '—'}</td>
                <td data-label="Rol">
                  <span className={'pill ' + (u.role === 'admin' ? 'in' : '')}>{ROLE_LABEL[u.role]}</span>
                </td>
                <td className="row-actions">
                  <button className="btn small" onClick={() => setEdit(u)}>
                    Tahrirlash
                  </button>
                  {u.id !== state.currentUserId && (
                    <button className="btn small danger" onClick={() => confirmAction(`${u.name} o‘chirilsinmi?`) && run((s) => deleteUser(s, u.id), 'Foydalanuvchi o‘chirildi')}>
                      O‘chirish
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal title={state.users.some((u) => u.id === edit.id) ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'} onClose={() => setEdit(null)}>
          <form onSubmit={submit} className="form-grid one">
            <Field label="Ism familiya *">
              <input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label="Telefon">
              <input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            </Field>
            <Field label="Rol">
              <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>
                <option value="fermer">Fermer</option>
                <option value="admin">Admin</option>
              </select>
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
