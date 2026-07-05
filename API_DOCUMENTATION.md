# Documentación de la API de Gestión de Activos y Solicitudes

Esta API proporciona endpoints seguros para la administración de activos (cifrados con `pgcrypto` en reposo) y el flujo de aprobación de solicitudes de colaboradores, utilizando autenticación basada en JWT compartida y transacciones atómicas.

---

## 🚀 Inicio y Configuración

### 1. Iniciar Servidor en Desarrollo
```bash
npm run dev
```

### 2. Ejecutar Pruebas Automatizadas
```bash
npm run test
```

### 3. Generar Tokens JWT de Prueba
Genera tokens con expiración de 10 horas para pruebas manuales:
```bash
node src/utils/generate-token.js
```

---

## 🛡️ Endpoints de la API

### Base URL: `http://localhost:3000`

---

### 📦 1. Gestión de Activos (`/api/activos`)

#### 🔹 Obtener Todos los Activos
* **Método**: `GET`
* **Acceso**: Administrador (`ROLE_ADMIN`)
* **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`
* **Respuesta Exitosa (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "nombre": "Guitarra Fender Stratocaster",
        "categoria": "Instrumentos",
        "estado": "Disponible",
        "created_at": "2026-07-05T06:13:59.790Z",
        "updated_at": "2026-07-05T06:13:59.790Z"
      }
    ]
  }
  ```

#### 🔹 Registrar Nuevo Activo
* **Método**: `POST`
* **Acceso**: Administrador (`ROLE_ADMIN`)
* **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`, `Content-Type: application/json`
* **Body**:
  ```json
  {
    "nombre": "Batería Yamaha Rydeen",
    "categoria": "Percusión",
    "estado": "Disponible"
  }
  ```
* **Respuesta Exitosa (210 Created)**:
  ```json
  {
    "success": true,
    "message": "Activo registrado y guardado exitosamente de forma consistente.",
    "data": {
      "id": 2,
      "nombre": "Batería Yamaha Rydeen",
      "categoria": "Percusión",
      "estado": "Disponible",
      "created_at": "...",
      "updated_at": "..."
    }
  }
  ```

---

### 📋 2. Gestión de Solicitudes (`/api/solicitudes`)

#### 🔹 Crear una Solicitud de Activo
* **Método**: `POST`
* **Acceso**: Todos los usuarios autenticados (`ROLE_USER` / `ROLE_ADMIN`)
* **Headers**: `Authorization: Bearer <COLABORADOR_TOKEN>`, `Content-Type: application/json`
* **Body**:
  ```json
  {
    "activoId": 1,
    "comentarios": "Solicito el activo para las clases de música"
  }
  ```
* **Respuesta Exitosa (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Solicitud de activo generada exitosamente.",
    "data": {
      "id": 1,
      "colaborador_email": "colaborador@musical.com",
      "activo_id": 1,
      "estado": "Pendiente",
      "comentarios": "Solicito el activo para las clases de música",
      "created_at": "...",
      "updated_at": "..."
    }
  }
  ```

#### 🔹 Ver Solicitudes Pendientes de Aprobación
* **Método**: `GET`
* **Acceso**: Administrador (`ROLE_ADMIN`)
* **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`
* **Respuesta Exitosa (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "colaborador_email": "colaborador@musical.com",
        "activo_id": 1,
        "estado": "Pendiente",
        "comentarios": "...",
        "created_at": "..."
      }
    ]
  }
  ```

#### 🔹 Aprobar una Solicitud
* **Método**: `POST`
* **Acceso**: Administrador (`ROLE_ADMIN`)
* **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`
* **Respuesta Exitosa (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Solicitud aprobada con éxito. El estado del activo ha cambiado automáticamente."
  }
  ```

#### 🔹 Rechazar una Solicitud
* **Método**: `POST`
* **Acceso**: Administrador (`ROLE_ADMIN`)
* **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`
* **Respuesta Exitosa (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Solicitud rechazada con éxito. El activo permanece sin cambios."
  }
  ```
