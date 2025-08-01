import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router'; // You'll need to add provideRouter() in main.ts if you use this
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-top-left',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-left.html',
  styleUrls: ['./top-left.scss']
})
export class TopLeftComponent implements OnInit {
  http = inject(HttpClient);

  // Get 'to' query param from URL: ?to=Googlers
  // Note: For this to work, add `provideRouter()` to your providers in main.ts
  private route = inject(ActivatedRoute);
  welcomeRecipient = toSignal(
    this.route.queryParams.pipe(map(params => params['to'] || 'Everyone'))
  );

  // Fetch the answer from your Firebase Function
  geminiAnswer = toSignal(
    this.http.get<{ answer: string }>(environment.functionsUrl)
      .pipe(map(res => res.answer)),
    { initialValue: 'Thinking...' }
  );

  ngOnInit() {} // Keep for ActivatedRoute
}