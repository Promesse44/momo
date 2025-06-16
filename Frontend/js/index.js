// Global variables
let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const itemsPerPage = 10;
let charts = {};

// API base URL
const API_BASE = 'http://localhost:5000';

// Load data from XML
async function loadData() {
  try {
    const response = await fetch(`${API_BASE}/load-data`);
    const result = await response.json();
    alert(`Data loaded successfully! Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
    await refreshDashboard();
  } catch (error) {
    console.error('Error loading data:', error);
    alert('Error loading data. Please check if the server is running.');
  }
}

// Fetch all transactions
async function fetchTransactions() {
  try {
    const response = await fetch(`${API_BASE}/transactions`);
    allTransactions = await response.json();
    filteredTransactions = [...allTransactions];
    return allTransactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

// Update statistics
function updateStatistics(transactions) {
  const total = transactions.length;
  const totalVolume = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const avgTransaction = total > 0 ? totalVolume / total : 0;
  const maxTransaction = Math.max(...transactions.map(t => t.amount || 0));

  document.getElementById('totalTransactions').textContent = total.toLocaleString();
  document.getElementById('totalVolume').textContent = totalVolume.toLocaleString();
  document.getElementById('avgTransaction').textContent = Math.round(avgTransaction).toLocaleString();
  document.getElementById('maxTransaction').textContent = maxTransaction.toLocaleString();
}

// Create category distribution chart
function createCategoryChart(transactions) {
  const categoryData = {};
  transactions.forEach(t => {
    const category = t.category || 'Uncategorized';
    categoryData[category] = (categoryData[category] || 0) + 1;
  });

  const ctx = document.getElementById('categoryChart').getContext('2d');
  if (charts.category) charts.category.destroy();

  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categoryData),
      datasets: [{
        data: Object.values(categoryData),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
          '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
          '#4BC0C0', '#FF6384'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true
          }
        }
      }
    }
  });
}

// Create monthly volume chart
function createMonthlyChart(transactions) {
  const monthlyData = {};
  transactions.forEach(t => {
    if (t.date) {
      const month = t.date.substring(0, 7); // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + (t.amount || 0);
    }
  });

  const sortedMonths = Object.keys(monthlyData).sort();
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (charts.monthly) charts.monthly.destroy();

  charts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedMonths,
      datasets: [{
        label: 'Transaction Volume (RWF)',
        data: sortedMonths.map(month => monthlyData[month]),
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value.toLocaleString() + ' RWF';
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// Create daily trend chart
function createDailyChart(transactions) {
  const dailyData = {};
  transactions.forEach(t => {
    if (t.date) {
      const date = t.date.split('T')[0]; // YYYY-MM-DD
      dailyData[date] = (dailyData[date] || 0) + 1;
    }
  });

  const sortedDates = Object.keys(dailyData).sort().slice(-30); // Last 30 days
  const ctx = document.getElementById('dailyChart').getContext('2d');
  if (charts.daily) charts.daily.destroy();

  charts.daily = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: 'Daily Transactions',
        data: sortedDates.map(date => dailyData[date] || 0),
        borderColor: 'rgba(118, 75, 162, 1)',
        backgroundColor: 'rgba(118, 75, 162, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(118, 75, 162, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// Create amount distribution chart
function createAmountChart(transactions) {
  const amounts = transactions.map(t => t.amount || 0).filter(a => a > 0);
  const ranges = [0, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
  const distribution = new Array(ranges.length).fill(0);

  amounts.forEach(amount => {
    for (let i = 0; i < ranges.length; i++) {
      if (amount <= ranges[i] || i === ranges.length - 1) {
        distribution[i]++;
        break;
      }
    }
  });

  const ctx = document.getElementById('amountChart').getContext('2d');
  if (charts.amount) charts.amount.destroy();

  charts.amount = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ranges.map((r, i) => i === ranges.length - 1 ? `>${ranges[i - 1]}` : `${ranges[i - 1]}-${r}`),
      datasets: [{
        label: 'Number of Transactions',
        data: distribution,
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Apply filters
function applyFilters() {
  const category = document.getElementById('categoryFilter').value;
  const date = document.getElementById('dateFilter').value;
  const minAmount = parseFloat(document.getElementById('minAmount').value) || 0;
  const maxAmount = parseFloat(document.getElementById('maxAmount').value) || Infinity;
  const recipient = document.getElementById('recipientFilter').value.toLowerCase();

  filteredTransactions = allTransactions.filter(t => {
    const matchCategory = !category || t.category === category;
    const matchDate = !date || t.date.startsWith(date);
    const matchAmount = t.amount >= minAmount && (!maxAmount || t.amount <= maxAmount);
    const matchRecipient = !recipient || (t.recipient || '').toLowerCase().includes(recipient);

    return matchCategory && matchDate && matchAmount && matchRecipient;
  });

  currentPage = 1;
  updateDashboard();
}

// Clear filters
function clearFilters() {
  document.getElementById('categoryFilter').value = '';
  document.getElementById('dateFilter').value = '';
  document.getElementById('minAmount').value = '';
  document.getElementById('maxAmount').value = '';
  document.getElementById('recipientFilter').value = '';
  document.getElementById('searchInput').value = '';

  filteredTransactions = [...allTransactions];
  currentPage = 1;
  updateDashboard();
}

// Update dashboard
function updateDashboard() {
  updateStatistics(filteredTransactions);
  createCategoryChart(filteredTransactions);
  createMonthlyChart(filteredTransactions);
  createDailyChart(filteredTransactions);
  createAmountChart(filteredTransactions);
  updateTransactionTable();
}

// Update transaction table
function updateTransactionTable() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageTransactions = filteredTransactions.slice(startIndex, endIndex);

  const tbody = document.getElementById('transactionsBody');
  tbody.innerHTML = pageTransactions.map(t => `
                <tr onclick="showTransactionDetails(${t.id})">
                    <td>${t.id}</td>
                    <td>${new Date(t.date).toLocaleString()}</td>
                    <td><span class="category-badge category-${getCategoryClass(t.category)}">${t.category}</span></td>
                    <td class="amount ${t.amount >= 0 ? 'positive' : 'negative'}">${t.amount.toLocaleString()} RWF</td>
                    <td>${t.recipient || '-'}</td>
                    <td>${t.balance.toLocaleString()} RWF</td>
                    <td>
                        <button class="btn btn-primary" onclick="event.stopPropagation(); showTransactionDetails(${t.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

  updatePagination();
}

// Update pagination
function updatePagination() {
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const pagination = document.getElementById('pagination');

  let paginationHTML = `
                <button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      paginationHTML += `
                        <button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                            ${i}
                        </button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      paginationHTML += '<span>...</span>';
    }
  }

  paginationHTML += `
                <button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>`;

  pagination.innerHTML = paginationHTML;
}

