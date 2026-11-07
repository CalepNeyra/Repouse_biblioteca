# Biblioteca — Laboratorio 12

La auditoría detallada de TAREA está en [docs/AUDITORIA-TAREA.md](docs/AUDITORIA-TAREA.md): 44 criterios, evidencias HTTP/UI/Neon, dos verificaciones pendientes de confirmación de eliminación en navegador y resultados reproducibles de TypeScript, ESLint y compilación.

Proyecto existente de Desarrollo de Aplicaciones Web Avanzado de Tecsup. Implementa la parte guiada y los tres requerimientos de TAREA: búsqueda avanzada, estadísticas e interfaz web. Usa Neon en lugar de Supabase por indicación del estudiante.

## Requisitos y ejecución

- Node.js 24 LTS y npm.
- PostgreSQL en Neon, base `neondb`.
- La variable privada `DATABASE_URL` debe existir en `.env` en la raíz. El archivo existente se conserva; nunca publiques su contenido ni uses el prefijo `NEXT_PUBLIC_`.

```powershell
npm ci
npm run db:validate
npm run db:generate
npm run dev
```

Abre http://localhost:3000. Las tablas ya fueron creadas y verificadas en Neon. Para una base nueva, configura su variable de conexión y ejecuta `npm run db:push`; no uses `--force-reset` ni `--accept-data-loss`.

Si PowerShell bloquea `npm.ps1`, usa `npm.cmd`. En esta sesión npm no estaba en el PATH y se utilizó `C:\Program Files\nodejs\npm.cmd`. Una terminal nueva o `nodevars.bat` del directorio de Node permite recuperar el PATH habitual.

## Corrección de Prisma

La CLI era `8.0.0-rc.33` y el cliente `7.10.1`. Se fijaron `prisma`, `@prisma/client` y `@prisma/adapter-pg` en `7.10.1`, sin rangos que puedan instalar la versión preliminar. Se usa `defineConfig` con `env("DATABASE_URL")` y se retiraron las opciones `skills` y el script `prisma skills sync` de Prisma 8. `dotenv` es una dependencia explícita.

Se conservaron los modelos de la guía: identificadores `cuid`, campos opcionales, correo e ISBN únicos, fechas automáticas, relación de uno a muchos, eliminación en cascada e índices de `authorId`, `genre` y `title`. En Prisma 7 la conexión está en `prisma.config.ts`, en lugar de `url` dentro del esquema. El cliente compartido usa el adaptador PostgreSQL y se reutiliza durante el desarrollo.

