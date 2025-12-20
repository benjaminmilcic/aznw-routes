import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpErrorComponent } from './http-error.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HttpErrorService {
  dialogOpen = false;
  errorMailSuccess: boolean;

  constructor(private dialog: MatDialog, private http: HttpClient) {}

  async showHttpError(error: any, component: string) {
    console.log(component, error);
    const errorDetails = this.formatErrorDetails(error, component);
    try {
      const headers = new HttpHeaders().set(
        'Content-Type',
        'application/json; charset=utf-8'
      );

      await lastValueFrom(
        this.http.post<any>(
          environment.error.errorMessageApi,
          { error: errorDetails },
          {
            headers: headers,
          }
        )
      );
      this.errorMailSuccess = true;
    } catch (error) {
      console.log(error);
      this.errorMailSuccess = false;
    }
    if (!this.dialogOpen) {
      this.dialogOpen = true;
      const dialogRef = this.dialog.open(HttpErrorComponent, {
        data: { success:this.errorMailSuccess },
        disableClose: true,
        panelClass: 'http-error-dialog-container',
      });
      dialogRef.afterClosed().subscribe((result) => {
        this.dialogOpen = false;
      });
    }
  }

  formatErrorDetails(error: any, component: string): string {
    let errorDetails: any = {};

    if (error instanceof Error) {
      errorDetails = {
        component,
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (typeof error === 'object' && error !== null) {
      errorDetails = { component, ...error };
    } else {
      errorDetails = { component, message: String(error) };
    }

    return JSON.stringify(errorDetails); // Beautify JSON output
  }
}
