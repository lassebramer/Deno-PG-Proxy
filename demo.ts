import { findIndex } from "https://deno.land/std@0.59.0/bytes/mod.ts";


const listener = Deno.listen({ port: 6666 });
console.log("listening on 0.0.0.0:6666");

const ProtocolVersionNumber = 196608 // 3.0;

for await (const conn of listener) {
    console.log("New connection!")


    // By not awaiting this function, we enable them to run in parallel
    proxyDbConnection(conn);

}

function handleStartUpMessage(msg: Uint8Array, count:number): Map<string,string> {
    const parameters = new Map<string,string>(); // Init map to store parameters from pg StartupMessage https://www.postgresql.org/docs/current/protocol-message-formats.html#PROTOCOL-MESSAGE-FORMATS-STARTUPMESSAGE
    let pointer = 8; //Pointer to keep track of where we read from the byte array
    const seperator = new Uint8Array([0]) // Used to split msg at zeroes as the denote seperators in pg StartupMessage
    if ((msg.length) < 8){
        throw new TypeError("Invalid Message Format: Startup Message is too short");
    }
    while (true){ //Iterate over msg until we reach end
        let idx = findIndex(msg.subarray(pointer,count),seperator) //Index of next seperator(0)
        const key = new TextDecoder().decode(msg.subarray(pointer,idx+pointer)); //Key or name of the parameter
        pointer += idx + 1 // Pointer is updated to after the key + the seperator(0)
        idx = findIndex(msg.subarray(pointer,count),seperator) //Index of next seperator(0)
        const value = new TextDecoder().decode(msg.subarray(pointer,idx+pointer)); //Value of the parameter
        parameters.set(key,value) // Paramerter is added to the Map
        pointer += idx + 1 // Pointer is updated to after the value + the seperator(0)

        // Startup message should end on a 0
        if (pointer == count-1){
            if (msg[pointer] != 0){
                throw new TypeError("Invalid Message Format: Startup Message should end with 0");
                }
            return parameters
            }
        }
    }



async function handleIncoming(incomingConn: Deno.Conn, outgoingConn: Deno.Conn) {
    console.log("Starting to proxy incoming stream")
    const buffer = new Uint8Array(1024);
    while (true) {
        const count = await incomingConn.read(buffer);
        if (!count) {
            console.log("Incoming connection closed!!!");
            break;
        } else {
            // pg StartupMessage is identified by bits 32 through 64 being a big-endian encoding of the ProtocolVersionNumber
            // Current version is 3.0 and is represented as [0,3,0,0] which is equal to 196608 in unsigned integer.
            const dataView = new DataView(buffer.buffer); // Typescript DataVien to convert identifier from big-endian
            const identifier = dataView.getInt32(4, false); // 'false' indicates big-endian
            const message = buffer.subarray(0, count);

            if (identifier == ProtocolVersionNumber){ // check if bits 32 through 64 is the ProtocolVersionNumber which indicates StartupMessage
                const parameters = handleStartUpMessage(message,count)
                console.log(parameters)
            }
            
            await outgoingConn.write(message);
        }
    }
}


async function handleOutgoing(incomingConn: Deno.Conn, outgoingConn: Deno.Conn) {
    console.log("Starting to proxy outgoing stream")
    const buffer = new Uint8Array(1024);
    while (true) {
        const count = await outgoingConn.read(buffer);
        if (!count) {
            console.log("Outgoing connection closed!!!");
            break;
        } else {
            const message = buffer.subarray(0, count);
            await incomingConn.write(message);
        }
    }
}

async function proxyDbConnection(incomingConn: Deno.Conn) {
    console.log(`${(incomingConn.localAddr as Deno.NetAddr).hostname} :: ${ (incomingConn.remoteAddr as Deno.NetAddr).hostname }`)

const outgoingConn = await Deno.connect({ port: 5432 })



handleIncoming(incomingConn, outgoingConn)
handleOutgoing(incomingConn, outgoingConn)

}


