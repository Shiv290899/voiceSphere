import { Controller, Post, Delete, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Social Feed')
@Controller('posts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new social post' })
  @ApiResponse({ status: 201, description: 'Post created successfully.' })
  create(@GetUser('id') userId: string, @Body() dto: CreatePostDto) {
    return this.postsService.create(userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a social post' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Permission denied.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  delete(
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @Param('id') postId: string,
  ) {
    return this.postsService.delete(userId, role, postId);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Retrieve timeline feed for current user' })
  @ApiResponse({ status: 200, description: 'Return timeline feed.' })
  getFeed(
    @GetUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.postsService.getFeed(userId, pageNum, limitNum);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like a post' })
  @ApiResponse({ status: 201, description: 'Liked successfully.' })
  @ApiResponse({ status: 409, description: 'Already liked.' })
  like(@GetUser('id') userId: string, @Param('id') postId: string) {
    return this.postsService.like(userId, postId);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiResponse({ status: 200, description: 'Unliked successfully.' })
  @ApiResponse({ status: 404, description: 'Like relationship not found.' })
  unlike(@GetUser('id') userId: string, @Param('id') postId: string) {
    return this.postsService.unlike(userId, postId);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiResponse({ status: 201, description: 'Comment added successfully.' })
  addComment(
    @GetUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.addComment(userId, postId, dto);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment from a post' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Permission denied.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  deleteComment(
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @Param('commentId') commentId: string,
  ) {
    return this.postsService.deleteComment(userId, role, commentId);
  }
}
