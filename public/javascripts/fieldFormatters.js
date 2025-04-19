export const fieldLabels = {
    name: "Nome",
    username: "Username",
    email: "Email",
    birthDate: "Data de nascimento",
    address: "Morada completa",
    street: "Rua",
    number: "Número da porta",
    floor: "Andar",
    postalCode: "Código postal",
    city: "Cidade",
    district: "Distrito",
    country: "País",
    coordinates: "Coordenadas",
    latitude: "Latitude",
    longitude: "Longitude",
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

    if (key === "address" && typeof value === "object") {
        return `${value.street}, ${value.number}, ${value.floor}, ${value.postalCode}, ${value.city}, ${value.district}, ${value.country}`;
    }

    return value;
};