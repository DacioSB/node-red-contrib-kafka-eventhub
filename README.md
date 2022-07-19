# node-red-contrib-kafka-eventhub

This plugin was made with the objective of producing messages through two very famous queuing systems: Kafka and EventHubs.

Kafka nodes were created based on the kafkajs client and EventHubs nodes were created with the official Azure client.

- KafkaJS references: https://kafka.js.org/
- EventHubs references: https://github.com/Azure/azure-sdk-for-js
- How to run locally: https://hackmd.io/@b7bzaGLrTZmy3DQcHLICug/S1q45V2s9

## Installation

`npm install node-red-contrib-kafka-eventhub`

## Parameters

### Kafka

#### Producer

* Name: A name for the producer.
* Connection: The connection configuration to enable the producer (required).
* Topic: The topic to send the messages to (required).
* Acks: The number of acknowledgments the producer requires the leader to have received before considering a request complete.
* Key: The key to use for the message.
* Partition: The partition to send the message to.

#### Consumer

* Name: A name for the consumer.
* Connection: The connection configuration to enable the consumer (required).
* Topic: The topic to consume the messages from (required).
* Consumer Group (group.id): The consumer group to consume the messages from.
* Clear Offsets: If set to true, the consumer will clear the offsets for the topic and group.
* From beginning: If set to true, the consumer will start from the beginning.

#### Connector

* Name: A name for the connector.
* Broker: The broker to connect to (required).
* UserID: ID of client to be connected to Kafka Cluster.
* Auth:
  * NONE
  * PLAIN + Username + Password
  * SASL(with 3 mechanisms) + Username + Password
* Use SSL: If set to true, the connector will use SSL.

### EventHubs

#### Producer

* Name: A name for the producer.
* Connection String: The connection string to enable the producer (required).
* EventHub-Name: The name of the event hub to send the messages to (required).
* Retries: The number of retries to send the message (default is 3).
* Partition Key: The partition key to use for the message.

#### Consumer

* Name: A name for the consumer.
* EventHub-Name: The name of the event hub to consume the messages from (required).
* Connection String: The connection string to enable the consumer (required).
* Consumer Group: The consumer group to consume the messages from (required).
* Storage Account Connection String: The connection string to enable the storage account.
* Container name: The name of the container to store the messages.

### In msg.*

* msg.topic
* msg.key
* msg.partition




