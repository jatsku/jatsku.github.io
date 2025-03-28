// Load existing punters from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPunterData();
    const addPunterButton = document.getElementById('add-punter');
    addPunterButton.addEventListener('click', () => {
        const name = prompt('Enter punter name:');
        if (name) addPunter(name);
    });
});

// Load punter data from localStorage
function loadPunterData() {
    const punterData = JSON.parse(localStorage.getItem('punterData')) || {};
    for (const name in punterData) {
        addPunter(name, punterData[name]);
    }
}

// Save punter data to localStorage
function savePunterData(name, bets) {
    const punterData = JSON.parse(localStorage.getItem('punterData')) || {};
    punterData[name] = bets;
    localStorage.setItem('punterData', JSON.stringify(punterData));
}

// Remove punter from localStorage
function removePunterData(name) {
    const punterData = JSON.parse(localStorage.getItem('punterData')) || {};
    delete punterData[name];
    localStorage.setItem('punterData', JSON.stringify(punterData));
}

function addPunter(name, existingBets = []) {
    const container = document.getElementById('punters-container');
    const punterDiv = document.createElement('div');
    punterDiv.classList.add('punter-section');
    punterDiv.setAttribute('data-punter', name);

    // Add punter header with close button
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
                    <th>Odds</th> <!-- New Odds column -->
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

    // Add existing bets if any
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
        // Add initial row for new punter
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

    // Update profit/loss
    updateProfitLoss(name);

    // Add close button functionality
    punterDiv.querySelector('.close-punter').addEventListener('click', () => {
        if (confirm(`Are you sure you want to close ${name}'s record?`)) {
            punterDiv.remove();
            removePunterData(name);
        }
    });
}

function updateBet(event, punterName) {
    const row = event.target.closest('tr');
    const outcome = event.target.value;
    const stake = parseFloat(row.querySelector('.stake').value);
    const odds = parseFloat(row.querySelector('.odds').value) || 0; // Get odds
    let nextStake = 0;
    let lossStreak = parseInt(row.cells[6].textContent); // Adjusted for new columns
    let status = 'Active';

    // Calculate next stake and loss streak
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

    row.cells[5].textContent = nextStake.toFixed(2); // Adjusted for new columns
    row.cells[6].textContent = lossStreak;

    // Check stop loss (3 losses in a row)
    if (lossStreak >= 3) {
        status = 'Stopped';
        row.classList.add('stopped');
        row.cells[5].textContent = '-';
    }
    row.cells[7].textContent = status;

    // Save the bet to localStorage
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

    // Update profit/loss
    updateProfitLoss(punterName);

    // If not stopped, add new row
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

        if (outcome === 'W' || outcome === 'w') {
            totalProfitLoss += stake * (odds - 1); // Profit = stake * (odds - 1)
        } else if (outcome === 'L') {
            totalProfitLoss -= stake; // Loss = stake
        } else if (outcome === 'D') {
            // Draw: no profit or loss
        }
    });

    const punterDiv = tbody.closest('.punter-section');
    const profitLossDiv = punterDiv.querySelector('.profit-loss');
    profitLossDiv.textContent = `Profit/Loss: $${totalProfitLoss.toFixed(2)}`;
    profitLossDiv.style.color = totalProfitLoss >= 0 ? 'green' : 'red';
}
