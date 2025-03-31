// Initialize Supabase client
const { createClient } = Supabase;
const supabase = createClient(
    'https://ozaolkdkxgwqoyzmgjcd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96YW9sa2RreGd3cW95em1namNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MzI4NzcsImV4cCI6MjA1OTAwODg3N30.kX_b_eEvKtljidsJf0xZkhx9OMMabdyg2BO0xVswkls'
);

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');

    const addPunterButton = document.getElementById('add-punter');
    const viewRecordsButton = document.getElementById('view-records');
    const exportButton = document.getElementById('export-data');
    const importButton = document.getElementById('import-button');
    const importInput = document.getElementById('import-data');
    const clearDataButton = document.getElementById('clear-data');
    const changeViewButton = document.getElementById('change-view');
    const closeModal = document.getElementById('close-modal');
    const recordsModal = document.getElementById('records-modal');

    loadPunterData();
    updateOverallProfit();

    const puntersContainer = document.getElementById('punters-container');
    puntersContainer.classList.add('two-column');
    let currentLayout = 'two-column';

    if (addPunterButton) {
        addPunterButton.addEventListener('click', async () => {
            const name = prompt('Enter punter name:');
            if (name) {
                const { error } = await supabase.from('punters').insert({ name });
                if (error) console.error('Error adding punter:', error);
                else addPunter(name);
            }
        });
    }

    if (viewRecordsButton) {
        viewRecordsButton.addEventListener('click', showRecords);
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            recordsModal.style.display = 'none';
        });
    }

    if (recordsModal) {
        window.addEventListener('click', (event) => {
            if (event.target === recordsModal) recordsModal.style.display = 'none';
        });
    }

    if (exportButton) {
        exportButton.addEventListener('click', async () => {
            const { data: punters } = await supabase.from('punters').select('*');
            const { data: bets } = await supabase.from('bets').select('*');
            const { data: history } = await supabase.from('history').select('*');
            const exportData = { punters, bets, history };
            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'betting-assistant-data.json';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    if (importButton && importInput) {
        importButton.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        await supabase.from('punters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        await supabase.from('bets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        await supabase.from('history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        await supabase.from('punters').insert(importedData.punters);
                        await supabase.from('bets').insert(importedData.bets);
                        await supabase.from('history').insert(importedData.history);
                        alert('Data imported successfully! Reloading page...');
                        location.reload();
                    } catch (err) {
                        alert('Error importing data: ' + err.message);
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    if (clearDataButton) {
        clearDataButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                await supabase.from('bets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                await supabase.from('history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                await supabase.from('punters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                alert('All data cleared! Reloading page...');
                window.location.reload(true);
            }
        });
    }

    if (changeViewButton) {
        changeViewButton.addEventListener('click', () => {
            puntersContainer.classList.remove('two-column', 'single-column', 'three-column');
            if (currentLayout === 'two-column') {
                puntersContainer.classList.add('single-column');
                currentLayout = 'single-column';
                changeViewButton.textContent = 'Change View (Single)';
            } else if (currentLayout === 'single-column') {
                puntersContainer.classList.add('three-column');
                currentLayout = 'three-column';
                changeViewButton.textContent = 'Change View (3-Column)';
            } else {
                puntersContainer.classList.add('two-column');
                currentLayout = 'two-column';
                changeViewButton.textContent = 'Change View (2-Column)';
            }
        });
    }
});

async function loadPunterData() {
    const { data: punters, error } = await supabase.from('punters').select('*');
    if (error) {
        console.error('Error loading punters:', error);
        return;
    }
    for (const punter of punters) {
        const { data: bets } = await supabase.from('bets').select('*').eq('punter_id', punter.id);
        addPunter(punter.name, bets || []);
    }
}

async function savePunterData(name, bets) {
    const { data: punter, error: punterError } = await supabase.from('punters').select('id').eq('name', name).single();
    if (punterError) console.error('Error fetching punter:', punterError);
    const punterId = punter.id;
    await supabase.from('bets').delete().eq('punter_id', punterId);
    if (bets.length > 0) {
        const betData = bets.map(bet => ({ ...bet, punter_id: punterId }));
        const { error } = await supabase.from('bets').insert(betData);
        if (error) console.error('Error saving bets:', error);
    }
}

async function savePunterHistory(name, profitLoss) {
    const { data: punter } = await supabase.from('punters').select('id').eq('name', name).single();
    const punterId = punter.id;
    const { error } = await supabase.from('history').insert({
        punter_id: punterId,
        timestamp: new Date().toISOString(),
        profitLoss
    });
    if (error) console.error('Error saving history:', error);
    await supabase.from('bets').delete().eq('punter_id', punterId);
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

    punterDiv.querySelector('.close-punter').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to close ${name}'s record?`)) {
            const profitLoss = parseFloat(punterDiv.querySelector('.profit-loss').textContent.replace('Profit/Loss: $', ''));
            await savePunterHistory(name, profitLoss);
            punterDiv.remove();
            updateOverallProfit();
        }
    });

    punterDiv.querySelector('.next-bet').addEventListener('click', () => addNextBet(name));
}

