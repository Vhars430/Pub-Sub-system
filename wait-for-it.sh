#!/usr/bin/env bash
# wait-for-it.sh

# This script waits for a service to be available on a specific host:port.
# Example: ./wait-for-it.sh kafka:9093 -- echo "Kafka is up!"

TIMEOUT=30
WAIT_TIME=5

# Display usage
usage() {
  echo "Usage: $0 host:port [-t timeout] [-w wait_time] -- command"
  exit 1
}

# Parse arguments
while getopts "t:w:" opt; do
  case "$opt" in
    t) TIMEOUT=$OPTARG ;;
    w) WAIT_TIME=$OPTARG ;;
    *) usage ;;
  esac
done

shift $((OPTIND-1))

# Extract host and port
HOST_PORT=$1
shift

# Separate host and port
HOST=$(echo "$HOST_PORT" | cut -d ':' -f 1)
PORT=$(echo "$HOST_PORT" | cut -d ':' -f 2)

# Wait for the host:port to become available
echo "Waiting for $HOST_PORT to be available..."
for i in $(seq $TIMEOUT); do
  nc -z "$HOST" "$PORT" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "$HOST_PORT is available!"
    exec "$@"  # Run the command passed as arguments
    exit 0
  fi
  echo "Waiting for $HOST_PORT... ($i/$TIMEOUT)"
  sleep $WAIT_TIME
done

echo "Timeout reached. $HOST_PORT is not available."
exit 1
