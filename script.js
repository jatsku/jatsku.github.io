// Load existing data on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');

    // Verify all elements exist
    const addPunterButton = document.getElementById('add-punter');
    const viewRecordsButton = document.getElementById('view-records');
    const exportButton = document.getElementById('export-data');
    const importButton = document.getElementById('import-button');
    const importInput = document.getElementById('import-data');
    const clearDataButton = document.getElementById('clear-data');
    const closeModal = document.getElementById('close-modal');
    const recordsModal = document.getElementById('records-modal');

    console.log('Add Punter Button:', addPunterButton);
    console.log('View Records Button:', viewRecordsButton);
    console.log('Export Data Button:', exportButton);
    console.log('Import Button:', importButton);
    console.log('Import Input:', importInput);
    console.log('Clear Data Button:', clearDataButton);
    console.log('Close Modal Button:', closeModal);
    console.log('Records Modal:', recordsModal);

    // Load existing data
    loadPunterData();
    updateOverallProfit();

    // Add Punter button
    if (addPunterButton) {
        addPunterButton.addEventListener('click', () => {
            console.log('Add Punter button clicked');
            const name = prompt('Enter punter name:');
            if (name) addPunter(name);
        });
    } else {
        console.error('Add Punter button not found');
    }

    // View Records button
    if (viewRecordsButton) {
        viewRecordsButton.addEventListener('click', () => {
            console.log('View Records button clicked');
            showRecords();
        });
    } else {
        console.error('View Records button not found');
    }

    // Close Modal button
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            console.log('Close Modal button clicked');
            document.getElementById('records-modal').style.display = 'none';
        });
    } else {
        console.error('Close Modal button not found');
    }

    // Modal click outside to close
    if (recordsModal) {
        window.addEventListener('click', (event) => {
            if (event.target === recordsModal) {
                console.log('Clicked outside modal to close');
                recordsModal.style.display = 'none';
            }
        });
    } else {
        console.error('Records Modal not found');
    }

    // Export Data button
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            console.log('Export Data button clicked');
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
    } else {
        console.error('Export Data button not found');
    }

    // Import Data button
    if (importButton && importInput) {
        importButton.addEventListener('click', () => {
            console.log('Import Data button clicked');
            importInput.click();
        });
        importInput.addEventListener('change', (event) => {
            console.log('Import Input changed');
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
    } else {
        console.error('Import Button or Input not found');
    }

    // Clear Data button
    if (clearDataButton) {
        clearDataButton.addEventListener('click', () => {
            console.log('Clear Data button clicked');
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                console.log('Before clearing:', localStorage.getItem('punterData'));
                localStorage.setItem('punterData', JSON.stringify({}));
                console.log('After clearing:', localStorage.getItem('punterData'));
                alert('All data cleared! Reloading page...');
                window.location.reload(true);
            }
        });
    } else {
        console.error('Clear Data button not found');
    }
});

function loadPunterDataFromStorage() {
    const data = localStorage.getItem('punterData');
    try {
        return data ? JSON.parse(data) : {};
    } catch (err) {
        console.error('Error parsing punterData from localStorage:', err);
        localStorage.setItem('punterData', JSON.stringify({}));
        return {};
    }
}

function savePunterDataToStorage(punterData) {
    try {
        localStorage.setItem('punterData', JSON.stringify(punterData));
    } catch (err) {
        console.error('Error saving punterData to localStorage:', err);
    }
}

function loadPunterData() {
    const punterData = loadPunterDataFromStorage();
    console.log('Loaded punterData:', punterData);
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
    console.log(`Saving history for ${name}:`, { profitLoss });
    punterData[name] = punterData[name] || { bets: [], history: [] };
    if (!punterData[name].history) punterData[name].history = [];
    punterData[name].history.push({
        timestamp: new Date().toISOString(),
        profitLoss: profitLoss
    });
    punterData[name].bets = [];
    console.log(`Updated punterData for ${name}:`, punterData[name]);
    savePunterDataToStorage(punterData);
}

