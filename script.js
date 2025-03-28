// Google Apps Script API URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyD2CtNFaNCwzE3EUyU3jkWKhwHKAHjF868Z649AkxCO53m8EAjCLdeUEnbv-WLSyk/exec';

// Load existing data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPunterData();
    updateOverallProfit();

    const addPunterButton = document.getElementById('add-punter');
    addPunterButton.addEventListener('click', () => {
        const name = prompt('Enter punter name:');
        if (name) addPunter(name);
    });

    const viewRecordsButton = document.getElementById('view-records');
    viewRecordsButton.addEventListener('click', showRecords);

    const closeModal = document.getElementById('close-modal');
    closeModal.addEventListener('click', () => {
        document.getElementById('records-modal').style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('records-modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Export data
    const exportButton = document.getElementById('export-data');
    exportButton.addEventListener('click', async () => {
        const punterData = await loadPunterDataFromSheets();
        const dataStr = JSON.stringify(punterData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'betting-assistant-data.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import data
    const importButton = document.getElementById('import-button');
    const importInput = document.getElementById('import-data');
    importButton.addEventListener('click', () => {
        importInput.click();
    });
    importInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    await savePunterDataToSheets(importedData);
                    alert('Data imported successfully! Reloading page...');
                    location.reload();
                } catch (err) {
                    alert('Error importing data: Invalid JSON file.');
                }
            };
            reader.readAsText(file);
        }
    });
});

async function loadPunterDataFromSheets() {
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?method=get`);
        if (!response.ok) throw new Error('Failed to fetch data from Apps Script');
        const punterData = await response.json();
        return punterData;
    } catch (err) {
        console.error("Error loading data from Google Sheets:", err);
        return {};
    }
}

async function savePunterDataToSheets(punterData) {
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?method=set`, {
            method: 'POST',
            body: JSON.stringify(punterData),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Failed to save data to Apps Script');
    } catch (err) {
        console.error("Error saving data to Google Sheets:", err);
    }
}

async function loadPunterData() {
    const punterData = await loadPunterDataFromSheets();
    for (const name in punterData) {
        addPunter(name, punterData[name].bets || []);
    }
}

async function savePunterData(name, bets) {
    const punterData = await loadPunterDataFromSheets();
    punterData[name] = punterData[name] || { bets: [], history: [] };
    punterData[name].bets = bets;
    await savePunterDataToSheets(punterData);
}

async function savePunterHistory(name, profitLoss) {
    const punterData = await loadPunterDataFromSheets();
    punterData[name] = punterData[name] || { bets: [], history: [] };
    punterData[name].history.push({
        timestamp: new Date().toISOString(),
        profitLoss: profitLoss
    });
    punterData[name].bets = [];
    await savePunterDataToSheets(punterData);
}

async function removePunterData(name) {
    const punterData = await loadPunterDataFromSheets();
    if (punterData[name]) {
        punterData[name].bets = [];
        await savePunterDataToSheets(punterData);
    }
}

