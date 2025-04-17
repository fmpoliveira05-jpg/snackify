export const fieldLabels = {
    name: "Nome",
    username: "Username",
    email: "Email",
    birthDate: "Data de nascimento",
    address: "Morada",
    phone: "Telemóvel",
    nif: "NIF",
    userType: "Tipo de utilizador",
    foundedAt: "Data de fundação",
    createdAt: "Data de registo",
    profilePicture: "Foto de perfil",
    logo: "Logótipo"
};

export const fieldValueFormat = (key, value) => {
    if (key === "birthDate" || key === "createdAt" || key === "foundedAt") {
        return new Date(value).toLocaleDateString('pt-PT');
    }

    if (key === "userType") {
        return value === "customer" ? "Cliente" : value === "admin" ? "Administrador" : "Restaurante";
    }

    return value;
};