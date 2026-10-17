// Ferma ma'lumotlari modeli va sof (pure) hisob-kitob funksiyalari.
// Barcha o'zgartirishlar yangi holat qaytaradi yoki FarmError tashlaydi.

export type Role = 'fermer' | 'admin'
export type AnimalStatus = 'active' | 'sold' | 'dead'
export type Sex = 'erkak' | 'urgochi'
export type ExpenseCategory = 'yem' | 'veterinar' | 'ish_haqi' | 'kommunal' | 'transport' | 'boshqa'

export interface User {
  id: string
  name: string
  phone: string
  role: Role
}

export interface Group {
  id: string
  name: string
  description: string
}

export interface Animal {
  id: string
  tag: string
  species: string
  breed: string
  sex: Sex
  birthDate: string
  weightKg: number
  groupId: string
  status: AnimalStatus
  note: string
}

export interface Feed {
  id: string
  name: string
  unit: string
  minStock: number
}

export interface StockMove {
  id: string
  feedId: string
  kind: 'in' | 'out'
  qty: number
  unitPrice: number
  date: string
  note: string
  planId?: string
}

export interface Expense {
  id: string
  date: string
  category: ExpenseCategory
  amount: number
  note: string
  moveId?: string
}

export interface RationLine {
  feedId: string
  perHead: number
}

export interface FeedPlan {
  id: string
  createdAt: string
  groupId: string
  heads: number
  days: number
  lines: RationLine[]
  status: 'draft' | 'issued'
  issuedAt?: string
}

export interface FarmState {
  version: 1
  farmName: string
  currentUserId: string
  users: User[]
  groups: Group[]
  animals: Animal[]
  feeds: Feed[]
  moves: StockMove[]
  expenses: Expense[]
  plans: FeedPlan[]
}

export class FarmError extends Error {}

export const SPECIES = ['Sigir', 'Buqa', 'Buzoq', 'Qo‘y', 'Echki', 'Ot', 'Parranda']

export const STATUS_LABEL: Record<AnimalStatus, string> = {
  active: 'Faol',
  sold: 'Sotilgan',
  dead: 'Nobud bo‘lgan',
}

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  yem: 'Yem',
  veterinar: 'Veterinar',
  ish_haqi: 'Ish haqi',
  kommunal: 'Kommunal',
  transport: 'Transport',
  boshqa: 'Boshqa',
}

export const ROLE_LABEL: Record<Role, string> = { fermer: 'Fermer', admin: 'Admin' }

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function today(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Kasr xatolarini (0.1 + 0.2) yo'qotish uchun 2 xonagacha yaxlitlash. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function formatNum(n: number): string {
  const r = round2(n)
  const [int, frac] = Math.abs(r).toString().split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return (r < 0 ? '-' : '') + grouped + (frac ? ',' + frac : '')
}

export function formatMoney(n: number): string {
  return formatNum(Math.round(n)) + ' so‘m'
}

function positive(n: number, label: string): void {
  if (!Number.isFinite(n) || n <= 0) throw new FarmError(`${label} 0 dan katta bo‘lishi kerak`)
}

function nonNegative(n: number, label: string): void {
  if (!Number.isFinite(n) || n < 0) throw new FarmError(`${label} manfiy bo‘lmasligi kerak`)
}

function required(s: string, label: string): void {
  if (!s || !s.trim()) throw new FarmError(`${label} kiritilishi shart`)
}

// ---------- Ombor ----------

export function feedBalance(state: FarmState, feedId: string): number {
  let sum = 0
  for (const m of state.moves) {
    if (m.feedId !== feedId) continue
    sum += m.kind === 'in' ? m.qty : -m.qty
  }
  return round2(sum)
}

export function feedName(state: FarmState, feedId: string): string {
  return state.feeds.find((f) => f.id === feedId)?.name ?? 'O‘chirilgan yem'
}

export function lowStockFeeds(state: FarmState): Feed[] {
  return state.feeds.filter((f) => feedBalance(state, f.id) <= f.minStock)
}

