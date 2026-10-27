# UNICEN - backend

API del sistema académico construida con NestJS, Prisma ORM y PostgreSQL.

## Inicio local

Desde esta carpeta crea la configuración local, levanta PostgreSQL, aplica migraciones, crea las cuentas de desarrollo e inicia la API:

```powershell
Copy-Item .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run start:dev
```

Docker Compose usa un volumen persistente para PostgreSQL. `npm run db:down` detiene el contenedor sin borrar los datos. `npm run db:studio` abre Prisma Studio.

## Autenticación

- `POST /auth/login` recibe `{ "email": "...", "password": "..." }` y devuelve un JWT.
- `GET /auth/me` requiere `Authorization: Bearer <accessToken>`.
- Roles disponibles: `ADMINISTRATOR`, `TEACHER` y `STUDENT`.

El seed crea las cuentas de desarrollo indicadas por `ADMIN_*` y `DEMO_STUDENT_*` en `.env`. Ejemplos iniciales: `admin@unicen.edu.bo` / `AdminDemo123!` y `estudiante@unicen.edu.bo` / `Estudiante123!`. Cambia estas credenciales antes de usar el sistema fuera del entorno local. Las contraseñas se almacenan con bcrypt; sus hashes nunca se incluyen en las respuestas.

## CRUD de estudiantes

Las consultas requieren token de administrador o docente. Crear, editar y eliminar requieren el rol administrador:

- `GET /students` y `GET /students/:id`
- `POST /students` con `email`, `password`, `firstName`, `lastName`, `studentCode` y opcionalmente `phone`, `birthDate` (ISO 8601) y `address`.
- `PATCH /students/:id` acepta los mismos campos opcionales; si se envía `password`, se guarda su hash.
- `DELETE /students/:id` elimina el estudiante y su cuenta asociada.

Los correos y códigos de estudiante deben ser únicos. La API valida los DTO y rechaza propiedades no permitidas. Las respuestas incluyen el correo de la cuenta, pero nunca su contraseña ni hash.

## Pruebas y compilación

```bash
npm run build
npm test
npm run test:e2e
npm run lint
```

No uses las credenciales de ejemplo ni ejecutes el seed de demostración en producción. Configura secretos y contraseñas seguras en el entorno de despliegue.
