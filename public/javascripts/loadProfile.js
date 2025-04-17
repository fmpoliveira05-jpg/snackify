import { fieldLabels, fieldValueFormat } from "./fieldFormatters.js";

export async function loadProfile() {
    const response = await fetch('/user/perfil/dados');

    if (response.ok) {
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
    } else {
        const err = await response.json();
        alert("Erro ao carregar perfil: " + err.message);
    }
}