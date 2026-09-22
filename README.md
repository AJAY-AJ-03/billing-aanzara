# Aanzara Billing — Desktop POS & Inventory Management System

A modern, high-performance, offline-first **Point-of-Sale (POS) & Billing Desktop Application** built with **Electron**, **React**, **TypeScript**, and **Prisma ORM with SQLite**.

---

## 🚀 Key Features

* **⚡ Offline-First Desktop Application**: Operates completely offline with zero latency and local SQLite database storage.
* **🛒 POS Billing Terminal**:
  * Lightning-fast **Barcode Scanner** integration.
  * Real-time **Product Search** by SKU, Barcode, or Product Name.
  * **Custom Product Billing** for one-off/non-catalog items (*Gift wrapping, loose produce, services*).
  * Automated **GST Tax Split** (CGST + SGST) and Discount Calculation.
* **🏷️ Offers & Promotional Discounts**: Supports Percentage Discounts and Buy-X-Get-Y offers automatically applied during billing.
* **📦 Product & Inventory Management**: Full product catalog management, categories, stock tracking, and minimum stock alerts.
* **📊 Reports & Excel Exports**:
  * Monthly, Daily, and Product Sales Analytics.
  * One-click **Excel Export (XLSX)** for Sales & GST Tax Reports.
* **🔐 Role-Based Access Control**:
  * **Admin**: Complete system control, user management, stock adjustments, financial reports, and catalog management.
  * **Sales Worker**: Streamlined POS terminal and billing history view.

---

## 🛠️ Technology Stack

* **Desktop Shell**: [Electron](https://www.electronjs.org/)
* **Frontend UI**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Lucide Icons](https://lucide.dev/)
* **Database & ORM**: [Prisma ORM](https://www.prisma.io/), [SQLite](https://www.sqlite.org/)
* **Precompilation**: CommonJS TypeScript compilation (`tsc`) for native Electron performance.
* **Export Engine**: [ExcelJS](https://github.com/exceljs/exceljs)

---

## 📁 Project Structure

```text
d:\billing-aanzara
├── electron/           # Electron Main & Preload process (TypeScript sources)
├── backend-new/        # Core business logic handlers, Prisma schema & Zod validators
│   ├── handlers/       # IPC IPC request handlers (Auth, Billing, Stock, Reports, etc.)
│   ├── validators/     # Zod DTO schema validators
│   └── prisma/         # SQLite Prisma database schema
├── frontend-new/       # Vite + React 19 UI Application
│   ├── src/pages/      # Admin & Billing pages
│   ├── src/services/   # IPC Bridge client API
│   └── src/context/    # Auth & Toast notifications context
├── database/           # SQLite client singleton & seed scripts
├── shared/             # Shared TypeScript IPC types & DTO definitions
└── dist-backend/       # Precompiled CommonJS JS backend build output
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.0.0 or higher)
* **npm** (v9.0.0 or higher)

### Installation

1. **Clone the repository & install dependencies**:
   ```bash
   npm install
   cd frontend-new && npm install && cd ..
   ```

2. **Initialize Database Schema & Seed Initial Data**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

---

## 💻 Development & Execution

### 1. Development Mode (with Live Reloading)
```bash
npm run dev
```
*Compiles backend TypeScript, starts the Vite React dev server, and launches Electron.*

### 2. Run Local Production Build
```bash
npm run build
npm run start:electron
```

### 3. Package Standalone Executable / Installer
To generate a standalone offline Windows `.exe` installer (placed in `dist-electron/`):
```bash
npm run dist
```

---

## 🔐 Default Login Credentials

Upon running `npm run db:seed`, the system is pre-populated with these default accounts:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `Admin@123` | Full Access (Dashboard, Stock, Reports, Users) |
| **Sales Worker** | `sales@example.com` | `Sales@123` | POS Billing Terminal & History |

---

## 📄 License
This project is proprietary software created for Aanzara Billing. All rights reserved.
