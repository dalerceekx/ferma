import { describe, expect, it } from 'vitest'
import {
  addFeedIn,
  addFeedOut,
  buildReport,
  deleteExpense,
  deleteFeed,
  deleteGroup,
  deleteMove,
  deletePlan,
  deleteUser,
  FarmError,
  FarmState,
  feedBalance,
  formatNum,
  issuePlan,
  planTotals,
  round2,
  saveAnimal,
  saveExpense,
  saveFeed,
  savePlan,
  saveUser,
  toCSV,
  validateBackup,
} from './logic'
import { createDemoState } from './seed'

function empty(): FarmState {
  return {
    version: 1,
    farmName: 'Test',
    currentUserId: 'u1',
    users: [{ id: 'u1', name: 'Admin', phone: '', role: 'admin' }],
    groups: [{ id: 'g1', name: 'Sigirlar', description: '' }],
    animals: [
      { id: 'a1', tag: 'T1', species: 'Sigir', breed: '', sex: 'urgochi', birthDate: '', weightKg: 0, groupId: 'g1', status: 'active', note: '' },
      { id: 'a2', tag: 'T2', species: 'Sigir', breed: '', sex: 'urgochi', birthDate: '', weightKg: 0, groupId: 'g1', status: 'sold', note: '' },
    ],
    feeds: [
      { id: 'f1', name: 'Pichan', unit: 'kg', minStock: 10 },
      { id: 'f2', name: 'Arpa', unit: 'kg', minStock: 5 },
    ],
    moves: [],
    expenses: [],
    plans: [],
  }
}

const plan = (lines: { feedId: string; perHead: number }[], heads = 2, days = 3) => ({
  id: 'p1',
  createdAt: '2026-01-01',
  groupId: 'g1',
  heads,
  days,
  lines,
  status: 'draft' as const,
})

describe('ombor', () => {
  it('kirim qoldiqni oshiradi va xarajatni bir marta yozadi', () => {
    const s = addFeedIn(empty(), { feedId: 'f1', qty: 100, unitPrice: 2000, date: '2026-01-01', note: '' })
    expect(feedBalance(s, 'f1')).toBe(100)
    expect(s.expenses).toHaveLength(1)
    expect(s.expenses[0]).toMatchObject({ category: 'yem', amount: 200000, moveId: s.moves[0].id })
  })

  it('narxsiz kirim xarajat yaratmaydi', () => {
    const s = addFeedIn(empty(), { feedId: 'f1', qty: 50, unitPrice: 0, date: '2026-01-01', note: '' })
    expect(s.expenses).toHaveLength(0)
  })

  it('chiqim xarajatni takrorlamaydi', () => {
    let s = addFeedIn(empty(), { feedId: 'f1', qty: 100, unitPrice: 1000, date: '2026-01-01', note: '' })
    s = addFeedOut(s, { feedId: 'f1', qty: 40, date: '2026-01-02', note: '' })
    expect(feedBalance(s, 'f1')).toBe(60)
    expect(s.expenses).toHaveLength(1)
  })

  it('qoldiqdan ko‘p chiqim mumkin emas', () => {
    const s = addFeedIn(empty(), { feedId: 'f1', qty: 10, unitPrice: 0, date: '2026-01-01', note: '' })
    expect(() => addFeedOut(s, { feedId: 'f1', qty: 10.01, date: '2026-01-02', note: '' })).toThrow(FarmError)
    expect(feedBalance(addFeedOut(s, { feedId: 'f1', qty: 10, date: '2026-01-02', note: '' }), 'f1')).toBe(0)
  })

  it('nol, manfiy va bo‘sh miqdorlar rad etiladi', () => {
    const s = empty()
    for (const qty of [0, -5, NaN]) {
      expect(() => addFeedIn(s, { feedId: 'f1', qty, unitPrice: 1, date: '2026-01-01', note: '' })).toThrow(FarmError)
    }
    expect(() => addFeedIn(s, { feedId: 'f1', qty: 1, unitPrice: -1, date: '2026-01-01', note: '' })).toThrow(FarmError)
    expect(() => addFeedIn(s, { feedId: 'yoq', qty: 1, unitPrice: 1, date: '2026-01-01', note: '' })).toThrow(FarmError)
  })

  it('kasr miqdorlar to‘g‘ri qo‘shiladi', () => {
    let s = addFeedIn(empty(), { feedId: 'f1', qty: 0.1, unitPrice: 0, date: '2026-01-01', note: '' })
    s = addFeedIn(s, { feedId: 'f1', qty: 0.2, unitPrice: 0, date: '2026-01-01', note: '' })
    expect(feedBalance(s, 'f1')).toBe(0.3)
  })

  it('kirimni o‘chirish bog‘liq xarajatni ham o‘chiradi', () => {
    const s = addFeedIn(empty(), { feedId: 'f1', qty: 10, unitPrice: 100, date: '2026-01-01', note: '' })
    const n = deleteMove(s, s.moves[0].id)
    expect(n.moves).toHaveLength(0)
    expect(n.expenses).toHaveLength(0)
  })

  it('qoldiqni manfiy qiladigan kirimni o‘chirib bo‘lmaydi', () => {
    let s = addFeedIn(empty(), { feedId: 'f1', qty: 10, unitPrice: 0, date: '2026-01-01', note: '' })
    s = addFeedOut(s, { feedId: 'f1', qty: 5, date: '2026-01-02', note: '' })
    expect(() => deleteMove(s, s.moves[0].id)).toThrow(/manfiy/)
  })

  it('harakati bor yemni o‘chirib bo‘lmaydi, takroriy nom rad etiladi', () => {
    const s = addFeedIn(empty(), { feedId: 'f1', qty: 1, unitPrice: 0, date: '2026-01-01', note: '' })
    expect(() => deleteFeed(s, 'f1')).toThrow(FarmError)
    expect(deleteFeed(s, 'f2').feeds).toHaveLength(1)
    expect(() => saveFeed(s, { id: 'x', name: ' pichan ', unit: 'kg', minStock: 0 })).toThrow(/allaqachon/)
  })

  it('yem kirimiga bog‘langan xarajatni bevosita o‘zgartirib/o‘chirib bo‘lmaydi', () => {
    const s = addFeedIn(empty(), { feedId: 'f1', qty: 10, unitPrice: 100, date: '2026-01-01', note: '' })
    const e = s.expenses[0]
    expect(() => deleteExpense(s, e.id)).toThrow(FarmError)
    expect(() => saveExpense(s, { ...e, amount: 1 })).toThrow(FarmError)
  })
})

