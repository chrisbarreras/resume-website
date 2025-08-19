import { Component, signal, OnDestroy, OnInit, ViewEncapsulation, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Slide {
  content: string; // HTML content
  image?: string; // Optional image URL
}

interface Project {
  title: string;
  description: string; // First slide content
  images: string[]; // Array of image URLs for subsequent slides
  links: { name: string; url: string; }[];
}

@Component({
  selector: 'app-bottom-right',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-right.html',
  styleUrls: ['./bottom-right.scss'],
  encapsulation: ViewEncapsulation.None
})
export class BottomRightComponent implements OnInit, OnDestroy, AfterViewChecked {
  projects = signal<Project[]>([
    { 
      title: 'StudyJarvis', 
      description: 'StudyJarvis is an AI-powered study assistant that helps students learn more effectively. The features it provides are interactive quizzes, endless interactive quizzes, study guide creation, key point generation, and more. This project aims to enhance the learning experience by providing personalized study materials based on the professor\'s provided content. This program can be accessed though a web application or through command line interface.',
      images: [
        'assets/images/StudyJarvis  An AI Tutor_pages-to-jpg-0001.jpg',
        'assets/images/StudyJarvis  An AI Tutor_pages-to-jpg-0002.jpg',
        'assets/images/StudyJarvis  An AI Tutor_pages-to-jpg-0003.jpg',
        'assets/images/StudyJarvis  An AI Tutor_pages-to-jpg-0004.jpg',
        'assets/images/StudyJarvis  An AI Tutor_pages-to-jpg-0005.jpg',
        'assets/images/StudyJarvis  An AI Tutor_pages-to-jpg-0006.jpg',
        'assets/images/StudyJarvis  An AI Tutor_pages-to-jpg-0007.jpg',
        'assets/images/StudyJarvis  An AI Tutor_pages-to-jpg-0008.jpg',
        'assets/images/StudyJarvis  An AI Tutor_pages-to-jpg-0009.jpg',
        'assets/images/StudyJarvis  An AI Tutor_pages-to-jpg-0010.jpg',
        'assets/images/StudyJarvis  An AI Tutor_pages-to-jpg-0011.jpg',
        'assets/images/StudyJarvis  An AI Tutor_pages-to-jpg-0012.jpg'
      ],
      links: [
        { name: 'StudyJarvis on GitHub', url: 'https://github.com/chrisbarreras/studyjarvis' }, 
        { name: 'StudyJarvis Presentation', url: 'https://www.linkedin.com/in/christopher-barreras/overlay/1748909472378/single-media-viewer/?profileId=ACoAAEq7Mm8B6q8Zl7rS2KoJb7XrBjpnYYSLCNM' }
      ] 
    },
    { 
      title: 'StudyJarvis Web App', 
      description: 'This is a front end application that allows users to interact with StudyJarvis through a user-friendly interface. There is a login system in place for user authentication and personalized experiences. Once the user is logged in, they can upload their professor\'s materials for analysis. Once the user has uploaded their materials, Gemini will analyze the content and provide personalized study resources.',
      images: [
        'assets/images/img29.jpg',
        'assets/images/img36.jpg',
        'assets/images/img37.jpg',
        'assets/images/img38.jpg'
      ],
      links: [
        { name: 'StudyJarvis Web App on GitHub', url: 'https://github.com/chrisbarreras/studyjarviswebapp' },
        { name: 'StudyJarvis Presentation', url: 'https://www.linkedin.com/in/christopher-barreras/overlay/1748909472378/single-media-viewer/?profileId=ACoAAEq7Mm8B6q8Zl7rS2KoJb7XrBjpnYYSLCNM' }
      ] 
    },
    { 
      title: 'AI Reference Checker', 
      description: 'This project was created for two classes called Capstone I & II. The goal of the classes was to develop an app for a real client. Our client was the United States Council of Catholic Bishops (USCCB). Authors will send their books to the USCCB for review and feedback. Our project hoped to streamline part of this process by automating reference checking using an Ollama AI. When the semester was over our app was able to scrape data from the Vatican\'s website and compare it to quotes that were obtained from the author\'s paper using AI.',
      images: [
        'assets/images/Manuscript AI Reader Demo_page-0005.jpg',
        'assets/images/Manuscript AI Reader Demo_page-0008.jpg',
        'assets/images/Manuscript AI Reader Demo_page-0009.jpg',
        'assets/images/Manuscript AI Reader Demo_page-0011.jpg'
      ],
      links: [
        { name: 'AI Reference Checker Presentation', url: 'https://www.linkedin.com/in/christopher-barreras/overlay/1748384236537/single-media-viewer/?profileId=ACoAAEq7Mm8B6q8Zl7rS2KoJb7XrBjpnYYSLCNM' }
      ] 
    },
    { 
      title: 'Resume Website', 
      description: 'This is the website that you are on right now! This website showcases my skills, projects, and experience as a software developer. While also have a personal AI assitant that can answer any question a potental employer might have about me. It\'s goal is to make me stand out more while showcasing all of my work.',
      images: [
      ],
      links: [
        { name: 'Resume Website on GitHub', url: 'https://github.com/chrisbarreras/resume-website' }
      ] 
    },
  ]);

  currentProjectIndex = signal(0);
  currentSlideIndex = signal(0);
  isHovering = signal(false);
  isFullscreen = signal(false);
  isWrapping = signal(false);
  private autoSlideInterval?: any;
  private isPageVisible = true;
  @ViewChild('indicatorBar') indicatorBarRef!: ElementRef<HTMLDivElement>;

  ngOnInit() {
    this.startAutoSlide();
    this.addVisibilityChangeListener();
  }

  ngOnDestroy() {
    this.stopAutoSlide();
    this.removeVisibilityChangeListener();
  }

  ngAfterViewChecked() {
    this.scrollActiveIndicatorIntoView();
  }

  navigateProject(direction: number) {
    const newIndex = this.currentProjectIndex() + direction;
    const total = this.projects().length;
    this.currentProjectIndex.set((newIndex + total) % total);
    this.currentSlideIndex.set(0); // Reset to first slide of new project
  }

  navigateSlide(direction: number) {
    const currentProject = this.projects()[this.currentProjectIndex()];
    const totalSlides = 1 + currentProject.images.length;
    const currentIndex = this.currentSlideIndex();
    const newIndex = currentIndex + direction;

    // Check if we're wrapping around
    const isWrappingAround = (newIndex < 0 && currentIndex === 0) || 
                            (newIndex >= totalSlides && currentIndex === totalSlides - 1);

    if (isWrappingAround) {
      this.isWrapping.set(true);
      // Use setTimeout to allow the DOM to update
      setTimeout(() => {
        const wrappedIndex = (newIndex + totalSlides) % totalSlides;
        this.currentSlideIndex.set(wrappedIndex);
        // Re-enable transition after a short delay
        setTimeout(() => {
          this.isWrapping.set(false);
        }, 50);
      }, 0);
    } else {
      this.currentSlideIndex.set(newIndex);
    }
  }

  goToSlide(index: number) {
    this.currentSlideIndex.set(index);
    // Reset auto-slide timer when manually navigating
    if (!this.isHovering()) {
      this.startAutoSlide();
    }
  }

  openFullscreen() {
    this.isFullscreen.set(true);
    this.stopAutoSlide(); // Stop auto-sliding in fullscreen
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  closeFullscreen() {
    this.isFullscreen.set(false);
    document.body.style.overflow = ''; // Restore scrolling
    if (!this.isHovering()) {
      this.startAutoSlide(); // Resume auto-sliding if not hovering
    }
  }

  onSlideHover(hovering: boolean) {
    this.isHovering.set(hovering);
    if (hovering) {
      this.stopAutoSlide();
    } else if (!this.isFullscreen()) { // Only restart if not in fullscreen
      this.startAutoSlide();
    }
  }

  private addVisibilityChangeListener() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.addEventListener('beforeunload', this.handlePageUnload.bind(this));
    window.addEventListener('focus', this.handlePageFocus.bind(this));
    window.addEventListener('blur', this.handlePageBlur.bind(this));
  }

  private removeVisibilityChangeListener() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.handlePageUnload.bind(this));
    window.removeEventListener('focus', this.handlePageFocus.bind(this));
    window.removeEventListener('blur', this.handlePageBlur.bind(this));
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.isPageVisible = false;
      this.stopAutoSlide();
    } else {
      this.isPageVisible = true;
      if (!this.isHovering() && !this.isFullscreen()) {
        this.startAutoSlide();
      }
    }
  }

  private handlePageUnload() {
    this.isPageVisible = false;
    this.stopAutoSlide();
  }

  private handlePageFocus() {
    this.isPageVisible = true;
    if (!this.isHovering() && !this.isFullscreen()) {
      this.startAutoSlide();
    }
  }

  private handlePageBlur() {
    this.isPageVisible = false;
    this.stopAutoSlide();
  }

  private startAutoSlide() {
    this.stopAutoSlide();
    // Only start auto-slide if page is visible and not in fullscreen mode
    if (this.isPageVisible && !this.isFullscreen()) {
      this.autoSlideInterval = setInterval(() => {
        if (!this.isHovering() && !this.isFullscreen() && this.isPageVisible) {
          const currentProject = this.projects()[this.currentProjectIndex()];
          const totalSlides = 1 + currentProject.images.length;
          const newIndex = this.currentSlideIndex() + 1;
          this.currentSlideIndex.set(newIndex % totalSlides);
        }
      }, 3000); // Auto-advance every 3 seconds
    }
  }

  private stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
      this.autoSlideInterval = undefined;
    }
  }

  private scrollActiveIndicatorIntoView() {
    // Only run on mobile
    if (window.innerWidth > 768) return;
    const indicatorBar = this.indicatorBarRef?.nativeElement;
    if (!indicatorBar) return;
    const indicators = indicatorBar.querySelectorAll('.indicator');
    const activeIndex = this.currentSlideIndex();
    const activeDot = indicators[activeIndex];
    if (activeDot) {
      // Cast to HTMLElement to access offsetLeft
      const dotEl = activeDot as HTMLElement;
      const barRect = indicatorBar.getBoundingClientRect();
      const dotRect = dotEl.getBoundingClientRect();
      const scrollLeft = dotEl.offsetLeft - (barRect.width / 2) + (dotRect.width / 2);
      indicatorBar.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }

  shouldShowIndicator(index: number): boolean {
    if (window.innerWidth > 768) return true; // Show all on desktop
    const active = this.currentSlideIndex();
    // Show only the active dot and its immediate neighbors
    return Math.abs(index - active) <= 1;
  }

  get visibleIndicatorIndices(): number[] {
    const totalSlides = 1 + this.projects()[this.currentProjectIndex()].images.length;
    const active = this.currentSlideIndex();
    if (window.innerWidth > 768) {
      // Show all on desktop
      return Array.from({ length: totalSlides }, (_, i) => i);
    }
    // Show only active and its immediate neighbors on mobile
    return Array.from({ length: totalSlides }, (_, i) =>
      Math.abs(i - active) <= 1 ? i : -1
    ).filter(i => i !== -1);
  }
}