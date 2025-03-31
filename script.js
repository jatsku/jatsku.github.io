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
