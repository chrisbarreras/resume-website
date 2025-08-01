import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopLeftComponent } from './components/top-left/top-left';
import { TopRightComponent } from './components/top-right/top-right';
import { BottomLeftComponent } from './components/bottom-left/bottom-left';
import { BottomRightComponent } from './components/bottom-right/bottom-right';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopLeftComponent, TopRightComponent, BottomLeftComponent, BottomRightComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('resume-website');
}
