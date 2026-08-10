import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.giftTransaction.deleteMany({});
  await prisma.withdrawal.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.postMedia.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversationMember.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.roomInvitation.deleteMany({});
  await prisma.roomMember.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.voiceRoom.deleteMany({});
  await prisma.block.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.userProfile.deleteMany({});
  await prisma.gift.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding Virtual Gifts...');
  const giftsData = [
    { name: 'Rose', coinCost: 1, description: 'A single red rose', iconUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=128&h=128&q=80' },
    { name: 'Heart', coinCost: 10, description: 'Love heart', iconUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=128&h=128&q=80' },
    { name: 'Ice Cream', coinCost: 25, description: 'Tasty gelato cone', iconUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=128&h=128&q=80' },
    { name: 'Microphone', coinCost: 50, description: 'Golden mic', iconUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd6a?auto=format&fit=crop&w=128&h=128&q=80' },
    { name: 'Crown', coinCost: 100, description: 'Royal crown', iconUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=128&h=128&q=80' },
    { name: 'Diamond', coinCost: 250, description: 'Shiny cut gem', iconUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=128&h=128&q=80' },
    { name: 'DJ Console', coinCost: 500, description: 'Neon DJ booth', iconUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=128&h=128&q=80' },
    { name: 'Sports Car', coinCost: 1000, description: 'Luxury sports car', iconUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=128&h=128&q=80' },
    { name: 'Castle', coinCost: 2500, description: 'Medieval castle', iconUrl: 'https://images.unsplash.com/photo-1508849789987-4e5333c12b78?auto=format&fit=crop&w=128&h=128&q=80' },
    { name: 'Universe', coinCost: 5000, description: 'The cosmic galaxy', iconUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=128&h=128&q=80' },
  ];

  const gifts: any[] = [];
  for (const gift of giftsData) {
    const createdGift = await prisma.gift.create({ data: gift });
    gifts.push(createdGift);
  }
  console.log(`Seeded ${gifts.length} gifts.`);

  console.log('Hashing passwords...');
  const passwordHash = await bcrypt.hash('Password123', 10);

  // 1. Super Admin
  console.log('Seeding Super Admin...');
  const superAdmin = await prisma.user.create({
    data: {
      username: 'superadmin',
      email: 'superadmin@voicesphere.com',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      profile: {
        create: {
          displayName: 'System Overlord',
          bio: 'Root Administrator of VoiceSphere.',
          level: 99,
          experiencePoints: 99999,
        },
      },
      wallet: {
        create: {
          coinBalance: 1000000,
          earningBalance: 0,
        },
      },
    },
  });

  // 2. Admins
  console.log('Seeding Admins...');
  const admins: any[] = [];
  for (let i = 1; i <= 2; i++) {
    const admin = await prisma.user.create({
      data: {
        username: `admin${i}`,
        email: `admin${i}@voicesphere.com`,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        profile: {
          create: {
            displayName: `Admin Officer ${i}`,
            bio: 'Official representative of platform operation.',
            level: 50,
          },
        },
        wallet: {
          create: {
            coinBalance: 500000,
            earningBalance: 0,
          },
        },
      },
    });
    admins.push(admin);
  }

  // 3. Moderators
  console.log('Seeding Moderators...');
  const moderators: any[] = [];
  for (let i = 1; i <= 5; i++) {
    const moderator = await prisma.user.create({
      data: {
        username: `moderator${i}`,
        email: `moderator${i}@voicesphere.com`,
        passwordHash,
        role: 'MODERATOR',
        status: 'ACTIVE',
        profile: {
          create: {
            displayName: `Moderator ${i}`,
            bio: 'Content moderation lead.',
            level: 25,
          },
        },
        wallet: {
          create: {
            coinBalance: 10000,
            earningBalance: 0,
          },
        },
      },
    });
    moderators.push(moderator);
  }

  // 4. Standard Users
  console.log('Seeding 20 users...');
  const users: any[] = [];
  for (let i = 1; i <= 20; i++) {
    const user = await prisma.user.create({
      data: {
        username: `user${i}`,
        email: `user${i}@voicesphere.com`,
        passwordHash,
        role: 'USER',
        status: i === 18 ? 'SUSPENDED' : i === 19 ? 'BANNED' : 'ACTIVE',
        profile: {
          create: {
            displayName: `Star Voice ${i}`,
            gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
            bio: `Hello! I am VoiceSphere user number ${i}. Let's chat and hang out!`,
            country: i % 3 === 0 ? 'USA' : i % 3 === 1 ? 'India' : 'Canada',
            language: 'en',
            level: i * 2,
            experiencePoints: i * 150,
          },
        },
        wallet: {
          create: {
            coinBalance: i === 1 ? 5000 : 500, // user1 gets 5000 coins to test gifting
            earningBalance: i * 100, // hosts earn balance from mock streams
          },
        },
      },
    });
    users.push(user);
  }

  console.log('Seeding Follows...');
  // Let several users follow super admin and user1
  for (let i = 2; i <= 10; i++) {
    await prisma.follow.create({
      data: {
        followerId: users[i].id,
        followingId: superAdmin.id,
      },
    });
    await prisma.follow.create({
      data: {
        followerId: users[i].id,
        followingId: users[0].id, // user1
      },
    });
  }

  console.log('Seeding Voice Rooms...');
  const roomsData = [
    { title: 'Developer Lounge ☕', category: 'Tech', description: 'Discuss code, architecture, and tech trends.', maxParticipants: 30 },
    { title: 'Chill Music & Vibes 🎵', category: 'Music', description: 'Listen to background tracks and sing along.', maxParticipants: 50 },
    { title: 'Late Night Heart Talks ❤️', category: 'Social', description: 'Share secrets, stories, and make new friends.', maxParticipants: 20 },
    { title: 'VoiceSphere Intro & Q&A 🎤', category: 'Gaming', description: 'Ask questions about the VoiceSphere app.', maxParticipants: 100 },
    { title: 'E-Sports Talk Room 🎮', category: 'Gaming', description: 'Discuss live matches and strategies.', maxParticipants: 15 },
  ];

  const rooms: any[] = [];
  for (let i = 0; i < roomsData.length; i++) {
    const data = roomsData[i];
    // owner is users[i] (user1 to user5)
    const room = await prisma.voiceRoom.create({
      data: {
        ownerId: users[i].id,
        title: data.title,
        category: data.category,
        description: data.description,
        maxParticipants: data.maxParticipants,
        status: i === 4 ? 'SCHEDULED' : 'LIVE',
        startedAt: i === 4 ? null : new Date(),
        members: {
          create: [
            {
              userId: users[i].id,
              role: 'HOST',
              isSpeaking: true,
            },
          ],
        },
      },
    });
    rooms.push(room);
  }
  console.log(`Seeded ${rooms.length} voice rooms.`);

  console.log('Seeding Posts (Social Feed)...');
  const postsData = [
    'Just created my new VoiceSphere account! Hello everyone! 👋',
    'Had a wonderful voice talk today in the Tech lounge, thanks to everyone who joined!',
    'Listen to this custom track I created: https://voicesphere.s3.amazonaws.com/tracks/song1.mp3',
    'Who is up for some late night gaming? Join my room in 10 mins!',
    'Remember, a coin saved is a crown gifted. Send me some love tonight!',
    'Great updates are coming to the platform. Stay tuned! 🚀',
    'This is a private followers-only update. Shh!',
    'Checkout this beautiful sunset view from my studio.',
    'Music is the shorthand of emotion. Listening to lo-fi right now.',
    'If you are reading this, go drink some water and stretch. You matter!',
  ];

  const posts: any[] = [];
  for (let i = 0; i < postsData.length; i++) {
    // author is users[i % 5]
    const post = await prisma.post.create({
      data: {
        authorId: users[i % 5].id,
        content: postsData[i],
        visibility: i === 6 ? 'FOLLOWERS' : 'PUBLIC',
        comments: {
          create: [
            {
              authorId: users[(i + 1) % 5].id,
              content: 'Wow, this is awesome!',
            },
          ],
        },
      },
    });
    posts.push(post);

    // Add a like from another user
    await prisma.like.create({
      data: {
        userId: users[(i + 2) % 5].id,
        postId: post.id,
      },
    });
  }
  console.log(`Seeded ${posts.length} posts with likes and comments.`);

  console.log('Seeding Private Conversations...');
  // Create direct conversation between user1 (users[0]) and user2 (users[1])
  const conversation = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      members: {
        create: [
          { userId: users[0].id },
          { userId: users[1].id },
        ],
      },
      messages: {
        create: [
          { senderId: users[0].id, content: 'Hey, how is it going?' },
          { senderId: users[1].id, content: 'Pretty good! Working on VoiceSphere. You?' },
          { senderId: users[0].id, content: 'Just chilling. Let us join a room together!' },
        ],
      },
    },
  });
  console.log('Seeded direct conversation and messages.');

  console.log('Seeding Notifications...');
  for (let i = 0; i < 5; i++) {
    await prisma.notification.create({
      data: {
        userId: users[i].id,
        type: 'SYSTEM',
        title: 'Welcome to VoiceSphere!',
        body: 'Start by creating your own voice room or editing your profile.',
      },
    });
  }

  console.log('Seeding Gift & Wallet Transactions...');
  // user1 sends a gift to user2 in developer lounge (room 0)
  const gift = gifts[0]; // Rose (1 coin)
  const walletUser1 = await prisma.wallet.findUnique({ where: { userId: users[0].id } });
  const walletUser2 = await prisma.wallet.findUnique({ where: { userId: users[1].id } });

  if (walletUser1 && walletUser2) {
    // 1. Gift Transaction
    await prisma.giftTransaction.create({
      data: {
        senderId: users[0].id,
        receiverId: users[1].id,
        roomId: rooms[0].id,
        giftId: gift.id,
        quantity: 5,
        totalCoins: 5,
      },
    });

    // 2. Adjust User 1 Wallet
    await prisma.wallet.update({
      where: { userId: users[0].id },
      data: { coinBalance: walletUser1.coinBalance - 5 },
    });
    await prisma.walletTransaction.create({
      data: {
        walletId: walletUser1.id,
        userId: users[0].id,
        type: 'GIFT_SENT',
        amount: -5,
        balanceBefore: walletUser1.coinBalance,
        balanceAfter: walletUser1.coinBalance - 5,
        referenceType: 'GIFT',
        status: 'SUCCESS',
      },
    });

    // 3. Adjust User 2 Wallet
    await prisma.wallet.update({
      where: { userId: users[1].id },
      data: { earningBalance: walletUser2.earningBalance + 5 },
    });
    await prisma.walletTransaction.create({
      data: {
        walletId: walletUser2.id,
        userId: users[1].id,
        type: 'GIFT_RECEIVED',
        amount: 5,
        balanceBefore: walletUser2.earningBalance,
        balanceAfter: walletUser2.earningBalance + 5,
        referenceType: 'GIFT',
        status: 'SUCCESS',
      },
    });
  }
  console.log('Seeded gift and wallet transaction records.');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
