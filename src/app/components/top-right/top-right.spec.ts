import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopRight } from './top-right';

describe('TopRight', () => {
  let component: TopRight;
  let fixture: ComponentFixture<TopRight>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopRight]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopRight);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
