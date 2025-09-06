import { Component, signal, OnDestroy, PLATFORM_ID, Inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-top-right',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-right.html',
  styleUrls: ['./top-right.scss']
})
export class TopRightComponent implements OnDestroy {
  // Image configurations
  imageConfigs = [
    {
      baseName: 'With_Sister_Hat',
      alt: 'Christopher Barreras with Youngest Sibling',
      originalFile: 'With_Sister_Hat.jpg'
    },
    {
      baseName: 'Graduation_Pic_Family',
      alt: 'Christopher Barreras Graduate with Family',
      originalFile: 'Graduation_Pic_Family.jpg'
    },
    {
      baseName: 'PDP_Hoodie',
      alt: 'Christopher Barreras Portrait',
      originalFile: 'PDP_Hoodie.jpg'
    },
    {
      baseName: 'Graduation_Port',
      alt: 'Christopher Barreras Graduation Photo next to the Port',
      originalFile: 'Graduation_Port.jpg'
    },
    {
      baseName: 'With_Sister_Sweater',
      alt: 'Christopher Barreras holding Youngest Sibling',
      originalFile: 'With_Sister_Sweater.jpg'
    },
    {
      baseName: 'Graduation_Mom',
      alt: 'Christopher Barreras Graduation Photo with Mother',
      originalFile: 'Graduation_Mom.jpg'
    },
    {
      baseName: 'With_Dad_Fair',
      alt: 'Christopher Barreras with Father',
      originalFile: 'With_Dad_Fair.jpg'
    },
    {
      baseName: 'Graduation_Alone',
      alt: 'Christopher Barreras Graduation Photo',
      originalFile: 'Graduation_Alone.jpg'
    },
    {
      baseName: 'High_Five_Sister',
      alt: 'Christopher Barreras high fiving Youngest Sibling',
      originalFile: 'High_Five_Sister.jpg'
    }
  ];

  // Extended list with a cloned first slide for seamless looping
  displayImages = this.imageConfigs.concat(this.imageConfigs[0]);

  // Reactive properties
  currentIndex = signal(0);
  enableTransition = signal(true);
  supportsWebP = signal(false);
  
  // Private properties for slideshow managementt
  private intervalId: any = null;
  private isPageVisible = true;
  private lastAdvanceTime = 0;
  private readonly SLIDE_INTERVAL = 5000; // 5 seconds
  
