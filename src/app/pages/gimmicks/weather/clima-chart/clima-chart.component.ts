import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType, Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { WeatherService } from '../weather.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

Chart.register(ChartDataLabels);

@Component({
  selector: 'app-clima-chart',
  imports: [CommonModule, BaseChartDirective, TranslateModule],
  templateUrl: './clima-chart.component.html',
  styleUrl: './clima-chart.component.css',
})
export class ClimaChartComponent implements OnInit, OnDestroy {
  @Input() lat: number;
  @Input() lng: number;
  @Output() errorOccurred = new EventEmitter<string>();

  precipitationData: number[] = [];
  temperatureData: number[] = [];
  yearlyAvgTemperature: number = 0;
  yearlyTotalPrecipitation: number = 0;
  elevation: number = 0;
  isDataLoaded: boolean = false;
  monthLabels: string[] = [];
  monthFullNames: string[] = [];

  chartData: ChartConfiguration['data'];
  chartOptions: ChartConfiguration['options'];
  chartType: ChartType = 'bar';

  @ViewChild(BaseChartDirective) chartDirective?: BaseChartDirective;

  private langChangeSubscription: Subscription;

  constructor(
    private weatherService: WeatherService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadTranslations();
    this.loadData();

    // Listen for language changes
    this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
      this.loadTranslations();
      if (this.isDataLoaded) {
        this.initializeChart();
        setTimeout(() => {
          if (this.chartDirective?.chart) {
            this.chartDirective.chart.update();
          }
        }, 100);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
  }

  private loadData(): void {
    this.weatherService.getClimateData(this.lat, this.lng).subscribe({
      next: (data) => {
        this.elevation = data.elevation || 0;
        this.processClimateData(data);
        this.initializeChart();
        this.isDataLoaded = true;

        // Chart nach dem Rendern aktualisieren
        setTimeout(() => {
          if (this.chartDirective?.chart) {
            this.chartDirective.chart.resize();
          }
        }, 100);
      },
      error: (error) => {
        console.error('Error loading climate data:', error);
        let errorMessage = '';

        if (error.status === 429) {
          errorMessage = this.translate.instant('gimmicks.weather.climaChart.error429');
        } else if (error.status === 0) {
          errorMessage = this.translate.instant('gimmicks.weather.climaChart.errorNetwork');
        } else {
          const genericError = this.translate.instant('gimmicks.weather.climaChart.errorGeneric');
          errorMessage = `${genericError}: ${error.message || error.statusText}`;
        }

        this.errorOccurred.emit(errorMessage);
      }
    });
  }

  private loadTranslations(): void {
    const monthKeys = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    this.monthFullNames = monthKeys.map(key =>
      this.translate.instant(`gimmicks.weather.climaChart.months.${key}`)
    );

    // Short labels (first 3 characters of each month)
    this.monthLabels = this.monthFullNames.map(month => month.substring(0, 3));
  }

  private processClimateData(data: any): void {
    // Objekt für monatliche Daten pro Jahr und Monat
    const yearlyMonthlyData: { [year: number]: { temps: number[][], precips: number[][] } } = {};

    // Daten nach Jahr und Monat gruppieren
    data.daily.time.forEach((date: string, index: number) => {
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth(); // 0-11
      const temp = data.daily.temperature_2m_mean[index];
      const precip = data.daily.precipitation_sum[index];

      if (!yearlyMonthlyData[year]) {
        yearlyMonthlyData[year] = {
          temps: Array.from({ length: 12 }, () => []),
          precips: Array.from({ length: 12 }, () => [])
        };
      }

      if (temp !== null && temp !== undefined) {
        yearlyMonthlyData[year].temps[month].push(temp);
      }
      if (precip !== null && precip !== undefined) {
        yearlyMonthlyData[year].precips[month].push(precip);
      }
    });

    // Für jeden Monat: Berechne monatliche Summen/Durchschnitte pro Jahr, dann Durchschnitt über alle Jahre
    const monthlyTempAverages: number[][] = Array.from({ length: 12 }, () => []);
    const monthlyPrecipSums: number[][] = Array.from({ length: 12 }, () => []);

    Object.values(yearlyMonthlyData).forEach((yearData) => {
      for (let month = 0; month < 12; month++) {
        // Temperatur: Durchschnitt der Tageswerte für diesen Monat in diesem Jahr
        if (yearData.temps[month].length > 0) {
          const monthAvgTemp = yearData.temps[month].reduce((a, b) => a + b, 0) / yearData.temps[month].length;
          monthlyTempAverages[month].push(monthAvgTemp);
        }

        // Niederschlag: Summe der Tageswerte für diesen Monat in diesem Jahr
        if (yearData.precips[month].length > 0) {
          const monthTotalPrecip = yearData.precips[month].reduce((a, b) => a + b, 0);
          monthlyPrecipSums[month].push(monthTotalPrecip);
        }
      }
    });

    // Durchschnitt über alle Jahre berechnen
    this.temperatureData = monthlyTempAverages.map((temps) => {
      if (temps.length === 0) return 0;
      const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
      return Math.round(avg * 10) / 10;
    });

    this.precipitationData = monthlyPrecipSums.map((precips) => {
      if (precips.length === 0) return 0;
      const avg = precips.reduce((a, b) => a + b, 0) / precips.length;
      return Math.round(avg * 10) / 10;
    });

    // Jahresstatistiken berechnen
    this.yearlyAvgTemperature = Math.round((this.temperatureData.reduce((a, b) => a + b, 0) / 12) * 10) / 10;
    this.yearlyTotalPrecipitation = Math.round(this.precipitationData.reduce((a, b) => a + b, 0) * 10) / 10;
  }

  private initializeChart(): void {
    this.chartData = {
      datasets: [
        {
          type: 'bar',
          label: this.translate.instant('gimmicks.weather.climaChart.avgPrecipitation'),
          data: this.precipitationData,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          yAxisID: 'y-precipitation',
          order: 2,
        },
        {
          type: 'line',
          label: this.translate.instant('gimmicks.weather.climaChart.avgTemperature'),
          data: this.temperatureData,
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          yAxisID: 'y-temperature',
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 1,
        },
      ],
      labels: this.monthLabels,
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: 'gray',
          },
        },
        'y-precipitation': {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: this.translate.instant('gimmicks.weather.climaChart.precipitationAxis'),
            color: 'rgb(59, 130, 246)',
            font: {
              weight: 'bold',
            },
          },
          ticks: {
            color: 'rgb(59, 130, 246)',
          },
          grid: {
            display: true,
            color: 'rgba(200, 200, 200, 0.2)',
          },
          beginAtZero: true,
        },
        'y-temperature': {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: this.translate.instant('gimmicks.weather.climaChart.temperatureAxis'),
            color: 'rgb(239, 68, 68)',
            font: {
              weight: 'bold',
            },
          },
          ticks: {
            color: 'rgb(239, 68, 68)',
          },
          grid: {
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        datalabels: {
          display: false,
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (context) => {
              return this.monthFullNames[context[0].dataIndex];
            },
            label: (context) => {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (context.datasetIndex === 0) {
                  label += context.parsed.y + ' mm';
                } else {
                  label += context.parsed.y + ' °C';
                }
              }
              return label;
            },
          },
        },
      },
    };
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    if (this.chartDirective?.chart) {
      this.chartDirective.chart.resize();
    }
  }
}
