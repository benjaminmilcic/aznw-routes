import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { lastValueFrom, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Joke, JokesFromApi } from '../auth.model';
import { IonCheckbox } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../../../environments/environment';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IonContent, IonPopover } from '@ionic/angular/standalone';
import { HttpErrorService } from '../../../http-error/http-error.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-main',
  imports: [
    CommonModule,
    IonCheckbox,
    FormsModule,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    IonContent,
    IonPopover,
  ],
  templateUrl: './auth-main.component.html',
  styleUrl: './auth-main.component.css',
})
export class AuthMainComponent implements OnInit {
  jokes: Joke[];
  jokeIndex = 0;
  english = true;
  german = true;
  croatian = true;

  isLoading = false;
  audio = new Audio();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private httpErrorService: HttpErrorService,
    private route: ActivatedRoute,
  ) {}
  async ngOnInit() {
    //old firebase solution, when authentication works via firebase
    // this.jokes = await lastValueFrom(
    //   this.http.get<Joke[]>(
    //     'https://aznw-1753b-default-rtdb.europe-west1.firebasedatabase.app/vicevi.json'
    //   )
    // );
    this.jokes = [];
    const authUserData: {
      email: string;
      id: string;
      _token: string;
      _tokenExpirationDate: string;
    } = JSON.parse(localStorage.getItem('authUserData'));
    if (authUserData) {
      const headers = new HttpHeaders().set(
        'Authorization',
        `Bearer ${authUserData._token}`,
      );
      try {
        let data = await lastValueFrom(
          this.http.get<JokesFromApi>(environment.auth.getJokesFile, {
            headers,
          }),
        );
        let parsedData: JokesFromApi = JSON.parse(JSON.stringify(data));
        parsedData.vicevi.forEach((joke) => {
          this.jokes.push({
            deutsch: joke.deutsch,
            english: joke.english,
            hrvatski: joke.hrvatski,
          });
        });
      } catch (error) {
        this.httpErrorService.showHttpError(error, 'AuthMainComponent');
      }
    }
    if (this.route.snapshot.queryParamMap.get('from') === 'googleLogin') {
      const element = document.getElementById('jokes-box');
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 1000);
      }
    }
  }

  onLogout() {
    this.authService.logout();
  }

  previousJoke() {
    this.jokeIndex =
      this.jokeIndex < 1 ? this.jokes.length - 1 : this.jokeIndex - 1;
  }

  nextJoke() {
    this.jokeIndex =
      this.jokeIndex > this.jokes.length - 2 ? 0 : this.jokeIndex + 1;
  }

  generateSpeech(text: string): Observable<Blob> {
    const authUserData: {
      _token: string;
    } = JSON.parse(localStorage.getItem('authUserData'));
    const headers = new HttpHeaders({
      Authorization: `Bearer ${authUserData?._token ?? ''}`,
    });

    return this.http.post(
      environment.auth.tts,
      { text },
      {
        headers,
        responseType: 'blob',
      },
    );
  }

  async onPlay(text: string) {
    if (!text.trim()) return;

    this.isLoading = true;

    this.generateSpeech(text).subscribe(
      (blob) => {
        this.isLoading = false;

        const audioUrl = URL.createObjectURL(blob);
        this.audio.src = audioUrl;
        this.audio.play();
      },
      (error) => {
        this.httpErrorService.showHttpError(
          error,
          'AuthMainComponent (Error generating speech)',
        );
        this.isLoading = false;
      },
    );
  }
}
