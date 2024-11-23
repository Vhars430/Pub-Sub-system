# CS249-Pub-Sub

To run kafka / Zookeeper:
docker-compose down
docker-compose up --build

Then run app locally:
npm start

Notes:
Zookeeper will be running on port 2181.
Kafka will be running on port 9093.

docker-compose down --volumes
docker-compose up --build

Investigate logs:
docker service logs -f pubsub-stack_kafka

Restart docker swarm:
First this:
docker volume prune -f  
docker network prune -f
Then:
docker stack rm pubsub-stack
docker stack deploy -c docker-compose.yml pubsub-stack

If this doesn't work:
docker volume prune -f  
docker network prune -f
docker stack rm pubsub-stack
docker network ls
then kill the lingering network ids OR docker stop $(docker ps -q) docker rm $(docker ps -aq)
docker stack rm pubsub-stack
docker stack deploy -c docker-compose.yml pubsub-stack

You should then see something like:
Creating network pubsub-stack_pubsub-system
Creating service pubsub-stack_zookeeper
Creating service pubsub-stack_kafka
Creating service pubsub-stack_pubsub-system

zookeeper hub:
https://hub.docker.com/r/bitnami/zookeeper
