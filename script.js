// Initialize Supabase client
console.log('Checking if supabase global is available:', typeof supabase);
if (typeof supabase === 'undefined') {
    console.error('Supabase client not loaded! Ensure the script tag is correct.');
} else {
    console.log('Supabase client loaded successfully');
}

const { createClient } = supabase;
const supabaseClient = createClient(
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

    console.log('Add Punter Button:', addPunterButton);
    console.log('View Records Button:', viewRecordsButton);
    console.log('Export Data Button:', exportButton);
    console.log('Import Button:', importButton);
    console.log('Import Input:', importInput);
    console.log('Clear Data Button:', clearDataButton);
    console.log('Change View Button:', changeViewButton);
    console.log('Close Modal Button:', closeModal);
    console.log('Records Modal:', recordsModal);

    loadPunterData();
    updateOverallProfit();

    const puntersContainer = document.getElementById('punters-container');
    puntersContainer.classList.add('two-column');
    let currentLayout = 'two-column';

    if (addPunterButton) {
        addPunterButton.addEventListener('click', async () => {
            console.log('Add Punter button clicked');
            const name = prompt('Enter punter name:');
            if (name) {
                const { error } = await supabaseClient.from('punters').insert({ name });
                if (error) console.error('Error adding punter:', error);
                else addPunter(name);
            }
        });
    } else {
        console.error('Add Punter button not found');
    }

    if (viewRecordsButton) {
        viewRecordsButton.addEventListener('click', () => {
            console.log('View Records button clicked');
            showRecords();
        });
    } else {
        console.error('View Records button not found');
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            console.log('Close Modal button clicked');
            recordsModal.style.display = 'none';
        });
    } else {
        console.error('Close Modal button not found');
    }

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

    if (exportButton) {
        exportButton.addEventListener('click', async () => {
            console.log('Export Data button clicked');
            const { data: punters } = await supabaseClient.from('punters').select('*');
            const { data: bets } = await supabaseClient.from('bets').select('*');
            const { data: history } = await supabaseClient.from('history').select('*');
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
    } else {
        console.error('Export Data button not found');
    }

    if (importButton && importInput) {
        importButton.addEventListener('click', () => {
            console.log('Import Data button clicked');
            importInput.click();
        });
        importInput.addEventListener('change', async (event) => {
            console.log('Import Input changed');
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        await supabaseClient.from('punters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        await supabaseClient.from('bets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        await supabaseClient.from('history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        await supabaseClient.from('punters').insert(importedData.punters);
                        await supabaseClient.from('bets').insert(importedData.bets);
                        await supabaseClient.from('history').insert(importedData.history);
                        alert('Data imported successfully! Reloading page...');
                        location.reload();
                    } catch (err) {
                        alert('Error importing data: ' + err.message);
                    }
                };
                reader.readAsText(file);
            }
        });
    } else {
        console.error('Import Button or Input not found');
    }

    if (clearDataButton) {
        clearDataButton.addEventListener('click', async () => {
            console.log('Clear Data button clicked');
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                await supabaseClient.from('bets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                await supabaseClient.from('history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                await supabaseClient.from('punters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                alert('All data cleared! Reloading page...');
                window.location.reload(true);
            }
        });
    } else {
        console.error('Clear Data button not found');
    }

    if (changeViewButton) {
        changeViewButton.addEventListener('click', () => {
            console.log('Change View button clicked');
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
    } else {
        console.error('Change View button not found');
    }
});

async function loadPunterData() {
    console.log('Loading punter data...');
    const { data: punters, error } = await supabaseClient.from('punters').select('*');
    if (error) {
        console.error('Error loading punters:', error);
        return;
    }
    console.log('Punters loaded:', punters);
    for (const punter of punters) {
        const { data: bets, error: betsError } = await supabaseClient.from('bets').select('*').eq('punter_id', punter.id);
        if (betsError) console.error('Error loading bets for punter:', punter.name, betsError);
        else addPunter(punter.name, bets || []);
    }
}

async function savePunterData(name, bets) {
    const { data: punter, error: punterError } = await supabaseClient.from('punters').select('id').eq('name', name).single();
    if (punterError) console.error('Error fetching punter:', punterError);
    const punterId = punter.id;
    await supabaseClient.from('bets').delete().eq('punter_id', punterId);
    if (bets.length > 0) {
        const betData = bets.map(bet => ({ ...bet, punter_id: punterId }));
        const { error } = await supabaseClient.from('bets').insert(betData);
        if (error) console.error('Error saving bets:', error);
    }
}

async function savePunterHistory(name, profitLoss) {
    const { data: punter } = await supabaseClient.from('punters').select('id').eq('name', name).single();
    const punterId = punter.id;
    const { error } = await supabaseClient.from('history').insert({
        punter_id: punterId,
        timestamp: new Date().toISOString(),
        profitLoss
    });
    if (error) console.error('Error saving history:', error);
    await supabaseClient.from('bets').delete().eq('punter_id', punterId);
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
        <div class="progress-container"><div class="progress-bar"></div></div>
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

    const maxProfit = 1000;
    const progress = Math.min(Math.abs(totalProfitLoss) / maxProfit * 100, 100);
    const progressBar = punterDiv.querySelector('.progress-bar');
    progressBar.style.width = `${progress}%`;
    progressBar.style.backgroundColor = totalProfitLoss >= 0 ? '#4CAF50' : '#f44336';
}

async function updateOverallProfit() {
    const { data: bets } = await supabaseClient.from('bets').select('stake, odds, outcome');
    const { data: history } = await supabaseClient.from('history').select('profitLoss');
    let overallProfit = 0;

    if (bets) {
        bets.forEach(bet => {
            if (bet.outcome === 'W') overallProfit += bet.stake * (bet.odds - 1);
            else if (bet.outcome === 'w') overallProfit += (bet.stake * (bet.odds - 1)) / 2;
            else if (bet.outcome === 'L') overallProfit -= bet.stake;
        });
    }

    if (history) {
        history.forEach(record => overallProfit += record.profitLoss);
    }

    const overallProfitDiv = document.getElementById('overall-profit');
    overallProfitDiv.textContent = `Overall Profit/Loss: $${overallProfit.toFixed(2)}`;
    overallProfitDiv.style.color = overallProfit >= 0 ? 'green' : 'red';
}

async function showRecords() {
    const { data: punters } = await supabaseClient.from('punters').select('*');
    const { data: history } = await supabaseClient.from('history').select('punter_id, timestamp, profitLoss');
    const recordsContent = document.getElementById('records-content');
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Punter</th>
                    <th>Most Recent Date</th>
                    <th>Total Profit/Loss</th>
                </tr>
            </thead>
            <tbody>
    `;

    const groupedRecords = {};
    if (punters && history) {
        for (const punter of punters) {
            const punterHistory = history.filter(h => h.punter_id === punter.id);
            if (punterHistory.length === 0) continue;

            let totalProfitLoss = 0;
            let mostRecentDate = null;
            punterHistory.forEach(record => {
                totalProfitLoss += record.profitLoss;
                constSorry about that, something didn't go as planned. Please try again, and if you're still seeing this message, go ahead and restart the app.