Referencias: [actualización a Prisma 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [configuración de Prisma](https://docs.prisma.io/docs/orm/reference/prisma-config-reference).

## Funcionalidades

| Página | Funciones |
| --- | --- |
| `/` | Crear, listar, editar y eliminar autores; enlace a sus libros; totales de autores, libros y géneros |
| `/books` | Crear y editar libros con selector de autor; eliminar; buscar por título con espera de 300 ms y cancelación de solicitudes anteriores; filtrar por género y autor; ordenar; paginar |
| `/authors/[id]` | Información completa, edición, estadísticas, lista de obras y registro de libros con el autor seleccionado |

La interfaz usa Tailwind CSS, se adapta al ancho disponible y muestra estados de carga, resultados vacíos, errores, reintentos y confirmaciones antes de eliminar. Los datos vienen de PostgreSQL a través de las API Routes. Los formularios y el servidor validan los datos; el servidor no expone detalles de conexión en los errores. Las fuentes son locales al sistema para evitar descargas durante la compilación.

## API REST

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/authors` | Autores ordenados por nombre, con `books` y `_count.books` |
| POST | `/api/authors` | Crea autor; 201 |
| GET | `/api/authors/[id]` | Autor, libros y contador |
| PUT | `/api/authors/[id]` | Actualiza campos enviados; preserva los omitidos |
| DELETE | `/api/authors/[id]` | Elimina autor y sus libros; confirmación JSON |
| GET | `/api/authors/[id]/books` | `{ author: { id, name }, totalBooks, books }` |
| GET | `/api/authors/[id]/stats` | Estadísticas de la guía |
| GET | `/api/books` | Libros y autor; filtros opcionales `genre` y `authorId` |
| POST | `/api/books` | Crea libro; 201 |
| GET | `/api/books/[id]` | Libro y autor |
| PUT | `/api/books/[id]` | Actualiza campos enviados |
| DELETE | `/api/books/[id]` | Elimina libro; confirmación JSON |
| GET | `/api/books/search` | Búsqueda, filtros, ordenamiento y paginación |
| GET | `/api/books/genres` | Géneros existentes, únicos y ordenados |

Errores: 400 para JSON o campos inválidos, 404 para registros o autores referenciados inexistentes, 409 para correo/ISBN duplicado, 503 si falla la conexión u operación de base de datos. Los errores usan `{ "error": "mensaje" }`.

Los campos `name` y `email` son obligatorios al crear autores; `title` y `authorId`, al crear libros. El título necesita al menos tres caracteres. Los campos numéricos aceptan enteros JSON; páginas deben ser positivas. Los opcionales aceptan `null`. Un PUT vacío se rechaza.

### Búsqueda avanzada

| Parámetro | Comportamiento |
| --- | --- |
| `search` | Título parcial sin distinguir mayúsculas |
| `genre` | Género exacto |
| `authorName` | Nombre parcial de autor sin distinguir mayúsculas |
| `authorId` | Filtro adicional exacto para el selector de la interfaz |
| `page` | Entero positivo; predeterminado 1 |
| `limit` | 1 a 50; predeterminado 10 |
| `sortBy` | `title`, `publishedYear`, `createdAt`; predeterminado `createdAt` |
| `order` | `asc` o `desc`; predeterminado `desc` |

Ejemplo: `/api/books/search?search=amor&genre=Novela&page=1&limit=10&sortBy=publishedYear&order=desc`.

Respuesta: `{ data: [...], pagination: { page, limit, total, totalPages, hasNext, hasPrev } }`. Los filtros se combinan con AND. El conteo y la página se obtienen en una transacción con vista consistente; `id` desempata el orden. Sin resultados, `totalPages` es 0. Los parámetros inválidos se rechazan con 400.

### Estadísticas

Devuelve `authorId`, `authorName`, `totalBooks`, `firstBook: {title, year}`, `latestBook: {title, year}`, `averagePages`, `genres`, `longestBook: {title, pages}` y `shortestBook: {title, pages}`. Sin libros, el total es 0, los géneros son `[]` y los demás valores son `null`. Los años o páginas no registrados no participan en los respectivos cálculos. El promedio se redondea a dos decimales.

## Pruebas

Con el servidor iniciado en otra terminal:

```powershell
npm run test:api
npm run db:verify
npm run typecheck
npm run lint
npm run build
```

`test:api` ejecuta 30 grupos de pruebas HTTP sobre la base real. Crea autores y libros temporales con identificadores únicos, comprueba validación, duplicados, edición parcial, filtros, paginación, estadísticas y cascada; elimina únicamente sus propios registros al terminar. Guarda resultados, trazas HTTP y ejemplos comprobados en `docs/api-test-results.json`. Incluye los seis ordenamientos, paginación con 13 libros y estadísticas con todos los opcionales vacíos. Para otro servidor se puede definir `TEST_BASE_URL` sin incluir credenciales.

`db:verify` consulta la versión de PostgreSQL, tablas, índices, cascada y conteos sin imprimir la cadena de conexión. Las restricciones del laboratorio pueden requerir permisos de salida a npm, al servidor de binarios de Prisma y al host de Neon. Un error de red no equivale a una operación completada.

La colección `docs/Lab12.postman_collection.json` permite reproducir manualmente los endpoints en Postman. Importa la colección y ejecútala en orden: guarda `authorId` y `bookId` automáticamente y limpia sus registros al finalizar. No se ejecutó Postman durante la implementación; se usaron las pruebas HTTP equivalentes.

## Preparación para Vercel

El proyecto mantiene App Router y el runtime Node de Next.js. `npm run build` genera Prisma Client antes de compilar; no modifica las tablas ni ejecuta pruebas sobre Neon.

Cuando se autorice publicar:

1. Crear el repositorio Git y revisar los archivos antes del primer commit. `.env*`, `node_modules` y `.next` están excluidos. No añadir secretos al repositorio.
2. Importar el repositorio en Vercel con el preset Next.js, raíz del proyecto actual y Node.js 24.x.
3. Configurar `DATABASE_URL` como variable privada en los entornos necesarios desde Vercel. No incluir su valor en archivos ni capturas. Usar una base separada si se necesitan previews independientes.
4. Instalar con `npm ci` y compilar con `npm run build`. La base actual ya tiene las tablas; no agregar `db push --accept-data-loss` al proceso de despliegue.
5. Tras el despliegue autorizado, verificar las tres páginas y los endpoints; anotar el enlace real en el informe.

No se creó repositorio, commit ni despliegue. La guía no solicita autenticación; antes de publicar con datos importantes, debe decidirse quién podrá usar los endpoints de escritura.

Referencias: [Next.js en Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [variables de entorno en Vercel](https://vercel.com/docs/environment-variables).

## Archivos principales

- `prisma.config.ts`, `package.json`, `package-lock.json`: corrección de dependencias y comandos.
- `prisma/schema.prisma`: esquema existente preservado.
- `src/lib/prisma.ts`: conexión y cliente compartido.
- `src/lib/api.ts`: validación y errores.
- `src/app/api/`: CRUD y endpoints avanzados.
- `src/components/library.tsx`: formularios y vistas interactivas.
- `src/app/page.tsx`, `src/app/books/page.tsx`, `src/app/authors/[id]/page.tsx`: tres páginas.
- `src/app/layout.tsx`, `src/app/globals.css`: navegación y estilos.
- `scripts/`: verificación de la base y pruebas HTTP.
- `docs/`: resultados, colección Postman y guía de evidencias.
- `AGENTS.md`: generado automáticamente por esta versión de `next dev`.
