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
      baseName: '20230806_140516 (3)',
      alt: 'Christopher Barreras at outdoor event',
      originalFile: '20230806_140516 (3).jpg'
    },
    {
      baseName: '20250510_111134',
      alt: 'Christopher Barreras professional photo',
      originalFile: '20250510_111134.jpg'
    },
    {
      baseName: 'Screenshot 2025-08-16 193740',
      alt: 'Christopher Barreras portrait',
      originalFile: 'Screenshot 2025-08-16 193740.png'
    }
  ];

  // Extended list with a cloned first slide for seamless looping
  displayImages = this.imageConfigs.concat(this.imageConfigs[0]);

  // Reactive properties
  currentIndex = signal(0);
  enableTransition = signal(true);
  supportsWebP = signal(false);
  
  // Private properties for slideshow management
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
    
    return sizes.map((size, index) => 
      `assets/optimized/${baseName}-${size}.${format} ${widths[index]}w`
    ).join(', ');
  }

  // Generate default src (fallback)
  getDefaultSrc(baseName: string) {
    return `assets/optimized/${baseName}-medium.jpg`;
  }

  // Fallback to original images if optimized ones fail
  getOriginalSrc(baseName: string) {
    const config = this.imageConfigs.find(c => c.baseName === baseName);
    if (config?.originalFile.includes('.png')) {
      return `assets/${config.originalFile}`;
    }
    return `assets/${baseName}.jpg`;
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
    console.log('Image failed to load:', event.target.src);
    
    const img = event.target;
    const alt = img.alt;
    const failedImage = this.imageConfigs.find(config => config.alt === alt);
    
    if (failedImage) {
      const retryCount = parseInt(img.dataset.retryCount || '0');
      
      if (retryCount < 3) {
        img.dataset.retryCount = (retryCount + 1).toString();
        
        if (retryCount === 0 && img.src.includes('optimized/')) {
          img.src = `assets/${failedImage.originalFile}`;
        } else if (retryCount === 1 && failedImage.originalFile.includes('.JPG')) {
          img.src = `assets/${failedImage.originalFile.replace('.JPG', '.jpg')}`;
        } else if (retryCount === 1 && failedImage.originalFile.includes('.PNG')) {
          img.src = `assets/${failedImage.originalFile.replace('.PNG', '.png')}`;
        } else if (retryCount === 2) {
          const timestamp = Date.now();
          img.src = `assets/${failedImage.originalFile}?t=${timestamp}`;
        }
      } else {
        console.error('All fallbacks failed for:', failedImage.originalFile);
        img.style.backgroundColor = '#f0f0f0';
        img.style.display = 'block';
        img.alt = 'Image temporarily unavailable';
        
        // Retry after 30 seconds
        setTimeout(() => {
          if (img.dataset.retryCount) {
            delete img.dataset.retryCount;
            img.src = `assets/${failedImage.originalFile}`;
          }
        }, 30000);
      }
    }
  }

  private setupPageVisibilityHandling() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isPageVisible = false;
        console.log('Page hidden - pausing slideshow');
      } else {
        this.isPageVisible = true;
        console.log('Page visible - resuming slideshow');
        this.handlePageResume();
      }
    });

    // Handle window focus/blur
    window.addEventListener('focus', () => {
      this.isPageVisible = true;
      this.handlePageResume();
    });

    window.addEventListener('blur', () => {
      this.isPageVisible = false;
      console.log('Window blurred - pausing slideshow');
    });

    // Handle page show (back/forward navigation)
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        this.handlePageResume();
      }
    });
  }

  private handlePageResume() {
    console.log('Resuming slideshow...');
    
    // Calculate missed slides
    const timeSinceLastAdvance = Date.now() - this.lastAdvanceTime;
    const missedSlides = Math.floor(timeSinceLastAdvance / this.SLIDE_INTERVAL);
    
    if (missedSlides > 0) {
      console.log(`Catching up ${missedSlides} missed slides`);
      const slidesToAdvance = Math.min(missedSlides, 3);
      for (let i = 0; i < slidesToAdvance; i++) {
        this.advanceSlide();
      }
    }
    
    // Restart the slideshow interval
    this.restartSlideshow();
    
    // Check for failed images
    this.checkAndReloadImages();
  }

  private startSlideshow() {
    this.lastAdvanceTime = Date.now();
    
    this.intervalId = setInterval(() => {
      if (this.isPageVisible) {
        this.advanceSlide();
        this.lastAdvanceTime = Date.now();
      }
    }, this.SLIDE_INTERVAL);
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
      this.enableTransition.set(true);
      this.currentIndex.update(i => i + 1);
    } catch (error) {
      console.warn('Error advancing slide, recovering...', error);
      this.recoverSlideshow();
    }
  }

  private recoverSlideshow() {
    console.log('Recovering slideshow state...');
    try {
      this.enableTransition.set(false);
      this.currentIndex.set(0);
      
      const trackEl = this.trackRef?.nativeElement;
      if (trackEl) {
        void trackEl.offsetHeight;
      }
      
      requestAnimationFrame(() => {
        this.enableTransition.set(true);
        this.restartSlideshow();
      });
    } catch (recoveryError) {
      console.error('Failed to recover slideshow:', recoveryError);
    }
  }

  private checkAndReloadImages() {
    const trackEl = this.trackRef?.nativeElement;
    if (!trackEl) return;
    
    const images = trackEl.querySelectorAll('img');
    images.forEach((img: HTMLImageElement) => {
      if (img.naturalWidth === 0 && img.src) {
        console.log('Reloading failed image:', img.src);
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
    if (this.currentIndex() === this.imageConfigs.length) {
      this.enableTransition.set(false);
      this.currentIndex.set(0);
      const trackEl = this.trackRef?.nativeElement;
      if (trackEl) { void trackEl.offsetHeight; }
      requestAnimationFrame(() => requestAnimationFrame(() => this.enableTransition.set(true)));
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
      // Clean up event listeners
      document.removeEventListener('visibilitychange', () => {});
      window.removeEventListener('focus', () => {});
      window.removeEventListener('blur', () => {});
      window.removeEventListener('pageshow', () => {});
    }
  }
}
