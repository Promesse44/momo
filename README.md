# MTN MoMo Analytics Dashboard

A full-stack dashboard for analyzing MTN Mobile Money (MoMo) transactions. The system processes XML SMS data, stores it in a SQLite database, and provides a modern, interactive web dashboard for analytics and visualization.

---

## Features

- **XML Data Import:** Load and parse MoMo transaction SMS data from XML.
- **Data Storage:** Transactions are stored in a local SQLite database.
- **REST API:** Backend exposes endpoints for querying transactions by category, date, amount, recipient, and more.
- **Interactive Dashboard:** Visualize statistics, trends, and details using charts and tables.
- **Filtering & Search:** Filter transactions by category, date, amount, and recipient.
- **Responsive UI:** Modern, mobile-friendly frontend.

---

## Folder Structure

```
backend/
    scripts.js         # Node.js backend server
    package.json       # Backend dependencies
    momo.db            # SQLite database (auto-created)
    modified_sms_v2.xml# Sample XML data file
    unprocessed.log    # Log for unprocessed messages
Frontend/
    index.html         # Main dashboard page
    css/
        styles.css     # Dashboard styling
    js/
        index.js       # Dashboard logic
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v14+ recommended)
- [npm](https://www.npmjs.com/)
- [SQLite3](https://www.sqlite.org/index.html)
- Modern web browser (Chrome, Firefox, Edge, etc.)

---

## Setup & Running

### 1. Backend Setup

1. Open a terminal and navigate to the `backend` directory:
    ```sh
    cd backend
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Start the backend server:
    ```sh
    node scripts.js
    ```
    The server will start on [http://localhost:5000](http://localhost:5000).

### 2. Frontend Setup

1. Open `Frontend/index.html` in your web browser (double-click or use `Live Server` in VS Code).

2. Click the **"Load Data from XML"** button to import transactions from the XML file.

3. Use the dashboard to view analytics, filter/search transactions, and explore details.

---

## API Endpoints

- `GET /load-data`  
  Loads and processes transactions from `modified_sms_v2.xml`.

- `GET /transactions`  
  Returns all transactions.

- `GET /transactions/category/:category`  
  Returns transactions by category.

- `GET /transactions/date/:date`  
  Returns transactions for a specific date (YYYY-MM-DD).

- `GET /transactions/recipient/:recipient`  
  Returns transactions for a recipient.

- `GET /transactions/amount/:amount`  
  Returns transactions with a specific amount.

- `GET /transactions/min-amount/:minAmount`  
  Returns transactions with amount >= minAmount.

- `GET /transactions/max-amount/:maxAmount`  
  Returns transactions with amount <= maxAmount.

---

## Video Illustration

A short video walkthrough of the dashboard, including data loading, filtering, and analytics, is available here:

**[Watch the Demo Video](https://www.loom.com/share/041741f2b4a14cde8c1a7b004ff69996?sid=51503ef4-6c1e-4539-842a-3ad73ea7ea80)**


---

## Notes

- If you encounter issues loading data, ensure the backend server is running and accessible at `http://localhost:5000`.
- Unprocessed or malformed messages are logged in `backend/unprocessed.log`.
- The dashboard is fully client-side and does not require a separate build step.

