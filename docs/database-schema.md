# Database schema

This app stores each signed-in user's data under their Firebase Auth UID. Trackers are separate budgets, such as `Personal` and `Coffee trailer`. Categories and expenses live inside a tracker so spending stays separated.

```text
users/{uid}
  displayName: string
  email: string

users/{uid}/trackers/{trackerId}
  name: string
  description: string
  panelOrder: string[]
  ownerId: string
  createdAt: timestamp
  updatedAt: timestamp

users/{uid}/trackers/{trackerId}/categories/{categoryId}
  name: string
  color: string
  trackerId: string
  ownerId: string
  createdAt: timestamp

users/{uid}/trackers/{trackerId}/expenses/{expenseId}
  trackerId: string
  categoryId: string
  categoryName: string
  goalId: string
  goalName: string
  amount: number
  merchant: string
  notes: string
  spentAt: string
  ownerId: string
  createdAt: timestamp
  updatedAt: timestamp

users/{uid}/trackers/{trackerId}/income/{incomeId}
  trackerId: string
  goalId: string
  goalName: string
  source: string
  amount: number
  receivedAt: string
  notes: string
  ownerId: string
  createdAt: timestamp
  updatedAt: timestamp

users/{uid}/trackers/{trackerId}/goals/{goalId}
  trackerId: string
  name: string
  targetAmount: number
  targetDate: string
  startingAmount: number
  ownerId: string
  createdAt: timestamp
  updatedAt: timestamp
```

## Realtime updates

The UI subscribes with Firestore `onSnapshot` listeners for the selected tracker's categories, expenses, income, and goals. When one of those records changes, the totals, pie chart, recent lists, and monthly goal calculations update automatically.

## Goal calculation

For each goal, the app calculates:

```text
current saved = startingAmount + income assigned to this goal - expenses assigned to this goal
remaining = targetAmount - current saved
monthly savings needed = remaining / months until targetDate
```

If the goal date has already arrived, the app treats it as one month remaining so the user still gets a usable monthly savings number.

## Security model

Firestore rules require `request.auth.uid` to match the `{uid}` path segment. Every tracker, category, and expense also stores `ownerId`, and writes must keep `ownerId` equal to the signed-in user.