export function saveFeed(state: FarmState, feed: Feed): FarmState {
  required(feed.name, 'Yem nomi')
  required(feed.unit, 'O‘lchov birligi')
  nonNegative(feed.minStock, 'Minimal qoldiq')
  const dup = state.feeds.find(
    (f) => f.id !== feed.id && f.name.trim().toLowerCase() === feed.name.trim().toLowerCase(),
  )
  if (dup) throw new FarmError('Bunday nomli yem allaqachon bor')
  const clean = { ...feed, name: feed.name.trim(), unit: feed.unit.trim() }
  const exists = state.feeds.some((f) => f.id === feed.id)
  return {
    ...state,
    feeds: exists ? state.feeds.map((f) => (f.id === feed.id ? clean : f)) : [...state.feeds, clean],
  }
}

export function deleteFeed(state: FarmState, feedId: string): FarmState {
  if (state.moves.some((m) => m.feedId === feedId))
    throw new FarmError('Bu yem bo‘yicha harakatlar bor, avval ularni o‘chiring')
  if (state.plans.some((p) => p.status === 'draft' && p.lines.some((l) => l.feedId === feedId)))
    throw new FarmError('Bu yem tasdiqlanmagan rejada ishlatilgan')
  return { ...state, feeds: state.feeds.filter((f) => f.id !== feedId) }
}

export interface FeedInInput {
  feedId: string
  qty: number
  unitPrice: number
  date: string
  note: string
}

/** Yem kirimi: omborga qo'shiladi va xarajatga BIR MARTA yoziladi. */
export function addFeedIn(state: FarmState, input: FeedInInput): FarmState {
  if (!state.feeds.some((f) => f.id === input.feedId)) throw new FarmError('Yem tanlanmagan')
  positive(input.qty, 'Miqdor')
  nonNegative(input.unitPrice, 'Narx')
  required(input.date, 'Sana')
  const move: StockMove = {
    id: uid(),
    feedId: input.feedId,
    kind: 'in',
    qty: round2(input.qty),
    unitPrice: input.unitPrice,
    date: input.date,
    note: input.note.trim(),
  }
  const amount = round2(move.qty * move.unitPrice)
  const expenses =
    amount > 0
      ? [
          ...state.expenses,
          {
            id: uid(),
            date: input.date,
            category: 'yem' as const,
            amount,
            note: `Yem kirimi: ${feedName(state, input.feedId)} (${formatNum(move.qty)})`,
            moveId: move.id,
          },
        ]
      : state.expenses
  return { ...state, moves: [...state.moves, move], expenses }
}

/** Qo'lda chiqim: xarajat yaratmaydi (yem kirimda allaqachon hisoblangan). */
export function addFeedOut(
  state: FarmState,
  input: { feedId: string; qty: number; date: string; note: string },
): FarmState {
  if (!state.feeds.some((f) => f.id === input.feedId)) throw new FarmError('Yem tanlanmagan')
  positive(input.qty, 'Miqdor')
  required(input.date, 'Sana')
  const have = feedBalance(state, input.feedId)
  if (round2(input.qty) > have)
    throw new FarmError(`Omborda yetarli emas: bor ${formatNum(have)}, kerak ${formatNum(input.qty)}`)
  const move: StockMove = {
    id: uid(),
    feedId: input.feedId,
    kind: 'out',
    qty: round2(input.qty),
    unitPrice: 0,
    date: input.date,
    note: input.note.trim(),
  }
  return { ...state, moves: [...state.moves, move] }
}

export function deleteMove(state: FarmState, moveId: string): FarmState {
  const move = state.moves.find((m) => m.id === moveId)
  if (!move) throw new FarmError('Harakat topilmadi')
  if (move.planId) throw new FarmError('Rejadan chiqarilgan yemni alohida o‘chirib bo‘lmaydi')
  const next = { ...state, moves: state.moves.filter((m) => m.id !== moveId) }
  if (move.kind === 'in' && feedBalance(next, move.feedId) < 0)
    throw new FarmError('Bu kirim o‘chirilsa, qoldiq manfiy bo‘lib qoladi')
  return { ...next, expenses: next.expenses.filter((e) => e.moveId !== moveId) }
}

