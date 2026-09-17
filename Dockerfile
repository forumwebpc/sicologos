# Imagen base oficial de Node.js 20 en versión Alpine (ligera y segura)
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar definición de dependencias
COPY package*.json ./

# Instalar dependencias para producción
RUN npm ci --only=production

# Copiar el resto del código fuente del proyecto
COPY . .

# Exponer el puerto interno de la app (3000)
EXPOSE 3000

# Configuración de variables de entorno de producción
ENV NODE_ENV=production
ENV PORT=3000

# Comando de arranque del servidor
CMD ["node", "server.js"]
