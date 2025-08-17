import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ChartConfiguration, ChartEvent, ChartType, Tooltip } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { User } from '../user.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { ChartsHelperService } from '../charts-helper.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-line-chart',
    imports: [
        BaseChartDirective,
        IonSegmentButton,
        IonSegment,
        IonLabel,
        TranslateModule,
        CommonModule,
    ],
    templateUrl: './line-chart.component.html',
    styleUrl: './line-chart.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LineChartComponent implements OnInit, OnDestroy, AfterViewInit {
  lineChartType: ChartType = 'line';

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  @Input() users: User[];

  months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];

  year: '2022' | '2023' = '2022';
  kindOfConsumption: 'electricity' | 'water' | 'gas' = 'electricity';

  legendColors: string[] = [];
  translatedMonths: string[];

  showUser: boolean[];

  private chartsDetectChangesSub: Subscription;
  private translateSub: Subscription;
  private usersChangeSub: Subscription;

  constructor(
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private chartsHelperService: ChartsHelperService
  ) {}

  async ngOnInit() {
    this.showUser = Array(this.users.length).fill(true);
    this.usersChangeSub = this.chartsHelperService.usersChange.subscribe(() => {
      this.showUser = Array(this.users.length).fill(true);
      this.legendColors = <any>(
        this.chart.data.datasets.map((dataset) => dataset.borderColor)
      );
      this.cdr.detectChanges();
    });
    this.chartsDetectChangesSub =
      this.chartsHelperService.detectChanges.subscribe(() => {
        this.cdr.detectChanges();
        this.chart.render();
      });
    this.translateSub = this.translate.onLangChange.subscribe(() => {
      this.cdr.detectChanges();
    });

    this.cdr.markForCheck();
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 100);
  }

  ngAfterViewInit(): void {
    this.legendColors = <any>(
      this.chart.data.datasets.map((dataset) => dataset.borderColor)
    );
    this.cdr.detectChanges();
  }

  getOrCreateTooltip = (chart) => {
    let tooltipEl = document.getElementById('chartjs-tooltip');

    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'chartjs-tooltip';
      tooltipEl.style.background = 'rgba(0, 0, 0, 0.9)';
      tooltipEl.style.borderRadius = '3px';
      tooltipEl.style.color = 'white';
      tooltipEl.style.opacity = '1';
      tooltipEl.style.pointerEvents = 'none';
      tooltipEl.style.position = 'absolute';
      tooltipEl.style.transform = 'translate(-50%, 0)';
      tooltipEl.style.transition = 'all .1s ease';

      const table = document.createElement('table');
      table.style.margin = '0px';

      tooltipEl.appendChild(table);
      chart.canvas.parentNode.appendChild(tooltipEl);
    }

    return tooltipEl;
  };

  externalTooltipHandler = (context) => {
    // Tooltip Element
    const { chart, tooltip } = context;
    const tooltipEl = this.getOrCreateTooltip(chart);

    // Hide if no tooltip
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = '0';
      return;
    }

    // Set Text
    if (tooltip.body) {
      const titleLines = tooltip.title || [];
      const bodyLines = tooltip.body.map((b) => b.lines);

      const tableHead = document.createElement('thead');

      titleLines.forEach((title) => {
        const tr = document.createElement('tr');
        tr.style.borderWidth = '0';

        const th = document.createElement('th');
        th.style.borderWidth = '0';
        const text = document.createTextNode(title);

        th.appendChild(text);
        tr.appendChild(th);
        tableHead.appendChild(tr);
      });

      const tableBody = document.createElement('tbody');
      bodyLines.forEach((body, i) => {
        const colors = tooltip.labelColors[i];
        const image = document.createElement('img') as HTMLImageElement;
        image.src = this.users[tooltip.dataPoints[i].datasetIndex].image;
        image.width = 34;
        image.height = 34;
        image.style.borderRadius = '50%';

        const tr = document.createElement('tr');
        tr.style.backgroundColor = 'inherit';
        tr.style.borderWidth = '0';

        const td = document.createElement('td');
        td.style.borderWidth = '0';

        let unit = this.getConsumptionLabel();
        const text = document.createTextNode(body + ' ' + unit);

        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.placeItems = 'center';

        div.appendChild(image);
        div.appendChild(text);

        td.appendChild(div);
        tr.appendChild(td);
        tableBody.appendChild(tr);
      });

      const tableRoot = tooltipEl.querySelector('table');

      // Remove old children
      while (tableRoot.firstChild) {
        tableRoot.firstChild.remove();
      }

      // Add new children
      tableRoot.appendChild(tableHead);
      tableRoot.appendChild(tableBody);
    }

    const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;

    // Display, position, and set styles for font
    tooltipEl.style.opacity = '1';
    let rect = tooltipEl.getClientRects();

    if (tooltip.caretX > rect[0].width) {
      tooltipEl.style.left =
        positionX + tooltip.caretX - rect[0].width / 2 - 10 + 'px';
    } else {
      tooltipEl.style.left =
        positionX + tooltip.caretX + rect[0].width / 2 + 10 + 'px';
    }
    tooltipEl.style.top =
      positionY + tooltip.caretY - rect[0].height / 2 + 'px';

    tooltipEl.style.font = tooltip.options.bodyFont.string;
    tooltipEl.style.padding =
      tooltip.options.padding + 'px ' + tooltip.options.padding + 'px';

    const arrow = document.createElement('div');
    arrow.style.width = '20px';
    arrow.style.height = '10px';
    arrow.style.background = 'rgba(0, 0, 0, 0.9)';
    arrow.style.position = 'absolute';
    arrow.style.clipPath = 'polygon(50% 0, 100% 100%, 0 100%)';
    if (tooltip.caretX > rect[0].width) { 
      arrow.style.rotate = '90deg';
      arrow.style.right = '-10px';
    } else {
      arrow.style.rotate = '270deg';
      arrow.style.left = '-10px';
    }

    arrow.style.top = rect[0].height / 2 - 5 + 'px';
    for (let index = 1; index < tooltipEl.childNodes.length; index++) {
      tooltipEl.removeChild(tooltipEl.childNodes[index]);
    }
    tooltipEl.appendChild(arrow);

    tooltipEl.style.display = 'flex';
  };

  getConsumptionLabel(): string {
    switch (this.kindOfConsumption) {
      case 'electricity':
        return 'kWh';
      case 'gas':
        return 'kWh';
      case 'water':
        return 'm³';
      default:
        return '';
    }
  }

  getLineChartOptions(): ChartConfiguration['options'] {
    return {
      elements: {
        line: {
          tension: 0.5,
        },
      },
      scales: {
        y: {
          display: !this.showUser.every((v) => v === false),
          title: {
            text: this.getConsumptionLabel(),
            display: true,
            color: 'beige',
          },
          ticks: {
            color: 'beige',
          },
        },
        x: { ticks: { color: 'beige' } },
      },

      plugins: {
        tooltip: {
          enabled: false,
          position: 'nearest',
          external: this.externalTooltipHandler,
        },
        legend: { display: false },
      },
    };
  }

  getLineChartData(): ChartConfiguration['data'] {
    this.translatedMonths = this.months.map((month) =>
      this.translate.instant('gimmicks.calendar.months.' + month)
    );
    let datasets: { data: number[] }[] = [];
    this.users.forEach((user, i) => {
      let data = this.showUser[i]
        ? {
            data: user[this.year].map((value) => value[this.kindOfConsumption]),
          }
        : { data: null };
      datasets.push(data);
    });
    return {
      datasets: datasets,
      labels: this.translatedMonths,
    };
  }

  onChangeYear(event) {
    this.year = event.detail.value;
  }

  onChangeKindOfConsumption(event) {
    this.kindOfConsumption = event.detail.value;
  }

  ngOnDestroy(): void {
    this.chartsDetectChangesSub.unsubscribe();
    this.translateSub.unsubscribe();
    this.usersChangeSub.unsubscribe();
  }
}
