Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.display = false;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const res = await fetch('/api/deep-analysis');
    const data = await res.json();

    renderKPIs(data.kpis);
    renderTrend(data.trend);
    renderStates(data.states);
    renderDemographics(data.demographics);
    renderTable(data.table);

    // Insights
    const topState = data.states.labels[0] || "Unknown";
    document.getElementById('insight-trend').innerText = data.kpis.growth_rate >= 0 ? "Growth Upward" : "Steady Pace";
    document.getElementById('insight-comp').innerText = `${topState} leads volume`;
}

function renderKPIs(kpi) {
    document.getElementById('k-total').innerText = kpi.total.toLocaleString();
    document.getElementById('k-growth').innerText = kpi.growth_rate + "%";
    document.getElementById('k-top').innerText = kpi.top_state;
    document.getElementById('k-districts').innerText = kpi.districts;

    const growthEl = document.getElementById('k-growth');
    growthEl.style.color = kpi.growth_rate >= 0 ? '#34d399' : '#f87171';
}

function renderTrend(data) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.5)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Enrolments',
                data: data.data,
                borderColor: '#6366f1',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

function renderStates(data) {
    new Chart(document.getElementById('statesChart'), {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Total Enrolments',
                data: data.data,
                backgroundColor: '#a855f7',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { grid: { display: false } }
            }
        }
    });
}

function renderDemographics(data) {
    new Chart(document.getElementById('demographicsChart'), {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: ['#6366f1', '#a855f7', '#ec4899'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
            },
            cutout: '70%'
        }
    });
}

function renderTable(rows) {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = rows.map(r => `
        <tr>
            <td style="color: #f1f5f9; font-weight: 500;">${r.state}</td>
            <td style="color: #94a3b8;">${r.district}</td>
            <td>${r.age_0_5.toLocaleString()}</td>
            <td>${r.age_5_17.toLocaleString()}</td>
            <td>${r.age_18_greater.toLocaleString()}</td>
            <td style="color: #a855f7; font-weight: bold;">${r.total.toLocaleString()}</td>
        </tr>
    `).join('');
}