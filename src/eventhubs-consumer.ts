import { Policy } from "cockatiel";
import { Node, NodeDef, NodeInitializer } from "node-red";
import { EventHubConsumerClient, latestEventPosition } from "@azure/event-hubs";
import { ContainerClient } from "@azure/storage-blob";
import { BlobCheckpointStore } from "@azure/eventhubs-checkpointstore-blob";

interface EventHubsConsumerNodeDef extends NodeDef {
  connectionString: string;
  consumerGroup: string;
  eventHubName: string;
  storageAccountCommitOffset?: string;
  containerCommitOffset?: string;
}

interface EventHubsConsumerNode extends Node {
  connector: EventHubConsumerClient;
}
const createAzureBlobContainer = async (blobContainerClient: ContainerClient) => {
  if (!(await blobContainerClient.exists())) {
    await blobContainerClient.create();
  }
};
const eventHubsConsumer: NodeInitializer = function (RED: any) {
  function EventHubsConsumerConstructor(this: EventHubsConsumerNode, config: EventHubsConsumerNodeDef) {
    RED.nodes.createNode(this, config);
    let node = this;

    const retryPolicy = Policy.handleAll().retry().exponential();

    retryPolicy.onRetry((event: { error: Error; delay: number }) => {
      if (event.error) {
        node.status({ fill: "yellow", shape: "dot", text: "Reconnecting" });
      }
    });
    const storageAccount = config.storageAccountCommitOffset;
    const container = config.containerCommitOffset;

    if (storageAccount && container) {
      const blobContainer = new ContainerClient(storageAccount, container);
      createAzureBlobContainer(blobContainer);
      const blobCheckpointStore = new BlobCheckpointStore(blobContainer);
      node.connector = new EventHubConsumerClient(config.consumerGroup, config.connectionString, config.eventHubName, blobCheckpointStore);
    } else if ((!storageAccount && container) || (storageAccount && !container)) {
      node.error("Both storage account and container are required");
    } else {
      node.connector = new EventHubConsumerClient(config.consumerGroup, config.connectionString, config.eventHubName);
    }
    node.status({ fill: "yellow", shape: "dot", text: "Idle" });
    retryPolicy.execute(async () => {
      return new Promise(async (_, rej) => {
        node.connector.subscribe(
          {
            processEvents: async (events, context) => {
              node.send({ payload: events });
              if (storageAccount && container) {
                if (events.length === 0) {
                  return;
                }
                await context.updateCheckpoint(events[events.length - 1]).catch((error) => node.error(error));
              }
            },
            processError: async (err, context) => {
              node.warn(err);
            },
          },
          {
            startPosition: latestEventPosition,
          }
        );
        node.status({ fill: "green", shape: "dot", text: "Listening" });
      });
    });

    node.on("close", () => {
      node.connector.close().catch((error) => node.error(error));
    });
  }
  RED.nodes.registerType("eventhubs-consumer", EventHubsConsumerConstructor);
};

export = eventHubsConsumer;
