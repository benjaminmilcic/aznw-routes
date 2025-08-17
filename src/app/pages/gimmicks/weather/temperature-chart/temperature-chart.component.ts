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
import { MatButtonModule } from '@angular/material/button';
import { HourlyForecast } from '../weather.model';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(ChartDataLabels);

@Component({
    selector: 'app-temperature-chart',
    imports: [BaseChartDirective],
    templateUrl: './temperature-chart.component.html',
    styleUrl: './temperature-chart.component.scss'
})
export class TemperatureChartComponent implements OnInit, OnChanges {
  @Input({ required: true }) hourlyForecast: HourlyForecast[];
  @Input({ required: true }) dayIndex: number;
  @Output() hourClicked = new EventEmitter<[number, number]>();
  dataSet: number[];
  labels: string[];
  lineChartData: ChartConfiguration['data'];
  lineChartOptions: ChartConfiguration['options'];
  clickedLabelIndex: number | null = null;

  ngOnInit(): void {
    this.dataSet = this.hourlyForecast[this.dayIndex].hours.map(
      (value) => value.temperature
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
          backgroundColor: 'rgb(253, 230 ,138)',
          borderColor: 'rgb(245, 158, 11)',
          fill: 'origin',
        },
      ],
      labels: this.labels,
    };

    this.lineChartOptions = {
      layout: {
        padding: {
          top: 20,
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
          min: Math.floor(Math.min(...this.dataSet) - 10),
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
          color: '#000',
          font: (ctx) => ({
            weight:
              ctx.dataIndex === this.clickedLabelIndex ? 'bold' : 'normal',
          }),
          formatter: (value: number) => Math.round(value),
          display: (ctx) => ctx.dataIndex % 3 === 1,
          listeners: {
            click: (ctx) => {
              this.clickedLabelIndex = ctx.dataIndex;
              this.chartDirective?.update();
              const value = ctx.dataset.data[ctx.dataIndex];
              this.hourClicked.emit([this.dayIndex, ctx.dataIndex]);
              return true;
            },
            enter: (ctx) => {
              ctx.chart.canvas.style.cursor = 'pointer'; // ✅ Show pointer when hovering label
            },
            leave: (ctx) => {
              ctx.chart.canvas.style.cursor = 'default'; // ✅ Reset when leaving label
            },
          },
        },
      },
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.clickedLabelIndex = null;
    this.ngOnInit();
  }

  public lineChartType: ChartType = 'line';

  @ViewChild(BaseChartDirective) chartDirective?: BaseChartDirective;
}
