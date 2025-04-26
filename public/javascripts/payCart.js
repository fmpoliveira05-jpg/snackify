document.getElementById('pay-button').addEventListener('click', async () => {
    const orderId = document.getElementById('orderId').value;
    const orderCode = document.getElementById('orderCode').value;
    const dishes = JSON.parse(document.getElementById('dishes').value);

    const response = await fetch('/carrinho/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, orderCode, dishes }),
    });

    const data = await response.json();
    window.location.href = data.url;
});