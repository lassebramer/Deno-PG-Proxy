const listener = Deno.listen({ port: 6666 });
console.log("listening on 0.0.0.0:6666");
for await (const conn of listener) {
    console.log("New connection!")


    // By not awaiting this function, we enable them to run in parallel
    proxyDbConnection(conn);






    // const reader = conn.readable
    // const writer = conn.writable.getWriter()

    // for await (const vals of reader.values()) {
    //     console.log(vals)
    //     await writer.write(vals)
    // }

    //   conn.readable.pipeTo(conn.writable);
}

async function handleConnection(conn: Deno.Conn) {
    const buffer = new Uint8Array(1024);
    while (true) {
        const count = await conn.read(buffer);
        if (!count) {
            console.log("Connection closed!!!");
            break;
        } else {
            const message = buffer.subarray(0, count);
            console.log(message)
            await conn.write(message);
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
            const message = buffer.subarray(0, count);
            const messageString = new TextDecoder().decode(message);
            console.log(Incoming: ${ message })
            console.log(Incoming: ${ messageString })
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
            const messageString = new TextDecoder().decode(message);
            console.log(Outgoing: ${ message })
            console.log(Outgoing: ${ messageString })
            await incomingConn.write(message);
        }
    }
}

async function proxyDbConnection(incomingConn: Deno.Conn) {
    console.log(${(incomingConn.localAddr as Deno.NetAddr).hostname} :: ${ (incomingConn.remoteAddr as Deno.NetAddr).hostname })

const outgoingConn = await Deno.connect({ port: 3306 })
// incomingConn.readable.pipeTo(outgoingConn.writable)
// outgoingConn.readable.pipeTo(incomingConn.writable)

handleIncoming(incomingConn, outgoingConn)
handleOutgoing(incomingConn, outgoingConn)


    // console.log("Starting proxied DB CONNECTION !!!")
    // const buffer = new Uint8Array(1024);
    // while(true) {
    //     const count = await incomingConn.read(buffer);
    //     if(!count) {
    //     console.log("Connection closed!!!");
    //     break;
    //     } else {
    //     const message = buffer.subarray(0, count);
    //     const messageString = new TextDecoder().decode(message);
    //     console.log(message)
    //     console.log(messageString)
    //     await outgoingConn.write(message);
    //     }
    // }
}


// handleDbConnection(dbConn)