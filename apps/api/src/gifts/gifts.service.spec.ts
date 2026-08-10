import { Test, TestingModule } from '@nestjs/testing';
import { GiftsService } from './gifts.service';
import { PrismaService } from '../prisma.service';
import { ChatGateway } from '../chat/chat.gateway';

describe('GiftsService', () => {
  let service: GiftsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    gift: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    block: {
      findFirst: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    giftTransaction: {
      create: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  const mockChatGateway = {
    sendToConversation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GiftsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    }).compile();

    service = module.get<GiftsService>(GiftsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
