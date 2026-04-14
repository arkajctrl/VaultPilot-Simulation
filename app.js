// --- GLOBAL STATE & MEMORY ---
let currentUser = null;
let userData = {};
let growthInterval;
let currentDisplayedBalance = 0; 
let balanceAnimationId = null;

const defaultUserData = {
    password: "", 
    balance: 0,
    baseApy: 8.5,
    strategyLevel: 2, 
    allocation: [60, 30, 10],
    colors: ['#0d6efd', '#0dcaf0', '#6c757d'],
    logs: [{ msg: "VaultPilot AI initialized for new user...", isWarning: false }],
    transactions: [],
    history: [] 
};

// --- DOM ELEMENTS ---
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const displayUsername = document.getElementById('display-username');

const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error'); 

const balanceElement = document.getElementById('total-balance');
const growthElement = document.getElementById('growth-rate');
const aiLogsElement = document.getElementById('ai-logs');
const txBody = document.getElementById('tx-body');

const depositBtn = document.getElementById('deposit-btn');
const depositInput = document.getElementById('deposit-amount');
const riskBtn = document.getElementById('risk-btn');
const darkModeBtn = document.getElementById('dark-mode-toggle');

const strategySlider = document.getElementById('strategy-slider');
const strategyBadge = document.getElementById('strategy-badge');
const tabAllocation = document.getElementById('tab-allocation');
const tabPerformance = document.getElementById('tab-performance');
const donutCanvas = document.getElementById('portfolioChart');
const lineCanvas = document.getElementById('performanceChart');

const cryptoTicker = document.getElementById('crypto-ticker');

// NEW: PDF Button
const downloadPdfBtn = document.getElementById('download-pdf-btn');

// --- CHART TABS LOGIC ---
tabAllocation.addEventListener('click', () => {
    tabAllocation.classList.add('active');
    tabPerformance.classList.remove('active');
    donutCanvas.style.opacity = '1';
    donutCanvas.style.pointerEvents = 'auto';
    lineCanvas.style.opacity = '0';
    lineCanvas.style.pointerEvents = 'none';
});

tabPerformance.addEventListener('click', () => {
    tabPerformance.classList.add('active');
    tabAllocation.classList.remove('active');
    donutCanvas.style.opacity = '0';
    donutCanvas.style.pointerEvents = 'none';
    lineCanvas.style.opacity = '1';
    lineCanvas.style.pointerEvents = 'auto';
});

// --- DARK MODE TOGGLE ---
let isDark = true; 
darkModeBtn.addEventListener('click', () => {
    isDark = !isDark;
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    darkModeBtn.innerText = isDark ? '☀️' : '🌙';
    
    portfolioChart.options.plugins.legend.labels.color = isDark ? '#ffffff' : '#666';
    performanceChart.options.scales.x.ticks.color = isDark ? '#666' : '#999';
    performanceChart.options.scales.y.grid.color = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    
    portfolioChart.update();
    performanceChart.update();
});

