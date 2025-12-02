import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MediasoupService } from './mediasoup/mediasoup.service';
import { MediasoupModule } from './mediasoup/mediasoup.module';

@Module({
  imports: [MediasoupModule],
  controllers: [AppController],
  providers: [AppService, MediasoupService],
})
export class AppModule {}
