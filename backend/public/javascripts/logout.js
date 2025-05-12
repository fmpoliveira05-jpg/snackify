export async function setupLogout() {
    document.getElementById("logoutBtn").addEventListener("click", async () => {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            localStorage.removeItem('token');
            window.location.href = '/auth/login';
        } else {
            alert("Erro ao fazer logout.");
        }
    });
}