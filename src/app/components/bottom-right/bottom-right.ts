import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Project {
  title: string;
  description: string;
  links: { name: string; url: string; }[];
}

@Component({
  selector: 'app-bottom-right',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-right.html',
  styleUrls: ['./bottom-right.scss']
})
export class BottomRightComponent {
  // Replace with your actual project data
  projects = signal<Project[]>([
    { title: 'Project One', description: 'A cool app I built...', links: [{ name: 'GitHub', url: '#' }] },
    { title: 'Project Two', description: 'Another great app...', links: [{ name: 'Live Demo', url: '#' }] },
  ]);

  currentIndex = signal(0);

  navigate(direction: number) {
    const newIndex = this.currentIndex() + direction;
    const total = this.projects().length;
    // Loop around if at the start or end
    this.currentIndex.set((newIndex + total) % total);
  }
}