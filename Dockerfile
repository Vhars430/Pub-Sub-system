FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and install dependencies first to leverage Docker cache
COPY package.json ./
RUN npm install

# Copy the rest of the application files into the container
COPY . .

# Set Kafka brokers as an environment variable (internal and external brokers)
ENV KAFKA_BROKERS=kafka1:9093,kafka2:9093,kafka3:9093
ENV KAFKA_EXTERNAL_BROKERS=18.189.110.78:9092,18.189.110.78:9094,18.189.110.78:9095

# Expose the port on which the app will run
EXPOSE 3000

# Start the app using the environment variable for Kafka broker
CMD ["node", "app.js"]
