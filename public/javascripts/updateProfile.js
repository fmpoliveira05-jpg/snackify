import { fieldLabels, fieldValueFormat } from "./fieldFormatters.js";

const customerFields = ["name", "username", "email", "address", "phone", "nif", "birthDate"];
const adminFields = ["name", "username", "email", "address", "phone", "nif"];
const restaurantFields = ["name", "username", "email", "address", "phone", "nif", "foundedAt"];

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("updateProfileForm");
    const fieldContainer = document.getElementById("dynamicFields");

    const response = await fetch('/user/perfil/dados');
    if (!response.ok) {
        return alert("Erro ao carregar dados.");
    }

    const data = await response.json();
    const userType = data.userType || 'restaurant';
    const fields = userType === "customer" ? customerFields : userType === "admin" ? adminFields : restaurantFields;
    const disabledFields = ["username", "email"];

    fields.forEach(field => {
        const label = fieldLabels[field] || field;
        const rawValue = data[field] || '';
        const dateFields = ["birthDate", "foundedAt"];
        const inputType = dateFields.includes(field) ? 'date' : 'text';
        const value = inputType === 'date' && rawValue ? new Date(rawValue).toISOString().split('T')[0] : rawValue;

        const isDisabled = disabledFields.includes(field) ? 'disabled' : '';

        const fieldDiv = document.createElement("div");
        fieldDiv.className = "mb-3";
        fieldDiv.innerHTML = `
            <label class="form-label">${label}</label>
            <input type="${inputType}" class="form-control" name="${field}" value="${value}" ${isDisabled}>
        `;

        fieldContainer.appendChild(fieldDiv);
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        const res = await fetch('/user/perfil/editar', {
            method: 'PUT',
            body: formData
        });

        const result = await res.json();
        if (res.ok) {
            alert(result.message);
            window.location.href = '/user/perfil';
        } else {
            alert("Erro ao atualizar: " + result.message);
        }
    });
});