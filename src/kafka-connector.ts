import { NodeDef, NodeInitializer } from "node-red"

interface KafkaConnectorNode extends NodeDef {
  broker: string
  userId: string
  auth: "none" | "sasl"
  ssl: boolean
  saslMechanism: "plain" | "scram-sha-256" | "scram-sha-512"
  userName: string
  password: string
}

interface Options {
  broker: string
  userId: string
  sasl?: SASL
  ssl: boolean
  retry: number
}

interface SASL {
  mechanism: "plain" | "scram-sha-256" | "scram-sha-512"
  username: string
  password: string
}

const KafkaConnector: NodeInitializer = function (RED) {
  function KafkaConnectorConstructor(config: KafkaConnectorNode) {
    RED.nodes.createNode(this, config)
    let opt: Options = {
      broker: config.broker,
      userId: config.userId,
      retry: 5,
      ssl: config.auth === "sasl" ? config.ssl : false,
    }

    if (config.auth === "sasl") {
      const sasl: SASL = {
        mechanism: config.saslMechanism || "plain",
        username: config.userName,
        password: config.password,
      }
      opt.sasl = sasl
    }
    this.options = opt
  }
  RED.nodes.registerType("kafka-connector", KafkaConnectorConstructor, {
    credentials: {
      saslusername: { type: "text" },
      saslpassword: { type: "password" },
    },
  })
}

export = KafkaConnector;