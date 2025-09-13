import { Component, OnInit, inject, signal, PLATFORM_ID, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

interface ChatMessage {
  content: string;
  safeContent?: SafeHtml;
  isUser: boolean;
  timestamp: Date;
}

interface JobPostData {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  requirements: string;
  originalUrl: string;
}

@Component({
  selector: 'app-top-left',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './top-left.html',
  styleUrls: ['./top-left.scss']
})
export class TopLeftComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatMessages') private chatMessagesContainer!: ElementRef;
  @ViewChild('chatInput') private chatInputElement!: ElementRef;
  
  http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private sanitizer = inject(DomSanitizer);

  // Signals for reactive state
  messages = signal<ChatMessage[]>([]);
  currentMessage = signal('');
  isLoading = signal(false);
  isInitialLoading = signal(false);
  
  // Get URL parameters for job post data
  welcomeRecipient = signal('Everyone');
  jobPostId = signal<string | null>(null);
  companyName = signal<string | null>(null);

  private shouldScrollToBottom = false;

  ngOnInit() {
    // Only run client-side logic in the browser
    if (isPlatformBrowser(this.platformId)) {
      // Check if there's a job post ID in the URL path
      const currentUrl = window.location.pathname;
      // console.log('Current URL pathname:', currentUrl);
      // Updated regex to handle trailing punctuation and be more flexible
      const jobPostMatch = currentUrl.match(/\/([a-zA-Z0-9]+)[,\.]?$/);
      // console.log('Job post match:', jobPostMatch);
      
      if (jobPostMatch) {
        this.jobPostId.set(jobPostMatch[1]);
        // console.log('Setting job post ID:', jobPostMatch[1]);
        this.welcomeRecipient.set('Loading...'); // Show loading state initially
      } else {
        // Check for query parameters as fallback
        const urlParams = new URLSearchParams(window.location.search);
        const toParam = urlParams.get('to');
        if (toParam) {
          this.welcomeRecipient.set(toParam);
        }
      }
    }

    // Send initial message when component loads
    this.sendInitialMessage();
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    if (isPlatformBrowser(this.platformId) && this.chatMessagesContainer) {
      try {
        const element = this.chatMessagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      } catch (err) {
        console.error('Error scrolling to bottom:', err);
      }
    }
  }

  private focusChatInput(): void {
    if (isPlatformBrowser(this.platformId) && this.chatInputElement) {
      try {
        setTimeout(() => {
          this.chatInputElement.nativeElement.focus();
        }, 100); // Small delay to ensure DOM is updated
      } catch (err) {
        console.error('Error focusing chat input:', err);
      }
    }
  }

  private sendInitialMessage() {
    this.isInitialLoading.set(true);
    
    // Add the initial user message as if they typed it
    const initialUserMessage: ChatMessage = {
      content: 'Why would Chris be a strong hire?',
      isUser: true,
      timestamp: new Date()
    };
    
    this.messages.set([initialUserMessage]);
    this.shouldScrollToBottom = true;
    
    const jobPostId = this.jobPostId();
    // console.log('Sending initial message with job post ID:', jobPostId);
    const requestBody = jobPostId 
      ? { message: 'initial', jobPostId: jobPostId }
      : { message: 'initial' };
    
    // console.log('Request body:', requestBody);
    
    this.http.post<{ answer: string; companyName?: string }>(environment.functionsUrl, requestBody)
      .subscribe({
        next: (response) => {
          // console.log('Response from Firebase function:', response);
          // Update company name and welcome message if provided
          if (response.companyName && this.jobPostId()) {
            this.companyName.set(response.companyName);
            this.welcomeRecipient.set(response.companyName);
            // console.log('Updated welcome recipient to:', response.companyName);
          } else {
            // Fall back to default "Everyone" behavior if no valid company name
            this.welcomeRecipient.set('Everyone');
            // console.log('No valid company name found, using default "Everyone"');
          }
          
          // Add the AI response message
          const responseMessage: ChatMessage = {
            content: response.answer || 'Hello! I\'m here to help you learn about Chris.',
            safeContent: this.sanitizer.bypassSecurityTrustHtml(response.answer || 'Hello! I\'m here to help you learn about Chris.'),
            isUser: false,
            timestamp: new Date()
          };
          this.messages.update(msgs => [...msgs, responseMessage]);
          this.isInitialLoading.set(false);
          this.shouldScrollToBottom = true;
          this.focusChatInput();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error getting initial response:', error);
          
          // Always fall back to default "Everyone" on error
          this.welcomeRecipient.set('Everyone');
          
          let errorMessage = 'Our Chat service is currently unavailable. Feel free to browse Chris\'s resume and projects.';
          
          // Handle different error types
          if (error.status === 429) {
            errorMessage = 'Too many requests. Please wait a moment before trying again.';
          } else if (error.status === 400) {
            errorMessage = error.error?.error || 'Invalid request. Please try again.';
          } else if (error.status === 500) {
            errorMessage = error.error?.error || 'Service temporarily unavailable. Please try again.';
          } else if (error.error?.error) {
            errorMessage = error.error.error;
          }
          
          const errorChatMessage: ChatMessage = {
            content: errorMessage,
            safeContent: this.sanitizer.bypassSecurityTrustHtml(errorMessage),
            isUser: false,
            timestamp: new Date()
          };
          this.messages.update(msgs => [...msgs, errorChatMessage]);
          this.isInitialLoading.set(false);
          this.shouldScrollToBottom = true;
          this.focusChatInput();
        }
      });
  }

  sendMessage() {
    const message = this.currentMessage().trim();
    if (!message || this.isLoading()) return;

    // Add user message to chat with proper structure
    const userMessage: ChatMessage = {
      content: message,
      isUser: true,
      timestamp: new Date()
    };
    
    this.messages.update(msgs => [...(msgs || []), userMessage]);
    this.currentMessage.set('');
    this.isLoading.set(true);
    this.shouldScrollToBottom = true; // Scroll when user sends message

    // Include job post context if available
    const jobPostId = this.jobPostId();
    const requestBody = jobPostId 
      ? { message: message, jobPostId: jobPostId }
      : { message: message };

    // Send to API
    this.http.post<{ answer: string }>(environment.functionsUrl, requestBody)
      .subscribe({
        next: (response) => {
          const aiMessage: ChatMessage = {
            content: response.answer || 'Sorry, I couldn\'t generate a response.',
            safeContent: this.sanitizer.bypassSecurityTrustHtml(response.answer || 'Sorry, I couldn\'t generate a response.'),
            isUser: false,
            timestamp: new Date()
          };
          this.messages.update(msgs => [...(msgs || []), aiMessage]);
          this.isLoading.set(false);
          this.shouldScrollToBottom = true;
          this.focusChatInput();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error sending message:', error);
          
          let errorMessage = 'Sorry, I encountered an error. Please try again.';
          
          // Handle different error types
          if (error.status === 429) {
            errorMessage = 'Too many requests. Please wait a moment before trying again.';
          } else if (error.status === 400) {
            errorMessage = error.error?.error || 'Invalid request. Please check your message and try again.';
          } else if (error.status === 500) {
            errorMessage = error.error?.error || 'Service temporarily unavailable. Please try again in a moment.';
          } else if (error.error?.error) {
            errorMessage = error.error.error;
          }
          
          const aiErrorMessage: ChatMessage = {
            content: errorMessage,
            safeContent: this.sanitizer.bypassSecurityTrustHtml(errorMessage),
            isUser: false,
            timestamp: new Date()
          };
          this.messages.update(msgs => [...(msgs || []), aiErrorMessage]);
          this.isLoading.set(false);
          this.shouldScrollToBottom = true;
          this.focusChatInput();
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