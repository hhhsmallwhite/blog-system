import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Analytics — 统计分析')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Post('record/:articleId')
  @ApiOperation({ summary: '记录阅读量' })
  async recordView(@Param('articleId', ParseIntPipe) articleId: number) {
    await this.analyticsService.recordView(articleId);
    return { code: 0, message: 'success', data: null };
  }

  @Get('articles/:articleId')
  @ApiOperation({ summary: '文章统计' })
  async getArticleStats(@Param('articleId', ParseIntPipe) articleId: number) {
    const data = await this.analyticsService.getArticleStats(articleId);
    return { code: 0, message: 'success', data };
  }

  @Get('trends')
  @ApiOperation({ summary: '趋势统计' })
  async getTrends() {
    const data = await this.analyticsService.getTrends();
    return { code: 0, message: 'success', data };
  }
}
