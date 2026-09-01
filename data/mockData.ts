import { format, addDays, subDays } from "date-fns";
import { Task, TasksResponse, TaskStatus } from "@/types/schedule.types";

// Mock medications for variety
const MOCK_MEDICATIONS = [
  { id: "med-1", title: "Vitamin D3", emoji: "💊", dosage: "2000 IU" },
  { id: "med-2", title: "Omega-3", emoji: "🫧", dosage: "1000mg" },
  { id: "med-3", title: "B12 Drops", emoji: "💧", dosage: "100mcg" },
  { id: "med-4", title: "Magnesium", emoji: "⚡️", dosage: "400mg" },
  { id: "med-5", title: "Vitamin C", emoji: "🍊", dosage: "500mg" },
  { id: "med-6", title: "Probiotics", emoji: "🦠", dosage: "10B CFU" },
  { id: "med-7", title: "Iron", emoji: "🔧", dosage: "18mg" },
  { id: "med-8", title: "Calcium", emoji: "🦴", dosage: "600mg" },
];

const TIMES = [
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
];

/**
 * Generates a random task status based on the date
 * - Past dates: mix of taken/missed
 * - Today: mix of taken/upcoming
 * - Future dates: upcoming
 */
function generateTaskStatus(taskDate: Date): TaskStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDateOnly = new Date(taskDate);
  taskDateOnly.setHours(0, 0, 0, 0);

  if (taskDateOnly < today) {
    // Past date - 80% taken, 20% missed
    return Math.random() > 0.2 ? "taken" : "missed";
  } else if (taskDateOnly.getTime() === today.getTime()) {
    // Today - 60% taken, 40% upcoming
    return Math.random() > 0.4 ? "taken" : "upcoming";
  } else {
    // Future date - all upcoming
    return "upcoming";
  }
}

/**
 * Generates mock tasks for a date range
 */
