import { Bytes, Checksum256 } from '@greymass/eosio';
import rb from "@consento/sync-randombytes";

function randomBytes(bytes: number): Uint8Array {

    return rb(new Uint8Array(bytes));
}
function randomString(bytes: number): string {
    return decodeHex(new Bytes(randomBytes(bytes * 2)).toString("hex"));
}

function sha256(digest: string): string {
    return Checksum256.hash(Bytes.from(encodeHex(digest), "hex")).toString();
}

function encodeHex(str: string): string {
    return str.split("")
        .map(c => c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("");
}

function decodeHex(hex: string): string {
    return hex.split(/(\w\w)/g)
        .filter(p => !!p)
        .map(c => String.fromCharCode(parseInt(c, 16)))
        .join("")
}


// function Utf8ArrayToStr(array: Uint8Array
// ): string {
//     var out, i, len, c;
//     var char2, char3;

//     out = "";
//     len = array.length;
//     i = 0;
//     while (i < len) {
//         c = array[i++];
//         switch (c >> 4) {
//             case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
//                 // 0xxxxxxx
//                 out += String.fromCharCode(c);
//                 break;
//             case 12: case 13:
//                 // 110x xxxx   10xx xxxx
//                 char2 = array[i++];
//                 out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
//                 break;
//             case 14:
//                 // 1110 xxxx  10xx xxxx  10xx xxxx
//                 char2 = array[i++];
//                 char3 = array[i++];
//                 out += String.fromCharCode(((c & 0x0F) << 12) |
//                     ((char2 & 0x3F) << 6) |
//                     ((char3 & 0x3F) << 0));
//                 break;
//         }
//     }

//     return out;
// }

export { randomString, randomBytes, sha256, decodeHex, encodeHex };