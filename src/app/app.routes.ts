import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { GimmicksComponent } from './pages/gimmicks/gimmicks.component';
import { MapComponent } from './pages/gimmicks/map/map.component';
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component';
import { CalendarComponent } from './pages/gimmicks/calendar/calendar.component';
import { OverviewComponent } from './pages/gimmicks/overview/overview.component';
import { GuestbookComponent } from './pages/gimmicks/guestbook/guestbook.component';
import { PrintScheduleComponent } from './pages/gimmicks/calendar/print-schedule/print-schedule.component';
import { ChartsComponent } from './pages/gimmicks/charts/charts.component';
import { AuthLoginComponent } from './pages/gimmicks/auth/auth-login/auth-login.component';
import { AuthMainComponent } from './pages/gimmicks/auth/auth-main/auth-main.component';
import { AuthComponent } from './pages/gimmicks/auth/auth.component';
import { AuthMainGuard } from './pages/gimmicks/auth/auth-main.guard';
import { AuthLoginGuard } from './pages/gimmicks/auth/auth-login.guard';
import { TiktaktoeComponent } from './pages/gimmicks/games/tiktaktoe/tiktaktoe.component';
import { ConnectFourComponent } from './pages/gimmicks/games/connect-four/connect-four.component';
import { GamesComponent } from './pages/gimmicks/games/games.component';
import { MemoQuizComponent } from './pages/gimmicks/games/memo-quiz/memo-quiz.component';
import { JigsawComponent } from './pages/gimmicks/games/jigsaw/jigsaw.component';
import { KnowledgeQuizComponent } from './pages/gimmicks/games/knowledge-quiz/knowledge-quiz.component';
import { MoorhuhnComponent } from './pages/gimmicks/games/moorhuhn/moorhuhn.component';
import { YahtzeeComponent } from './pages/gimmicks/games/yahtzee/yahtzee.component';
import { WeatherComponent } from './pages/gimmicks/weather/weather.component';
import { GoogleRedirectComponent } from './pages/gimmicks/auth/google-redirect.component';
import { MinesweeperComponent } from './pages/gimmicks/games/minesweeper/minesweeper.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'gimmicks',
    component: GimmicksComponent,
    children: [
      {
        path: '',
        component: OverviewComponent,
      },
      {
        path: 'map',
        component: MapComponent,
      },
      {
        path: 'calendar',
        component: CalendarComponent,
      },
      {
        path: 'guestbook',
        component: GuestbookComponent,
      },
      {
        path: 'charts',
        component: ChartsComponent,
      },
      {
        path: 'auth',
        component: AuthComponent,
        children: [
          {
            path: '',
            redirectTo: '/gimmicks/auth/login',
            pathMatch: 'full',
          },
          {
            path: 'login',
            canActivate: [AuthLoginGuard],
            component: AuthLoginComponent,
          },
          {
            path: 'main',
            canActivate: [AuthMainGuard],
            component: AuthMainComponent,
          },
          {
            path: 'google-redirect',
            component: GoogleRedirectComponent,
          },
        ],
      },
      {
        path: 'games',
        component: GamesComponent,
        children: [
          {
            path: '',
            redirectTo: '/gimmicks/games/moorhuhn',
            pathMatch: 'full',
          },
          {
            path: 'tiktaktoe',
            component: TiktaktoeComponent,
          },
          {
            path: 'connect-four',
            component: ConnectFourComponent,
          },
          {
            path: 'memo-quiz',
            component: MemoQuizComponent,
          },
          {
            path: 'jigsaw',
            component: JigsawComponent,
          },
          {
            path: 'knowledge-quiz',
            component: KnowledgeQuizComponent,
          },
          {
            path: 'moorhuhn',
            component: MoorhuhnComponent,
          },
          {
            path: 'yahtzee',
            component: YahtzeeComponent,
          },
          {
            path: 'minesweeper',
            component: MinesweeperComponent,
          },
        ],
      },
      {
        path: 'weather',
        component: WeatherComponent,
      },
    ],
  },
  {
    path: 'print/:printDate',
    outlet: 'print',
    component: PrintScheduleComponent,
  },
  { path: '**', component: PageNotFoundComponent },
];
