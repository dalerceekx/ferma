import { addFeedIn, addFeedOut, FarmState, today } from './logic'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function createDemoState(): FarmState {
  let s: FarmState = {
    version: 1,
    farmName: 'Yashil Vodiy fermasi',
    currentUserId: 'u-fermer',
    users: [
      { id: 'u-fermer', name: 'Umar Toshmatov', phone: '+998 90 123 45 67', role: 'fermer' },
      { id: 'u-admin', name: 'Dilnoza Karimova', phone: '+998 91 765 43 21', role: 'admin' },
    ],
    groups: [
      { id: 'g-sut', name: 'Sog‘in sigirlar', description: 'Sut beradigan sigirlar' },
      { id: 'g-bor', name: 'Bo‘rdoqi buqalar', description: 'Go‘shtga boqilayotgan buqalar' },
      { id: 'g-qoy', name: 'Qo‘ylar podasi', description: 'Hisori zotli qo‘ylar' },
    ],
    animals: [
      { id: 'a1', tag: 'UZ-0101', species: 'Sigir', breed: 'Golshtin', sex: 'urgochi', birthDate: '2021-03-12', weightKg: 520, groupId: 'g-sut', status: 'active', note: '' },
      { id: 'a2', tag: 'UZ-0102', species: 'Sigir', breed: 'Golshtin', sex: 'urgochi', birthDate: '2020-11-04', weightKg: 545, groupId: 'g-sut', status: 'active', note: 'Kuniga 22 l sut' },
      { id: 'a3', tag: 'UZ-0103', species: 'Sigir', breed: 'Simmental', sex: 'urgochi', birthDate: '2022-01-20', weightKg: 480, groupId: 'g-sut', status: 'active', note: '' },
      { id: 'a4', tag: 'UZ-0201', species: 'Buqa', breed: 'Qozoq oqbosh', sex: 'erkak', birthDate: '2023-02-15', weightKg: 410, groupId: 'g-bor', status: 'active', note: '' },
      { id: 'a5', tag: 'UZ-0202', species: 'Buqa', breed: 'Qozoq oqbosh', sex: 'erkak', birthDate: '2023-03-01', weightKg: 395, groupId: 'g-bor', status: 'active', note: '' },
      { id: 'a6', tag: 'UZ-0203', species: 'Buqa', breed: 'Santa-Gertruda', sex: 'erkak', birthDate: '2022-12-10', weightKg: 450, groupId: 'g-bor', status: 'sold', note: 'Bozorda sotildi' },
      { id: 'a7', tag: 'UZ-0301', species: 'Qo‘y', breed: 'Hisori', sex: 'urgochi', birthDate: '2023-04-05', weightKg: 68, groupId: 'g-qoy', status: 'active', note: '' },
      { id: 'a8', tag: 'UZ-0302', species: 'Qo‘y', breed: 'Hisori', sex: 'urgochi', birthDate: '2023-04-09', weightKg: 64, groupId: 'g-qoy', status: 'active', note: '' },
      { id: 'a9', tag: 'UZ-0303', species: 'Qo‘y', breed: 'Hisori', sex: 'erkak', birthDate: '2022-05-18', weightKg: 92, groupId: 'g-qoy', status: 'active', note: 'Naslchi qo‘chqor' },
    ],
    feeds: [
      { id: 'f-pichan', name: 'Beda pichani', unit: 'kg', minStock: 300 },
      { id: 'f-arpa', name: 'Arpa', unit: 'kg', minStock: 150 },
      { id: 'f-kunjara', name: 'Kunjara', unit: 'kg', minStock: 100 },
      { id: 'f-silos', name: 'Makkajo‘xori silosi', unit: 'kg', minStock: 500 },
    ],
    moves: [],
    expenses: [],
    plans: [],
  }
  s = addFeedIn(s, { feedId: 'f-pichan', qty: 2000, unitPrice: 1800, date: daysAgo(20), note: 'Fermer xo‘jaligidan' })
  s = addFeedIn(s, { feedId: 'f-arpa', qty: 800, unitPrice: 3200, date: daysAgo(18), note: '' })
  s = addFeedIn(s, { feedId: 'f-kunjara', qty: 300, unitPrice: 4500, date: daysAgo(15), note: '' })
  s = addFeedIn(s, { feedId: 'f-silos', qty: 3000, unitPrice: 600, date: daysAgo(12), note: '' })
  s = addFeedOut(s, { feedId: 'f-pichan', qty: 650, date: daysAgo(7), note: 'Haftalik ozuqa' })
  s = addFeedOut(s, { feedId: 'f-kunjara', qty: 210, date: daysAgo(5), note: 'Sog‘in sigirlarga' })
  s = {
    ...s,
    expenses: [
      ...s.expenses,
      { id: 'e1', date: daysAgo(10), category: 'veterinar', amount: 450000, note: 'Emlash' },
      { id: 'e2', date: daysAgo(3), category: 'kommunal', amount: 320000, note: 'Elektr energiyasi' },
      { id: 'e3', date: today(), category: 'ish_haqi', amount: 2500000, note: 'Cho‘pon oyligi' },
    ],
  }
  return s
}
