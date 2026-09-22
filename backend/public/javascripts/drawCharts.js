google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(initCharts);

function initCharts() {
    drawPieChart('ordersStateChart', 'orderStatsData', 'Estado', 'Número de Encomendas', 'Encomendas por Estado');
}

function drawPieChart(chartElementId, dataElementId, column1Label, column2Label, chartTitle) {
    const arrayData = buildArrayData(dataElementId, (item) => [item.state, Number(item.count)]);
    if (!arrayData) return;

    const data = google.visualization.arrayToDataTable([
        [column1Label, column2Label],
        ...arrayData
    ]);

    const options = {
        title: chartTitle,
        pieHole: 0.4,
        colors: ['#0d6efd', '#ffc107', '#20c997', '#198754', '#dc3545'],
        chartArea: { width: '90%', height: '80%' },
        legend: { position: 'bottom' },
        pieSliceText: 'none'
    };

    const chart = new google.visualization.PieChart(document.getElementById(chartElementId));
    chart.draw(data, options);
}

function buildArrayData(dataElementId, mapFunction, lastNDays = null) {
    const dataElement = document.getElementById(dataElementId);
    if (!dataElement) {
        console.error(`Elemento com id "${dataElementId}" não encontrado.`);
        return null;
    }

    const rawData = dataElement.getAttribute('data-chart');
    if (!rawData) {
        console.error(`Atributo data-chart vazio no elemento "${dataElementId}".`);
        return null;
    }

    let parsedData;
    try {
        parsedData = JSON.parse(rawData);
    } catch (e) {
        console.error('Erro a fazer parse dos dados JSON:', e);
        return null;
    }

    if (lastNDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - lastNDays);

        parsedData = parsedData.filter(item => new Date(item.date) >= cutoffDate);
    }

    return parsedData.map(mapFunction);
}