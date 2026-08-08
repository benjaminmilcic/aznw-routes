import { Routes } from '@angular/router';
import { AuthLoginGuard } from './pages/gimmicks/auth/auth-login.guard';
import { AuthMainGuard } from './pages/gimmicks/auth/auth-main.guard';
import { TelgramAuthGuard } from './pages/gimmicks/telegram/guards/telegram-auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'gimmicks',
    loadComponent: () =>
      import('./pages/gimmicks/gimmicks.component').then(
        (m) => m.GimmicksComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/gimmicks/overview/overview.component').then(
            (m) => m.OverviewComponent,
          ),
      },
      {
        path: 'map',
        loadComponent: () =>
          import('./pages/gimmicks/map/map.component').then(
            (m) => m.MapComponent,
          ),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./pages/gimmicks/calendar/calendar.component').then(
            (m) => m.CalendarComponent,
          ),
      },
      {
        path: 'guestbook',
        loadComponent: () =>
          import('./pages/gimmicks/guestbook/guestbook.component').then(
            (m) => m.GuestbookComponent,
          ),
      },
      {
        path: 'charts',
        loadComponent: () =>
          import('./pages/gimmicks/charts/charts.component').then(
            (m) => m.ChartsComponent,
          ),
      },
      {
        path: 'auth',
        loadComponent: () =>
          import('./pages/gimmicks/auth/auth.component').then(
            (m) => m.AuthComponent,
          ),
        children: [
          {
            path: '',
            redirectTo: '/gimmicks/auth/login',
            pathMatch: 'full',
          },
          {
            path: 'login',
            canActivate: [AuthLoginGuard],
            loadComponent: () =>
              import('./pages/gimmicks/auth/auth-login/auth-login.component').then(
                (m) => m.AuthLoginComponent,
              ),
          },
          {
            path: 'main',
            canActivate: [AuthMainGuard],
            loadComponent: () =>
              import('./pages/gimmicks/auth/auth-main/auth-main.component').then(
                (m) => m.AuthMainComponent,
              ),
          },
          {
            path: 'google-redirect',
            loadComponent: () =>
              import('./pages/gimmicks/auth/google-redirect.component').then(
                (m) => m.GoogleRedirectComponent,
              ),
          },
        ],
      },
      {
        path: 'games',
        loadComponent: () =>
          import('./pages/gimmicks/games/games.component').then(
            (m) => m.GamesComponent,
          ),
        children: [
          {
            path: '',
            redirectTo: '/gimmicks/games/connect-four',
            pathMatch: 'full',
          },
          {
            path: 'tiktaktoe',
            loadComponent: () =>
              import('./pages/gimmicks/games/tiktaktoe/tiktaktoe.component').then(
                (m) => m.TiktaktoeComponent,
              ),
          },
          {
            path: 'connect-four',
            loadComponent: () =>
              import('./pages/gimmicks/games/connect-four/connect-four.component').then(
                (m) => m.ConnectFourComponent,
              ),
          },
          {
            path: 'memo-quiz',
            loadComponent: () =>
              import('./pages/gimmicks/games/memo-quiz/memo-quiz.component').then(
                (m) => m.MemoQuizComponent,
              ),
          },
          {
            path: 'jigsaw',
            loadComponent: () =>
              import('./pages/gimmicks/games/jigsaw/jigsaw.component').then(
                (m) => m.JigsawComponent,
              ),
          },
          {
            path: 'knowledge-quiz',
            loadComponent: () =>
              import('./pages/gimmicks/games/knowledge-quiz/knowledge-quiz.component').then(
                (m) => m.KnowledgeQuizComponent,
              ),
          },
          {
            path: 'moorhuhn',
            loadComponent: () =>
              import('./pages/gimmicks/games/moorhuhn/moorhuhn.component').then(
                (m) => m.MoorhuhnComponent,
              ),
          },
          {
            path: 'yahtzee',
            loadComponent: () =>
              import('./pages/gimmicks/games/yahtzee/yahtzee.component').then(
                (m) => m.YahtzeeComponent,
              ),
          },
          {
            path: 'minesweeper',
            loadComponent: () =>
              import('./pages/gimmicks/games/minesweeper/minesweeper.component').then(
                (m) => m.MinesweeperComponent,
              ),
          },
          {
            path: 'flag-quiz',
            loadComponent: () =>
              import('./pages/gimmicks/games/flag-quiz/flag-quiz.component').then(
                (m) => m.FlagQuizComponent,
              ),
          },
          {
            path: 'ships',
            loadComponent: () =>
              import('./pages/gimmicks/games/ships/ships.component').then(
                (m) => m.ShipsComponent,
              ),
          },
          {
            path: 'ludo',
            loadComponent: () =>
              import('./pages/gimmicks/games/ludo/ludo.component').then(
                (m) => m.LudoComponent,
              ),
          },
        ],
      },
      {
        path: 'weather',
        loadComponent: () =>
          import('./pages/gimmicks/weather/weather.component').then(
            (m) => m.WeatherComponent,
          ),
      },
      {
        path: 'recipes',
        loadComponent: () =>
          import('./pages/gimmicks/recipes/recipes.component').then(
            (m) => m.RecipesComponent,
          ),
        children: [
          {
            path: '',
            redirectTo: '/gimmicks/recipes/list',
            pathMatch: 'full',
          },
          {
            path: 'list',
            loadComponent: () =>
              import('./pages/gimmicks/recipes/recipes-list/recipes-list.component').then(
                (m) => m.RecipesListComponent,
              ),
          },
          {
            path: 'recipe/:id',
            loadComponent: () =>
              import('./pages/gimmicks/recipes/recipe-item/recipe-item.component').then(
                (m) => m.RecipeItemComponent,
              ),
          },
          {
            path: 'add',
            loadComponent: () =>
              import('./pages/gimmicks/recipes/add-recipe/add-recipe.component').then(
                (m) => m.AddRecipeComponent,
              ),
          },
          {
            path: 'update/:id',
            loadComponent: () =>
              import('./pages/gimmicks/recipes/add-recipe/add-recipe.component').then(
                (m) => m.AddRecipeComponent,
              ),
          },
        ],
      },
      {
        path: 'movies',
        loadComponent: () =>
          import('./pages/gimmicks/movies/movies.component').then(
            (m) => m.MoviesComponent,
          ),
        children: [
          {
            path: '',
            redirectTo: '/gimmicks/movies/popular',
            pathMatch: 'full',
          },
          {
            path: 'search',
            loadComponent: () =>
              import('./pages/gimmicks/movies/movies-search/movies-search.component').then(
                (m) => m.MoviesSearchComponent,
              ),
          },
          {
            path: 'popular',
            loadComponent: () =>
              import('./pages/gimmicks/movies/movies-popular/movies-popular.component').then(
                (m) => m.MoviesPopularComponent,
              ),
          },
          {
            path: 'top-rated',
            loadComponent: () =>
              import('./pages/gimmicks/movies/movies-popular/movies-popular.component').then(
                (m) => m.MoviesPopularComponent,
              ),
          },
          {
            path: 'now-playing',
            loadComponent: () =>
              import('./pages/gimmicks/movies/movies-popular/movies-popular.component').then(
                (m) => m.MoviesPopularComponent,
              ),
          },
          {
            path: 'movie/:id',
            loadComponent: () =>
              import('./pages/gimmicks/movies/movie-detail/movie-detail.component').then(
                (m) => m.MovieDetailComponent,
              ),
          },
          {
            path: 'actor/:id',
            loadComponent: () =>
              import('./pages/gimmicks/movies/actor-detail/actor-detail.component').then(
                (m) => m.ActorDetailComponent,
              ),
          },
        ],
      },
      {
        path: 'imagegen',
        loadComponent: () =>
          import('./pages/gimmicks/imagegen/imagegen.component').then(
            (m) => m.ImagegenComponent,
          ),
      },
      {
        path: 'countries',
        loadComponent: () =>
          import('./pages/gimmicks/countries/countries.component').then(
            (m) => m.CountriesComponent,
          ),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/gimmicks/countries/countries-worldmap/countries-worldmap.component').then(
                (m) => m.CountriesWorldmapComponent,
              ),
          },
          {
            path: 'country/:code',
            loadComponent: () =>
              import('./pages/gimmicks/countries/countries-detail/countries-detail.component').then(
                (m) => m.CountriesDetailComponent,
              ),
          },
        ],
      },
      {
        path: 'telegram',
        loadComponent: () =>
          import('./pages/gimmicks/telegram/telegram.component').then(
            (m) => m.TelegramComponent,
          ),
        children: [
          {
            path: '',
            redirectTo: '/gimmicks/telegram/chat',
            pathMatch: 'full',
          },
          {
            path: 'login',
            loadComponent: () =>
              import('./pages/gimmicks/telegram/components/login/telegram-login.component').then(
                (m) => m.TelegramLoginComponent,
              ),
          },
          {
            path: 'chat',
            canActivate: [TelgramAuthGuard],
            loadComponent: () =>
              import('./pages/gimmicks/telegram/components/telegram-chat-layout/telegram-chat-layout.component').then(
                (m) => m.TelegramChatLayoutComponent,
              ),
          },
        ],
      },
    ],
  },
  {
    path: 'print/:printDate',
    outlet: 'print',
    loadComponent: () =>
      import('./pages/gimmicks/calendar/print-schedule/print-schedule.component').then(
        (m) => m.PrintScheduleComponent,
      ),
  },
  {
    path: 'print-recipe/:id',
    outlet: 'print',
    loadComponent: () =>
      import('./pages/gimmicks/recipes/recipe-print/recipe-print.component').then(
        (m) => m.RecipePrintComponent,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/page-not-found/page-not-found.component').then(
        (m) => m.PageNotFoundComponent,
      ),
  },
];
