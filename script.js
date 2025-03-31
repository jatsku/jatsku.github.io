document.addEventListener('DOMContentLoaded', () => {
    const supabaseClient = window.supabase.createClient(
        'https://ozaolkdkxgwqoyzmgjcd.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96YW9sa2RreGd3cW95em1namNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MzI4NzcsImV4cCI6MjA1OTAwODg3N30.kX_b_eEvKtljidsJf0xZkhx9OMMabdyg2BO0xVswkls'
    );

    class BettingApp {
        constructor() {
            this.supabaseClient = supabaseClient;
            this.consecutiveLosses = {};
            this.initializeEventListeners();
            this.loadInitialData();
        }

        initializeEventListeners() {
            document.getElementById('add-punter').addEventListener('click', () => this.handleAddPunter());
            document.getElementById('view-records').addEventListener('click', () => this.showRecords());
            document.getElementById('export-data').addEventListener('click', () => this.exportData());
            document.getElementById('import-button').addEventListener('click', () => document.getElementById('import-data').click());
            document.getElementById('import-data').addEventListener('change', (e) => this.importData(e));
            document.getElementById('clear-data').addEventListener('click', () => this.clearData());
            document.getElementById('change-view').addEventListener('click', () => this.toggleLayout());
            document.getElementById('close-modal').addEventListener('click', () => this.toggleModal(false));
            document.getElementById('check-date-profit').addEventListener('click', () => this.checkDateProfit());
            window.addEventListener('click', (e) => {
                if (e.target === document.getElementById('records-modal')) this.toggleModal(false);
            });
        }

        async loadInitialData() {
            await this.loadPunters();
            this.updateOverallProfit();
        }

        async loadPunters() {
            const { data: punters, error } = await this.supabaseClient.from('punters').select('*');
            if (error) {
                console.error('Error loading punters:', error);
                return;
            }
            for (const punter of punters) {
                const bets = await this.fetchBets(punter.id);
                this.consecutiveLosses[punter.name] = this.calculateConsecutiveLosses(bets);
                this.renderPunter(punter.name, bets);
            }
        }

        async fetchBets(punterId) {
            const { data, error } = await this.supabaseClient.from('bets').select('*').eq('punter_id', punterId);
            if (error) console.error('Error fetching bets:', error);
            return data || [];
        }

        async handleAddPunter() {
            const name = prompt('Enter punter name:');
            if (!name) return;
            const { error } = await this.supabaseClient.from('punters').insert({ name });
            if (error) {
                console.error('Add punter error:', error.message, error.code);
                alert('Failed to add punter: ' + error.message);
                return;
            }
            this.consecutiveLosses[name] = 0;
            this.renderPunter(name);
            this.updateOverallProfit();
        }

        renderPunter(name, bets = []) {
            const container = document.getElementById('punters-container');
            const punterDiv = document.createElement('div');
            punterDiv.className = 'punter-section';
            punterDiv.dataset.punter = name;

            punterDiv.innerHTML = `
                <div class="punter-header">
                    <h2>${name}</h2>
                    <button class="close-punter">Close</button>
                </div>
                <div class="profit-loss">Profit/Loss: $0.00</div>
                <div class="progress-container"><div class="progress-bar"></div></div>
                <table class="punter-table">
                    <thead>
                        <tr><th>Stake</th><th>Game</th><th>Odds</th><th>Outcome</th><th>Actions</th></tr>
                    </thead>
                    <tbody id="bets-${name}">${this.renderBets(name, bets)}</tbody>
                </table>
                <button class="next-bet" data-punter="${name}">Next Bet</button>
            `;

            container.appendChild(punterDiv);

            punterDiv.querySelector('.close-punter').addEventListener('click', () => this.closePunter(name));
            punterDiv.querySelector('.next-bet').addEventListener('click', () => this.addNextBet(name));
            
            const tbody = punterDiv.querySelector(`#bets-${name}`);
            tbody.querySelectorAll('.outcome').forEach(select => {
                select.addEventListener('change', (e) => this.updateBet(name, e.target.closest('tr')));
            });
            tbody.querySelectorAll('.delete-bet').forEach(btn => {
                btn.addEventListener('click', () => this.deleteBet(name, parseInt(btn.dataset.index)));
            });

            this.updateProfitLoss(name);
            this.updateNextBetButton(name);
        }

        renderBets(name, bets) {
            if (!bets.length) return this.createEmptyBetRow(name);
            return bets.map((bet, index) => `
                <tr class="${bet.outcome === 'W' || bet.outcome === 'w' ? 'win' : bet.outcome === 'L' ? 'loss' : ''}">
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
                    <td><button class="delete-bet" data-index="${index}">Delete</button></td>
                </tr>
            `).join('');
        }

        createEmptyBetRow(name) {
            return `
                <tr>
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
                    <td><button class="delete-bet" data-index="0">Delete</button></td>
                </tr>
            `;
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
            const { data: punter } = await this.supabaseClient.from('punters').select('id').eq('name', name).single();
            if (!punter) return;
            await this.supabaseClient.from('bets').delete().eq('punter_id', punter.id);
            if (bets.length) {
                const betData = bets.map(bet => ({ ...bet, punter_id: punter.id }));
                await this.supabaseClient.from('bets').insert(betData);
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
                // Add a small delay to ensure DB updates propagate
                await new Promise(resolve => setTimeout(resolve, 500));

                const [bets, history] = await Promise.all([
                    this.supabaseClient.from('bets').select('stake, odds, outcome'),
                    this.supabaseClient.from('history').select('profitloss')
                ]);

                console.log('Bets data:', bets.data);
                console.log('History data:', history.data);

                let profit = 0;

                if (bets.data && bets.data.length > 0) {
                    profit += bets.data.reduce((sum, bet) => {
                        if (bet.outcome === 'W') return sum + (bet.stake * (bet.odds - 1));
                        if (bet.outcome === 'w') return sum + (bet.stake * (bet.odds - 1)) / 2;
                        if (bet.outcome === 'L') return sum - bet.stake;
                        return sum;
                    }, 0);
                }

                if (history.data && history.data.length > 0) {
                    profit += history.data.reduce((sum, record) => {
                        const pl = Number(record.profitloss);
                        console.log('History record profitloss:', record.profitloss, 'Converted:', pl);
                        return sum + (isNaN(pl) ? 0 : pl);
                    }, 0);
                }

                console.log('Calculated overall profit:', profit);

                const overallProfitDiv = document.getElementById('overall-profit');
                overallProfitDiv.textContent = `Overall Profit/Loss: $${profit.toFixed(2)}`;
                overallProfitDiv.style.color = profit >= 0 ? 'green' : 'red';
            } catch (error) {
                console.error('Error updating overall profit:', error);
                const overallProfitDiv = document.getElementById('overall-profit');
                overallProfitDiv.textContent = 'Overall Profit/Loss: Error';
            }
        }

        async closePunter(name) {
            if (!confirm(`Close ${name}'s record?`)) return;
            const punterDiv = document.querySelector(`.punter-section[data-punter="${name}"]`);
            const profitLoss = parseFloat(punterDiv.querySelector('.profit-loss').textContent.replace('Profit/Loss: $', ''));

            console.log(`Attempting to close punter: ${name}, Profit/Loss: ${profitLoss}`);

            const { data: punter, error: punterError } = await this.supabaseClient
                .from('punters')
                .select('id')
                .eq('name', name)
                .single();

            if (punterError) {
                console.error('Error fetching punter:', punterError);
                alert('Failed to fetch punter: ' + punterError.message);
                return;
            }

            if (punter) {
                console.log('Punter ID:', punter.id);
                const insertPayload = {
                    punter_id: punter.id,
                    timestamp: new Date().toISOString(),
                    profitloss: profitLoss
                };
                console.log('Inserting into history:', insertPayload);

                const { data: historyData, error: insertError } = await this.supabaseClient
                    .from('history')
                    .insert(insertPayload)
                    .select();

                if (insertError) {
                    console.error('Error inserting history:', insertError, 'Full error:', JSON.stringify(insertError));
                    alert('Failed to save history: ' + insertError.message);
                    return;
                }

                console.log('Successfully inserted into history:', historyData);

                const [betsDelete, punterDelete] = await Promise.all([
                    this.supabaseClient.from('bets').delete().eq('punter_id', punter.id),
                    this.supabaseClient.from('punters').delete().eq('id', punter.id)
                ]);

                if (betsDelete.error) console.error('Error deleting bets:', betsDelete.error);
                if (punterDelete.error) console.error('Error deleting punter:', punterDelete.error);
            } else {
                console.error('No punter found with name:', name);
            }

            punterDiv.remove();
            delete this.consecutiveLosses[name];
            await this.updateOverallProfit();
        }

        async showRecords() {
            const { data: history, error } = await this.supabaseClient
                .from('history')
                .select('*, punters(name)')
                .order('timestamp', { ascending: false });

            if (error) {
                console.error('Show records error:', error.message, error.code);
                alert('Failed to load records: ' + error.message);
                return;
            }
            console.log('History data:', history);

            const grouped = {};
            history.forEach(record => {
                const name = record.punters?.name || 'Unknown';
                if (!grouped[name]) {
                    grouped[name] = { profitLoss: 0, latest: null };
                }
                grouped[name].profitLoss += record.profitloss;
                const date = new Date(record.timestamp);
                if (!grouped[name].latest || date > grouped[name].latest) {
                    grouped[name].latest = date;
                }
            });

            let html = '<table><thead><tr><th>Punter</th><th>Latest</th><th>Total</th></tr></thead><tbody>';
            if (!Object.keys(grouped).length) {
                html += '<tr><td colspan="3">No records</td></tr>';
            } else {
                Object.keys(grouped).sort().forEach(name => {
                    const { profitLoss, latest } = grouped[name];
                    html += `
                        <tr>
                            <td>${name}</td>
                            <td>${latest.toLocaleString()}</td>
                            <td style="color: ${profitLoss >= 0 ? 'green' : 'red'}">$${profitLoss.toFixed(2)}</td>
                        </tr>
                    `;
                });
            }
            html += '</tbody></table>';

            document.getElementById('records-content').innerHTML = html;
            this.toggleModal(true);
        }

        async exportData() {
            const [punters, bets, history] = await Promise.all([
                this.supabaseClient.from('punters').select('*'),
                this.supabaseClient.from('bets').select('*'),
                this.supabaseClient.from('history').select('*')
            ]);

            const data = { punters: punters.data, bets: bets.data, history: history.data };
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
                const data = JSON.parse(e.target.result);
                await Promise.all([
                    this.supabaseClient.from('punters').delete().neq('id', '0'),
                    this.supabaseClient.from('bets').delete().neq('id', '0'),
                    this.supabaseClient.from('history').delete().neq('id', '0')
                ]);
                await Promise.all([
                    this.supabaseClient.from('punters').insert(data.punters),
                    this.supabaseClient.from('bets').insert(data.bets),
                    this.supabaseClient.from('history').insert(data.history)
                ]);
                location.reload();
            };
            reader.readAsText(file);
        }

        async clearData() {
            if (!confirm('Clear all data? This cannot be undone.')) return;
            await Promise.all([
                this.supabaseClient.from('punters').delete().neq('id', '0'),
                this.supabaseClient.from('bets').delete().neq('id', '0'),
                this.supabaseClient.from('history').delete().neq('id', '0')
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
            if (!date) return alert('Please select a date');
            const start = `${date}T00:00:00Z`;
            const end = `${date}T23:59:59Z`;
            const { data, error } = await this.supabaseClient
                .from('history')
                .select('profitloss')
                .gte('timestamp', start)
                .lte('timestamp', end);
            if (error) {
                console.error('Error checking date profit:', error);
                return;
            }
            const total = data.reduce((sum, record) => sum + record.profitloss, 0);
            document.getElementById('date-profit-result').innerHTML = `Profit/Loss on ${date}: $${total.toFixed(2)}`;
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
            row.querySelector('.outcome').addEventListener('change', (e) => this.updateBet(name, e.target.closest('tr')));
            row.querySelector('.delete-bet').addEventListener('click', () => this.deleteBet(name, Array.from(tbody.children).indexOf(row)));
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
});
