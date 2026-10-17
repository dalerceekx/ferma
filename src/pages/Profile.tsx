import { useRef, useState } from 'react'
import { currentUser, FarmError, ROLE_LABEL, saveUser, today, validateBackup } from '../logic'
import { createDemoState } from '../seed'
import { useFarm } from '../store'
import { confirmAction, Field, PageHead } from '../ui'
import { download } from './Reports'

export default function Profile() {
  const { state, run, replace, notify } = useFarm()
  const me = currentUser(state)
  const [name, setName] = useState(me.name)
  const [phone, setPhone] = useState(me.phone)
  const [farmName, setFarmName] = useState(state.farmName)
  const fileRef = useRef<HTMLInputElement>(null)
  const isAdmin = me.role === 'admin'

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    run((s) => saveUser(s, { ...me, name, phone: phone.trim() }), 'Profil saqlandi')
  }

  const saveFarm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!farmName.trim()) return notify('Ferma nomi bo‘sh bo‘lmasligi kerak', 'error')
    run((s) => ({ ...s, farmName: farmName.trim() }), 'Ferma nomi saqlandi')
  }

  const importFile = async (file: File) => {
    try {
      const data = validateBackup(JSON.parse(await file.text()))
      if (!confirmAction('Joriy ma’lumotlar zaxira nusxadagilar bilan almashtiriladi. Davom etilsinmi?')) return
      replace(data)
      setFarmName(data.farmName)
      notify('Zaxira nusxa tiklandi')
    } catch (e) {
      notify(e instanceof FarmError ? e.message : 'Faylni o‘qib bo‘lmadi — JSON formatida emas', 'error')
    }
  }

  return (
    <>
      <PageHead title="Profil va sozlamalar" sub={`${me.name} · ${ROLE_LABEL[me.role]}`} />
      <div className="grid-2">
        <section className="card">
          <h2>Mening profilim</h2>
          <form onSubmit={saveProfile} className="form-grid one">
            <Field label="Ism familiya">
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Telefon">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Rol" hint="Rolni faqat admin o‘zgartiradi">
              <input value={ROLE_LABEL[me.role]} disabled />
            </Field>
            <div className="form-actions">
              <button className="btn primary">Saqlash</button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Ferma</h2>
          <form onSubmit={saveFarm} className="form-grid one">
            <Field label="Ferma nomi" hint={isAdmin ? undefined : 'Faqat admin o‘zgartira oladi'}>
              <input value={farmName} disabled={!isAdmin} onChange={(e) => setFarmName(e.target.value)} />
            </Field>
            {isAdmin && (
              <div className="form-actions">
                <button className="btn primary">Saqlash</button>
              </div>
            )}
          </form>
        </section>

        <section className="card">
          <h2>Zaxira nusxa</h2>
          <p className="muted">
            Demo versiyada ma’lumotlar faqat shu brauzerda saqlanadi. Boshqa qurilmaga o‘tkazish yoki yo‘qolmasligi uchun JSON fayl ko‘rinishida saqlab qo‘ying.
          </p>
          <div className="row-actions left">
            <button className="btn primary" onClick={() => download(`ferma_zaxira_${today()}.json`, JSON.stringify(state, null, 2), 'application/json')}>
              Yuklab olish
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              Fayldan tiklash
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importFile(f)
                e.target.value = ''
              }}
            />
          </div>
        </section>

        {isAdmin && (
          <section className="card">
            <h2>Demo ma’lumotlarni tiklash</h2>
            <p className="muted">Barcha o‘zgarishlar o‘chib, boshlang‘ich namunaviy ma’lumotlar qaytadi.</p>
            <button
              className="btn danger"
              onClick={() => {
                if (!confirmAction('Barcha ma’lumotlar o‘chirilib, demo holatga qaytarilsinmi?')) return
                const s = createDemoState()
                replace(s)
                setFarmName(s.farmName)
                notify('Demo ma’lumotlar tiklandi')
              }}
            >
              Demo holatga qaytarish
            </button>
          </section>
        )}
      </div>
    </>
  )
}