describe('yem hisoblagich', () => {
  it('kerakli miqdor = bir boshga × bosh × kun', () => {
    let s = addFeedIn(empty(), { feedId: 'f1', qty: 100, unitPrice: 0, date: '2026-01-01', note: '' })
    const t = planTotals(s, plan([{ feedId: 'f1', perHead: 2.5 }], 4, 7))
    expect(t).toEqual([{ feedId: 'f1', need: 70, have: 100, missing: 0 }])
    s = addFeedOut(s, { feedId: 'f1', qty: 50, date: '2026-01-02', note: '' })
    expect(planTotals(s, plan([{ feedId: 'f1', perHead: 2.5 }], 4, 7))[0].missing).toBe(20)
  })

  it('nol miqdorli qatorlar natijaga kirmaydi', () => {
    const t = planTotals(empty(), plan([{ feedId: 'f1', perHead: 0 }, { feedId: 'f2', perHead: 1 }]))
    expect(t.map((x) => x.feedId)).toEqual(['f2'])
  })

  it('bir xil yem ikki qatorda bo‘lsa jamlanadi', () => {
    const t = planTotals(empty(), plan([{ feedId: 'f1', perHead: 1 }, { feedId: 'f1', perHead: 0.5 }], 2, 2))
    expect(t).toHaveLength(1)
    expect(t[0].need).toBe(6)
  })

  it('hamma qator nol bo‘lsa yoki bosh/kun noto‘g‘ri bo‘lsa reja saqlanmaydi', () => {
    const s = empty()
    expect(() => savePlan(s, plan([{ feedId: 'f1', perHead: 0 }]))).toThrow(/Kamida bitta/)
    expect(() => savePlan(s, plan([{ feedId: 'f1', perHead: 1 }], 0, 3))).toThrow(/Bosh soni/)
    expect(() => savePlan(s, plan([{ feedId: 'f1', perHead: 1 }], 2, 1.5))).toThrow(/Kunlar/)
    expect(() => savePlan(s, plan([{ feedId: 'f1', perHead: -1 }, { feedId: 'f2', perHead: 1 }]))).toThrow(/manfiy/)
    expect(() => savePlan(s, { ...plan([{ feedId: 'f1', perHead: 1 }]), groupId: 'yoq' })).toThrow(/Guruh/)
  })

  it('saqlangan rejadan nol qatorlar tozalanadi', () => {
    const s = savePlan(empty(), plan([{ feedId: 'f1', perHead: 0 }, { feedId: 'f2', perHead: 1 }]))
    expect(s.plans[0].lines).toEqual([{ feedId: 'f2', perHead: 1 }])
  })

  it('rejani chiqarish ombordan kamaytiradi va xarajat qo‘shmaydi', () => {
    let s = addFeedIn(empty(), { feedId: 'f1', qty: 100, unitPrice: 1000, date: '2026-01-01', note: '' })
    s = savePlan(s, plan([{ feedId: 'f1', perHead: 5 }], 2, 3))
    s = issuePlan(s, 'p1', '2026-01-05')
    expect(feedBalance(s, 'f1')).toBe(70)
    expect(s.plans[0]).toMatchObject({ status: 'issued', issuedAt: '2026-01-05' })
    expect(s.expenses).toHaveLength(1)
  })

  it('bir reja ikki marta chiqarilmaydi', () => {
    let s = addFeedIn(empty(), { feedId: 'f1', qty: 100, unitPrice: 0, date: '2026-01-01', note: '' })
    s = issuePlan(savePlan(s, plan([{ feedId: 'f1', perHead: 1 }])), 'p1', '2026-01-02')
    expect(() => issuePlan(s, 'p1', '2026-01-03')).toThrow(/allaqachon/)
    expect(feedBalance(s, 'f1')).toBe(94)
  })

  it('yem yetmasa reja chiqarilmaydi va ombor o‘zgarmaydi', () => {
    let s = addFeedIn(empty(), { feedId: 'f1', qty: 5, unitPrice: 0, date: '2026-01-01', note: '' })
    s = savePlan(s, plan([{ feedId: 'f1', perHead: 1 }]))
    expect(() => issuePlan(s, 'p1', '2026-01-02')).toThrow(/yetarli emas/)
    expect(feedBalance(s, 'f1')).toBe(5)
    expect(s.plans[0].status).toBe('draft')
  })

  it('chiqarilgan rejani va uning harakatlarini o‘chirib bo‘lmaydi', () => {
    let s = addFeedIn(empty(), { feedId: 'f1', qty: 100, unitPrice: 0, date: '2026-01-01', note: '' })
    s = issuePlan(savePlan(s, plan([{ feedId: 'f1', perHead: 1 }])), 'p1', '2026-01-02')
    expect(() => deletePlan(s, 'p1')).toThrow(FarmError)
    const out = s.moves.find((m) => m.planId)!
    expect(() => deleteMove(s, out.id)).toThrow(FarmError)
  })
})

