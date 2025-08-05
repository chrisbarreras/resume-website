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
      baseName: 'DSC_1693~2 (2)',
      alt: 'Christopher Barreras portrait',
      originalFile: 'DSC_1693~2 (2).JPG'
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
    // First try optimized version, then fallback to original
    return `assets/optimized/${baseName}-medium.jpg`;
  }

  // Fallback to original images if optimized ones fail
  getOriginalSrc(baseName: string) {
    return `assets/${baseName}.jpg`;
  }

  // Handle image loading errors
  onImageError(event: any) {
    console.log('Image failed to load:', event.target.src);
    
    // Get the image element and its alt text to identify which image failed
    const img = event.target;
    const alt = img.alt;
    const failedImage = this.imageConfigs.find(config => config.alt === alt);
    
    if (failedImage) {
      console.log('Attempting fallback for:', failedImage.originalFile);
      
      // Try different fallback strategies
      if (img.src.includes('optimized/')) {
        // If optimized version failed, try original
        img.src = `assets/${failedImage.originalFile}`;
      } else if (failedImage.originalFile.includes('.JPG')) {
        // Try lowercase extension
        img.src = `assets/${failedImage.originalFile.replace('.JPG', '.jpg')}`;
      } else {
        // Hide the failed image to prevent gray space
        img.style.display = 'none';
        console.error('All fallbacks failed for:', failedImage.originalFile);
      }
    }
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
    console.log('Starting slideshow with', this.imageConfigs.length, 'images');
    
    // Increase interval to 5 seconds for better viewing
    this.intervalId = setInterval(() => {
      this.currentIndex.update(i => {
        const newIndex = (i + 1) % this.imageConfigs.length;
        console.log('Cycling to image', newIndex + 1, 'of', this.imageConfigs.length, ':', this.imageConfigs[newIndex].originalFile);
        return newIndex;
      });
    }, 5000); // Changed from 4000 to 5000ms (5 seconds)
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