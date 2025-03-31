// Initialize Supabase client
const supabaseClient = supabase.createClient(
    'https://ozaolkdkxgwqoyzmgjcd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96YW9sa2RreGd3cW95em1namNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MzI4NzcsImV4cCI6MjA1OTAwODg3N30.kX_b_eEvKtljidsJf0xZkhx9OMMabdyg2BO0xVswkls'
);

class BettingApp {
    // ... (other methods remain the same)

    async showRecords() {
        try {
            // Fetch all history records without date filter initially
            const { data: history, error } = await supabaseClient
                .from('history')
                .select('*, punters(name)')
                .order('timestamp', { ascending: false });

            if (error) {
                console.error('Error fetching history:', error);
                alert('Failed to load records: ' + error.message);
                return;
            }

            console.log('Raw history data:', history); // Debug log

            if (!history || history.length === 0) {
                console.log('No history records found in database');
                this.displayRecords({}); // Show empty table
                return;
            }

            // Process records
            const grouped = this.groupHistory(history);
            console.log('Grouped records:', grouped); // Debug log
            this.displayRecords(grouped);
        } catch (err) {
            console.error('Unexpected error in showRecords:', err);
            alert('An unexpected error occurred while loading records');
        }
    }

    groupHistory(history) {
        const grouped = {};
        const today = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD

        history.forEach(record => {
            const name = record.punters?.name || 'Unknown';
            const recordDate = new Date(record.timestamp);
            const dateStr = recordDate.toISOString().split('T')[0];

            if (!grouped[name]) {
                grouped[name] = { 
                    profitLoss: 0, 
                    latest: null,
                    todayProfit: 0,
                    hasToday: false 
                };
            }

            grouped[name].profitLoss += record.profitLoss;
            
            // Check if record is from today
            if (dateStr === today) {
                grouped[name].todayProfit += record.profitLoss;
                grouped[name].hasToday = true;
            }

            if (!grouped[name].latest || recordDate > grouped[name].latest) {
                grouped[name].latest = recordDate;
            }
        });

        return grouped;
    }

    displayRecords(grouped) {
        const content = document.getElementById('records-content');
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Punter</th>
                        <th>Latest Date</th>
                        <th>Total P/L</th>
                        <th>Today P/L</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const punterNames = Object.keys(grouped).sort();
        if (punterNames.length === 0) {
            html += '<tr><td colspan="4">No records found</td></tr>';
        } else {
            punterNames.forEach(name => {
                const { profitLoss, latest, todayProfit, hasToday } = grouped[name];
                html += `
                    <tr>
                        <td>${name}</td>
                        <td>${latest.toLocaleString()}</td>
                        <td style="color: ${profitLoss >= 0 ? 'green' : 'red'}">
                            $${profitLoss.toFixed(2)}
                        </td>
                        <td style="color: ${todayProfit >= 0 ? 'green' : 'red'}">
                            ${hasToday ? '$' + todayProfit.toFixed(2) : '-'}
                        </td>
                    </tr>
                `;
            });
        }

        html += '</tbody></table>';
        content.innerHTML = html;
        this.toggleModal(true);
    }

    // Modified closePunter to ensure history is saved correctly
    async closePunter(name) {
        if (!confirm(`Close ${name}'s record?`)) return;

        try {
            const punterDiv = document.querySelector(`.punter-section[data-punter="${name}"]`);
            const profitLoss = parseFloat(punterDiv.querySelector('.profit-loss')
                .textContent.replace('Profit/Loss: $', ''));

            const { data: punter, error: fetchError } = await supabaseClient
                .from('punters')
                .select('id')
                .eq('name', name)
                .single();

            if (fetchError) throw new Error(`Failed to fetch punter: ${fetchError.message}`);

            if (punter) {
                const timestamp = new Date().toISOString();
                const { error: insertError } = await supabaseClient
                    .from('history')
                    .insert({
                        punter_id: punter.id,
                        timestamp: timestamp,
                        profitLoss: profitLoss
                    });

                if (insertError) throw new Error(`Failed to save history: ${insertError.message}`);

                console.log(`Saved history for ${name} at ${timestamp}: $${profitLoss}`);

                await supabaseClient.from('bets').delete().eq('punter_id', punter.id);
                await supabaseClient.from('punters').delete().eq('id', punter.id);
            }

            punterDiv.remove();
            delete this.consecutiveLosses[name];
            this.updateOverallProfit();
        } catch (err) {
            console.error('Error closing punter:', err);
            alert('Failed to close punter: ' + err.message);
        }
    }

