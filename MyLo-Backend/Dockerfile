# 1. Use Node.js official image
FROM node:slim

# 2. Set working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package.json and package-lock.json first for caching
COPY package*.json ./

# 4. Install dependencies
RUN npm install 
# RUN npm install ci --omit=dev
RUN npm install pm2 -g

# RUN npx sequelize-cli db:create

# 5. Copy the rest of your project files
COPY . .

# 6. compile typescript
RUN npm run build

# 7. Expose the port (must match PORT in .env)
EXPOSE 5000

# 8. Start the app using your dev script
CMD ["pm2-runtime", "ecosystem.config.js"]