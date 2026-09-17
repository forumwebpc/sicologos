# Imagen base oficial de Node.js 20 en versión Alpine
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar definición de dependencias
COPY package*.json ./

# Instalar dependencias para producción
RUN npm install --only=production

# Copiar el resto del código fuente del proyecto
COPY . .

# Exponer los puertos posibles
EXPOSE 3000
EXPOSE 80

# Configuración de variables de entorno de producción
ENV NODE_ENV=production
ENV PORT=3000

# Comando de arranque del servidor
CMD ["node", "server.js"]