    // ... (other methods remain the same)
}

    async updateBet(name, row) {
        const bets = this.getBetsFromTable(name);
        await this.savePunterData(name, bets);
        this.consecutiveLosses[name] = this.calculateConsecutiveLosses(bets);
        this.updateNextBetButton(name);
        this.updateProfitLoss(name);
        this.updateOverallProfit();
    }

    async savePunterData(name, bets) {
        const { data: punter } = await supabaseClient
            .from('punters')
            .select('id')
            .eq('name', name)
            .single();

        if (!punter) return;

        await supabaseClient.from('bets').delete().eq('punter_id', punter.id);
        if (bets.length) {
            const betData = bets.map(bet => ({ ...bet, punter_id: punter.id }));
            await supabaseClient.from('bets').insert(betData);
        }
    }

    calculateConsecutiveLosses(bets) {
        return bets.reduceRight((count, bet) => 
            bet.outcome === 'L' ? count + 1 : 
            (bet.outcome === 'W' || bet.outcome === 'w' || bet.outcome === 'D') ? 0 : count, 0);
    }

    updateNextBetButton(name) {
        const button = document.querySelector(`.next-bet[data-punter="${name}"]`);
        const disabled = this.consecutiveLosses[name] >= 3;
        button.disabled = disabled;
        button.style.backgroundColor = disabled ? '#ccc' : '';
        button.style.cursor = disabled ? 'not-allowed' : '';
        if (disabled) {
            alert(`${name} has 3 consecutive losses. Please close or view records.`);
        }
    }

    getBetsFromTable(name) {
        return Array.from(document.querySelectorAll(`#bets-${name} tr`)).map(row => ({
            stake: parseFloat(row.querySelector('.stake').value) || 0,
            game: row.querySelector('.game').value,
            odds: parseFloat(row.querySelector('.odds').value) || 0,
            outcome: row.querySelector('.outcome').value
        }));
    }

    async updateProfitLoss(name) {
        const bets = this.getBetsFromTable(name);
        const profitLoss = bets.reduce((total, bet) => {
            if (bet.outcome === 'W') return total + (bet.stake * (bet.odds - 1));
            if (bet.outcome === 'w') return total + (bet.stake * (bet.odds - 1)) / 2;
            if (bet.outcome === 'L') return total - bet.stake;
            return total;
        }, 0);

        const punterDiv = document.querySelector(`.punter-section[data-punter="${name}"]`);
        const profitLossDiv = punterDiv.querySelector('.profit-loss');
        profitLossDiv.textContent = `Profit/Loss: $${profitLoss.toFixed(2)}`;
        profitLossDiv.style.color = profitLoss >= 0 ? 'green' : 'red';

        const progressBar = punterDiv.querySelector('.progress-bar');
        const progress = Math.min(Math.abs(profitLoss) / 1000 * 100, 100);
        progressBar.style.width = `${progress}%`;
        progressBar.style.backgroundColor = profitLoss >= 0 ? '#4CAF50' : '#f44336';
    }

    async updateOverallProfit() {
        try {
            const [bets, history] = await Promise.all([
                supabaseClient.from('bets').select('stake, odds, outcome'),
                supabaseClient.from('history').select('profitLoss')
            ]);

            let profit = 0;

            // Active bets
            if (bets.data) {
                profit += bets.data.reduce((sum, bet) => {
                    if (bet.outcome === 'W') return sum + (bet.stake * (bet.odds - 1));
                    if (bet.outcome === 'w') return sum + (bet.stake * (bet.odds - 1)) / 2;
                    if (bet.outcome === 'L') return sum - bet.stake;
                    return sum;
                }, 0);
            }

            // Historical data
            if (history.data) {
                profit += history.data.reduce((sum, record) => sum + record.profitLoss, 0);
            }

            const overallProfitDiv = document.getElementById('overall-profit');
            overallProfitDiv.textContent = `Overall Profit/Loss: $${profit.toFixed(2)}`;
            overallProfitDiv.style.color = profit >= 0 ? 'green' : 'red';
        } catch (error) {
            console.error('Error updating overall profit:', error);
        }
    }

    async closePunter(name) {
        if (!confirm(`Close ${name}'s record?`)) return;

        const punterDiv = document.querySelector(`.punter-section[data-punter="${name}"]`);
        const profitLoss = parseFloat(punterDiv.querySelector('.profit-loss').textContent.replace('Profit/Loss: $', ''));

        const { data: punter } = await supabaseClient
            .from('punters')
            .select('id')
            .eq('name', name)
            .single();

        if (punter) {
            await supabaseClient.from('history').insert({
                punter_id: punter.id,
                timestamp: new Date().toISOString(),
                profitLoss
            });
            await supabaseClient.from('bets').delete().eq('punter_id', punter.id);
            await supabaseClient.from('punters').delete().eq('id', punter.id);
        }

        punterDiv.remove();
        delete this.consecutiveLosses[name];
        this.updateOverallProfit();
    }

    async showRecords() {
        const { data: history, error } = await supabaseClient
            .from('history')
            .select('*, punters(name)')
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('Error fetching records:', error);
            return;
        }

        const grouped = this.groupHistory(history);
        const html = this.generateRecordsTable(grouped);
        document.getElementById('records-content').innerHTML = html;
        this.toggleModal(true);
    }

    groupHistory(history) {
        const grouped = {};
        history.forEach(record => {
            const name = record.punters?.name || 'Unknown';
            if (!grouped[name]) {
                grouped[name] = { profitLoss: 0, latest: null };
            }
            grouped[name].profitLoss += record.profitLoss;
            const date = new Date(record.timestamp);
            if (!grouped[name].latest || date > grouped[name].latest) {
                grouped[name].latest = date;
            }
        });
        return grouped;
    }

    generateRecordsTable(grouped) {
        let html = '<table><thead><tr><th>Punter</th><th>Latest</th><th>Total</th></tr></thead><tbody>';
        if (!Object.keys(grouped).length) {
            html += '<tr><td colspan="3">No records</td></tr>';
        } else {
            Object.entries(grouped)
                .sort()
                .forEach(([name, { profitLoss, latest }]) => {
                    html += `
                        <tr>
                            <td>${name}</td>
                            <td>${latest.toLocaleString()}</td>
                            <td style="color: ${profitLoss >= 0 ? 'green' : 'red'}">$${profitLoss.toFixed(2)}</td>
                        </tr>
                    `;
                });
        }
        return html + '</tbody></table>';
    }

    async exportData() {
        const [punters, bets, history] = await Promise.all([
            supabaseClient.from('punters').select('*'),
            supabaseClient.from('bets').select('*'),
            supabaseClient.from('history').select('*')
        ]);

        const data = {
            punters: punters.data,
            bets: bets.data,
            history: history.data
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'betting-data.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                await Promise.all([
                    supabaseClient.from('punters').delete().neq('id', '0'),
                    supabaseClient.from('bets').delete().neq('id', '0'),
                    supabaseClient.from('history').delete().neq('id', '0')
                ]);
                await Promise.all([
                    supabaseClient.from('punters').insert(data.punters),
                    supabaseClient.from('bets').insert(data.bets),
                    supabaseClient.from('history').insert(data.history)
                ]);
                location.reload();
            } catch (error) {
                alert(`Import failed: ${error.message}`);
            }
        };
        reader.readAsText(file);
    }

    async clearData() {
        if (!confirm('Clear all data? This cannot be undone.')) return;

        await Promise.all([
            supabaseClient.from('punters').delete().neq('id', '0'),
            supabaseClient.from('bets').delete().neq('id', '0'),
            supabaseClient.from('history').delete().neq('id', '0')
        ]);
        location.reload();
    }

    toggleLayout() {
        const container = document.getElementById('punters-container');
        const button = document.getElementById('change-view');
        const layouts = ['two-column', 'single-column', 'three-column'];
        const current = layouts.find(l => container.classList.contains(l));
        const nextIndex = (layouts.indexOf(current) + 1) % layouts.length;
        
        container.classList.remove(...layouts);
        container.classList.add(layouts[nextIndex]);
        button.textContent = `Change View (${layouts[nextIndex].replace('-column', '')})`;
    }

    async checkDateProfit() {
        const date = document.getElementById('date-picker').value;
        if (!date) {
            alert('Please select a date');
            return;
        }

        const start = `${date}T00:00:00Z`;
        const end = `${date}T23:59:59Z`;
        const { data, error } = await supabaseClient
            .from('history')
            .select('profitLoss')
            .gte('timestamp', start)
            .lte('timestamp', end);

        if (error) {
            console.error('Error checking date profit:', error);
            return;
        }

        const total = data.reduce((sum, record) => sum + record.profitLoss, 0);
        document.getElementById('date-profit-result').innerHTML = 
            `Profit/Loss on ${date}: $${total.toFixed(2)}`;
    }

    toggleModal(show) {
        document.getElementById('records-modal').style.display = show ? 'block' : 'none';
    }

    addNextBet(name) {
        if (this.consecutiveLosses[name] >= 3) {
            alert(`${name} has 3 consecutive losses. Please close or view records.`);
            return;
        }

        const tbody = document.getElementById(`bets-${name}`);
        const lastStake = parseFloat(tbody.lastElementChild.querySelector('.stake').value) || 10;
        const row = document.createElement('tr');
        row.innerHTML = this.createEmptyBetRow(name).replace('value="10"', `value="${lastStake}"`);
        tbody.appendChild(row);
        
        row.querySelector('.outcome').addEventListener('change', (e) => 
            this.updateBet(name, e.target.closest('tr')));
        row.querySelector('.delete-bet').addEventListener('click', () => 
            this.deleteBet(name, Array.from(tbody.children).indexOf(row)));
    }

    async deleteBet(name, index) {
        const tbody = document.getElementById(`bets-${name}`);
        if (tbody.children.length === 1) {
            alert('Cannot delete last bet. Use Close instead.');
            return;
        }

        tbody.deleteRow(index);
        const bets = this.getBetsFromTable(name);
        await this.savePunterData(name, bets);
        this.consecutiveLosses[name] = this.calculateConsecutiveLosses(bets);
        this.updateNextBetButton(name);
        this.updateProfitLoss(name);
        this.updateOverallProfit();
    }
}

const app = new BettingApp();
