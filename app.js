let balance = 10000.00;
let baseApy = 8.5; 
let growthInterval;

const balanceElement = document.getElementById('total-balance');
const growthElement = document.getElementById('growth-rate');
const aiLogsElement = document.getElementById('ai-logs');
const depositBtn = document.getElementById('deposit-btn');
const depositInput = document.getElementById('deposit-amount');
const riskBtn = document.getElementById('risk-btn');
const darkModeBtn = document.getElementById('dark-mode-toggle');

// State Elements
const connectOverlay = document.getElementById('wallet-overlay');
const connectBtn = document.getElementById('connect-wallet-btn');
const appContent = document.getElementById('app-content');
const chartOverlay = document.getElementById('chart-overlay');
const txBody = document.getElementById('tx-body');

// --- DARK MODE TOGGLE ---
let isDark = true; 

darkModeBtn.addEventListener('click', () => {
    isDark = !isDark;
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    darkModeBtn.innerText = isDark ? '☀️' : '🌙';
    portfolioChart.options.plugins.legend.labels.color = isDark ? '#ffffff' : '#666';
    portfolioChart.update();
});

// --- CHART.JS INITIALIZATION ---
const ctx = document.getElementById('portfolioChart').getContext('2d');
let portfolioChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
        labels: ['Lending Pools', 'Liquidity Farming', 'Emergency Reserves'],
        datasets: [{
            data: [60, 30, 10], 
            backgroundColor: ['#0d6efd', '#0dcaf0', '#6c757d'],
            borderWidth: 0
        }]
    },
    options: {
        responsive: true,
        cutout: '75%', 
        plugins: {
            legend: { position: 'bottom', labels: { color: '#ffffff' } }
        }
    }
});

// --- UTILITY FUNCTIONS ---
function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addLog(message, isWarning = false) {
    const p = document.createElement('p');
    p.className = 'mb-1';
    p.innerText = `> ${message}`;
    if (isWarning) p.classList.add('text-warning');
    aiLogsElement.appendChild(p);
    aiLogsElement.scrollTop = aiLogsElement.scrollHeight; 
}

function addTxRow(type, action, statusClass, statusText) {
    if (txBody.innerHTML.includes("No recent transactions")) {
        txBody.innerHTML = '';
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="fw-bold text-${type === 'Deposit' ? 'success' : 'primary'}">${type}</td>
        <td>${action}</td>
        <td class="text-end"><span class="status-badge bg-${statusClass} bg-opacity-25 text-${statusClass}">${statusText}</span></td>
    `;
    txBody.prepend(tr);
}

function simulateGrowth() {
    const growthAmount = balance * (baseApy / 100) / 365 / 24 / 60; 
    balance += growthAmount;
    balanceElement.innerText = formatCurrency(balance);
}

// --- CORE LOGIC & FLOW ---

// 1. Wallet Connection Flow
connectBtn.addEventListener('click', () => {
    connectBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Connecting...';
    
    setTimeout(() => {
        // Unlock UI & Destroy the invisible shield
        connectOverlay.style.opacity = '0';
        connectOverlay.style.pointerEvents = 'none';
        
        appContent.classList.remove('blurred-state');
        appContent.style.pointerEvents = 'auto'; 
        
        chartOverlay.style.filter = 'none';
        chartOverlay.style.opacity = '1';
        
        // UNLOCK ALL BUTTONS AND INPUT
        depositBtn.removeAttribute('disabled');
        depositInput.removeAttribute('disabled');
        riskBtn.removeAttribute('disabled');

        // Nuke the overlay entirely
        setTimeout(() => connectOverlay.remove(), 400);

        // Initialize Data
        aiLogsElement.innerHTML = ''; 
        addLog("VaultPilot AI initialized...");
        addLog("Wallet connected: 0x7F8...3aB9");
        addLog("Scanning DeFi liquidity pools...");
        
        balanceElement.innerText = formatCurrency(balance);
        growthElement.innerText = `+${baseApy.toFixed(2)}% simulated APY`;
        
        growthInterval = setInterval(simulateGrowth, 2000);
    }, 1500); 
});

// 2. Dynamic Deposit Flow
depositBtn.addEventListener('click', () => {
    // Read and parse the input value
    const amountToDeposit = parseFloat(depositInput.value);

    // Validate the input
    if (isNaN(amountToDeposit) || amountToDeposit <= 0) {
        addLog("❌ Deposit failed: Please enter a valid amount.", true);
        return;
    }

    balance += amountToDeposit;
    balanceElement.innerText = formatCurrency(balance);
    
    // Format for logs
    const formattedAmount = formatCurrency(amountToDeposit);
    
    addLog(`User deposited ${formattedAmount}`);
    addTxRow("Deposit", `+${formattedAmount} to Smart Contract`, "success", "Completed");
    
    // Optional: Clear the input after deposit
    depositInput.value = '';
});

// 3. AI Risk Mitigation Flow
riskBtn.addEventListener('click', async () => {
    addLog("⚠️ ALERT: High volatility detected in Liquidity Farming pools!", true);
    addLog("Contacting Gemini AI for emergency reallocation...", false);
    riskBtn.disabled = true;

    try {
        const response = await fetch('http://localhost:3000/api/rebalance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentMarketState: "Massive drop in liquidity and high volatility in farming pools." })
        });

        if (!response.ok) throw new Error("Backend connection failed");

        const aiDecision = await response.json();
        addLog(aiDecision.explanation, true);
        
        portfolioChart.data.datasets[0].data = [aiDecision.lending_pool, aiDecision.liquidity_farming, aiDecision.emergency_reserves];
        portfolioChart.data.datasets[0].backgroundColor = ['#198754', '#dc3545', '#6c757d'];
        portfolioChart.update();

        baseApy = 4.2; 
        growthElement.innerText = `+${baseApy.toFixed(2)}% simulated APY`;
        growthElement.classList.replace('text-success', 'text-warning');

        addTxRow("AI Action", "Emergency Rebalance Triggered", "warning", "Executed");

    } catch (error) {
        addLog("❌ API Error: Could not reach Gemini.", true);
        addTxRow("AI Action", "Rebalance Failed (Node Error)", "danger", "Failed");
        console.error(error);
    } finally {
        riskBtn.disabled = false;
    }
});