import { Module } from '@nestjs/common';
import { AssetController } from './asset.controller';
import { AssetRepository } from './asset.repository';
import { AssetService } from './asset.service';

@Module({
  controllers: [AssetController],
  providers: [AssetService, AssetRepository],
  exports: [AssetService],
})
export class AssetModule {}
