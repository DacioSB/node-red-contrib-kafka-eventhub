import { ConnectEvent, DisconnectEvent, Kafka, Message, Producer, ProducerRecord, RequestTimeoutEvent } from "kafkajs";
import { NodeDef, NodeInitializer, Node, NodeMessage } from "node-red";

interface KafkaProducerNodeDef extends NodeDef {
  topic: string;
  ack: "all" | "none" | "leader";
  partition?: number;
  key?: string;
  topicautocreation: boolean;
  client: string;
}
interface KafkaProducerNode extends Node {
  client: Kafka;
  eventOptions: ProducerRecord;
  producer: Producer;
  start: any;
  connect: (event: ConnectEvent) => void;
  ready: boolean;
  lastMessage: number;
  disconnect: (event: DisconnectEvent) => void;
  timeout: (event: RequestTimeoutEvent) => void;
  idleInterval: NodeJS.Timeout;
}

const KafkaProducer: NodeInitializer = function (RED) {
  function KafkaProducerConstructor(this: KafkaProducerNode, config: KafkaProducerNodeDef) {
    RED.nodes.createNode(this, config);
    let node = this;
    let configClient = RED.nodes.getNode(config.client) as any;
    node.client = new Kafka(configClient.options);

    if (!this.client) {
      node.error("Kafka client not found");
      console.error("Kafka client not found");
      return;
    }
    const acks = {
      all: -1,
      none: 0,
      leader: 1,
    };

    let eventOptions: ProducerRecord = {
      topic: config.topic,
      acks: acks[config.ack],
      messages: [],
    };

    node.eventOptions = eventOptions;

    node.start = async () => {
      const producer: Producer = node.client.producer();
      node.producer = producer;
      node.status({ fill: "yellow", shape: "dot", text: "Connecting" });

      node.disconnect = function (event: DisconnectEvent) {
        node.ready = false;
        node.status({ fill: "red", shape: "dot", text: "Disconnected" });
      };

      node.connect = function (event: ConnectEvent) {
        node.ready = true;
        node.lastMessage = new Date().getTime();
        node.status({ fill: "green", shape: "dot", text: "Ready" });
      };

      node.timeout = function () {
        node.status({ fill: "red", shape: "dot", text: "Timeout" });
      };

      producer.on(producer.events.CONNECT, node.connect);
      producer.on(producer.events.DISCONNECT, node.disconnect);
      producer.on(producer.events.REQUEST_TIMEOUT, node.timeout);

      await producer.connect();
    };
    node.start();

    function checkLastEvent() {
      if (node.lastMessage != null) {
        const diff = new Date().getTime() - node.lastMessage;
        if (diff > 10000) {
          node.status({ fill: "yellow", shape: "dot", text: "Idle" });
        }
      }
    }

    node.idleInterval = setInterval(checkLastEvent, 2000);

    this.on("input", function (message: NodeMessage) {
      if (node.ready) {
        if (message.payload != null) {
          // TODO: here i can allow to send msg.topic or via node, choice is made by the user
          // But now, we're ignoring it
          // the message is json or strin. if is json, convert to string
          let msgConverted: string = (
            typeof message.payload === "number" || typeof message.payload === "boolean" ? message.payload.toString() : message.payload
          ) as string;
          msgConverted = typeof message.payload === "string" ? message.payload : JSON.stringify(message.payload);
          let event: Message = {
            key: config.key || message["key"] || null,
            value: msgConverted,
            partition: config.partition || message["partition"] || null,
          };
          node.eventOptions.messages.push(event);
          node.producer
            .send(node.eventOptions)
            .then(() => {
              node.log(`Message sent to topic ${node.eventOptions.topic}`);
              node.eventOptions.messages.pop();
            })
            .catch((err) => {
              node.error("An error occurred while trying to send event to kafka cluster", err);
              node.status({ fill: "red", shape: "dot", text: "Error" });
            });

          node.lastMessage = new Date().getTime();
          node.status({ fill: "green", shape: "dot", text: "Sending" });
        }
      }
    });

    node.on("close", function (done: any) {
      node.producer
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
  RED.nodes.registerType("kafka-producer", KafkaProducerConstructor);
};

export = KafkaProducer;
