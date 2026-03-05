import { prisma } from '../lib/prisma';

export const sortConversationPair = (user1: string, user2: string) => {
  return user1 < user2 ? [user1, user2] as const : [user2, user1] as const;
};

export const getConversationByUsers = async (user1: string, user2: string) => {
  const [userAId, userBId] = sortConversationPair(user1, user2);
  return prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
};

export const getOrCreateConversationByUsers = async (user1: string, user2: string) => {
  const [userAId, userBId] = sortConversationPair(user1, user2);
  return prisma.conversation.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId },
    update: {},
  });
};
