import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  // Simple in-memory fallback for refresh token session management in case Redis is not configured
  private activeSessions = new Map<string, Set<string>>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if username already exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException('Username is already taken');
    }

    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Atomically create User, Profile, and Wallet inside a Prisma Transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          role: 'USER',
          status: 'ACTIVE',
        },
      });

      await tx.userProfile.create({
        data: {
          userId: createdUser.id,
          displayName: dto.displayName,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          bio: dto.bio,
        },
      });

      await tx.wallet.create({
        data: {
          userId: createdUser.id,
          coinBalance: 0,
          earningBalance: 0,
        },
      });

      return createdUser;
    });

    const tokens = await this.generateTokens(user.id, user.username, user.role);
    await this.whitelistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Find user by username or email
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.identity },
          { email: dto.identity },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    // Check password hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Account access denied. Status: ${user.status.toLowerCase()}`);
    }

    const tokens = await this.generateTokens(user.id, user.username, user.role);
    await this.whitelistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const userId = payload.sub;
      const isWhitelisted = this.isRefreshTokenWhitelisted(userId, refreshToken);
      if (!isWhitelisted) {
        // Token reuse attempt detected. Invalidate all sessions for extra security!
        this.revokeAllRefreshTokens(userId);
        throw new UnauthorizedException('Access token refresh session expired');
      }

      // Invalidate the old refresh token (rotation)
      this.invalidateRefreshToken(userId, refreshToken);

      // Query user status
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User account is suspended or no longer active');
      }

      // Generate new rotating token set
      const tokens = await this.generateTokens(user.id, user.username, user.role);
      await this.whitelistRefreshToken(userId, tokens.refreshToken);

      return tokens;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, refreshToken: string) {
    this.invalidateRefreshToken(userId, refreshToken);
    return { success: true, message: 'Logged out successfully' };
  }

  // ==========================================
  // TOKEN HELPER METHODS
  // ==========================================

  private async generateTokens(userId: string, username: string, role: string) {
    const payload = { sub: userId, username, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async whitelistRefreshToken(userId: string, token: string) {
    if (!this.activeSessions.has(userId)) {
      this.activeSessions.set(userId, new Set<string>());
    }
    this.activeSessions.get(userId)?.add(token);
  }

  private isRefreshTokenWhitelisted(userId: string, token: string): boolean {
    return this.activeSessions.get(userId)?.has(token) ?? false;
  }

  private invalidateRefreshToken(userId: string, token: string) {
    this.activeSessions.get(userId)?.delete(token);
  }

  private revokeAllRefreshTokens(userId: string) {
    this.activeSessions.delete(userId);
  }
}
