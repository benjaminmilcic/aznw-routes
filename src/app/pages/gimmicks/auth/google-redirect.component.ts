// google-redirect.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
    selector: 'app-google-redirect',
    template: `<p>Logging in with Google...</p>`,
    standalone: false
})
export class GoogleRedirectComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const token = params['token'];
      if (token) {
        this.authService.setUserFromToken(token);
        this.router.navigate(['/gimmicks/auth/main'], {
          queryParams: { from: 'googleLogin' },
        }); // z.B. Hauptseite
      } else {
        // Fehlerbehandlung
        alert('Google Login fehlgeschlagen');
      }
    });
  }
}
