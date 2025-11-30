import { Injectable, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';

@Injectable()
export class MediasoupService implements OnModuleInit {
  private worker: mediasoup.types.Worker;
  private router: mediasoup.types.Router;

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

    console.log('Mediasoup Router created');
  }

  getRouterRtpCapabilities() {
    return this.router.rtpCapabilities;
  }

  // WebRTC Transport 생성
  async createWebRtcTransport() {
    const transport = await this.router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0',  }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

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

  async connectTransport(transport: mediasoup.types.WebRtcTransport, dtlsParameters) {
    await transport.connect({ dtlsParameters });
  }

  async createProducer(transport: mediasoup.types.WebRtcTransport, track) {
    return await transport.produce({ kind: 'audio', rtpParameters: track });
  }

  async createConsumer(transport: mediasoup.types.WebRtcTransport, producer) {
    return await transport.consume({
      producerId: producer.id,
      rtpCapabilities: this.router.rtpCapabilities,
    });
  }
}
