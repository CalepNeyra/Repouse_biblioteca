# Verificación ejecutada el 7 de noviembre de 2026

## Resultados

| Comprobación | Resultado observado |
| --- | --- |
| Prisma CLI / Client / adaptador PostgreSQL | Los tres instalados en 7.10.1; lockfile coincidente |
| Validación del esquema | Correcta, repetida al finalizar |
| `prisma db push` | Correcto; sincronizó Neon sin aceptar pérdida de datos ni reiniciar la base |
| Generación de Prisma Client | Correcta; también ejecutada dentro de `npm run build` |
| Versión consultada directamente | PostgreSQL 18.6 |
| Tablas consultadas en `information_schema` | `public.Author` y `public.Book` |
| Índices consultados en `pg_indexes` | `Author_pkey`, `Author_email_key`, `Book_pkey`, `Book_isbn_key`, `Book_authorId_idx`, `Book_genre_idx`, `Book_title_idx` |
| Relación consultada en `information_schema` | Clave foránea de Book con `delete_rule = CASCADE` |
| Pruebas HTTP contra servidor local y Neon | 25 grupos aprobados; detalle en `api-test-results.json` |
| TypeScript | `npm run typecheck`, correcto |
| ESLint del proyecto completo | `npm run lint`, correcto |
| Producción | `npm run build`, correcto; todas las páginas y rutas API incluidas |
| Credenciales | `.env*` excluido en `.gitignore`; búsqueda del valor privado en fuentes, scripts, documentación y archivos de cliente compilados: 0 coincidencias |
| Limpieza final | 0 autores y 0 libros; registros temporales de las pruebas eliminados |

Los comandos Prisma se invocaron usando la CLI instalada localmente, equivalente a `npx prisma` sin descargar otra versión. Para los comandos npm se usó su ruta completa porque npm no estaba disponible en el PATH de esta sesión.

## Prueba visual

Se usó el navegador integrado con la aplicación local y datos reales temporales persistidos en Neon. Se comprobaron:

- Dashboard y métricas.
- Registro de autora desde el formulario principal.
- Página de detalle, caso sin libros y estadísticas después de registrar un libro.
- Registro de libro desde el detalle con autora preseleccionada.
- Catálogo, búsqueda de título en mayúsculas, selección de género y ordenamiento.
- Edición de páginas del libro de 240 a 250 y actualización de las estadísticas.
- Edición de biografía desde el detalle y persistencia al volver al dashboard.
- Presentación a 1280 px y a 390 px; catálogo móvil con tabla desplazable horizontalmente.
- Consola inspeccionada durante la prueba: sin errores ni advertencias capturados.

Capturas guardadas: `screenshots/dashboard-desktop.jpg`, `screenshots/books-desktop.jpg`, `screenshots/author-desktop.jpg`, `screenshots/books-mobile.jpg`. Muestran registros temporales que ya se eliminaron. Las pruebas DELETE y de cascada se realizaron por HTTP; no se afirma haber completado la eliminación desde el navegador.

## Incidencias resueltas

1. CLI Prisma 8 preliminar incompatible con Client 7: se alinearon versiones estables y configuración.
2. Descarga de paquetes npm denegada inicialmente con `EACCES`: el reintento con permisos de red terminó correctamente.
3. Descarga del motor Prisma desde `binaries.prisma.sh` bloqueada inicialmente: el reintento autorizado permitió validar.
4. Primer `db push` y servidor dentro del entorno restringido sin salida a Neon: se reintentaron con permisos y se verificó la base mediante consulta directa.
5. El primer ESLint global detectó imports `require` en el script de verificación: se convirtió a ESM y el chequeo final completo pasó.

No se modificó ni mostró `.env`. El esquema de modelos existente coincide con la captura de la guía y se conservó sin cambios. La conexión se adaptó en `prisma.config.ts` para Prisma 7.

## Pendiente

- No hay repositorio `.git` en esta carpeta. Se verificó la regla de exclusión, pero no puede comprobarse un historial Git inexistente.
- No se ejecutó la aplicación Postman; se preparó una colección y se ejecutaron pruebas HTTP automatizadas equivalentes.
- GitHub, commits y despliegue real en Vercel no se ejecutaron por indicación del usuario.
- Los enlaces reales del repositorio y del despliegue se incorporarán al informe después de autorizar la publicación.
- Las capturas definitivas del informe y las conclusiones personales pueden completarse siguiendo `INFORME.md`.
