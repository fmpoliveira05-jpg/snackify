import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerDashboardComponent } from './customer-dashboard.component';
import { testProviders } from '../../../testing/test-providers';

describe('CustomerDashboardComponent', () => {
  let component: CustomerDashboardComponent;
  let fixture: ComponentFixture<CustomerDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [CustomerDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
