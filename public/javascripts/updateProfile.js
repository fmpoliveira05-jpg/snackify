import { fieldLabels } from "./fieldFormatters.js";

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
        const rawValue = data[field] || '';
        const inputType = (["birthDate", "foundedAt"].includes(field)) ? 'date' : 'text';
        const isDisabled = disabledFields.includes(field) ? 'disabled' : '';

        if (field === 'address' && typeof rawValue === 'object') {
            const addressKeys = ["street", "number", "floor", "postalCode", "city", "district", "country"];
            
            const fieldset = document.createElement("fieldset");
            fieldset.className = "border p-3 mb-3";
            fieldset.innerHTML = `<legend class="w-auto px-2">${fieldLabels.address || "Morada"}</legend>`;

            addressKeys.forEach(subField => {
                const subValue = rawValue[subField] || '';
                const subLabel = fieldLabels[subField] || subField;

                const div = document.createElement("div");
                div.className = "mb-3";
                div.innerHTML = `
                    <label class="form-label">${subLabel}</label>
                    <input type="text" class="form-control" name="address[${subField}]" value="${subValue}">
                `;
                fieldset.appendChild(div);
            });

            fieldContainer.appendChild(fieldset);
            return;
        }

        const value = inputType === 'date' && rawValue
            ? new Date(rawValue).toISOString().split('T')[0]
            : rawValue;

        const label = fieldLabels[field] || field;

        const fieldDiv = document.createElement("div");
        fieldDiv.className = "mb-3";
        fieldDiv.innerHTML = `
            <label class="form-label">${label}</label>
            <input type="${inputType}" class="form-control" name="${field}" value="${value}" ${isDisabled}>
        `;

        fieldContainer.appendChild(fieldDiv);
    });

    // 📨 Submissão do formulário
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