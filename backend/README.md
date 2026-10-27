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

El seed crea las cuentas de desarrollo indicadas por `ADMIN_*`, `DEMO_TEACHER_*` y `DEMO_STUDENT_*` en `.env`. Ejemplos iniciales: `admin@unicen.edu.bo` / `AdminDemo123!`, `docente@unicen.edu.bo` / `Docente123!` y `estudiante@unicen.edu.bo` / `Estudiante123!`. Cambia estas credenciales antes de usar el sistema fuera del entorno local. Las contraseñas se almacenan con bcrypt; sus hashes nunca se incluyen en las respuestas.

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

## Notas y calificaciones

Cada nota pertenece a una inscripción y tiene `title` (evaluación), `score` (0 a 100, hasta dos decimales), `weight` (ponderación en %, 1 a 100) y opcionalmente `comment`. La suma de ponderaciones activas de una inscripción no puede superar el 100 %.

Solo el docente asignado a la oferta puede registrar, modificar o eliminar sus notas:

- `GET /grades/teaching` lista las ofertas que dicta el docente autenticado.
- `GET /grades/course-offerings/:courseOfferingId` devuelve los estudiantes inscritos con sus notas y resumen (docente del curso o administrador).
- `POST /grades` con `enrollmentId`, `title`, `score`, `weight` y opcionalmente `comment`.
- `PATCH /grades/:id` acepta `title`, `score`, `weight` y `comment`.
- `DELETE /grades/:id` aplica un borrado lógico: guarda `deletedAt` y `deletedById`, y la nota deja de aparecer en las consultas, pero se conserva en la base de datos para auditoría.

Historial académico:

- `GET /grades/me` devuelve al estudiante sus cursos con notas y resumen.
- `GET /grades/students/:studentId` permite a administradores y docentes consultar el historial de un estudiante.
- `GET /grades/history` (solo administrador) devuelve el historial de todos los estudiantes. Filtros opcionales: `year` (gestión), `period`, `subjectId` (materia), `courseOfferingId` (curso) y `search` (código, nombre o apellido del estudiante).

El resumen de cada curso incluye `evaluatedWeight`, `finalScore`, `passingScore` y `status`: `IN_PROGRESS` hasta evaluar el 100 %, luego `PASSED` si el puntaje alcanza la nota mínima, o `FAILED`. El cálculo lo define la política configurada en `.env`: `GRADING_POLICY=weighted` (por defecto; suma de `score × weight / 100`) o `average` (promedio simple), y `PASSING_SCORE` (por defecto 51). Una inscripción con notas registradas (incluso eliminadas) no se puede cancelar, para no perder el historial. Cada inscripción y cambio de nota se registra en el log de auditoría de la API.

El seed crea la cuenta docente indicada por `DEMO_TEACHER_*` (por defecto `docente@unicen.edu.bo` / `Docente123!`), la asigna a Álgebra y Programación I (paralelo A, primer semestre 2026) y registra notas de ejemplo solo si la inscripción aún no tiene notas.

## Pruebas y compilación

```bash
npm run build
npm test
npm run test:e2e
npm run lint
```

No uses las credenciales de ejemplo ni ejecutes el seed de demostración en producción. Configura secretos y contraseñas seguras en el entorno de despliegue.
