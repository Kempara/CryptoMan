// Constants
const INITIAL_BALANCE = 10000;

// State
let balance = INITIAL_BALANCE;
let portfolio = {};
let transactions = [];
let cryptoData = [];
let selectedCrypto = null;
let modalMode = 'buy';

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const balanceElement = document.getElementById('balance');
    const cashBalanceElement = document.getElementById('cashBalance');
    const cryptoValueElement = document.getElementById('cryptoValue');
    const totalAssetsElement = document.getElementById('totalAssets');
    const cryptoTableBody = document.getElementById('cryptoTableBody');
    const holdingsTableBody = document.getElementById('holdingsTableBody');
    const transactionTableBody = document.getElementById('transactionTableBody');
    const emptyPortfolio = document.getElementById('emptyPortfolio');
    const emptyTransactions = document.getElementById('emptyTransactions');
    const cryptoSearch = document.getElementById('cryptoSearch');
    const resetButton = document.getElementById('resetButton');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const tradeModal = document.getElementById('tradeModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalPrice = document.getElementById('modalPrice');
    const tradeAmount = document.getElementById('tradeAmount');
    const tradeTotal = document.getElementById('tradeTotal');
    const maxButton = document.getElementById('maxButton');
    const cancelTradeButton = document.getElementById('cancelTradeButton');
    const confirmTradeButton = document.getElementById('confirmTradeButton');
    const amountError = document.getElementById('amountError');


    init();


    cryptoSearch.addEventListener('input', handleSearch);
    resetButton.addEventListener('click', handleReset);
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            setActiveTab(tab);
        });
    });

    tradeAmount.addEventListener('input', updateTradeTotal);
    maxButton.addEventListener('click', setMaxAmount);
    cancelTradeButton.addEventListener('click', closeTradeModal);
    confirmTradeButton.addEventListener('click', executeTrade);

    async function init() {
        await fetchBalanceFromAPI();
        await fetchTransactionHistory();
        fetchCryptoData();
        updateBalanceDisplay();
        updatePortfolioDisplay();
        updateTransactionDisplay();
    }
    async function fetchBalanceFromAPI() {
        try {
            const res = await fetch('/api/balance');
            const data = await res.json();
            balance = data.balance;
            const rawHoldings = data.holdings;
            portfolio = {};

            Object.entries(rawHoldings).forEach(([symbol, amount]) => {
                const id = symbol.replace('/', '');
                portfolio[id] = {
                    symbol: symbol.split('/')[0],
                    name: symbol.split('/')[0],
                    amount: amount,
                    averagePrice: 0
                };
            });
        } catch (e) {
            console.error("Failed to load balance:", e);
        }
    }

    async function fetchTransactionHistory() {
        try {
            const res = await fetch('/api/history');
            const history = await res.json();
            transactions = history.map(line => {
                const isBuy = line.includes('Bought');
                const symbol = line.split(' ')[2];
                const amount = parseFloat(line.split(' ')[1]);
                const priceMatch = line.match(/at \$([\d.]+)/);
                const totalMatch = line.match(/Total: \$([\d.]+)/);
                const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
                const total = totalMatch ? parseFloat(totalMatch[1]) : price * amount;

                return {
                    id: Date.now().toString() + Math.random(),
                    type: isBuy ? 'buy' : 'sell',
                    cryptoId: symbol.replace('/', ''),
                    symbol: symbol,
                    amount,
                    price,
                    total,
                    timestamp: new Date(),
                    profitLoss: 0
                };
            });
        } catch (e) {
            console.error("Failed to load transaction history:", e);
        }
    }

    function fetchCryptoData() {
        fetch('/api/prices')
            .then(res => res.json())
            .then(prices => {
                cryptoData = Object.entries(prices).map(([symbol, price]) => {
                    return {
                        id: symbol.replace('/', ''),
                        name: symbol.split('/')[0],
                        symbol: symbol.split('/')[0],
                        price: price,
                        priceChange24h: 0,
                        imageUrl: `https://cryptoicons.org/api/icon/${symbol.split('/')[0].toLowerCase()}/30`
                    };
                });
                renderCryptoList();
            })
            .catch(err => {
                console.error('Failed to load real prices, using fallback.', err);

            });

        setInterval(() => {
            updatePrices();
        }, 10000);
    }

    function updatePrices() {
        fetch('/api/prices')
            .then(res => res.json())
            .then(prices => {
                cryptoData.forEach(crypto => {
                    const newPrice = prices[`${crypto.symbol}/USD`] || prices[crypto.symbol];
                    if (newPrice) {
                        const change = ((newPrice - crypto.price) / crypto.price) * 100;
                        crypto.priceChange24h = change;
                        crypto.price = newPrice;
                    }
                });
                renderCryptoList();
                updatePortfolioDisplay();
            });
    }


    function renderCryptoList() {
        if (!cryptoTableBody) return;

        let html = '';

        cryptoData.forEach(crypto => {
            const priceChangeClass = crypto.priceChange24h >= 0 ? 'price-up' : 'price-down';
            const priceChangeIcon = crypto.priceChange24h >= 0 ?
                '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>' :
                '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7 7 7-7"></path><path d="M12 5v14"></path></svg>';

            const holdings = portfolio[crypto.id]?.amount || 0;
            const holdingsValue = holdings * crypto.price;

            html += `
        <tr>
          <td>
            <div class="crypto-name-container">
              <div class="crypto-icon">
                <img src="${crypto.imageUrl}" alt="${crypto.name}" onerror="this.src='https://via.placeholder.com/30'">
              </div>
              <div>
                <div class="crypto-name">${crypto.name}</div>
                <div class="crypto-symbol">${crypto.symbol}</div>
              </div>
            </div>
          </td>
          <td class="text-right">${formatCurrency(crypto.price)}</td>
          <td class="text-right">
            <div class="price-change ${priceChangeClass}">
              ${priceChangeIcon}
              ${Math.abs(crypto.priceChange24h).toFixed(2)}%
            </div>
          </td>
          <td class="text-right">
            ${holdings > 0 ? `
              <div class="holdings-container">
                <div class="holdings-amount">${holdings.toFixed(5)} ${crypto.symbol}</div>
                <div class="holdings-value">${formatCurrency(holdingsValue)}</div>
              </div>
            ` : '<span style="color: var(--muted-foreground)">-</span>'}
          </td>
          <td class="text-center">
            <div class="crypto-actions">
              <button class="button buy-button" data-id="${crypto.id}" data-action="buy">Buy</button>
              <button class="button sell-button" data-id="${crypto.id}" data-action="sell" ${holdings <= 0 ? 'disabled' : ''}>Sell</button>
            </div>
          </td>
        </tr>
      `;
        });

        cryptoTableBody.innerHTML = html;

        document.querySelectorAll('[data-action="buy"]').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.dataset.id;
                openTradeModal('buy', id);
            });
        });

        document.querySelectorAll('[data-action="sell"]').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.dataset.id;
                openTradeModal('sell', id);
            });
        });
    }

    function updateBalanceDisplay() {
        if (balanceElement) balanceElement.textContent = formatCurrency(balance);
        if (cashBalanceElement) cashBalanceElement.textContent = formatCurrency(balance);
    }

    function updatePortfolioDisplay() {
        let portfolioValue = 0;
        Object.entries(portfolio).forEach(([id, holding]) => {
            const crypto = cryptoData.find(c => c.id === id);
            if (crypto) {
                portfolioValue += holding.amount * crypto.price;
            }
        });

        const totalAssets = balance + portfolioValue;

        if (cryptoValueElement) cryptoValueElement.textContent = formatCurrency(portfolioValue);
        if (totalAssetsElement) totalAssetsElement.textContent = formatCurrency(totalAssets);


        if (holdingsTableBody && emptyPortfolio) {
            if (Object.keys(portfolio).length === 0) {
                holdingsTableBody.innerHTML = '';
                emptyPortfolio.style.display = 'block';
                return;
            }

            emptyPortfolio.style.display = 'none';
            let html = '';

            Object.entries(portfolio).forEach(([id, holding]) => {
                const crypto = cryptoData.find(c => c.id === id);
                if (!crypto) return;

                const currentValue = holding.amount * crypto.price;
                const costBasis = holding.amount * holding.averagePrice;
                const profitLoss = currentValue - costBasis;
                const profitLossPercentage = (profitLoss / costBasis) * 100;
                const isProfitable = profitLoss >= 0;

                const plClass = isProfitable ? 'price-up' : 'price-down';
                const plIcon = isProfitable ?
                    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>' :
                    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7 7 7-7"></path><path d="M12 5v14"></path></svg>';

                html += `
          <tr>
            <td>
              <div class="crypto-name-container">
                <div class="crypto-icon">
                  <img src="${crypto.imageUrl}" alt="${crypto.name}" onerror="this.src='https://via.placeholder.com/30'">
                </div>
                <div>
                  <div class="crypto-name">${crypto.symbol}</div>
                  <div class="crypto-symbol">${crypto.name}</div>
                </div>
              </div>
            </td>
            <td class="text-right">
              <div>${holding.amount.toFixed(5)}</div>
              <div class="small" style="color: var(--muted-foreground)">Avg: ${formatCurrency(holding.averagePrice)}</div>
            </td>
            <td class="text-right">
              <div>${formatCurrency(currentValue)}</div>
              <div class="small" style="color: var(--muted-foreground)">${formatCurrency(crypto.price)}</div>
            </td>
            <td class="text-right ${plClass}">
              <div class="price-change">
                ${plIcon}
                ${formatCurrency(Math.abs(profitLoss))}
              </div>
              <div class="small">${isProfitable ? '+' : ''}${profitLossPercentage.toFixed(2)}%</div>
            </td>
          </tr>
        `;
            });

            holdingsTableBody.innerHTML = html;
        }
    }

    function updateTransactionDisplay() {
        if (transactionTableBody && emptyTransactions) {
            if (transactions.length === 0) {
                transactionTableBody.innerHTML = '';
                emptyTransactions.style.display = 'block';
                return;
            }

            emptyTransactions.style.display = 'none';
            let html = '';

            transactions.forEach(transaction => {
                const typeClass = transaction.type === 'buy' ? 'price-up' : 'price-down';

                html += `
          <tr>
            <td>
              <span class="${typeClass}" style="font-weight: 500; text-transform: uppercase;">
                ${transaction.type}
              </span>
            </td>
            <td>${transaction.symbol}</td>
            <td>${transaction.amount.toFixed(5)}</td>
            <td>${formatCurrency(transaction.price)}</td>
            <td>${formatCurrency(transaction.total)}</td>
            <td>${formatDate(transaction.timestamp)}</td>
          </tr>
        `;
            });

            transactionTableBody.innerHTML = html;
        }
    }

    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();

        if (!cryptoTableBody) return;

        const rows = cryptoTableBody.querySelectorAll('tr');

        let visibleCount = 0;

        cryptoData.forEach((crypto, index) => {
            const nameMatch = crypto.name.toLowerCase().includes(searchTerm);
            const symbolMatch = crypto.symbol.toLowerCase().includes(searchTerm);

            if (nameMatch || symbolMatch) {
                rows[index].style.display = '';
                visibleCount++;
            } else {
                rows[index].style.display = 'none';
            }
        });

        if (visibleCount === 0 && searchTerm !== '') {
            cryptoTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center" style="padding: 2.5rem 0; color: var(--muted-foreground)">
            No cryptocurrencies found matching "${searchTerm}"
          </td>
        </tr>
      `;
        }
    }

    function handleReset() {
        fetch('/api/reset', { method: 'POST' })
            .then(res => res.text())
            .then(msg => {
                balance = INITIAL_BALANCE;
                portfolio = {};
                transactions = [];

                updateBalanceDisplay();
                updatePortfolioDisplay();
                updateTransactionDisplay();
                renderCryptoList();

                showToast('Account Reset', msg, 'success');
            })
            .catch(err => {
                showToast('Error', 'Failed to reset account.', 'error');
                console.error(err);
            });
    }


    function setActiveTab(tabName) {
        tabButtons.forEach(button => {
            if (button.dataset.tab === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        tabContents.forEach(content => {
            if (content.id === `${tabName}Tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }

    function openTradeModal(mode, cryptoId) {
        modalMode = mode;
        selectedCrypto = cryptoData.find(crypto => crypto.id === cryptoId);

        if (!selectedCrypto) return;

        modalTitle.textContent = `${mode === 'buy' ? 'Buy' : 'Sell'} ${selectedCrypto.name} (${selectedCrypto.symbol})`;
        modalPrice.textContent = `Current price: ${formatCurrency(selectedCrypto.price)}`;

        tradeAmount.value = '';
        tradeTotal.value = formatCurrency(0);
        amountError.textContent = '';

        if (mode === 'sell') {
            maxButton.style.display = 'block';
            confirmTradeButton.textContent = `Sell ${selectedCrypto.symbol}`;
            confirmTradeButton.className = 'button action-button';
            confirmTradeButton.style.backgroundColor = 'var(--crypto-loss)';
        } else {
            maxButton.style.display = 'none';
            confirmTradeButton.textContent = `Buy ${selectedCrypto.symbol}`;
            confirmTradeButton.className = 'button action-button';
            confirmTradeButton.style.backgroundColor = 'var(--crypto-gain)';
        }

        tradeModal.style.display = 'flex';
    }

    function closeTradeModal() {
        tradeModal.style.display = 'none';
        selectedCrypto = null;
    }

    function updateTradeTotal() {
        if (!selectedCrypto) return;

        const amount = parseFloat(tradeAmount.value) || 0;
        const total = amount * selectedCrypto.price;

        tradeTotal.value = formatCurrency(total);
    }

    function setMaxAmount() {
        if (!selectedCrypto || modalMode !== 'sell') return;

        const maxAmount = portfolio[selectedCrypto.id]?.amount || 0;
        tradeAmount.value = maxAmount;
        updateTradeTotal();
    }

    function executeTrade() {
        if (!selectedCrypto) return;

        const amount = parseFloat(tradeAmount.value);

        if (isNaN(amount) || amount <= 0) {
            amountError.textContent = 'Please enter a valid amount';
            return;
        }

        if (modalMode === 'buy') {
            buy(selectedCrypto, amount);
        } else {
            sell(selectedCrypto, amount);
        }

        closeTradeModal();
    }

    function buy(crypto, amount) {
        const cost = amount * crypto.price;

        fetch(`/api/buy?symbol=${crypto.symbol}/USD&quantity=${amount}`, {
            method: 'POST'
        })
            .then(res => res.text())
            .then(msg => {
                if (msg.toLowerCase().includes("insufficient")) {
                    showToast('Error', msg, 'error');
                    return;
                }

                // Update local state
                balance -= cost;
                const currentAmount = portfolio[crypto.id]?.amount || 0;
                const currentAvgPrice = portfolio[crypto.id]?.averagePrice || 0;

                portfolio[crypto.id] = {
                    symbol: crypto.symbol,
                    name: crypto.name,
                    amount: currentAmount + amount,
                    averagePrice: currentAmount > 0
                        ? (currentAvgPrice * currentAmount + cost) / (currentAmount + amount)
                        : crypto.price
                };

                transactions.unshift({
                    id: Date.now().toString(),
                    type: 'buy',
                    cryptoId: crypto.id,
                    symbol: crypto.symbol,
                    amount,
                    price: crypto.price,
                    total: cost,
                    timestamp: new Date(),
                    profitLoss: 0
                });

                updateBalanceDisplay();
                updatePortfolioDisplay();
                updateTransactionDisplay();
                renderCryptoList();

                showToast('Purchase successful', msg, 'success');
            })
            .catch(err => {
                showToast('Error', 'Failed to process buy request.', 'error');
                console.error(err);
            });
    }


    function sell(crypto, amount) {
        fetch(`/api/sell?symbol=${crypto.symbol}/USD&quantity=${amount}`, {
            method: 'POST'
        })
            .then(res => res.text())
            .then(msg => {
                if (msg.toLowerCase().includes("insufficient")) {
                    showToast('Error', msg, 'error');
                    return;
                }

                const revenue = amount * crypto.price;
                const averagePrice = portfolio[crypto.id].averagePrice;
                const profitLoss = (crypto.price - averagePrice) * amount;

                balance += revenue;

                const updatedAmount = portfolio[crypto.id].amount - amount;
                if (updatedAmount <= 0) {
                    delete portfolio[crypto.id];
                } else {
                    portfolio[crypto.id].amount = updatedAmount;
                }

                transactions.unshift({
                    id: Date.now().toString(),
                    type: 'sell',
                    cryptoId: crypto.id,
                    symbol: crypto.symbol,
                    amount,
                    price: crypto.price,
                    total: revenue,
                    timestamp: new Date(),
                    profitLoss
                });

                updateBalanceDisplay();
                updatePortfolioDisplay();
                updateTransactionDisplay();
                renderCryptoList();

                showToast('Sale successful', msg, 'success');
            })
            .catch(err => {
                showToast('Error', 'Failed to process sell request.', 'error');
                console.error(err);
            });
    }


    function showToast(title, description, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        toast.innerHTML = `
      <div class="toast-title">${title}</div>
      <div class="toast-description">${description}</div>
    `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slide-out 0.3s forwards';
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        }, 5000);
    }

    function formatCurrency(value) {
        return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(date) {
        return new Date(date).toLocaleString();
    }
});
