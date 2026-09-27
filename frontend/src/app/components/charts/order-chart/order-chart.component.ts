import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

declare var google: any;

const LOADER_URL = 'https://www.gstatic.com/charts/loader.js';
let loaderPromise: Promise<void> | null = null;

/** Injeta o script do Google Charts uma única vez. */
function loadGoogleChartsScript(): Promise<void> {
  if (typeof google !== 'undefined' && google.charts?.load) return Promise.resolve();
  if (!loaderPromise) {
    loaderPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = LOADER_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loaderPromise = null;
        reject(new Error('Google Charts indisponível'));
      };
      document.head.appendChild(script);
    });
  }
  return loaderPromise;
}

/**
 * Gráfico (Google Charts) com o total das últimas encomendas do cliente.
 */
@Component({
  selector: 'app-order-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-chart.component.html',
})
export class OrderChartComponent implements OnChanges {
  @Input() data: { orderCode: string; total: number }[] = [];

  private chartLoaded = false;
  private pendingDraw = false;
  /** O script do Google Charts não carregou (sem rede ou bloqueado). */
  unavailable = false;

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

  /**
   * Carrega o Google Charts só quando o gráfico é mostrado (antes era carregado em todas as
   * páginas, pelo index.html). Assim o browser só contacta o Google nesta página.
   */
  private loadGoogleCharts() {
    loadGoogleChartsScript()
      .then(() => {
        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(() => {
          this.chartLoaded = true;
          if (this.pendingDraw) {
            this.drawChart();
            this.pendingDraw = false;
          }
        });
      })
      .catch(() => {
        this.unavailable = true;
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