describe('hayvonlar, guruhlar, foydalanuvchilar', () => {
  it('takroriy birka rad etiladi', () => {
    const s = empty()
    expect(() => saveAnimal(s, { ...s.animals[0], id: 'new', tag: 't1' })).toThrow(/birka/)
  })

  it('guruh o‘chirilsa hayvonlar guruhsiz qoladi', () => {
    const s = deleteGroup(empty(), 'g1')
    expect(s.groups).toHaveLength(0)
    expect(s.animals.every((a) => a.groupId === '')).toBe(true)
  })

  it('oxirgi adminni o‘chirib yoki fermerga aylantirib bo‘lmaydi', () => {
    const s = empty()
    expect(() => saveUser(s, { ...s.users[0], role: 'fermer' })).toThrow(/admin/)
    expect(() => deleteUser(s, 'u1')).toThrow(FarmError)
    const two = saveUser(s, { id: 'u2', name: 'Fermer', phone: '', role: 'fermer' })
    expect(() => deleteUser({ ...two, currentUserId: 'u2' }, 'u1')).toThrow(/admin/)
  })
})

describe('hisobot va zaxira', () => {
  it('hisobot sana oralig‘i bo‘yicha filtrlaydi', () => {
    let s = addFeedIn(empty(), { feedId: 'f1', qty: 10, unitPrice: 100, date: '2026-01-01', note: '' })
    s = addFeedIn(s, { feedId: 'f1', qty: 20, unitPrice: 100, date: '2026-02-01', note: '' })
    s = saveExpense(s, { id: 'e', date: '2026-02-10', category: 'veterinar', amount: 500, note: '' })
    const r = buildReport(s, '2026-02-01', '2026-02-28')
    expect(r.expenseTotal).toBe(2500)
    expect(r.feeds[0]).toMatchObject({ inQty: 20, inSum: 2000, balance: 30 })
    expect(r.animals).toEqual([{ species: 'Sigir', active: 1, sold: 1, dead: 0 }])
    expect(buildReport(s, '', '').expenseTotal).toBe(3500)
  })

  it('CSV maxsus belgilarni to‘g‘ri qochiradi', () => {
    const csv = toCSV([['a;b', 'say "hi"', 3]])
    expect(csv).toBe('﻿"a;b";"say ""hi""";3')
  })

  it('zaxira nusxa tekshiruvi', () => {
    const s = createDemoState()
    expect(validateBackup(JSON.parse(JSON.stringify(s)))).toEqual(s)
    expect(() => validateBackup(null)).toThrow(FarmError)
    expect(() => validateBackup({ ...s, version: 2 })).toThrow(/versiya/)
    expect(() => validateBackup({ ...s, animals: undefined })).toThrow(/animals/)
    expect(() => validateBackup({ ...s, users: [{ ...s.users[0], role: 'fermer' }] })).toThrow(/admin/)
  })

  it('demo holat izchil', () => {
    const s = createDemoState()
    for (const f of s.feeds) expect(feedBalance(s, f.id)).toBeGreaterThanOrEqual(0)
    expect(s.expenses.filter((e) => e.moveId)).toHaveLength(s.moves.filter((m) => m.kind === 'in').length)
  })
})

describe('formatlash', () => {
  it('sonlarni guruhlab yozadi', () => {
    expect(formatNum(1234567.5)).toBe('1 234 567,5')
    expect(formatNum(-1000)).toBe('-1 000')
    expect(round2(0.1 * 3)).toBe(0.3)
  })
})
