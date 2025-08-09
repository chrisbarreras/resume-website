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
    { title: 'StudyJarvis', description: 'StudyJarvis is an AI-powered study assistant that helps students learn more effectively. The features it provides are interactive quizzes, endless interactive quizzes, study guide creation, key point generation, and more. This project aims to enhance the learning experience by providing personalized study materials based on the professor\'s provided content. This program can be accessed though a web application or through command line interface.', links: [{ name: 'GitHub', url: 'https://github.com/chrisbarreras/studyjarvis' }, {name: 'Slideshow', url: 'https://www.linkedin.com/in/christopher-barreras/overlay/1748909472378/single-media-viewer/?profileId=ACoAAEq7Mm8B6q8Zl7rS2KoJb7XrBjpnYYSLCNM'}] },
    { title: 'StudyJarvis Web App', description: 'This is a front end application that allows users to interact with StudyJarvis through a user-friendly interface. There is a login system in place for user authentication and personalized experiences. Once the user is logged in, they can upload their professor\'s materials for analysis. Once the user has uploaded their materials, Gemini will analyze the content and provide personalized study resources.', links: [{name: 'Slideshow', url: 'https://www.linkedin.com/in/christopher-barreras/overlay/1748909472378/single-media-viewer/?profileId=ACoAAEq7Mm8B6q8Zl7rS2KoJb7XrBjpnYYSLCNM'}] },
    { title: 'AI Reference Checker', description: 'This project was created for two classes called Capstone I & II. The goal of the classes was to develop an app for a real client. Our client was the United States Council of Catholic Bishops (USCCB). Authors will send their books to the USCCB for review and feedback. Our project hoped to streamline part of this process by automating reference checking using an Ollama AI. When the semester was over our app was able to scrape data from the Vatican\'s website and compare it to quotes that were obtained from the author\'s paper using AI.', links: [{name: 'Slideshow', url: 'https://www.linkedin.com/in/christopher-barreras/overlay/1748384236537/single-media-viewer/?profileId=ACoAAEq7Mm8B6q8Zl7rS2KoJb7XrBjpnYYSLCNM'}] },
    { title: 'Resume Website', description: 'This is well the website that you are on right now. This website showcases my skills, projects, and experience as a software developer. While also have a personal AI assitant that can answer any question a potental employer might have about me. It\'s goal is to make me stand out more while showcasing all of my work.', links: [{name: 'Slideshow', url: 'https://www.linkedin.com/in/christopher-barreras/overlay/1748384236537/single-media-viewer/?profileId=ACoAAEq7Mm8B6q8Zl7rS2KoJb7XrBjpnYYSLCNM'}] },
  ]);

  currentIndex = signal(0);

  navigate(direction: number) {
    const newIndex = this.currentIndex() + direction;
    const total = this.projects().length;
    // Loop around if at the start or end
    this.currentIndex.set((newIndex + total) % total);
  }
}