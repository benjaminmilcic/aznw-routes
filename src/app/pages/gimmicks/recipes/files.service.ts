import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface FileUploadResponse {
  file: string;
}

@Injectable({
  providedIn: 'root',
})
export class FilesService {
  private apiUrl = environment.recipes.filesUrl + '/upload';

  constructor(private http: HttpClient) {}

  /**
   * Konvertiert eine dataURL (base64) in ein File-Objekt
   */
  dataURLtoFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Lädt ein Bild hoch und gibt den Dateinamen zurück
   */
  uploadImage(dataUrl: string): Observable<FileUploadResponse> {
    const file = this.dataURLtoFile(dataUrl, 'recipe-image.png');
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<FileUploadResponse>(this.apiUrl, formData);
  }
}
