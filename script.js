const record = document.querySelector("button");
const chunks = [];
let localStream;
let context;
let source;
let worklet;

record.onclick = () => {
  if (record.innerText === "Record") {
    // get permission and start recording
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(startRecording);
  } else {
    // stop recording
    stopRecording(localStream);
  }
};

async function startRecording(stream) {
  localStream = stream;
  context = new AudioContext();
  source = context.createMediaStreamSource(stream);

  await context.audioWorklet.addModule("processor.js");
  worklet = new AudioWorkletNode(context, "worklet-processor");

  worklet.port.onmessage = (e) => {
    if (e.data.eventType === "data") {
      chunks.push(e.data.audioBuffer);
    }
  };

  source.connect(worklet);
  worklet.connect(context.destination);

  record.innerText = "Stop";
  record.style.background = "red";
}

function stopRecording(stream) {
  stream.getTracks().forEach((track) => track.stop());
  source.disconnect();
  worklet.disconnect();

  const wavRawData = [getWAVHeader(), ...chunks];
  const blob = new Blob(wavRawData, { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  chunks.splice(0);

  const fileName = `${new Date().toLocaleTimeString()}.wav`;
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.innerText = fileName;

  const li = document.createElement("li");
  li.appendChild(link);

  const fileList = document.querySelector("ul");
  fileList.appendChild(li);

  record.innerText = "Record";
  record.style.background = "";
}

function getWAVHeader() {
  const BYTES_PER_SAMPLE = Int16Array.BYTES_PER_ELEMENT;
  const channel = 1;
  const sampleRate = context.sampleRate;

  const dataLength = chunks.reduce((acc, cur) => acc + cur.byteLength, 0);
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  writeString(view, 0, "RIFF"); // RIFF identifier 'RIFF'
  view.setUint32(4, 36 + dataLength, true); // file length minus RIFF identifier length and file description length
  writeString(view, 8, "WAVE"); // RIFF type 'WAVE'
  writeString(view, 12, "fmt "); // format chunk identifier 'fmt '
  view.setUint32(16, 16, true); // format chunk length
  view.setUint16(20, 1, true); // sample format (raw)
  view.setUint16(22, channel, true); // channel count
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE * channel, true); // byte rate (sample rate * block align)
  view.setUint16(32, BYTES_PER_SAMPLE * channel, true); // block align (channel count * bytes per sample)
  view.setUint16(34, 8 * BYTES_PER_SAMPLE, true); // bits per sample
  writeString(view, 36, "data"); // data chunk identifier 'data'
  view.setUint32(40, dataLength, true); // data chunk length

  return header;
}

function writeString(dataView, offset, string) {
  for (let i = 0; i < string.length; i++) {
    dataView.setUint8(offset + i, string.charCodeAt(i));
  }
}
