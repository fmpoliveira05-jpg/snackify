const timerElement = document.getElementById("cart-timer");
const timeoutStr = timerElement.dataset.timeout;
const timeout = timeoutStr ? new Date(timeoutStr) : null;

function updateTimer() {
    const now = new Date();
    const diff = timeout - now;

    if (diff <= 0) {
        timerElement.textContent = "O tempo para concluir a encomenda expirou. O carrinho foi limpo.";
        timerElement.classList.remove('alert-warning');
        timerElement.classList.add('alert-danger');
        return;
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    document.getElementById("minutes").textContent = minutes.toString().padStart(2, '0');
    document.getElementById("seconds").textContent = seconds.toString().padStart(2, '0');

    setTimeout(updateTimer, 1000);
}

if (timeout) updateTimer();