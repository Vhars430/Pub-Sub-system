FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and install dependencies first to leverage Docker cache
COPY package.json ./
RUN npm install

# Copy the rest of the application files into the container
COPY . .

# Set Kafka broker as an environment variable
ENV KAFKA_BROKER=kafka:9093

# Expose the port on which the app will run
EXPOSE 3000

# Start the app using the environment variable for Kafka broker
CMD ["node", "app.js"]
