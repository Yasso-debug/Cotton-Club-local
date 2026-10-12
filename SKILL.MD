---
name: cotton-club-pos-skills
description: Curated collection of the best agent skills for building the Cotton Club Local Sales & Inventory Management System — a standalone offline desktop POS application with SQLite, thermal printing, barcode scanning, and daily session management.
---

# Cotton Club POS — Recommended Agent Skills

> Best skills discovered from [skills.sh](https://skills.sh) for this project.
> Last updated: 2026-10-13

---

## 1. How to Install Skills

Use the `npx skills` CLI to install any skill listed below:

```bash
# Install a single skill
npx skills add <owner/repo> --skill <skill-name>

# Install globally (available across all projects)
npx skills add <owner/repo> --skill <skill-name> --global

# List installed skills
npx skills list

# Remove a skill
npx skills remove <skill-name>
```

---

## 2. Recommended Skills by Category

### 2.1 🗄️ Database & SQLite (Critical)

These are the most important skills for this project since the entire system runs on an embedded SQLite database.

| # | Skill | Repo | Installs | Install Command |
|---|---|---|---|---|
| 1 | **sqlite-ops** | 0xdarkmatter/claude-mods | 97 | `npx skills add 0xdarkmatter/claude-mods --skill sqlite-ops` |
| 2 | **how-to-store-sqlite-as-nosql-store** | rodydavis/skills | 46 | `npx skills add rodydavis/skills --skill how-to-store-sqlite-as-nosql-store` |
| 3 | **deepbase** | clasen/deepbase | 15 | `npx skills add clasen/deepbase --skill deepbase` |

**Why these matter:**
- `sqlite-ops` — Comprehensive SQLite operations skill covering **query performance, concurrency, schema design, WAL mode, PRAGMA tuning, indexing strategies, ACID transactions, and encryption**. This is the single most important skill for the Cotton Club project since the entire data layer is SQLite with SQLCipher.
- `how-to-store-sqlite-as-nosql-store` — Alternative data patterns for SQLite, useful for flexible settings/config storage and JSON-based audit logs.
- `deepbase` — Database architecture patterns and deep query optimization.

---

### 2.2 🏗️ Architecture & Code Quality (Critical)

These high-install-count skills enforce best practices for code structure, maintainability, and review quality.

| # | Skill | Repo | Installs | Install Command |
|---|---|---|---|---|
| 1 | **improve-codebase-architecture** | mattpocock/skills | 1.1M | `npx skills add mattpocock/skills --skill improve-codebase-architecture` |
| 2 | **codebase-design** | mattpocock/skills | 780.3K | `npx skills add mattpocock/skills --skill codebase-design` |
| 3 | **code-review** | mattpocock/skills | 717.1K | `npx skills add mattpocock/skills --skill code-review` |
| 4 | **onioncry** | marcioaltoe/skills | 44 | `npx skills add marcioaltoe/skills --skill onioncry` |
| 5 | **backend-development** | carvalab/k-skills | 26 | `npx skills add carvalab/k-skills --skill backend-development` |

**Why these matter:**
- `improve-codebase-architecture` — The most popular skill on skills.sh (1.1M installs). Guides the agent in MVVM/MVP layered architecture, dependency injection, separation of concerns — all critical for the Cotton Club 4-layer architecture (Presentation → Business Logic → Data Access → Infrastructure).
- `codebase-design` — Complementary to architecture; focuses on module design, interfaces, and clean abstractions between the 6 system modules (POS, Inventory, Purchasing, Expenses, Reports, Session Manager).
- `code-review` — Ensures generated code meets production quality: error handling, transaction safety, edge cases, and naming conventions.
- `onioncry` — Clean/Onion architecture patterns (relevant for the layered .NET solution structure).
- `backend-development` — Backend service patterns for data access layers and business logic services.

---

### 2.3 🖥️ Desktop Application & Electron (Important)

Skills for building desktop applications — relevant if using the Electron alternative stack.

| # | Skill | Repo | Installs | Install Command |
|---|---|---|---|---|
| 1 | **user-acceptance** | gannonh/skills | 52 | `npx skills add gannonh/skills --skill user-acceptance` |
| 2 | **boxlang-runtime-desktop-electron** | ortus-boxlang/skills | 14 | `npx skills add ortus-boxlang/skills --skill boxlang-runtime-desktop-electron` |
| 3 | **electron-security** | hlsitechio/claude-skills-security | 2 | `npx skills add hlsitechio/claude-skills-security --skill electron-security` |
| 4 | **c4-electron-architect** | 0xvenky/ccux-dev | 2 | `npx skills add 0xvenky/ccux-dev --skill c4-electron-architect` |
| 5 | **tauri** | lynricsy/hyperskills | 2 | `npx skills add lynricsy/hyperskills --skill tauri` |
| 6 | **desktop-release** | ryokun6/ryos | 4 | `npx skills add ryokun6/ryos --skill desktop-release` |

**Why these matter:**
- `user-acceptance` — UAT testing patterns critical for POS systems where real-world cashier workflows must be validated.
- `electron-security` — If using Electron: local database security, IPC hardening, and preventing data exposure.
- `c4-electron-architect` — C4 architecture diagramming for Electron desktop apps.
- `tauri` — Lighter alternative to Electron with better performance (relevant if reconsidering the desktop framework).
- `desktop-release` — Desktop app packaging, signing, and installer creation workflows.

---

### 2.4 🧪 Testing & Quality Assurance (Important)

| # | Skill | Repo | Installs | Install Command |
|---|---|---|---|---|
| 1 | **unit-test-json-serialization** | giuseppe-trisciuoglio/developer-kit | 3.6K | `npx skills add giuseppe-trisciuoglio/developer-kit --skill unit-test-json-serialization` |
| 2 | **dummy-dataset** | phuryn/pm-skills | 2.6K | `npx skills add phuryn/pm-skills --skill dummy-dataset` |
| 3 | **typescript** | pproenca/dot-skills | 1.6K | `npx skills add pproenca/dot-skills --skill typescript` |
| 4 | **node** | mcollina/skills | 5.7K | `npx skills add mcollina/skills --skill node` |
| 5 | **node-best-practices** | mcollina/skills | 404 | `npx skills add mcollina/skills --skill node-best-practices` |

**Why these matter:**
- `unit-test-json-serialization` — Unit testing patterns for data serialization (critical for audit log JSON snapshots and settings storage).
- `dummy-dataset` — Generate realistic test data for products, invoices, suppliers, and daily sessions.
- `node` / `node-best-practices` — Node.js best practices if using the Electron stack.

---

### 2.5 🔒 Security & Encryption (Important)

| # | Skill | Repo | Installs | Install Command |
|---|---|---|---|---|
| 1 | **penetration-testing-with-strix** | usestrix/strix | 13.2K | `npx skills add usestrix/strix --skill penetration-testing-with-strix` |
| 2 | **jwt-encode** | jsonwebtoken/jwt-skills | 580 | `npx skills add jsonwebtoken/jwt-skills --skill jwt-encode` |
| 3 | **testing-jwt-token-security** | mukul975/anthropic-cybersecurity-skills | 512 | `npx skills add mukul975/anthropic-cybersecurity-skills --skill testing-jwt-token-security` |

**Why these matter:**
- `penetration-testing-with-strix` — Security testing patterns to validate the application against common attack vectors (important for a system handling financial data).
- `jwt-encode` / `testing-jwt-token-security` — Token-based authentication patterns applicable to session management and manager override authentication flows.

---

### 2.6 📊 Data & Content Management (Nice-to-Have)

| # | Skill | Repo | Installs | Install Command |
|---|---|---|---|---|
| 1 | **json-content-management** | canatufkansu/claude-skills | 9 | `npx skills add canatufkansu/claude-skills --skill json-content-management` |
| 2 | **databow** | columnar-tech/skills | 14 | `npx skills add columnar-tech/skills --skill databow` |

**Why these matter:**
- `json-content-management` — JSON data management patterns for app settings, receipt templates, and configuration storage.
- `databow` — Data pipeline and transformation patterns for report generation.

---

## 3. Recommended Installation Order

For the Cotton Club project, install skills in this priority order:

### Phase 1 — Foundation (Install First)
```bash
# Architecture & design patterns
npx skills add mattpocock/skills --skill improve-codebase-architecture
npx skills add mattpocock/skills --skill codebase-design
npx skills add mattpocock/skills --skill code-review

# SQLite operations (core database skill)
npx skills add 0xdarkmatter/claude-mods --skill sqlite-ops
```

### Phase 2 — Core Development
```bash
# Backend patterns
npx skills add carvalab/k-skills --skill backend-development
npx skills add marcioaltoe/skills --skill onioncry

# Test data generation
npx skills add phuryn/pm-skills --skill dummy-dataset
```

### Phase 3 — Desktop & Security
```bash
# Desktop app patterns (if using Electron)
npx skills add gannonh/skills --skill user-acceptance
npx skills add hlsitechio/claude-skills-security --skill electron-security
npx skills add ryokun6/ryos --skill desktop-release

# Security
npx skills add usestrix/strix --skill penetration-testing-with-strix
```

### Phase 4 — Polish & Testing
```bash
# Testing
npx skills add giuseppe-trisciuoglio/developer-kit --skill unit-test-json-serialization

# Data patterns
npx skills add canatufkansu/claude-skills --skill json-content-management
npx skills add rodydavis/skills --skill how-to-store-sqlite-as-nosql-store
```

---

## 4. Quick Install — All Critical Skills at Once

```bash
# One-liner to install the 4 most critical skills for this project
npx skills add mattpocock/skills --skill improve-codebase-architecture -y && \
npx skills add mattpocock/skills --skill codebase-design -y && \
npx skills add mattpocock/skills --skill code-review -y && \
npx skills add 0xdarkmatter/claude-mods --skill sqlite-ops -y
```

---

## 5. Skills NOT Found (Gaps to Fill Manually)

The following project-critical areas had **no matching skills** on skills.sh. These will need to be handled through manual documentation and custom implementation:

| Area | Gap | Workaround |
|---|---|---|
| **C# / .NET / WPF** | No skills available for the recommended tech stack | Use official Microsoft documentation and NuGet packages |
| **Thermal Printing (ESC/POS)** | No printing/receipt skills found | Implement using ESC/POS protocol libraries (EPSON command reference) |
| **Barcode Generation** | No barcode skills found | Use ZXing.Net or BarcodeLib NuGet packages |
| **POS / Point of Sale** | No retail/POS-specific skills | Follow the Technical Implementation Plan for POS logic |
| **Arabic RTL UI** | No RTL/internationalization skills found | Use WPF FlowDirection="RightToLeft" and Arabic font libraries |
| **Inno Setup / NSIS Installer** | No installer creation skills found | Use Inno Setup documentation and templates |

---

## 6. Skill Discovery Commands Reference

Use these commands to search for additional skills as the project evolves:

```bash
# Search by keyword
npx skills find "your search term"

# Search within a specific GitHub owner
npx skills find "keyword" --owner vercel-labs

# List available skills in a repository
npx skills add <owner/repo> --list

# Get JSON output for scripting
npx skills find "keyword" --json

# Browse all skills
# Visit: https://skills.sh/
```

---

*This SKILL.MD is tailored to the Cotton Club Local Sales & Inventory Management System project.*