function removePunterData(name) {
    const punterData = loadPunterDataFromStorage();
    if (punterData[name]) {
        punterData[name].bets = [];
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
                    <th>Stake</th>
                    <th>Game</th>
                    <th>Odds</th>
                    <th>Outcome</th>
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
                <td><input type="number" class="stake" value="${bet.stake}" min="1"></td>
                <td><input type="text" class="game" value="${bet.game || ''}"></td>
                <td><input type="number" class="odds" value="${bet.odds || ''}" step="0.01" min="1"></td>
                <td>
                    <select class="outcome">
                        <option value="">--</option>
                        <option value="W" ${bet.outcome === 'W' ? 'selected' : ''}>W (Big Win)</option>
                        <option value="w" ${bet.outcome === 'w' ? 'selected' : ''}>w (Small Win)</option>
                        <option value="D" ${bet.outcome === 'D' ? 'selected' : ''}>D (Draw)</option>
                        <option value="L" ${bet.outcome === 'L' ? 'selected' : ''}>L (Loss)</option>
                    </select>
                </td>
                <td><button class="delete-bet">Delete</button></td>
            `;
            if (bet.outcome === 'W' || bet.outcome === 'w') row.classList.add('win');
            if (bet.outcome === 'L') row.classList.add('loss');
            tbody.appendChild(row);
            row.querySelector('.outcome').addEventListener('change', (e) => updateBet(e, name));
            row.querySelector('.delete-bet').addEventListener('click', () => deleteBet(name, index));
        });
    } else {
        const row = document.createElement('tr');
        row.innerHTML = `
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
            <td><button class="delete-bet">Delete</button></td>
        `;
        tbody.appendChild(row);
        row.querySelector('.outcome').addEventListener('change', (e) => updateBet(e, name));
        row.querySelector('.delete-bet').addEventListener('click', () => deleteBet(name, 0));
    }

    updateProfitLoss(name);

    const closeButton = punterDiv.querySelector('.close-punter');
    console.log(`Close button for ${name}:`, closeButton);
    closeButton.addEventListener('click', () => {
        console.log(`Close button clicked for ${name}`);
        if (confirm(`Are you sure you want to close ${name}'s record?`)) {
            const profitLoss = parseFloat(punterDiv.querySelector('.profit-loss').textContent.replace('Profit/Loss: $', ''));
            savePunterHistory(name, profitLoss);
            punterDiv.remove();
            removePunterData(name);
            updateOverallProfit();
        }
    });

    const nextBetButton = punterDiv.querySelector('.next-bet');
    console.log(`Next Bet button for ${name}:`, nextBetButton);
    nextBetButton.addEventListener('click', () => {
        console.log(`Next Bet button clicked for ${name}`);
        addNextBet(name);
    });
}

function updateBet(event, punterName) {
    const row = event.target.closest('tr');
    const outcome = event.target.value;
    const stake = parseFloat(row.querySelector('.stake').value);
    const odds = parseFloat(row.querySelector('.odds').value) || 0;

    if (outcome === 'W' || outcome === 'w') {
        row.classList.add('win');
    } else if (outcome === 'L') {
        row.classList.add('loss');
    }

    const game = row.querySelector('.game').value;
    const betData = {
        stake: stake,
        game: game,
        odds: odds,
        outcome: outcome
    };
    const tbody = document.getElementById(`bets-${punterName}`);
    const bets = Array.from(tbody.querySelectorAll('tr')).map(row => {
        return {
            stake: parseFloat(row.querySelector('.stake').value),
            game: row.querySelector('.game').value,
            odds: parseFloat(row.querySelector('.odds').value) || 0,
            outcome: row.querySelector('.outcome').value
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

    const lastStake = parseFloat(lastRow.querySelector('.stake').value);

    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="number" class="stake" value="${lastStake.toFixed(2)}" min="1"></td>
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
        <td><button class="delete-bet">Delete</button></td>
    `;
    tbody.appendChild(newRow);
    newRow.querySelector('.outcome').addEventListener('change', (e) => updateBet(e, punterName));
    newRow.querySelector('.delete-bet').addEventListener('click', () => deleteBet(punterName, tbody.children.length - 1));
}

function deleteBet(punterName, betIndex) {
    const tbody = document.getElementById(`bets-${punterName}`);
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 1) {
        alert("Cannot delete the last bet. Use the 'Close' button to remove the punter.");
        return;
    }

    tbody.deleteRow(betIndex);

    const bets = Array.from(tbody.querySelectorAll('tr')).map(row => {
        return {
            stake: parseFloat(row.querySelector('.stake').value),
            game: row.querySelector('.game').value,
            odds: parseFloat(row.querySelector('.odds').value) || 0,
            outcome: row.querySelector('.outcome').value
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
            totalProfitLoss += stake * (odds - 1);
        } else if (outcome === 'w') {
            totalProfitLoss += (stake * (odds - 1)) / 2;
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
    console.log('Showing records, punterData:', punterData);
    const recordsContent = document.getElementById('records-content');
    let html = '<table><thead><tr><th>Punter</th><th>Most Recent Date</th><th>Total Profit/Loss</th></tr></thead><tbody>';

    const groupedRecords = {};
    for (const name in punterData) {
        const history = punterData[name].history || [];
        if (history.length === 0) {
            console.log(`No history for ${name}`);
            continue;
        }

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

    const sortedPunterNames = Object.keys(groupedRecords).sort();

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
