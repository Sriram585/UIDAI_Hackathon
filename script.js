Chart.defaults.color = '#64748b'; // Slate-500
Chart.defaults.borderColor = '#e2e8f0'; // Slate-200
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.display = false;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const res = await fetch('/api/deep-analysis');
    const data = await res.json();

    renderKPIs(data.kpis);
    renderTrend(data.trend);
    renderAgeTrend(data.age_trend);
    renderChildHotspots(data.child_hotspots);
    renderStateDemographics(data.state_demographics);
    renderStates(data.states);
    renderDemographics(data.demographics);
    renderMomentum(data.momentum);

    // Render AI Strategic Insights
    if (data.user_insights) {
        renderInsights(data.user_insights);
    }

    // Insights
    const topState = data.states.labels[0] || "Unknown";
    document.getElementById('insight-trend').innerText = data.kpis.growth_rate >= 0 ? "Growth Upward" : "Steady Pace";
    document.getElementById('insight-comp').innerText = `${topState} leads volume`;

    if (data.advice) {
        renderAdvice(data.advice);
    }

    // Attach Click Events to Charts
    setupChartClicks(data);
}

function setupChartClicks(data) {
    // Define Insights for each chart type
    const insights = {
        'trendChart': {
            title: 'Historical Enrolment Trend',
            desc: 'This chart tracks the total number of enrolments month-over-month. The shaded area represents the total volume. A rising line indicates increasing coverage.',
            takeaway: data.kpis.growth_rate > 0 ? 'Enrolments are growing steadily. Maintain current outreach programs.' : 'Enrolments have plateaued or dipped. Investigate potential bottlenecks.'
        },
        'stateDemographicsChart': {
            title: 'State vs Age Composition',
            desc: 'This stacked bar chart breaks down the enrolment types (Child, Youth, Adult) for the top 5 performing states. It reveals the "quality" of enrolments.',
            takeaway: 'Check if high-volume states are driving child enrolments or just adult updates.'
        },
        'ageTrendChart': {
            title: 'Age Group Trends (Monthly)',
            desc: 'A monthly view of how different age cohorts are behaving. Useful for spotting seasonal spikes in child enrolments (e.g., school admission season).',
            takeaway: 'Look for green/blue spikes which indicate successful child enrolment drives.'
        },
        'childHotspotChart': {
            title: 'Child Enrolment Hotspots (0-5)',
            desc: 'Ranking of the top districts specifically for child enrolments. These are your best-performing areas for birth capture.',
            takeaway: 'Replicate the strategies used in these top districts to other regions.'
        },
        'momentumChart': {
            title: 'Growth Momentum',
            desc: 'Green bars show states that grew the most since last month. Red bars show states that declined.',
            takeaway: 'Focus immediate attention on the "Decelerators" (Red bars) to reverse the negative trend.'
        },
        'statesChart': {
            title: 'Total Enrolment Leaderboard',
            desc: 'A simple ranking of states by total volume since inception of this dataset.',
            takeaway: 'The top 3 states usually contribute 40-50% of total national volume.'
        },
        'patternChart': {
            title: 'AI Pattern Analysis',
            desc: 'A scatter plot correlating Total Volume (X-axis) with Child Ratio (Y-axis). High Y-value means a state is very efficient at enrolling children relative to its size.',
            takeaway: 'States in the top-left quadrant are "Child Specialists" - efficient despite lower volume.'
        },
        'trendDeepChart': {
            title: 'Deep Trend Velocity',
            desc: 'Compares the speed of growth between Children and Adults. Diverging lines indicate a shift in focus.',
            takeaway: 'If the Green line (Child) is above the Grey line (Adult), the ecosystem is healthy and future-proof.'
        },
        'anomalyChart': {
            title: 'Anomaly Detection System',
            desc: 'Highlights specific days and districts where enrolment numbers were statistically improbable (Z-Score > 3).',
            takeaway: 'Large bubbles require immediate audit for potential fraud or data entry errors.'
        },
        'predictionChart': {
            title: 'AI Future Forecast',
            desc: 'A linear projection of future enrolments based on the last 12 months of data.',
            takeaway: 'Use this forecast to plan server capacity and manpower allocation for the coming quarter.'
        }
    };

    // Attach listener to all charts
    Object.keys(insights).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Find parent card
            const card = el.closest('.chart-card');
            if (card) {
                card.onclick = () => openModal(insights[id]);
            }
        }
    });
}

function openModal(info) {
    document.getElementById('m-title').innerText = info.title;
    document.getElementById('m-body').innerText = info.desc;
    document.getElementById('m-insight').innerText = "Takeaway: " + info.takeaway;

    document.getElementById('analysisModal').classList.add('active');
}

window.closeModal = function () {
    document.getElementById('analysisModal').classList.remove('active');
}

// Close on outside click
document.getElementById('analysisModal').onclick = (e) => {
    if (e.target === document.getElementById('analysisModal')) closeModal();
}

function renderMomentum(data) {
    const colors = data.data.map(val => val >= 0 ? '#22c55e' : '#ef4444'); // Green for positive, Red for negative

    new Chart(document.getElementById('momentumChart'), {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'MoM Growth %',
                data: data.data,
                backgroundColor: colors,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { color: '#f1f5f9' },
                    title: { display: true, text: 'Month-over-Month Growth %' }
                },
                y: { grid: { display: false } }
            }
        }
    });
}

