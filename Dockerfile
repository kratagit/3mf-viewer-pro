FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (only production if possible, but we don't have separate dev deps except what we uninstalled)
RUN npm install --omit=dev

# Copy the rest of the application
COPY . .

# Create data directory for uploads
RUN mkdir -p data

# Expose port 3000
EXPOSE 3000

# Start the application stably in the foreground
CMD ["npm", "start"]
