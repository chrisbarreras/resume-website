import { Component, signal, HostListener, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

@Component({
  selector: 'app-bottom-left',
  standalone: true,
  imports: [CommonModule, NgxExtendedPdfViewerModule],
  templateUrl: './bottom-left.html',
  styleUrls: ['./bottom-left.scss']
})
export class BottomLeftComponent implements AfterViewInit, OnDestroy {
  isExpanded = signal(false);
  
  constructor(private elementRef: ElementRef) {}
  
  ngAfterViewInit() {
    // Additional setup if needed
  }
  
  ngOnDestroy() {
    // Make sure to close fullscreen if component is destroyed
    if (this.isExpanded()) {
      this.closeExpanded();
    }
  }
  
  toggleExpanded() {
    this.isExpanded.set(!this.isExpanded());
    
    // Force DOM update and resize after transition
    setTimeout(() => {
      this.refreshPdfViewer();
    }, 100);
  }
  
  closeExpanded() {
    this.isExpanded.set(false);
    
    // Force DOM update and resize after transition
    setTimeout(() => {
      this.refreshPdfViewer();
    }, 100);
  }
  
  private refreshPdfViewer() {
    // Force resize events to help PDF viewer adjust
    window.dispatchEvent(new Event('resize'));
    
    // Additional refresh logic if needed
    const pdfViewer = this.elementRef.nativeElement.querySelector('ngx-extended-pdf-viewer');
    if (pdfViewer) {
      // Trigger a re-render by temporarily hiding and showing
      pdfViewer.style.display = 'none';
      setTimeout(() => {
        pdfViewer.style.display = 'block';
        window.dispatchEvent(new Event('resize'));
      }, 10);
    }
  }
  
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Close fullscreen with Escape key
    if (event.key === 'Escape' && this.isExpanded()) {
      this.closeExpanded();
      event.preventDefault();
    }
  }
  
  @HostListener('window:resize')
  onWindowResize() {
    // Handle window resize events when in fullscreen
    if (this.isExpanded()) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
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
}