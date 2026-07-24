# Database schema

This app stores each signed-in user's data under their Firebase Auth UID. Trackers are separate budgets, such as `Personal` and `Coffee trailer`. Categories and expenses live inside a tracker so spending stays separated.

```text
users/{uid}
  displayName: string
  email: string

users/{uid}/trackers/{trackerId}
  name: string
  description: string
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
  amount: number
  merchant: string
  notes: string
  spentAt: string
  ownerId: string
  createdAt: timestamp
  updatedAt: timestamp
```

## Realtime updates

The UI subscribes with Firestore `onSnapshot` listeners for the selected tracker's categories and expenses. When an expense or category changes, the pie chart and recent spending list update automatically.

## Security model

Firestore rules require `request.auth.uid` to match the `{uid}` path segment. Every tracker, category, and expense also stores `ownerId`, and writes must keep `ownerId` equal to the signed-in user.
