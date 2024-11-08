# Use official Node.js runtime as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and install dependencies first to leverage Docker cache
COPY package.json ./
RUN npm install

# Copy the rest of the application files into the container
COPY . .

# Copy the wait-for-it.sh script into the container
COPY wait-for-it.sh /usr/src/app/

# Make sure the script is executable
RUN chmod +x /usr/src/app/wait-for-it.sh

# Expose the port on which the app will run
EXPOSE 3000

# Use wait-for-it.sh to wait for Kafka to be available, then start the app
CMD ["./wait-for-it.sh", "kafka:9093", "--", "node", "app.js"]
