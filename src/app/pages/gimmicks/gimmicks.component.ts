import { Component, OnDestroy, OnInit } from '@angular/core';
import { MapComponent } from './map/map.component';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  IonFab,
  IonFabButton,
  IonFabList,
  IonIcon,
} from '@ionic/angular/standalone';
import { ChartsHelperService } from './charts/charts-helper.service';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-gimmicks',
    imports: [
        IonIcon,
        MapComponent,
        RouterModule,
        TranslateModule,
        IonFab,
        IonFabButton,
        IonFabList,
        CommonModule,
    ],
    templateUrl: './gimmicks.component.html',
    styleUrl: './gimmicks.component.css'
})
export class GimmicksComponent implements OnInit, OnDestroy {
  innerWidth: number;

  showSubMenu: boolean = false;
  fadeOut: boolean = true;

  isAuthenticated = false;
  private chartsDetectChangesSub: Subscription;
  private authUserSub: Subscription;

  constructor(
    private chartsHelperService: ChartsHelperService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.innerWidth = window.innerWidth;
    this.chartsDetectChangesSub =
      this.chartsHelperService.detectChanges.subscribe(() => {
        this.innerWidth = window.innerWidth;
      });
    this.authUserSub = this.authService.authUser.subscribe((authUser) => {
      this.isAuthenticated = !!authUser;
    });
  }

  hideSubMenu() {
    setTimeout(() => {
      this.showSubMenu = false;
    }, 270);
    this.fadeOut = true;
  }

  ngOnDestroy(): void {
    this.chartsDetectChangesSub.unsubscribe();
    this.authUserSub.unsubscribe();
  }
}