// --- CHART.JS INITIALIZATION ---
const ctxDonut = donutCanvas.getContext('2d');
let portfolioChart = new Chart(ctxDonut, {
    type: 'doughnut',
    data: {
        labels: ['Lending Pools', 'Liquidity Farming', 'Emergency Reserves'],
        datasets: [{ data: [60, 30, 10], backgroundColor: ['#0d6efd', '#0dcaf0', '#6c757d'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { color: '#ffffff' } } } }
});

const ctxLine = lineCanvas.getContext('2d');
let gradientFill = ctxLine.createLinearGradient(0, 0, 0, 300);
gradientFill.addColorStop(0, 'rgba(13, 110, 253, 0.4)');
gradientFill.addColorStop(1, 'rgba(13, 110, 253, 0.0)');

let performanceChart = new Chart(ctxLine, {
    type: 'line',
    data: {
        labels: [], 
        datasets: [{
            label: 'Portfolio Value (₹)',
            data: [], 
            borderColor: '#0d6efd',
            backgroundColor: gradientFill,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.4 
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#666', maxTicksLimit: 6 } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, border: { dash: [5, 5] }, ticks: { display: false } }
        },
        interaction: { mode: 'index', intersect: false }
    }
});

// --- CORE UTILITIES & MEMORY FUNCTIONS ---
function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function animateBalance(obj, start, end, duration) {
    if (balanceAnimationId) cancelAnimationFrame(balanceAnimationId); 
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOutCurve = 1 - Math.pow(1 - progress, 3); 
        const currentVal = start + (easeOutCurve * (end - start));
        
        obj.innerText = formatCurrency(currentVal);
        
        if (progress < 1) {
            balanceAnimationId = requestAnimationFrame(step);
        } else {
            obj.innerText = formatCurrency(end); 
        }
    };
    balanceAnimationId = requestAnimationFrame(step);
}

function generateMockHistory(currentBalance) {
    let hist = [];
    let val = currentBalance * 0.7; 
    for (let i = 30; i >= 0; i--) {
        hist.push({ day: i === 0 ? 'Today' : `-${i}d`, value: val });
        val += ((currentBalance - val) / i) + (Math.random() * (currentBalance * 0.01) - (currentBalance * 0.005)); 
    }
    hist[hist.length - 1].value = currentBalance; 
    return hist;
}

function saveState() {
    if (!currentUser) return;
    localStorage.setItem('vp_user_' + currentUser, JSON.stringify(userData));
}

function loadState(username, password) {
    const saved = localStorage.getItem('vp_user_' + username);
    if (saved) {
        userData = JSON.parse(saved);
        if(!userData.strategyLevel) userData.strategyLevel = 2;
        if(!userData.history || userData.history.length === 0) userData.history = generateMockHistory(userData.balance);
        if(!userData.password) {
            userData.password = password;
            saveState();
        }
    } else {
        userData = JSON.parse(JSON.stringify(defaultUserData));
        userData.password = password; 
        userData.history = generateMockHistory(0);
        saveState();
    }
}

function updateStrategyUI(level) {
    level = parseInt(level);
    strategySlider.value = level;
    
    if (level === 1) {
        strategyBadge.innerText = "Conservative";
        strategyBadge.className = "badge bg-success bg-opacity-25 text-success";
        strategySlider.classList.remove('degen-mode');
    } else if (level === 2) {
        strategyBadge.innerText = "Balanced";
        strategyBadge.className = "badge bg-primary bg-opacity-25 text-primary";
        strategySlider.classList.remove('degen-mode');
    } else if (level === 3) {
        strategyBadge.innerText = "Degen Mode";
        strategyBadge.className = "badge bg-danger bg-opacity-25 text-danger";
        strategySlider.classList.add('degen-mode');
    }
}

function renderUI() {
    updateStrategyUI(userData.strategyLevel);

    if (currentDisplayedBalance !== userData.balance) {
        const animSpeed = Math.abs(userData.balance - currentDisplayedBalance) > 100 ? 1000 : 400; 
        animateBalance(balanceElement, currentDisplayedBalance, userData.balance, animSpeed);
        currentDisplayedBalance = userData.balance;
    }

    growthElement.innerText = `+${userData.baseApy.toFixed(2)}% simulated APY`;
    if (userData.baseApy > 15) growthElement.className = 'fw-bold mb-4 text-danger';
    else if (userData.baseApy < 5) growthElement.className = 'fw-bold mb-4 text-warning';
    else growthElement.className = 'fw-bold mb-4 text-success';

    portfolioChart.data.datasets[0].data = userData.allocation;
    portfolioChart.data.datasets[0].backgroundColor = userData.colors;
    portfolioChart.update();

    if(userData.history.length > 0) {
        userData.history[userData.history.length - 1].value = userData.balance;
        performanceChart.data.labels = userData.history.map(h => h.day);
        performanceChart.data.datasets[0].data = userData.history.map(h => h.value);
        performanceChart.update();
    }

    aiLogsElement.innerHTML = '';
    userData.logs.forEach(log => {
        const p = document.createElement('p');
        p.className = 'mb-1';
        p.innerText = `> ${log.msg}`;
        if (log.isWarning) p.classList.add('text-warning');
        aiLogsElement.appendChild(p);
    });
    aiLogsElement.scrollTop = aiLogsElement.scrollHeight;

    txBody.innerHTML = '';
    if (userData.transactions.length === 0) {
        txBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3 small">No recent transactions</td></tr>`;
    } else {
        userData.transactions.forEach(tx => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold text-${tx.type === 'Deposit' ? 'success' : 'primary'}">${tx.type}</td>
                <td>${tx.action}</td>
                <td class="text-end"><span class="status-badge bg-${tx.statusClass} bg-opacity-25 text-${tx.statusClass}">${tx.statusText}</span></td>
            `;
            txBody.appendChild(tr); 
        });
    }
}

function addLogAndSave(message, isWarning = false) {
    userData.logs.push({ msg: message, isWarning: isWarning });
    renderUI();
    saveState();
}

function addTxAndSave(type, action, statusClass, statusText) {
    userData.transactions.unshift({ type, action, statusClass, statusText }); 
    renderUI();
    saveState();
}

function simulateGrowth() {
    if (userData.balance > 0) {
        const growthAmount = userData.balance * (userData.baseApy / 100) / 365 / 24 / 60; 
        userData.balance += growthAmount;
        userData.history[userData.history.length - 1].value = userData.balance;
        renderUI(); 
        saveState(); 
    }
}

async function fetchLiveCryptoPrices() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=inr&include_24hr_change=true');
        if (!response.ok) throw new Error("API Rate Limit Reached");
        const data = await response.json();

        const formatCoin = (symbol, dataObj) => {
            const price = dataObj.inr.toLocaleString('en-IN');
            const change = dataObj.inr_24h_change.toFixed(2);
            const colorClass = change >= 0 ? 'text-success' : 'text-danger';
            const arrow = change >= 0 ? '▲' : '▼';
            return `<span class="me-3">${symbol} <span style="color: var(--bs-body-color);">₹${price}</span> <span class="${colorClass} ms-1">${arrow} ${Math.abs(change)}%</span></span>`;
        };

        cryptoTicker.innerHTML = `
            ${formatCoin('BTC', data.bitcoin)}
            <span class="text-muted opacity-50 me-3">|</span>
            ${formatCoin('ETH', data.ethereum)}
            <span class="text-muted opacity-50 me-3">|</span>
            ${formatCoin('SOL', data.solana)}
        `;
    } catch (error) {
        cryptoTicker.innerHTML = `
            <span class="me-3">BTC <span style="color: var(--bs-body-color);">₹54,23,100</span> <span class="text-success ms-1">▲ 2.45%</span></span>
            <span class="text-muted opacity-50 me-3">|</span>
            <span class="me-3">ETH <span style="color: var(--bs-body-color);">₹2,84,500</span> <span class="text-danger ms-1">▼ 1.12%</span></span>
            <span class="text-muted opacity-50 me-3">|</span>
            <span class="me-3">SOL <span style="color: var(--bs-body-color);">₹12,450</span> <span class="text-success ms-1">▲ 5.80%</span></span>
            <span class="text-muted small opacity-75 ms-2">(Simulated Backup Network)</span>
        `;
    }
}

// --- APP FLOW: LOGIN & LOGOUT ---
loginBtn.addEventListener('click', () => {
    const userVal = usernameInput.value.trim().toLowerCase();
    const passVal = passwordInput.value.trim();

    loginError.classList.add('d-none');

    if (userVal === "" || passVal === "") {
        loginError.innerText = "❌ Please enter a username and password.";
        loginError.classList.remove('d-none');
        return;
    }

    const savedAccountData = localStorage.getItem('vp_user_' + userVal);
    if (savedAccountData) {
        const parsedAccount = JSON.parse(savedAccountData);
        if (parsedAccount.password && parsedAccount.password !== passVal) {
            loginError.innerText = "❌ Incorrect password. Please try again.";
            loginError.classList.remove('d-none');
            return; 
        }
    }

    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Decrypting...';

    setTimeout(() => {
        currentUser = userVal;
        displayUsername.innerText = userVal.charAt(0).toUpperCase() + userVal.slice(1);
        
        loadState(currentUser, passVal);
        
        currentDisplayedBalance = 0;
        balanceElement.innerText = formatCurrency(0);
        
        renderUI();
        fetchLiveCryptoPrices();

        strategySlider.removeAttribute('disabled');

        loginView.classList.replace('d-flex', 'd-none');
        appView.classList.remove('d-none');
        loginBtn.innerText = 'Secure Login'; 

        if(userData.logs.length === 1) {
            addLogAndSave("Wallet securely linked. Scanning DeFi networks...", false);
        }

        growthInterval = setInterval(simulateGrowth, 2000);
    }, 1000);
});

usernameInput.addEventListener('input', () => loginError.classList.add('d-none'));
passwordInput.addEventListener('input', () => loginError.classList.add('d-none'));

logoutBtn.addEventListener('click', () => {
    saveState(); 
    clearInterval(growthInterval);
    currentUser = null;
    
    if (balanceAnimationId) cancelAnimationFrame(balanceAnimationId);
    currentDisplayedBalance = 0;
    
    usernameInput.value = '';
    passwordInput.value = '';
    strategySlider.setAttribute('disabled', 'true');
    loginError.classList.add('d-none');

    tabAllocation.click();

    appView.classList.add('d-none');
    loginView.classList.replace('d-none', 'd-flex');
    
    cryptoTicker.innerHTML = '<span class="text-muted">Establishing secure API connection...</span>';
});

// --- APP FLOW: ACTIONS & STRATEGY ---
depositBtn.addEventListener('click', () => {
    const amountToDeposit = parseFloat(depositInput.value);
    if (isNaN(amountToDeposit) || amountToDeposit <= 0) return;

    if (userData.balance === 0) {
        userData.history = generateMockHistory(amountToDeposit);
    }
    
    userData.balance += amountToDeposit;
    const formattedAmount = formatCurrency(amountToDeposit);
    
    addLogAndSave(`User deposited ${formattedAmount}`);
    addTxAndSave("Deposit", `+${formattedAmount} to Smart Contract`, "success", "Completed");
    
    depositInput.value = '';
});

strategySlider.addEventListener('change', (e) => {
    const level = parseInt(e.target.value);
    userData.strategyLevel = level;
    
    let logsToAdd = [];

    if (level === 1) {
        userData.baseApy = 4.5;
        userData.allocation = [80, 10, 10]; 
        logsToAdd.push({ msg: "User updated AI Strategy to: Conservative.", isWarning: false });
        logsToAdd.push({ msg: "Reallocating funds to low-risk Lending Pools.", isWarning: false });
    } else if (level === 2) {
        userData.baseApy = 8.5;
        userData.allocation = [60, 30, 10]; 
        logsToAdd.push({ msg: "User updated AI Strategy to: Balanced.", isWarning: false });
        logsToAdd.push({ msg: "Normalizing asset distribution.", isWarning: false });
    } else if (level === 3) {
        userData.baseApy = 18.5;
        userData.allocation = [10, 85, 5]; 
        logsToAdd.push({ msg: "⚠️ User activated DEGEN MODE.", isWarning: true });
        logsToAdd.push({ msg: "Maximizing yield. Routing funds to highly volatile liquidity farms.", isWarning: true });
    }

    userData.logs.push(...logsToAdd);
    userData.colors = ['#0d6efd', '#0dcaf0', '#6c757d'];
    
    renderUI();
    saveState();
});

riskBtn.addEventListener('click', () => {
    addLogAndSave("⚠️ ALERT: High volatility detected in Liquidity Farming pools!", true);
    addLogAndSave("Contacting Gemini AI for emergency reallocation...", false);
    riskBtn.disabled = true;

    setTimeout(() => {
        addLogAndSave("Volatility managed. Pulled funds to Emergency Reserves.", true);
        
        userData.allocation = [40, 10, 50]; 
        userData.colors = ['#198754', '#dc3545', '#6c757d'];
        userData.baseApy = 2.1; 
        
        addTxAndSave("AI Action", "Emergency Rebalance Triggered", "warning", "Executed");
        updateStrategyUI(1); 
        
        riskBtn.disabled = false;
    }, 1500);
});

// --- NEW: PDF STATEMENT GENERATOR ---
downloadPdfBtn.addEventListener('click', () => {
    if (!currentUser || userData.transactions.length === 0) {
        addLogAndSave("❌ PDF Error: No transactions to generate.", true);
        return;
    }

    addLogAndSave("Generating encrypted PDF statement...");

    // Initialize jsPDF from the CDN
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Build Document Header
    doc.setFontSize(22);
    doc.setTextColor(13, 110, 253); 
    doc.text("VaultPilot.", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("AI-Powered Financial Autopilot", 14, 28);
    doc.text(`Account Holder: ${displayUsername.innerText}`, 14, 38);
    doc.text(`Statement Date: ${new Date().toLocaleDateString()}`, 14, 44);
    doc.text(`Closing Balance: ${formatCurrency(userData.balance)}`, 14, 50);

    // Format Table Data
    const tableColumn = ["Type", "Action", "Status"];
    const tableRows = [];

    userData.transactions.forEach(tx => {
        tableRows.push([tx.type, tx.action, tx.statusText]);
    });

    // Draw the Table using the AutoTable plugin
    doc.autoTable({
        startY: 60,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] }, // Dark slate to match your UI
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 60 }
    });

    // Trigger File Download
    const fileName = `VaultPilot_Statement_${currentUser}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    addLogAndSave("✅ Statement downloaded successfully.");
});