  @ViewChild('track', { static: false }) trackRef!: ElementRef<HTMLDivElement>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.checkWebPSupport();
      this.startSlideshow();
      this.setupPageVisibilityHandling();
    }
  }

  // Get current image configuration
  getCurrentImage() {
    return this.imageConfigs[this.currentIndex() % this.imageConfigs.length];
  }

  // Generate srcset for responsive images
  getSrcSet(baseName: string, format: 'jpg' | 'webp' = 'jpg') {
    const sizes = ['small', 'medium', 'large'];
    const widths = [400, 600, 800];
    // Use encodeURIComponent for baseName to avoid issues with spaces or special chars
    return sizes.map((size, index) =>
      `assets/optimized/${encodeURIComponent(baseName)}-${size}.${format} ${widths[index]}w`
    ).join(', ');
  }

  // Generate default src (fallback)
  getDefaultSrc(baseName: string) {
    // Use encodeURIComponent for baseName
    return `assets/optimized/${encodeURIComponent(baseName)}-medium.jpg`;
  }

  // Fallback to original images if optimized ones fail
  getOriginalSrc(baseName: string) {
    const config = this.imageConfigs.find(c => c.baseName === baseName);
    if (!config) return '';
    return `assets/${config.originalFile}`;
  }

  // Handle successful image loads
  onImageLoad(event: any) {
    const img = event.target;
    if (img.dataset.retryCount) {
      delete img.dataset.retryCount;
    }
    img.style.display = 'block';
    img.style.backgroundColor = '';
  }

  // Handle image loading errors with retry mechanism
  onImageError(event: any) {
    const img = event.target;
    const alt = img.alt;
    const failedImage = this.imageConfigs.find(config => config.alt === alt);

    if (failedImage) {
      const retryCount = parseInt(img.dataset.retryCount || '0');
      // If currently trying optimized, fallback to original
      if (retryCount === 0 && img.src.includes('optimized/')) {
        img.dataset.retryCount = '1';
        img.src = `assets/${failedImage.originalFile}`;
        return;
      }
      // If currently trying original, show unavailable after one retry
      if (retryCount === 1 && img.src.includes(failedImage.originalFile)) {
        img.dataset.retryCount = '2';
        img.style.backgroundColor = '#f0f0f0';
        img.style.display = 'block';
        img.alt = 'Image temporarily unavailable';
        return;
      }
      // If retryCount > 1, do nothing (already marked unavailable)
    }
  }

  private setupPageVisibilityHandling() {
    // Simple visibility change handler
    const handleVisibilityChange = () => {
      const wasVisible = this.isPageVisible;
      this.isPageVisible = !document.hidden;
      
      // console.log(`Visibility changed: ${wasVisible} -> ${this.isPageVisible}`);
      
      if (!wasVisible && this.isPageVisible) {
        // Page became visible - resume slideshow
        // console.log('Page became visible - resuming slideshow');
        this.handlePageResume();
      } else if (wasVisible && !this.isPageVisible) {
        // Page became hidden - pause slideshow
        // console.log('Page became hidden - slideshow will pause');
      }
    };

    // Handle window focus/blur for computer sleep scenarios
    const handleWindowFocus = () => {
      // console.log('Window gained focus');
      this.isPageVisible = true;
      this.handlePageResume();
    };

    const handleWindowBlur = () => {
      // console.log('Window lost focus');
      this.isPageVisible = false;
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    // Store references for cleanup
    (this as any)._visibilityHandler = handleVisibilityChange;
    (this as any)._focusHandler = handleWindowFocus;
    (this as any)._blurHandler = handleWindowBlur;
  }

  private handlePageResume() {
    // console.log('Resuming slideshow...');
    
    // Calculate time away
    const timeSinceLastAdvance = Date.now() - this.lastAdvanceTime;
    // console.log(`Time since last advance: ${timeSinceLastAdvance}ms`);
    
    // For long periods away (like computer sleep), just advance to next slide
    // instead of trying to catch up rapidly
    if (timeSinceLastAdvance > this.SLIDE_INTERVAL) {
      // console.log('Long absence detected - advancing to next slide');
      this.advanceSlide();
    }
    
    // Restart the slideshow interval with fresh timing
    this.restartSlideshow();
    
    // Check for failed images
    this.checkAndReloadImages();
  }

  private startSlideshow() {
    // Update the timing reference
    this.lastAdvanceTime = Date.now();
    
    this.intervalId = setInterval(() => {
      if (this.isPageVisible) {
        this.advanceSlide();
      } else {
        // console.log('Skipping slide advance - page not visible');
      }
    }, this.SLIDE_INTERVAL);
    
    // console.log('Slideshow started');
  }

  private stopSlideshow() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private restartSlideshow() {
    this.stopSlideshow();
    this.startSlideshow();
  }

  private advanceSlide() {
    try {
      const currentIdx = this.currentIndex();
      // console.log(`Advancing from slide ${currentIdx} to ${currentIdx + 1}`);
      
      this.enableTransition.set(true);
      this.currentIndex.update(i => i + 1);
      
      // Update last advance time immediately to prevent timing issues
      this.lastAdvanceTime = Date.now();
      
    } catch (error) {
      console.warn('Error advancing slide, recovering...', error);
      this.recoverSlideshow();
    }
  }

  private recoverSlideshow() {
    // console.log('Recovering slideshow state...');
    try {
      // Stop any running slideshow
      this.stopSlideshow();
      
      // Reset to a known good state
      this.enableTransition.set(false);
      this.currentIndex.set(0);
      
      const trackEl = this.trackRef?.nativeElement;
      if (trackEl) {
        // Force a reflow to ensure DOM is updated
        void trackEl.offsetHeight;
        
        // Reset transform explicitly
        trackEl.style.transform = 'translate3d(0%, 0, 0)';
      }
      
      // Wait a moment then restart with transitions
      setTimeout(() => {
        this.enableTransition.set(true);
        this.lastAdvanceTime = Date.now();
        this.startSlideshow();
        // console.log('Slideshow recovered and restarted');
      }, 100);
      
    } catch (recoveryError) {
      console.error('Failed to recover slideshow:', recoveryError);
      // Last resort - reload the page
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 5000);
    }
  }

  private checkAndReloadImages() {
    const trackEl = this.trackRef?.nativeElement;
    if (!trackEl) return;
    
    const images = trackEl.querySelectorAll('img');
    images.forEach((img: HTMLImageElement) => {
      if (img.naturalWidth === 0 && img.src) {
        // console.log('Reloading failed image:', img.src);
        const originalSrc = img.src;
        img.src = '';
        setTimeout(() => {
          img.src = originalSrc;
        }, 100);
      }
    });
  }

  onTransitionEnd(event: TransitionEvent) {
    if (event.propertyName !== 'transform') return;
    
    const currentIdx = this.currentIndex();
    // console.log(`Transition ended at index ${currentIdx}, total images: ${this.imageConfigs.length}`);
    
    if (currentIdx === this.imageConfigs.length) {
      // console.log('Reached clone slide - resetting to first slide');
      this.enableTransition.set(false);
      this.currentIndex.set(0);
      
      const trackEl = this.trackRef?.nativeElement;
      if (trackEl) { 
        void trackEl.offsetHeight; 
        // Explicitly set transform to ensure position is correct
        trackEl.style.transform = 'translate3d(0%, 0, 0)';
      }
      
      // Re-enable transitions after DOM update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.enableTransition.set(true);
          // console.log('Reset complete - transitions re-enabled');
        });
      });
    }
  }

  private checkWebPSupport() {
    if (typeof Image === 'undefined') {
      this.supportsWebP.set(false);
      return;
    }
    
    const webp = new Image();
    webp.onload = webp.onerror = () => {
      this.supportsWebP.set(webp.height === 2);
    };
    webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  }

  ngOnDestroy() {
    this.stopSlideshow();
    
    if (isPlatformBrowser(this.platformId)) {
      // Clean up event listeners properly
      const visibilityHandler = (this as any)._visibilityHandler;
      const focusHandler = (this as any)._focusHandler;
      const blurHandler = (this as any)._blurHandler;
      
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
      if (focusHandler) {
        window.removeEventListener('focus', focusHandler);
      }
      if (blurHandler) {
        window.removeEventListener('blur', blurHandler);
      }
    }
  }
}
