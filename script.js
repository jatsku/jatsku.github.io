// Check if the button is being found
console.log("Script loaded, looking for button...");
const addPunterButton = document.getElementById('add-punter');
if (addPunterButton) {
    console.log("Button found!");
} else {
    console.error("Button with ID 'add-punter' not found!");
}

// Add event listener
addPunterButton.addEventListener('click', () => {
    console.log("Add Punter button clicked!");
    const name = prompt('Enter punter name:');
    if (name) {
        console.log("Punter name entered:", name);
        addPunter(name);
    } else {
        console.log("No name entered, cancelling...");
    }
});

function addPunter(name) {
    console.log("Adding punter:", name);
    const container = document.getElementById('punters-container');
    const punterDiv = document.createElement('div');
    punterDiv.innerHTML = `
        <h2>${name}</h2>
        <table class="punter-table">
            <thead>
                <tr>
                    <th>Bet #</th>
                    <th>Stake</th>
                    <th>Game</th> <!-- New Game column -->
                    <th>Outcome</th>
                    <th>Next Stake</th>
                    <th>Loss Streak</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody id="bets-${name}">
                <tr>
                    <td>1</td>
                    <td><input type="number" class="stake" value="10" min="1"></td>
                    <td><input type="text" class="game" placeholder="Enter game"></td> <!-- Input for game name -->
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
                </tr>
            </tbody>
        </table>
    `;
    container.appendChild(punterDiv);

    // Add event listener for outcome changes
    punterDiv.querySelector('.outcome').addEventListener('change', (e) => updateBet(e, name));
}

function updateBet(event, punterName) {
    const row = event.target.closest('tr');
    const outcome = event.target.value;
    const stake = parseFloat(row.querySelector('.stake').value);
    let nextStake = 0;
    let lossStreak = parseInt(row.cells[5].textContent); // Adjusted index due to new Game column
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

    row.cells[4].textContent = nextStake.toFixed(2); // Adjusted index for Next Stake
    row.cells[5].textContent = lossStreak; // Adjusted index for Loss Streak

    // Check stop loss (3 losses in a row)
    if (lossStreak >= 3) {
        status = 'Stopped';
        row.classList.add('stopped');
        row.cells[4].textContent = '-'; // Adjusted index
    }
    row.cells[6].textContent = status; // Adjusted index for Status

    // If not stopped, add new row
    if (status === 'Active') {
        const tbody = document.getElementById(`bets-${punterName}`);
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${parseInt(row.cells[0].textContent) + 1}</td>
            <td><input type="number" class="stake" value="${nextStake.toFixed(2)}" min="1"></td>
            <td><input type="text" class="game" placeholder="Enter game"></td> <!-- New row also has Game input -->
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
