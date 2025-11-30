import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MediasoupService } from './mediasoup/mediasoup.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, MediasoupService],
})
export class AppModule {}
