const selected = new Set();
const maxDishes = 10;

document.querySelectorAll('.dish-card').forEach(card => {
    card.addEventListener('click', () => {
    const checkbox = card.querySelector('.dish-checkbox');
    const dishId = card.dataset.dishId;

    if (!checkbox.checked && selected.size >= maxDishes) {
        alert("Máximo de 10 pratos por menu.");
        return;
    }

    checkbox.checked = !checkbox.checked;
    card.classList.toggle('selected', checkbox.checked);

    if (checkbox.checked) {
        selected.add(dishId);
    } else {
        selected.delete(dishId);
    }
    });
});