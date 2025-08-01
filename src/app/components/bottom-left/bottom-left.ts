import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

@Component({
  selector: 'app-bottom-left',
  standalone: true,
  imports: [CommonModule, NgxExtendedPdfViewerModule],
  templateUrl: './bottom-left.html',
  styleUrls: ['./bottom-left.scss']
})
export class BottomLeftComponent {
  isExpanded = signal(true);
}