export function generateMockTasks(startDate: Date, endDate: Date): Task[] {
  const tasks: Task[] = [];
  let taskIdCounter = 1;

  // Generate tasks for each day in the range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateString = format(currentDate, "yyyy-MM-dd");

    // Randomly select 2-5 medications for each day
    const dailyMedCount = Math.floor(Math.random() * 4) + 2;
    const selectedMeds = MOCK_MEDICATIONS.sort(() => Math.random() - 0.5).slice(0, dailyMedCount);

    selectedMeds.forEach((med, index) => {
      const time = TIMES[Math.floor(Math.random() * TIMES.length)];
      const status = generateTaskStatus(currentDate);

      tasks.push({
        id: `task-${taskIdCounter++}`,
        title: med.title,
        time: time,
        status: status,
        emoji: med.emoji,
        date: dateString,
        medicationId: med.id,
        frequency: "daily",
        dosage: med.dosage,
        strength: undefined,
        notes: Math.random() > 0.7 ? "Take with food" : undefined,
      });
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return tasks.sort((a, b) => {
    // Sort by date first, then by time
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.time.localeCompare(b.time);
  });
}

/**
 * Generates mock API response for tasks
 */
export function generateMockTasksResponse(startDate: Date, endDate: Date): TasksResponse {
  const tasks = generateMockTasks(startDate, endDate);
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "taken").length;
  const missedCount = tasks.filter((t) => t.status === "missed").length;
  const upcomingCount = tasks.filter((t) => t.status === "upcoming").length;

  return {
    success: true,
    message: "Tasks retrieved successfully",
    data: tasks,
    meta: {
      totalCount,
      completedCount,
      missedCount,
      upcomingCount,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generates mock data for the current week
 */
export function generateCurrentWeekMockData(): TasksResponse {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

  return generateMockTasksResponse(startOfWeek, endOfWeek);
}

// Initialize mock data
const twoWeeksAgo = subDays(new Date(), 14);
const nextWeek = addDays(new Date(), 7);
let mockTasks = generateMockTasks(twoWeeksAgo, nextWeek);

/**
 * Mock implementation for testing the schedule repository
 * Follows the same object pattern as the real repository
 */
export const mockScheduleRepo = {
  async getTasks(params: {
    startDate?: string;
    endDate?: string;
    date?: string;
    viewMode?: string;
  }): Promise<TasksResponse> {
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay

    let filteredTasks = [...mockTasks];

    if (params.date) {
      filteredTasks = filteredTasks.filter((task) => task.date === params.date);
    } else if (params.startDate && params.endDate) {
      filteredTasks = filteredTasks.filter(
        (task) => task.date >= params.startDate! && task.date <= params.endDate!,
      );
    }

    const totalCount = filteredTasks.length;
    const completedCount = filteredTasks.filter((t) => t.status === "taken").length;
    const missedCount = filteredTasks.filter((t) => t.status === "missed").length;
    const upcomingCount = filteredTasks.filter((t) => t.status === "upcoming").length;

    return {
      success: true,
      message: "Tasks retrieved successfully",
      data: filteredTasks,
      meta: {
        totalCount,
        completedCount,
        missedCount,
        upcomingCount,
      },
      timestamp: new Date().toISOString(),
    };
  },

  async createTask(data: any): Promise<{ success: boolean; task: Task }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: data.title,
      time: data.time,
      status: "upcoming",
      emoji: "💊",
      date: data.startDate,
      medicationId: data.medicationId,
      frequency: data.frequency,
      dosage: data.dosage,
      strength: data.strength,
      notes: data.notes,
    };

    mockTasks.push(newTask);

    return {
      success: true,
      task: newTask,
    };
  },

  async updateTaskStatus(data: {
    taskId: string;
    status: TaskStatus;
    takenAt?: string;
  }): Promise<{ success: boolean; task: Task }> {
    await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate API delay

    const taskIndex = mockTasks.findIndex((task) => task.id === data.taskId);
    if (taskIndex === -1) {
      throw new Error("Task not found");
    }

    mockTasks[taskIndex].status = data.status;

    return {
      success: true,
      task: mockTasks[taskIndex],
    };
  },

  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const taskIndex = mockTasks.findIndex((task) => task.id === taskId);
    if (taskIndex === -1) {
      throw new Error("Task not found");
    }

    mockTasks.splice(taskIndex, 1);

    return {
      success: true,
    };
  },

  async getTasksByDateRange(startDate: string, endDate: string): Promise<TasksResponse> {
    return this.getTasks({
      startDate,
      endDate,
      viewMode: "weekly",
    });
  },
};
export type SegmentKey = "morning" | "afternoon" | "evening";
export const TASKNEW: Record<SegmentKey, Task[]> = {
  morning: [
    {
      date: "2025-11-15",
      emoji: "💊",
      id: "vitamin-d",
      title: "Vitamin D",
      time: "8:00 AM",
      status: "taken",
      frequency: "daily",
      medicationId: "vitamin-d",
      dosage: "2 tablet",
      strength: "500mg",
    },
    {
      id: "omega-3",
      title: "Omega-3",
      time: "9:00 AM",
      status: "missed",
      emoji: "🫧",
      frequency: "daily",
      medicationId: "vitamin-d",
      dosage: "2 tablet",
      strength: "500mg",
      date: "2025-11-16",
    },
    {
      id: "b12-drops",
      title: "B12 Drops",
      time: "10:00 AM",
      status: "upcoming",
      emoji: "💧",
      frequency: "daily",
      medicationId: "b12-drops",
      dosage: "2 Drops",
      strength: "20mg",
      date: "2025-11-17",
    },
  ],

  afternoon: [
    {
      id: "iron-supplement",
      title: "Iron Supplement",
      time: "1:00 PM",
      status: "upcoming",
      emoji: "🧲",
      frequency: "daily",
      medicationId: "iron-supplement",
      dosage: "1 tablet",
      strength: "65mg",
      date: "2025-11-15",
    },
    {
      id: "probiotic",
      title: "Probiotic",
      time: "2:30 PM",
      status: "taken",
      emoji: "🦠",
      frequency: "daily",
      medicationId: "probiotic",
      dosage: "1 capsule",
      strength: "10B CFU",
      date: "2025-11-16",
    },
  ],

  evening: [
    {
      id: "magnesium",
      title: "Magnesium",
      time: "7:00 PM",
      status: "upcoming",
      emoji: "✨",
      frequency: "daily",
      medicationId: "magnesium",
      dosage: "1 tablet",
      strength: "400mg",
      date: "2025-11-15",
    },
    {
      id: "melatonin",
      title: "Melatonin",
      time: "9:00 PM",
      status: "missed",
      emoji: "😴",
      frequency: "daily",
      medicationId: "melatonin",
      dosage: "1 tablet",
      strength: "5mg",
      date: "2025-11-16",
    },
  ],
};

export function generateUsername() {
  const adjectives = ["Swift", "Silent", "Crazy", "Happy", "Brave", "Lucky", "Wild", "Epic"];
  const nouns = ["Tiger", "Panda", "Eagle", "Ninja", "Wizard", "Samurai", "Knight", "Falcon"];
  const number = Math.floor(100 + Math.random() * 900); // 3-digit number

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adj}${noun}${number}`;
}
