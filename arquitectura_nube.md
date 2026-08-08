# Estrategia de Despliegue en la Nube: API Musical Group

## 1. Matriz Comparativa (Evolución de la Infraestructura)

Para cumplir con la actividad y demostrar una planificación técnica integral, hemos estructurado la matriz mostrando cómo se maneja el entorno local (Docker), nuestra infraestructura real actual (Vercel/Railway/Supabase) y las mejores opciones de nivel corporativo para un futuro escalamiento.

| Criterio Técnico / Componente | Docker (Entorno Local) | Entorno Actual (Vercel / Railway / Supabase) | AWS (Amazon Web Services) | Azure (Microsoft) | GCP (Google Cloud Platform) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0. Frontend (Hosting / CDN)** | Servido localmente con Node (`npm run dev`) o Nginx estático. | **Vercel (PaaS / Edge):** Edge Network / Serverless. El Frontend de React se sirve estáticamente desde una CDN global y usa Serverless Functions. | **Amazon S3 + CloudFront:** Almacenamiento barato distribuido globalmente. Costo: ~$2 USD/mes. | **Azure Static Web Apps:** Optimizado para frameworks modernos. Costo: ~$2 USD/mes. | **Firebase Hosting / Cloud Storage:** CDN global de Google muy veloz. Costo: ~$2 USD/mes. |
| **1. Servidor de Aplicaciones (Instancia / Cómputo)** | Contenedores gestionados por Docker Engine (Backend Node.js en localhost). | **Railway (PaaS):** Despliega la API de Node.js automáticamente desde GitHub sin administrar servidores. | **Amazon ECS con Fargate:** Corre contenedores sin administrar servidores. Costo: ~$15 USD/mes. | **Azure App Service:** Fácil migración para web apps. Costo: ~$13 USD/mes. | **Google Cloud Run:** Escala a cero, ideal para APIs HTTP. Costo: ~$5 USD/mes. |
| **2. Base de Datos (Almacenamiento)** | Contenedor local de PostgreSQL con volúmenes montados (`pgdata`). | **Supabase (DBaaS):** PostgreSQL administrado y gratuito en la nube. | **Amazon RDS:** Respaldos automáticos y réplicas de lectura. Costo: ~$18 USD/mes. | **Azure Database for PostgreSQL:** Integración nativa corporativa. Costo: ~$15 USD/mes. | **Cloud SQL for PostgreSQL:** Excelente rendimiento de red. Costo: ~$15 USD/mes. |
| **3. Balanceo de Cargas (Alta Disponibilidad)** | No aplica (se accede directamente a localhost:3000 o 5173). | **Automático (Vercel Edge Network / Railway):** Enruta el tráfico al nodo sano más cercano al usuario a nivel mundial. | **Application Load Balancer (ALB):** Ruteo HTTP/HTTPS avanzado y firewall. Costo: ~$16 USD/mes. | **Azure Application Gateway:** Incluye WAF (Firewall web). Costo: ~$25 USD/mes. | **Cloud Load Balancing:** IP Anycast global única. Costo: ~$18 USD/mes. |
| **4. Configuración de Dominio (DNS)** | Archivo local `/etc/hosts` (localhost). | **Vercel Domains / Proveedor Externo:** DNS gestionado automáticamente para dominios apuntando a Vercel/Railway. | **Amazon Route 53:** DNS ultrarrápido con geolocalización. Costo: ~$0.50 USD/mes. | **Azure DNS:** Integración segura. Costo: ~$0.50 USD/mes. | **Cloud DNS:** 100% de SLA. Costo: ~$0.20 USD/mes. |
| **5. Certificados de Seguridad (SSL / TLS)** | Sin cifrado (`http://`) o certificados auto-firmados inseguros (`mkcert`). | **Automático (Zero Config):** Certificados de Let's Encrypt generados, aplicados y renovados automáticamente (`https://`). | **AWS Certificate Manager (ACM):** Renueva certificados gratis al usar ALB. Costo: $0 USD. | **App Service Managed Certificates:** Renovación automática. Costo: $0 USD. | **Google Managed SSL:** Aprovisionado automáticamente. Costo: $0 USD. |

---

## 2. Nuestra Propuesta Definitiva ante el Grupo 🏆

### Fase 1: Estado Actual (Lean & Ágil)
Proponemos mantener nuestra infraestructura actual completa: **Vercel (Frontend) + Railway (Backend API) + Supabase (BD)**.
* **Justificación:** Para la etapa inicial del producto, desplegar contenedores y CDNs manualmente en un IaaS puro añade complejidad operativa innecesaria. Nuestro enfoque 100% PaaS nos da un entorno productivo robusto con SSL, balanceo y red global por **casi $0 USD/mes**.

