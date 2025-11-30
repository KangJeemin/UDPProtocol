import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    MessageBody,
  } from '@nestjs/websockets';
  import { Server } from 'socket.io';
  import { MediasoupService } from './mediasoup.service';
  
  @WebSocketGateway({ cors: true })
  export class MediasoupGateway {
    @WebSocketServer() server: Server;
  
    constructor(private mediasoupService: MediasoupService) {}
  
    // rtpCapabilities 보내기
    @SubscribeMessage('getRtpCapabilities')
    getRtpCapabilities() {
      return this.mediasoupService.getRouterRtpCapabilities();
    }
  
    // Send Transport 생성
    @SubscribeMessage('createSendTransport')
    async createSendTransport() {
      return await this.mediasoupService.createWebRtcTransport();
    }
  
    // Recv Transport 생성
    @SubscribeMessage('createRecvTransport')
    async createRecvTransport() {
      return await this.mediasoupService.createWebRtcTransport();
    }
  
    // Transport 연결
    @SubscribeMessage('connectTransport')
    async connectTransport(
      @MessageBody() data: any
    ) {
      const { transport, dtlsParameters } = data;
      await this.mediasoupService.connectTransport(transport, dtlsParameters);
      return true;
    }
  
    // Producer 생성
    @SubscribeMessage('produce')
    async produce(@MessageBody() data: any) {
      const { transport, rtpParameters } = data;
      const producer = await this.mediasoupService.createProducer(transport, rtpParameters);
  
      return { id: producer.id };
    }
  
    // Consumer 생성
    @SubscribeMessage('consume')
    async consume(@MessageBody() data: any) {
      const { transport, producerId } = data;
  
      const consumer = await this.mediasoupService.createConsumer(transport, {
        id: producerId,
      });
  
      return {
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
    }
  }
  