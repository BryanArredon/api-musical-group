import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Musical Group',
      version: '1.0.0',
      description: 'Documentación de la API del sistema de gestión de activos y solicitudes para grupos musicales.',
      contact: {
        name: 'Soporte Musical Group',
        email: 'support@musicalgroup.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
      {
        url: 'http://localhost:5000',
        description: 'Servidor alternativo de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT para autenticación. Obtenido mediante el endpoint de login.',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@musicalgroup.com',
            },
            password: {
              type: 'string',
              example: 'demo1234',
            },
          },
          required: ['email', 'password'],
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Inicio de sesión exitoso.',
            },
            data: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                user: {
                  type: 'object',
                  properties: {
                    email: {
                      type: 'string',
                      example: 'admin@musicalgroup.com',
                    },
                    nombre: {
                      type: 'string',
                      example: 'Administrador del Sistema',
                    },
                    role: {
                      type: 'string',
                      enum: ['admin', 'user'],
                      example: 'admin',
                    },
                    authorities: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: ['ROLE_ADMIN', 'ROLE_USER'],
                      },
                      example: ['ROLE_ADMIN'],
                    },
                  },
                },
              },
            },
          },
        },
        Asset: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            nombre: {
              type: 'string',
              example: 'Guitarra Eléctrica',
            },
            categoria: {
              type: 'string',
              example: 'Instrumentos',
            },
            estado: {
              type: 'string',
              enum: ['disponible', 'en_uso', 'mantenimiento', 'dañado'],
              example: 'disponible',
            },
            fecha_creacion: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        CreateAssetRequest: {
          type: 'object',
          properties: {
            nombre: {
              type: 'string',
              example: 'Guitarra Eléctrica',
            },
            categoria: {
              type: 'string',
              example: 'Instrumentos',
            },
            estado: {
              type: 'string',
              enum: ['disponible', 'en_uso', 'mantenimiento', 'dañado'],
              example: 'disponible',
            },
          },
          required: ['nombre', 'categoria', 'estado'],
        },
        Solicitud: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            usuario_id: {
              type: 'string',
              example: 'user@musicalgroup.com',
            },
            activo_id: {
              type: 'integer',
              example: 1,
            },
            estado: {
              type: 'string',
              enum: ['Pendiente', 'Aprobada', 'Rechazada'],
              example: 'Pendiente',
            },
            comentarios: {
              type: 'string',
              example: 'Necesito esta guitarra para el próximo concierto',
              nullable: true,
            },
            fecha_solicitud: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            fecha_respuesta: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T11:00:00Z',
              nullable: true,
            },
          },
        },
        CreateSolicitudRequest: {
          type: 'object',
          properties: {
            activoId: {
              type: 'integer',
              example: 1,
            },
            comentarios: {
              type: 'string',
              example: 'Necesito esta guitarra para el próximo concierto',
              nullable: true,
            },
          },
          required: ['activoId'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Bad Request',
            },
            message: {
              type: 'string',
              example: 'Descripción del error.',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/authroutes.js',
    './src/routes/activosRoutes.js',
    './src/routes/solicitudesRoutes.js',
  ],
};

export const specs = swaggerJsdoc(options);
