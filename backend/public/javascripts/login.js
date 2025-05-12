// Decidir a página para onde o utilizador vai após o login
document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log(result);

        if (response.ok) {
            localStorage.setItem('token', result.token);

            if (result.userType === 'restaurant') {
                window.location.href = "/restaurante/dashboard"; 
            } else {
                window.location.href = "/cliente/dashboard";
            }
        } else {
            alert(result.message);
        }

    } catch (error) {
        alert("Erro ao conectar ao servidor.");
    }
});