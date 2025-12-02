// src/mediasoup/mediasoup.gateway.ts
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MediasoupService } from './mediasoup.service';

@WebSocketGateway({ cors: true })
export class MediasoupGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly mediasoupService: MediasoupService) { }

  @SubscribeMessage('getRtpCapabilities')
  getRtpCapabilities() {
    return this.mediasoupService.getRouterRtpCapabilities();
  }

  @SubscribeMessage('createSendTransport')
  async createSendTransport(@ConnectedSocket() client: Socket) {
    const transport = await this.mediasoupService.createWebRtcTransport();
    return {
      id: transport.params.id,
      iceParameters: transport.params.iceParameters,
      iceCandidates: transport.params.iceCandidates,
      dtlsParameters: transport.params.dtlsParameters,
    };

  }

  @SubscribeMessage('createRecvTransport')
  async createRecvTransport(@ConnectedSocket() client: Socket) {
    const transport = await this.mediasoupService.createWebRtcTransport();
    return {
      id: transport.params.id,
      iceParameters: transport.params.iceParameters,
      iceCandidates: transport.params.iceCandidates,
      dtlsParameters: transport.params.dtlsParameters,
    };
  }

  @SubscribeMessage('connectTransport')
  async connectTransport(@MessageBody() data: any) {
    const { transportId, dtlsParameters } = data;
    await this.mediasoupService.connectTransport(transportId, dtlsParameters);
    return { ok: true };
  }

  @SubscribeMessage('produce')
  async produce(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const { transportId, kind, rtpParameters } = data;
    const producer = await this.mediasoupService.createProducer(transportId, kind, rtpParameters);
    return { id: producer.id };
  }

  @SubscribeMessage('consume')
  async consume(@MessageBody() data: any) {
    const { transportId, producerId, rtpCapabilities } = data;
    const consumer = await this.mediasoupService.createConsumer(transportId, producerId, rtpCapabilities);
    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }
}
