// Achievement badge definitions and unlock logic

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: "workout" | "streak" | "social" | "milestone";
  requirement: { type: string; value: number };
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const BADGES: Badge[] = [
  // Workout milestones
  { id: "first_workout", name: "First Rep", description: "Complete your first workout", icon: "💪", category: "workout", requirement: { type: "workouts", value: 1 }, rarity: "common" },
  { id: "10_workouts", name: "Consistent", description: "Complete 10 workouts", icon: "🏋️", category: "workout", requirement: { type: "workouts", value: 10 }, rarity: "common" },
  { id: "50_workouts", name: "Dedicated", description: "Complete 50 workouts", icon: "⚡", category: "workout", requirement: { type: "workouts", value: 50 }, rarity: "rare" },
  { id: "100_workouts", name: "Century Club", description: "Complete 100 workouts", icon: "🔥", category: "workout", requirement: { type: "workouts", value: 100 }, rarity: "epic" },
  { id: "500_workouts", name: "Iron Will", description: "Complete 500 workouts", icon: "🏆", category: "workout", requirement: { type: "workouts", value: 500 }, rarity: "legendary" },

  // Streak badges
  { id: "3_day_streak", name: "Getting Started", description: "Maintain a 3-day workout streak", icon: "🔥", category: "streak", requirement: { type: "streak", value: 3 }, rarity: "common" },
  { id: "7_day_streak", name: "One Week Warrior", description: "Maintain a 7-day workout streak", icon: "⭐", category: "streak", requirement: { type: "streak", value: 7 }, rarity: "common" },
  { id: "14_day_streak", name: "Two Week Titan", description: "Maintain a 14-day workout streak", icon: "💎", category: "streak", requirement: { type: "streak", value: 14 }, rarity: "rare" },
  { id: "30_day_streak", name: "Monthly Monster", description: "Maintain a 30-day workout streak", icon: "👑", category: "streak", requirement: { type: "streak", value: 30 }, rarity: "epic" },
  { id: "100_day_streak", name: "Unstoppable", description: "Maintain a 100-day workout streak", icon: "🌟", category: "streak", requirement: { type: "streak", value: 100 }, rarity: "legendary" },

  // Social badges
  { id: "first_post", name: "Voice Found", description: "Create your first post", icon: "📝", category: "social", requirement: { type: "posts", value: 1 }, rarity: "common" },
  { id: "10_posts", name: "Content Creator", description: "Create 10 posts", icon: "📸", category: "social", requirement: { type: "posts", value: 10 }, rarity: "rare" },
  { id: "first_friend", name: "Social Butterfly", description: "Make your first friend", icon: "🤝", category: "social", requirement: { type: "friends", value: 1 }, rarity: "common" },
  { id: "10_friends", name: "Squad Leader", description: "Have 10 friends", icon: "👥", category: "social", requirement: { type: "friends", value: 10 }, rarity: "rare" },
  { id: "community_joined", name: "Team Player", description: "Join a community", icon: "🏠", category: "social", requirement: { type: "communities", value: 1 }, rarity: "common" },

  // Milestone badges
  { id: "pr_unlocked", name: "PR Breaker", description: "Set your first Personal Record", icon: "🎯", category: "milestone", requirement: { type: "prs", value: 1 }, rarity: "rare" },
  { id: "5_prs", name: "Record Machine", description: "Set 5 Personal Records", icon: "📈", category: "milestone", requirement: { type: "prs", value: 5 }, rarity: "epic" },
  { id: "challenge_joined", name: "Challenger", description: "Join your first challenge", icon: "⚔️", category: "milestone", requirement: { type: "challenges", value: 1 }, rarity: "common" },
  { id: "progress_photo", name: "Documenter", description: "Upload your first progress photo", icon: "📷", category: "milestone", requirement: { type: "progress_photos", value: 1 }, rarity: "common" },
  { id: "body_transformer", name: "Transformer", description: "Upload 10 progress photos", icon: "🦋", category: "milestone", requirement: { type: "progress_photos", value: 10 }, rarity: "epic" },
];

export interface UserBadgeData {
  unlockedBadges: string[]; // badge IDs
  stats: {
    workouts: number;
    streak: number;
    longestStreak: number;
    posts: number;
    friends: number;
    communities: number;
    prs: number;
    challenges: number;
    progress_photos: number;
  };
}

export function checkNewBadges(data: UserBadgeData): Badge[] {
  const newBadges: Badge[] = [];

  for (const badge of BADGES) {
    if (data.unlockedBadges.includes(badge.id)) continue;

    const { type, value } = badge.requirement;
    let stat = 0;

    switch (type) {
      case "workouts": stat = data.stats.workouts; break;
      case "streak": stat = Math.max(data.stats.streak, data.stats.longestStreak); break;
      case "posts": stat = data.stats.posts; break;
      case "friends": stat = data.stats.friends; break;
      case "communities": stat = data.stats.communities; break;
      case "prs": stat = data.stats.prs; break;
      case "challenges": stat = data.stats.challenges; break;
      case "progress_photos": stat = data.stats.progress_photos; break;
    }

    if (stat >= value) {
      newBadges.push(badge);
    }
  }

  return newBadges;
}

export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id);
}

export const RARITY_CONFIG = {
  common: { color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20", label: "Common" },
  rare: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Rare" },
  epic: { color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", label: "Epic" },
  legendary: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", label: "Legendary" },
};
