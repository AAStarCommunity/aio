import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AAStar API Documentation',
      version: '1.0.0',
      description: 'AAStar后端API文档',
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: '开发服务器',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            aaAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // 路由文件的位置
};

export const swaggerSpec = swaggerJsdoc(options); 