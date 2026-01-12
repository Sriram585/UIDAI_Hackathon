Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
Chart.defaults.font.family = "'Inter', sans-serif";

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const res = await fetch('/api/deep-analysis');
    const data = await res.json();

    renderKPIs(data.kpis);
    renderForecast(data.forecast);
    renderPolar(data.polar);
    renderRadar(data.radar);
    renderAnomalies(data.anomalies);
    renderTable(data.table);

    // Auto-Generate Insights
    const trend = data.forecast.slope > 0 ? "Positive Growth" : "Declining";
    document.getElementById('insight-trend').innerText = trend;
    document.getElementById('insight-comp').innerText = `${data.polar.labels[0]} leads market`;
}

function renderKPIs(kpi) {
    document.getElementById('k-total').innerText = kpi.total.toLocaleString();
    document.getElementById('k-growth').innerText = kpi.growth_rate + "%";
    document.getElementById('k-top').innerText = kpi.top_state;
    document.getElementById('k-districts').innerText = kpi.districts;

    // Dynamic Color
    document.getElementById('k-growth').style.color = kpi.growth_rate >= 0 ? '#34d399' : '#f87171';
}

function renderForecast(data) {
    if (!data.labels) return;
    new Chart(document.getElementById('forecastChart'), {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                { label: 'Actual', data: data.actual, borderColor: '#818cf8', backgroundColor: 'rgba(129, 140, 248, 0.2)', fill: true, tension: 0.4 },
                { label: 'Projection', data: data.projected, borderColor: '#f472b6', borderDash: [5, 5], pointRadius: 0 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } } }
    });
}

function renderPolar(data) {
    new Chart(document.getElementById('polarChart'), {
        type: 'polarArea',
        data: {
            labels: data.labels,
            datasets: [{ data: data.values, backgroundColor: ['#818cf8', '#f472b6', '#34d399', '#facc15', '#fb7185'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function renderRadar(data) {
    new Chart(document.getElementById('radarChart'), {
        type: 'radar',
        data: data,
        options: {
            responsive: true, maintainAspectRatio: false,
            elements: { line: { borderWidth: 3 } },
            scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' } } }
        }
    });
}

function renderAnomalies(data) {
    const points = data.values.map((v, i) => ({ x: i, y: v, d: data.districts[i] }));
    new Chart(document.getElementById('anomalyChart'), {
        type: 'scatter',
        data: { datasets: [{ label: 'Outliers', data: points, backgroundColor: '#facc15' }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { display: false } },
            plugins: { tooltip: { callbacks: { label: c => `${c.raw.d}: ${c.raw.y.toLocaleString()}` } } }
        }
    });
}

function renderTable(rows) {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = rows.map(r => `
        <tr>
            <td>${r.state}</td>
            <td style="color:white; font-weight:bold;">${r.district}</td>
            <td>${r.age_0_5.toLocaleString()}</td>
            <td>${r.age_5_17.toLocaleString()}</td>
            <td>${r.age_18_greater.toLocaleString()}</td>
            <td style="color: #818cf8;">${r.total.toLocaleString()}</td>
        </tr>
    `).join('');
}