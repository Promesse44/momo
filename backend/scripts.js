const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const fss = require('fs');
const xml2js = require('xml2js');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();


// creating SQLite database
const db = new sqlite3.Database('./momo.db');


// Creating transactions table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      txId TEXT,
      amount INTEGER,
      recipient TEXT,
      date TEXT,
      balance INTEGER,
      category TEXT
    )
  `);
});

// locating log file to store unproccessed data
const log_file = path.join(__dirname, 'unprocessed.log');

//creating express app to create API end points
const app = express();
app.use(cors());

/*
creating first API end point to load data from xml file, 
cleaning,categorizing an storing processed data to db and unproccesed to log file
*/

app.get('/load-data', async (req, res) => {
  try {
    //retrieving data from xml file
    const xmlData = await fs.readFile('modified_sms_v2.xml', 'utf8');
    const result = await xml2js.parseStringPromise(xmlData);
    const smsList = result.smses.sms;

    // helper function to categorize each transaction message
    const categorize = (body) => {
      const patterns = [
        { category: "Incoming Money", pattern: /You have received/i },
        { category: "Payments to Code Holders", pattern: /^TxId:/i },
        { category: "Transfers to Mobile Numbers", pattern: /transferred to/i },
        { category: "Bank Deposits", pattern: /bank deposit/i },
        { category: "Airtime Bill Payments", pattern: /payment of [\d, ]* RWF to Airtime/i },
        { category: "Cash Power Bill Payments", pattern: /payment of [\d, ]* RWF to MTN Cash Power./i },
        { category: "Transactions Initiated by Third Parties", pattern: /transaction of [\d, ]* RWF by .*? on your MOMO account/i },
        { category: "Withdrawals from Agents", pattern: /withdrawn [\d, ]* RWF from your mobile money account/i },
        { category: "Bank Transfers", pattern: /transferred to .*?bank account/i },
        { category: "Internet and Voice Bundle Purchases", pattern: /kugura.*?([\d,]+)\sRWF/i }
      ];

      for (const { category, pattern } of patterns) {
        if (pattern.test(body)) return category;
      }
      return "Uncategorized";
    };
    // array list to store unprocessed data
    const unprocessed = [];
    //looping over each transaction message and categoring it using helper fn
    const processedMessages = smsList.map(sms => {
      const body = sms.$.body;
      if (!body) return null;

      // Extracting relevant information from each message using regex
      const txIdMatch = body.match(/TxId:\s?(\d+)/);
      const amountMatch = body.match(/(?:received|payment of|deposit of)\s([\d,]+)\sRWF/i) ||
        body.match(/([\d,]+)\sRWF.*transferred to/i) ||
        body.match(/kugura.*?([\d,]+)\sRWF/i);
      const recipientMatch = body.match(/to\s(.+?)\s(?:has|with|from)/i);
      const dateMatch = body.match(/at\s([\d-]+\s[\d:]+)/);
      const balanceMatch = body.match(/(?:new balance:|NEW BALANCE\s*:)\s?([\d,]+)\sRWF/i);

      const txId = txIdMatch ? txIdMatch[1] : null;
      const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, '')) : null;
      const recipient = recipientMatch ? recipientMatch[1].trim() : null;
      const date = dateMatch ? new Date(dateMatch[1]).toISOString() : null;
      const balance = balanceMatch ? parseInt(balanceMatch[1].replace(/,/g, '')) : null;
      //categorizing the transaction using helper fn
      const category = categorize(body);

      const result = { txId, amount, recipient, date, balance, category };
      // Check if all required fields are present
      if (!txId && !amount && !date) {
        unprocessed.push(body);
        return null;
      }
      // Insert into the database, ignoring duplicates
      db.run(
        `INSERT OR IGNORE INTO transactions (txId, amount, recipient, date, balance, category)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [txId, amount, recipient, date, balance, category]
      );

      return result;
    }).filter(entry => entry !== null);

    // Log unprocessed messages
    if (unprocessed.length > 0) {
      const logContent = unprocessed.map(msg => `UNPROCESSED: ${msg}`).join('\n') + '\n';
      fss.writeFileSync(log_file, logContent, { flag: 'w' });
    }

    res.json({ inserted: processedMessages.length, skipped: unprocessed.length });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to process XML.");
  }
});
/*
creating second API end point to retrieve all transactions from db
*/
app.get('/transactions', (req, res) => {
  db.all("SELECT * FROM transactions", [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Failed to retrieve transactions.");
    }
    res.json(rows);
  });
});
/*
creating third API end point to retrieve transactions by category
example: /transactions/category/Incoming Money
*/
app.get('/transactions/category/:category', (req, res) => {
  const category = req.params.category;
  db.all("SELECT * FROM transactions WHERE category = ?", [category], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Failed to retrieve transactions by category.");
    }
    res.json(rows);
  });
});
/*
creating fourth API end point to retrieve transactions by date
example: /transactions/date/2024-10-01
*/
app.get('/transactions/date/:date', (req, res) => {
  const date = req.params.date;
  db.all("SELECT * FROM transactions WHERE date LIKE ?", [`${date}%`], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Failed to retrieve transactions by date.");
    }
    res.json(rows);
  });
});
/*  creating fifth API end point to retrieve transactions by recipient
example: /transactions/recipient/John Doe
*/
app.get('/transactions/recipient/:recipient', (req, res) => {
  const recipient = req.params.recipient;
  db.all("SELECT * FROM transactions WHERE recipient LIKE ?", [`%${recipient}%`], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Failed to retrieve transactions by recipient.");
    }
    res.json(rows);
  });
});
/*
creating sixth API end point to retrieve transactions by amount
example: /transactions/amount/1000
*/
app.get('/transactions/amount/:amount', (req, res) => {
  const amount = parseInt(req.params.amount);
  if (isNaN(amount)) {
    return res.status(400).send("Invalid amount parameter.");
  }
  db.all("SELECT * FROM transactions WHERE amount = ?", [amount], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Failed to retrieve transactions by amount.");
    }
    res.json(rows);
  });
});
/* creating seventh API end point to retrieve transactions by minimum amount
example: /transactions/min-amount/1000
*/
app.get('/transactions/min-amount/:minAmount', (req, res) => {
  const minAmount = parseInt(req.params.minAmount);
  if (isNaN(minAmount)) {
    return res.status(400).send("Invalid minimum amount parameter.");
  }
  db.all("SELECT * FROM transactions WHERE amount >= ?", [minAmount], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Failed to retrieve transactions by minimum amount.");
    }
    res.json(rows);
  });
});
// creating eighth API end point to retrieve transactions by maximum amount
app.get('/transactions/max-amount/:maxAmount', (req, res) => {
  const maxAmount = parseInt(req.params.maxAmount);
  if (isNaN(maxAmount)) {
    return res.status(400).send("Invalid maximum amount parameter.");
  }
  db.all("SELECT * FROM transactions WHERE amount <= ?", [maxAmount], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Failed to retrieve transactions by maximum amount.");
    }
    res.json(rows);
  });
});
// listening to the server on port 4000
app.listen(5000, () => {
  console.log(`Server running on http://localhost:5000`);
});