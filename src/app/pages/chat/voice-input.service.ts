import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

/** Why the speech input failed – the component shows a translated message. */
export class VoiceInputError extends Error {
  constructor(readonly code: 'unsupported' | 'microphone' | 'rate_limit' | 'failed') {
    super(code);
  }
}

/** Records audio from the microphone and turns it into text via the backend (Groq Whisper). */
@Injectable({ providedIn: 'root' })
export class VoiceInputService {
  readonly state = signal<VoiceState>('idle');
  /** The live microphone stream while recording – drives the waveform display. */
  readonly stream = signal<MediaStream | null>(null);

  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];

  async start(): Promise<void> {
    if (this.state() !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw new VoiceInputError('unsupported');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
      throw new VoiceInputError('microphone');
    });
    this.chunks = [];
    this.recorder = new MediaRecorder(stream);
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder.start();
    this.stream.set(stream);
    this.state.set('recording');
  }

  /** Stops the recording and resolves with the recognised text (empty if nothing was said). */
  async stop(): Promise<string> {
    const recorder = this.recorder;
    if (!recorder || this.state() !== 'recording') return '';

    await this.stopRecorder(recorder);

    const mimeType = recorder.mimeType || 'audio/webm';
    const audio = new Blob(this.chunks, { type: mimeType });
    if (!audio.size) {
      this.reset();
      return '';
    }

    this.state.set('transcribing');
    try {
      const form = new FormData();
      form.append('audio', audio, `recording.${extensionFor(mimeType)}`);
      // Always Whisper large-v3 – more accurate than turbo, especially for less common languages such as Croatian
      form.append('quality', 'quality');
      const response = await fetch(environment.chat.transcribeApi, { method: 'POST', body: form }).catch(() => {
        throw new VoiceInputError('failed');
      });
      if (response.status === 429) throw new VoiceInputError('rate_limit');
      if (!response.ok) throw new VoiceInputError('failed');
      const { text } = (await response.json()) as { text: string };
      return text;
    } finally {
      this.reset();
    }
  }

  /** Stops the recording and throws the audio away. */
  async cancel(): Promise<void> {
    if (this.recorder && this.state() === 'recording') {
      await this.stopRecorder(this.recorder);
    }
    this.reset();
  }

  private async stopRecorder(recorder: MediaRecorder): Promise<void> {
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
    recorder.stop();
    await stopped;
    recorder.stream.getTracks().forEach((track) => track.stop()); // turns off the browser's mic indicator
    this.recorder = undefined;
  }

  private reset(): void {
    this.chunks = [];
    this.stream.set(null);
    this.state.set('idle');
  }
}

/** Whisper infers the audio format from the file extension, so it has to match the recording. */
function extensionFor(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}
