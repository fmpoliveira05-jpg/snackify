import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VouchersComponent } from './vouchers.component';
import { testProviders } from '../../../testing/test-providers';

describe('VouchersComponent', () => {
  let component: VouchersComponent;
  let fixture: ComponentFixture<VouchersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [VouchersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VouchersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
