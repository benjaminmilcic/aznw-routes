import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GamesService } from '../games.service';

@Component({
    selector: 'app-jigsaw',
    imports: [CommonModule, TranslateModule],
    templateUrl: './jigsaw.component.html',
    styleUrl: './jigsaw.component.css'
})
export class JigsawComponent implements OnInit {
  trustedUrl;
  enabled = true;
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
    this.translateService.onLangChange.subscribe(() => {
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
}
