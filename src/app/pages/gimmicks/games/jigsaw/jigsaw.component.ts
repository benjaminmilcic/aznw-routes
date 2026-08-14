import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { GamesService } from '../games.service';

@Component({
    selector: 'app-jigsaw',
    imports: [CommonModule, TranslateModule],
    templateUrl: './jigsaw.component.html',
    styleUrl: './jigsaw.component.css'
})
export class JigsawComponent implements OnInit, OnDestroy {
  trustedUrl;
  enabled = true;
  private langChangeSub: Subscription;

  constructor(
    public translateService: TranslateService,
    private sanitizer: DomSanitizer,
    private gameService:GamesService
  ) {
    this.trustedUrl = sanitizer.bypassSecurityTrustResourceUrl(
      '/assets/iframe-content/index.html?lang=' + translateService.currentLang
    );
  }

  ngOnInit(): void {
    this.gameService.changeGameName.next('jigsaw');
    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.trustedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        '/assets/iframe-content/index.html?lang=' +
          this.translateService.currentLang
      );
    });
    this.enabled = false;
    setTimeout(() => {
      this.enabled = true;
    }, 50);
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }
}