// ---------- Hayvonlar va guruhlar ----------

export function groupHeadCount(state: FarmState, groupId: string): number {
  return state.animals.filter((a) => a.groupId === groupId && a.status === 'active').length
}

export function groupName(state: FarmState, groupId: string): string {
  if (!groupId) return 'Guruhsiz'
  return state.groups.find((g) => g.id === groupId)?.name ?? 'O‘chirilgan guruh'
}

export function saveGroup(state: FarmState, group: Group): FarmState {
  required(group.name, 'Guruh nomi')
  const dup = state.groups.find(
    (g) => g.id !== group.id && g.name.trim().toLowerCase() === group.name.trim().toLowerCase(),
  )
  if (dup) throw new FarmError('Bunday nomli guruh allaqachon bor')
  const clean = { ...group, name: group.name.trim(), description: group.description.trim() }
  const exists = state.groups.some((g) => g.id === group.id)
  return {
    ...state,
    groups: exists ? state.groups.map((g) => (g.id === group.id ? clean : g)) : [...state.groups, clean],
  }
}

/** Guruh o'chirilsa, undagi hayvonlar "guruhsiz" bo'lib qoladi. */
export function deleteGroup(state: FarmState, groupId: string): FarmState {
  if (state.plans.some((p) => p.groupId === groupId && p.status === 'draft'))
    throw new FarmError('Bu guruh uchun tasdiqlanmagan yem rejasi bor')
  return {
    ...state,
    groups: state.groups.filter((g) => g.id !== groupId),
    animals: state.animals.map((a) => (a.groupId === groupId ? { ...a, groupId: '' } : a)),
  }
}

export function saveAnimal(state: FarmState, animal: Animal): FarmState {
  required(animal.tag, 'Birka raqami')
  required(animal.species, 'Turi')
  nonNegative(animal.weightKg, 'Vazn')
  if (animal.birthDate && animal.birthDate > today()) throw new FarmError('Tug‘ilgan sana kelajakda bo‘lishi mumkin emas')
  const dup = state.animals.find(
    (a) => a.id !== animal.id && a.tag.trim().toLowerCase() === animal.tag.trim().toLowerCase(),
  )
  if (dup) throw new FarmError('Bu birka raqami boshqa hayvonda bor')
  const clean = { ...animal, tag: animal.tag.trim(), breed: animal.breed.trim(), note: animal.note.trim() }
  const exists = state.animals.some((a) => a.id === animal.id)
  return {
    ...state,
    animals: exists ? state.animals.map((a) => (a.id === animal.id ? clean : a)) : [...state.animals, clean],
  }
}

export function deleteAnimal(state: FarmState, id: string): FarmState {
  return { ...state, animals: state.animals.filter((a) => a.id !== id) }
}

// ---------- Yem hisoblagich ----------

export interface PlanTotal {
  feedId: string
  need: number
  have: number
  missing: number
}

/** Reja bo'yicha har bir yemdan kerakli jami miqdor. 0 miqdorli qatorlar hisobga olinmaydi. */
export function planTotals(state: FarmState, plan: Pick<FeedPlan, 'heads' | 'days' | 'lines'>): PlanTotal[] {
  const map = new Map<string, number>()
  for (const line of plan.lines) {
    if (!line.feedId || !(line.perHead > 0)) continue
    const need = line.perHead * plan.heads * plan.days
    map.set(line.feedId, (map.get(line.feedId) ?? 0) + need)
  }
  return [...map.entries()].map(([feedId, raw]) => {
    const need = round2(raw)
    const have = feedBalance(state, feedId)
    return { feedId, need, have, missing: round2(Math.max(0, need - have)) }
  })
}

