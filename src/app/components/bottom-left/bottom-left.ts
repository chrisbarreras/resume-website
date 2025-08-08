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
  zoomLevel = signal(1);
  
  // Make Math available in template
  Math = Math;
  
  // Store original scroll position
  private originalScrollPosition = 0;
  
  toggleExpanded() {
    console.log('toggleExpanded called, current state:', this.isExpanded());
    
    if (this.isAnimating()) {
      console.log('Animation in progress, ignoring click');
      return; // Prevent multiple animations
    }
    
    const wasExpanded = this.isExpanded();
    this.isAnimating.set(true);
    
    if (!wasExpanded) {
      // Expanding: Show fullscreen modal and prevent body scrolling
      console.log('Expanding PDF viewer to fullscreen');
      this.preventScroll();
      this.isExpanded.set(true);
    } else {
      // Collapsing: Hide fullscreen modal and restore body scrolling
      console.log('Collapsing PDF viewer to mini mode');
      this.allowScroll();
      this.isExpanded.set(false);
    }
    
    console.log('New state after toggle:', this.isExpanded());
    
    // Reset animation state after transition completes
    setTimeout(() => {
      this.isAnimating.set(false);
      console.log('Animation completed, final state:', this.isExpanded());
    }, 400); // Match animation duration
  }

  closeExpanded() {
    if (!this.isExpanded() || this.isAnimating()) {
      return; // Already closed or animating
    }
    
    console.log('Closing expanded PDF viewer');
    this.isAnimating.set(true);
    this.allowScroll();
    this.isExpanded.set(false);
    
    // Reset animation state after transition completes
    setTimeout(() => {
      this.isAnimating.set(false);
      console.log('Close animation completed');
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

  zoomIn() {
    const currentZoom = this.zoomLevel();
    if (currentZoom < 3) { // Max zoom 300%
      this.zoomLevel.set(currentZoom + 0.2);
    }
  }

  zoomOut() {
    const currentZoom = this.zoomLevel();
    if (currentZoom > 0.5) { // Min zoom 50%
      this.zoomLevel.set(currentZoom - 0.2);
    }
  }

  resetZoom() {
    this.zoomLevel.set(1);
  }

  private preventScroll() {
    // Store current scroll position
    this.originalScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // Add modal-open class
    document.body.classList.add('modal-open');
    
    // Set body top to negative scroll position to maintain visual position
    document.body.style.top = `-${this.originalScrollPosition}px`;
    
    // Add comprehensive scroll event listeners
    const options = { passive: false, capture: true };
    
    // Mouse scroll events
    document.addEventListener('wheel', this.preventScrollEvent, options);
    window.addEventListener('wheel', this.preventScrollEvent, options);
    
    // Touch scroll events
    document.addEventListener('touchmove', this.preventScrollEvent, options);
    window.addEventListener('touchmove', this.preventScrollEvent, options);
    
    // Keyboard scroll events
    document.addEventListener('keydown', this.preventKeyScroll, options);
    window.addEventListener('keydown', this.preventKeyScroll, options);
    
    // Additional scroll events
    document.addEventListener('scroll', this.preventScrollEvent, options);
    window.addEventListener('scroll', this.preventScrollEvent, options);
    
    // Disable scrolling on document and window
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('resize', this.preventScrollEvent, options);
  }

  private allowScroll() {
    // Remove modal-open class
    document.body.classList.remove('modal-open');
    
    // Reset body styles
    document.body.style.top = '';
    document.documentElement.style.overflow = '';
    
    // Restore scroll position
    window.scrollTo(0, this.originalScrollPosition);
    
    // Remove all scroll event listeners
    const options = { capture: true };
    
    document.removeEventListener('wheel', this.preventScrollEvent, options);
    window.removeEventListener('wheel', this.preventScrollEvent, options);
    
    document.removeEventListener('touchmove', this.preventScrollEvent, options);
    window.removeEventListener('touchmove', this.preventScrollEvent, options);
    
    document.removeEventListener('keydown', this.preventKeyScroll, options);
    window.removeEventListener('keydown', this.preventKeyScroll, options);
    
    document.removeEventListener('scroll', this.preventScrollEvent, options);
    window.removeEventListener('scroll', this.preventScrollEvent, options);
    
    window.removeEventListener('resize', this.preventScrollEvent, options);
  }

  private preventScrollEvent = (e: Event): boolean => {
    // Always prevent scroll events from reaching the background
    // regardless of where they originate when modal is open
    if (this.isExpanded()) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
    return true;
  }

  private preventKeyScroll = (e: KeyboardEvent): boolean => {
    // Prevent arrow keys, space, page up/down from scrolling the background
    const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    
    if (this.isExpanded() && scrollKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
    return true;
  }
}