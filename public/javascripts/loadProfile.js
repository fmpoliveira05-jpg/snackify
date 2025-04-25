import { fieldLabels, fieldValueFormat } from "./fieldFormatters.js";

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
            const btn = document.getElementById("validarRestaurantesBtn");
            if (btn) btn.classList.remove("d-none");
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

                card.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title"><strong>Código da encomenda:</strong> ${order.orderCode || "(sem código)"}</h5>
                        <p><strong>Data e hora:</strong> ${new Date(order.orderDate).toLocaleString()}</p>
                        <p><strong>Estado da encomenda:</strong> ${order.state}</p>
                        <p><strong>Itens adquiridos:</strong><br>${pratos}</p>
                    </div>
                `;

                historyList.appendChild(card);
            });
        }
    } catch (err) {
        console.error("Erro inesperado ao carregar perfil:", err);
        alert("Erro inesperado ao carregar dados do perfil.");
    }
}