function addPunter(name, existingBets = []) {
    const container = document.getElementById('punters-container');
    const punterDiv = document.createElement('div');
    punterDiv.classList.add('punter-section');
    punterDiv.setAttribute('data-punter', name);

    punterDiv.innerHTML = `
        <div style="display: flex; align-items: center;">
            <h2 style="margin: 0;">${name}</h2>
            <button class="close-punter">Close</button>
        </div>
        <div class="profit-loss">Profit/Loss: $0.00</div>
        <table class="punter-table">
            <thead>
                <tr>
                    <th>Bet #</th>
                    <th>Stake</th>
                    <th>Game</th>
                    <th>Odds</th>
                    <th>Outcome</th>
                    <th>Next Stake</th>
                    <th>Loss Streak</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody id="bets-${name}">
            </tbody>
        </table>
    `;
    container.appendChild(punterDiv);

    const tbody = punterDiv.querySelector(`#bets-${name}`);
    if (existingBets.length > 0) {
        existingBets.forEach((bet, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><input type="number" class="stake" value="${bet.stake}" min="1" ${bet.status === 'Stopped' ? 'disabled' : ''}></td>
                <td><input type="text" class="game" value="${bet.game || ''}" ${bet.status === 'Stopped' ? 'disabled' : ''}></td>
                <td><input type="number" class="odds" value="${bet.odds || ''}" step="0.01" min="1" ${bet.status === 'Stopped' ? 'disabled' : ''}></td>
                <td>
                    <select class="outcome" ${bet.status === 'Stopped' ? 'disabled' : ''}>
                        <option value="">--</option>
                        <option value="W" ${bet.outcome === 'W' ? 'selected' : ''}>W (Big Win)</option>
                        <option value="w" ${bet.outcome === 'w' ? 'selected' : ''}>w (Small Win)</option>
                        <option value="D" ${bet.outcome === 'D' ? 'selected' : ''}>D (Draw)</option>
                        <option value="L" ${bet.outcome === 'L' ? 'selected' : ''}>L (Loss)</option>
                    </select>
                </td>
                <td>${bet.nextStake !== '-' ? bet.nextStake.toFixed(2) : '-'}</td>
                <td>${bet.lossStreak}</td>
                <td>${bet.status}</td>
            `;
            if (bet.outcome === 'W' || bet.outcome === 'w') row.classList.add('win');
            if (bet.outcome === 'L') row.classList.add('loss');
            if (bet.status === 'Stopped') row.classList.add('stopped');
            tbody.appendChild(row);
            if (bet.status !== 'Stopped') {
                row.querySelector('.outcome').addEventListener('change', (e) => updateBet(e, name));
            }
        });
    } else {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>1</td>
            <td><input type="number" class="stake" value="10" min="1"></td>
            <td><input type="text" class="game" placeholder="Enter game"></td>
            <td><input type="number" class="odds" placeholder="Enter odds" step="0.01" min="1"></td>
            <td>
                <select class="outcome">
                    <option value="">--</option>
                    <option value="W">W (Big Win)</option>
                    <option value="w">w (Small Win)</option>
                    <option value="D">D (Draw)</option>
                    <option value="L">L (Loss)</option>
                </select>
            </td>
            <td>-</td>
            <td>0</td>
            <td>Active</td>
        `;
        tbody.appendChild(row);
        row.querySelector('.outcome').addEventListener('change', (e) => updateBet(e, name));
    }

    updateProfitLoss(name);

    punterDiv.querySelector('.close-punter').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to close ${name}'s record?`)) {
            const profitLoss = parseFloat(punterDiv.querySelector('.profit-loss').textContent.replace('Profit/Loss: $', ''));
            await savePunterHistory(name, profitLoss);
            punterDiv.remove();
            await removePunterData(name);
            updateOverallProfit();
        }
    });
}