async function updateBet(event, punterName) {
    const row = event.target.closest('tr');
    const outcome = event.target.value;
    const stake = parseFloat(row.querySelector('.stake').value);
    const odds = parseFloat(row.querySelector('.odds').value) || 0;

    if (outcome === 'W' || outcome === 'w') row.classList.add('win');
    else if (outcome === 'L') row.classList.add('loss');

    const game = row.querySelector('.game').value;
    const bets = Array.from(document.getElementById(`bets-${punterName}`).querySelectorAll('tr')).map(row => ({
        stake: parseFloat(row.querySelector('.stake').value),
        game: row.querySelector('.game').value,
        odds: parseFloat(row.querySelector('.odds').value) || 0,
        outcome: row.querySelector('.outcome').value
    }));
    await savePunterData(punterName, bets);

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

async function deleteBet(punterName, betIndex) {
    const tbody = document.getElementById(`bets-${punterName}`);
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 1) {
        alert("Cannot delete the last bet. Use the 'Close' button to remove the punter.");
        return;
    }

    tbody.deleteRow(betIndex);
    const bets = Array.from(tbody.querySelectorAll('tr')).map(row => ({
        stake: parseFloat(row.querySelector('.stake').value),
        game: row.querySelector('.game').value,
        odds: parseFloat(row.querySelector('.odds').value) || 0,
        outcome: row.querySelector('.outcome').value
    }));
    await savePunterData(punterName, bets);

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

        if (outcome === 'W') totalProfitLoss += stake * (odds - 1);
        else if (outcome === 'w') totalProfitLoss += (stake * (odds - 1)) / 2;
        else if (outcome === 'L') totalProfitLoss -= stake;
    });

    const punterDiv = tbody.closest('.punter-section');
    const profitLossDiv = punterDiv.querySelector('.profit-loss');
    profitLossDiv.textContent = `Profit/Loss: $${totalProfitLoss.toFixed(2)}`;
    profitLossDiv.style.color = totalProfitLoss >= 0 ? 'green' : 'red';
}

async function updateOverallProfit() {
    const { data: bets } = await supabase.from('bets').select('stake, odds, outcome');
    const { data: history } = await supabase.from('history').select('profitLoss');
    let overallProfit = 0;

    bets.forEach(bet => {
        if (bet.outcome === 'W') overallProfit += bet.stake * (bet.odds - 1);
        else if (bet.outcome === 'w') overallProfit += (bet.stake * (bet.odds - 1)) / 2;
        else if (bet.outcome === 'L') overallProfit -= bet.stake;
    });

    history.forEach(record => overallProfit += record.profitLoss);

    const overallProfitDiv = document.getElementById('overall-profit');
    overallProfitDiv.textContent = `Overall Profit/Loss: $${overallProfit.toFixed(2)}`;
    overallProfitDiv.style.color = overallProfit >= 0 ? 'green' : 'red';
}

async function showRecords() {
    const { data: punters } = await supabase.from('punters').select('*');
    const { data: history } = await supabase.from('history').select('punter_id, timestamp, profitLoss');
    const recordsContent = document.getElementById('records-content');
    let html = '<table><thead><tr><th>Punter</th><th>Most Recent Date</th><th>Total Profit/Loss</th></tr></thead><tbody>';

    const groupedRecords = {};
    for (const punter of punters) {
        const punterHistory = history.filter(h => h.punter_id === punter.id);
        if (punterHistory.length === 0) continue;

        let totalProfitLoss = 0;
        let mostRecentDate = null;
        punterHistory.forEach(record => {
            totalProfitLoss += record.profitLoss;
            const recordDate = new Date(record.timestamp);
            if (!mostRecentDate || recordDate > mostRecentDate) mostRecentDate = recordDate;
        });

        groupedRecords[punter.name] = { totalProfitLoss, mostRecentDate };
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
