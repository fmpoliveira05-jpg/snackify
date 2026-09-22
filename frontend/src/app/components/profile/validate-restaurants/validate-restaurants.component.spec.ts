import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidateRestaurantsComponent } from './validate-restaurants.component';

describe('ValidateRestaurantsComponent', () => {
  let component: ValidateRestaurantsComponent;
  let fixture: ComponentFixture<ValidateRestaurantsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidateRestaurantsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidateRestaurantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
