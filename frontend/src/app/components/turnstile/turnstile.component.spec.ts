import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnstileComponent } from './turnstile.component';
import { testProviders } from '../../../testing/test-providers';

describe('TurnstileComponent', () => {
  let component: TurnstileComponent;
  let fixture: ComponentFixture<TurnstileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [TurnstileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnstileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
