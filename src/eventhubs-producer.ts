import { Node, NodeDef, NodeInitializer, NodeMessage } from "node-red";

import { EventDataBatch, EventHubProducerClient, RetryOptions } from "@azure/event-hubs";
import { Policy } from "cockatiel";

interface EventHubProducerNodeDef extends NodeDef {
  connectionString: string;
  eventHubName: string;
  retries?: number;
  partitionKey?: string;
}

interface EventHubProducerNode extends Node {
  connector: EventHubProducerClient;
}

const eventHubsProducer: NodeInitializer = function (RED) {
  function EventHubsProducerConstructor(this: EventHubProducerNode, config: EventHubProducerNodeDef) {
    RED.nodes.createNode(this, config);
    let node = this;
    const retriesOpt: RetryOptions = {
      maxRetries: config.retries,
    };
    node.connector = new EventHubProducerClient(config.connectionString, config.eventHubName, {
      retryOptions: retriesOpt,
    });
    node.status({ fill: "yellow", shape: "dot", text: "Idle" });
    if (config.partitionKey === "") {
      config.partitionKey = undefined;
    }
    node.on("input", async (msg: NodeMessage) => {
      const eventBatch: void | EventDataBatch = await node.connector
        .createBatch({
          partitionKey: msg["partitionKey"] || config.partitionKey,
        })
        .catch((err) => {
          node.error(err);
          node.status({ fill: "red", shape: "dot", text: "Error" });
        });
      if (eventBatch) {
        let added: boolean;

        try {
          added = eventBatch.tryAdd({
            body: msg.payload,
          });
        } catch (error) {
          node.status({ fill: "red", shape: "dot", text: "Error trying to add an event to the batch" });
          node.error(error);
        }

        try {
          if (added) {
            node.status({ fill: "green", shape: "dot", text: "Sending" });
            node.log(`Sending event to topic ${config.eventHubName}`);
            await node.connector.sendBatch(eventBatch);
            node.log(`Sent event to topic ${config.eventHubName}`);
            node.status({ fill: "green", shape: "dot", text: "Sent" });
            node.status({ fill: "yellow", shape: "dot", text: "Idle" });
          } else {
            throw new Error("Could not add event to batch");
          }
        } catch (error) {
          node.status({ fill: "red", shape: "dot", text: "Error sending batch" });
          node.error(error);
        }

        node.on("close", () => {
          const retryPolicyOnClose = Policy.handleAll().retry().attempts(3).exponential();
          retryPolicyOnClose
            .execute(async () => {
              await node.connector.close();
            })
            .catch((error) => node.error(error));
        });
      }
    });
  }
  RED.nodes.registerType("eventhubs-producer", EventHubsProducerConstructor);
};

export = eventHubsProducer;
