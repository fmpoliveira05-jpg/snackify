const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API da Snackify",
      version: "1.0.0",
      description: "REST API para a Snackify"
    },
    servers: [
      {
        url: "http://localhost:5000"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer"
        }
      }
    },
    tags: [
      {
        name: "Restaurante",
        description: "Rotas relacionadas com funcionalidades específicas dos restaurantes, como gestão de menus e pratos, encomendas e avaliações."
      },
      {
        name: "Admin",
        description: "Rotas de administração usadas para validar restaurantes, criar e remover categorias."
      },
      {
        name: "Autenticação",
        description: "Rotas responsáveis pelo login, logout e verificação de tokens dos utilizadores."
      },
      {
        name: "Cliente",
        description: "Rotas utilizadas por clientes para interagir com a plataforma, como fazer encomendas ou consultar restaurantes."
      },
      {
        name: "Perfil",
        description: "Rotas relacionadas com o perfil do utilizador autenticado, como visualização de encomendas ou atualização de dados."
      },
      {
        name: "Registo",
        description: "Rotas utilizadas para o registo de novos clientes e restaurantes na plataforma."
      }
    ]
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };