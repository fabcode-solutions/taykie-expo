import type { Comment } from "@/types/comment.types";

export const DUMMY_COMMENTS: Comment[] = [
  {
    id: "1",
    userId: "user1",
    userName: "Sarah Johnson",
    userAvatar: "https://i.pravatar.cc/150?img=1",
    content:
      "This is exactly what I needed to hear today! Thank you for sharing this amazing post. Really appreciate your insights! 🙏",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    likes: 24,
    repliesCount: 2,
    replies: [
      {
        id: "1-1",
        userId: "user2",
        userName: "Mike Chen",
        userAvatar: "https://i.pravatar.cc/150?img=2",
        content: "I completely agree with you! This changed my perspective.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
        likes: 8,
        parentCommentId: "1",
        repliesCount: 2,
      },
    ],
  },
  {
    id: "2",
    userId: "user3",
    userName: "Emily Davis",
    userAvatar: "https://i.pravatar.cc/150?img=3",
    content:
      "Love this! Can you share more details about your experience? Would love to learn more about your journey.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hours ago
    likes: 15,
  },
  {
    id: "3",
    userId: "user4",
    userName: "James Wilson",
    userAvatar: "https://i.pravatar.cc/150?img=4",
    content:
      "Great content as always! Keep up the amazing work. Your posts always brighten my day! ✨",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
    likes: 42,
    replies: [
      {
        id: "3-1",
        userId: "user5",
        userName: "Lisa Anderson",
        userAvatar: "https://i.pravatar.cc/150?img=5",
        content: "Totally agree! This is gold! 💯",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        likes: 12,
        parentCommentId: "3",
      },
      {
        id: "3-2",
        userId: "user6",
        userName: "Tom Brown",
        userAvatar: "https://i.pravatar.cc/150?img=6",
        content: "Same here! Loving these insights.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        likes: 6,
        parentCommentId: "3",
      },
    ],
  },
  {
    id: "4",
    userId: "user7",
    userName: "Alex Martinez",
    userAvatar: "https://i.pravatar.cc/150?img=7",
    content:
      "This is so helpful! Bookmarking this for later. Thanks for sharing your knowledge with us! 📚",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    likes: 31,
  },
  {
    id: "5",
    userId: "user8",
    userName: "Rachel Green",
    userAvatar: "https://i.pravatar.cc/150?img=8",
    content: "Just what I was looking for! Your timing is perfect. This helps so much! 💪",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    likes: 7,
  },
  {
    id: "6",
    userId: "user9",
    userName: "David Lee",
    userAvatar: "https://i.pravatar.cc/150?img=9",
    content:
      "Amazing insights! I learned so much from this post. Looking forward to more content like this! 🚀",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    likes: 56,
    replies: [
      {
        id: "6-1",
        userId: "user10",
        userName: "Sophie Turner",
        userAvatar: "https://i.pravatar.cc/150?img=10",
        content: "Yes! This is exactly what we need more of.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
        likes: 15,
        parentCommentId: "6",
      },
    ],
  },
  {
    id: "7",
    userId: "user11",
    userName: "Chris Evans",
    userAvatar: "https://i.pravatar.cc/150?img=11",
    content:
      "Thanks for this! Really appreciate you taking the time to share. This is valuable content! 🙌",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    likes: 3,
  },
  {
    id: "8",
    userId: "user12",
    userName: "Jennifer White",
    userAvatar: "https://i.pravatar.cc/150?img=12",
    content: "Wow, this is incredible! Sharing with my team right now. They will love this! ❤️",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
    likes: 89,
  },
  {
    id: "9",
    userId: "user13",
    userName: "Kevin Park",
    userAvatar: "https://i.pravatar.cc/150?img=13",
    content:
      "This changed my perspective completely! Thank you for opening my eyes to this. Mind blown! 🤯",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
    likes: 18,
  },
  {
    id: "10",
    userId: "user14",
    userName: "Maria Garcia",
    userAvatar: "https://i.pravatar.cc/150?img=14",
    content: "Love this so much! Your content always delivers. Can't wait for your next post! 🌟",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), // 5 days ago
    likes: 67,
    replies: [
      {
        id: "10-1",
        userId: "user15",
        userName: "Robert Taylor",
        userAvatar: "https://i.pravatar.cc/150?img=15",
        content: "Agreed! Always high quality content here.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 100).toISOString(),
        likes: 22,
        parentCommentId: "10",
      },
    ],
  },
  {
    id: "11",
    userId: "user16",
    userName: "Anna Schmidt",
    userAvatar: "https://i.pravatar.cc/150?img=16",
    content: "Fantastic post! This is the quality content we need more of. Keep it up! 💫",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    likes: 11,
  },
  {
    id: "12",
    userId: "user17",
    userName: "Daniel Kim",
    userAvatar: "https://i.pravatar.cc/150?img=17",
    content:
      "This is pure gold! Saving this for future reference. Thank you for sharing your wisdom! 🏆",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString(), // 6 days ago
    likes: 94,
  },
];

/**
 * Get comments count including replies
 */
export const getTotalCommentsCount = (comments: Comment[]): number => {
  return comments.reduce((total, comment) => {
    return total + 1 + (comment.replies?.length || 0);
  }, 0);
};

/**
 * Get total likes for all comments
 */
export const getTotalLikesCount = (comments: Comment[]): number => {
  return comments.reduce((total, comment) => {
    const commentLikes = comment.likes || 0;
    const repliesLikes = comment.replies?.reduce((sum, reply) => sum + (reply.likes || 0), 0) || 0;
    return total + commentLikes + repliesLikes;
  }, 0);
};
