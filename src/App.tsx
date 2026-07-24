import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  CircleDollarSign,
  Layers3,
  LogIn,
  LogOut,
  Plus,
  Tags,
  Target,
  Trash2,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import './App.css'
import { auth, db, googleProvider } from './firebase'
import type { Expense, Goal, Income, SpendingCategory, Tracker } from './types'

const starterCategories = [
  { name: 'Food', color: '#0f766e' },
  { name: 'Coffee', color: '#b45309' },
  { name: 'Fuel', color: '#2563eb' },
  { name: 'Supplies', color: '#7c3aed' },
  { name: 'Utilities', color: '#dc2626' },
  { name: 'Rent', color: '#475569' },
]

const today = new Date().toISOString().slice(0, 10)

function userCollection(uid: string, path: string) {
  return collection(db, 'users', uid, path)
}

function trackerDoc(uid: string, trackerId: string) {
  return doc(db, 'users', uid, 'trackers', trackerId)
}

function trackerSubcollection(uid: string, trackerId: string, path: string) {
  return collection(db, 'users', uid, 'trackers', trackerId, path)
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function monthsUntil(dateText: string) {
  const targetDate = new Date(`${dateText}T12:00:00`)
  const now = new Date()
  if (Number.isNaN(targetDate.getTime()) || targetDate <= now) {
    return 1
  }

  const years = targetDate.getFullYear() - now.getFullYear()
  const months = targetDate.getMonth() - now.getMonth()
  const partialMonth = targetDate.getDate() > now.getDate() ? 1 : 0

  return Math.max(1, years * 12 + months + partialMonth)
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [trackers, setTrackers] = useState<Tracker[]>([])
  const [selectedTrackerId, setSelectedTrackerId] = useState('')
  const [categories, setCategories] = useState<SpendingCategory[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [income, setIncome] = useState<Income[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [trackerName, setTrackerName] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState('#0f766e')
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    merchant: '',
    categoryId: '',
    spentAt: today,
    notes: '',
  })
  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    source: '',
    receivedAt: today,
    notes: '',
  })
  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    startingAmount: '',
    targetDate: today,
  })

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
    })
  }, [])

  useEffect(() => {
    if (!user) {
      setTrackers([])
      setSelectedTrackerId('')
      return
    }

    const trackersQuery = query(userCollection(user.uid, 'trackers'), orderBy('createdAt'))
    return onSnapshot(trackersQuery, (snapshot) => {
      const nextTrackers = snapshot.docs.map(
        (document) => ({ id: document.id, ...document.data() }) as Tracker,
      )
      setTrackers(nextTrackers)
      setSelectedTrackerId((current) => current || nextTrackers[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!user || trackers.length > 0) {
      return
    }

    const createDefaultTracker = async () => {
      const defaultTrackerId = 'personal'

      await setDoc(trackerDoc(user.uid, defaultTrackerId), {
        name: 'Personal',
        description: 'Default spending tracker',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      await Promise.all(
        starterCategories.map((category) =>
          setDoc(doc(trackerSubcollection(user.uid, defaultTrackerId, 'categories'), category.name.toLowerCase()), {
            ...category,
            trackerId: defaultTrackerId,
            ownerId: user.uid,
            createdAt: serverTimestamp(),
          }),
        ),
      )
    }

    void createDefaultTracker()
  }, [trackers.length, user])

  useEffect(() => {
    if (!user || !selectedTrackerId) {
      setCategories([])
      setExpenses([])
      setIncome([])
      setGoals([])
      return
    }

    const categoriesQuery = query(
      trackerSubcollection(user.uid, selectedTrackerId, 'categories'),
      orderBy('name'),
    )
    const expensesQuery = query(
      trackerSubcollection(user.uid, selectedTrackerId, 'expenses'),
      orderBy('spentAt', 'desc'),
    )
    const incomeQuery = query(
      trackerSubcollection(user.uid, selectedTrackerId, 'income'),
      orderBy('receivedAt', 'desc'),
    )
    const goalsQuery = query(
      trackerSubcollection(user.uid, selectedTrackerId, 'goals'),
      orderBy('targetDate'),
    )

    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const nextCategories = snapshot.docs.map(
        (document) =>
          ({ id: document.id, ...document.data() }) as SpendingCategory,
      )
      setCategories(nextCategories)
      setExpenseForm((current) => ({
        ...current,
        categoryId: nextCategories.some((category) => category.id === current.categoryId)
          ? current.categoryId
          : nextCategories[0]?.id || '',
      }))
    })
    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      setExpenses(
        snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as Expense,
        ),
      )
    })
    const unsubscribeIncome = onSnapshot(incomeQuery, (snapshot) => {
      setIncome(
        snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as Income,
        ),
      )
    })
    const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
      setGoals(
        snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as Goal,
        ),
      )
    })

    return () => {
      unsubscribeCategories()
      unsubscribeExpenses()
      unsubscribeIncome()
      unsubscribeGoals()
    }
  }, [selectedTrackerId, user])

  const selectedTracker = trackers.find((tracker) => tracker.id === selectedTrackerId)

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, { name: string; color: string; value: number }>()

    for (const category of categories) {
      totals.set(category.id, {
        name: category.name,
        color: category.color,
        value: 0,
      })
    }

    for (const expense of expenses) {
      const current = totals.get(expense.categoryId) ?? {
        name: expense.categoryName || 'Uncategorized',
        color: '#64748b',
        value: 0,
      }
      totals.set(expense.categoryId, {
        ...current,
        value: current.value + expense.amount,
      })
    }

    return Array.from(totals.values()).filter((item) => item.value > 0)
  }, [categories, expenses])

  const totalSpent = categoryTotals.reduce((sum, item) => sum + item.value, 0)
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0)
  const netSaved = totalIncome - totalSpent

  const createTracker = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !trackerName.trim()) {
      return
    }

    const newTracker = await addDoc(userCollection(user.uid, 'trackers'), {
      name: trackerName.trim(),
      description: '',
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await Promise.all(
      starterCategories.map((category) =>
        addDoc(trackerSubcollection(user.uid, newTracker.id, 'categories'), {
          ...category,
          trackerId: newTracker.id,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        }),
      ),
    )

    setTrackerName('')
    setSelectedTrackerId(newTracker.id)
  }

  const createCategory = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !selectedTrackerId || !categoryName.trim()) {
      return
    }

    await addDoc(trackerSubcollection(user.uid, selectedTrackerId, 'categories'), {
      name: categoryName.trim(),
      color: categoryColor,
      trackerId: selectedTrackerId,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
    })

    setCategoryName('')
  }

  const createExpense = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !selectedTrackerId || !expenseForm.categoryId) {
      return
    }

    const amount = Number(expenseForm.amount)
    const category = categories.find((item) => item.id === expenseForm.categoryId)
    if (!Number.isFinite(amount) || amount <= 0 || !category) {
      return
    }

    await addDoc(trackerSubcollection(user.uid, selectedTrackerId, 'expenses'), {
      trackerId: selectedTrackerId,
      categoryId: category.id,
      categoryName: category.name,
      amount,
      merchant: expenseForm.merchant.trim(),
      notes: expenseForm.notes.trim(),
      spentAt: expenseForm.spentAt || today,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await updateDoc(trackerDoc(user.uid, selectedTrackerId), {
      updatedAt: serverTimestamp(),
    })

    setExpenseForm({
      amount: '',
      merchant: '',
      categoryId: category.id,
      spentAt: today,
      notes: '',
    })
  }

  const createIncome = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !selectedTrackerId) {
      return
    }

    const amount = Number(incomeForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return
    }

    await addDoc(trackerSubcollection(user.uid, selectedTrackerId, 'income'), {
      trackerId: selectedTrackerId,
      source: incomeForm.source.trim(),
      amount,
      receivedAt: incomeForm.receivedAt || today,
      notes: incomeForm.notes.trim(),
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await updateDoc(trackerDoc(user.uid, selectedTrackerId), {
      updatedAt: serverTimestamp(),
    })

    setIncomeForm({
      amount: '',
      source: '',
      receivedAt: today,
      notes: '',
    })
  }

  const createGoal = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !selectedTrackerId || !goalForm.name.trim()) {
      return
    }

    const targetAmount = Number(goalForm.targetAmount)
    const startingAmount = Number(goalForm.startingAmount || 0)
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return
    }

    await addDoc(trackerSubcollection(user.uid, selectedTrackerId, 'goals'), {
      trackerId: selectedTrackerId,
      name: goalForm.name.trim(),
      targetAmount,
      targetDate: goalForm.targetDate || today,
      startingAmount: Number.isFinite(startingAmount) ? startingAmount : 0,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    setGoalForm({
      name: '',
      targetAmount: '',
      startingAmount: '',
      targetDate: today,
    })
  }

  const removeExpense = async (expenseId: string) => {
    if (!user || !selectedTrackerId) {
      return
    }

    await deleteDoc(doc(db, 'users', user.uid, 'trackers', selectedTrackerId, 'expenses', expenseId))
  }

  const removeIncome = async (incomeId: string) => {
    if (!user || !selectedTrackerId) {
      return
    }

    await deleteDoc(doc(db, 'users', user.uid, 'trackers', selectedTrackerId, 'income', incomeId))
  }

  const removeGoal = async (goalId: string) => {
    if (!user || !selectedTrackerId) {
      return
    }

    await deleteDoc(doc(db, 'users', user.uid, 'trackers', selectedTrackerId, 'goals', goalId))
  }

  const removeCategory = async (category: SpendingCategory) => {
    if (!user || !selectedTrackerId) {
      return
    }

    const categoryHasExpenses = expenses.some(
      (expense) => expense.categoryId === category.id,
    )
    if (categoryHasExpenses) {
      return
    }

    await deleteDoc(
      doc(db, 'users', user.uid, 'trackers', selectedTrackerId, 'categories', category.id),
    )
  }

  const signIn = () => signInWithPopup(auth, googleProvider)

  const seedDemoData = async () => {
    if (!user || !selectedTrackerId || categories.length === 0) {
      return
    }

    const demoRows = [
      ['Espresso beans', 82.5, 'Coffee'],
      ['Propane refill', 41.24, 'Fuel'],
      ['Pastries', 67.1, 'Food'],
      ['Paper cups', 29.99, 'Supplies'],
    ] as const

    await Promise.all(
      demoRows.map(([merchant, amount, categoryName]) => {
        const category =
          categories.find((item) => item.name === categoryName) ?? categories[0]
        return addDoc(trackerSubcollection(user.uid, selectedTrackerId, 'expenses'), {
          trackerId: selectedTrackerId,
          categoryId: category.id,
          categoryName: category.name,
          amount,
          merchant,
          notes: '',
          spentAt: today,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }),
    )

    await addDoc(trackerSubcollection(user.uid, selectedTrackerId, 'income'), {
      trackerId: selectedTrackerId,
      source: 'Sold fridge',
      amount: 50,
      receivedAt: today,
      notes: 'Demo income',
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  if (!authReady) {
    return <main className="center-state">Loading spending tracker...</main>
  }

  if (!user) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <WalletCards aria-hidden="true" />
          <h1>Spending Tracker</h1>
          <p>Sign in with Google to create separate trackers for personal spending, business projects, trailers, events, or any budget you want to monitor.</p>
          <button className="primary-action" type="button" onClick={signIn}>
            <LogIn aria-hidden="true" />
            Sign in with Google
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <WalletCards aria-hidden="true" />
          <div>
            <h1>Spending</h1>
            <span>{user.displayName || user.email}</span>
          </div>
        </div>

        <form className="compact-form" onSubmit={createTracker}>
          <label htmlFor="trackerName">New tracker</label>
          <div className="inline-controls">
            <input
              id="trackerName"
              value={trackerName}
              onChange={(event) => setTrackerName(event.target.value)}
              placeholder="Coffee trailer"
            />
            <button type="submit" aria-label="Create tracker">
              <Plus aria-hidden="true" />
            </button>
          </div>
        </form>

        <nav className="tracker-list" aria-label="Trackers">
          {trackers.map((tracker) => (
            <button
              className={tracker.id === selectedTrackerId ? 'active' : ''}
              key={tracker.id}
              type="button"
              onClick={() => setSelectedTrackerId(tracker.id)}
            >
              <Layers3 aria-hidden="true" />
              <span>{tracker.name}</span>
            </button>
          ))}
        </nav>

        <button className="ghost-action" type="button" onClick={() => signOut(auth)}>
          <LogOut aria-hidden="true" />
          Sign out
        </button>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">Current tracker</span>
            <h2>{selectedTracker?.name ?? 'No tracker selected'}</h2>
          </div>
          <div className="total-box">
            <span>Net saved</span>
            <strong>{money(netSaved)}</strong>
          </div>
        </header>

        <section className="summary-strip" aria-label="Tracker summary">
          <div>
            <span>Income</span>
            <strong>{money(totalIncome)}</strong>
          </div>
          <div>
            <span>Spent</span>
            <strong>{money(totalSpent)}</strong>
          </div>
          <div>
            <span>Remaining</span>
            <strong>{money(netSaved)}</strong>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="panel chart-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Category breakdown</span>
                <h3>Spending by category</h3>
              </div>
              <button type="button" className="secondary-action" onClick={seedDemoData}>
                Add demo rows
              </button>
            </div>

            <div className="chart-wrap">
              {categoryTotals.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryTotals}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="82%"
                    >
                      {categoryTotals.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => money(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <CircleDollarSign aria-hidden="true" />
                  <span>Add an expense to see the pie chart.</span>
                </div>
              )}
            </div>

            <div className="legend-grid">
              {categoryTotals.map((item) => (
                <div className="legend-row" key={item.name}>
                  <span style={{ background: item.color }} />
                  <p>{item.name}</p>
                  <strong>{money(item.value)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panel form-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Add expense</span>
                <h3>New spending entry</h3>
              </div>
            </div>

            <form className="expense-form" onSubmit={createExpense}>
              <label>
                Amount
                <input
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={expenseForm.amount}
                  onChange={(event) =>
                    setExpenseForm({ ...expenseForm, amount: event.target.value })
                  }
                  placeholder="14.75"
                  required
                />
              </label>
              <label>
                Merchant
                <input
                  value={expenseForm.merchant}
                  onChange={(event) =>
                    setExpenseForm({ ...expenseForm, merchant: event.target.value })
                  }
                  placeholder="Corner Market"
                />
              </label>
              <label>
                Category
                <select
                  value={expenseForm.categoryId}
                  onChange={(event) =>
                    setExpenseForm({ ...expenseForm, categoryId: event.target.value })
                  }
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={expenseForm.spentAt}
                  onChange={(event) =>
                    setExpenseForm({ ...expenseForm, spentAt: event.target.value })
                  }
                />
              </label>
              <label className="wide-field">
                Notes
                <textarea
                  value={expenseForm.notes}
                  onChange={(event) =>
                    setExpenseForm({ ...expenseForm, notes: event.target.value })
                  }
                  placeholder="Optional note"
                />
              </label>
              <button className="primary-action wide-field" type="submit">
                <Plus aria-hidden="true" />
                Add expense
              </button>
            </form>
          </div>

          <div className="panel income-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Money in</span>
                <h3>Add income</h3>
              </div>
              <TrendingUp aria-hidden="true" />
            </div>

            <form className="income-form" onSubmit={createIncome}>
              <label>
                Amount
                <input
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={incomeForm.amount}
                  onChange={(event) =>
                    setIncomeForm({ ...incomeForm, amount: event.target.value })
                  }
                  placeholder="50"
                  required
                />
              </label>
              <label>
                Source
                <input
                  value={incomeForm.source}
                  onChange={(event) =>
                    setIncomeForm({ ...incomeForm, source: event.target.value })
                  }
                  placeholder="Sold fridge"
                />
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={incomeForm.receivedAt}
                  onChange={(event) =>
                    setIncomeForm({ ...incomeForm, receivedAt: event.target.value })
                  }
                />
              </label>
              <label>
                Notes
                <input
                  value={incomeForm.notes}
                  onChange={(event) =>
                    setIncomeForm({ ...incomeForm, notes: event.target.value })
                  }
                  placeholder="Optional note"
                />
              </label>
              <button className="primary-action wide-field" type="submit">
                <Plus aria-hidden="true" />
                Add income
              </button>
            </form>

            <div className="income-list">
              {income.map((incomeItem) => (
                <article className="income-row" key={incomeItem.id}>
                  <div>
                    <strong>{incomeItem.source || 'Income'}</strong>
                    <span>{incomeItem.receivedAt}</span>
                  </div>
                  <div className="expense-row-actions">
                    <strong>{money(incomeItem.amount)}</strong>
                    <button
                      type="button"
                      aria-label={`Delete ${incomeItem.source || 'income'}`}
                      onClick={() => removeIncome(incomeItem.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="panel category-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Dropdown options</span>
                <h3>Categories</h3>
              </div>
              <Tags aria-hidden="true" />
            </div>

            <form className="category-form" onSubmit={createCategory}>
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Insurance"
              />
              <input
                aria-label="Category color"
                type="color"
                value={categoryColor}
                onChange={(event) => setCategoryColor(event.target.value)}
              />
              <button type="submit" aria-label="Create category">
                <Plus aria-hidden="true" />
              </button>
            </form>

            <div className="category-list">
              {categories.map((category) => (
                <article key={category.id} className="category-row">
                  <div>
                    <span style={{ background: category.color }} />
                    <p>{category.name}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${category.name}`}
                    disabled={expenses.some(
                      (expense) => expense.categoryId === category.id,
                    )}
                    title={
                      expenses.some((expense) => expense.categoryId === category.id)
                        ? 'Delete expenses in this category first'
                        : `Delete ${category.name}`
                    }
                    onClick={() => removeCategory(category)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="panel goals-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Savings goals</span>
                <h3>Goal tracker</h3>
              </div>
              <Target aria-hidden="true" />
            </div>

            <form className="goal-form" onSubmit={createGoal}>
              <label>
                Goal name
                <input
                  value={goalForm.name}
                  onChange={(event) =>
                    setGoalForm({ ...goalForm, name: event.target.value })
                  }
                  placeholder="New trailer fund"
                  required
                />
              </label>
              <label>
                Target amount
                <input
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={goalForm.targetAmount}
                  onChange={(event) =>
                    setGoalForm({ ...goalForm, targetAmount: event.target.value })
                  }
                  placeholder="2500"
                  required
                />
              </label>
              <label>
                Saved already
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={goalForm.startingAmount}
                  onChange={(event) =>
                    setGoalForm({ ...goalForm, startingAmount: event.target.value })
                  }
                  placeholder="100"
                />
              </label>
              <label>
                By date
                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(event) =>
                    setGoalForm({ ...goalForm, targetDate: event.target.value })
                  }
                  required
                />
              </label>
              <button className="primary-action wide-field" type="submit">
                <Plus aria-hidden="true" />
                Add goal
              </button>
            </form>

            <div className="goal-list">
              {goals.length === 0 ? (
                <div className="empty-state slim">
                  <Target aria-hidden="true" />
                  <span>No savings goals yet.</span>
                </div>
              ) : (
                goals.map((goal) => {
                  const currentAmount = goal.startingAmount + netSaved
                  const remaining = Math.max(0, goal.targetAmount - currentAmount)
                  const monthsRemaining = monthsUntil(goal.targetDate)
                  const monthlySavings = remaining / monthsRemaining
                  const progress = Math.min(
                    100,
                    Math.max(0, (currentAmount / goal.targetAmount) * 100),
                  )

                  return (
                    <article className="goal-row" key={goal.id}>
                      <div className="goal-row-header">
                        <div>
                          <strong>{goal.name}</strong>
                          <span>Due {goal.targetDate}</span>
                        </div>
                        <button
                          type="button"
                          aria-label={`Delete ${goal.name}`}
                          onClick={() => removeGoal(goal.id)}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                      <div className="progress-bar" aria-hidden="true">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <div className="goal-metrics">
                        <div>
                          <span>Saved now</span>
                          <strong>{money(currentAmount)}</strong>
                        </div>
                        <div>
                          <span>Goal</span>
                          <strong>{money(goal.targetAmount)}</strong>
                        </div>
                        <div>
                          <span>Save monthly</span>
                          <strong>{money(monthlySavings)}</strong>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </div>

          <div className="panel expense-list-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Live entries</span>
                <h3>Recent spending</h3>
              </div>
            </div>

            <div className="expense-list">
              {expenses.length === 0 ? (
                <div className="empty-state slim">
                  <CircleDollarSign aria-hidden="true" />
                  <span>No spending entries yet.</span>
                </div>
              ) : (
                expenses.map((expense) => (
                  <article key={expense.id} className="expense-row">
                    <div>
                      <strong>{expense.merchant || expense.categoryName}</strong>
                      <span>{expense.categoryName} · {expense.spentAt}</span>
                    </div>
                    <div className="expense-row-actions">
                      <strong>{money(expense.amount)}</strong>
                      <button
                        type="button"
                        aria-label={`Delete ${expense.merchant || expense.categoryName}`}
                        onClick={() => removeExpense(expense.id)}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
