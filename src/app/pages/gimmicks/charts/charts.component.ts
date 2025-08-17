import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { User } from './user.model';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { DrawerContentComponent } from './drawer-content/drawer-content.component';
import { UserValues } from './Users';
import { BarChartComponent } from './bar-chart/bar-chart.component';
import { PieChartComponent } from './pie-chart/pie-chart.component';
import {
  AlertController,
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { ChartsHelperService } from './charts-helper.service';
import { LineChartComponent } from './line-chart/line-chart.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { DoubleBarChartComponent } from './double-bar-chart/double-bar-chart.component';

@Component({
    selector: 'app-charts',
    imports: [
        IonSegmentButton,
        IonSegment,
        IonLabel,
        MatExpansionModule,
        CommonModule,
        MatButtonModule,
        MatTooltipModule,
        MatIconModule,
        MatSidenavModule,
        DrawerContentComponent,
        BarChartComponent,
        PieChartComponent,
        LineChartComponent,
        DoubleBarChartComponent,
        TranslateModule,
        MatFormFieldModule,
        MatSelectModule,
        MatOptionModule,
    ],
    templateUrl: './charts.component.html',
    styleUrl: './charts.component.css'
})
export class ChartsComponent implements OnInit {
  users: User[] = UserValues;
  user: User = null;
  newUser: User = null;
  userNames: string[];

  chartType: 'procentual' | 'yearly' | 'monthly' = 'monthly';

  @ViewChild('drawer') drawer: MatDrawer;

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

  selectedPeriod = 'year';
  year: '2022' | '2023' = '2022';
  kindOfConsumption: 'electricity' | 'water' | 'gas' = 'electricity';

  constructor(
    private chartsHelperService: ChartsHelperService,
    private alertController: AlertController,
    private translate: TranslateService
  ) {}

  ngOnInit() {}

  onOpenEditDrawer(user: User) {
    this.userNames = this.users.map((user) => user.name);
    this.user = JSON.parse(JSON.stringify(user));
    this.drawer.open();
  }

  onCloseEditDrawer() {
    this.user = null;
    this.drawer.close();
  }

  onSaveUser(event: User) {
    let changedUser = this.users.findIndex((user) => user.id === event.id);
    this.users[changedUser] = JSON.parse(JSON.stringify(event));
    this.user = null;
    this.drawer.close();
    this.chartsHelperService.detectChanges.next();
  }

  onSaveNewUser(event: User) {
    this.users.push(event);
    this.newUser = null;
    this.drawer.close();
    this.chartsHelperService.detectChanges.next();
    this.chartsHelperService.usersChange.next();
  }

  getYearlyConsumption(user: User, part: string) {
    return {
      '2022': user['2022'].map((value) => value[part]).reduce((a, b) => a + b),
      '2023': user['2023'].map((value) => value[part]).reduce((a, b) => a + b),
    };
  }

  onChangeChartType(event) {
    this.chartType = event.detail.value;
  }

  onPeriodChange(event: MatSelectChange) {
    this.chartsHelperService.periodChange.next(
      this.months.indexOf(event.value)
    );
  }

  onChangeYear(event) {
    this.chartsHelperService.yearChange.next(event.detail.value);
  }

  onChangeKindOfConsumption(event) {
    this.chartsHelperService.kindOfConsumptionChange.next(event.detail.value);
  }

  onAddUser() {
    this.userNames = this.users.map((user) => user.name);
    this.newUser = {
      id: 1 + Math.max(...this.users.map((user) => user.id)),
      name: '',
      image: '',
      '2022': Array(12).fill({ electricity: 0, water: 0, gas: 0 }),
      '2023': Array(12).fill({ electricity: 0, water: 0, gas: 0 }),
    };
    this.drawer.open();
  }

  async onDeleteUser(userToDelete: User) {
    const alert = await this.alertController.create({
      header: userToDelete.name,
      subHeader: this.translate.instant('gimmicks.charts.reallyDelete'),
      buttons: [
        {
          text: this.translate.instant('gimmicks.charts.cancel'),
          role: 'cancel',
          cssClass: 'alert-button-cancel',
        },
        {
          text: this.translate.instant('gimmicks.charts.delete'),
          cssClass: 'alert-button-confirm',
          handler: () => {
            const userIndex = this.users.findIndex(
              (user) => user.id === userToDelete.id
            );
            this.users.splice(userIndex, 1);
            this.chartsHelperService.detectChanges.next();
            this.chartsHelperService.usersChange.next();
          },
        },
      ],
    });

    await alert.present();
  }
}
