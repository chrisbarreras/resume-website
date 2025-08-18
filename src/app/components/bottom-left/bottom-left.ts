import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

@Component({
  selector: 'app-bottom-left',
  standalone: true,
  imports: [CommonModule, NgxExtendedPdfViewerModule],
  templateUrl: './bottom-left.html',
  styleUrls: ['./bottom-left.scss']
})
export class BottomLeftComponent {
  isExpanded = signal(false);
  isAnimating = signal(false);
  
  // Store original scroll position
  private originalScrollPosition = 0;
  
  toggleExpanded() {
    if (this.isAnimating()) {
      return; // Prevent multiple animations
    }
    
    const wasExpanded = this.isExpanded();
    this.isAnimating.set(true);
    
    if (!wasExpanded) {
      // Expanding: Show fullscreen modal and prevent body scrolling
      this.preventScroll();
      this.isExpanded.set(true);
    } else {
      // Collapsing: Hide fullscreen modal and restore body scrolling
      this.allowScroll();
      this.isExpanded.set(false);
    }
    
    // Reset animation state after transition completes
    setTimeout(() => {
      this.isAnimating.set(false);
    }, 400);
  }

  closeExpanded() {
    if (!this.isExpanded() || this.isAnimating()) {
      return;
    }
    
    this.isAnimating.set(true);
    this.allowScroll();
    this.isExpanded.set(false);
    
    setTimeout(() => {
      this.isAnimating.set(false);
    }, 400);
  }
  
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Close fullscreen with Escape key
    if (event.key === 'Escape' && this.isExpanded()) {
      this.closeExpanded();
      event.preventDefault();
    }
  }
  
  downloadResume() {
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = 'assets/Christopher_Barreras_Resume.pdf';
    link.download = 'Christopher_Barreras_Resume.pdf';
    link.target = '_blank';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private preventScroll() {
    // Store current scroll position
    this.originalScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // Add modal-open class
    document.body.classList.add('modal-open');
    
    // Set body top to negative scroll position to maintain visual position
    document.body.style.top = `-${this.originalScrollPosition}px`;
  }

  private allowScroll() {
    // Remove modal-open class
    document.body.classList.remove('modal-open');
    
    // Reset body styles
    document.body.style.top = '';
    
    // Restore scroll position
    window.scrollTo(0, this.originalScrollPosition);
  }
}