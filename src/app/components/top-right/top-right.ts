import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-top-right',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-right.html',
  styleUrls: ['./top-right.scss']
})
export class TopRightComponent implements OnDestroy {
  // Replace with your actual image URLs
  imageUrls = signal([
    'path/to/your/photo1.jpg',
    'path/to/your/photo2.jpg',
    'path/to/your/photo3.jpg'
  ]);
  currentIndex = signal(0);

  private intervalId = setInterval(() => {
    this.currentIndex.update(i => (i + 1) % this.imageUrls().length);
  }, 4000); // Change image every 4 seconds

  ngOnDestroy() {
    clearInterval(this.intervalId); // Clean up interval on component destruction
  }
}