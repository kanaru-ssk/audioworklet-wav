class WorkletProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [];
  }

  constructor() {
    super();
    this.audioBuffer = [];
  }

  convertToFloat32ToInt16(inputs) {
    const inputChannelData = inputs[0][0];

    const data = Int16Array.from(inputChannelData, (n) => {
      const res = n < 0 ? n * 32768 : n * 32767; // convert in range [-32768, 32767]
      return Math.max(-32768, Math.min(32767, res)); // clamp
    });

    this.audioBuffer = Int16Array.from([...this.audioBuffer, ...data]);
    if (this.audioBuffer.length >= 3200) {
      this.port.postMessage({
        eventType: "data",
        audioBuffer: this.audioBuffer,
      });
      this.audioBuffer = [];
    }
  }

  process(inputs) {
    if (inputs[0].length === 0) {
      console.error("From Convert Bits Worklet, input is null");
      return false;
    }
    this.convertToFloat32ToInt16(inputs);

    return true;
  }
}

registerProcessor("worklet-processor", WorkletProcessor);
