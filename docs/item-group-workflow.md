# Item Group Master — Workflow

```mermaid
flowchart TD
    A[Open Item Group Master] --> B[Item Group List]
    B --> B1[Search box]
    B --> B2[Status filter: All / Active / Inactive]
    B --> B3[Rows: Active first, then by last edited]

    B --> C[Create Item Group]
    B --> D[Edit Item Group]
    B --> E[Delete row]

    C --> F[Fill form]
    D --> F
    F --> G[Group ID = auto-generated]
    F --> H[Group Name *]
    F --> I[Description]
    F --> J[Active checkbox]

    J --> K{Active checked?}

    K -- Yes --> L[Status = Active]
    K -- No --> M[Status = Inactive]

    L --> N[Save]
    M --> N

    N --> B

    E --> O{Group in use by items?}
    O -- No --> P[Hard delete - row removed]
    O -- Yes --> Q[Auto-deactivate + error toast]

    P --> B
    Q --> B

    L -.-> R[Item Master / Item Group dropdown shows it]
    M -.x R
```

## Rules

- **Create/Edit** → the **Active** checkbox decides visibility; unchecking keeps the row in the table as **Inactive**.
- **Item Master dropdowns** only list **Active** groups (`activeOnly=true`).
- **Delete** → permanently removes unreferenced groups; groups used by items are auto-deactivated instead.
- **Sorting** → Active groups first, then most recently added/edited.