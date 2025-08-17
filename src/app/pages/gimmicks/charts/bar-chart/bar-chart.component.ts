import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartEvent } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

@Component({
    selector: 'app-bar-chart',
    imports: [BaseChartDirective],
    templateUrl: './bar-chart.component.html',
    styleUrl: './bar-chart.component.css'
})
export class BarChartComponent implements OnInit {
  @Input() chartValues: { '2022': number; '2023': number };
  @Input() chartBgColor: string;

  @ViewChild(BaseChartDirective) chart: BaseChartDirective<'bar'> | undefined;

  barChartType = 'bar' as const;
  barChartData: ChartData<'bar'>;
  barChartPlugins;

  ngOnInit(): void {
    this.barChartData = {
      labels: ['2022', '2023'],
      datasets: [
        {
          data: [+this.chartValues[2022], +this.chartValues[2023]],
          backgroundColor: ['#FFCD56', '#9966FF'],
        },
      ],
    };

    let custom_canvas_background_color = {
      id: 'custom_canvas_background_color',
      beforeDraw: (chart, args, options) => {
        const {
          ctx,
          chartArea: { top, right, bottom, left, width, height },
          scales: { x, y },
        } = chart;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = this.chartBgColor;
        ctx.fillRect(left, top, width, height);
        ctx.restore();
      },
    };

    this.barChartPlugins = [ChartDataLabels, custom_canvas_background_color];
  }

  getBarChartOptions(): ChartConfiguration<'bar'>['options'] {
    let labels;
    if (window.innerWidth < 640) {
      labels = { title: { font: { size: 10 } } };
    } else {
      labels = { title: { font: { weight: 'bold' } } };
    }
    return {
      scales: {
        x: { grid: { display: false } },
        y: { display: false, grid: { display: false } },
      },
      plugins: {
        datalabels: {
          formatter(value, context) {
            let isInteger = true;
            context.dataset.data.forEach((data) => {
              if (!Number.isInteger(data)) {
                isInteger = false;
                return;
              }
            });
            if (isInteger) {
              return value.toFixed(0);
            } else {
              return value.toFixed(2);
            }
          },
          color: 'black',
          labels,
        },
        tooltip: {
          enabled: false,
        },
        legend: {
          display: false,
        },
      },
    };
  }
}
