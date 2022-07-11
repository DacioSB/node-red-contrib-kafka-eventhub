import { NodeDef, NodeInitializer, Node } from "node-red";
import {
  ConnectEvent,
  Consumer,
  ConsumerConfig,
  ConsumerRunConfig,
  ConsumerSubscribeTopics,
  DisconnectEvent,
  Kafka,
  RequestTimeoutEvent,
} from "kafkajs";
import { v4 as uuid4 } from "uuid";

interface kafkaConsumerDef extends NodeDef {
  topic: string;
  consumergroup?: string;
  frombeginning: boolean;
  clearoffsets: boolean;
  connection: string;
}

interface KafkaConsumerNode extends Node {
  client: Kafka;
  consumer: Consumer;
  start: any;
  connect: (event: ConnectEvent) => void;
  disconnect: (event: DisconnectEvent) => void;
  timeout: (event: RequestTimeoutEvent) => void;
  lastMsg: number;
  message: any;
  idleInterval: NodeJS.Timeout;
  lastMessage: number;
}

type Payload = {
  topic: string;
  partition: number;
  payload: any;
};

const KafkaConsumer: NodeInitializer = function (RED) {
  function KafkaConsumerConstructor(this: KafkaConsumerNode, config: kafkaConsumerDef) {
    RED.nodes.createNode(this, config);
    let node = this;
    let configClient = RED.nodes.getNode(config.connection) as any;
    node.client = new Kafka(configClient.options);

    if (!this.client) {
      node.error("Kafka client not found");
      console.error("Kafka client not found");
      return;
    }

    let consumerOptions: ConsumerConfig = {
      groupId: config.consumergroup || uuid4(),
    };
    let subsOptions: ConsumerSubscribeTopics = {
      topics: [config.topic],
      fromBeginning: config.frombeginning,
    };
    let runOptions: ConsumerRunConfig = {
      autoCommit: true,
    };

    node.start = async function start() {
      if (config.clearoffsets) {
        node.status({ fill: "yellow", shape: "dot", text: "Resetting Offset" });
        let adm = node.client.admin();
        await adm.connect();
        await adm.resetOffsets({
          groupId: consumerOptions.groupId,
          topic: config.topic,
          earliest: true,
        });
        await adm.disconnect();
      }

      node.consumer = node.client.consumer(consumerOptions);
      node.status({ fill: "yellow", shape: "dot", text: "Starting" });

      node.connect = function (event: ConnectEvent) {
        node.lastMsg = new Date().getTime();
        node.status({ fill: "green", shape: "dot", text: "Ready" });
      };
      node.disconnect = function (event: DisconnectEvent) {
        node.status({ fill: "red", shape: "dot", text: "Disconnected" });
      };
      node.timeout = function (event: RequestTimeoutEvent) {
        node.status({ fill: "red", shape: "dot", text: "Timeout" });
      };

      node.message = function (topic: string, partition: number, message: any) {
        node.lastMsg = new Date().getTime();
        let payload: Payload = {
          topic,
          partition,
          payload: message,
        };
        payload.payload.key = message.key ? message.key.toString() : null;
        //payload.payload.value = message.value.toString();
        //node.consumer.on(node.consumer.events.CONNECT, )
        for (const [key, value] of Object.entries(payload.payload.headers)) {
          payload.payload.headers[key] = value.toString();
        }
        //payload.payload.value = JSON.parse(payload.payload.value);
        node.send(payload);
        node.status({ fill: "green", shape: "dot", text: "Reading" });
      };

      function checkLastEvent() {
        if (node.lastMessage != null) {
          const diff = new Date().getTime() - node.lastMessage;
          if (diff > 10000) {
            node.status({ fill: "yellow", shape: "dot", text: "Idle" });
          }
        }
      }

      node.idleInterval = setInterval(checkLastEvent, 2000);

      node.consumer.on(node.consumer.events.CONNECT, node.connect);
      node.consumer.on(node.consumer.events.DISCONNECT, node.disconnect);
      node.consumer.on(node.consumer.events.REQUEST_TIMEOUT, node.timeout);

      await node.consumer.connect();
      node.status({ fill: "green", shape: "dot", text: "connected" });
      await node.consumer.subscribe(subsOptions);

      runOptions.eachMessage = async ({ topic, partition, message }) => {
        node.message(topic, partition, message);
      };
      await node.consumer.run(runOptions);
    };
    node.start().catch((err) => {
      node.error(err);
    });
    node.on("close", function (done) {
      node.consumer
        .disconnect()
        .then(() => {
          node.status({});
          clearInterval(node.idleInterval);
          done();
        })
        .catch((e) => {
          node.error(e);
        });
    });
  }
  RED.nodes.registerType("kafka-consumer", KafkaConsumerConstructor);
};

export = KafkaConsumer;
