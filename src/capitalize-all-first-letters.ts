import { Node, NodeDef, NodeInitializer, NodeMessage } from "node-red";


// his is the object that represente the node
// The decision of make this global is to better writer functions
let NODE: Node;

// This function is registered below ( NODE.on('input', nodeOnInput) )
// to be the event listener of a input message.
function nodeOnInput(msg: NodeMessage) {
    /**
     * Here, you will construct all code to treat the input message,
     * construct the message to output, and output it by NODE.send(msg)
     */
    NODE.send(msg);
}

const capitalize_all_first_letters: NodeInitializer = function (RED) {
    function CapitalizeAllFirstLetters(config: NodeDef) {
        RED.nodes.createNode(this, config)
        NODE = this
        NODE.on('input', nodeOnInput)
    }
    RED.nodes.registerType("capitalize-all-first-letters", CapitalizeAllFirstLetters)
}
export = capitalize_all_first_letters