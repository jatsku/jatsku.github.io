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

    // Clear data
    const clearDataButton = document.getElementById('clear-data');
    clearDataButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            localStorage.setItem('punterData', JSON.stringify({}));
            alert('All data cleared! Reloading page...');
            location.reload();
        }
    });
});
