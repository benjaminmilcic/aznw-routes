import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType, Chart } from 'chart.js';
import { HourlyForecast } from '../weather.model';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(ChartDataLabels);

@Component({
    selector: 'app-rain-chart',
    imports: [BaseChartDirective],
    templateUrl: './rain-chart.component.html',
    styleUrl: './rain-chart.component.scss'
})
export class RainChartComponent implements OnInit, OnChanges {
  @Input({ required: true }) hourlyForecast: HourlyForecast[];
  @Input({ required: true }) dayIndex: number;
  dataSet: number[];
  labels: string[];
  lineChartData: ChartConfiguration['data'];
  lineChartOptions: ChartConfiguration['options'];
  clickedLabelIndex: number | null = null;

  ngOnInit(): void {
    this.dataSet = this.hourlyForecast[this.dayIndex].hours.map(
      (value) => value.precipitation_probability
    );
    this.labels = this.hourlyForecast[this.dayIndex].hours.map((value) => {
      let returnValue = value.hour.toString();
      if (returnValue.length === 1) {
        returnValue = '0' + returnValue;
      }
      returnValue += ':00';
      return returnValue;
    });

    this.lineChartData = {
      datasets: [
        {
          data: this.dataSet,
          backgroundColor: 'rgb(219, 234, 254)',
          borderColor: 'rgb(59, 130, 246)',
          fill: 'origin',
          stepped: true,
        },
      ],
      labels: this.labels,
    };

    this.lineChartOptions = {
      layout: {
        padding: {
          top: 40,
        },
      },
      elements: {
        line: {
          tension: 0.5,
        },
        point: {
          radius: 0,
          hoverRadius: 0,
          hitRadius: 0,
        },
      },
      scales: {
        y: {
          display: false,
          grid: {
            display: false,
          },
          min: 0,
          max:100,
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            callback: function (value, index) {
              return index % 3 === 0 && index !== 0
                ? this.getLabelForValue(+value)
                : '';
            },
            maxRotation: 0, // Keine Rotation
            minRotation: 0, // Keine Rotation
            autoSkip: false, // Wichtig, sonst ignoriert er manchmal Labels
          },
        },
      },

      plugins: {
        legend: { display: false },
        datalabels: {
          align: 'end',
          anchor: 'end',
          color: 'blue',
          font: { weight: 'bold' },
          offset: 20,
          formatter: (value: number) => Math.round(value)+'%',
          display: (ctx) => ctx.dataIndex % 3 === 0 && ctx.dataIndex !== 0,
        },
      },
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.ngOnInit();
  }

  public lineChartType: ChartType = 'line';

  @ViewChild(BaseChartDirective) chartDirective?: BaseChartDirective;
}
