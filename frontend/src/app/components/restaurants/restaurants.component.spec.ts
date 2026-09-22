import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantsComponent } from './restaurants.component';
import { testProviders } from '../../../testing/test-providers';

describe('RestaurantsComponent', () => {
  let component: RestaurantsComponent;
  let fixture: ComponentFixture<RestaurantsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [RestaurantsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RestaurantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
