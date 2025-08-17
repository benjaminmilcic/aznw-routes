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
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartEvent, ChartType } from 'chart.js';
import {
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { User } from '../user.model';
import { ChartsHelperService } from '../charts-helper.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-pie-chart',
    imports: [
        BaseChartDirective,
        IonSegment,
        IonSegmentButton,
        IonLabel,
        FormsModule,
        CommonModule,
    ],
    templateUrl: './pie-chart.component.html',
    styleUrl: './pie-chart.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PieChartComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() users: User[];

  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  private periodChangeSub: Subscription;
  private kindOfConsumptionChangeSub: Subscription;
  private yearChangeSub: Subscription;
  private chartsDetectChangesSub: Subscription;
  private usersChangeSub: Subscription;

  constructor(
    private cdr: ChangeDetectorRef,
    private chartsHelperService: ChartsHelperService
  ) {}

  pieChartOptions: ChartConfiguration['options'];
  pieChartType: ChartType = 'pie';
  barChartPlugins;

  year: '2022' | '2023' = '2022';
  kindOfConsumption: 'electricity' | 'water' | 'gas' = 'electricity';
  period: number = -1;

  legendColors: string[] = [];

  ngOnInit(): void {
    this.usersChangeSub = this.chartsHelperService.usersChange.subscribe(() => {
      this.legendColors = <any>(
        this.chart.data.datasets.map((dataset) => dataset.borderColor)
      );
      this.cdr.detectChanges();
    });
    this.periodChangeSub = this.chartsHelperService.periodChange.subscribe(
      (data) => {
        this.period = data;
        this.cdr.detectChanges();
      }
    );
    this.kindOfConsumptionChangeSub =
      this.chartsHelperService.kindOfConsumptionChange.subscribe((data) => {
        this.kindOfConsumption = data;
        this.cdr.detectChanges();
      });
    this.yearChangeSub = this.chartsHelperService.yearChange.subscribe(
      (data) => {
        this.year = data;
        this.cdr.detectChanges();
      }
    );
    this.chartsDetectChangesSub =
      this.chartsHelperService.detectChanges.subscribe(() => {
        this.cdr.detectChanges();
        this.chart.render();
      });

    this.pieChartOptions = {
      plugins: {
        tooltip: {
          enabled: false,
          position: 'nearest',
          external: this.externalTooltipHandler,
        },
        legend: {
          display: false,
        },
        datalabels: {
          formatter: (value) => {
            let consumptionOfAll = this.getConsumption().reduce(
              (a, b) => a + b
            );

            return ((value * 100) / consumptionOfAll).toFixed(2) + ' %';
          },
        },
      },
    };
    this.barChartPlugins = [ChartDataLabels];
  }
  ngAfterViewInit(): void {
    this.legendColors = <string[]>this.chart.data.datasets[0].backgroundColor;
    this.cdr.detectChanges();
  }

  getPieChartData(): ChartData<'pie', number[], string | string[]> {
    return {
      datasets: [
        {
          data: this.getConsumption(),
        },
      ],
    };
  }

  getConsumption(): number[] {
    let userByYear = this.users.map((user) => user[this.year]);
    let result = [];
    userByYear.forEach((user, index) => {
      if (this.period === -1) {
        result.push(
          user
            .map((user2) => user2[this.kindOfConsumption])
            .reduce((a, b) => a + b)
        );
      } else {
        result.push(
          user.map((user2) => user2[this.kindOfConsumption])[this.period]
        );
      }
    });
    return result;
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

  ngOnDestroy(): void {
    this.periodChangeSub.unsubscribe();
    this.kindOfConsumptionChangeSub.unsubscribe();
    this.yearChangeSub.unsubscribe();
    this.chartsDetectChangesSub.unsubscribe();
    this.usersChangeSub.unsubscribe();
  }
}
