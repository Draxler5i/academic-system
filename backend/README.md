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

## Catálogo de materias y oferta por gestión

Las rutas de consulta requieren autenticación; crear, editar y eliminar requieren el rol administrador.

- `GET /subjects` y `GET /subjects/:id` consultan el catálogo.
- `POST /subjects` recibe `code`, `name`, `credits` y opcionalmente `description` e `isActive`.
- `PATCH /subjects/:id` y `DELETE /subjects/:id` administran las materias. No se puede borrar una materia con ofertas asociadas.
- `GET /course-offerings` lista ofertas; se puede filtrar con `year`, `period` (`ANNUAL`, `FIRST_SEMESTER`, `SECOND_SEMESTER`) y `subjectId`.
- `GET /course-offerings/:id` consulta una oferta.
- `POST /course-offerings` recibe `subjectId`, `year`, `period`, `capacity` y opcionalmente `section`, `teacherId`, `classroom` y `schedule`.
- `PATCH /course-offerings/:id` y `DELETE /course-offerings/:id` administran las ofertas.

Una oferta identifica la gestión, periodo y paralelo de una materia. La combinación materia/año/periodo/paralelo es única, y la capacidad no puede reducirse por debajo de las inscripciones actuales.

El seed crea seis materias y siete ofertas de ejemplo para la gestión 2026. Puedes volver a ejecutar `npm run db:seed`: actualiza los registros de demostración existentes sin duplicarlos.

## Inscripciones a cursos

Los estudiantes pueden gestionar solo sus propias inscripciones:

- `POST /enrollments` con `{ "courseOfferingId": "<id-de-la-oferta>" }` para inscribirse.
- `GET /enrollments/me` para consultar sus inscripciones.
- `DELETE /enrollments/:id` para cancelar una inscripción propia.

Administradores y docentes pueden consultar todas las inscripciones con `GET /enrollments`; los administradores también pueden cancelar cualquiera. La inscripción es atómica: evita duplicados y no permite superar los cupos disponibles, incluso con solicitudes concurrentes. El estudiante de demostración queda inscrito en Álgebra e Informática I al ejecutar el seed.

## Pruebas y compilación

```bash
npm run build
npm test
npm run test:e2e
npm run lint
```

No uses las credenciales de ejemplo ni ejecutes el seed de demostración en producción. Configura secretos y contraseñas seguras en el entorno de despliegue.
