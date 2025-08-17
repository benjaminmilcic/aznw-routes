import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { ChartConfiguration, ChartData, ChartEvent } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { User } from '../user.model';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChartsHelperService } from '../charts-helper.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-double-bar-chart',
    imports: [
        BaseChartDirective,
        IonSegment,
        IonSegmentButton,
        IonLabel,
        CommonModule,
        TranslateModule,
    ],
    templateUrl: './double-bar-chart.component.html',
    styleUrl: './double-bar-chart.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DoubleBarChartComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild(BaseChartDirective) chart: BaseChartDirective<'bar'> | undefined;

  barChartType = 'bar' as const;
  barChartPlugins = [];

  @Input() users: User[];

  year: '2022' | '2023' = '2022';
  kindOfConsumption: 'electricity' | 'water' | 'gas' = 'electricity';

  showUser: boolean[];

  lableWidth: number = 0;

  private chartsDetectChangesSub: Subscription;
  private usersChangeSub: Subscription;

  constructor(
    private cdr: ChangeDetectorRef,
    private chartsHelperService: ChartsHelperService
  ) {}

  ngOnInit(): void {
    this.usersChangeSub = this.chartsHelperService.usersChange.subscribe(() => {
      this.showUser = Array(this.users.length).fill(true);
      this.cdr.detectChanges();
    });
    this.chartsDetectChangesSub =
      this.chartsHelperService.detectChanges.subscribe(() => {
        this.cdr.detectChanges();
        this.chart.render();
        setTimeout(() => {
          this.lableWidth =
            this.chart.chart.chartArea.width / this.users.length;
          this.cdr.detectChanges();
        }, 50);
      });
    this.showUser = Array(this.users.length).fill(true);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.lableWidth = this.chart.chart.chartArea.width / this.users.length;
      this.cdr.detectChanges();
    }, 50);
  }

  getBarChartData(): ChartData<'bar'> {
    let consumption2022: number[] = [];
    this.users.forEach((user, index) => {
      let value = this.showUser[index]
        ? user[2022]
            .map((value) => value[this.kindOfConsumption])
            .reduce((a, b) => a + b)
        : null;

      consumption2022.push(value);
    });
    let consumption2023: number[] = [];
    this.users.forEach((user, index) => {
      let value = this.showUser[index]
        ? user[2023]
            .map((value) => value[this.kindOfConsumption])
            .reduce((a, b) => a + b)
        : null;
      consumption2023.push(value);
    });

    return {
      labels: Array(this.users.length).fill(''),
      datasets: [
        {
          data: consumption2022,
          label: '2022',

          backgroundColor: '#4BC0C0',
        },

        {
          data: consumption2023,
          label: '2023',
          backgroundColor: '#FF9F40',
        },
      ],
    };
  }

  onChangeYear(event) {
    this.year = event.detail.value;
  }

  onChangeKindOfConsumption(event) {
    this.kindOfConsumption = event.detail.value;
    setTimeout(() => {
      this.lableWidth = this.chart.chart.chartArea.width / this.users.length;
      this.cdr.detectChanges();
    }, 50);
  }

  getLabelWidth(): string {
    return this.lableWidth + 'px';
  }

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

  getBarChartOptions(): ChartConfiguration<'bar'>['options'] {
    return {
      scales: {
        x: { display: false },
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
      },

      plugins: {
        tooltip: {
          enabled: false,
          position: 'nearest',
          external: this.externalTooltipHandler,
        },
        legend: {
          display: true,
          labels: {
            color:'beige'
          }
        },
      },
    };
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
        image.src = this.users[tooltip.dataPoints[i].dataIndex].image;
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

  ngOnDestroy(): void {
    this.chartsDetectChangesSub.unsubscribe();
    this.usersChangeSub.unsubscribe();
  }
}