export function validatePlan(plan: Pick<FeedPlan, 'heads' | 'days' | 'lines'>): void {
  if (!Number.isInteger(plan.heads) || plan.heads <= 0) throw new FarmError('Bosh soni butun va 0 dan katta bo‘lishi kerak')
  if (!Number.isInteger(plan.days) || plan.days <= 0) throw new FarmError('Kunlar soni butun va 0 dan katta bo‘lishi kerak')
  for (const l of plan.lines) {
    if (!Number.isFinite(l.perHead) || l.perHead < 0) throw new FarmError('Ratsion miqdori manfiy bo‘lmasligi kerak')
  }
  if (!plan.lines.some((l) => l.feedId && l.perHead > 0))
    throw new FarmError('Kamida bitta yem uchun 0 dan katta miqdor kiriting')
}

export function savePlan(state: FarmState, plan: FeedPlan): FarmState {
  if (!state.groups.some((g) => g.id === plan.groupId)) throw new FarmError('Guruh tanlanmagan')
  validatePlan(plan)
  const lines = plan.lines.filter((l) => l.feedId && l.perHead > 0)
  return { ...state, plans: [...state.plans, { ...plan, lines, status: 'draft' }] }
}

export function deletePlan(state: FarmState, planId: string): FarmState {
  const plan = state.plans.find((p) => p.id === planId)
  if (!plan) throw new FarmError('Reja topilmadi')
  if (plan.status === 'issued') throw new FarmError('Ombordan chiqarilgan rejani o‘chirib bo‘lmaydi')
  return { ...state, plans: state.plans.filter((p) => p.id !== planId) }
}

/** Rejani tasdiqlab, ombordan yem chiqarish. Bir reja faqat bir marta chiqariladi. */
export function issuePlan(state: FarmState, planId: string, date: string): FarmState {
  const plan = state.plans.find((p) => p.id === planId)
  if (!plan) throw new FarmError('Reja topilmadi')
  if (plan.status === 'issued') throw new FarmError('Bu reja bo‘yicha yem allaqachon chiqarilgan')
  const totals = planTotals(state, plan)
  const short = totals.filter((t) => t.missing > 0)
  if (short.length)
    throw new FarmError(
      'Omborda yetarli emas: ' +
        short.map((t) => `${feedName(state, t.feedId)} (yetmaydi ${formatNum(t.missing)})`).join(', '),
    )
  const moves: StockMove[] = totals.map((t) => ({
    id: uid(),
    feedId: t.feedId,
    kind: 'out',
    qty: t.need,
    unitPrice: 0,
    date,
    note: `Reja: ${groupName(state, plan.groupId)}, ${plan.heads} bosh × ${plan.days} kun`,
    planId,
  }))
  return {
    ...state,
    moves: [...state.moves, ...moves],
    plans: state.plans.map((p) => (p.id === planId ? { ...p, status: 'issued', issuedAt: date } : p)),
  }
}

// ---------- Xarajatlar ----------

export function saveExpense(state: FarmState, exp: Expense): FarmState {
  const old = state.expenses.find((e) => e.id === exp.id)
  if (old?.moveId) throw new FarmError('Yem kirimidan yozilgan xarajat ombor orqali o‘zgartiriladi')
  positive(exp.amount, 'Summa')
  required(exp.date, 'Sana')
  const clean = { ...exp, note: exp.note.trim(), moveId: undefined }
  return {
    ...state,
    expenses: old ? state.expenses.map((e) => (e.id === exp.id ? clean : e)) : [...state.expenses, clean],
  }
}

export function deleteExpense(state: FarmState, id: string): FarmState {
  const exp = state.expenses.find((e) => e.id === id)
  if (exp?.moveId) throw new FarmError('Bu xarajat yem kirimiga bog‘langan — kirimni ombordan o‘chiring')
  return { ...state, expenses: state.expenses.filter((e) => e.id !== id) }
}

// ---------- Foydalanuvchilar ----------

export function currentUser(state: FarmState): User {
  return state.users.find((u) => u.id === state.currentUserId) ?? state.users[0]
}

