import { KafkaConfig, RetryOptions, SASLOptions } from "kafkajs";
import { NodeDef, NodeInitializer, Node } from "node-red";
import { ConnectionOptions } from "tls";
// import fs
import fs from "fs";

interface KafkaConnectorNodeDef extends NodeDef {
  broker: string;
  userId: string;
  auth: "none" | "sasl" | "ssl";
  ssl: boolean;
  saslMechanism: "plain" | "scram-sha-256" | "scram-sha-512";
  tlscacert?: string;
  tlsclientcert?: string;
  tlsprivatekey?: string;
  tlspassphrase?: string;
  tlsselfsigned?: boolean;
}

interface KafkaConnectorNode extends Node {
  options: KafkaConfig;
  credentials: {
    saslusername: string;
    saslpassword: string;
  };
}

const KafkaConnector: NodeInitializer = function (RED) {
  function KafkaConnectorConstructor(this: KafkaConnectorNode, config: KafkaConnectorNodeDef) {
    RED.nodes.createNode(this, config);
    let node = this;
    const retry: RetryOptions = {
      retries: 5,
    };

    let opt: KafkaConfig = {
      brokers: [config.broker],
      clientId: config.userId,
      retry,
      ssl: config.ssl || false,
    };
    
    if (config.auth === "sasl") {
      const sasl: SASLOptions = {
        mechanism: config.saslMechanism || "plain",
        username: node.credentials.saslusername,
        password: node.credentials.saslpassword,
      };
      opt.sasl = sasl;
    }
    if (config.auth === "ssl") {
      const ssl: ConnectionOptions = {
        rejectUnauthorized: config.tlsselfsigned,
        ca: [fs.readFileSync(config.tlscacert, 'utf-8')],
        cert: fs.readFileSync(config.tlsclientcert, 'utf-8'),
        key: fs.readFileSync(config.tlsprivatekey, 'utf-8'),
        passphrase: config.tlspassphrase,
      };
      opt.ssl = ssl;
    }
    node.options = opt;

    node.on("close", function (done: any) {
      node.log("Closing connection");
      done();
    });
  }
  RED.nodes.registerType("kafka-connector", KafkaConnectorConstructor, {
    credentials: {
      saslusername: { type: "text" },
      saslpassword: { type: "password" },
    }
  });
};

export = KafkaConnector;