### Fase 2: El Futuro (Escalabilidad Empresarial)
Cuando la aplicación genere ingresos fuertes o necesite cumplir normas de seguridad estrictas (VPC, WAF), **migraremos nuestra arquitectura a AWS (Amazon Web Services)**.
* **Justificación:** AWS es el estándar corporativo. Migraríamos el Frontend a Amazon S3 + CloudFront, el Backend a Amazon ECS Fargate y la BD a Amazon RDS. Esto nos dará un control absoluto de la seguridad perimetral mediante un balanceador (ALB) y Route 53.
* **Costo estimado de la migración futura:** **~$51.50 USD / mes**, un precio altamente competitivo para aislar y proteger nuestros sistemas a nivel Enterprise.

---

## 3. Respuestas a las Preguntas de la Actividad

### ¿Cuál es la diferencia entre un servicio IaaS y uno PaaS? Ubica en tu matriz comparativa cuáles servicios elegidos son de cada tipo.

**Diferencia principal:**
* **IaaS (Infraestructura como Servicio):** El proveedor te alquila el hardware virtual (servidores, redes, almacenamiento), pero tú eres responsable de instalar el sistema operativo, mantenerlo actualizado, configurar los entornos de ejecución (Node.js, Docker) y gestionar la seguridad a nivel de red. Te da control total, pero requiere mucho más trabajo de administración.
* **PaaS (Plataforma como Servicio):** El proveedor administra toda la infraestructura subyacente (hardware, sistema operativo y actualizaciones). Tú solo te preocupas por subir tu código o tu aplicación. Es más rápido para el desarrollo y reduce el esfuerzo de mantenimiento.

**Ubicación en la matriz de tu proyecto:**
* **Servicios IaaS en la matriz:** AWS EC2, Azure Virtual Machines y Google Compute Engine. (Si montaras tu base de datos y backend manualmente instalando Ubuntu en estas máquinas, estarías usando IaaS).
* **Servicios PaaS en la matriz:**
  * **Vercel:** Es un PaaS puro. Subiste tu código de React y Vercel se encargó de compilarlo, distribuirlo globalmente y configurar los servidores sin que tú tocaras un sistema operativo.
  * **Amazon RDS, Cloud SQL, Azure App Service:** También son ejemplos de PaaS, ya que te entregan la base de datos o el entorno web listo para usar sin que administres el SO.

### ¿Por qué una aplicación necesita balanceo de carga aunque tenga poco tráfico actualmente?

El balanceo de carga es crucial por dos motivos principales:
1. **Alta Disponibilidad (Tolerancia a fallos):** Si tu aplicación corre en un solo servidor y este se cae (por una actualización, un fallo de hardware o un error de código), el sistema entero queda inoperativo. Un balanceador de carga permite tener al menos dos servidores; si uno falla, el tráfico se redirige automáticamente al servidor sano, manteniendo la app en línea.
2. **Despliegues sin tiempo de inactividad (Zero-Downtime Deployments):** Cuando subes una nueva versión de tu BackEnd o FrontEnd, el balanceador puede desviar a los usuarios de los servidores viejos mientras se actualizan, logrando que los usuarios nunca vean una pantalla de "Servicio no disponible" durante la actualización.

### ¿Qué riesgo corre una aplicación si no configura correctamente el DNS o los certificados SSL/TLS?

**Si el DNS está mal configurado:**
* **Inaccesibilidad:** Los usuarios escribirán el nombre de tu dominio y el navegador devolverá un error (como `DNS_PROBE_FINISHED_NXDOMAIN`), ya que no sabrá a qué dirección IP de tus servidores conectarse.
* **Secuestro de Dominio:** Una mala gestión de los registros DNS podría permitir que un atacante redirija tu tráfico legítimo hacia una página falsa (Phishing) diseñada para robar las credenciales de tus usuarios.

**Si el certificado SSL/TLS falta o está mal configurado:**
* **Intercepción de Datos (Man-in-the-Middle):** Toda la información viajaría en texto plano (`http://`). Si un usuario inicia sesión desde una red Wi-Fi pública, un atacante podría leer fácilmente su correo y su contraseña, comprometiendo todo el sistema.
* **Bloqueo del Navegador:** Hoy en día, navegadores como Chrome o Edge marcan los sitios sin SSL como "No seguros" y pueden bloquear el acceso por completo mostrando una pantalla roja de advertencia, lo que ahuyenta a los usuarios.
* **Incumplimiento Legal:** Dado que tu aplicación maneja datos personales (como se menciona en el aviso de privacidad de la LGPDPPSO), no cifrar el tráfico en tránsito es una violación directa a las leyes de protección de datos.
