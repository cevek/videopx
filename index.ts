"use strict";
import {writeFileSync} from "fs";


let k = 0;
let arr = new Buffer(100000);
arr.fill(0);
let arrK = 0;
process.stdin.on('readable', () => {
    const chunk = process.stdin.read() as Buffer;
    let offset = 0;
    if (chunk !== null) {
        if (chunk.length % 58 !== 0) {
            console.log('incorrect chunk size', k, chunk.length);
            return;
        }
        while (offset < chunk.length) {
            const header = chunk.readInt16LE(offset);
            if (header == 19778) {
                const red = chunk.readInt8(offset + 56);
                const green = chunk.readInt8(offset + 55);
                const blue = chunk.readInt8(offset + 54);
                arr[arrK++] = red;
                arr[arrK++] = green;
                arr[arrK++] = blue;
                // const color = red << 16 & green << 6 & blue;
            } else {
                console.log('chunk is not bmp', k, chunk.readInt16LE(offset));
            }
            offset += 58;
        }
    }
    k++;
});

process.stdin.on('end', () => {
    console.log('done');
    writeFileSync('data.dat', arr);
});