// Go to specific page
function goToPage(page) {
  currentPage = page;
  updateTransactionTable();
}

// Show transaction details
function showTransactionDetails(id) {
  const transaction = allTransactions.find(t => t.id === id);
  if (!transaction) return;

  const modal = document.getElementById('transactionModal');
  const details = document.getElementById('transactionDetails');

  details.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Transaction ID</label>
                        <span>${transaction.id}</span>
                    </div>
                    <div class="detail-item">
                        <label>Date & Time</label>
                        <span>${new Date(transaction.date).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Category</label>
                        <span>${transaction.category}</span>
                    </div>
                    <div class="detail-item">
                        <label>Amount</label>
                        <span class="${transaction.amount >= 0 ? 'positive' : 'negative'}">
                            ${transaction.amount.toLocaleString()} RWF
                        </span>
                    </div>
                    <div class="detail-item">
                        <label>Recipient</label>
                        <span>${transaction.recipient || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Balance After</label>
                        <span>${transaction.balance.toLocaleString()} RWF</span>
                    </div>
                </div>
                <div class="raw-message">
                    <pre>${JSON.stringify(transaction, null, 2)}</pre>
                </div>`;

  modal.style.display = 'block';
}

// Helper function to get category class
function getCategoryClass(category) {
  const categoryMap = {
    'Incoming Money': 'incoming',
    'Payments to Code Holders': 'payment',
    'Transfers to Mobile Numbers': 'transfer',
    'Bank Deposits': 'bank',
    'Airtime Bill Payments': 'airtime',
    'Withdrawals from Agents': 'withdrawal',
    'Internet and Voice Bundle Purchases': 'bundle'
  };
  return categoryMap[category] || 'default';
}

// Close modal when clicking the X or outside the modal
document.querySelector('.close').onclick = function () {
  document.getElementById('transactionModal').style.display = 'none';
}

window.onclick = function (event) {
  const modal = document.getElementById('transactionModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
}

// Initial load
async function refreshDashboard() {
  await fetchTransactions();
  updateDashboard();
}

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', refreshDashboard);
