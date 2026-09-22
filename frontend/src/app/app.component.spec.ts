import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { testProviders } from '../testing/test-providers';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: testProviders,
    }).compileComponents();
  });

  it('é criado sem erros', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
