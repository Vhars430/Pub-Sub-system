# CS249-Pub-Sub

## Overview

This project implements a Kafka-based publish-subscribe system with Zookeeper coordination. This README provides detailed instructions for setting up the environment, running the application, troubleshooting issues, and deploying updates.

## Prerequisites

- **Docker:** Ensure you have Docker installed on your system. Download and install it from the official website: [https://www.docker.com/get-started/](https://www.docker.com/get-started/)
- **Familiarity with Docker Tools:** Basic understanding of `docker-compose`, `docker stack`, and `npm` is recommended.

---

## Getting Started

### Running Kafka and Zookeeper

1. **Stop Existing Containers (if any):**

   ```bash
   docker-compose down
   ```

2. **Build and Start Containers:**
   ```bash
   docker-compose up --build
   ```
   This command builds the Docker images for your application and starts the Kafka and Zookeeper containers.

### Running the Application Locally

After Kafka and Zookeeper are running, navigate to your project directory and run:

```bash
npm start
```

This will start the application using Node.js (npm).

## Default Ports

- Zookeeper: 2181
- Kafka: 9092

## Logs and Troubleshooting

### Investigating Logs

- **Kafka Logs:**
  ```bash
  docker service logs -f pubsub-stack_kafka
  ```
  OR
  ```bash
  docker service logs -f pubsub-stack_pubsub
  ```

```bash
  docker service logs -f pubsub-stack_pubsub | grep -v '"level":"ERROR"'
```

This command displays the logs for the Kafka service in real-time.

### Restarting the Docker Swarm

**If you encounter issues, follow these steps to restart the Docker Swarm:**

1. **Clean Up Volumes and Networks:**

   ```bash
   docker volume prune -f
   docker network prune -f
   ```

   This removes unused Docker volumes and networks.

2. **Remove and Redeploy the Stack:**
   ```bash
   docker stack rm pubsub-stack
   docker stack deploy -c docker-compose.yml pubsub-stack
   ```
   This removes the existing stack and deploys it again from the `docker-compose.yml` file.

**If the issue persists:**

1. **Clean Up Resources Again:**

   ```bash
   docker volume prune -f
   docker network prune -f
   ```

2. **Identify and Remove Lingering Network IDs (Optional):**

   ```bash
   docker network ls  # List all networks
   # Identify and remove any lingering network IDs related to the stack
   docker network rm <network_id>
   ```

3. **Stop and Remove All Containers (Optional - for a complete restart):**

   ```bash
   docker volume prune -f
   docker network prune -f
   Then,
   docker stop $(docker ps -q)
   docker rm $(docker ps -aq)
   Then,
   docker stack rm pubsub-stack
   docker stack deploy -c docker-compose.yml pubsub-stack
   ```

4. **Redeploy the Stack:**
   ```bash
   docker stack rm pubsub-stack
   docker stack deploy -c docker-compose.yml pubsub-stack
   ```

**Expected Output:**

The application logs should display various messages as it starts up. Look for messages indicating successful connection to Zookeeper and Kafka.

### Monitoring Services

- **Check Service Status:**

  ```bash
  docker stack services pubsub-stack
  ```

  This command displays the status of all services within the `pubsub-stack` stack.

- **View Specific Service Logs:**
  ```bash
  docker service logs <service-name>
  ```
  Replace `<service-name>` with the actual service name (e.g., `pubsub-stack_kafka`). This displays the logs for the specified service.

## Deployment

### Building and Pushing Images

**Here's how to build and push Docker images to a registry (optional):**

1. **Build Images:**

   ```bash
   docker-compose build
   ```

   This builds Docker images for each service defined in your `docker-compose.yml` file.

2. **Push Images (to a registry):**
   ```bash
   docker-compose push
   docker build -t kbenellisjsu/pubsub-system:latest .
   docker push kbenellisjsu/pubsub-system:latest
   ```
   This pushes the built images to a Docker registry (requires configuration).

### Deploying the Stack

**Once you have built the images (or are using pre-built ones), deploy the stack using Docker Compose:**

```bash
docker stack deploy -c docker-compose.yml pubsub-stack
```

This command deploys the stack based on the configuration in your `docker-compose.yml` file.

**Updating Services:**

To update the image for a specific service within the stack, use the following command:

```bash
docker service update --image kbenellisjsu/pubsub-system:latest pubsub-stack_pubsub
```

This example updates the image for the `pubsub-stack_pubsub` service with the latest version from the `kbenellisjsu/pubsub-system` repository on Docker Hub.

## Scaling Service Replicas

To scale the number of replicas for your services, use the `docker service scale` command. This allows you to increase or decrease the number of instances running for each service.

### Scaling Kafka Service

```bash
docker service scale pubsub-stack_kafka=3
```

This command scales the Kafka service to 3 replicas.

### Scaling Pub-Sub Service

```bash
docker service scale pubsub-stack_pubsub=3
```

This command scales the Pub-Sub service to 3 replicas.

### Scaling Zookeeper Service

```bash
docker service scale pubsub-stack_zookeeper=3
```

This command scales the Zookeeper service to 3 replicas.
