import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DishCardComponent } from './dish-card.component';
import { testProviders } from '../../../testing/test-providers';

describe('DishCardComponent', () => {
  let component: DishCardComponent;
  let fixture: ComponentFixture<DishCardComponent>;

  const dish = {
    _id: 'd1',
    name: 'Francesinha',
    image: '/uploads/dishes/f.jpg',
    category: { _id: 'c1', name: 'Carne' },
    nutriInfo: { calories: 250, nutriScore: 'D', allergens: ['gluten'] },
    pricePerDose: [{ dose: '1/2', price: 7 }, { dose: '1', price: 11 }],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [DishCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DishCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('dish', dish);
    fixture.detectChanges();
  });

  it('mostra a categoria, o Nutri-Score e os alergénios', () => {
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Carne');
    expect(text).toContain('Nutri-Score D');
    expect(text).toContain('gluten');
  });

  it('escolhe a primeira dose por omissão e emite o pedido para o carrinho', () => {
    let emitted: any = null;
    component.add.subscribe(e => emitted = e);
    component.amount = 2;
    component.submit();
    expect(emitted).toEqual({ dishId: 'd1', amount: 2, dose: '1/2' });
  });

  it('não emite com quantidades inválidas', () => {
    let emitted = false;
    component.add.subscribe(() => emitted = true);
    component.amount = 0;
    component.submit();
    expect(emitted).toBeFalse();
  });

  it('usa o endereço da API para as imagens guardadas no servidor', () => {
    expect(component.imageUrl).toMatch(/\/uploads\/dishes\/f\.jpg$/);
  });
});
