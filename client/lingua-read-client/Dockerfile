# Stage 1: Build the React application
FROM node:20 AS build

# Define build-time argument for API URL
ARG REACT_APP_API_URL

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
# Note: Paths inside the Docker build context are relative to the context root (project root)
COPY client/lingua-read-client/package.json ./
# Check if package-lock.json exists before copying
COPY client/lingua-read-client/package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
# Note: Paths inside the Docker build context are relative to the context root (project root)
COPY client/lingua-read-client/ ./

# Build the application
# Set environment variable for the build process
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:stable-alpine AS final

# Copy the build output from the build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx configuration (optional but good practice for SPA routing)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]