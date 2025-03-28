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
    exportButton.addEventListener('click', () => {
        const punterData = loadPunterDataFromStorage();
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
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    savePunterDataToStorage(importedData);
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

function loadPunterDataFromStorage() {
    const data = localStorage.getItem('punterData');
    return data ? JSON.parse(data) : {};
}

function savePunterDataToStorage(punterData) {
    localStorage.setItem('punterData', JSON.stringify(punterData));
}

function loadPunterData() {
    const punterData = loadPunterDataFromStorage();
    for (const name in punterData) {
        addPunter(name, punterData[name].bets || []);
    }
}

function savePunterData(name, bets) {
    const punterData = loadPunterDataFromStorage();
    punterData[name] = punterData[name] || { bets: [], history: [] };
    punterData[name].bets = bets;
    savePunterDataToStorage(punterData);
}

function savePunterHistory(name, profitLoss) {
    const punterData = loadPunterDataFromStorage();
    punterData[name] = punterData[name] || { bets: [], history: [] };
    if (!punterData[name].history) punterData[name].history = []; // Ensure history array exists
    punterData[name].history.push({
        timestamp: new Date().toISOString(),
        profitLoss: profitLoss
    });
    punterData[name].bets = []; // Clear bets after saving to history
    savePunterDataToStorage(punterData);
}

function removePunterData(name) {
    const punterData = loadPunterDataFromStorage();
    if (punterData[name]) {
        punterData[name].bets = []; // Clear bets
        savePunterDataToStorage(punterData);
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
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="bets-${name}">
            </tbody>
        </table>
        <button class="next-bet" data-punter="${name}">Next Bet</button>
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
                <td><button class="delete-bet" ${bet.status === 'Stopped' ? 'disabled' : ''}>Delete</button></td>
            `;
            if (bet.outcome === 'W' || bet.outcome === 'w') row.classList.add('win');
            if (bet.outcome === 'L') row.classList.add('loss');
            if (bet.status === 'Stopped') row.classList.add('stopped');
            tbody.appendChild(row);
            if (bet.status !== 'Stopped') {
                row.querySelector('.outcome').addEventListener('change', (e) => updateBet(e, name));
                row.querySelector('.delete-bet').addEventListener('click', () => deleteBet(name, index));
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
            <td><button class="delete-bet">Delete</button></td>
        `;
        tbody.appendChild(row);
        row.querySelector('.outcome').addEventListener('change', (e) => updateBet(e, name));
        row.querySelector('.delete-bet').addEventListener('click', () => deleteBet(name, 0));
    }

    // Check if the last bet is stopped and disable the "Next Bet" button if so
    const lastRow = tbody.querySelector('tr:last-child');
    if (lastRow && lastRow.cells[7].textContent === 'Stopped') {
        punterDiv.querySelector('.next-bet').disabled = true;
    }

    updateProfitLoss(name);

    punterDiv.querySelector('.close-punter').addEventListener('click', () => {
        if (confirm(`Are you sure you want to close ${name}'s record?`)) {
            const profitLoss = parseFloat(punterDiv.querySelector('.profit-loss').textContent.replace('Profit/Loss: $', ''));
            savePunterHistory(name, profitLoss);
            punterDiv.remove();
            removePunterData(name);
            updateOverallProfit();
        }
    });

    punterDiv.querySelector('.next-bet').addEventListener('click', () => addNextBet(name));
}

function updateBet(event, punterName) {
    const row = event.target.closest('tr');
    const outcome = event.target.value;
    const stake = parseFloat(row.querySelector('.stake').value);
    const odds = parseFloat(row.querySelector('.odds').value) || 0;
    let nextStake = stake; // Default: next stake remains the same
    let lossStreak = parseInt(row.cells[6].textContent);
    let status = 'Active';

    if (outcome === 'W') {
        lossStreak = 0; // Reset loss streak on big win
        row.classList.add('win');
    } else if (outcome === 'w') {
        lossStreak = 0; // Reset loss streak on small win
        row.classList.add('win');
    } else if (outcome === 'D') {
        lossStreak = 0; // Reset loss streak on draw
    } else if (outcome === 'L') {
        nextStake = stake * 2; // Double the stake on loss
        lossStreak += 1; // Increment loss streak on loss
        row.classList.add('loss');
    }

    row.cells[5].textContent = nextStake.toFixed(2);
    row.cells[6].textContent = lossStreak;

    if (lossStreak >= 3) {
        status = 'Stopped';
        row.classList.add('stopped');
        row.cells[5].textContent = '-';
        row.querySelector('.stake').disabled = true;
        row.querySelector('.game').disabled = true;
        row.querySelector('.odds').disabled = true;
        row.querySelector('.outcome').disabled = true;
        row.querySelector('.delete-bet').disabled = true;
        // Disable the "Next Bet" button
        const punterDiv = row.closest('.punter-section');
        punterDiv.querySelector('.next-bet').disabled = true;
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
    savePunterData(punterName, bets);

    updateProfitLoss(punterName);
    updateOverallProfit();
}

function addNextBet(punterName) {
    const tbody = document.getElementById(`bets-${punterName}`);
    const lastRow = tbody.querySelector('tr:last-child');
    if (!lastRow) return;

    const lastStatus = lastRow.cells[7].textContent;
    if (lastStatus === 'Stopped') return; // Don't add new row if stopped

    const lastNextStake = parseFloat(lastRow.cells[5].textContent);
    const lastLossStreak = parseInt(lastRow.cells[6].textContent);
    const newBetNumber = parseInt(lastRow.cells[0].textContent) + 1;

    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${newBetNumber}</td>
        <td><input type="number" class="stake" value="${lastNextStake.toFixed(2)}" min="1"></td>
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
        <td>${lastLossStreak}</td>
        <td>Active</td>
        <td><button class="delete-bet">Delete</button></td>
    `;
    tbody.appendChild(newRow);
    newRow.querySelector('.outcome').addEventListener('change', (e) => updateBet(e, punterName));
    newRow.querySelector('.delete-bet').addEventListener('click', () => deleteBet(punterName, newBetNumber - 1));
}

function deleteBet(punterName, betIndex) {
    const tbody = document.getElementById(`bets-${punterName}`);
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 1) {
        alert("Cannot delete the last bet. Use the 'Close' button to remove the punter.");
        return;
    }

    tbody.deleteRow(betIndex);
    // Re-number the remaining rows
    Array.from(tbody.querySelectorAll('tr')).forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });

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
    savePunterData(punterName, bets);

    updateProfitLoss(punterName);
    updateOverallProfit();
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

function updateOverallProfit() {
    const punterData = loadPunterDataFromStorage();
    let overallProfit = 0;

    for (const name in punterData) {
        const bets = punterData[name].bets || [];
        bets.forEach(bet => {
            if (bet.outcome === 'W') {
                overallProfit += bet.stake * (bet.odds - 1);
            } else if (bet.outcome === 'w') {
                overallProfit += (bet.stake * (bet.odds - 1)) / 2;
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

function showRecords() {
    const punterData = loadPunterDataFromStorage();
    const recordsContent = document.getElementById('records-content');
    let html = '<table><thead><tr><th>Punter</th><th>Most Recent Date</th><th>Total Profit/Loss</th></tr></thead><tbody>';

    // Group records by punter
    const groupedRecords = {};
    for (const name in punterData) {
        const history = punterData[name].history || [];
        if (history.length === 0) continue; // Skip punters with no history

        let totalProfitLoss = 0;
        let mostRecentDate = null;

        history.forEach(record => {
            totalProfitLoss += record.profitLoss;
            const recordDate = new Date(record.timestamp);
            if (!mostRecentDate || recordDate > mostRecentDate) {
                mostRecentDate = recordDate;
            }
        });

        groupedRecords[name] = {
            totalProfitLoss: totalProfitLoss,
            mostRecentDate: mostRecentDate
        };
    }

    // Sort punters alphabetically
    const sortedPunterNames = Object.keys(groupedRecords).sort();

    // Generate table rows
    sortedPunterNames.forEach(name => {
        const { totalProfitLoss, mostRecentDate } = groupedRecords[name];
        const formattedDate = mostRecentDate.toLocaleString();
        html += `
            <tr>
                <td>${name}</td>
                <td>${formattedDate}</td>
                <td style="color: ${totalProfitLoss >= 0 ? 'green' : 'red'}">$${totalProfitLoss.toFixed(2)}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    recordsContent.innerHTML = html;
    document.getElementById('records-modal').style.display = 'block';
}