async function updateBet(event, punterName) {
    const row = event.target.closest('tr');
    const outcome = event.target.value;
    const stake = parseFloat(row.querySelector('.stake').value);
    const odds = parseFloat(row.querySelector('.odds').value) || 0;
    let nextStake = 0;
    let lossStreak = parseInt(row.cells[6].textContent);
    let status = 'Active';

    if (outcome === 'W') {
        nextStake = stake * 1.5;
        lossStreak = 0;
        row.classList.add('win');
    } else if (outcome === 'w') {
        nextStake = stake * 1.25;
        lossStreak = 0;
        row.classList.add('win');
    } else if (outcome === 'D') {
        nextStake = stake;
        lossStreak = 0;
    } else if (outcome === 'L') {
        nextStake = stake * 2;
        lossStreak += 1;
        row.classList.add('loss');
    }

    row.cells[5].textContent = nextStake.toFixed(2);
    row.cells[6].textContent = lossStreak;

    if (lossStreak >= 3) {
        status = 'Stopped';
        row.classList.add('stopped');
        row.cells[5].textContent = '-';
    }
    row.cells[7].textContent = status;

    const game = row.querySelector('.game').value;
    const betData = {
        stake: stake,
        game: game,
        odds: odds,
        outcome: outcome,
        nextStake: row.cells[5].textContent,
        lossStreak: lossStreak,
        status: status
    };
    const tbody = document.getElementById(`bets-${punterName}`);
    const bets = Array.from(tbody.querySelectorAll('tr')).map(row => {
        return {
            stake: parseFloat(row.querySelector('.stake').value),
            game: row.querySelector('.game').value,
            odds: parseFloat(row.querySelector('.odds').value) || 0,
            outcome: row.querySelector('.outcome').value,
            nextStake: row.cells[5].textContent,
            lossStreak: parseInt(row.cells[6].textContent),
            status: row.cells[7].textContent
        };
    });
    await savePunterData(punterName, bets);

    updateProfitLoss(punterName);
    updateOverallProfit();

    if (status === 'Active') {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${parseInt(row.cells[0].textContent) + 1}</td>
            <td><input type="number" class="stake" value="${nextStake.toFixed(2)}" min="1"></td>
            <td><input type="text" class="game" placeholder="Enter game"></td>
            <td><input type="number" class="odds" placeholder="Enter odds" step="0.01" min="1"></td>
            <td>
                <select class="outcome">
                    <option value="">--</option>
                    <option value="W">W (Big Win)</option>
                    <option value="w">w (Small Win)</option>
                    <option value="D">D (Draw)</option>
                    <option value="L">L (Loss)</option>
                </select>
            </td>
            <td>-</td>
            <td>${lossStreak}</td>
            <td>Active</td>
        `;
        tbody.appendChild(newRow);
        newRow.querySelector('.outcome').addEventListener('change', (e) => updateBet(e, punterName));
    }
}

function updateProfitLoss(punterName) {
    const tbody = document.getElementById(`bets-${punterName}`);
    if (!tbody) return;

    let totalProfitLoss = 0;
    const bets = Array.from(tbody.querySelectorAll('tr'));
    bets.forEach(row => {
        const stake = parseFloat(row.querySelector('.stake').value);
        const odds = parseFloat(row.querySelector('.odds').value) || 0;
        const outcome = row.querySelector('.outcome').value;

        if (outcome === 'W') {
            totalProfitLoss += stake * (odds - 1); // Full profit for big win
        } else if (outcome === 'w') {
            totalProfitLoss += (stake * (odds - 1)) / 2; // Half profit for small win
        } else if (outcome === 'L') {
            totalProfitLoss -= stake;
        }
    });

    const punterDiv = tbody.closest('.punter-section');
    const profitLossDiv = punterDiv.querySelector('.profit-loss');
    profitLossDiv.textContent = `Profit/Loss: $${totalProfitLoss.toFixed(2)}`;
    profitLossDiv.style.color = totalProfitLoss >= 0 ? 'green' : 'red';
}

async function updateOverallProfit() {
    const punterData = await loadPunterDataFromSheets();
    let overallProfit = 0;

    for (const name in punterData) {
        const bets = punterData[name].bets || [];
        bets.forEach(bet => {
            if (bet.outcome === 'W') {
                overallProfit += bet.stake * (bet.odds - 1);
            } else if (bet.outcome === 'w') {
                overallProfit += (bet.stake * (odds - 1)) / 2;
            } else if (bet.outcome === 'L') {
                overallProfit -= bet.stake;
            }
        });

        const history = punterData[name].history || [];
        history.forEach(record => {
            overallProfit += record.profitLoss;
        });
    }

    const overallProfitDiv = document.getElementById('overall-profit');
    overallProfitDiv.textContent = `Overall Profit/Loss: $${overallProfit.toFixed(2)}`;
    overallProfitDiv.style.color = overallProfit >= 0 ? 'green' : 'red';
}

async function showRecords() {
    const punterData = await loadPunterDataFromSheets();
    const recordsContent = document.getElementById('records-content');
    let html = '<table><thead><tr><th>Punter</th><th>Date</th><th>Profit/Loss</th></tr></thead><tbody>';

    for (const name in punterData) {
        const history = punterData[name].history || [];
        history.forEach(record => {
            const date = new Date(record.timestamp).toLocaleString();
            html += `
                <tr>
                    <td>${name}</td>
                    <td>${date}</td>
                    <td style="color: ${record.profitLoss >= 0 ? 'green' : 'red'}">$${record.profitLoss.toFixed(2)}</td>
                </tr>
            `;
        });
    }

    html += '</tbody></table>';
    recordsContent.innerHTML = html;
    document.getElementById('records-modal').style.display = 'block';
}
