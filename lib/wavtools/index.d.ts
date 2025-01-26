export class WavRecorder {
  static decode(
    audioData: Blob | Float32Array | Int16Array | ArrayBuffer | number[],
    sampleRate?: number,
    fromSampleRate?: number
  ) {
    throw new Error("Method not implemented.");
  }
  constructor(options: { sampleRate: number });
  begin(): Promise<void>;
  record(callback: (data: { mono: Float32Array }) => void): Promise<void>;
  pause(): Promise<void>;
  recording: boolean;
  getFrequencies(type: string): { values: Float32Array };
  decode(
    audioData: Blob | Float32Array | Int16Array | ArrayBuffer | number[]
  ): Promise<DecodedAudioType>;
  log(): boolean;
  getSampleRate(): number;
  getStatus(): "ended" | "paused" | "recording";
  listenForDeviceChange(
    callback: (devices: MediaDeviceInfo[]) => void
  ): boolean;
  requestPermission(): Promise<boolean>;
  listDevices(): Promise<MediaDeviceInfo[]>;
  clear(): Promise<void>;
  read(): Promise<{ meanValues: Float32Array; channels: Float32Array[] }>;
  save(force?: boolean): Promise<WavPackerAudioType>;
  end(): Promise<WavPackerAudioType>;
  quit(): Promise<boolean>;
}

export class WavStreamPlayer {
  constructor(options: { sampleRate: number });
  connect(): Promise<void>;
  interrupt(): Promise<{ trackId: string; offset: number } | undefined>;
  analyser: AnalyserNode | null;
  getFrequencies(type: string): { values: Float32Array };
  add16BitPCM(arrayBuffer: ArrayBuffer, trackId?: string): Int16Array;
  getTrackSampleOffset(interrupt?: boolean): Promise<{
    trackId: string | null;
    offset: number;
    currentTime: number;
  }>;
}
