import { Component, signal, OnDestroy, OnInit } from '@angular/core';
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
  styleUrls: ['./bottom-right.scss']
})
export class BottomRightComponent implements OnInit, OnDestroy {
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
  private autoSlideInterval?: any;

  ngOnInit() {
    this.startAutoSlide();
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  navigateProject(direction: number) {
    const newIndex = this.currentProjectIndex() + direction;
    const total = this.projects().length;
    this.currentProjectIndex.set((newIndex + total) % total);
    this.currentSlideIndex.set(0); // Reset to first slide of new project
  }

  navigateSlide(direction: number) {
    const currentProject = this.projects()[this.currentProjectIndex()];
    const totalSlides = 1 + currentProject.images.length; // 1 description + images
    const newIndex = this.currentSlideIndex() + direction;
    this.currentSlideIndex.set((newIndex + totalSlides) % totalSlides);
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

  private startAutoSlide() {
    this.stopAutoSlide();
    // Only start auto-slide if not in fullscreen mode
    if (!this.isFullscreen()) {
      this.autoSlideInterval = setInterval(() => {
        if (!this.isHovering() && !this.isFullscreen()) {
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
}