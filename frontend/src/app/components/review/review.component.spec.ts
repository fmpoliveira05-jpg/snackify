import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewComponent } from './review.component';
import { testProviders } from '../../../testing/test-providers';

describe('ReviewComponent', () => {
  let component: ReviewComponent;
  let fixture: ComponentFixture<ReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [ReviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
