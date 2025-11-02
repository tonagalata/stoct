export type OfferPayload = { sdp: string };
export type AnswerPayload = { sdp: string };

export async function createSenderOffer(): Promise<{ offer: OfferPayload, pc: RTCPeerConnection, channel: RTCDataChannel }> {
  const pc = new RTCPeerConnection();
  const channel = pc.createDataChannel('vault', { negotiated: false });
  const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
  return { offer: { sdp: offer.sdp! }, pc, channel };
}

export async function acceptOfferAndAnswer(offer: OfferPayload, onData: (chunk: ArrayBuffer) => void): Promise<{ answer: AnswerPayload, pc: RTCPeerConnection }> {
  const pc = new RTCPeerConnection();
  pc.ondatachannel = ev => {
    const ch = ev.channel;
    ch.binaryType = 'arraybuffer';
    ch.onmessage = e => onData(e.data as ArrayBuffer);
  };
  await pc.setRemoteDescription({ type:'offer', sdp: offer.sdp });
  const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
  return { answer: { sdp: answer.sdp! }, pc };
}

export async function completeSender(pc: RTCPeerConnection, answer: AnswerPayload) {
  await pc.setRemoteDescription({ type:'answer', sdp: answer.sdp });
}

export async function sendInChunks(channel: RTCDataChannel, u8: Uint8Array, chunkSize=64*1024, onProgress?: (sent:number,total:number)=>void) {
  let offset = 0;
  while (offset < u8.length) {
    const end = Math.min(offset + chunkSize, u8.length);
    channel.send(u8.slice(offset, end));
    offset = end;
    onProgress?.(offset, u8.length);
    await new Promise(r => setTimeout(r, 0));
  }
}
