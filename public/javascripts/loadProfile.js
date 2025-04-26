import { fieldLabels, fieldValueFormat } from "./fieldFormatters.js";
import { pay } from '/javascripts/payCart.js';

export async function loadProfile() {
    try {
        const response = await fetch('/user/perfil/dados');

        if (!response.ok) {
            const err = await response.json();
            alert("Erro ao carregar perfil: " + err.message);
            return;
        }

        const data = await response.json();

        document.getElementById("tipo").textContent = fieldValueFormat("userType", data.userType || 'restaurante');

        const infoList = document.getElementById("info");
        for (const key in data) {
            if (['password', '__v', '_id'].includes(key)) continue;

            const item = document.createElement("li");
            item.className = "list-group-item";
            const label = fieldLabels[key] || key;
            const value = fieldValueFormat(key, data[key]);

            if (key === "profilePicture" || key === "logo") {
                item.innerHTML = `<strong>${label}:</strong><br><img src="${value}" alt="${label}" class="perfil-imagem" />`;
            } else {
                item.innerHTML = `<strong>${label}:</strong> ${value}`;
            }

            infoList.appendChild(item);
        }

        if (data.userType === 'admin') {
            const btn1 = document.getElementById("validarRestaurantesBtn");
            const btn2 = document.getElementById("editCategoryBtn");
            if (btn1) btn1.classList.remove("d-none");
            if (btn2) btn2.classList.remove("d-none");
        }

        const historyResponse = await fetch('/user/perfil/encomendas');

        if (!historyResponse.ok) {
            const err = await historyResponse.json();
            console.error("Erro ao carregar histórico:", err.message);
            return;
        }

        const orders = await historyResponse.json();
        const historyList = document.getElementById("historico");

        if (!historyList) return;

        if (orders.length === 0) {
            historyList.innerHTML = "<p>Sem encomendas anteriores.</p>";
        } else {
            orders.forEach(order => {
                const card = document.createElement("div");
                card.className = "card mb-2";

                const pratos = order.dishes.map(d => `
                    ${d.amount}x ${d.dishId?.name || "Prato removido"} (${d.dose} dose)
                `).join("<br>");

                const now = new Date();
                const orderDate = new Date(order.orderDate);
                const minutesSinceOrder = (now - orderDate) / (1000 * 60);

                let cancelButtonHTML = '';
                let payButtonHTML = '';
                let reviewButtonHTML = '';

                if (order.state === 'pendente' && minutesSinceOrder <= 5) {
                    cancelButtonHTML = `
                        <button class="btn btn-danger mt-2 cancelar-pedido-btn" data-order-id="${order._id}">
                            Cancelar Pedido
                        </button>
                    `;
                }

                if (order.state === 'pendente') {
                    payButtonHTML = `
                        <button 
                            class="btn btn-success mt-2 pagar-agora-btn"
                            data-order-id="${order._id}"
                            data-order-code="${order.orderCode || ''}"
                            data-dishes='${JSON.stringify(order.dishes)}'
                        >
                            Pagar agora
                        </button>
                    `;
                }
                
                if (order.state === 'entregue' && order.reviewed === false) {
                    reviewButtonHTML = `
                        <button 
                            class="btn btn-primary mt-2 avaliar-pedido-btn" 
                            data-order-id="${order._id}"
                        >
                            Avaliar
                        </button>
                    `;
                }                

                card.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title"><strong>Código da encomenda:</strong> ${order.orderCode || "(sem código)"}</h5>
                        <p><strong>Data e hora:</strong> ${orderDate.toLocaleString()}</p>
                        <p><strong>Estado da encomenda:</strong> ${order.state}</p>
                        <p><strong>Itens adquiridos:</strong><br>${pratos}</p>
                        ${cancelButtonHTML}
                        ${payButtonHTML}
                        ${reviewButtonHTML}
                    </div>
                `;

                historyList.appendChild(card);
            });

            document.querySelectorAll(".cancelar-pedido-btn").forEach(btn => {
                btn.addEventListener("click", async (e) => {
                    const orderId = btn.getAttribute("data-order-id");
                    if (!orderId) return;

                    if (!confirm("Tens a certeza que queres cancelar este pedido?")) return;

                    try {
                        const response = await fetch(`/user/perfil/encomendas/${orderId}/cancelar`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            }
                        });

                        if (!response.ok) {
                            const err = await response.json();
                            alert("Erro ao cancelar pedido: " + err.message);
                            return;
                        }

                        alert("Pedido cancelado com sucesso!");
                        window.location.reload();
                    } catch (err) {
                        console.error("Erro inesperado ao cancelar pedido:", err);
                        alert("Erro inesperado ao cancelar o pedido.");
                    }
                });
            });

            document.querySelectorAll(".pagar-agora-btn").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const orderId = btn.getAttribute("data-order-id");
                    const orderCode = btn.getAttribute("data-order-code");
                    const dishes = JSON.parse(btn.getAttribute("data-dishes") || "[]");
            
                    if (!orderId) return;
            
                    pay(orderId, orderCode, dishes);
                });
            });

            document.querySelectorAll(".avaliar-pedido-btn").forEach(btn => {
                btn.addEventListener("click", async (e) => {
                    const orderId = btn.getAttribute("data-order-id");
                    if (!orderId) return;
            
                    window.location.href = `/user/perfil/encomendas/${orderId}/avaliar`;
                });
            });                      
        }
    } catch (err) {
        console.error("Erro inesperado ao carregar perfil:", err);
        alert("Erro inesperado ao carregar dados do perfil.");
    }
}