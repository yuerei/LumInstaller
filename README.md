# LumInstaller 🚀

LumInstaller is a lightweight, high-performance desktop auto-installer utility built with **Go (Wails v2)** and **React (TypeScript)**. It features a sleek, non-resizable glassmorphic dashboard interface, smooth slide transitions, and robust automated directory management safely optimized for Windows environments.

## ✨ Features

- **Fluid Interface:** Sleek, modern custom UI built with modern React state animations and a clean radial background framework.
- **Safe Directory Operations:** Integrated system path validation checks, force-closing routines to prevent file-locking conflicts, and path traversal (**Zip Slip**) security guards.

---

## 🛠️ Tech Stack

- **Backend:** Go v1.21+ (Wails v2 framework)
- **Frontend:** React v18+, TypeScript

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following dependencies installed on your development machine:
- [Go](https://go.dev/doc/install) (v1.21 or newer)
- [Node.js](https://nodejs.org/) (v22 LTS recommended)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation) (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### Local Development

1. Clone the repository to your machine:
   ```bash
   git clone https://github.com/yuerei/LumInstaller.git
   cd LumInstaller
   ```

2. Run the application in hot-reload development mode:
   ```bash
   wails dev
   ```

### Production Build

To clear the internal cache and compile a pristine, optimized Windows executable locally, run:

```bash
wails build -clean

```

The final binary will be generated under the `build/bin/` directory.

---

## 👤 Author

* **Eve** - [@yuerei](https://github.com/yuerei)
* **Website:** [eve.is-a.dev](https://eve.is-a.dev)

Copyright © 2026
