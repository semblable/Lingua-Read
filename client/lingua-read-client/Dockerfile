# -------- Build Stage --------
FROM node:20 AS build
WORKDIR /app

# Add an ARG for the API URL
ARG REACT_APP_API_URL_ARG

# Set the ENV variable from the ARG so npm run build can access it
ENV REACT_APP_API_URL=$REACT_APP_API_URL_ARG

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy source code and build
COPY . ./
RUN npm run build

# -------- Runtime Stage --------
FROM nginx:stable-alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built React app from build stage
COPY --from=build /app/build ./

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy htpasswd file for basic authentication
COPY .htpasswd /etc/nginx/.htpasswd

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]