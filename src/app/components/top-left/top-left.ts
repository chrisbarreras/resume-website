import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-top-left',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './top-left.html',
  styleUrls: ['./top-left.scss']
})
export class TopLeftComponent implements OnInit {
  http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  // Signals for reactive state
  messages = signal<ChatMessage[]>([]);
  currentMessage = signal('');
  isLoading = signal(false);
  isInitialLoading = signal(false);
  
  // Get 'to' query param from URL
  welcomeRecipient = signal('Everyone');

  ngOnInit() {
    // Get welcome recipient from query params
    this.route.queryParams.subscribe(params => {
      this.welcomeRecipient.set(params['to'] || 'Everyone');
    });

    // Send initial message when component loads
    this.sendInitialMessage();
  }

  private sendInitialMessage() {
    this.isInitialLoading.set(true);
    
    // Add initial "thinking" message
    this.messages.set([{
      content: 'Loading initial information...',
      isUser: false,
      timestamp: new Date()
    }]);
    
    this.http.post<{ answer: string }>(environment.functionsUrl, { message: 'initial' })
      .subscribe({
        next: (response) => {
          // Replace the loading message with the actual response
          this.messages.set([{
            content: response.answer,
            isUser: false,
            timestamp: new Date()
          }]);
          this.isInitialLoading.set(false);
        },
        error: (error) => {
          console.error('Error getting initial response:', error);
          this.messages.set([{
            content: 'Hello! I\'m here to help answer questions about Chris Barreras. Feel free to ask me anything!',
            isUser: false,
            timestamp: new Date()
          }]);
          this.isInitialLoading.set(false);
        }
      });
  }

  sendMessage() {
    const message = this.currentMessage().trim();
    if (!message || this.isLoading()) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      content: message,
      isUser: true,
      timestamp: new Date()
    };
    
    this.messages.update(msgs => [...msgs, userMessage]);
    this.currentMessage.set('');
    this.isLoading.set(true);

    // Send to API
    this.http.post<{ answer: string }>(environment.functionsUrl, { message })
      .subscribe({
        next: (response) => {
          const aiMessage: ChatMessage = {
            content: response.answer,
            isUser: false,
            timestamp: new Date()
          };
          this.messages.update(msgs => [...msgs, aiMessage]);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error sending message:', error);
          const errorMessage: ChatMessage = {
            content: 'Sorry, I encountered an error. Please try again.',
            isUser: false,
            timestamp: new Date()
          };
          this.messages.update(msgs => [...msgs, errorMessage]);
          this.isLoading.set(false);
        }
      });
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}