function renderKPIs(kpi) {
    document.getElementById('k-total').innerText = kpi.total.toLocaleString();
    document.getElementById('k-growth').innerText = kpi.growth_rate + "%";
    document.getElementById('k-top').innerText = kpi.top_state;
    document.getElementById('k-districts').innerText = kpi.districts;

    const growthEl = document.getElementById('k-growth');
    // Using green for positive, red for negative, but slightly darker for contrast
    growthEl.style.color = kpi.growth_rate >= 0 ? '#16a34a' : '#dc2626';
}

function renderTrend(data) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    // Blue gradient for professional look
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.2)'); // Blue-600 low opacity
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Enrolments',
                data: data.data,
                borderColor: '#2563eb', // Blue-600
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#2563eb',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#f1f5f9' }, beginAtZero: true } // Very light grid
            }
        }
    });
}

function renderAgeTrend(data) {
    new Chart(document.getElementById('ageTrendChart'), {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                { label: '0-5 Years', data: data.age_0_5, backgroundColor: '#2563eb', stack: 'Stack 0' },
                { label: '5-17 Years', data: data.age_5_17, backgroundColor: '#6366f1', stack: 'Stack 0' },
                { label: '18+ Years', data: data.age_18_plus, backgroundColor: '#0ea5e9', stack: 'Stack 0' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, grid: { color: '#f1f5f9' } }
            }
        }
    });
}

function renderChildHotspots(data) {
    new Chart(document.getElementById('childHotspotChart'), {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Child Enrolments (0-5)',
                data: data.data,
                backgroundColor: '#ec4899', // Pink-500
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#f1f5f9' } },
                y: { grid: { display: false } }
            }
        }
    });
}


function renderStateDemographics(data) {
    new Chart(document.getElementById('stateDemographicsChart'), {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                { label: '0-5 Years', data: data.age_0_5, backgroundColor: '#2563eb' },
                { label: '5-17 Years', data: data.age_5_17, backgroundColor: '#6366f1' },
                { label: '18+ Years', data: data.age_18_greater, backgroundColor: '#0ea5e9' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, grid: { color: '#f1f5f9' } }
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
                backgroundColor: '#3b82f6', // Blue-500
                borderRadius: 4,
                barThickness: 20
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#f1f5f9' } },
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
                // Professional tricolor
                backgroundColor: ['#2563eb', '#6366f1', '#0ea5e9'], // Blue, Indigo, Sky
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { size: 11 } } }
            },
            cutout: '75%'
        }
    });
}




function renderInsights(insights) {
    renderPatternChart(insights.patterns);
    renderDeepTrendChart(insights.trends);
    renderAnomalyChart(insights.anomalies);
    renderPredictionChart(insights.predictions);
}

function renderPatternChart(data) {
    new Chart(document.getElementById('patternChart'), {
        type: 'scatter',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            return `${ctx.raw.state}: ${ctx.raw.y}% Child Ratio (Vol: ${ctx.raw.x})`;
                        }
                    }
                },
                legend: { display: false }
            },
            scales: {
                x: { title: { display: true, text: 'Total Enrolment Volume' }, type: 'logarithmic', grid: { display: false } },
                y: { title: { display: true, text: 'Child Enrolment Ratio (%)' }, grid: { color: '#f1f5f9' } }
            }
        }
    });
}

function renderDeepTrendChart(data) {
    new Chart(document.getElementById('trendDeepChart'), {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Child Growth %',
                    data: data.child_growth,
                    borderColor: '#16a34a', // Green
                    tension: 0.3,
                    borderWidth: 2
                },
                {
                    label: 'Adult Growth %',
                    data: data.adult_growth,
                    borderColor: '#94a3b8', // Slate
                    borderDash: [5, 5],
                    tension: 0.3,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#f1f5f9' }, title: { display: true, text: 'MoM Growth %' } }
            }
        }
    });
}

function renderAnomalyChart(data) {
    new Chart(document.getElementById('anomalyChart'), {
        type: 'bubble',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            return `${ctx.raw.district}: Z-Score ${ctx.raw.y}`;
                        }
                    }
                },
                legend: { display: false }
            },
            scales: {
                x: { type: 'category', grid: { display: false } }, // Dates as category
                y: { title: { display: true, text: 'Deviation (Z-Score)' }, grid: { color: '#f1f5f9' } }
            }
        }
    });
}

function renderPredictionChart(data) {
    new Chart(document.getElementById('predictionChart'), {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Actual History',
                    data: data.actual,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'AI Forecast',
                    data: data.forecast,
                    borderColor: '#9333ea', // Purple
                    borderDash: [5, 5],
                    pointStyle: 'rectRot',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#f1f5f9' } }
            }
        }
    });
}

function renderAdvice(adviceList) {
    const container = document.getElementById('adviceContainer');
    container.innerHTML = adviceList.map(item => `
        <div class="advice-card ${item.severity}">
            <div class="advice-header">
                <div class="advice-title">${item.title}</div>
                <div class="severity-badge">${item.severity} Priority</div>
            </div>
            
            <div class="finding-box">
                <div class="finding-label">Observation</div>
                <div class="finding-text">${item.finding}</div>
            </div>
            
            <div class="finding-label">Implication</div>
            <div class="impl-text">"${item.impl}"</div>
            
            <div class="action-box">
                <div class="action-label">Recommended Framework</div>
                <div class="action-text">${item.action}</div>
            </div>
        </div>
    `).join('');
}