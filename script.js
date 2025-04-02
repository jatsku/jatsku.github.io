document.addEventListener('DOMContentLoaded', () => {
    const supabaseClient = window.supabase.createClient(
        'https://ozaolkdkxgwqoyzmgjcd.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96YW9sa2RreGd3cW95em1namNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MzI4NzcsImV4cCI6MjA1OTAwODg3N30.kX_b_eEvKtljidsJf0xZkhx9OMMabdyg2BO0xVswkls'
    );

    class BettingApp {
        constructor() {
            this.supabaseClient = supabaseClient;
            this.consecutiveLosses = {};
            this.sessionStartTimes = {};
            this.initializeEventListeners();
            this.loadInitialData();
        }

        initializeEventListeners() {
            document.getElementById('add-punter').addEventListener('click', () => this.handleAddPunter());
            document.getElementById('clear-data').addEventListener('click', () => this.clearData());
            document.getElementById('change-view').addEventListener('click', () => this.toggleLayout());
            document.getElementById('view-dashboard').addEventListener('click', () => this.showDashboard());
        }

        async loadInitialData() {
            await this.loadPunters();
            this.updateOverallProfit();
        }

        async loadPunters() {
            const { data: punters, error } = await this.supabaseClient
                .from('punters')
                .select('*')
                .eq('closed', false);
            if (error) {
                console.error('Error loading punters:', error);
                return;
            }
            for (const punter of punters) {
                const bets = await this.fetchBets(punter.id);
                this.consecutiveLosses[punter.name] = this.calculateConsecutiveLosses(bets);
                this.sessionStartTimes[punter.name] = new Date().toISOString();
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

            const { data: existingPunter, error: checkError } = await this.supabaseClient
                .from('punters')
                .select('id, closed')
                .eq('name', name)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking punter:', checkError);
                alert('Error checking punter: ' + checkError.message);
                return;
            }

            const sessionStart = new Date().toISOString();

            if (existingPunter) {
                if (!existingPunter.closed) {
                    alert(`Punter "${name}" is already active. Please close it before starting a new session.`);
                    return;
                }

                const { data: lastSession, error: historyError } = await this.supabaseClient
                    .from('history')
                    .select('bets')
                    .eq('punter_id', existingPunter.id)
                    .order('timestamp', { ascending: false })
                    .limit(1)
                    .single();

                let betsToLoad = [];
                if (!historyError && lastSession && lastSession.bets) {
                    const lastBets = lastSession.bets;
                    const hasThreeConsecutiveLosses = this.calculateConsecutiveLosses(lastBets) >= 3;
                    if (!hasThreeConsecutiveLosses) {
                        betsToLoad = lastBets;
                    }
                }

                const { error: updateError } = await this.supabaseClient
                    .from('punters')
                    .update({ closed: false })
                    .eq('id', existingPunter.id);
                if (updateError) {
                    console.error('Error reopening punter:', updateError);
                    alert('Failed to reopen punter: ' + updateError.message);
                    return;
                }

                await this.supabaseClient.from('bets').delete().eq('punter_id', existingPunter.id);
                if (betsToLoad.length > 0) {
                    const betData = betsToLoad.map(bet => ({ ...bet, punter_id: existingPunter.id }));
                    await this.supabaseClient.from('bets').insert(betData);
                }

                this.consecutiveLosses[name] = this.calculateConsecutiveLosses(betsToLoad);
                this.sessionStartTimes[name] = sessionStart;
                this.renderPunter(name, betsToLoad);
            } else {
                const { error: insertError } = await this.supabaseClient.from('punters').insert({ name, closed: false });
                if (insertError) {
                    console.error('Add punter error:', insertError.message, insertError.code);
                    alert('Failed to add punter: ' + insertError.message);
                    return;
                }
                this.consecutiveLosses[name] = 0;
                this.sessionStartTimes[name] = sessionStart;
                this.renderPunter(name);
            }
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
                <div class="profit-loss">Profit/Loss: €0.00</div>
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
            if (bets.length < 3) return bets.filter(bet => bet.outcome === 'L').length;
            const lastThreeBets = bets.slice(-3);
            return lastThreeBets.every(bet => bet.outcome === 'L') ? 3 : 0;
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
                game: row.querySelector('.game').value || null,
                odds: parseFloat(row.querySelector('.odds').value) || 0,
                outcome: row.querySelector('.outcome').value || null
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
            profitLossDiv.textContent = `Profit/Loss: €${profitLoss.toFixed(2)}`;
            profitLossDiv.style.color = profitLoss >= 0 ? 'green' : 'red';

            const progressBar = punterDiv.querySelector('.progress-bar');
            const progress = Math.min(Math.abs(profitLoss) / 1000 * 100, 100);
            progressBar.style.width = `${progress}%`;
            progressBar.style.backgroundColor = profitLoss >= 0 ? 'green' : 'red';
        }

        async updateOverallProfit() {
            try {
                const [bets, history] = await Promise.all([
                    this.supabaseClient.from('bets').select('stake, odds, outcome'),
                    this.supabaseClient.from('history').select('profitloss')
                ]);

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
                        return sum + (isNaN(pl) ? 0 : pl);
                    }, 0);
                }

                const overallProfitDiv = document.getElementById('overall-profit');
                overallProfitDiv.textContent = `Overall Profit/Loss: €${profit.toFixed(2)}`;
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
            const profitLoss = parseFloat(punterDiv.querySelector('.profit-loss').textContent.replace('Profit/Loss: €', ''));
            const bets = this.getBetsFromTable(name);
            const sessionStop = new Date().toISOString();
            const sessionStart = this.sessionStartTimes[name];

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
                const insertPayload = {
                    punter_id: punter.id,
                    timestamp: sessionStop,
                    profitloss: profitLoss,
                    bets: JSON.parse(JSON.stringify(bets)),
                    session_start: sessionStart,
                    session_stop: sessionStop
                };

                const { error: insertError } = await this.supabaseClient
                    .from('history')
                    .insert([insertPayload]);

                if (insertError) {
                    console.error('Error inserting history:', insertError.message, insertError.details);
                    alert('Failed to save history: ' + insertError.message);
                    return;
                }

                const { error: updateError } = await this.supabaseClient
                    .from('punters')
                    .update({ closed: true })
                    .eq('id', punter.id);
                if (updateError) {
                    console.error('Error marking punter as closed:', updateError);
                    alert('Failed to close punter: ' + updateError.message);
                    return;
                }

                const { error: betsDeleteError } = await this.supabaseClient
                    .from('bets')
                    .delete()
                    .eq('punter_id', punter.id);
                if (betsDeleteError) console.error('Error deleting bets:', betsDeleteError);
            }

            punterDiv.remove();
            delete this.consecutiveLosses[name];
            delete this.sessionStartTimes[name];
            await this.updateOverallProfit();
        }

        async clearData() {
            if (!confirm('Clear all data? This cannot be undone.')) return;
            try {
                const [punterRes, betsRes, historyRes] = await Promise.all([
                    this.supabaseClient.from('punters').delete().neq('name', '').select(),
                    this.supabaseClient.from('bets').delete().gt('punter_id', '00000000-0000-0000-0000-000000000000').select(),
                    this.supabaseClient.from('history').delete().gt('punter_id', '00000000-0000-0000-0000-000000000000').select()
                ]);

                if (punterRes.error) throw punterRes.error;
                if (betsRes.error) throw betsRes.error;
                if (historyRes.error) throw historyRes.error;

                location.reload();
            } catch (error) {
                console.error('Error clearing data:', error.message, error.code);
                alert('Failed to clear data: ' + error.message);
            }
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

        addNextBet(name) {
            if (this.consecutiveLosses[name] >= 3) {
                alert(`${name} has 3 consecutive losses. Please close the session.`);
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

        async deletePunter(punterId, punterName) {
            if (!confirm(`Are you sure you want to delete "${punterName}" and all their data? This cannot be undone.`)) return;

            try {
                // Delete from all three tables: punters, bets, and history
                const [punterRes, betsRes, historyRes] = await Promise.all([
                    this.supabaseClient.from('punters').delete().eq('id', punterId),
                    this.supabaseClient.from('bets').delete().eq('punter_id', punterId),
                    this.supabaseClient.from('history').delete().eq('punter_id', punterId)
                ]);

                if (punterRes.error) throw punterRes.error;
                if (betsRes.error) throw betsRes.error;
                if (historyRes.error) throw historyRes.error;

                // Remove from UI if currently displayed
                const punterDiv = document.querySelector(`.punter-section[data-punter="${punterName}"]`);
                if (punterDiv) punterDiv.remove();

                delete this.consecutiveLosses[punterName];
                delete this.sessionStartTimes[punterName];

                await this.updateOverallProfit();
                alert(`Punter "${punterName}" deleted successfully.`);
            } catch (error) {
                console.error('Error deleting punter:', error);
                alert(`Failed to delete punter: ${error.message}`);
            }
        }

        async loadDashboardData() {
            try {
                const { data: punters, error: punterError } = await this.supabaseClient
                    .from('punters')
                    .select('id, name');
                if (punterError) throw punterError;

                const { data: history, error: historyError } = await this.supabaseClient
                    .from('history')
                    .select('punter_id, profitloss, timestamp, bets, session_start, session_stop')
                    .order('timestamp', { ascending: false });
                if (historyError) throw historyError;

                const { data: bets, error: betsError } = await this.supabaseClient
                    .from('bets')
                    .select('punter_id, stake, odds, outcome');
                if (betsError) throw betsError;

                const punterStats = {};
                punters.forEach(punter => {
                    punterStats[punter.id] = {
                        name: punter.name,
                        totalProfitLoss: 0,
                        wins: 0,
                        losses: 0,
                        activeProfitLoss: 0,
                        sessions: []
                    };
                });

                history.forEach(record => {
                    const stats = punterStats[record.punter_id];
                    if (stats) {
                        stats.totalProfitLoss += record.profitloss;
                        if (record.profitloss > 0) stats.wins++;
                        else if (record.profitloss < 0) stats.losses++;
                        stats.sessions.push({ 
                            profitloss: record.profitloss, 
                            timestamp: record.timestamp, 
                            bets: record.bets || [],
                            session_start: record.session_start,
                            session_stop: record.session_stop
                        });
                    }
                });

                bets.forEach(bet => {
                    const stats = punterStats[bet.punter_id];
                    if (stats) {
                        if (bet.outcome === 'W') stats.activeProfitLoss += bet.stake * (bet.odds - 1);
                        else if (bet.outcome === 'w') stats.activeProfitLoss += (bet.stake * (bet.odds - 1)) / 2;
                        else if (bet.outcome === 'L') stats.activeProfitLoss -= bet.stake;
                    }
                });

                return Object.values(punterStats);
            } catch (error) {
                console.error('Error loading dashboard data:', error);
                return [];
            }
        }

        async showDashboard() {
            const stats = await this.loadDashboardData();
            const container = document.createElement('div');
            container.id = 'dashboard-modal';
            container.style.cssText = `
                position: fixed; top: 10%; left: 10%; width: 80%; max-height: 80%; 
                background: white; border: 1px solid #ccc; padding: 20px; overflow-y: auto;
                z-index: 1000;
            `;

            let html = `
                <h2>Profit/Loss Dashboard</h2>
                <button id="close-dashboard" style="float: right;">Close</button>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f2f2f2;">
                            <th style="padding: 8px; border: 1px solid #ddd;">Punter</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">Total P/L</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">Active P/L</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">Session Wins</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">Session Losses</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            stats.forEach(stat => {
                html += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">${stat.name}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; color: ${stat.totalProfitLoss >= 0 ? 'green' : 'red'}">
                            €${stat.totalProfitLoss.toFixed(2)}
                        </td>
                        <td style="padding: 8px; border: 1px solid #ddd; color: ${stat.activeProfitLoss >= 0 ? 'green' : 'red'}">
                            €${stat.activeProfitLoss.toFixed(2)}
                        </td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${stat.wins}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${stat.losses}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            <button class="show-details" data-name="${stat.name}">Details</button>
                            <button class="delete-punter" data-id="${stat.id}" data-name="${stat.name}" style="margin-left: 5px; background: #ff4444; color: white;">Delete</button>
                        </td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;
            container.innerHTML = html;
            document.body.appendChild(container);

            document.getElementById('close-dashboard').addEventListener('click', () => container.remove());

            document.querySelectorAll('.show-details').forEach(btn => {
                btn.addEventListener('click', () => {
                    const name = btn.dataset.name;
                    const stat = stats.find(s => s.name === name);
                    const detailsModal = document.createElement('div');
                    detailsModal.style.cssText = `
                        position: fixed; top: 15%; left: 15%; width: 70%; max-height: 70%; 
                        background: white; border: 1px solid #ccc; padding: 20px; overflow-y: auto;
                        z-index: 1001;
                    `;
                    let detailsHtml = `
                        <h3>${name}'s Session History</h3>
                        <button id="close-details" style="float: right;">Close</button>
                    `;
                    if (stat.sessions.length === 0) {
                        detailsHtml += `<p>No sessions yet</p>`;
                    } else {
                        stat.sessions.forEach(session => {
                            const startDate = new Date(session.session_start || session.timestamp);
                            const stopDate = new Date(session.session_stop || session.timestamp);
                            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                            const formatTime = (date) => `${dayNames[date.getDay()]}, ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                            const startFormatted = formatTime(startDate);
                            const stopFormatted = formatTime(stopDate);
                            detailsHtml += `
                                <div style="margin-bottom: 20px;">
                                    <h4>Session Start: ${startFormatted} - Stop: ${stopFormatted}</h4>
                                    <p>Profit/Loss: <span style="color: ${session.profitloss >= 0 ? 'green' : 'red'}">€${session.profitloss.toFixed(2)}</span></p>
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead>
                                            <tr style="background: #f2f2f2;">
                                                <th style="padding: 8px; border: 1px solid #ddd;">Stake</th>
                                                <th style="padding: 8px; border: 1px solid #ddd;">Game</th>
                                                <th style="padding: 8px; border: 1px solid #ddd;">Odds</th>
                                                <th style="padding: 8px; border: 1px solid #ddd;">Outcome</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                            `;
                            if (!session.bets || session.bets.length === 0) {
                                detailsHtml += `<tr><td colspan="4" style="padding: 8px; border: 1px solid #ddd;">No bets recorded</td></tr>`;
                            } else {
                                session.bets.forEach(bet => {
                                    detailsHtml += `
                                        <tr>
                                            <td style="padding: 8px; border: 1px solid #ddd;">€${bet.stake.toFixed(2)}</td>
                                            <td style="padding: 8px; border: 1px solid #ddd;">${bet.game || 'N/A'}</td>
                                            <td style="padding: 8px; border: 1px solid #ddd;">${bet.odds.toFixed(2)}</td>
                                            <td style="padding: 8px; border: 1px solid #ddd;">${bet.outcome || '--'}</td>
                                        </tr>
                                    `;
                                });
                            }
                            detailsHtml += `
                                        </tbody>
                                    </table>
                                </div>
                            `;
                        });
                    }
                    detailsModal.innerHTML = detailsHtml;
                    document.body.appendChild(detailsModal);
                    document.getElementById('close-details').addEventListener('click', () => detailsModal.remove());
                });
            });

            document.querySelectorAll('.delete-punter').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const punterId = btn.dataset.id;
                    const punterName = btn.dataset.name;
                    await this.deletePunter(punterId, punterName);
                    container.remove(); // Close current dashboard
                    this.showDashboard(); // Reopen updated dashboard
                });
            });
        }
    }

    const app = new BettingApp();
});