export function saveUser(state: FarmState, user: User): FarmState {
  required(user.name, 'Ism')
  const exists = state.users.some((u) => u.id === user.id)
  const users = exists ? state.users.map((u) => (u.id === user.id ? { ...user, name: user.name.trim() } : u)) : [...state.users, { ...user, name: user.name.trim() }]
  if (!users.some((u) => u.role === 'admin')) throw new FarmError('Kamida bitta admin qolishi kerak')
  return { ...state, users }
}

export function deleteUser(state: FarmState, id: string): FarmState {
  if (id === state.currentUserId) throw new FarmError('O‘zingizni o‘chira olmaysiz')
  const users = state.users.filter((u) => u.id !== id)
  if (!users.some((u) => u.role === 'admin')) throw new FarmError('Kamida bitta admin qolishi kerak')
  return { ...state, users }
}

// ---------- Hisobot ----------

export function inRange(date: string, from: string, to: string): boolean {
  return (!from || date >= from) && (!to || date <= to)
}

export interface Report {
  expenseTotal: number
  byCategory: { category: ExpenseCategory; amount: number }[]
  feeds: { feedId: string; name: string; unit: string; inQty: number; outQty: number; inSum: number; balance: number }[]
  animals: { species: string; active: number; sold: number; dead: number }[]
}

export function buildReport(state: FarmState, from: string, to: string): Report {
  const exps = state.expenses.filter((e) => inRange(e.date, from, to))
  const byCat = new Map<ExpenseCategory, number>()
  for (const e of exps) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount)
  const moves = state.moves.filter((m) => inRange(m.date, from, to))
  const feeds = state.feeds.map((f) => {
    const fm = moves.filter((m) => m.feedId === f.id)
    const ins = fm.filter((m) => m.kind === 'in')
    return {
      feedId: f.id,
      name: f.name,
      unit: f.unit,
      inQty: round2(ins.reduce((s, m) => s + m.qty, 0)),
      outQty: round2(fm.filter((m) => m.kind === 'out').reduce((s, m) => s + m.qty, 0)),
      inSum: round2(ins.reduce((s, m) => s + m.qty * m.unitPrice, 0)),
      balance: feedBalance(state, f.id),
    }
  })
  const speciesSet = [...new Set(state.animals.map((a) => a.species))]
  const animals = speciesSet.map((species) => {
    const list = state.animals.filter((a) => a.species === species)
    return {
      species,
      active: list.filter((a) => a.status === 'active').length,
      sold: list.filter((a) => a.status === 'sold').length,
      dead: list.filter((a) => a.status === 'dead').length,
    }
  })
  return {
    expenseTotal: round2(exps.reduce((s, e) => s + e.amount, 0)),
    byCategory: [...byCat.entries()]
      .map(([category, amount]) => ({ category, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount),
    feeds,
    animals,
  }
}

export function toCSV(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  // Excel o'zbek/rus lokalida ";" ajratuvchini to'g'ri ochadi; BOM — kirill/lotin harflar uchun.
  return '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n')
}

// ---------- Zaxira nusxa ----------

const ARRAY_KEYS = ['users', 'groups', 'animals', 'feeds', 'moves', 'expenses', 'plans'] as const

export function validateBackup(data: unknown): FarmState {
  if (!data || typeof data !== 'object') throw new FarmError('Fayl formati noto‘g‘ri')
  const d = data as Record<string, unknown>
  if (d.version !== 1) throw new FarmError('Zaxira nusxa versiyasi mos emas')
  for (const k of ARRAY_KEYS) if (!Array.isArray(d[k])) throw new FarmError(`Faylda "${k}" bo‘limi yo‘q`)
  if (typeof d.farmName !== 'string') throw new FarmError('Ferma nomi topilmadi')
  const users = d.users as User[]
  if (!users.length || !users.some((u) => u.role === 'admin')) throw new FarmError('Faylda admin foydalanuvchi yo‘q')
  const s = d as unknown as FarmState
  if (!users.some((u) => u.id === s.currentUserId)) s.currentUserId = users[0].id
  return s
}
