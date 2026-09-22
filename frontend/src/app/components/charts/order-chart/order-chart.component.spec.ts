import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderChartComponent } from './order-chart.component';
import { testProviders } from '../../../../testing/test-providers';

describe('OrderChartComponent', () => {
  let component: OrderChartComponent;
  let fixture: ComponentFixture<OrderChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [OrderChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
