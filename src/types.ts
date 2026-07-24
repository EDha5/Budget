import type { Timestamp } from 'firebase/firestore'

export type Tracker = {
  id: string
  name: string
  description: string
  ownerId: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export type SpendingCategory = {
  id: string
  name: string
  color: string
  trackerId: string
  ownerId: string
  createdAt?: Timestamp
}

export type Expense = {
  id: string
  trackerId: string
  categoryId: string
  categoryName: string
  amount: number
  merchant: string
  notes: string
  spentAt: string
  ownerId: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}
