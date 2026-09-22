import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

declare var google: any;

@Component({
  selector: 'app-order-chart',
  standalone: true,
  templateUrl: './order-chart.component.html',
})
export class OrderChartComponent implements OnChanges {
  @Input() data: { orderCode: string; total: number }[] = [];

  private chartLoaded = false;
  private pendingDraw = false;

  constructor() {
    this.loadGoogleCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data.length) {
      if (this.chartLoaded) {
        this.drawChart();
      } else {
        this.pendingDraw = true;
      }
    }
  }

  private loadGoogleCharts() {
    // typeof evita um ReferenceError quando o script do Google Charts não foi carregado.
    if (typeof google === 'undefined' || !google.charts?.load) {
      console.error('Google Charts não está disponível. Verifique se o script está incluído no index.html');
      return;
    }

    google.charts.load('current', { packages: ['corechart'] });
    google.charts.setOnLoadCallback(() => {
      this.chartLoaded = true;
      if (this.pendingDraw) {
        this.drawChart();
        this.pendingDraw = false;
      }
    });
  }

  private drawChart() {
    if (!this.data.length) return;

    const chartData: (string | number)[][] = [['Código', 'Total']];
    this.data.forEach(d => chartData.push([d.orderCode, d.total]));

    const dataTable = google.visualization.arrayToDataTable(chartData);

    const options = {
      title: 'Totais das Últimas Encomendas',
      hAxis: { title: 'Código da Encomenda' },
      vAxis: { title: 'Total (€)' },
      legend: 'none',
    };

    const chart = new google.visualization.ColumnChart(
      document.getElementById('orderTotalsChart')
    );

    chart.draw(dataTable, options);
  }
}