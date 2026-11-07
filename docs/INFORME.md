# Evidencias del Laboratorio 12

## Capturas necesarias

1. Versiones estables coincidentes de Prisma CLI, Client y adaptador: `npm ls prisma @prisma/client @prisma/adapter-pg`.
2. `prisma validate` y generación de Prisma Client correctos. Evitar capturar comandos que impriman el destino completo de la conexión.
3. Tablas `Author` y `Book`, índices y relación en Neon o TablePlus. Ocultar toda credencial y configuración de conexión.
4. Dashboard con autores y estadísticas generales.
5. Creación y edición de un autor.
6. Registro de libro con selector de autor.
7. Catálogo con filtros, ordenamiento y total de resultados.
8. Dos páginas consecutivas de la búsqueda con suficientes libros registrados.
9. Detalle de autor con biografía, libros y todas las estadísticas.
10. Estados vacíos y un error de validación (por ejemplo, título demasiado corto).
11. Confirmación de eliminación y actualización del listado.
12. Pruebas GET y POST de autores; GET por ID; GET de libros del autor; PUT de autor.
13. Pruebas GET de libros y género; POST de libro; GET por ID y DELETE de libro.
14. Búsqueda avanzada con paginación y endpoint de estadísticas en Postman o las pruebas HTTP equivalentes.
15. TypeScript, ESLint y compilación final correctos.
16. Aplicación en ancho móvil.

Los registros creados para las pruebas automáticas son temporales y se eliminan. Para capturas finales con la colección de la biblioteca, registrar datos elegidos por el estudiante a través de la interfaz. No confundir datos de prueba con información permanente.

## Enlaces pendientes

- Repositorio GitHub: pendiente de autorización y publicación.
- Aplicación Vercel: pendiente de autorización y despliegue.

No se inventaron enlaces. El documento original no fue sobrescrito.

## Cinco conclusiones propuestas para adaptar

1. La incompatibilidad entre una CLI preliminar y un cliente estable impidió ejecutar los comandos habituales. Fijar ambos paquetes y el adaptador en la misma versión estable permitió validar el esquema y generar el cliente correctamente.
2. La conexión a PostgreSQL requiere distinguir errores del código de restricciones de red. La creación de tablas se confirmó con consultas reales a Neon, en lugar de asumir que la presencia de archivos locales demostraba su existencia.
3. Los Route Handlers permiten separar la persistencia de la interfaz. Las validaciones del servidor y los códigos 400, 404 y 409 hacen que los errores de los formularios y las API sean comprensibles.
4. La búsqueda combina filtros, ordenamiento y paginación para mantener útil el catálogo. Las estadísticas deben excluir los valores opcionales no registrados para evitar resultados engañosos.
5. Las pruebas con registros temporales permitieron comprobar el CRUD, la persistencia y la eliminación en cascada sin conservar datos artificiales en la biblioteca. La publicación y las evidencias del informe son pasos distintos de la implementación y requieren completarse con los enlaces reales.
