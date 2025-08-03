import { Component, signal, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-top-right',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-right.html',
  styleUrls: ['./top-right.scss']
})
export class TopRightComponent implements OnDestroy {
  // Optimized image configurations with multiple sizes and formats
  private imageConfigs = [
    {
      baseName: '20230806_140516 (3)',
      alt: 'Christopher Barreras at outdoor event'
    },
    {
      baseName: '20250510_111134',
      alt: 'Christopher Barreras professional photo'
    },
    {
      baseName: 'DSC_1693~2 (2)',
      alt: 'Christopher Barreras portrait'
    }
  ];

  currentIndex = signal(0);
  
  // Get current image configuration
  getCurrentImage() {
    return this.imageConfigs[this.currentIndex()];
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

  // Check if browser supports WebP
  supportsWebP = signal(false);

  private intervalId: any = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Only check WebP support in browser environment
    if (isPlatformBrowser(this.platformId)) {
      this.checkWebPSupport();
      // Start slideshow interval only in browser
      this.startSlideshow();
    }
  }

  private startSlideshow() {
    this.intervalId = setInterval(() => {
      this.currentIndex.update(i => (i + 1) % this.imageConfigs.length);
    }, 4000); // Change image every 4 seconds
  }

  private checkWebPSupport() {
    // Double check we're in browser before using Image
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
    if (this.intervalId) {
      clearInterval(this.intervalId); // Clean up interval on component destruction
    }
  }
}