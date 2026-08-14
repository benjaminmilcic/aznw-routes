import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  LOCALE_ID,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { EditorComponent, EditorModule } from '@tinymce/tinymce-angular';
import {
  IonInput} from '@ionic/angular/standalone';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { lastValueFrom, Subscription } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Post } from './guestbook.model';
import { registerLocaleData } from '@angular/common';
import * as de from '@angular/common/locales/de';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SafeHtmlPipe } from './safe-html.pipe';
import { environment } from '../../../../environments/environment';
import { HttpErrorService } from '../../http-error/http-error.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-guestbook',
  imports: [
    YouTubePlayer,
    CommonModule,
    EditorModule,
    MatTooltipModule,
    IonInput,
    FormsModule,
    TranslateModule,
    SafeHtmlPipe,
    MatIconModule
  ],
  providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }],
  templateUrl: './guestbook.component.html',
  styleUrl: './guestbook.component.css',
})
export class GuestbookComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly tinymceApiKey = environment.tinymce.apiKey;
  showcreatePostDialog = false;
  postName: string;
  postContent: string;
  posts: Post[] = [];
  editorInitialized = false;
  private langChangeSub: Subscription;

  get config(): EditorComponent['init'] {
    return {
      language: this.translateService.currentLang || 'en',
      plugins: 'lists link image table code help wordcount',
      external_plugins: {
        customemoji: '/assets/tinymce/plugins/customemoji/plugin.js'
      },
      toolbar:
        'undo redo | bold italic | forecolor backcolor | alignleft aligncenter alignright | bullist numlist outdent indent | link image | customemoji',
      toolbar_mode: 'wrap',
      file_picker_types: 'image',
      // image_advtab: false,
      image_description: false,
      // image_dimensions: false,
      block_unsupported_drop: true,
      images_reuse_filename: true,
      paste_data_images: false,
      // images_upload_handler: (blobInfo) => {
      //   const file = blobInfo.blob();
      //   const filePath = `${Date.now()}-${blobInfo.filename()}`;
      //   const ref = this.storage.ref(filePath);
      //   const task = this.storage.upload(filePath, file);
      //   const promise = new Promise<string>((resolve, reject) => {
      //     task
      //       .snapshotChanges()
      //       .pipe(
      //         finalize(() =>
      //           ref
      //             .getDownloadURL()
      //             .pipe(last())
      //             .subscribe((url) => {
      //               resolve(url);
      //             })
      //         )
      //       )
      //       .subscribe((_) => {
      //         // do nothing
      //       });
      //   });
      //   return promise;
      // },
      images_upload_handler: (blobInfo, progress) =>
        new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.withCredentials = false;
          let url = environment.guestbook.filesUrl;
          xhr.open('POST', url + '/upload');

          xhr.upload.onprogress = (e) => {
            progress((e.loaded / e.total) * 100);
          };

          xhr.onload = () => {
            if (xhr.status === 403) {
              reject({ message: 'HTTP Error: ' + xhr.status, remove: true });
              return;
            }

            if (xhr.status < 200 || xhr.status >= 300) {
              reject('HTTP Error: ' + xhr.status);
              return;
            }

            const json = JSON.parse(xhr.responseText);

            if (!json || typeof json.file != 'string') {
              reject('Invalid JSON: ' + xhr.responseText);
              return;
            }

            resolve(url + '/download/' + json.file);
          };

          xhr.onerror = () => {
            reject(
              'Image upload failed due to a XHR Transport error. Code: ' +
                xhr.status
            );
          };

          const formData = new FormData();
          formData.append('file', blobInfo.blob(), blobInfo.filename());

          xhr.send(formData);
        }),
    };
  }

  @ViewChild('youTubePlayer') youTubePlayer: ElementRef<HTMLDivElement>;

  videoHeight: number | undefined;
  videoWidth: number | undefined;

  constructor(
    public sanitizer: DomSanitizer,
    private http: HttpClient,
    private changeDetectorRef: ChangeDetectorRef,
    private httpErrorService: HttpErrorService,
    private translateService: TranslateService
  ) {
    registerLocaleData(de.default);

    // Subscribe to language changes and reinitialize editor if dialog is open
    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      if (this.showcreatePostDialog && this.editorInitialized) {
        // Reinitialize editor with new language
        this.editorInitialized = false;
        setTimeout(() => {
          this.editorInitialized = true;
          this.changeDetectorRef.detectChanges();
        }, 0);
      }
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  async ngOnInit() {
    this.loadFromDatabase();
  }

  ngAfterViewInit(): void {
    this.onResize();
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize(): void {
    // you can remove this line if you want to have wider video player than 1200px
    this.videoWidth = Math.min(
      this.youTubePlayer.nativeElement.clientWidth,
      384
    );
    // so you keep the ratio
    this.videoHeight = this.videoWidth * 0.6;
    this.changeDetectorRef.detectChanges();
  }

  async onSavePost() {
    await this.saveToDatabase();
    await this.loadFromDatabase();
    this.showcreatePostDialog = false;
  }

  onCreatePost() {
    this.postName = '';
    this.postContent = '';
    // Reinitialize editor with current language
    this.editorInitialized = false;
    setTimeout(() => {
      this.editorInitialized = true;
      this.showcreatePostDialog = true;
      this.changeDetectorRef.detectChanges();
    }, 0);
  }

  private async saveToDatabase() {
    // old PHP API
    //
    // await lastValueFrom(
    //   this.http.post<Post>(
    //     'https://auf-zu-neuen-welten.de/api/posts/post/',
    //     JSON.stringify({
    //       name: this.postName,
    //       content: this.postContent,
    //       date: new Date(),
    //     })
    //   )
    // );

    try {
      const headers = new HttpHeaders().set(
        'Content-Type',
        'application/json; charset=utf-8'
      );
      await lastValueFrom(
        this.http.post<any>(
          environment.guestbook.addPostApi,
          JSON.stringify({
            name: this.postName,
            content: this.postContent,
            date: new Date(),
          }),
          { headers: headers }
        )
      );
    } catch (error) {
      this.httpErrorService.showHttpError(error, 'GuestbookComponent');
    }
  }

  private async loadFromDatabase() {
    // old PHP API
    //
    // this.posts = await lastValueFrom(
    //   this.http.get<Post[]>('https://auf-zu-neuen-welten.de/api/posts/get/')
    // );

    try {
      const posts = await lastValueFrom(
        this.http.get<Post[]>(environment.guestbook.getAllPostsApi)
      );
      this.posts = posts.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      this.httpErrorService.showHttpError(error, 'GuestbookComponent');
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }
}
