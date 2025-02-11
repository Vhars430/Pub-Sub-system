FROM node:18

WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY . .

ENV KAFKA_BROKERS="kafka1:9092,kafka2:9092,kafka3:9092"
ENV KAFKA_EXTERNAL_BROKERS="18.189.110.78:9092,18.189.110.78:9094,18.189.110.78:9095"

EXPOSE 3000

CMD ["node", "app.js"]
