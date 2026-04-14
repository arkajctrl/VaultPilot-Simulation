// VaultPilot - AI Frontend Linked to Gemini Backend

let balance = 10000.00;
let baseApy = 8.5; 

const balanceElement = document.getElementById('total-balance');
const growthElement = document.getElementById('growth-rate');
const aiLogsElement = document.getElementById('ai-logs');
const depositBtn = document.getElementById('deposit-btn');
const riskBtn = document.getElementById('risk-btn');
const darkModeBtn = document.getElementById('dark-mode-toggle');

// --- DARK MODE TOGGLE ---
let isDark = false;

darkModeBtn.addEventListener('click', () => {
    isDark = !isDark;
    
    // 1. Tell Bootstrap to switch themes
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    
    // 2. Change the button icon
    darkModeBtn.innerText = isDark ? '☀️' : '🌙';

    // 3. Update Chart.js text colors so they stay readable
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
            data: [60, 30, 10], // Starting allocation
            backgroundColor: ['#0d6efd', '#0dcaf0', '#6c757d'], // Blue, Light Blue, Grey
            borderWidth: 0
        }]
    },
    options: {
        responsive: true,
        cutout: '75%', // Makes the ring thinner and more modern
        plugins: {
            legend: { 
                position: 'bottom',
                labels: {
                    color: '#666' // Default light mode color
                }
            }
        }
    }
});

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

function simulateGrowth() {
    const growthAmount = balance * (baseApy / 100) / 365 / 24 / 60; 
    balance += growthAmount;
    balanceElement.innerText = formatCurrency(balance);
}

balanceElement.innerText = formatCurrency(balance);
growthElement.innerText = `+${baseApy.toFixed(2)}% simulated APY`;
setInterval(simulateGrowth, 2000);

depositBtn.addEventListener('click', () => {
    balance += 1000;
    balanceElement.innerText = formatCurrency(balance);
    addLog("User deposited ₹1,000.00");
    addLog("Funds successfully routed to optimal pools.");
});

// --- THE REAL AI CONNECTION ---
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
        
        // --- UPDATE THE CHART SMOOTHLY ---
        // 1. Change the numbers
        portfolioChart.data.datasets[0].data = [
            aiDecision.lending_pool, 
            aiDecision.liquidity_farming, 
            aiDecision.emergency_reserves
        ];
        
        // 2. Change the colors to show "Safety Mode" (Green, Red, Grey)
        portfolioChart.data.datasets[0].backgroundColor = ['#198754', '#dc3545', '#6c757d'];
        
        // 3. Trigger the animation
        portfolioChart.update();

        // Lower the APY safely
        baseApy = 4.2; 
        growthElement.innerText = `+${baseApy.toFixed(2)}% simulated APY`;
        growthElement.classList.replace('text-success', 'text-warning');

    } catch (error) {
        addLog("❌ API Error: Could not reach Gemini.", true);
        console.error(error);
    } finally {
        riskBtn.disabled = false;
    }
});