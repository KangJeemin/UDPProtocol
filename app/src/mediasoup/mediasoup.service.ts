import { Injectable, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';

@Injectable()
export class MediasoupService implements OnModuleInit {
  private transports: Map<string, mediasoup.types.WebRtcTransport> = new Map();
  private producers: Map<string, mediasoup.types.Producer> = new Map();
  private worker: mediasoup.types.Worker;
  private router: mediasoup.types.Router;
  private audioLevelObserver: mediasoup.types.AudioLevelObserver;

  async onModuleInit() {
    await this.createWorker();
    await this.createRouter();
  }

  // Worker 생성
  private async createWorker() {
    this.worker = await mediasoup.createWorker({
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    });

    console.log('Mediasoup Worker created');
  }

  // Router 생성 (Audio만 지원)
  private async createRouter() {
    const audioCodec: mediasoup.types.RtpCodecCapability = {
      kind: 'audio',
      preferredPayloadType: 100,
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
    };

    this.router = await this.worker.createRouter({
      mediaCodecs: [audioCodec],
    });

    // AudioLevelObserver 생성
    this.audioLevelObserver = await this.router.createAudioLevelObserver({
      maxEntries: 1,
      threshold: -80,
      interval: 800,
    });

    this.audioLevelObserver.on('volumes', (volumes) => {
      const { producer, volume } = volumes[0];
      console.log(`Audio Level (Producer ${producer.id}): ${volume} dB`);
    });

    this.audioLevelObserver.on('silence', () => {
      // console.log('Audio Silence');
    });

    console.log('Mediasoup Router created');
  }

  getRouterRtpCapabilities() {
    return this.router.rtpCapabilities;
  }

  // WebRTC Transport 생성
  async createWebRtcTransport() {
    const transport = await this.router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }], // 로컬 개발용 IP 설정
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    this.transports.set(transport.id, transport);

    return {
      transport,
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      },
    };
  }

  async connectTransport(transportId: string, dtlsParameters: any) {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error(`Transport with id "${transportId}" not found`);
    await transport.connect({ dtlsParameters });
  }

  async createProducer(transportId: string, kind: mediasoup.types.MediaKind, rtpParameters: mediasoup.types.RtpParameters) {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error(`Transport with id "${transportId}" not found`);

    const producer = await transport.produce({ kind, rtpParameters });
    this.producers.set(producer.id, producer);

    console.log(`Producer created: ${producer.id}, kind: ${producer.kind}`);

    if (kind === 'audio') {
      await this.audioLevelObserver.addProducer({ producerId: producer.id });
    }

    producer.on('transportclose', () => {
      console.log('Producer transport closed');
      this.producers.delete(producer.id);
    });

    producer.on('score', (score) => {
      console.log(`Producer score:`, score);
    });

    return producer;
  }

  async createConsumer(transportId: string, producerId: string, rtpCapabilities: mediasoup.types.RtpCapabilities) {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error(`Transport with id "${transportId}" not found`);

    const producer = this.producers.get(producerId);
    if (!producer) throw new Error(`Producer with id "${producerId}" not found`);

    if (!this.router.canConsume({ producerId: producer.id, rtpCapabilities })) {
      throw new Error('Cannot consume');
    }

    const consumer = await transport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: false,
    });

    return consumer;
  }

  getProducerId() {
    if (this.producers.size === 0) {
      return null;
    }
    return this.producers.values().next().value.id;
  }
}
