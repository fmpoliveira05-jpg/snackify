export async function pay(orderId, orderCode, dishes) {
  if (!orderId || !orderCode || !dishes) {
      alert('Dados de pagamento incompletos.');
      return;
  }

  try {
      const response = await fetch('/carrinho/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, orderCode, dishes }),
      });

      if (!response.ok) {
          const err = await response.json();
          alert("Erro ao criar sessão de pagamento: " + err.message);
          return;
      }

      const data = await response.json();
      window.location.href = data.url;
  } catch (err) {
      console.error("Erro inesperado ao iniciar pagamento:", err);
      alert("Erro inesperado ao iniciar o pagamento.");
  }
}