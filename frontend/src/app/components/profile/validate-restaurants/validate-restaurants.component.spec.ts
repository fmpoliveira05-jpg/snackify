import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidateRestaurantsComponent } from './validate-restaurants.component';
import { testProviders } from '../../../../testing/test-providers';

describe('ValidateRestaurantsComponent', () => {
  let component: ValidateRestaurantsComponent;
  let fixture: ComponentFixture<ValidateRestaurantsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [ValidateRestaurantsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidateRestaurantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
