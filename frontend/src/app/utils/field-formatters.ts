export const fieldLabels = {
  name: "Nome",
  username: "Username",
  email: "Email",
  birthDate: "Data de nascimento",
  address: "Morada completa",
  street: "Rua",
  number: "Número da porta",
  floor: "Andar (opcional)",
  zipCode: "Código postal",
  place: "Localidade",
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
  logo: "Logótipo",
  settings: "Funcionamento"
};

export const fieldValueFormat = (key: string, value: any) => {
  if (!value) return '';

  if (key === "birthDate" || key === "createdAt" || key === "foundedAt") {
    return new Date(value).toLocaleDateString('pt-PT');
  }

  if (key === "userType") {
    return value === "customer" ? "Cliente" : value === "admin" ? "Administrador" : "Restaurante";
  }

  if (key === "settings" && typeof value === "object") {
    return `preparação ${value.preparationMinutes} min, entrega ${value.deliveryMinutes} min, raio de ${value.maxDeliveryKm} km, até ${value.maxActiveOrders} encomendas em curso`;
  }

  if (key === "address" && typeof value === "object") {
    return `${value.street}, ${value.number}${value.floor ? ', ' + value.floor : ''}, ${value.zipCode}, ${value.place}, ${value.district}, ${value.country}`;
  }

  return value;
};